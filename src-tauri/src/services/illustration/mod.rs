/// Phase 3: AI 插畫生成服務模塊
/// 
/// 這個模塊提供完整的 AI 插畫生成功能，重點關注角色視覺一致性：
/// - 角色一致性管理
/// - Seed 值生成和管理 
/// - 視覺特徵提取和標準化
/// - 提示詞工程和模板系統
/// - Gemini Imagen API 整合
/// - 批次生成和隊列管理

pub mod character_consistency;
pub mod seed_manager;
pub mod visual_traits;
pub mod imagen_api;
pub mod pollinations_api;
pub mod illustration_manager;
pub mod batch_manager;
pub mod style_resolver;

pub use character_consistency::CharacterConsistencyManager;
pub use seed_manager::SeedManager;
pub use visual_traits::{VisualTraits, VisualTraitsManager};
pub use imagen_api::{
    ImagenApiService, ImageGenerationRequest, ImageGenerationResponse, 
    ImageGenerationConfig, AspectRatio, SafetyLevel, PersonGeneration
};
pub use pollinations_api::{
    PollinationsApiService, PollinationsRequest, PollinationsModel
};
pub use illustration_manager::{
    IllustrationManager, EnhancedIllustrationRequest
};
pub use batch_manager::{
    BatchManager, BatchRequest, TaskPriority
};
pub use style_resolver::StyleResolver;

/// 插畫生成請求結構
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IllustrationRequest {
    pub project_id: String,
    pub character_id: Option<String>,
    pub scene_description: String, // 中文描述
    pub style_template_id: Option<String>,
    pub custom_style_params: Option<serde_json::Value>,
    pub use_reference_image: bool,
    pub quality_preset: String, // "speed", "balanced", "quality"
    pub batch_size: Option<u32>,
}

/// 插畫生成響應結構
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IllustrationResponse {
    pub id: String,
    pub status: String, // "pending", "processing", "completed", "failed"
    pub image_url: Option<String>,
    pub translated_prompt: Option<String>,
    pub seed_value: Option<u32>,
    pub consistency_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub generation_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

/// 角色視覺一致性配置
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConsistencyConfig {
    pub mode: String, // "seed", "reference", "seed_reference"
    pub tolerance_level: f64, // 0.0 - 1.0
    pub auto_enhance: bool,
    pub manual_review_required: bool,
}

/// 插畫風格模板
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StyleTemplate {
    pub id: String,
    pub name: String,
    pub style_type: String, // "anime", "realistic", "fantasy", etc.
    pub prompt_template: String,
    pub negative_prompt: Option<String>,
    pub api_params: serde_json::Value,
    pub suitable_for: Vec<String>, // ["character", "scene", "cover"]
}

/// 錯誤類型定義
#[derive(Debug, thiserror::Error)]
pub enum IllustrationError {
    #[error("資料庫錯誤: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("AI API 錯誤: {0}")]
    AIApi(String),
    
    #[error("翻譯錯誤: {0}")]
    Translation(#[from] crate::services::translation::TranslationError),
    
    #[error("角色一致性錯誤: {0}")]
    ConsistencyError(String),
    
    #[error("檔案操作錯誤: {0}")]
    FileOperation(#[from] std::io::Error),
    
    #[error("JSON 解析錯誤: {0}")]
    JsonParse(#[from] serde_json::Error),
    
    #[error("配置錯誤: {0}")]
    Config(String),
    
    #[error("未知錯誤: {0}")]
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, IllustrationError>;