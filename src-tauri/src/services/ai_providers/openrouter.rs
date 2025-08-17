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

/// 檢測是否為 GPT-5 系列模型（需要特殊參數處理）
fn is_gpt5_model(model: &str) -> bool {
    let model_lower = model.to_lowercase();
    model_lower.contains("gpt-5") || 
    model_lower.starts_with("openai/gpt-5") ||
    model_lower.contains("gpt5")
}

/// 檢測是否需要使用 max_completion_tokens 而不是 max_tokens
fn uses_completion_tokens_api(model: &str) -> bool {
    is_gpt5_model(model)
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<OpenRouterMessage>,
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
#[allow(dead_code)]
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
        log::debug!("[OpenRouterProvider] 發送GET請求到: {}, API金鑰: {}", url, SecurityUtils::mask_api_key(&self.api_key));
        
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
        log::debug!("[OpenRouterProvider] 發送POST請求到: {}, API金鑰: {}", url, SecurityUtils::mask_api_key(&self.api_key));
        
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

    /// 🔥 關鍵修復：格式化模型ID為OpenRouter兼容格式
    fn format_model_id(model_id: &str) -> String {
        // 如果已經是正確格式（包含斜杠），直接返回
        if model_id.contains('/') {
            return model_id.to_string();
        }
        
        // 根據模型名稱推斷提供商前綴
        if model_id.starts_with("gpt-") || model_id.starts_with("o1-") {
            format!("openai/{}", model_id)
        } else if model_id.starts_with("claude-") {
            format!("anthropic/{}", model_id)
        } else if model_id.starts_with("gemini-") {
            format!("google/{}", model_id)
        } else if model_id.starts_with("llama") {
            format!("meta-llama/{}", model_id)
        } else if model_id.starts_with("mixtral") {
            format!("mistralai/{}", model_id)
        } else {
            // 未知模型，嘗試推斷或保持原樣
            log::warn!("[OpenRouterProvider] ⚠️ 未知模型格式，保持原樣: {}", model_id);
            model_id.to_string()
        }
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
        // 🔒 安全驗證：檢查輸入參數
        SecurityUtils::validate_generation_params(&request.params)?;
        SecurityUtils::validate_prompt_content(&request.prompt, request.system_prompt.as_deref())?;
        
        log::info!("[OpenRouterProvider] 🚀 開始生成文本，模型: {}, API金鑰: {}", request.model, SecurityUtils::mask_api_key(&self.api_key));
        log::info!("[OpenRouterProvider] 🔍 請求參數: temperature={}, max_tokens={}, prompt長度={}", 
            request.params.temperature, request.params.max_tokens, request.prompt.len());
        
        // 🔥 關鍵修復：智能調整max_tokens防止空回應
        // 更精確的token估算：中文字符約2個字符=1token，英文約4個字符=1token
        let char_count = request.prompt.chars().count();
        let estimated_prompt_tokens = if char_count > 0 {
            // 混合估算：假設50%中文50%英文
            (char_count as f64 * 0.75) as usize  // 保守估算
        } else {
            0
        };
        
        // 🎯 基於模型特性的智能調整策略
        let mut adjusted_max_tokens = request.params.max_tokens;
        let model_lower = request.model.to_lowercase();
        
        // 🔥 新增：確保 max_tokens 至少為 200，避免過低導致空回應
        if adjusted_max_tokens < 200 {
            adjusted_max_tokens = 200;
            log::warn!("[OpenRouterProvider] ⚠️ max_tokens 過低 ({}), 提升至 200 避免空回應", request.params.max_tokens);
        }
        
        // 🔥 修復：重新分類模型類型，特別處理 GPT-5 nano
        let is_gpt5_nano = model_lower.contains("gpt-5") && model_lower.contains("nano");
        let is_traditional_nano = (model_lower.contains("nano") || model_lower.contains("mini")) && !is_gpt5_nano;
        let is_large_model = model_lower.contains("4o") || model_lower.contains("claude") || model_lower.contains("gemini");
        
        // 根據模型類型和輸入長度調整策略
        if estimated_prompt_tokens > 300 {  // 降低觸發閾值
            let (multiplier, max_limit) = if is_gpt5_nano {
                // 🔥 GPT-5 nano：特殊策略，比傳統 nano 模型更強大
                let mult = if estimated_prompt_tokens > 2000 { 3.5 }
                          else if estimated_prompt_tokens > 1000 { 2.5 }
                          else { 2.0 };
                (mult, 3000.0)  // 📈 提高上限到 3000
            } else if is_traditional_nano {
                // 傳統 Nano 模型：更保守的策略
                let mult = if estimated_prompt_tokens > 1500 { 2.5 }
                          else if estimated_prompt_tokens > 800 { 2.0 }
                          else { 1.5 };
                (mult, 1500.0)  // 更低的上限
            } else if is_large_model {
                // 大型模型：更激進的策略
                let mult = if estimated_prompt_tokens > 2000 { 4.0 }
                          else if estimated_prompt_tokens > 1000 { 3.0 }
                          else { 2.0 };
                (mult, 4000.0)
            } else {
                // 標準模型：平衡策略
                let mult = if estimated_prompt_tokens > 1500 { 3.0 }
                          else if estimated_prompt_tokens > 800 { 2.0 }
                          else { 1.5 };
                (mult, 2500.0)
            };
            
            adjusted_max_tokens = (request.params.max_tokens as f64 * multiplier).min(max_limit) as i32;
            log::warn!("[OpenRouterProvider] ⚠️ 模型: {}, 提示詞較長 (~{} tokens)，調整max_tokens: {} -> {} (策略: {})", 
                request.model, estimated_prompt_tokens, request.params.max_tokens, adjusted_max_tokens,
                if is_gpt5_nano { "GPT-5 nano增強" } 
                else if is_traditional_nano { "傳統nano保守" } 
                else if is_large_model { "大型激進" } 
                else { "標準平衡" });
        }
        
        log::info!("[OpenRouterProvider] 📊 Token分配: 字符數={}, 預估輸入~{} tokens, 調整後輸出限制={} tokens", 
            char_count, estimated_prompt_tokens, adjusted_max_tokens);

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

        // 🔥 關鍵修復：確保模型ID格式正確
        let formatted_model = Self::format_model_id(&request.model);
        log::info!("[OpenRouterProvider] 🔧 模型ID轉換: {} -> {}", request.model, formatted_model);
        
        // 🔥 新增：GPT-5 模型特殊參數處理
        let is_gpt5 = is_gpt5_model(&formatted_model);
        let uses_completion_api = uses_completion_tokens_api(&formatted_model);
        
        let (final_temperature, final_top_p, final_presence_penalty, final_frequency_penalty, final_stop) = if is_gpt5 {
            log::info!("[OpenRouterProvider] 🎯 GPT-5 模型：使用固定參數 (temperature=1.0)");
            (1.0, None, None, None, None) // GPT-5 系列只接受預設值
        } else {
            (request.params.temperature, request.params.top_p, request.params.presence_penalty, request.params.frequency_penalty, request.params.stop)
        };

        let (max_tokens, max_completion_tokens) = if uses_completion_api {
            log::info!("[OpenRouterProvider] 🆕 使用新API格式 (max_completion_tokens) 對模型: {}", formatted_model);
            (None, Some(adjusted_max_tokens))
        } else {
            log::info!("[OpenRouterProvider] 📝 使用舊API格式 (max_tokens) 對模型: {}", formatted_model);
            (Some(adjusted_max_tokens), None)
        };
        
        let openrouter_request = OpenRouterRequest {
            model: formatted_model.clone(),
            messages,
            temperature: final_temperature,
            max_tokens,
            max_completion_tokens,
            top_p: final_top_p,
            presence_penalty: final_presence_penalty,
            frequency_penalty: final_frequency_penalty,
            stop: final_stop,
        };

        // 🔥 新增：記錄完整請求以便調試
        log::debug!("[OpenRouterProvider] 📤 發送請求: {}", serde_json::to_string(&openrouter_request).unwrap_or_default());

        let response = self.make_post_request::<OpenRouterResponse>("/chat/completions", &openrouter_request).await?;
        
        // 🔍 調試：記錄完整響應
        log::info!("[OpenRouterProvider] 🔍 API 響應: 模型={}, choices數量={}", 
            response.model, response.choices.len());
        if let Some(choice) = response.choices.first() {
            log::info!("[OpenRouterProvider] 🔍 第一個choice: content長度={}, finish_reason={:?}", 
                choice.message.content.len(), choice.finish_reason);
            // 🔥 新增：如果內容為空，記錄詳細信息
            if choice.message.content.trim().is_empty() {
                log::error!("[OpenRouterProvider] ❌ 模型 {} 返回空內容！choice 詳情: {:?}", formatted_model, choice);
            }
        }
        
        // 🔥 使用階段一檢測邏輯處理響應格式差異
        let model_chars = detect_model_characteristics(&request.model);
        let actual_text = match model_chars.response_format {
            ResponseFormat::Standard => {
                // OpenRouter 標準格式（類似 OpenAI）：choices[0].message.content
                if let Some(choice) = response.choices.first() {
                    if !choice.message.content.trim().is_empty() {
                        log::info!("[OpenRouterProvider] ✅ 使用標準 choices 格式，生成 {} 字符", choice.message.content.len());
                        choice.message.content.clone()
                    } else {
                        log::warn!("[OpenRouterProvider] ⚠️ choices 中文本為空");
                        String::new()
                    }
                } else {
                    log::warn!("[OpenRouterProvider] ⚠️ choices 陣列為空");
                    String::new()
                }
            },
            ResponseFormat::ThinkingField => {
                // 特殊處理：OpenRouter 上的思維模型可能有不同響應格式
                log::info!("[OpenRouterProvider] 📝 檢測到思維模型，使用標準降級處理");
                if let Some(choice) = response.choices.first() {
                    choice.message.content.clone()
                } else {
                    log::warn!("[OpenRouterProvider] ⚠️ 思維模型響應為空");
                    String::new()
                }
            },
            _ => {
                // 降級處理：嘗試從 choices 獲取
                if let Some(choice) = response.choices.first() {
                    log::info!("[OpenRouterProvider] 📝 降級使用 choices 格式");
                    choice.message.content.clone()
                } else {
                    log::warn!("[OpenRouterProvider] ⚠️ 無法獲取任何響應內容");
                    String::new()
                }
            }
        };
        
        if !actual_text.trim().is_empty() {
            log::info!("[OpenRouterProvider] ✅ 文本生成成功，長度: {} 字符", actual_text.len());
            
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
            // 🔥 新增：更詳細的錯誤信息，包含可能的解決方案
            let error_details = if let Some(choice) = response.choices.first() {
                format!("模型 {} 回應為空。finish_reason: {:?}, max_tokens: {}, 模型可能需要更多 tokens 或不同的提示格式。建議嘗試增加 max_tokens 或檢查模型是否支持此類型的請求。", 
                    Self::format_model_id(&request.model), choice.finish_reason, adjusted_max_tokens)
            } else {
                format!("模型 {} 未返回任何 choices。請檢查模型 ID 是否正確或該模型是否可用。", Self::format_model_id(&request.model))
            };
            
            log::error!("[OpenRouterProvider] ❌ {}", error_details);
            Err(anyhow!("OpenRouter API 回應中沒有有效內容: {}", error_details))
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