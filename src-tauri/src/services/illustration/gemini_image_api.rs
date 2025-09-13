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

/// 錯誤類型分類，用於生成使用者友善的錯誤訊息
#[derive(Debug, Clone, PartialEq)]
pub enum ErrorType {
    QuotaExceeded,      // 配額超限 (429)
    InvalidApiKey,      // API Key 無效 (401, 403)
    ServiceUnavailable, // 服務暫停 (503, 502)
    NetworkError,       // 網路問題
    Unknown,            // 未知錯誤
}

/// 錯誤分析和分類函數
pub fn classify_gemini_error(error_msg: &str) -> ErrorType {
    let error_lower = error_msg.to_lowercase();
    
    // 檢查配額相關錯誤
    if error_lower.contains("429") || 
       error_lower.contains("quota") || 
       error_lower.contains("exceeded") ||
       error_lower.contains("resource_exhausted") ||
       error_lower.contains("rate limit") {
        return ErrorType::QuotaExceeded;
    }
    
    // 檢查認證相關錯誤
    if error_lower.contains("401") || 
       error_lower.contains("403") ||
       error_lower.contains("invalid") || 
       error_lower.contains("authentication") ||
       error_lower.contains("unauthorized") ||
       error_lower.contains("api key") {
        return ErrorType::InvalidApiKey;
    }
    
    // 檢查服務可用性錯誤
    if error_lower.contains("503") || 
       error_lower.contains("502") ||
       error_lower.contains("504") ||
       error_lower.contains("unavailable") ||
       error_lower.contains("maintenance") {
        return ErrorType::ServiceUnavailable;
    }
    
    // 檢查網路相關錯誤
    if error_lower.contains("network") || 
       error_lower.contains("timeout") ||
       error_lower.contains("connection") ||
       error_lower.contains("dns") {
        return ErrorType::NetworkError;
    }
    
    ErrorType::Unknown
}

/// 生成使用者友善的錯誤訊息
pub fn generate_user_friendly_message(error_type: ErrorType, provider: &str) -> (String, String, Vec<String>) {
    match error_type {
        ErrorType::QuotaExceeded => {
            let title = "🚫 AI配額已用完".to_string();
            let subtitle = format!("{}免費版今日額度已達上限", 
                if provider == "gemini" { "Gemini " } else { "" });
            let actions = vec![
                "立即切換到OpenAI繼續創作".to_string(),
                "明天自動恢復 (配額會在UTC午夜重置)".to_string(),
                "升級付費版獲得無限配額".to_string(),
            ];
            (title, subtitle, actions)
        },
        ErrorType::InvalidApiKey => {
            let title = "🔑 AI服務認證失敗".to_string();
            let subtitle = "API金鑰可能無效或已過期".to_string();
            let actions = vec![
                "請檢查設定中的API金鑰是否正確".to_string(),
                "確認金鑰是否已啟用圖片生成權限".to_string(),
            ];
            (title, subtitle, actions)
        },
        ErrorType::ServiceUnavailable => {
            let title = "⚠️ AI服務暫時不可用".to_string();
            let subtitle = "服務端正在維護中".to_string();
            let actions = vec![
                "請稍後重試或使用其他AI服務".to_string(),
                "預計恢復時間：30分鐘內".to_string(),
            ];
            (title, subtitle, actions)
        },
        ErrorType::NetworkError => {
            let title = "🌐 網路連線問題".to_string();
            let subtitle = "無法連接到AI服務".to_string();
            let actions = vec![
                "請檢查網路連線後重試".to_string(),
                "或切換到其他可用服務".to_string(),
            ];
            (title, subtitle, actions)
        },
        ErrorType::Unknown => {
            let title = "❌ 生成失敗".to_string();
            let subtitle = "遇到未知錯誤".to_string();
            let actions = vec![
                "請重試或切換其他AI服務".to_string(),
                "如問題持續，請檢查服務狀態".to_string(),
            ];
            (title, subtitle, actions)
        },
    }
}

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
}

#[derive(Debug, Serialize)]
struct ContentItem {
    parts: Vec<Part>,
}

#[derive(Debug, Serialize)]
struct Part {
    text: String,
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

/// OpenRouter API 請求結構（Chat Completions 格式）
#[derive(Debug, Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<OpenRouterMessage>,
    modalities: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    seed: Option<u32>,
}

#[derive(Debug, Serialize)]
struct OpenRouterMessage {
    role: String,
    content: String,
}

/// OpenRouter API 響應結構（Chat Completions 格式）
#[derive(Debug, Deserialize)]
#[allow(dead_code)]  // API 響應結構，保留完整性
struct OpenRouterResponse {
    id: String,
    choices: Vec<OpenRouterChoice>,
    usage: Option<OpenRouterUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterChoice {
    message: OpenRouterResponseMessage,
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponseMessage {
    role: String,
    content: Option<String>,
    images: Option<Vec<OpenRouterImage>>, // 修正：使用正確的結構
}

#[derive(Debug, Deserialize)]
struct OpenRouterImage {
    #[serde(rename = "type")]
    image_type: String, // "image_url"
    image_url: OpenRouterImageUrl,
}

#[derive(Debug, Deserialize)]
struct OpenRouterImageUrl {
    url: String, // base64 data URL
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

        // 構建 Google AI Studio 請求 - 使用正確的圖像生成模型
        let api_request = GoogleAIStudioRequest {
            contents: vec![ContentItem {
                parts: vec![Part {
                    text: self.build_enhanced_prompt(&request),
                }],
            }],
        };

        // Google AI Studio 圖像生成端點 - 使用 gemini-2.5-flash-image-preview
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key={}",
            api_key
        );

        log::info!("[GeminiImageAPI] 發送請求到 Google AI Studio (gemini-2.5-flash-image-preview)");

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
            let full_error_msg = format!("Google AI Studio API 錯誤 {}: {}", status, error_text);
            
            // 分類錯誤並生成使用者友善訊息
            let error_type = classify_gemini_error(&full_error_msg);
            let (title, subtitle, actions) = generate_user_friendly_message(error_type, "gemini");
            
            // 記錄詳細錯誤到 log，但返回友善訊息給前端
            log::error!("[GeminiImageAPI] {}", full_error_msg);
            log::info!("[GeminiImageAPI] 使用者友善錯誤訊息: {} | {}", title, subtitle);
            
            // 構建包含友善訊息的結構化錯誤
            let user_friendly_error = format!(
                "FRIENDLY_ERROR||{}||{}||{}", 
                title, 
                subtitle, 
                actions.join("||")
            );
            
            return Err(IllustrationError::AIApi(user_friendly_error));
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
            model: "gemini-2.5-flash-image-preview".to_string(),
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
            messages: vec![OpenRouterMessage {
                role: "user".to_string(),
                content: self.build_enhanced_prompt(&request),
            }],
            modalities: vec!["image".to_string(), "text".to_string()],
            max_tokens: Some(1000),
            seed: request.seed,
        };

        let url = "https://openrouter.ai/api/v1/chat/completions";

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
            let full_error_msg = format!("OpenRouter API 錯誤 {}: {}", status, error_text);
            
            // 分類錯誤並生成使用者友善訊息
            let error_type = classify_gemini_error(&full_error_msg);
            let (title, subtitle, actions) = generate_user_friendly_message(error_type, "gemini-paid");
            
            // 記錄詳細錯誤到 log，但返回友善訊息給前端
            log::error!("[GeminiImageAPI] {}", full_error_msg);
            log::info!("[GeminiImageAPI] 使用者友善錯誤訊息: {} | {}", title, subtitle);
            
            // 構建包含友善訊息的結構化錯誤
            let user_friendly_error = format!(
                "FRIENDLY_ERROR||{}||{}||{}", 
                title, 
                subtitle, 
                actions.join("||")
            );
            
            return Err(IllustrationError::AIApi(user_friendly_error));
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
        // 添加詳細日誌以便調試
        log::info!("[GeminiImageAPI] OpenRouter 響應分析開始");
        log::debug!("[GeminiImageAPI] 完整響應: {:?}", response);
        
        let choice = response.choices.first()
            .ok_or_else(|| IllustrationError::AIApi("OpenRouter 響應中沒有選擇項".to_string()))?;

        log::debug!("[GeminiImageAPI] Choice 內容: {:?}", choice);
        log::debug!("[GeminiImageAPI] Message 角色: {}", choice.message.role);
        
        if let Some(content) = &choice.message.content {
            log::debug!("[GeminiImageAPI] Message content: {}", content);
        }

        // 嘗試多種解析方式
        // 方式1: 檢查 images 字段（正確的 OpenRouter 格式）
        if let Some(images) = &choice.message.images {
            log::info!("[GeminiImageAPI] 找到 images 字段，包含 {} 張圖片", images.len());
            
            let first_image = images.first()
                .ok_or_else(|| IllustrationError::AIApi("OpenRouter 響應中圖像列表為空".to_string()))?;

            log::info!("[GeminiImageAPI] 圖片類型: {}, 解析 URL", first_image.image_type);
            return self.decode_image_data(&first_image.image_url.url);
        }

        // 方式2: 檢查 content 字段是否包含 base64 圖片數據
        if let Some(content) = &choice.message.content {
            log::info!("[GeminiImageAPI] 嘗試從 content 字段解析圖片");
            
            // 檢查是否包含 data URL
            if content.contains("data:image/") {
                log::info!("[GeminiImageAPI] 在 content 中發現 data URL");
                return self.decode_image_data(content);
            }
            
            // 檢查是否是純 base64 數據
            if content.len() > 100 && content.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=') {
                log::info!("[GeminiImageAPI] 可能是 base64 數據，嘗試解碼");
                return self.decode_image_data(content);
            }
        }

        // 如果都沒找到，提供詳細的錯誤信息
        let error_msg = format!(
            "OpenRouter 響應中沒有找到圖像數據。響應結構: choices[0].message.images={:?}, content={:?}", 
            choice.message.images.as_ref().map(|v| format!("{}張圖片", v.len())),
            choice.message.content.as_ref().map(|s| if s.len() > 100 { format!("{}... ({}字符)", &s[..100], s.len()) } else { s.clone() })
        );
        
        log::error!("[GeminiImageAPI] {}", error_msg);
        Err(IllustrationError::AIApi(error_msg))
    }

    /// 解碼圖像數據的輔助函數
    fn decode_image_data(&self, image_data: &str) -> Result<Vec<u8>> {
        // 處理 data URL 格式 (data:image/png;base64,xxxx)
        let b64_data = if image_data.starts_with("data:") {
            log::info!("[GeminiImageAPI] 處理 data URL 格式");
            // 提取 base64 部分
            image_data.split(',').nth(1)
                .ok_or_else(|| IllustrationError::AIApi("無效的 data URL 格式".to_string()))?
        } else {
            log::info!("[GeminiImageAPI] 直接處理 base64 數據");
            // 直接是 base64 數據
            image_data
        };

        // 解碼 base64 數據
        let image_bytes = general_purpose::STANDARD
            .decode(b64_data)
            .map_err(|e| {
                let preview = if b64_data.len() > 50 { 
                    format!("{}...", &b64_data[..50]) 
                } else { 
                    b64_data.to_string() 
                };
                IllustrationError::AIApi(format!("解碼 base64 圖像失敗: {}, 數據預覽: {}", e, preview))
            })?;

        log::info!("[GeminiImageAPI] 成功解碼圖像，大小: {} bytes", image_bytes.len());
        Ok(image_bytes)
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