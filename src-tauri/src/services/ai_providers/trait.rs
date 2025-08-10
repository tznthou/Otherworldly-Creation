use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// AI 生成參數
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIGenerationParams {
    pub temperature: f64,
    pub max_tokens: i32,
    pub top_p: Option<f64>,
    pub presence_penalty: Option<f64>,
    pub frequency_penalty: Option<f64>,
    pub stop: Option<Vec<String>>,
}

impl Default for AIGenerationParams {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            max_tokens: 2000,
            top_p: Some(0.9),
            presence_penalty: Some(0.0),
            frequency_penalty: Some(0.0),
            stop: None,
        }
    }
}

/// AI 生成請求
#[derive(Debug, Clone)]
pub struct AIGenerationRequest {
    pub model: String,
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub params: AIGenerationParams,
}

/// AI 生成響應
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIGenerationResponse {
    pub text: String,
    pub model: String,
    pub usage: Option<AIUsageInfo>,
    pub finish_reason: Option<String>,
}

/// AI 使用統計
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIUsageInfo {
    pub prompt_tokens: Option<i32>,
    pub completion_tokens: Option<i32>,
    pub total_tokens: Option<i32>,
}

/// 模型資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub max_tokens: Option<i32>,
    pub supports_streaming: bool,
    pub cost_per_token: Option<f64>,
}

/// 模型檢測工具函數 - 階段一實施方案
pub fn detect_model_characteristics(model_name: &str) -> ModelCharacteristics {
    let model_lower = model_name.to_lowercase();
    
    // 檢測響應格式特殊情況
    let response_format = if model_lower.contains("gpt-oss") || 
                            (model_lower.contains("qwen") && model_lower.contains("think")) {
        ResponseFormat::ThinkingField
    } else if model_lower.contains("claude") {
        ResponseFormat::ContentArray
    } else if model_lower.contains("gemini") {
        ResponseFormat::CandidatesArray
    } else {
        ResponseFormat::Standard
    };
    
    // 檢測提示詞格式偏好
    let prompt_format = if model_lower.contains("claude") {
        PromptFormat::Conversational
    } else if model_lower.contains("gemini") {
        PromptFormat::Parts
    } else if model_lower.contains("llama") || model_lower.contains("qwen") {
        PromptFormat::Instruct
    } else {
        PromptFormat::Standard
    };
    
    ModelCharacteristics {
        response_format,
        prompt_format,
        requires_system_prompt: !model_lower.contains("gemini"),
        supports_streaming: true,
    }
}

/// 模型特徵描述
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ModelCharacteristics {
    pub response_format: ResponseFormat,
    pub prompt_format: PromptFormat,
    pub requires_system_prompt: bool,
    pub supports_streaming: bool,
}

/// 響應格式類型
#[derive(Debug, Clone)]
pub enum ResponseFormat {
    Standard,      // OpenAI風格: choices[0].message.content
    ThinkingField, // Ollama特殊模型: thinking字段
    ContentArray,  // Claude風格: content[0].text
    CandidatesArray, // Gemini風格: candidates[0].content.parts[0].text
}

/// 提示詞格式類型
#[derive(Debug, Clone)]
pub enum PromptFormat {
    Standard,       // 基本提示詞
    Conversational, // 對話格式
    Instruct,       // 指令格式
    Parts,          // Gemini的parts格式
}

/// AI 提供者配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub provider_type: String,
    pub api_key: Option<String>,
    pub endpoint: Option<String>,
    pub model: String,
    pub is_enabled: bool,
    pub settings: HashMap<String, serde_json::Value>,
}

/// AI 提供者統一介面
#[async_trait]
#[allow(dead_code)]
pub trait AIProvider: Send + Sync {
    /// 獲取提供者名稱
    fn name(&self) -> &str;
    
    /// 獲取提供者類型
    fn provider_type(&self) -> &str;
    
    /// 檢查服務是否可用
    async fn check_availability(&self) -> Result<bool>;
    
    /// 獲取可用模型列表
    async fn get_models(&self) -> Result<Vec<ModelInfo>>;
    
    /// 生成文本
    async fn generate_text(&self, request: AIGenerationRequest) -> Result<AIGenerationResponse>;
    
    /// 驗證 API 金鑰（如果需要）
    async fn validate_api_key(&self, api_key: &str) -> Result<bool>;
    
    /// 估算請求成本（如果適用）
    async fn estimate_cost(&self, request: &AIGenerationRequest) -> Result<Option<f64>>;
    
    /// 獲取預設參數
    fn default_params(&self) -> AIGenerationParams {
        AIGenerationParams::default()
    }
    
    /// 是否需要 API 金鑰
    fn requires_api_key(&self) -> bool {
        true
    }
    
    /// 獲取設定模式（URL或預定義）
    fn supports_custom_endpoint(&self) -> bool {
        false
    }
}

/// AI 提供者工廠
pub struct AIProviderFactory;

impl AIProviderFactory {
    /// 根據配置創建提供者實例
    pub fn create_provider(config: &ProviderConfig) -> Result<Box<dyn AIProvider>> {
        match config.provider_type.as_str() {
            "ollama" => {
                let provider = crate::services::ai_providers::ollama::OllamaProvider::new(config)?;
                Ok(Box::new(provider))
            }
            "openai" => {
                let provider = crate::services::ai_providers::openai::OpenAIProvider::new(config)?;
                Ok(Box::new(provider))
            }
            "gemini" => {
                let provider = crate::services::ai_providers::gemini::GeminiProvider::new(config)?;
                Ok(Box::new(provider))
            }
            "claude" => {
                let provider = crate::services::ai_providers::claude::ClaudeProvider::new(config)?;
                Ok(Box::new(provider))
            }
            "openrouter" => {
                let provider = crate::services::ai_providers::openrouter::OpenRouterProvider::new(config)?;
                Ok(Box::new(provider))
            }
            _ => Err(anyhow::anyhow!("不支援的 AI 提供者類型: {}", config.provider_type))
        }
    }
    
    /// 獲取所有支援的提供者類型
    pub fn supported_providers() -> Vec<&'static str> {
        vec!["ollama", "openai", "gemini", "claude", "openrouter"]
    }
}