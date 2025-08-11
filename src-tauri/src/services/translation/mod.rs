//! 中英翻譯引擎和專業詞彙庫
//! 
//! 為 AI 插畫生成提供智能的中文描述轉英文提示詞服務
//! 包含專業的動漫、輕小說角色描述詞彙庫

pub mod vocabulary_database;
pub mod translation_engine;
pub mod prompt_optimizer;
pub mod prompt_templates;

pub use translation_engine::{
    TranslationEngine, TranslationRequest, 
    TranslationStyle, QualityLevel
};
pub use vocabulary_database::{VocabularyDatabase, VocabularyCategory};
pub use prompt_optimizer::{
    PromptOptimizer, OptimizationLevel, PromptStyle, 
    OptimizationRequest, QualityFocus
};
pub use prompt_templates::{
    PromptTemplateManager, TemplateCategory,
    TemplateApplicationRequest, TemplateSearchRequest
};

use thiserror::Error;

/// 翻譯服務錯誤類型
#[derive(Error, Debug)]
pub enum TranslationError {
    #[error("詞彙庫載入失敗: {0}")]
    #[allow(dead_code)]
    VocabularyLoadError(String),
    
    #[error("翻譯引擎錯誤: {0}")]
    EngineError(String),
    
    #[error("提示詞優化失敗: {0}")]
    OptimizationError(String),
    
    #[error("不支援的語言: {0}")]
    #[allow(dead_code)]
    UnsupportedLanguage(String),
    
    #[error("資料庫操作失敗: {0}")]
    DatabaseError(#[from] rusqlite::Error),
    
    #[error("JSON 序列化錯誤: {0}")]
    JsonError(#[from] serde_json::Error),
    
    #[error("未知錯誤: {0}")]
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, TranslationError>;