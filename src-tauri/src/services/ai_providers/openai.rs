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

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f64,
    max_tokens: i32,
    top_p: Option<f64>,
    presence_penalty: Option<f64>,
    frequency_penalty: Option<f64>,
    stop: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
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

impl OpenAIProvider {
    pub fn new(config: &ProviderConfig) -> Result<Self> {
        let api_key = config.api_key
            .as_ref()
            .ok_or_else(|| anyhow!("OpenAI 需要 API 金鑰"))?
            .clone();

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

    /// 發送 GET 請求到 OpenAI API
    async fn make_get_request<T>(&self, endpoint: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
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
            Err(anyhow!("OpenAI API 錯誤 {}: {}", status, error_text))
        }
    }

    /// 發送 POST 請求到 OpenAI API
    async fn make_post_request<T>(&self, endpoint: &str, body: &impl Serialize) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
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
            Err(anyhow!("OpenAI API 錯誤 {}: {}", status, error_text))
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
        log::info!("[OpenAIProvider] 檢查 OpenAI API 可用性...");
        
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
        log::info!("[OpenAIProvider] 開始生成文本，模型: {}", request.model);

        // 構建訊息列表
        let mut messages = Vec::new();
        
        // 添加系統提示（如果有）
        if let Some(system_prompt) = &request.system_prompt {
            messages.push(OpenAIMessage {
                role: "system".to_string(),
                content: system_prompt.clone(),
            });
        }
        
        // 添加用戶提示
        messages.push(OpenAIMessage {
            role: "user".to_string(),
            content: request.prompt,
        });

        let openai_request = OpenAIRequest {
            model: request.model.clone(),
            messages,
            temperature: request.params.temperature,
            max_tokens: request.params.max_tokens,
            top_p: request.params.top_p,
            presence_penalty: request.params.presence_penalty,
            frequency_penalty: request.params.frequency_penalty,
            stop: request.params.stop,
        };

        let response = self.make_post_request::<OpenAIResponse>("/chat/completions", &openai_request).await?;
        
        // 🔥 使用階段一檢測邏輯處理響應格式差異
        let model_chars = detect_model_characteristics(&request.model);
        let actual_text = match model_chars.response_format {
            ResponseFormat::Standard => {
                // OpenAI 標準格式：choices[0].message.content
                if let Some(choice) = response.choices.first() {
                    if !choice.message.content.trim().is_empty() {
                        log::info!("[OpenAIProvider] ✅ 使用標準 choices 格式，生成 {} 字符", choice.message.content.len());
                        choice.message.content.clone()
                    } else {
                        log::warn!("[OpenAIProvider] ⚠️ choices 中文本為空");
                        String::new()
                    }
                } else {
                    log::warn!("[OpenAIProvider] ⚠️ choices 陣列為空");
                    String::new()
                }
            },
            _ => {
                // 降級處理：嘗試從 choices 獲取
                if let Some(choice) = response.choices.first() {
                    log::info!("[OpenAIProvider] 📝 降級使用 choices 格式");
                    choice.message.content.clone()
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
        log::info!("[OpenAIProvider] 驗證 API 金鑰...");
        
        // 建立臨時客戶端來測試 API 金鑰
        let temp_client = Client::new();
        let url = format!("{}/models", self.endpoint);
        
        let response = temp_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", api_key))
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