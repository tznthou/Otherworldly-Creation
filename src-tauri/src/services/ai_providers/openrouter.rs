use anyhow::{Result, anyhow};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::collections::HashMap;

use super::r#trait::{
    AIProvider, ProviderConfig, AIGenerationRequest, AIGenerationResponse, 
    AIGenerationParams, AIUsageInfo, ModelInfo
};

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<OpenRouterMessage>,
    temperature: f64,
    max_tokens: i32,
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
struct OpenRouterMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterResponse {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<OpenRouterChoice>,
    usage: OpenRouterUsage,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterChoice {
    index: i32,
    message: OpenRouterMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterUsage {
    prompt_tokens: i32,
    completion_tokens: i32,
    total_tokens: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterModelsResponse {
    data: Vec<OpenRouterModelData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterModelData {
    id: String,
    name: String,
    description: Option<String>,
    context_length: Option<i32>,
    pricing: Option<OpenRouterPricing>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterPricing {
    prompt: String,
    completion: String,
}

/// OpenRouter API 提供者
pub struct OpenRouterProvider {
    name: String,
    api_key: String,
    endpoint: String,
    model: String,
    client: Client,
    timeout: Duration,
    settings: HashMap<String, serde_json::Value>,
}

impl OpenRouterProvider {
    pub fn new(config: &ProviderConfig) -> Result<Self> {
        let api_key = config.api_key
            .as_ref()
            .ok_or_else(|| anyhow!("OpenRouter 需要 API 金鑰"))?
            .clone();

        let client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|e| anyhow!("建立 HTTP 客戶端失敗: {}", e))?;

        let endpoint = config.endpoint
            .clone()
            .unwrap_or_else(|| "https://openrouter.ai/api/v1".to_string());

        Ok(Self {
            name: config.name.clone(),
            api_key,
            endpoint,
            model: config.model.clone(),
            client,
            timeout: Duration::from_secs(180),
            settings: config.settings.clone(),
        })
    }

    /// 發送 GET 請求到 OpenRouter API
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
            Err(anyhow!("OpenRouter API 錯誤 {}: {}", status, error_text))
        }
    }

    /// 發送 POST 請求到 OpenRouter API
    async fn make_post_request<T>(&self, endpoint: &str, body: &impl Serialize) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://genesis-chronicle.app") // OpenRouter 要求
            .header("X-Title", "Genesis Chronicle") // OpenRouter 要求
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
            Err(anyhow!("OpenRouter API 錯誤 {}: {}", status, error_text))
        }
    }

    /// 獲取熱門模型的預定義列表（用於離線情況）
    fn get_popular_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "anthropic/claude-3.5-sonnet".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                description: Some("Anthropic 的最新強大模型".to_string()),
                max_tokens: Some(200000),
                supports_streaming: true,
                cost_per_token: Some(0.000003),
            },
            ModelInfo {
                id: "openai/gpt-4o".to_string(),
                name: "GPT-4o".to_string(),
                description: Some("OpenAI 的最新多模態模型".to_string()),
                max_tokens: Some(128000),
                supports_streaming: true,
                cost_per_token: Some(0.000005),
            },
            ModelInfo {
                id: "google/gemini-pro-1.5".to_string(),
                name: "Gemini Pro 1.5".to_string(),
                description: Some("Google 的先進語言模型".to_string()),
                max_tokens: Some(1000000),
                supports_streaming: true,
                cost_per_token: Some(0.0000025),
            },
            ModelInfo {
                id: "meta-llama/llama-3.1-70b-instruct".to_string(),
                name: "Llama 3.1 70B Instruct".to_string(),
                description: Some("Meta 的開源大語言模型".to_string()),
                max_tokens: Some(131072),
                supports_streaming: true,
                cost_per_token: Some(0.00000088),
            },
            ModelInfo {
                id: "mistralai/mixtral-8x7b-instruct".to_string(),
                name: "Mixtral 8x7B Instruct".to_string(),
                description: Some("Mistral AI 的混合專家模型".to_string()),
                max_tokens: Some(32768),
                supports_streaming: true,
                cost_per_token: Some(0.00000024),
            },
        ]
    }

    /// 解析價格字符串為浮點數
    fn parse_pricing(pricing_str: &str) -> Option<f64> {
        pricing_str.trim_start_matches('$').parse::<f64>().ok()
    }
}

#[async_trait]
impl AIProvider for OpenRouterProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn provider_type(&self) -> &str {
        "openrouter"
    }

    async fn check_availability(&self) -> Result<bool> {
        log::info!("[OpenRouterProvider] 檢查 OpenRouter API 可用性...");
        
        // 嘗試獲取模型列表來測試 API 金鑰
        match self.make_get_request::<OpenRouterModelsResponse>("/models").await {
            Ok(_) => {
                log::info!("[OpenRouterProvider] OpenRouter API 可用");
                Ok(true)
            }
            Err(e) => {
                log::warn!("[OpenRouterProvider] OpenRouter API 不可用: {}", e);
                Err(e)
            }
        }
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        log::info!("[OpenRouterProvider] 獲取 OpenRouter 模型列表...");
        
        // 先嘗試從 API 獲取
        match self.make_get_request::<OpenRouterModelsResponse>("/models").await {
            Ok(response) => {
                let models: Vec<ModelInfo> = response.data.into_iter()
                    .map(|model| {
                        let max_tokens = model.context_length;
                        let cost_per_token = model.pricing
                            .as_ref()
                            .and_then(|p| Self::parse_pricing(&p.prompt));
                        
                        ModelInfo {
                            id: model.id.clone(),
                            name: model.name,
                            description: model.description,
                            max_tokens,
                            supports_streaming: true, // OpenRouter 大部分模型支持串流
                            cost_per_token,
                        }
                    })
                    .collect();
                
                log::info!("[OpenRouterProvider] 成功獲取 {} 個模型", models.len());
                Ok(models)
            }
            Err(_) => {
                log::warn!("[OpenRouterProvider] API 獲取模型失敗，使用預定義列表");
                Ok(Self::get_popular_models())
            }
        }
    }

    async fn generate_text(&self, request: AIGenerationRequest) -> Result<AIGenerationResponse> {
        log::info!("[OpenRouterProvider] 開始生成文本，模型: {}", request.model);

        // 構建訊息列表
        let mut messages = Vec::new();
        
        // 添加系統提示（如果有）
        if let Some(system_prompt) = &request.system_prompt {
            messages.push(OpenRouterMessage {
                role: "system".to_string(),
                content: system_prompt.clone(),
            });
        }
        
        // 添加用戶提示
        messages.push(OpenRouterMessage {
            role: "user".to_string(),
            content: request.prompt,
        });

        let openrouter_request = OpenRouterRequest {
            model: request.model.clone(),
            messages,
            temperature: request.params.temperature,
            max_tokens: request.params.max_tokens,
            top_p: request.params.top_p,
            presence_penalty: request.params.presence_penalty,
            frequency_penalty: request.params.frequency_penalty,
            stop: request.params.stop,
        };

        let response = self.make_post_request::<OpenRouterResponse>("/chat/completions", &openrouter_request).await?;
        
        if let Some(choice) = response.choices.first() {
            log::info!("[OpenRouterProvider] 文本生成成功");
            
            let usage = AIUsageInfo {
                prompt_tokens: Some(response.usage.prompt_tokens),
                completion_tokens: Some(response.usage.completion_tokens),
                total_tokens: Some(response.usage.total_tokens),
            };

            Ok(AIGenerationResponse {
                text: choice.message.content.clone(),
                model: response.model,
                usage: Some(usage),
                finish_reason: choice.finish_reason.clone(),
            })
        } else {
            Err(anyhow!("OpenRouter API 回應中沒有選擇項"))
        }
    }

    async fn validate_api_key(&self, api_key: &str) -> Result<bool> {
        log::info!("[OpenRouterProvider] 驗證 API 金鑰...");
        
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
            log::info!("[OpenRouterProvider] API 金鑰驗證成功");
            Ok(true)
        } else {
            log::warn!("[OpenRouterProvider] API 金鑰驗證失敗: {}", response.status());
            Ok(false)
        }
    }

    async fn estimate_cost(&self, request: &AIGenerationRequest) -> Result<Option<f64>> {
        // OpenRouter 的成本取決於具體模型，這裡提供粗略估算
        let base_cost_per_token = if request.model.contains("claude") {
            0.000008
        } else if request.model.contains("gpt-4") {
            0.00003
        } else if request.model.contains("gemini") {
            0.0000025
        } else if request.model.contains("llama") {
            0.0000004
        } else {
            0.000001 // 預設值
        };
        
        // 估算token數
        let estimated_input_tokens = (request.prompt.len() / 4) as f64;
        let estimated_output_tokens = request.params.max_tokens as f64;
        
        let estimated_cost = (estimated_input_tokens + estimated_output_tokens) * base_cost_per_token;
        
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
        false // OpenRouter 使用標準端點
    }
}