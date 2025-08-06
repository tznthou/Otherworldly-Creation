// AI 提供者模組
pub mod r#trait;
pub mod ollama;
pub mod openai;
pub mod gemini;
pub mod claude;
pub mod openrouter;

// 重導出主要類型和介面
pub use r#trait::{
    AIProvider, 
    AIProviderFactory,
    ProviderConfig,
    AIGenerationRequest,
    AIGenerationResponse,
    AIGenerationParams,
    AIUsageInfo,
    ModelInfo,
};

// 重導出具體實現
pub use ollama::OllamaProvider;
pub use openai::OpenAIProvider;
pub use gemini::GeminiProvider;
pub use claude::ClaudeProvider;
pub use openrouter::OpenRouterProvider;