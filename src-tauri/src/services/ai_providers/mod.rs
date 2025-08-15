// AI 提供者模組
pub mod r#trait;
pub mod security;
pub mod ollama;
pub mod openai;
pub mod gemini;
pub mod claude;
pub mod openrouter;

// 重導出主要類型和介面（僅導出實際使用的）
pub use r#trait::{
    AIProviderFactory,
    ProviderConfig,
    AIGenerationRequest,
    AIGenerationParams,
};

// 重導出安全工具（僅導出實際使用的）
// SecurityUtils, SecurityConstants, HttpSecurityConfig 僅在模組內部使用