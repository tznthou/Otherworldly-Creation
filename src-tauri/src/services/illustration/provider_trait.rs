/// 統一圖像生成服務介面
/// 
/// 為不同的圖像生成服務提供統一的介面，包括：
/// - Pollinations (免費)
/// - Gemini 2.5 Flash Image (免費/付費)  
/// - Google Imagen 3.0 (付費)
///
/// 設計原則：
/// - 零破壞性：現有服務實現此介面時完全向後兼容
/// - 統一響應：所有服務返回相同格式的響應結構
/// - 擴展性：支援未來新增更多圖像生成服務

use serde::{Deserialize, Serialize};
use async_trait::async_trait;

use super::{Result, IllustrationError};

/// 統一的圖像生成請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedImageRequest {
    /// 文字提示詞（支援中文）
    pub prompt: String,
    /// 圖像寬度
    pub width: Option<u32>,
    /// 圖像高度  
    pub height: Option<u32>,
    /// 隨機種子（可重現結果）
    pub seed: Option<u32>,
    /// 負面提示詞
    pub negative_prompt: Option<String>,
    /// 是否增強提示詞
    pub enhance: Option<bool>,
    /// 品質等級 (low, standard, high)
    pub quality: Option<String>,
    /// 風格指引 (anime, realistic, artistic)
    pub style: Option<String>,
    /// 安全等級 (block_most, block_some, block_few)
    pub safety_level: Option<String>,
    /// 是否支援透明背景
    pub transparent: Option<bool>,
    /// 參考圖像URL（圖像到圖像生成）
    pub reference_image: Option<String>,
}

impl Default for UnifiedImageRequest {
    fn default() -> Self {
        Self {
            prompt: String::new(),
            width: Some(1024),
            height: Some(1024),
            seed: None,
            negative_prompt: None,
            enhance: Some(false),
            quality: Some("standard".to_string()),
            style: Some("anime".to_string()),
            safety_level: Some("block_most".to_string()),
            transparent: Some(false),
            reference_image: None,
        }
    }
}

/// 統一的圖像生成響應
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedImageResponse {
    /// 生成ID
    pub id: String,
    /// 圖像數據（bytes）
    pub image_data: Vec<u8>,
    /// 使用的提示詞
    pub prompt: String,
    /// 實際使用的參數
    pub parameters: UnifiedImageParameters,
    /// 生成時間（毫秒）
    pub generation_time_ms: u64,
    /// 圖像URL（如果有）
    pub image_url: Option<String>,
    /// 提供者標識
    pub provider: String,
    /// 模型名稱
    pub model: String,
    /// 成本資訊（如果有）
    pub cost_info: Option<CostInfo>,
}

/// 實際使用的生成參數
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedImageParameters {
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub seed: Option<u32>,
    pub enhance: bool,
    pub quality: String,
    pub style: String,
    pub safety_level: String,
}

/// 成本資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostInfo {
    /// 成本（USD）
    pub cost_usd: Option<f64>,
    /// 是否免費
    pub is_free: bool,
    /// 提供者類型
    pub provider_type: String, // "free", "freemium", "paid"
}

/// 圖像生成服務特徵
#[async_trait]
#[allow(dead_code)]  // 為未來 API 預留
pub trait ImageProvider: Send + Sync {
    /// 服務名稱
    fn name(&self) -> &str;
    
    /// 服務描述
    fn description(&self) -> &str;
    
    /// 是否免費
    fn is_free(&self) -> bool;
    
    /// 支援的最大圖像尺寸
    fn max_dimensions(&self) -> (u32, u32);
    
    /// 支援的功能特色
    fn features(&self) -> Vec<String>;
    
    /// 生成單張圖像
    async fn generate_image(&self, request: UnifiedImageRequest) -> Result<UnifiedImageResponse>;
    
    /// 健康檢查
    async fn health_check(&self) -> Result<bool>;
    
    /// 獲取可用模型列表
    fn available_models(&self) -> Vec<ModelInfo>;
}

/// 模型資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_default: bool,
    pub features: Vec<String>,
}

/// 圖像生成服務管理器
#[allow(dead_code)]  // 為未來 API 預留
pub struct ImageProviderManager {
    providers: std::collections::HashMap<String, Box<dyn ImageProvider>>,
    default_provider: String,
}

#[allow(dead_code)]  // 為未來 API 預留
impl ImageProviderManager {
    pub fn new() -> Self {
        Self {
            providers: std::collections::HashMap::new(),
            default_provider: "pollinations".to_string(),
        }
    }
    
    /// 註冊服務提供者
    pub fn register_provider(&mut self, provider: Box<dyn ImageProvider>) {
        let name = provider.name().to_string();
        self.providers.insert(name, provider);
    }
    
    /// 設定預設提供者
    pub fn set_default_provider(&mut self, name: String) {
        self.default_provider = name;
    }
    
    /// 獲取提供者
    pub fn get_provider(&self, name: Option<&str>) -> Option<&Box<dyn ImageProvider>> {
        let provider_name = name.unwrap_or(&self.default_provider);
        self.providers.get(provider_name)
    }
    
    /// 獲取所有提供者列表
    pub fn list_providers(&self) -> Vec<(&String, &Box<dyn ImageProvider>)> {
        self.providers.iter().collect()
    }
    
    /// 生成圖像（使用指定或預設提供者）
    pub async fn generate_image(
        &self,
        request: UnifiedImageRequest,
        provider_name: Option<&str>,
    ) -> Result<UnifiedImageResponse> {
        let provider = self.get_provider(provider_name)
            .ok_or_else(|| IllustrationError::ServiceError {
                message: format!("未找到圖像生成服務: {:?}", provider_name),
            })?;
        
        provider.generate_image(request).await
    }
}