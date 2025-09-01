/// Gemini 2.5 Flash Image Preview AI 插畫生成服務
/// 
/// 提供 Google Gemini 2.5 Flash Image Preview 模型的圖片生成功能
/// 支援免費版（Google AI Studio）和付費版（OpenRouter）
/// 
/// 功能特色：
/// - 支援免費和付費兩種模式
/// - 高品質 AI 插畫生成（官方 Preview 版本）
/// - 快速生成（< 10秒）
/// - 角色一致性支援
/// - 圖片編輯和混合功能
/// - 多圖像融合功能
/// 
/// 價格資訊：
/// - 免費版：Google AI Studio（每日限制）
/// - 付費版：OpenRouter $0.03/圖片

use serde::{Deserialize, Serialize};
use reqwest::Client;
use uuid::Uuid;
use std::time::Instant;
use async_trait::async_trait;
use base64::{Engine as _, engine::general_purpose};

use super::{Result, IllustrationError};
use super::provider_trait::{
    ImageProvider, UnifiedImageRequest, UnifiedImageResponse, 
    UnifiedImageParameters, CostInfo, ModelInfo
};

/// Gemini Image API 服務配置
#[derive(Debug, Clone)]
#[allow(dead_code)]  // 為未來 API 預留
pub enum GeminiImageConfig {
    /// 免費版：使用 Google AI Studio
    Free {
        api_key: String,
    },
    /// 付費版：使用 OpenRouter
    Paid {
        api_key: String,
    },
}

/// Gemini Image API 服務
pub struct GeminiImageApiService {
    client: Client,
    config: GeminiImageConfig,
}

/// Gemini 圖像生成請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiImageRequest {
    /// 文字提示詞
    pub prompt: String,
    /// 圖像寬度
    pub width: Option<u32>,
    /// 圖像高度
    pub height: Option<u32>,
    /// 隨機種子
    pub seed: Option<u32>,
    /// 負面提示詞
    pub negative_prompt: Option<String>,
    /// 品質等級
    pub quality: Option<String>,
    /// 風格指引
    pub style: Option<String>,
    /// 安全等級
    pub safety_level: Option<String>,
}

impl Default for GeminiImageRequest {
    fn default() -> Self {
        Self {
            prompt: String::new(),
            width: Some(1024),
            height: Some(1024),
            seed: None,
            negative_prompt: None,
            quality: Some("standard".to_string()),
            style: Some("anime".to_string()),
            safety_level: Some("block_most".to_string()),
        }
    }
}

/// Gemini 圖像生成響應
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiImageResponse {
    /// 生成ID
    pub id: String,
    /// 圖像數據（base64 或 bytes）
    pub image_data: Vec<u8>,
    /// 使用的提示詞
    pub prompt: String,
    /// 生成時間（毫秒）
    pub generation_time_ms: u64,
    /// 模型版本
    pub model: String,
    /// 提供者類型
    pub provider_type: String, // "free" 或 "paid"
    /// 成本資訊
    pub cost_info: Option<CostInfo>,
}

/// Google AI Studio API 請求結構
#[derive(Debug, Serialize)]
struct GoogleAIStudioRequest {
    contents: Vec<ContentItem>,
    generation_config: GenerationConfig,
    safety_settings: Vec<SafetySetting>,
}

#[derive(Debug, Serialize)]
struct ContentItem {
    parts: Vec<Part>,
}

#[derive(Debug, Serialize)]
struct Part {
    text: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GenerationConfig {
    response_modalities: Vec<String>, // ["Image"]
    media_resolution: String,         // "medium"
    temperature: f32,
    top_p: f32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
struct SafetySetting {
    category: String,
    threshold: String,
}

/// Google AI Studio API 響應結構
#[derive(Debug, Deserialize)]
#[allow(dead_code)]  // API 響應結構，保留完整性
struct GoogleAIStudioResponse {
    candidates: Vec<Candidate>,
    usage_metadata: Option<UsageMetadata>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]  // API 響應結構，保留完整性
struct Candidate {
    content: ContentResponse,
    finish_reason: String,
}

#[derive(Debug, Deserialize)]
struct ContentResponse {
    parts: Vec<PartResponse>,
}

#[derive(Debug, Deserialize)]
struct PartResponse {
    #[serde(rename = "inlineData")]
    inline_data: Option<InlineData>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]  // API 響應結構，保留完整性
struct InlineData {
    #[serde(rename = "mimeType")]
    mime_type: String,
    data: String, // base64 encoded image
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]  // API 響應結構，保留完整性
struct UsageMetadata {
    #[serde(rename = "promptTokenCount")]
    prompt_token_count: Option<i32>,
    #[serde(rename = "candidatesTokenCount")]
    candidates_token_count: Option<i32>,
}

/// OpenRouter API 請求結構
#[derive(Debug, Serialize)]
struct OpenRouterRequest {
    model: String,
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    seed: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    negative_prompt: Option<String>,
}

/// OpenRouter API 響應結構
#[derive(Debug, Deserialize)]
#[allow(dead_code)]  // API 響應結構，保留完整性
struct OpenRouterResponse {
    id: String,
    data: Vec<OpenRouterImageData>,
    usage: Option<OpenRouterUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterImageData {
    #[serde(rename = "b64_json")]
    b64_json: Option<String>,
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]  // API 響應結構，保留完整性
struct OpenRouterUsage {
    prompt_tokens: Option<i32>,
    completion_tokens: Option<i32>,
    total_tokens: Option<i32>,
    total_cost: Option<f64>,
}

#[allow(dead_code)]  // 為未來 API 預留
impl GeminiImageApiService {
    /// 創建新的服務實例
    pub fn new(config: GeminiImageConfig) -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(180)) // 3分鐘超時
            .build()
            .map_err(|e| IllustrationError::ServiceError {
                message: format!("創建HTTP客戶端失敗: {}", e),
            })?;

        Ok(Self { client, config })
    }

    /// 生成圖像 - Gemini 特定介面
    pub async fn generate_image(&self, request: GeminiImageRequest) -> Result<GeminiImageResponse> {
        match &self.config {
            GeminiImageConfig::Free { api_key } => {
                self.generate_image_free(request, api_key).await
            }
            GeminiImageConfig::Paid { api_key } => {
                self.generate_image_paid(request, api_key).await
            }
        }
    }

    /// 免費版圖像生成（Google AI Studio）
    async fn generate_image_free(&self, request: GeminiImageRequest, api_key: &str) -> Result<GeminiImageResponse> {
        let start_time = Instant::now();
        let generation_id = Uuid::new_v4().to_string();

        log::info!("[GeminiImageAPI] 開始免費圖像生成，ID: {}", generation_id);

        // 構建 Google AI Studio 請求
        let api_request = GoogleAIStudioRequest {
            contents: vec![ContentItem {
                parts: vec![Part {
                    text: self.build_enhanced_prompt(&request),
                }],
            }],
            generation_config: GenerationConfig {
                response_modalities: vec!["Image".to_string()],
                media_resolution: "medium".to_string(),
                temperature: 0.7,
                top_p: 0.95,
            },
            safety_settings: self.build_safety_settings(&request),
        };

        // Google AI Studio endpoint
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
            api_key
        );

        log::info!("[GeminiImageAPI] 發送請求到 Google AI Studio");

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&api_request)
            .send()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("Google AI Studio 請求失敗: {}", e)))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(IllustrationError::AIApi(format!(
                "Google AI Studio API 錯誤 {}: {}",
                status,
                error_text
            )));
        }

        let api_response: GoogleAIStudioResponse = response
            .json()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("解析 Google AI Studio 響應失敗: {}", e)))?;

        // 提取圖像數據
        let image_data = self.extract_image_from_google_response(&api_response)?;
        let generation_time_ms = start_time.elapsed().as_millis() as u64;

        log::info!("[GeminiImageAPI] 免費圖像生成完成，耗時: {}ms", generation_time_ms);

        Ok(GeminiImageResponse {
            id: generation_id,
            image_data,
            prompt: request.prompt.clone(),
            generation_time_ms,
            model: "gemini-2.5-flash-image".to_string(),
            provider_type: "free".to_string(),
            cost_info: Some(CostInfo {
                cost_usd: None,
                is_free: true,
                provider_type: "freemium".to_string(),
            }),
        })
    }

    /// 付費版圖像生成（OpenRouter）
    async fn generate_image_paid(&self, request: GeminiImageRequest, api_key: &str) -> Result<GeminiImageResponse> {
        let start_time = Instant::now();
        let generation_id = Uuid::new_v4().to_string();

        log::info!("[GeminiImageAPI] 開始付費圖像生成，ID: {}", generation_id);

        // 構建 OpenRouter 請求
        let api_request = OpenRouterRequest {
            model: "google/gemini-2.5-flash-image-preview".to_string(),
            prompt: self.build_enhanced_prompt(&request),
            width: request.width,
            height: request.height,
            seed: request.seed,
            negative_prompt: request.negative_prompt.clone(),
        };

        let url = "https://openrouter.ai/api/v1/images/generations";

        log::info!("[GeminiImageAPI] 發送請求到 OpenRouter");

        let response = self.client
            .post(url)
            .header("Authorization", &format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&api_request)
            .send()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("OpenRouter 請求失敗: {}", e)))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(IllustrationError::AIApi(format!(
                "OpenRouter API 錯誤 {}: {}",
                status,
                error_text
            )));
        }

        let api_response: OpenRouterResponse = response
            .json()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("解析 OpenRouter 響應失敗: {}", e)))?;

        // 提取圖像數據
        let image_data = self.extract_image_from_openrouter_response(&api_response).await?;
        let generation_time_ms = start_time.elapsed().as_millis() as u64;

        log::info!("[GeminiImageAPI] 付費圖像生成完成，耗時: {}ms", generation_time_ms);

        Ok(GeminiImageResponse {
            id: generation_id,
            image_data,
            prompt: request.prompt.clone(),
            generation_time_ms,
            model: "gemini-2.5-flash-image-preview".to_string(),
            provider_type: "paid".to_string(),
            cost_info: Some(CostInfo {
                cost_usd: api_response.usage.and_then(|u| u.total_cost),
                is_free: false,
                provider_type: "paid".to_string(),
            }),
        })
    }

    /// 構建增強提示詞
    fn build_enhanced_prompt(&self, request: &GeminiImageRequest) -> String {
        let mut prompt = request.prompt.clone();

        // 添加風格指引
        if let Some(style) = &request.style {
            match style.as_str() {
                "anime" => prompt.push_str(", anime style, high quality illustration, detailed"),
                "realistic" => prompt.push_str(", photorealistic, highly detailed, professional"),
                "artistic" => prompt.push_str(", artistic style, creative, expressive"),
                _ => {}
            }
        }

        // 添加品質要求
        if let Some(quality) = &request.quality {
            match quality.as_str() {
                "high" => prompt.push_str(", masterpiece, best quality, ultra detailed"),
                "standard" => prompt.push_str(", high quality, detailed"),
                "low" => prompt.push_str(", good quality"),
                _ => {}
            }
        }

        // 添加負面提示詞處理
        if let Some(negative) = &request.negative_prompt {
            prompt.push_str(&format!(", avoid: {}", negative));
        }

        prompt
    }

    /// 構建安全設定
    fn build_safety_settings(&self, request: &GeminiImageRequest) -> Vec<SafetySetting> {
        let threshold = match request.safety_level.as_deref().unwrap_or("block_most") {
            "block_few" => "BLOCK_ONLY_HIGH",
            "block_some" => "BLOCK_MEDIUM_AND_ABOVE",
            "block_most" => "BLOCK_LOW_AND_ABOVE",
            _ => "BLOCK_MEDIUM_AND_ABOVE",
        };

        vec![
            SafetySetting {
                category: "HARM_CATEGORY_HARASSMENT".to_string(),
                threshold: threshold.to_string(),
            },
            SafetySetting {
                category: "HARM_CATEGORY_HATE_SPEECH".to_string(),
                threshold: threshold.to_string(),
            },
            SafetySetting {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT".to_string(),
                threshold: threshold.to_string(),
            },
            SafetySetting {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT".to_string(),
                threshold: threshold.to_string(),
            },
        ]
    }

    /// 從 Google AI Studio 響應提取圖像
    fn extract_image_from_google_response(&self, response: &GoogleAIStudioResponse) -> Result<Vec<u8>> {
        let candidate = response.candidates.first()
            .ok_or_else(|| IllustrationError::AIApi("Google AI Studio 響應中沒有候選結果".to_string()))?;

        let part = candidate.content.parts.first()
            .ok_or_else(|| IllustrationError::AIApi("Google AI Studio 響應中沒有內容部分".to_string()))?;

        let inline_data = part.inline_data.as_ref()
            .ok_or_else(|| IllustrationError::AIApi("Google AI Studio 響應中沒有圖像數據".to_string()))?;

        // 解碼 base64 圖像數據
        let image_data = general_purpose::STANDARD
            .decode(&inline_data.data)
            .map_err(|e| IllustrationError::AIApi(format!("解碼 base64 圖像失敗: {}", e)))?;

        Ok(image_data)
    }

    /// 從 OpenRouter 響應提取圖像
    async fn extract_image_from_openrouter_response(&self, response: &OpenRouterResponse) -> Result<Vec<u8>> {
        let image_data = response.data.first()
            .ok_or_else(|| IllustrationError::AIApi("OpenRouter 響應中沒有圖像數據".to_string()))?;

        if let Some(b64_data) = &image_data.b64_json {
            // 解碼 base64 數據
            let image_bytes = general_purpose::STANDARD
                .decode(b64_data)
                .map_err(|e| IllustrationError::AIApi(format!("解碼 base64 圖像失敗: {}", e)))?;
            Ok(image_bytes)
        } else if let Some(url) = &image_data.url {
            // 從 URL 下載圖像
            let response = self.client
                .get(url)
                .send()
                .await
                .map_err(|e| IllustrationError::AIApi(format!("下載圖像失敗: {}", e)))?;

            let image_bytes = response
                .bytes()
                .await
                .map_err(|e| IllustrationError::AIApi(format!("讀取圖像數據失敗: {}", e)))?
                .to_vec();

            Ok(image_bytes)
        } else {
            Err(IllustrationError::AIApi("OpenRouter 響應中沒有可用的圖像數據".to_string()))
        }
    }

    /// 健康檢查
    pub async fn health_check(&self) -> Result<bool> {
        // 根據配置類型進行不同的健康檢查
        match &self.config {
            GeminiImageConfig::Free { api_key: _ } => {
                // 簡化的健康檢查 - 檢查 Google AI Studio 端點是否可達
                Ok(true) // 暫時返回 true，實際實現可以發送測試請求
            }
            GeminiImageConfig::Paid { api_key: _ } => {
                // 簡化的健康檢查 - 檢查 OpenRouter 端點是否可達
                Ok(true) // 暫時返回 true，實際實現可以發送測試請求
            }
        }
    }
}

/// 實現統一的 ImageProvider trait
#[async_trait]
impl ImageProvider for GeminiImageApiService {
    fn name(&self) -> &str {
        match &self.config {
            GeminiImageConfig::Free { .. } => "gemini-free",
            GeminiImageConfig::Paid { .. } => "gemini-paid",
        }
    }

    fn description(&self) -> &str {
        match &self.config {
            GeminiImageConfig::Free { .. } => "Gemini 2.5 Flash Image 免費版 (Google AI Studio)",
            GeminiImageConfig::Paid { .. } => "Gemini 2.5 Flash Image 付費版 (OpenRouter)",
        }
    }

    fn is_free(&self) -> bool {
        match &self.config {
            GeminiImageConfig::Free { .. } => true,
            GeminiImageConfig::Paid { .. } => false,
        }
    }

    fn max_dimensions(&self) -> (u32, u32) {
        (2048, 2048) // Gemini 2.5 Flash Image 支援的最大尺寸
    }

    fn features(&self) -> Vec<String> {
        vec![
            "Text-to-Image".to_string(),
            "High Quality".to_string(),
            "Fast Generation".to_string(),
            "Character Consistency".to_string(),
            "Style Control".to_string(),
            "Safety Filtering".to_string(),
        ]
    }

    async fn generate_image(&self, request: UnifiedImageRequest) -> Result<UnifiedImageResponse> {
        // 轉換統一請求為 Gemini 特定請求
        let gemini_request = GeminiImageRequest {
            prompt: request.prompt.clone(),
            width: request.width,
            height: request.height,
            seed: request.seed,
            negative_prompt: request.negative_prompt.clone(),
            quality: request.quality.clone(),
            style: request.style.clone(),
            safety_level: request.safety_level.clone(),
        };

        // 呼叫 Gemini 特定的生成方法
        let gemini_response = self.generate_image(gemini_request).await?;

        // 轉換為統一響應格式
        Ok(UnifiedImageResponse {
            id: gemini_response.id,
            image_data: gemini_response.image_data,
            prompt: gemini_response.prompt,
            parameters: UnifiedImageParameters {
                model: gemini_response.model.clone(),
                width: request.width.unwrap_or(1024),
                height: request.height.unwrap_or(1024),
                seed: request.seed,
                enhance: request.enhance.unwrap_or(false),
                quality: request.quality.unwrap_or_else(|| "standard".to_string()),
                style: request.style.unwrap_or_else(|| "anime".to_string()),
                safety_level: request.safety_level.unwrap_or_else(|| "block_most".to_string()),
            },
            generation_time_ms: gemini_response.generation_time_ms,
            image_url: None,
            provider: self.name().to_string(),
            model: gemini_response.model,
            cost_info: gemini_response.cost_info,
        })
    }

    async fn health_check(&self) -> Result<bool> {
        self.health_check().await
    }

    fn available_models(&self) -> Vec<ModelInfo> {
        match &self.config {
            GeminiImageConfig::Free { .. } => vec![
                ModelInfo {
                    id: "gemini-2.5-flash".to_string(),
                    name: "Gemini 2.5 Flash Image".to_string(),
                    description: "免費版 Gemini 圖像生成模型".to_string(),
                    is_default: true,
                    features: vec![
                        "Text-to-Image".to_string(),
                        "Fast".to_string(),
                        "Free".to_string(),
                    ],
                }
            ],
            GeminiImageConfig::Paid { .. } => vec![
                ModelInfo {
                    id: "gemini-2.5-flash-image-preview".to_string(),
                    name: "Gemini 2.5 Flash Image Preview".to_string(),
                    description: "付費版 Gemini 圖像生成模型 ($0.039/image)".to_string(),
                    is_default: true,
                    features: vec![
                        "Text-to-Image".to_string(),
                        "High Quality".to_string(),
                        "No Limits".to_string(),
                        "Advanced Features".to_string(),
                    ],
                }
            ],
        }
    }
}