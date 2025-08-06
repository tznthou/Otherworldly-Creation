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
struct ClaudeRequest {
    model: String,
    max_tokens: i32,
    messages: Vec<ClaudeMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    temperature: f64,
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
            Err(anyhow!("Claude API 錯誤 {}: {}", status, error_text))
        }
    }

    /// 獲取可用的 Claude 模型列表
    fn get_available_models() -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "claude-3-5-sonnet-20241022".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                description: Some("最新的Claude 3.5 Sonnet，表現最佳".to_string()),
                max_tokens: Some(200000),
                supports_streaming: true,
                cost_per_token: Some(0.000003), // 輸入token成本
            },
            ModelInfo {
                id: "claude-3-5-haiku-20241022".to_string(),
                name: "Claude 3.5 Haiku".to_string(),
                description: Some("快速且經濟的Claude模型".to_string()),
                max_tokens: Some(200000),
                supports_streaming: true,
                cost_per_token: Some(0.00000025),
            },
            ModelInfo {
                id: "claude-3-opus-20240229".to_string(),
                name: "Claude 3 Opus".to_string(),
                description: Some("最強大的Claude模型，適合複雜任務".to_string()),
                max_tokens: Some(200000),
                supports_streaming: true,
                cost_per_token: Some(0.000015),
            },
            ModelInfo {
                id: "claude-3-sonnet-20240229".to_string(),
                name: "Claude 3 Sonnet".to_string(),
                description: Some("平衡性能與成本的Claude模型".to_string()),
                max_tokens: Some(200000),
                supports_streaming: true,
                cost_per_token: Some(0.000003),
            },
            ModelInfo {
                id: "claude-3-haiku-20240307".to_string(),
                name: "Claude 3 Haiku".to_string(),
                description: Some("快速回應的輕量級Claude模型".to_string()),
                max_tokens: Some(200000),
                supports_streaming: true,
                cost_per_token: Some(0.00000025),
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
        log::info!("[ClaudeProvider] 檢查 Claude API 可用性...");
        
        // 發送簡單的測試請求
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
            temperature: 0.1,
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
        log::info!("[ClaudeProvider] 開始生成文本，模型: {}", request.model);

        // 構建消息列表
        let messages = vec![
            ClaudeMessage {
                role: "user".to_string(),
                content: request.prompt,
            }
        ];

        let claude_request = ClaudeRequest {
            model: request.model.clone(),
            max_tokens: request.params.max_tokens,
            messages,
            system: request.system_prompt,
            temperature: request.params.temperature,
            top_p: request.params.top_p,
            stop_sequences: request.params.stop,
        };

        let response = self.make_post_request::<ClaudeResponse>("/messages", &claude_request).await?;
        
        if let Some(content) = response.content.first() {
            log::info!("[ClaudeProvider] 文本生成成功");
            
            let usage = AIUsageInfo {
                prompt_tokens: Some(response.usage.input_tokens),
                completion_tokens: Some(response.usage.output_tokens),
                total_tokens: Some(response.usage.input_tokens + response.usage.output_tokens),
            };

            Ok(AIGenerationResponse {
                text: content.text.clone(),
                model: response.model,
                usage: Some(usage),
                finish_reason: response.stop_reason,
            })
        } else {
            Err(anyhow!("Claude API 回應中沒有內容"))
        }
    }

    async fn validate_api_key(&self, api_key: &str) -> Result<bool> {
        log::info!("[ClaudeProvider] 驗證 API 金鑰...");
        
        // 建立臨時客戶端來測試 API 金鑰
        let temp_client = Client::new();
        let url = format!("{}/messages", self.endpoint);
        
        let test_request = ClaudeRequest {
            model: "claude-3-haiku-20240307".to_string(), // 使用最便宜的模型測試
            max_tokens: 5,
            messages: vec![
                ClaudeMessage {
                    role: "user".to_string(),
                    content: "hi".to_string(),
                }
            ],
            system: None,
            temperature: 0.1,
            top_p: None,
            stop_sequences: None,
        };
        
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
        let (input_cost_per_million, output_cost_per_million) = if request.model.contains("claude-3-5-sonnet") {
            (3.0, 15.0)
        } else if request.model.contains("claude-3-5-haiku") {
            (0.25, 1.25)
        } else if request.model.contains("claude-3-opus") {
            (15.0, 75.0)
        } else if request.model.contains("claude-3-sonnet") {
            (3.0, 15.0)
        } else if request.model.contains("claude-3-haiku") {
            (0.25, 1.25)
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