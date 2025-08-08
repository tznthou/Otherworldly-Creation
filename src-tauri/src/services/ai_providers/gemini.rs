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
            log::info!("[GeminiProvider] API 回應: {}", response_text);
            
            let data: T = serde_json::from_str(&response_text)
                .map_err(|e| anyhow!("JSON 解析錯誤: {}, 回應內容: {}", e, response_text))?;
            Ok(data)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow!("Gemini API 錯誤 {}: {}", status, error_text))
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
                Err(e)
            }
        }
    }

    async fn get_models(&self) -> Result<Vec<ModelInfo>> {
        log::info!("[GeminiProvider] 獲取 Gemini 模型列表...");
        
        // Gemini API 沒有公開的模型列表端點，返回預定義列表
        Ok(Self::get_available_models())
    }

    async fn generate_text(&self, request: AIGenerationRequest) -> Result<AIGenerationResponse> {
        log::info!("[GeminiProvider] 開始生成文本，模型: {}", request.model);

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
        
        if let Some(candidate) = response.candidates.first() {
            if let Some(parts) = &candidate.content.parts {
                if let Some(part) = parts.first() {
                    log::info!("[GeminiProvider] 文本生成成功");
                    
                    let usage = response.usage_metadata.map(|usage| {
                        AIUsageInfo {
                            prompt_tokens: usage.prompt_token_count,
                            completion_tokens: usage.candidates_token_count,
                            total_tokens: usage.total_token_count,
                        }
                    });

                    return Ok(AIGenerationResponse {
                        text: part.text.clone(),
                        model: request.model,
                        usage,
                        finish_reason: candidate.finish_reason.clone(),
                    });
                }
            }
        }
        
        Err(anyhow!("Gemini API 回應中沒有有效內容"))
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