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
struct ClaudeRequest {
    model: String,
    max_tokens: i32,
    messages: Vec<ClaudeMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

/// Opus 4.7 之後的世代（opus-5 / sonnet-5 / opus-4-7 / opus-4-8 / fable / mythos）
/// 已移除 sampling 參數，請求帶 temperature/top_p 會直接回 400
fn model_supports_sampling_params(model: &str) -> bool {
    !(model.starts_with("claude-opus-5")
        || model.starts_with("claude-opus-4-7")
        || model.starts_with("claude-opus-4-8")
        || model.starts_with("claude-sonnet-5")
        || model.starts_with("claude-fable")
        || model.starts_with("claude-mythos"))
}

#[derive(Debug, Serialize, Deserialize)]
struct ClaudeResponse {
    id: String,
    r#type: String,
    role: String,
    content: Vec<ClaudeContent>,
    model: String,
    stop_reason: Option<String>,
    stop_sequence: Option<String>,
    usage: ClaudeUsage,
}

#[derive(Debug, Serialize, Deserialize)]
struct ClaudeContent {
    r#type: String,
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ClaudeUsage {
    input_tokens: i32,
    output_tokens: i32,
}

/// Anthropic Claude API 提供者
#[allow(dead_code)]
pub struct ClaudeProvider {
    name: String,
    api_key: String,
    endpoint: String,
    model: String,
    client: Client,
    timeout: Duration,
    settings: HashMap<String, serde_json::Value>,
}

impl ClaudeProvider {
    pub fn new(config: &ProviderConfig) -> Result<Self> {
        let api_key = config.api_key
            .as_ref()
            .ok_or_else(|| anyhow!("Claude 需要 API 金鑰"))?
            .clone();
            
        log::info!("[ClaudeProvider] 初始化提供者，API金鑰: {}", SecurityUtils::mask_api_key(&api_key));

        let client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|e| anyhow!("建立 HTTP 客戶端失敗: {}", e))?;

        let endpoint = config.endpoint
            .clone()
            .unwrap_or_else(|| "https://api.anthropic.com/v1".to_string());

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

    /// 發送 POST 請求到 Claude API
    async fn make_post_request<T>(&self, endpoint: &str, body: &impl Serialize) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        log::debug!("[ClaudeProvider] 發送POST請求到: {}, API金鑰: {}", url, SecurityUtils::mask_api_key(&self.api_key));
        
        let response = self.client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(body)
            .timeout(self.timeout)
            .send()
            .await?;

        if response.status().is_success() {
            let data = response.json::<T>().await?;
            Ok(data)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            let sanitized_error = SecurityUtils::sanitize_error_message(&error_text, &self.api_key);
            Err(anyhow!("Claude API 錯誤 {}: {}", status, sanitized_error))
        }
    }

    /// 獲取可用的 Claude 模型列表
    /// 模型 ID 不加日期後綴（claude-opus-5，不是 claude-opus-5-2026xxxx）
    fn get_available_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "claude-opus-5".to_string(),
                name: "Claude Opus 5".to_string(),
                description: Some("最強大的Claude模型，適合複雜創作與長篇推理".to_string()),
                max_tokens: Some(1_000_000),
                supports_streaming: true,
                cost_per_token: Some(0.000005), // 輸入token成本
            },
            ModelInfo {
                id: "claude-sonnet-5".to_string(),
                name: "Claude Sonnet 5".to_string(),
                description: Some("速度與智慧的最佳平衡，適合日常寫作".to_string()),
                max_tokens: Some(1_000_000),
                supports_streaming: true,
                cost_per_token: Some(0.000003),
            },
            ModelInfo {
                id: "claude-haiku-4-5".to_string(),
                name: "Claude Haiku 4.5".to_string(),
                description: Some("最快速且經濟的Claude模型".to_string()),
                max_tokens: Some(200_000),
                supports_streaming: true,
                cost_per_token: Some(0.000001),
            },
        ]
    }
}

#[async_trait]
impl AIProvider for ClaudeProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn provider_type(&self) -> &str {
        "claude"
    }

    async fn check_availability(&self) -> Result<bool> {
        log::info!("[ClaudeProvider] 檢查 Claude API 可用性，API金鑰: {}...", SecurityUtils::mask_api_key(&self.api_key));
        
        // 發送簡單的測試請求（不帶 sampling 參數，新舊世代模型都接受）
        let test_request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 10,
            messages: vec![
                ClaudeMessage {
                    role: "user".to_string(),
                    content: "Hello".to_string(),
                }
            ],
            system: None,
            temperature: None,
            top_p: None,
            stop_sequences: None,
        };
        
        match self.make_post_request::<ClaudeResponse>("/messages", &test_request).await {
            Ok(_) => {
                log::info!("[ClaudeProvider] Claude API 可用");
                Ok(true)
            }
            Err(e) => {
                log::warn!("[ClaudeProvider] Claude API 不可用: {}", e);
                Err(e)
            }
        }
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        log::info!("[ClaudeProvider] 獲取 Claude 模型列表...");
        
        // Claude API 沒有公開的模型列表端點，返回預定義列表
        Ok(Self::get_available_models())
    }

    async fn generate_text(&self, request: AIGenerationRequest) -> Result<AIGenerationResponse> {
        // 🔒 安全驗證：檢查輸入參數
        SecurityUtils::validate_generation_params(&request.params)?;
        SecurityUtils::validate_prompt_content(&request.prompt, request.system_prompt.as_deref())?;
        
        log::info!("[ClaudeProvider] 開始生成文本，模型: {}, API金鑰: {}", request.model, SecurityUtils::mask_api_key(&self.api_key));

        // 構建消息列表
        let messages = vec![
            ClaudeMessage {
                role: "user".to_string(),
                content: request.prompt,
            }
        ];

        let supports_sampling = model_supports_sampling_params(&request.model);
        let claude_request = ClaudeRequest {
            model: request.model.clone(),
            max_tokens: request.params.max_tokens,
            messages,
            system: request.system_prompt,
            temperature: supports_sampling.then_some(request.params.temperature),
            top_p: if supports_sampling { request.params.top_p } else { None },
            stop_sequences: request.params.stop,
        };

        let response = self.make_post_request::<ClaudeResponse>("/messages", &claude_request).await?;
        
        // 🔥 使用階段一檢測邏輯處理響應格式差異
        let model_chars = detect_model_characteristics(&request.model);
        let actual_text = match model_chars.response_format {
            ResponseFormat::ContentArray => {
                // Claude 標準格式：content 陣列
                if let Some(content) = response.content.first() {
                    if !content.text.trim().is_empty() {
                        log::info!("[ClaudeProvider] ✅ 使用標準 content 陣列，生成 {} 字符", content.text.len());
                        content.text.clone()
                    } else {
                        log::warn!("[ClaudeProvider] ⚠️ content 陣列中文本為空");
                        String::new()
                    }
                } else {
                    log::warn!("[ClaudeProvider] ⚠️ content 陣列為空");
                    String::new()
                }
            },
            _ => {
                // 降級處理：嘗試從 content 陣列獲取
                if let Some(content) = response.content.first() {
                    log::info!("[ClaudeProvider] 📝 降級使用 content 陣列格式");
                    content.text.clone()
                } else {
                    log::warn!("[ClaudeProvider] ⚠️ 無法獲取任何響應內容");
                    String::new()
                }
            }
        };
        
        if !actual_text.trim().is_empty() {
            log::info!("[ClaudeProvider] 文本生成成功，長度: {} 字符", actual_text.len());
            
            let usage = AIUsageInfo {
                prompt_tokens: Some(response.usage.input_tokens),
                completion_tokens: Some(response.usage.output_tokens),
                total_tokens: Some(response.usage.input_tokens + response.usage.output_tokens),
            };

            Ok(AIGenerationResponse {
                text: actual_text,
                model: response.model,
                usage: Some(usage),
                finish_reason: response.stop_reason,
            })
        } else {
            Err(anyhow!("Claude API 回應中沒有有效內容"))
        }
    }

    async fn validate_api_key(&self, api_key: &str) -> Result<bool> {
        log::info!("[ClaudeProvider] 驗證 API 金鑰: {}...", SecurityUtils::mask_api_key(api_key));
        
        // 建立臨時客戶端來測試 API 金鑰
        let temp_client = Client::new();
        let url = format!("{}/messages", self.endpoint);
        
        let test_request = ClaudeRequest {
            model: "claude-haiku-4-5".to_string(), // 使用最便宜的現役模型測試
            max_tokens: 5,
            messages: vec![
                ClaudeMessage {
                    role: "user".to_string(),
                    content: "hi".to_string(),
                }
            ],
            system: None,
            temperature: None,
            top_p: None,
            stop_sequences: None,
        };
        
        log::debug!("[ClaudeProvider] 驗證API金鑰，發送測試請求到: {}", url);
        
        let response = temp_client
            .post(&url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&test_request)
            .timeout(Duration::from_secs(30))
            .send()
            .await?;

        if response.status().is_success() {
            log::info!("[ClaudeProvider] API 金鑰驗證成功");
            Ok(true)
        } else {
            log::warn!("[ClaudeProvider] API 金鑰驗證失敗: {}", response.status());
            Ok(false)
        }
    }

    async fn estimate_cost(&self, request: &AIGenerationRequest) -> Result<Option<f64>> {
        // Claude 的計費方式（每百萬tokens的價格）
        let (input_cost_per_million, output_cost_per_million) = if request.model.starts_with("claude-opus-5") {
            (5.0, 25.0)
        } else if request.model.starts_with("claude-sonnet-5") {
            (3.0, 15.0)
        } else if request.model.starts_with("claude-haiku-4-5") {
            (1.0, 5.0)
        } else if request.model.contains("opus") {
            (5.0, 25.0)
        } else if request.model.contains("haiku") {
            (1.0, 5.0)
        } else {
            (3.0, 15.0) // 預設值
        };
        
        // 轉換為每token成本
        let input_cost_per_token = input_cost_per_million / 1_000_000.0;
        let output_cost_per_token = output_cost_per_million / 1_000_000.0;
        
        // 估算token數（大約每4個字符1個token）
        let estimated_input_tokens = (request.prompt.len() / 4) as f64;
        let estimated_output_tokens = request.params.max_tokens as f64;
        
        let estimated_cost = (estimated_input_tokens * input_cost_per_token) + 
                           (estimated_output_tokens * output_cost_per_token);
        
        Ok(Some(estimated_cost))
    }

    fn default_params(&self) -> AIGenerationParams {
        AIGenerationParams {
            temperature: 1.0,
            max_tokens: 2000,
            top_p: None, // Claude 建議不要同時使用 temperature 和 top_p
            presence_penalty: None, // Claude 不支援
            frequency_penalty: None, // Claude 不支援
            stop: None,
        }
    }

    fn requires_api_key(&self) -> bool {
        true
    }

    fn supports_custom_endpoint(&self) -> bool {
        false // Claude 通常使用標準端點
    }
}

#[cfg(test)]
mod claude_provider_tests {
    use super::*;

    fn request_for(model: &str, temperature: Option<f64>) -> ClaudeRequest {
        ClaudeRequest {
            model: model.to_string(),
            max_tokens: 10,
            messages: vec![ClaudeMessage {
                role: "user".to_string(),
                content: "hi".to_string(),
            }],
            system: None,
            temperature,
            top_p: None,
            stop_sequences: None,
        }
    }

    /// 新世代模型收到 temperature/top_p 會回 400，None 時欄位必須從 JSON 整個消失。
    #[test]
    fn omits_sampling_params_when_none() {
        let json = serde_json::to_string(&request_for("claude-opus-5", None)).expect("序列化失敗");
        assert!(!json.contains("temperature"), "temperature 為 None 仍出現在請求 JSON: {}", json);
        assert!(!json.contains("top_p"), "top_p 為 None 仍出現在請求 JSON: {}", json);
    }

    /// 舊世代模型仍要能帶 temperature。
    #[test]
    fn keeps_sampling_params_when_set() {
        let json = serde_json::to_string(&request_for("claude-haiku-4-5", Some(0.7))).expect("序列化失敗");
        assert!(json.contains("\"temperature\":0.7"), "temperature 有值卻沒進請求 JSON: {}", json);
    }

    /// sampling 支援判斷必須對齊 Anthropic 的世代分界（Opus 4.7+ / Sonnet 5+ 移除）。
    #[test]
    fn sampling_support_matches_model_generation() {
        for model in ["claude-opus-5", "claude-sonnet-5", "claude-opus-4-7", "claude-opus-4-8"] {
            assert!(!model_supports_sampling_params(model), "{} 不該帶 sampling 參數", model);
        }
        for model in ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-6"] {
            assert!(model_supports_sampling_params(model), "{} 應允許 sampling 參數", model);
        }
    }

    /// 清單再出現 claude-3 世代就是又放了退役模型（該系列已全數退役）。
    #[test]
    fn available_models_exclude_retired_generations() {
        let ids: Vec<String> = ClaudeProvider::get_available_models()
            .into_iter()
            .map(|m| m.id)
            .collect();
        assert!(ids.contains(&"claude-opus-5".to_string()), "缺少 claude-opus-5: {:?}", ids);
        assert!(ids.contains(&"claude-haiku-4-5".to_string()), "缺少 claude-haiku-4-5: {:?}", ids);
        assert!(
            ids.iter().all(|id| !id.starts_with("claude-3")),
            "清單含已退役的 claude-3 世代: {:?}",
            ids
        );
    }
}