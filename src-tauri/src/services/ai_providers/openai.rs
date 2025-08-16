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
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_completion_tokens: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    presence_penalty: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    frequency_penalty: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reasoning: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reasoning_summary: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<OpenAIChoice>,
    usage: OpenAIUsage,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIChoice {
    index: i32,
    message: OpenAIMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: i32,
    completion_tokens: i32,
    total_tokens: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIModelsResponse {
    object: String,
    data: Vec<OpenAIModelData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIModelData {
    id: String,
    object: String,
    created: u64,
    owned_by: String,
}

/// OpenAI API 提供者
#[allow(dead_code)]
pub struct OpenAIProvider {
    name: String,
    api_key: String,
    endpoint: String,
    model: String,
    client: Client,
    timeout: Duration,
    settings: HashMap<String, serde_json::Value>,
}

/// 檢測模型是否需要使用新的參數格式
fn is_new_api_model(model: &str) -> bool {
    // GPT-5 系列和某些新模型使用 max_completion_tokens
    model.starts_with("gpt-5") || 
    model.starts_with("gpt-4o") ||
    model.contains("gpt-5-") ||
    model.contains("o1-") // OpenAI o1 系列也使用新格式
}

/// 驗證 OpenAI 模型 ID 是否有效
fn is_valid_openai_model(model: &str) -> bool {
    const VALID_MODELS: &[&str] = &[
        "gpt-4o",
        "gpt-4o-mini", 
        "gpt-3.5-turbo",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-4-0613",
        "gpt-4-32k",
        "gpt-4-32k-0613",
        "gpt-3.5-turbo-0613",
        "gpt-3.5-turbo-16k",
        "gpt-3.5-turbo-16k-0613",
        "gpt-3.5-turbo-1106",
        "gpt-3.5-turbo-0125",
        // 新模型
        "gpt-4-turbo-preview",
        "gpt-4-0125-preview",
        "gpt-4-1106-preview",
        "gpt-4-vision-preview",
        "gpt-4-1106-vision-preview",
        // o1 系列
        "o1-preview",
        "o1-mini",
    ];
    
    VALID_MODELS.contains(&model)
}

impl OpenAIProvider {
    pub fn new(config: &ProviderConfig) -> Result<Self> {
        let api_key = config.api_key
            .as_ref()
            .ok_or_else(|| anyhow!("OpenAI 需要 API 金鑰"))?
            .clone();
            
        log::info!("[OpenAIProvider] 初始化提供者，API金鑰: {}", SecurityUtils::mask_api_key(&api_key));

        let client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|e| anyhow!("建立 HTTP 客戶端失敗: {}", e))?;

        let endpoint = config.endpoint
            .clone()
            .unwrap_or_else(|| "https://api.openai.com/v1".to_string());

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

    /// 從 reasoning 相關欄位提取文本（增強版）
    fn extract_text_from_reasoning_fields(choice: &OpenAIChoice) -> String {
        // 檢查 reasoning 欄位
        if let Some(reasoning) = &choice.message.reasoning {
            if !reasoning.trim().is_empty() {
                log::info!("[OpenAIProvider] ✅ 使用 reasoning 格式，生成 {} 字符", reasoning.len());
                return reasoning.clone();
            }
        }
        
        // 檢查 reasoning_summary 欄位
        if let Some(summary) = &choice.message.reasoning_summary {
            if !summary.trim().is_empty() {
                log::info!("[OpenAIProvider] ✅ 使用 reasoning_summary 格式，生成 {} 字符", summary.len());
                return summary.clone();
            }
        }
        
        // 🔥 新增：動態檢查其他可能的欄位名稱
        let message_value = serde_json::to_value(&choice.message).unwrap_or_default();
        let possible_fields = [
            "reasoning_content", "internal_thoughts", "chain_of_thought", 
            "thoughts", "reasoning_trace", "step_by_step", "analysis"
        ];
        
        for field_name in possible_fields {
            if let Some(value) = message_value.get(field_name) {
                if let Some(text) = value.as_str() {
                    if !text.trim().is_empty() {
                        log::info!("[OpenAIProvider] ✅ 使用動態欄位 '{}' 格式，生成 {} 字符", field_name, text.len());
                        return text.to_string();
                    }
                }
            }
        }
        
        // 🔥 最後嘗試：檢查是否有任何字符串欄位包含內容
        if let Some(obj) = message_value.as_object() {
            for (key, value) in obj {
                if let Some(text) = value.as_str() {
                    if !text.trim().is_empty() && text.len() > 10 { // 過濾掉太短的欄位
                        log::warn!("[OpenAIProvider] 🆘 降級：使用未知欄位 '{}' 格式，生成 {} 字符", key, text.len());
                        return text.to_string();
                    }
                }
            }
        }
        
        log::warn!("[OpenAIProvider] ⚠️ 所有欄位檢查完畢，未找到有效內容");
        log::warn!("[OpenAIProvider] 🔍 調試：message完整結構 = {}", serde_json::to_string_pretty(&choice.message).unwrap_or_default());
        String::new()
    }

    /// 發送 GET 請求到 OpenAI API
    async fn make_get_request<T>(&self, endpoint: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        let auth_header = format!("Bearer {}", self.api_key);
        log::debug!("[OpenAIProvider] 發送GET請求到: {}, 認證: {}", url, SecurityUtils::mask_api_key(&self.api_key));
        
        let response = self.client
            .get(&url)
            .header("Authorization", auth_header)
            .header("Content-Type", "application/json")
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
            Err(anyhow!("OpenAI API 錯誤 {}: {}", status, sanitized_error))
        }
    }

    /// 發送 POST 請求到 OpenAI API
    async fn make_post_request<T>(&self, endpoint: &str, body: &impl Serialize) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        let auth_header = format!("Bearer {}", self.api_key);
        log::debug!("[OpenAIProvider] 發送POST請求到: {}, 認證: {}", url, SecurityUtils::mask_api_key(&self.api_key));
        
        let response = self.client
            .post(&url)
            .header("Authorization", auth_header)
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
            Err(anyhow!("OpenAI API 錯誤 {}: {}", status, sanitized_error))
        }
    }

    /// 獲取預定義的熱門模型列表（用於離線情況）
    fn get_popular_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "gpt-4o".to_string(),
                name: "GPT-4o".to_string(),
                description: Some("最新的多模態模型，性能卓越".to_string()),
                max_tokens: Some(128000),
                supports_streaming: true,
                cost_per_token: Some(0.000015), // 輸入token成本
            },
            ModelInfo {
                id: "gpt-4o-mini".to_string(),
                name: "GPT-4o Mini".to_string(),
                description: Some("更經濟實惠的GPT-4o版本".to_string()),
                max_tokens: Some(128000),
                supports_streaming: true,
                cost_per_token: Some(0.00000015),
            },
            ModelInfo {
                id: "gpt-4-turbo".to_string(),
                name: "GPT-4 Turbo".to_string(),
                description: Some("高性能GPT-4模型，支援更大上下文".to_string()),
                max_tokens: Some(128000),
                supports_streaming: true,
                cost_per_token: Some(0.00003),
            },
            ModelInfo {
                id: "gpt-3.5-turbo".to_string(),
                name: "GPT-3.5 Turbo".to_string(),
                description: Some("經濟實惠且快速的模型".to_string()),
                max_tokens: Some(16384),
                supports_streaming: true,
                cost_per_token: Some(0.0000005),
            },
        ]
    }
}

#[async_trait]
impl AIProvider for OpenAIProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn provider_type(&self) -> &str {
        "openai"
    }

    async fn check_availability(&self) -> Result<bool> {
        log::info!("[OpenAIProvider] 檢查 OpenAI API 可用性，使用金鑰: {}...", SecurityUtils::mask_api_key(&self.api_key));
        
        // 嘗試獲取模型列表來測試 API 金鑰
        match self.make_get_request::<OpenAIModelsResponse>("/models").await {
            Ok(_) => {
                log::info!("[OpenAIProvider] OpenAI API 可用");
                Ok(true)
            }
            Err(e) => {
                log::warn!("[OpenAIProvider] OpenAI API 不可用: {}", e);
                Err(e)
            }
        }
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        log::info!("[OpenAIProvider] 獲取 OpenAI 模型列表...");
        
        // 先嘗試從 API 獲取
        match self.make_get_request::<OpenAIModelsResponse>("/models").await {
            Ok(response) => {
                let models: Vec<ModelInfo> = response.data.into_iter()
                    .filter(|model| {
                        // 只顯示 GPT 模型，過濾其他類型
                        model.id.starts_with("gpt-")
                    })
                    .map(|model| {
                        // 根據模型名稱推測性能參數
                        let (max_tokens, cost_per_token) = if model.id.contains("gpt-4") {
                            if model.id.contains("turbo") || model.id.contains("4o") {
                                (Some(128000), Some(0.00003))
                            } else {
                                (Some(8192), Some(0.00006))
                            }
                        } else {
                            (Some(16384), Some(0.0000015))
                        };
                        
                        ModelInfo {
                            id: model.id.clone(),
                            name: model.id,
                            description: Some(format!("OpenAI 模型，由 {} 提供", model.owned_by)),
                            max_tokens,
                            supports_streaming: true,
                            cost_per_token,
                        }
                    })
                    .collect();
                
                log::info!("[OpenAIProvider] 成功獲取 {} 個模型", models.len());
                Ok(models)
            }
            Err(_) => {
                log::warn!("[OpenAIProvider] API 獲取模型失敗，使用預定義列表");
                Ok(Self::get_popular_models())
            }
        }
    }

    async fn generate_text(&self, request: AIGenerationRequest) -> Result<AIGenerationResponse> {
        // 🔒 安全驗證：檢查輸入參數
        SecurityUtils::validate_generation_params(&request.params)?;
        SecurityUtils::validate_prompt_content(&request.prompt, request.system_prompt.as_deref())?;
        
        // 🔥 新增：驗證模型 ID 是否有效
        if !is_valid_openai_model(&request.model) {
            return Err(anyhow!("無效的 OpenAI 模型 ID: {}。支援的模型: gpt-4o, gpt-4o-mini, gpt-3.5-turbo, gpt-4-turbo", request.model));
        }
        
        log::info!("[OpenAIProvider] ✅ 開始生成文本，模型: {}, API金鑰: {}", request.model, SecurityUtils::mask_api_key(&self.api_key));

        // 構建訊息列表
        let mut messages = Vec::new();
        
        // 添加系統提示（如果有）
        if let Some(system_prompt) = &request.system_prompt {
            messages.push(OpenAIMessage {
                role: "system".to_string(),
                content: Some(system_prompt.clone()),
                reasoning: None,
                reasoning_summary: None,
            });
        }
        
        // 添加用戶提示
        messages.push(OpenAIMessage {
            role: "user".to_string(),
            content: Some(request.prompt),
            reasoning: None,
            reasoning_summary: None,
        });

        // 🔥 關鍵修復：根據模型類型選擇正確的參數
        let is_new_model = is_new_api_model(&request.model);
        
        let (max_tokens, max_completion_tokens) = if is_new_model {
            log::info!("[OpenAIProvider] 🆕 使用新API格式 (max_completion_tokens) 對模型: {}", request.model);
            (None, Some(request.params.max_tokens))
        } else {
            log::info!("[OpenAIProvider] 📝 使用舊API格式 (max_tokens) 對模型: {}", request.model);
            (Some(request.params.max_tokens), None)
        };

        // 🔥 新修復：GPT-5 系列模型只接受特定的參數值
        let (temperature, top_p, presence_penalty, frequency_penalty, stop) = if is_new_model {
            log::info!("[OpenAIProvider] 🎯 GPT-5 系列模型：使用固定參數 (temperature=1.0)");
            (1.0, None, None, None, None) // GPT-5 系列只接受預設值
        } else {
            log::info!("[OpenAIProvider] 🎛️ 傳統模型：使用用戶自定義參數");
            (
                request.params.temperature,
                request.params.top_p,
                request.params.presence_penalty,
                request.params.frequency_penalty,
                request.params.stop.clone(),
            )
        };

        let openai_request = OpenAIRequest {
            model: request.model.clone(),
            messages,
            temperature,
            max_tokens,
            max_completion_tokens,
            top_p,
            presence_penalty,
            frequency_penalty,
            stop,
        };

        let response = self.make_post_request::<OpenAIResponse>("/chat/completions", &openai_request).await?;
        
        // 🔥 診斷日志：記錄完整的API回應
        log::debug!("[OpenAIProvider] 🔍 完整API回應: {}", serde_json::to_string_pretty(&response).unwrap_or_default());
        if let Some(choice) = response.choices.first() {
            log::debug!("[OpenAIProvider] 🔍 message結構: {}", serde_json::to_string_pretty(&choice.message).unwrap_or_default());
        }
        
        // 🔥 使用階段一檢測邏輯處理響應格式差異
        let model_chars = detect_model_characteristics(&request.model);
        let actual_text = match model_chars.response_format {
            ResponseFormat::Standard => {
                // OpenAI 標準格式：嘗試多個欄位
                if let Some(choice) = response.choices.first() {
                    // 優先檢查 content 欄位
                    if let Some(content) = &choice.message.content {
                        if !content.trim().is_empty() {
                            log::info!("[OpenAIProvider] ✅ 使用標準 content 格式，生成 {} 字符", content.len());
                            content.clone()
                        } else {
                            // content 為空，檢查其他欄位
                            Self::extract_text_from_reasoning_fields(choice)
                        }
                    } else {
                        // content 不存在，檢查其他欄位
                        Self::extract_text_from_reasoning_fields(choice)
                    }
                } else {
                    log::warn!("[OpenAIProvider] ⚠️ choices 陣列為空");
                    String::new()
                }
            },
            _ => {
                // 降級處理：嘗試從 choices 獲取所有可能的欄位
                if let Some(choice) = response.choices.first() {
                    log::info!("[OpenAIProvider] 📝 降級處理：檢查所有可能的欄位");
                    
                    // 檢查 content
                    if let Some(content) = &choice.message.content {
                        if !content.trim().is_empty() {
                            content.clone()
                        } else {
                            Self::extract_text_from_reasoning_fields(choice)
                        }
                    } else {
                        Self::extract_text_from_reasoning_fields(choice)
                    }
                } else {
                    log::warn!("[OpenAIProvider] ⚠️ 無法獲取任何響應內容");
                    String::new()
                }
            }
        };
        
        if !actual_text.trim().is_empty() {
            log::info!("[OpenAIProvider] 文本生成成功，長度: {} 字符", actual_text.len());
            
            let usage = AIUsageInfo {
                prompt_tokens: Some(response.usage.prompt_tokens),
                completion_tokens: Some(response.usage.completion_tokens),
                total_tokens: Some(response.usage.total_tokens),
            };

            Ok(AIGenerationResponse {
                text: actual_text,
                model: response.model,
                usage: Some(usage),
                finish_reason: response.choices.first()
                    .and_then(|c| c.finish_reason.clone()),
            })
        } else {
            Err(anyhow!("OpenAI API 回應中沒有有效內容"))
        }
    }

    async fn validate_api_key(&self, api_key: &str) -> Result<bool> {
        log::info!("[OpenAIProvider] 驗證 API 金鑰: {}...", SecurityUtils::mask_api_key(api_key));
        
        // 建立臨時客戶端來測試 API 金鑰
        let temp_client = Client::new();
        let url = format!("{}/models", self.endpoint);
        let auth_header = format!("Bearer {}", api_key);
        
        let response = temp_client
            .get(&url)
            .header("Authorization", auth_header)
            .header("Content-Type", "application/json")
            .timeout(Duration::from_secs(30))
            .send()
            .await?;

        if response.status().is_success() {
            log::info!("[OpenAIProvider] API 金鑰驗證成功");
            Ok(true)
        } else {
            log::warn!("[OpenAIProvider] API 金鑰驗證失敗: {}", response.status());
            Ok(false)
        }
    }

    async fn estimate_cost(&self, request: &AIGenerationRequest) -> Result<Option<f64>> {
        // 粗略估算：輸入 + 輸出 token 成本
        // 這是一個簡化的估算，實際成本可能有所不同
        let input_cost_per_token = if request.model.contains("gpt-4o-mini") {
            0.00000015
        } else if request.model.contains("gpt-4") {
            0.00003
        } else {
            0.0000015
        };
        
        let output_cost_per_token = input_cost_per_token * 2.0; // 輸出通常比輸入貴
        
        // 估算輸入 token 數（大約每4個字符1個token）
        let estimated_input_tokens = (request.prompt.len() / 4) as f64;
        let estimated_output_tokens = request.params.max_tokens as f64;
        
        let estimated_cost = (estimated_input_tokens * input_cost_per_token) + 
                           (estimated_output_tokens * output_cost_per_token);
        
        Ok(Some(estimated_cost))
    }

    fn default_params(&self) -> AIGenerationParams {
        AIGenerationParams {
            temperature: 0.7,
            max_tokens: 2000,
            top_p: Some(1.0),
            presence_penalty: Some(0.0),
            frequency_penalty: Some(0.0),
            stop: None,
        }
    }

    fn requires_api_key(&self) -> bool {
        true
    }

    fn supports_custom_endpoint(&self) -> bool {
        true // 支援自訂端點，適用於 Azure OpenAI 等
    }
}