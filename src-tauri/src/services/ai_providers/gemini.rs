use anyhow::{Result, anyhow};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::collections::HashMap;

use super::r#trait::{
    AIProvider, ProviderConfig, AIGenerationRequest, AIGenerationResponse, 
    AIGenerationParams, AIUsageInfo, ModelInfo, detect_model_characteristics, ResponseFormat
};
use super::security::SecurityUtils;

#[derive(Debug, Serialize, Deserialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GeminiGenerationConfig,
    #[serde(rename = "safetySettings")]
    safety_settings: Vec<GeminiSafetySettings>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiContent {
    role: String,
    parts: Option<Vec<GeminiPart>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiPart {
    text: String,
    // 🔥 新增：支持其他可能的字段
    #[serde(flatten)]
    other: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiGenerationConfig {
    temperature: f64,
    #[serde(rename = "topP")]
    top_p: f64,
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: i32,
    #[serde(rename = "stopSequences", skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiSafetySettings {
    category: String,
    threshold: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
    #[serde(rename = "usageMetadata")]
    usage_metadata: Option<GeminiUsageMetadata>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiCandidate {
    content: GeminiContent,
    #[serde(rename = "finishReason")]
    finish_reason: Option<String>,
    index: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiUsageMetadata {
    #[serde(rename = "promptTokenCount")]
    prompt_token_count: Option<i32>,
    #[serde(rename = "candidatesTokenCount")]
    candidates_token_count: Option<i32>,
    #[serde(rename = "totalTokenCount")]
    total_token_count: Option<i32>,
}

/// Google Gemini API 提供者
#[allow(dead_code)]
pub struct GeminiProvider {
    name: String,
    api_key: String,
    endpoint: String,
    model: String,
    client: Client,
    timeout: Duration,
    settings: HashMap<String, serde_json::Value>,
}

impl GeminiProvider {
    pub fn new(config: &ProviderConfig) -> Result<Self> {
        let api_key = config.api_key
            .as_ref()
            .ok_or_else(|| anyhow!("Gemini 需要 API 金鑰"))?
            .clone();
            
        log::info!("[GeminiProvider] 初始化提供者，API金鑰: {}", SecurityUtils::mask_api_key(&api_key));

        let client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|e| anyhow!("建立 HTTP 客戶端失敗: {}", e))?;

        let endpoint = config.endpoint
            .clone()
            .unwrap_or_else(|| "https://generativelanguage.googleapis.com/v1beta".to_string());

        Ok(Self {
            name: config.name.clone(),
            api_key,
            endpoint,
            model: config.model.clone(),
            client,
            timeout: Duration::from_secs(120),
            settings: config.settings.clone(),
        })
    }

    /// 獲取模型的完整名稱（用於API調用）
    fn get_full_model_name(&self) -> String {
        if self.model.starts_with("models/") {
            self.model.clone()
        } else {
            format!("models/{}", self.model)
        }
    }

    /// 發送 POST 請求到 Gemini API
    async fn make_post_request<T>(&self, endpoint: &str, body: &impl Serialize) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        log::debug!("[GeminiProvider] 發送POST請求到: {}, API金鑰: {}", url, SecurityUtils::mask_api_key(&self.api_key));
        
        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("x-goog-api-key", &self.api_key)
            .json(body)
            .timeout(self.timeout)
            .send()
            .await?;

        if response.status().is_success() {
            let response_text = response.text().await?;
            log::info!("[GeminiProvider] ✅ API 回應成功，長度: {} 字符", response_text.len());
            log::info!("[GeminiProvider] 🔍 回應內容（前500字符）: {}", 
                     response_text.chars().take(500).collect::<String>());
            
            let data: T = serde_json::from_str(&response_text)
                .map_err(|e| anyhow!("🚫 JSON 解析錯誤: {}
📄 完整回應內容: {}", e, response_text))?;
            Ok(data)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            log::error!("[GeminiProvider] ❌ API 錯誤 {}: {}", status, error_text);
            
            // 🔥 智能錯誤處理：針對 429 錯誤解析重試信息
            if status.as_u16() == 429 {
                let user_friendly_error = Self::parse_rate_limit_error(&error_text);
                Err(anyhow!("{}", user_friendly_error))
            } else {
                Err(anyhow!("🚫 Gemini API 錯誤 {} ({}): {}", status.as_u16(), status.canonical_reason().unwrap_or("Unknown"), error_text))
            }
        }
    }

    /// 🔥 解析 429 速率限制錯誤，提供用戶友好的提示
    fn parse_rate_limit_error(error_text: &str) -> String {
        // 嘗試解析 JSON 錯誤響應
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(error_text) {
            if let Some(error_obj) = json_value.get("error") {
                let mut retry_delay = None;
                let mut quota_type = "未知限制".to_string();
                
                // 解析 retryDelay
                if let Some(details) = error_obj.get("details").and_then(|d| d.as_array()) {
                    for detail in details {
                        if let Some(_retry_info) = detail.get("@type")
                            .and_then(|t| t.as_str())
                            .filter(|&t| t.contains("RetryInfo")) {
                            if let Some(delay) = detail.get("retryDelay").and_then(|d| d.as_str()) {
                                retry_delay = Some(delay.to_string());
                            }
                        }
                        
                        // 解析配額類型
                        if let Some(violations) = detail.get("violations").and_then(|v| v.as_array()) {
                            for violation in violations {
                                if let Some(quota_metric) = violation.get("quotaMetric").and_then(|q| q.as_str()) {
                                    quota_type = match quota_metric {
                                        s if s.contains("requests") && s.contains("minute") => "每分鐘請求數".to_string(),
                                        s if s.contains("requests") && s.contains("day") => "每日請求數".to_string(),
                                        s if s.contains("input_token") => "每分鐘輸入 Token 數".to_string(),
                                        _ => "API 配額".to_string(),
                                    };
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // 生成用戶友好的錯誤消息
                let base_message = format!("🚫 Gemini 免費版 API 配額已達上限\n💡 限制類型：{}", quota_type);
                
                if let Some(delay) = retry_delay {
                    format!("{}\n⏰ 建議等待時間：{}\n\n🔧 解決方案：\n• 等待配額重置後再試\n• 使用付費版 OpenRouter (google/gemini-2.5-flash)\n• 或切換到其他 AI 提供者", base_message, delay)
                } else {
                    format!("{}\n\n🔧 解決方案：\n• 稍後再試（通常 1-5 分鐘後重置）\n• 使用付費版 OpenRouter (google/gemini-2.5-flash)\n• 或切換到其他 AI 提供者", base_message)
                }
            } else {
                "🚫 Gemini API 配額已達上限，請稍後再試或切換到付費版本".to_string()
            }
        } else {
            "🚫 Gemini API 配額已達上限，請稍後再試或切換到付費版本".to_string()
        }
    }

    /// 獲取預定義的 Gemini 模型列表
    fn get_available_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "gemini-2.5-pro".to_string(),
                name: "Gemini 2.5 Pro".to_string(),
                description: Some("Google 最強大的思考模型，具備複雜推理能力".to_string()),
                max_tokens: Some(8192), // 8K output tokens
                supports_streaming: true,
                cost_per_token: Some(0.000001), // 更新的定價
            },
            ModelInfo {
                id: "gemini-2.5-flash".to_string(),
                name: "Gemini 2.5 Flash".to_string(),
                description: Some("最新的多模態模型，具備下一代能力和增強功能".to_string()),
                max_tokens: Some(8192),
                supports_streaming: true,
                cost_per_token: Some(0.0000005),
            },
            ModelInfo {
                id: "gemini-2.5-flash-lite".to_string(),
                name: "Gemini 2.5 Flash-Lite".to_string(),
                description: Some("最快速且最經濟的多模態模型，適合高頻任務".to_string()),
                max_tokens: Some(8192),
                supports_streaming: true,
                cost_per_token: Some(0.00000025),
            },
            // 保留舊版本以確保向後兼容
            ModelInfo {
                id: "gemini-1.5-pro".to_string(),
                name: "Gemini 1.5 Pro (舊版)".to_string(),
                description: Some("先前版本的多模態模型".to_string()),
                max_tokens: Some(1048576),
                supports_streaming: true,
                cost_per_token: Some(0.0000035),
            },
            ModelInfo {
                id: "gemini-pro".to_string(),
                name: "Gemini Pro (舊版)".to_string(),
                description: Some("傳統版本的文本生成模型".to_string()),
                max_tokens: Some(30720),
                supports_streaming: true,
                cost_per_token: Some(0.0000005),
            },
        ]
    }

    /// 獲取預設的安全設定
    fn get_default_safety_settings() -> Vec<GeminiSafetySettings> {
        vec![
            GeminiSafetySettings {
                category: "HARM_CATEGORY_HARASSMENT".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
            GeminiSafetySettings {
                category: "HARM_CATEGORY_HATE_SPEECH".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
            GeminiSafetySettings {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
            GeminiSafetySettings {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
        ]
    }
}

#[async_trait]
impl AIProvider for GeminiProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn provider_type(&self) -> &str {
        "gemini"
    }

    async fn check_availability(&self) -> Result<bool> {
        log::info!("[GeminiProvider] 檢查 Gemini API 可用性...");
        
        // 發送簡單的測試請求
        let test_request = GeminiRequest {
            contents: vec![
                GeminiContent {
                    role: "user".to_string(),
                    parts: Some(vec![
                        GeminiPart {
                            text: "Hello".to_string(),
                            other: std::collections::HashMap::new(),
                        }
                    ]),
                }
            ],
            generation_config: GeminiGenerationConfig {
                temperature: 0.1,
                top_p: 0.1,
                max_output_tokens: 50,
                stop_sequences: None,
            },
            safety_settings: Self::get_default_safety_settings(),
        };

        let model_name = self.get_full_model_name();
        let endpoint = format!("/{}:generateContent", model_name);
        
        match self.make_post_request::<GeminiResponse>(&endpoint, &test_request).await {
            Ok(_) => {
                log::info!("[GeminiProvider] Gemini API 可用");
                Ok(true)
            }
            Err(e) => {
                log::warn!("[GeminiProvider] Gemini API 不可用: {}", e);
                // 🔧 修復：返回 Ok(false) 而不是 Err，讓 UI 可以正確顯示狀態
                Ok(false)
            }
        }
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        log::info!("[GeminiProvider] 獲取 Gemini 模型列表...");
        
        // Gemini API 沒有公開的模型列表端點，返回預定義列表
        Ok(Self::get_available_models())
    }

    async fn generate_text(&self, request: AIGenerationRequest) -> Result<AIGenerationResponse> {
        // 🔒 安全驗證：檢查輸入參數
        SecurityUtils::validate_generation_params(&request.params)?;
        SecurityUtils::validate_prompt_content(&request.prompt, request.system_prompt.as_deref())?;
        
        log::info!("[GeminiProvider] 開始生成文本，模型: {}, API金鑰: {}", request.model, SecurityUtils::mask_api_key(&self.api_key));
        
        // 🔍 檢查並推薦正確的模型名稱
        let recommended_models = vec![
            "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro", 
            "gemini-1.5-pro-latest", "gemini-1.5-flash-latest"
        ];
        
        if !recommended_models.iter().any(|&m| request.model.contains(m)) {
            log::warn!("[GeminiProvider] ⚠️  模型名稱可能不正確: '{}'", request.model);
            log::warn!("[GeminiProvider] 💡 建議使用: {:?}", recommended_models);
            
            // 嘗試自動修正常見錯誤
            let corrected_model = if request.model.contains("2.5") {
                if request.model.contains("pro") {
                    "gemini-1.5-pro-latest".to_string()
                } else {
                    "gemini-1.5-flash-latest".to_string()
                }
            } else {
                request.model.clone()
            };
            
            if corrected_model != request.model {
                log::info!("[GeminiProvider] 🔧 自動修正模型名稱: {} -> {}", request.model, corrected_model);
            }
        }

        // 構建內容列表
        let mut contents = Vec::new();
        
        // Gemini 不支援系統角色，將系統提示合併到用戶消息中
        let user_content = if let Some(system_prompt) = &request.system_prompt {
            format!("{}\n\n{}", system_prompt, request.prompt)
        } else {
            request.prompt.clone()
        };
        
        contents.push(GeminiContent {
            role: "user".to_string(),
            parts: Some(vec![
                GeminiPart {
                    text: user_content,
                    other: std::collections::HashMap::new(),
                }
            ]),
        });

        let gemini_request = GeminiRequest {
            contents,
            generation_config: GeminiGenerationConfig {
                temperature: request.params.temperature,
                top_p: request.params.top_p.unwrap_or(0.95),
                max_output_tokens: request.params.max_tokens,
                stop_sequences: request.params.stop,
            },
            safety_settings: Self::get_default_safety_settings(),
        };

        let model_name = if request.model.starts_with("models/") {
            request.model.clone()
        } else {
            format!("models/{}", request.model)
        };
        
        let endpoint = format!("/{}:generateContent", model_name);
        let response = self.make_post_request::<GeminiResponse>(&endpoint, &gemini_request).await?;
        
        // 🔥 使用階段一檢測邏輯處理響應格式差異
        let model_chars = detect_model_characteristics(&request.model);
        log::info!("[GeminiProvider] 🔍 模型檢測結果: {:?} -> {:?}", request.model, model_chars.response_format);
        log::info!("[GeminiProvider] 🔍 API 響應結構: candidates 數量={}", response.candidates.len());
        
        let actual_text = match model_chars.response_format {
            ResponseFormat::CandidatesArray => {
                // Gemini 標準格式：candidates 陣列
                if let Some(candidate) = response.candidates.first() {
                    log::info!("[GeminiProvider] 🔍 找到第一個 candidate，index={}", candidate.index);
                    log::info!("[GeminiProvider] 🔍 finish_reason={:?}", candidate.finish_reason);
                    
                    // 🔥 處理 Gemini API 的不同回應格式
                    let content_text = if let Some(parts) = &candidate.content.parts {
                        if !parts.is_empty() {
                            log::info!("[GeminiProvider] 🔍 content.parts 存在，parts 數量={}", parts.len());
                            if let Some(part) = parts.first() {
                                log::info!("[GeminiProvider] 🔍 第一個 part 文本長度: {} 字符", part.text.len());
                                if !part.text.trim().is_empty() {
                                    log::info!("[GeminiProvider] ✅ 使用標準 parts 格式");
                                    part.text.clone()
                                } else {
                                    log::warn!("[GeminiProvider] ⚠️ part.text 為空");
                                    String::new()
                                }
                            } else {
                                log::warn!("[GeminiProvider] ⚠️ parts 陣列為空");
                                String::new()
                            }
                        } else {
                            log::warn!("[GeminiProvider] ⚠️ parts 陣列長度為 0");
                            String::new()
                        }
                    } else {
                        // 當 parts 為 None 時，這通常發生在：
                        // 1. MAX_TOKENS - 達到輸出限制
                        // 2. SAFETY - 安全過濾器阻止輸出
                        // 3. OTHER - 其他 API 限制
                        log::warn!("[GeminiProvider] ⚠️ content.parts 為 None，finish_reason={:?}", 
                                 candidate.finish_reason);
                        
                        match candidate.finish_reason.as_deref() {
                            Some("MAX_TOKENS") => {
                                log::warn!("[GeminiProvider] 💡 建議：增加 max_output_tokens 參數或使用更長輸出限制的模型");
                            },
                            Some("SAFETY") => {
                                log::warn!("[GeminiProvider] 💡 內容被安全過濾器阻止，請調整提示詞");
                            },
                            Some("STOP") => {
                                log::info!("[GeminiProvider] 💡 正常完成，但無內容輸出");
                            },
                            _ => {
                                log::warn!("[GeminiProvider] 💡 未知完成原因");
                            }
                        }
                        String::new()
                    };
                    
                    content_text
                } else {
                    log::warn!("[GeminiProvider] ⚠️ candidates 陣列為空");
                    String::new()
                }
            },
            _ => {
                // 降級處理：嘗試從 candidates 獲取
                if let Some(candidate) = response.candidates.first() {
                    if let Some(parts) = &candidate.content.parts {
                        if let Some(part) = parts.first() {
                            log::info!("[GeminiProvider] 📝 降級使用 candidates 陣列格式");
                            part.text.clone()
                        } else {
                            log::warn!("[GeminiProvider] ⚠️ 無法從 parts 獲取內容");
                            String::new()
                        }
                    } else {
                        log::warn!("[GeminiProvider] ⚠️ content.parts 不存在");
                        String::new()
                    }
                } else {
                    log::warn!("[GeminiProvider] ⚠️ 無法獲取任何響應內容");
                    String::new()
                }
            }
        };
        
        if !actual_text.trim().is_empty() {
            log::info!("[GeminiProvider] 文本生成成功，長度: {} 字符", actual_text.len());
            
            let usage = response.usage_metadata.map(|usage| {
                AIUsageInfo {
                    prompt_tokens: usage.prompt_token_count,
                    completion_tokens: usage.candidates_token_count,
                    total_tokens: usage.total_token_count,
                }
            });

            Ok(AIGenerationResponse {
                text: actual_text,
                model: request.model,
                usage,
                finish_reason: response.candidates.first()
                    .and_then(|c| c.finish_reason.clone()),
            })
        } else {
            // 針對不同的失敗原因提供具體的錯誤消息
            let finish_reason = response.candidates.first()
                .and_then(|c| c.finish_reason.as_ref());
            
            let error_message = match finish_reason {
                Some(reason) if reason == "MAX_TOKENS" => {
                    format!("🚫 Gemini 輸出達到 token 限制
💡 建議解決方案：
- 當前 max_tokens: {}
- 嘗試增加 max_tokens 設置
- 或使用支持更長輸出的模型 (如 gemini-1.5-pro)", request.params.max_tokens)
                },
                Some(reason) if reason == "SAFETY" => {
                    "🚫 內容被 Gemini 安全過濾器阻止
💡 建議調整提示詞內容，避免敏感話題".to_string()
                },
                Some(reason) if reason == "RECITATION" => {
                    "🚫 內容涉及版權材料被過濾
💡 建議使用更原創的提示詞".to_string()
                },
                Some(reason) => {
                    format!("🚫 Gemini 生成被停止：{}
💡 請檢查提示詞內容", reason)
                },
                None => {
                    format!("🚫 Gemini 響應解析失敗：無法獲取文本內容
📊 API 回應正常但內容為空
🔍 候選數量: {}, 模型: {}",
                    response.candidates.len(), request.model)
                }
            };
            
            log::error!("[GeminiProvider] {}", error_message);
            Err(anyhow!("{}", error_message))
        }
    }

    async fn validate_api_key(&self, api_key: &str) -> Result<bool> {
        log::info!("[GeminiProvider] 驗證 API 金鑰...");
        
        // 建立臨時請求來測試 API 金鑰
        let temp_client = Client::new();
        let url = format!("{}/models/gemini-2.5-flash:generateContent", self.endpoint);
        
        let test_request = GeminiRequest {
            contents: vec![
                GeminiContent {
                    role: "user".to_string(),
                    parts: Some(vec![
                        GeminiPart {
                            text: "test".to_string(),
                            other: std::collections::HashMap::new(),
                        }
                    ]),
                }
            ],
            generation_config: GeminiGenerationConfig {
                temperature: 0.1,
                top_p: 0.1,
                max_output_tokens: 50,
                stop_sequences: None,
            },
            safety_settings: Self::get_default_safety_settings(),
        };
        
        let response = temp_client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("x-goog-api-key", api_key)
            .json(&test_request)
            .timeout(Duration::from_secs(30))
            .send()
            .await?;

        if response.status().is_success() {
            log::info!("[GeminiProvider] API 金鑰驗證成功");
            Ok(true)
        } else {
            log::warn!("[GeminiProvider] API 金鑰驗證失敗: {}", response.status());
            Ok(false)
        }
    }

    async fn estimate_cost(&self, request: &AIGenerationRequest) -> Result<Option<f64>> {
        // Gemini 的計費方式
        let cost_per_input_token = if request.model.contains("1.5-pro") {
            0.0000035
        } else if request.model.contains("1.5-flash") {
            0.000000075
        } else {
            0.0000005 // gemini-pro
        };
        
        let cost_per_output_token = cost_per_input_token * 3.0; // 輸出通常比輸入貴3倍
        
        // 估算 token 數（大約每4個字符1個token）
        let estimated_input_tokens = (request.prompt.len() / 4) as f64;
        let estimated_output_tokens = request.params.max_tokens as f64;
        
        let estimated_cost = (estimated_input_tokens * cost_per_input_token) + 
                           (estimated_output_tokens * cost_per_output_token);
        
        Ok(Some(estimated_cost))
    }

    fn default_params(&self) -> AIGenerationParams {
        AIGenerationParams {
            temperature: 0.9,
            max_tokens: 2048,
            top_p: Some(1.0),
            presence_penalty: None, // Gemini 不支援
            frequency_penalty: None, // Gemini 不支援
            stop: None,
        }
    }

    fn requires_api_key(&self) -> bool {
        true
    }

    fn supports_custom_endpoint(&self) -> bool {
        false // Gemini 通常使用標準端點
    }
}