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
    pub thinking: Option<String>,  // 🔥 新增：某些模型會使用這個字段
    pub context: Option<Vec<i32>>,
    pub total_duration: Option<u64>,
    pub load_duration: Option<u64>,
    pub prompt_eval_count: Option<u32>,
    pub prompt_eval_duration: Option<u64>,
    pub eval_count: Option<u32>,
    pub eval_duration: Option<u64>,
}

/// 過濾掉AI思考標籤和不當內容的函數
fn filter_thinking_tags(text: &str) -> String {
    use regex::Regex;
    
    log::info!("[OllamaProvider] 🔍 開始過濾，原始文本長度: {} 字符", text.len());
    log::debug!("[OllamaProvider] 🔍 原始文本（前500字符）: {}", text.chars().take(500).collect::<String>());
    
    let mut filtered_text = text.to_string();
    
    // 🔥 Step 1: 移除思考標籤
    let thinking_patterns = vec![
        r"(?s)<think[^>]*>.*?</think>",
        r"(?s)<thinking[^>]*>.*?</thinking>", 
        r"(?s)```thinking.*?```",
        r"(?s)\[THINKING\].*?\[/THINKING\]",
    ];
    
    for (i, pattern) in thinking_patterns.iter().enumerate() {
        if let Ok(re) = Regex::new(pattern) {
            let before_len = filtered_text.len();
            filtered_text = re.replace_all(&filtered_text, "").to_string();
            let after_len = filtered_text.len();
            if before_len != after_len {
                log::info!("[OllamaProvider] 🎯 思考模式 {} 移除了 {} 字符", i+1, before_len - after_len);
            }
        }
    }
    
    // 🔥 Step 2: 只移除明確的英文指導語句行
    let english_lines = [
        "We need to continue",
        "The existing text ends with:",
        "We need to insert",
        "The story is about",
        "Should be in Traditional Chinese",
        "Let's write:",
        "Provide continuation",
        "We have to insert",
        "The prompt gives",
        "Actually the content is",
        "The insertion point is",
        "JSON",
        "paragraph with some characters",
    ];
    
    for (i, line) in english_lines.iter().enumerate() {
        // 只移除包含這些短語的完整行
        let pattern = format!(r"(?m)^.*{}.*$
?", regex::escape(line));
        if let Ok(re) = Regex::new(&pattern) {
            let before_len = filtered_text.len();
            filtered_text = re.replace_all(&filtered_text, "").to_string();
            let after_len = filtered_text.len();
            if before_len != after_len {
                log::info!("[OllamaProvider] 🎯 英文行 {} '{}' 移除了 {} 字符", i+1, line, before_len - after_len);
            }
        }
    }
    
    // 🔥 Step 3: 清理格式
    filtered_text = filtered_text.replace("\n", "
");
    filtered_text = filtered_text.replace("\\n", "
");
    
    // 清理過多空行
    if let Ok(re) = Regex::new(r"
{3,}") {
        filtered_text = re.replace_all(&filtered_text, "

").to_string();
    }
    
    // 移除包圍引號
    if (filtered_text.starts_with('"') && filtered_text.ends_with('"') && filtered_text.len() > 2) ||
       (filtered_text.starts_with('\'') && filtered_text.ends_with('\'') && filtered_text.len() > 2) {
        filtered_text = filtered_text[1..filtered_text.len()-1].to_string();
        log::info!("[OllamaProvider] 🎯 移除了包圍引號");
    }
    
    filtered_text = filtered_text.trim().to_string();
    
    // 🔥 Step 4: 品質檢查和後備策略
    if filtered_text.is_empty() {
        log::warn!("[OllamaProvider] ⚠️ 過濾後文本為空，使用後備策略");
        // 後備：只移除明顯的思考標籤
        let mut backup_text = text.to_string();
        if let Ok(re) = Regex::new(r"(?s)<thinking>.*?</thinking>") {
            backup_text = re.replace_all(&backup_text, "").to_string();
        }
        if let Ok(re) = Regex::new(r"(?s)<think>.*?</think>") {
            backup_text = re.replace_all(&backup_text, "").to_string();
        }
        backup_text = backup_text.trim().to_string();
        log::warn!("[OllamaProvider] 🔄 後備策略文本長度: {} 字符", backup_text.len());
        return backup_text;
    }
    
    log::info!("[OllamaProvider] ✅ 過濾完成，返回文本長度: {} 字符", filtered_text.len());
    if filtered_text.len() < 50 {
        log::debug!("[OllamaProvider] 🔍 最終文本內容: '{}'", filtered_text);
    }
    
    filtered_text
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
        log::info!("[OllamaProvider] 原始請求內容長度: {} 字符", request.prompt.len());

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
            format!("{}

{}", system_prompt, request.prompt)
        } else {
            request.prompt.clone()
        };
        
        log::info!("[OllamaProvider] 最終提示詞長度: {} 字符", full_prompt.len());
        log::info!("[OllamaProvider] 最終提示詞內容（前200字符）: {}", 
                   full_prompt.chars().take(200).collect::<String>());

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
                    log::info!("[OllamaProvider] 🔍 原始回應: response.response = '{}'", response.response);
                    log::info!("[OllamaProvider] 🔍 回應長度: {} 字符", response.response.len());
                    log::info!("[OllamaProvider] 🔍 done: {}", response.done);
                    log::info!("[OllamaProvider] 🔍 prompt_eval_count: {:?}", response.prompt_eval_count);
                    log::info!("[OllamaProvider] 🔍 eval_count: {:?}", response.eval_count);
                    
                    let usage = AIUsageInfo {
                        prompt_tokens: response.prompt_eval_count.map(|v| v as i32),
                        completion_tokens: response.eval_count.map(|v| v as i32),
                        total_tokens: response.prompt_eval_count
                            .and_then(|p| response.eval_count.map(|c| (p + c) as i32)),
                    };

                    // 🔥 修復：記錄 thinking 字段但不使用它作為輸出
                    if let Some(thinking_text) = &response.thinking {
                        log::debug!("[OllamaProvider] 🧠 檢測到 thinking 字段，長度: {} 字符（僅用於調試）", thinking_text.len());
                        log::debug!("[OllamaProvider] 🧠 thinking 內容（前100字符）: {}", 
                                   thinking_text.chars().take(100).collect::<String>());
                    }

                    // 🔥 智能處理：優先使用 response 字段，如果為空則使用過濾後的 thinking 字段
                    let actual_text = if !response.response.trim().is_empty() {
                        log::info!("[OllamaProvider] ✅ 使用 response 字段作為最終輸出，長度: {} 字符", response.response.len());
                        response.response.clone()
                    } else if let Some(thinking_text) = &response.thinking {
                        if !thinking_text.trim().is_empty() {
                            log::info!("[OllamaProvider] 📝 response 字段為空，使用 thinking 字段並過濾思考標籤");
                            log::debug!("[OllamaProvider] 🔍 原始 thinking 內容（前200字符）: {}", 
                                       thinking_text.chars().take(200).collect::<String>());
                            let filtered_text = filter_thinking_tags(thinking_text);
                            log::info!("[OllamaProvider] 🎯 過濾後的文本長度: {} 字符", filtered_text.len());
                            if !filtered_text.trim().is_empty() {
                                filtered_text
                            } else {
                                log::warn!("[OllamaProvider] ⚠️ 過濾後的文本為空");
                                String::new()
                            }
                        } else {
                            log::warn!("[OllamaProvider] ⚠️ thinking 字段也為空");
                            String::new()
                        }
                    } else {
                        log::warn!("[OllamaProvider] ⚠️ response 和 thinking 字段都為空");
                        String::new()
                    };

                    log::info!("[OllamaProvider] 🎯 最終使用的文本長度: {} 字符", actual_text.len());

                    return Ok(AIGenerationResponse {
                        text: actual_text,
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