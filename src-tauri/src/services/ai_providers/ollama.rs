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
struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaResponse {
    pub models: Vec<OllamaModel>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaVersionResponse {
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    pub options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaOptions {
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    #[serde(rename = "num_predict")]
    pub max_tokens: Option<u32>,  // Ollama 使用 num_predict 而不是 max_tokens
    pub presence_penalty: Option<f32>,
    pub frequency_penalty: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaGenerateResponse {
    pub response: String,
    pub done: bool,
    pub context: Option<Vec<i32>>,
    pub total_duration: Option<u64>,
    pub load_duration: Option<u64>,
    pub prompt_eval_count: Option<u32>,
    pub prompt_eval_duration: Option<u64>,
    pub eval_count: Option<u32>,
    pub eval_duration: Option<u64>,
}

/// Ollama AI 提供者
pub struct OllamaProvider {
    name: String,
    endpoint: String,
    model: String,
    client: Client,
    timeout: Duration,
    retry_attempts: u32,
    retry_delay: Duration,
    settings: HashMap<String, serde_json::Value>,
}

impl OllamaProvider {
    pub fn new(config: &ProviderConfig) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(400))  // 增加到 6.5 分鐘，給 AI 生成足夠時間
            .build()
            .map_err(|e| anyhow!("建立 HTTP 客戶端失敗: {}", e))?;

        // 自動將 localhost 轉換為 127.0.0.1 以避免 IPv6 解析問題
        let endpoint = config.endpoint
            .clone()
            .unwrap_or_else(|| "http://127.0.0.1:11434".to_string())
            .replace("localhost", "127.0.0.1");

        Ok(Self {
            name: config.name.clone(),
            endpoint,
            model: config.model.clone(),
            client,
            timeout: Duration::from_secs(300),  // API 呼叫 timeout 設為 5 分鐘
            retry_attempts: 2,
            retry_delay: Duration::from_millis(500),
            settings: config.settings.clone(),
        })
    }

    /// 發送 GET 請求
    async fn make_get_request<T>(&self, endpoint: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        let response = self.client
            .get(&url)
            .timeout(self.timeout)
            .send()
            .await?;

        if response.status().is_success() {
            let data = response.json::<T>().await?;
            Ok(data)
        } else {
            Err(anyhow!("HTTP {}: {}", response.status(), response.status().canonical_reason().unwrap_or("Unknown")))
        }
    }

    /// 發送 POST 請求
    async fn make_post_request<T>(&self, endpoint: &str, body: &impl Serialize) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.endpoint, endpoint);
        let response = self.client
            .post(&url)
            .json(body)
            .timeout(self.timeout)
            .send()
            .await?;

        if response.status().is_success() {
            let data = response.json::<T>().await?;
            Ok(data)
        } else {
            Err(anyhow!("HTTP {}: {}", response.status(), response.status().canonical_reason().unwrap_or("Unknown")))
        }
    }
}

#[async_trait]
impl AIProvider for OllamaProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn provider_type(&self) -> &str {
        "ollama"
    }

    async fn check_availability(&self) -> Result<bool> {
        log::info!("[OllamaProvider] 開始檢查服務可用性...");
        
        match self.make_get_request::<OllamaVersionResponse>("/api/version").await {
            Ok(version_response) => {
                log::info!("[OllamaProvider] 服務檢查成功，版本: {}", version_response.version);
                Ok(true)
            }
            Err(e) => {
                let error_msg = e.to_string();
                log::warn!("[OllamaProvider] 服務檢查失敗: {}", error_msg);
                
                if error_msg.contains("Connection refused") {
                    Err(anyhow!("Ollama 服務未啟動，請執行 ollama serve"))
                } else if error_msg.contains("timeout") {
                    Err(anyhow!("Ollama 服務響應超時"))
                } else {
                    Err(e)
                }
            }
        }
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        log::info!("[OllamaProvider] 獲取模型列表...");
        
        let response = self.make_get_request::<OllamaResponse>("/api/tags").await?;
        
        let models: Vec<ModelInfo> = response.models.into_iter().map(|model| {
            ModelInfo {
                id: model.name.clone(),
                name: model.name,
                description: None,
                max_tokens: Some(4096), // Ollama 預設上下文長度
                supports_streaming: true,
                cost_per_token: None, // Ollama 本地運行免費
            }
        }).collect();

        log::info!("[OllamaProvider] 獲取到 {} 個模型", models.len());
        Ok(models)
    }

    async fn generate_text(&self, request: AIGenerationRequest) -> Result<AIGenerationResponse> {
        log::info!("[OllamaProvider] 開始生成文本，模型: {}", request.model);

        // 先檢查服務可用性
        self.check_availability().await?;

        // 轉換參數格式
        let options = OllamaOptions {
            temperature: Some(request.params.temperature as f32),
            top_p: request.params.top_p.map(|v| v as f32),
            max_tokens: Some(request.params.max_tokens as u32),
            presence_penalty: request.params.presence_penalty.map(|v| v as f32),
            frequency_penalty: request.params.frequency_penalty.map(|v| v as f32),
        };

        // 構建完整提示詞（包含系統提示）
        let full_prompt = if let Some(system_prompt) = &request.system_prompt {
            format!("{}\n\n{}", system_prompt, request.prompt)
        } else {
            request.prompt.clone()
        };

        let request_body = OllamaGenerateRequest {
            model: request.model.clone(),
            prompt: full_prompt,
            stream: false,
            options: Some(options),
        };

        // 重試機制
        let mut last_error = String::new();
        for attempt in 1..=self.retry_attempts {
            match self.make_post_request::<OllamaGenerateResponse>("/api/generate", &request_body).await {
                Ok(response) => {
                    log::info!("[OllamaProvider] 文本生成成功");
                    
                    let usage = AIUsageInfo {
                        prompt_tokens: response.prompt_eval_count.map(|v| v as i32),
                        completion_tokens: response.eval_count.map(|v| v as i32),
                        total_tokens: response.prompt_eval_count
                            .and_then(|p| response.eval_count.map(|c| (p + c) as i32)),
                    };

                    return Ok(AIGenerationResponse {
                        text: response.response,
                        model: request.model,
                        usage: Some(usage),
                        finish_reason: if response.done { Some("stop".to_string()) } else { None },
                    });
                }
                Err(e) => {
                    last_error = e.to_string();
                    log::warn!("[OllamaProvider] 生成文本嘗試 {}/{} 失敗: {}", attempt, self.retry_attempts, last_error);
                    
                    if attempt < self.retry_attempts {
                        tokio::time::sleep(self.retry_delay).await;
                    }
                }
            }
        }

        Err(anyhow!("生成文本失敗 ({} 次嘗試): {}", self.retry_attempts, last_error))
    }

    async fn validate_api_key(&self, _api_key: &str) -> Result<bool> {
        // Ollama 不需要 API 金鑰，直接檢查服務可用性
        self.check_availability().await
    }

    async fn estimate_cost(&self, _request: &AIGenerationRequest) -> Result<Option<f64>> {
        // Ollama 本地運行免費
        Ok(Some(0.0))
    }

    fn default_params(&self) -> AIGenerationParams {
        AIGenerationParams {
            temperature: 0.7,
            max_tokens: 2000,
            top_p: Some(0.9),
            presence_penalty: Some(0.0),
            frequency_penalty: Some(0.0),
            stop: None,
        }
    }

    fn requires_api_key(&self) -> bool {
        false // Ollama 不需要 API 金鑰
    }

    fn supports_custom_endpoint(&self) -> bool {
        true // Ollama 支援自訂端點
    }
}