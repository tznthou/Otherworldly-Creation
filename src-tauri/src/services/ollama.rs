use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use anyhow::{Result, anyhow};

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaResponse {
    pub models: Vec<OllamaModel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaVersionResponse {
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    pub options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaOptions {
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    #[serde(rename = "num_predict")]
    pub max_tokens: Option<u32>,  // Ollama 使用 num_predict 而不是 max_tokens
    pub presence_penalty: Option<f32>,
    pub frequency_penalty: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaGenerateResponse {
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub available: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelsResult {
    pub success: bool,
    pub models: Vec<ModelInfo>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateResult {
    pub success: bool,
    pub response: Option<String>,
    pub error: Option<String>,
    pub metadata: Option<GenerateMetadata>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateMetadata {
    pub total_duration: Option<u64>,
    pub eval_count: Option<u32>,
    pub eval_duration: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelAvailability {
    pub available: bool,
    pub error: Option<String>,
}

pub struct OllamaService {
    client: Client,
    base_url: String,
    timeout: Duration,
    retry_attempts: u32,
    retry_delay: Duration,
}

impl OllamaService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(300))  // 增加到 5 分鐘，給 AI 生成足夠時間
            .build()
            .expect("建立 HTTP 客戶端失敗");
        
        Self {
            client,
            base_url: "http://127.0.0.1:11434".to_string(),
            timeout: Duration::from_secs(120),  // API 呼叫 timeout 設為 2 分鐘
            retry_attempts: 2,
            retry_delay: Duration::from_millis(500),
        }
    }

    /// 檢查 Ollama 服務是否可用
    pub async fn check_service_availability(&self) -> ServiceStatus {
        log::info!("[OllamaService] 開始檢查服務可用性...");
        
        match self.make_get_request::<OllamaVersionResponse>("/api/version").await {
            Ok(version_response) => {
                log::info!("[OllamaService] 服務檢查成功，版本: {}", version_response.version);
                ServiceStatus {
                    available: true,
                    version: Some(version_response.version),
                    error: None,
                }
            }
            Err(e) => {
                let error_msg = e.to_string();
                log::warn!("[OllamaService] 服務檢查失敗: {}", error_msg);
                
                let error_description = if error_msg.contains("Connection refused") {
                    "Ollama 服務未啟動，請執行 ollama serve".to_string()
                } else if error_msg.contains("timeout") {
                    "Ollama 服務響應超時".to_string()
                } else {
                    error_msg
                };

                ServiceStatus {
                    available: false,
                    version: None,
                    error: Some(error_description),
                }
            }
        }
    }

    /// 獲取可用模型列表
    pub async fn list_models(&self) -> ModelsResult {
        log::info!("[OllamaService] 獲取模型列表...");
        
        match self.make_get_request::<OllamaResponse>("/api/tags").await {
            Ok(response) => {
                let models: Vec<ModelInfo> = response.models.into_iter().map(|model| {
                    ModelInfo {
                        name: model.name,
                        size: model.size,
                        modified_at: model.modified_at,
                    }
                }).collect();

                log::info!("[OllamaService] 獲取到 {} 個模型", models.len());
                ModelsResult {
                    success: true,
                    models,
                    error: None,
                }
            }
            Err(e) => {
                let error_msg = e.to_string();
                log::error!("[OllamaService] 獲取模型失敗: {}", error_msg);
                
                let error_description = if error_msg.contains("Connection refused") {
                    "Ollama 服務未啟動".to_string()
                } else {
                    format!("獲取模型列表失敗: {}", error_msg)
                };

                ModelsResult {
                    success: false,
                    models: vec![],
                    error: Some(error_description),
                }
            }
        }
    }

    /// 生成文本
    pub async fn generate_text(
        &self,
        model: &str,
        prompt: &str,
        options: Option<OllamaOptions>,
    ) -> GenerateResult {
        log::info!("[OllamaService] 開始生成文本，模型: {}", model);

        // 先檢查服務可用性
        let service_status = self.check_service_availability().await;
        if !service_status.available {
            return GenerateResult {
                success: false,
                response: None,
                error: service_status.error,
                metadata: None,
            };
        }

        let request_body = OllamaGenerateRequest {
            model: model.to_string(),
            prompt: prompt.to_string(),
            stream: false,
            options,
        };

        // 重試機制
        let mut last_error = String::new();
        for attempt in 1..=self.retry_attempts {
            match self.make_post_request::<OllamaGenerateResponse>("/api/generate", &request_body).await {
                Ok(response) => {
                    log::info!("[OllamaService] 文本生成成功");
                    return GenerateResult {
                        success: true,
                        response: Some(response.response),
                        error: None,
                        metadata: Some(GenerateMetadata {
                            total_duration: response.total_duration,
                            eval_count: response.eval_count,
                            eval_duration: response.eval_duration,
                        }),
                    };
                }
                Err(e) => {
                    last_error = e.to_string();
                    log::warn!("[OllamaService] 生成文本嘗試 {}/{} 失敗: {}", attempt, self.retry_attempts, last_error);
                    
                    if attempt < self.retry_attempts {
                        tokio::time::sleep(self.retry_delay).await;
                    }
                }
            }
        }

        GenerateResult {
            success: false,
            response: None,
            error: Some(format!("生成文本失敗 ({} 次嘗試): {}", self.retry_attempts, last_error)),
            metadata: None,
        }
    }

    /// 檢查特定模型是否可用
    pub async fn check_model_availability(&self, model_name: &str) -> ModelAvailability {
        let models_result = self.list_models().await;
        
        if !models_result.success {
            return ModelAvailability {
                available: false,
                error: models_result.error,
            };
        }
        
        let model_exists = models_result.models.iter().any(|model| model.name == model_name);
        
        ModelAvailability {
            available: model_exists,
            error: if model_exists {
                None
            } else {
                Some(format!("模型 {} 不存在", model_name))
            },
        }
    }

    /// 更新配置
    pub fn update_config(&mut self, config: UpdateConfig) {
        if let Some(base_url) = config.base_url {
            // 自動將 localhost 轉換為 127.0.0.1 以避免 IPv6 解析問題
            self.base_url = base_url.replace("localhost", "127.0.0.1");
        }
        if let Some(timeout) = config.timeout {
            self.timeout = Duration::from_secs(timeout);
        }
        if let Some(retry_attempts) = config.retry_attempts {
            self.retry_attempts = retry_attempts;
        }
        if let Some(retry_delay) = config.retry_delay {
            self.retry_delay = Duration::from_millis(retry_delay);
        }
    }

    /// 發送 GET 請求
    async fn make_get_request<T>(&self, endpoint: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let url = format!("{}{}", self.base_url, endpoint);
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
        let url = format!("{}{}", self.base_url, endpoint);
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

#[derive(Debug, Default)]
pub struct UpdateConfig {
    pub base_url: Option<String>,
    pub timeout: Option<u64>,
    pub retry_attempts: Option<u32>,
    pub retry_delay: Option<u64>,
}

// 全域配置
use std::sync::Arc;
use tokio::sync::Mutex;
use std::sync::LazyLock;

static OLLAMA_SERVICE: LazyLock<Arc<Mutex<OllamaService>>> = LazyLock::new(|| {
    Arc::new(Mutex::new(OllamaService::new()))
});

pub fn get_ollama_service() -> Arc<Mutex<OllamaService>> {
    OLLAMA_SERVICE.clone()
}