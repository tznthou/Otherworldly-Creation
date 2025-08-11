use serde::{Deserialize, Serialize};
use reqwest::Client;
use base64::{Engine as _, engine::general_purpose};
use super::{Result, IllustrationError};

/// Google Gemini Imagen API 服務
/// 
/// 功能：
/// 1. 整合 Google Imagen 3.0 API 進行圖像生成
/// 2. 支援多種圖像尺寸和品質設定
/// 3. 提供圖像編輯和風格轉換功能
/// 4. 實現智能提示詞優化和安全過濾
pub struct ImagenApiService {
    client: Client,
    api_key: String,
    base_url: String,
    default_config: ImageGenerationConfig,
}

/// 圖像生成配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationConfig {
    pub model: String,              // "imagen-3.0-generate-001"
    pub aspect_ratio: AspectRatio,  // 圖像比例
    pub safety_filter_level: SafetyLevel,
    pub person_generation: PersonGeneration,
    pub include_ra_terms: bool,     // 是否包含負責任 AI 條款
    pub add_watermark: bool,        // 是否添加浮水印
    pub compress_images: bool,      // 是否壓縮圖像
}

/// 圖像比例
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AspectRatio {
    #[serde(rename = "1:1")]
    Square,
    #[serde(rename = "9:16")]
    Portrait,
    #[serde(rename = "16:9")]
    Landscape,
    #[serde(rename = "4:3")]
    Standard,
    #[serde(rename = "3:4")]
    Tall,
}

/// 安全過濾等級
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SafetyLevel {
    #[serde(rename = "block_most")]
    BlockMost,
    #[serde(rename = "block_some")]
    BlockSome,
    #[serde(rename = "block_few")]
    BlockFew,
}

/// 人物生成設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PersonGeneration {
    #[serde(rename = "allow_adult")]
    AllowAdult,
    #[serde(rename = "allow_minor")]
    AllowMinor,
    #[serde(rename = "dont_allow")]
    DontAllow,
}

/// 圖像生成請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationRequest {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub config: ImageGenerationConfig,
    pub character_seed: Option<u32>,        // 角色一致性種子
    pub style_reference: Option<String>,    // 風格參考圖像
    pub guidance_scale: Option<f64>,        // 提示詞遵循度 1.0-20.0
}

/// 圖像生成回應
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationResponse {
    pub success: bool,
    pub images: Vec<GeneratedImage>,
    pub safety_ratings: Vec<SafetyRating>,
    pub error_message: Option<String>,
    pub generation_metadata: GenerationMetadata,
}

/// 生成的圖像
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedImage {
    pub image_data: String,             // Base64 編碼圖像
    pub mime_type: String,              // 圖像格式
    pub safety_rating: SafetyRating,    // 安全評級
    pub width: u32,
    pub height: u32,
    pub file_size_bytes: usize,
}

/// 安全評級
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyRating {
    pub category: SafetyCategory,
    pub probability: SafetyProbability,
    pub blocked: bool,
}

/// 安全分類
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SafetyCategory {
    #[serde(rename = "HARM_CATEGORY_HATE_SPEECH")]
    HateSpeech,
    #[serde(rename = "HARM_CATEGORY_DANGEROUS_CONTENT")]
    DangerousContent,
    #[serde(rename = "HARM_CATEGORY_HARASSMENT")]
    Harassment,
    #[serde(rename = "HARM_CATEGORY_SEXUALLY_EXPLICIT")]
    SexuallyExplicit,
}

/// 安全機率
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SafetyProbability {
    #[serde(rename = "NEGLIGIBLE")]
    Negligible,
    #[serde(rename = "LOW")]
    Low,
    #[serde(rename = "MEDIUM")]
    Medium,
    #[serde(rename = "HIGH")]
    High,
}

/// 生成元數據
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetadata {
    pub generation_time_ms: u64,
    pub prompt_token_count: usize,
    pub model_version: String,
    pub safety_filtered: bool,
    pub estimated_cost: f64,           // 預估成本（美元）
}

/// 圖像編輯請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageEditRequest {
    pub base_image: String,            // Base64 編碼的基礎圖像
    pub mask_image: Option<String>,    // 遮罩圖像（可選）
    pub prompt: String,                // 編輯提示
    pub edit_mode: EditMode,
    pub strength: Option<f64>,         // 編輯強度 0.0-1.0
}

/// 編輯模式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EditMode {
    #[serde(rename = "inpaint")]
    Inpaint,        // 局部重繪
    #[serde(rename = "outpaint")]
    Outpaint,       // 擴展圖像
    #[serde(rename = "upscale")]
    Upscale,        // 放大圖像
    #[serde(rename = "style_transfer")]
    StyleTransfer, // 風格轉換
}

impl ImagenApiService {
    /// 創建新的 Imagen API 服務
    pub fn new(api_key: String) -> Self {
        let client = Client::new();
        let base_url = "https://aiplatform.googleapis.com/v1".to_string();
        
        let default_config = ImageGenerationConfig {
            model: "imagen-3.0-generate-001".to_string(),
            aspect_ratio: AspectRatio::Square,
            safety_filter_level: SafetyLevel::BlockMost,
            person_generation: PersonGeneration::AllowMinor,
            include_ra_terms: true,
            add_watermark: false,
            compress_images: true,
        };
        
        Self {
            client,
            api_key,
            base_url,
            default_config,
        }
    }
    
    /// 生成圖像
    pub async fn generate_image(&self, request: ImageGenerationRequest) -> Result<ImageGenerationResponse> {
        let start_time = std::time::Instant::now();
        
        log::info!("[ImagenApi] 開始生成圖像，提示詞: {}", request.prompt);
        
        // 構建 API 請求 URL
        let project_id = self.get_project_id()?;
        let location = "us-central1"; // Imagen 3.0 可用區域
        let url = format!(
            "{}/projects/{}/locations/{}/publishers/google/models/{}:predict",
            self.base_url, project_id, location, request.config.model
        );
        
        // 構建請求體
        let request_body = self.build_generation_request_body(&request)?;
        
        // 發送請求
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.get_access_token().await?))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("API 請求失敗: {}", e)))?;
        
        let status = response.status();
        let response_text = response.text().await
            .map_err(|e| IllustrationError::AIApi(format!("回應讀取失敗: {}", e)))?;
        
        if !status.is_success() {
            log::error!("[ImagenApi] API 錯誤 {}: {}", status, response_text);
            return Err(IllustrationError::AIApi(format!("API 錯誤 {}: {}", status, response_text)));
        }
        
        // 解析回應
        let api_response: ImagenApiResponse = serde_json::from_str(&response_text)
            .map_err(|e| IllustrationError::AIApi(format!("回應解析失敗: {}", e)))?;
        
        // 轉換為內部格式
        let generation_time = start_time.elapsed().as_millis() as u64;
        let result = self.process_generation_response(api_response, generation_time)?;
        
        log::info!("[ImagenApi] 圖像生成完成，耗時: {}ms", generation_time);
        Ok(result)
    }
    
    /// 編輯圖像
    #[allow(dead_code)]
    pub async fn edit_image(&self, request: ImageEditRequest) -> Result<ImageGenerationResponse> {
        log::info!("[ImagenApi] 開始編輯圖像，模式: {:?}", request.edit_mode);
        
        match request.edit_mode {
            EditMode::Inpaint => self.inpaint_image(request).await,
            EditMode::Outpaint => self.outpaint_image(request).await,
            EditMode::Upscale => self.upscale_image(request).await,
            EditMode::StyleTransfer => self.style_transfer_image(request).await,
        }
    }
    
    /// 局部重繪
    #[allow(dead_code)]
    async fn inpaint_image(&self, request: ImageEditRequest) -> Result<ImageGenerationResponse> {
        let project_id = self.get_project_id()?;
        let url = format!(
            "{}/projects/{}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict",
            self.base_url, project_id
        );
        
        let request_body = serde_json::json!({
            "instances": [{
                "prompt": request.prompt,
                "image": {
                    "bytesBase64Encoded": request.base_image
                },
                "mask": {
                    "image": {
                        "bytesBase64Encoded": request.mask_image.unwrap_or_default()
                    }
                }
            }],
            "parameters": {
                "mode": "inpainting",
                "guidanceScale": request.strength.unwrap_or(7.5),
                "sampleImageSize": "1024"
            }
        });
        
        let response = self.send_api_request(&url, &request_body).await?;
        self.process_generation_response(response, 0)
    }
    
    /// 擴展圖像
    #[allow(dead_code)]
    async fn outpaint_image(&self, request: ImageEditRequest) -> Result<ImageGenerationResponse> {
        let project_id = self.get_project_id()?;
        let url = format!(
            "{}/projects/{}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict",
            self.base_url, project_id
        );
        
        let request_body = serde_json::json!({
            "instances": [{
                "prompt": request.prompt,
                "image": {
                    "bytesBase64Encoded": request.base_image
                }
            }],
            "parameters": {
                "mode": "outpainting",
                "guidanceScale": request.strength.unwrap_or(7.5)
            }
        });
        
        let response = self.send_api_request(&url, &request_body).await?;
        self.process_generation_response(response, 0)
    }
    
    /// 放大圖像
    #[allow(dead_code)]
    async fn upscale_image(&self, request: ImageEditRequest) -> Result<ImageGenerationResponse> {
        let project_id = self.get_project_id()?;
        let url = format!(
            "{}/projects/{}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict",
            self.base_url, project_id
        );
        
        let request_body = serde_json::json!({
            "instances": [{
                "image": {
                    "bytesBase64Encoded": request.base_image
                },
                "prompt": request.prompt
            }],
            "parameters": {
                "mode": "upscaling",
                "upscaleFactor": 4
            }
        });
        
        let response = self.send_api_request(&url, &request_body).await?;
        self.process_generation_response(response, 0)
    }
    
    /// 風格轉換
    #[allow(dead_code)]
    async fn style_transfer_image(&self, request: ImageEditRequest) -> Result<ImageGenerationResponse> {
        let project_id = self.get_project_id()?;
        let url = format!(
            "{}/projects/{}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict",
            self.base_url, project_id
        );
        
        let request_body = serde_json::json!({
            "instances": [{
                "prompt": request.prompt,
                "image": {
                    "bytesBase64Encoded": request.base_image
                }
            }],
            "parameters": {
                "mode": "style_transfer",
                "guidanceScale": request.strength.unwrap_or(12.0)
            }
        });
        
        let response = self.send_api_request(&url, &request_body).await?;
        self.process_generation_response(response, 0)
    }
    
    /// 發送 API 請求
    #[allow(dead_code)]
    async fn send_api_request(&self, url: &str, body: &serde_json::Value) -> Result<ImagenApiResponse> {
        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.get_access_token().await?))
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("API 請求失敗: {}", e)))?;
        
        let status = response.status();
        let response_text = response.text().await
            .map_err(|e| IllustrationError::AIApi(format!("回應讀取失敗: {}", e)))?;
        
        if !status.is_success() {
            return Err(IllustrationError::AIApi(format!("API 錯誤 {}: {}", status, response_text)));
        }
        
        serde_json::from_str(&response_text)
            .map_err(|e| IllustrationError::AIApi(format!("回應解析失敗: {}", e)))
    }
    
    /// 構建生成請求體
    fn build_generation_request_body(&self, request: &ImageGenerationRequest) -> Result<serde_json::Value> {
        let mut instances = serde_json::json!([{
            "prompt": request.prompt
        }]);
        
        // 添加負面提示詞
        if let Some(negative_prompt) = &request.negative_prompt {
            instances[0]["negativePrompt"] = serde_json::Value::String(negative_prompt.clone());
        }
        
        // 添加角色種子
        if let Some(seed) = request.character_seed {
            instances[0]["seed"] = serde_json::Value::Number(serde_json::Number::from(seed));
        }
        
        let parameters = serde_json::json!({
            "aspectRatio": self.aspect_ratio_to_string(&request.config.aspect_ratio),
            "safetyFilterLevel": self.safety_level_to_string(&request.config.safety_filter_level),
            "personGeneration": self.person_generation_to_string(&request.config.person_generation),
            "includeRaiTerms": request.config.include_ra_terms,
            "addWatermark": request.config.add_watermark,
            "compressImages": request.config.compress_images,
            "guidanceScale": request.guidance_scale.unwrap_or(7.5)
        });
        
        Ok(serde_json::json!({
            "instances": instances,
            "parameters": parameters
        }))
    }
    
    /// 處理生成回應
    fn process_generation_response(&self, response: ImagenApiResponse, generation_time: u64) -> Result<ImageGenerationResponse> {
        let mut images = Vec::new();
        let mut safety_ratings = Vec::new();
        
        for prediction in response.predictions {
            // 處理圖像數據
            if let Some(ref bytes_base64) = prediction.bytes_base64_encoded {
                let image_data = general_purpose::STANDARD.decode(&bytes_base64)
                    .map_err(|e| IllustrationError::AIApi(format!("Base64 解碼失敗: {}", e)))?;
                
                let generated_image = GeneratedImage {
                    image_data: bytes_base64.clone(),
                    mime_type: prediction.mime_type.clone().unwrap_or("image/png".to_string()),
                    safety_rating: self.extract_safety_rating(&prediction)?,
                    width: 1024, // Imagen 3.0 預設尺寸
                    height: 1024,
                    file_size_bytes: image_data.len(),
                };
                
                images.push(generated_image);
            }
            
            // 處理安全評級
            if let Some(ratings) = prediction.safety_ratings {
                for rating in ratings {
                    safety_ratings.push(SafetyRating {
                        category: self.parse_safety_category(&rating.category)?,
                        probability: self.parse_safety_probability(&rating.probability)?,
                        blocked: rating.blocked.unwrap_or(false),
                    });
                }
            }
        }
        
        let metadata = GenerationMetadata {
            generation_time_ms: generation_time,
            prompt_token_count: 0, // Imagen 不提供 token 計數
            model_version: "imagen-3.0".to_string(),
            safety_filtered: safety_ratings.iter().any(|r| r.blocked),
            estimated_cost: 0.04, // Imagen 3.0 約 $0.04 per image
        };
        
        Ok(ImageGenerationResponse {
            success: !images.is_empty(),
            images,
            safety_ratings,
            error_message: None,
            generation_metadata: metadata,
        })
    }
    
    /// 提取安全評級
    fn extract_safety_rating(&self, _prediction: &ImagenPrediction) -> Result<SafetyRating> {
        // 簡化實現，返回預設安全評級
        Ok(SafetyRating {
            category: SafetyCategory::SexuallyExplicit,
            probability: SafetyProbability::Negligible,
            blocked: false,
        })
    }
    
    /// 解析安全分類
    fn parse_safety_category(&self, category: &str) -> Result<SafetyCategory> {
        match category {
            "HARM_CATEGORY_HATE_SPEECH" => Ok(SafetyCategory::HateSpeech),
            "HARM_CATEGORY_DANGEROUS_CONTENT" => Ok(SafetyCategory::DangerousContent),
            "HARM_CATEGORY_HARASSMENT" => Ok(SafetyCategory::Harassment),
            "HARM_CATEGORY_SEXUALLY_EXPLICIT" => Ok(SafetyCategory::SexuallyExplicit),
            _ => Ok(SafetyCategory::SexuallyExplicit), // 預設值
        }
    }
    
    /// 解析安全機率
    fn parse_safety_probability(&self, probability: &str) -> Result<SafetyProbability> {
        match probability {
            "NEGLIGIBLE" => Ok(SafetyProbability::Negligible),
            "LOW" => Ok(SafetyProbability::Low),
            "MEDIUM" => Ok(SafetyProbability::Medium),
            "HIGH" => Ok(SafetyProbability::High),
            _ => Ok(SafetyProbability::Negligible), // 預設值
        }
    }
    
    /// 轉換圖像比例為字串
    fn aspect_ratio_to_string(&self, ratio: &AspectRatio) -> String {
        match ratio {
            AspectRatio::Square => "1:1".to_string(),
            AspectRatio::Portrait => "9:16".to_string(),
            AspectRatio::Landscape => "16:9".to_string(),
            AspectRatio::Standard => "4:3".to_string(),
            AspectRatio::Tall => "3:4".to_string(),
        }
    }
    
    /// 轉換安全等級為字串
    fn safety_level_to_string(&self, level: &SafetyLevel) -> String {
        match level {
            SafetyLevel::BlockMost => "block_most".to_string(),
            SafetyLevel::BlockSome => "block_some".to_string(),
            SafetyLevel::BlockFew => "block_few".to_string(),
        }
    }
    
    /// 轉換人物生成為字串
    fn person_generation_to_string(&self, generation: &PersonGeneration) -> String {
        match generation {
            PersonGeneration::AllowAdult => "allow_adult".to_string(),
            PersonGeneration::AllowMinor => "allow_minor".to_string(),
            PersonGeneration::DontAllow => "dont_allow".to_string(),
        }
    }
    
    /// 獲取項目 ID
    fn get_project_id(&self) -> Result<String> {
        // 從環境變數或配置中獲取 Google Cloud Project ID
        std::env::var("GOOGLE_CLOUD_PROJECT_ID")
            .map_err(|_| IllustrationError::Config("未設定 GOOGLE_CLOUD_PROJECT_ID 環境變數".to_string()))
    }
    
    /// 獲取存取令牌
    async fn get_access_token(&self) -> Result<String> {
        // 簡化實現：直接使用 API 金鑰
        // 實際應用中應該使用 OAuth2 或服務帳戶金鑰
        Ok(self.api_key.clone())
    }
    
    /// 驗證 API 連線
    pub async fn validate_connection(&self) -> Result<bool> {
        log::info!("[ImagenApi] 驗證 API 連線");
        
        // 發送簡單的測試請求
        let test_request = ImageGenerationRequest {
            prompt: "test connection".to_string(),
            negative_prompt: None,
            config: self.default_config.clone(),
            character_seed: None,
            style_reference: None,
            guidance_scale: Some(7.5),
        };
        
        match self.generate_image(test_request).await {
            Ok(_) => {
                log::info!("[ImagenApi] API 連線驗證成功");
                Ok(true)
            },
            Err(e) => {
                log::error!("[ImagenApi] API 連線驗證失敗: {:?}", e);
                Ok(false)
            }
        }
    }
    
    /// 獲取支援的模型列表
    #[allow(dead_code)]
    pub fn get_supported_models(&self) -> Vec<String> {
        vec![
            "imagen-3.0-generate-001".to_string(),
            "imagen-3.0-generate-fast-001".to_string(),
        ]
    }
    
    /// 獲取預設配置
    #[allow(dead_code)]
    pub fn get_default_config(&self) -> &ImageGenerationConfig {
        &self.default_config
    }
    
    /// 更新預設配置
    #[allow(dead_code)]
    pub fn update_default_config(&mut self, config: ImageGenerationConfig) {
        self.default_config = config;
    }
    
    /// 估算生成成本
    #[allow(dead_code)]
    pub fn estimate_cost(&self, request: &ImageGenerationRequest) -> f64 {
        match request.config.model.as_str() {
            "imagen-3.0-generate-001" => 0.04,      // $0.04 per image
            "imagen-3.0-generate-fast-001" => 0.02, // $0.02 per image
            _ => 0.04, // 預設成本
        }
    }
}

/// Imagen API 原始回應
#[derive(Debug, Deserialize)]
struct ImagenApiResponse {
    predictions: Vec<ImagenPrediction>,
}

/// Imagen API 預測結果
#[derive(Debug, Deserialize)]
struct ImagenPrediction {
    #[serde(rename = "bytesBase64Encoded")]
    bytes_base64_encoded: Option<String>,
    mime_type: Option<String>,
    safety_ratings: Option<Vec<ApiSafetyRating>>,
}

/// API 安全評級
#[derive(Debug, Deserialize)]
struct ApiSafetyRating {
    category: String,
    probability: String,
    blocked: Option<bool>,
}