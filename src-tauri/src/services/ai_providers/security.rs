use anyhow::{Result, anyhow};
use std::collections::HashMap;

/// 安全常數配置
pub struct SecurityConstants;

impl SecurityConstants {
    // 參數驗證限制
    pub const MIN_TEMPERATURE: f64 = 0.0;
    pub const MAX_TEMPERATURE: f64 = 2.0;
    pub const MIN_MAX_TOKENS: i32 = 1;
    pub const MAX_MAX_TOKENS: i32 = 32768;
    pub const MIN_TOP_P: f64 = 0.0;
    pub const MAX_TOP_P: f64 = 1.0;
    pub const MIN_PENALTY: f64 = -2.0;
    pub const MAX_PENALTY: f64 = 2.0;
    
    // HTTP 安全限制
    pub const MAX_RESPONSE_SIZE_BYTES: usize = 50 * 1024 * 1024; // 50MB
    pub const DEFAULT_TIMEOUT_SECS: u64 = 120;
    pub const MAX_RETRY_ATTEMPTS: u32 = 3;
    
    // API 金鑰顯示配置
    pub const API_KEY_VISIBLE_PREFIX: usize = 4;
    pub const API_KEY_VISIBLE_SUFFIX: usize = 4;
    pub const API_KEY_MIN_LENGTH_TO_MASK: usize = 10;
}

/// 安全工具集合
pub struct SecurityUtils;

impl SecurityUtils {
    /// 遮蔽 API 金鑰，用於安全日誌記錄
    /// 
    /// # Examples
    /// ```
    /// let masked = SecurityUtils::mask_api_key("sk-1234567890abcdef");
    /// assert_eq!(masked, "sk-1...cdef");
    /// ```
    pub fn mask_api_key(api_key: &str) -> String {
        if api_key.len() < SecurityConstants::API_KEY_MIN_LENGTH_TO_MASK {
            // 太短的金鑰完全遮蔽
            return "*".repeat(api_key.len());
        }
        
        let prefix_len = SecurityConstants::API_KEY_VISIBLE_PREFIX.min(api_key.len() / 3);
        let suffix_len = SecurityConstants::API_KEY_VISIBLE_SUFFIX.min(api_key.len() / 3);
        
        if prefix_len + suffix_len >= api_key.len() {
            return "*".repeat(api_key.len());
        }
        
        format!(
            "{}...{}",
            &api_key[..prefix_len],
            &api_key[api_key.len() - suffix_len..]
        )
    }
    
    /// 驗證 AI 生成參數的安全性和合法性
    pub fn validate_generation_params(params: &super::r#trait::AIGenerationParams) -> Result<()> {
        // 驗證 temperature
        if params.temperature < SecurityConstants::MIN_TEMPERATURE || 
           params.temperature > SecurityConstants::MAX_TEMPERATURE {
            return Err(anyhow!(
                "temperature 必須在 {} 到 {} 之間，當前值: {}",
                SecurityConstants::MIN_TEMPERATURE,
                SecurityConstants::MAX_TEMPERATURE,
                params.temperature
            ));
        }
        
        // 驗證 max_tokens
        if params.max_tokens < SecurityConstants::MIN_MAX_TOKENS || 
           params.max_tokens > SecurityConstants::MAX_MAX_TOKENS {
            return Err(anyhow!(
                "max_tokens 必須在 {} 到 {} 之間，當前值: {}",
                SecurityConstants::MIN_MAX_TOKENS,
                SecurityConstants::MAX_MAX_TOKENS,
                params.max_tokens
            ));
        }
        
        // 驗證 top_p（如果提供）
        if let Some(top_p) = params.top_p {
            if top_p < SecurityConstants::MIN_TOP_P || top_p > SecurityConstants::MAX_TOP_P {
                return Err(anyhow!(
                    "top_p 必須在 {} 到 {} 之間，當前值: {}",
                    SecurityConstants::MIN_TOP_P,
                    SecurityConstants::MAX_TOP_P,
                    top_p
                ));
            }
        }
        
        // 驗證 presence_penalty（如果提供）
        if let Some(penalty) = params.presence_penalty {
            if penalty < SecurityConstants::MIN_PENALTY || penalty > SecurityConstants::MAX_PENALTY {
                return Err(anyhow!(
                    "presence_penalty 必須在 {} 到 {} 之間，當前值: {}",
                    SecurityConstants::MIN_PENALTY,
                    SecurityConstants::MAX_PENALTY,
                    penalty
                ));
            }
        }
        
        // 驗證 frequency_penalty（如果提供）
        if let Some(penalty) = params.frequency_penalty {
            if penalty < SecurityConstants::MIN_PENALTY || penalty > SecurityConstants::MAX_PENALTY {
                return Err(anyhow!(
                    "frequency_penalty 必須在 {} 到 {} 之間，當前值: {}",
                    SecurityConstants::MIN_PENALTY,
                    SecurityConstants::MAX_PENALTY,
                    penalty
                ));
            }
        }
        
        Ok(())
    }
    
    /// 驗證提示詞內容的安全性
    pub fn validate_prompt_content(prompt: &str, system_prompt: Option<&str>) -> Result<()> {
        // 檢查提示詞長度
        if prompt.is_empty() {
            return Err(anyhow!("提示詞不能為空"));
        }
        
        const MAX_PROMPT_LENGTH: usize = 100_000; // 100K 字符
        if prompt.len() > MAX_PROMPT_LENGTH {
            return Err(anyhow!(
                "提示詞長度超過限制，最大 {} 字符，當前 {} 字符",
                MAX_PROMPT_LENGTH,
                prompt.len()
            ));
        }
        
        // 檢查系統提示詞（如果提供）
        if let Some(sys_prompt) = system_prompt {
            if sys_prompt.len() > MAX_PROMPT_LENGTH {
                return Err(anyhow!(
                    "系統提示詞長度超過限制，最大 {} 字符，當前 {} 字符",
                    MAX_PROMPT_LENGTH,
                    sys_prompt.len()
                ));
            }
        }
        
        Ok(())
    }
    
    /// 清理錯誤訊息中的敏感資訊
    pub fn sanitize_error_message(error_msg: &str, api_key: &str) -> String {
        let mut sanitized = error_msg.to_string();
        
        // 移除完整的 API 金鑰
        sanitized = sanitized.replace(api_key, &Self::mask_api_key(api_key));
        
        // 移除其他可能的敏感模式
        let sensitive_patterns = [
            (r"Bearer [A-Za-z0-9_-]+", "Bearer [MASKED]"),
            (r#"api[_-]?key['"]?\s*[:=]\s*['"]?[A-Za-z0-9_-]+"#, "api_key: [MASKED]"),
            (r"sk-[A-Za-z0-9_-]+", "[API_KEY_MASKED]"),
            (r#"password['"]?\s*[:=]\s*['"]?[^\s'"]+"#, "password: [MASKED]"),
        ];
        
        for (pattern, replacement) in sensitive_patterns {
            if let Ok(regex) = regex::Regex::new(pattern) {
                sanitized = regex.replace_all(&sanitized, replacement).to_string();
            }
        }
        
        sanitized
    }
    
    /// 創建受保護的 HTTP header（不包含敏感資訊的日誌安全版本）
    #[allow(dead_code)]
    pub fn create_safe_headers_for_logging(headers: &HashMap<String, String>) -> HashMap<String, String> {
        let mut safe_headers = HashMap::new();
        
        for (key, value) in headers {
            let lower_key = key.to_lowercase();
            if lower_key.contains("authorization") || 
               lower_key.contains("api") || 
               lower_key.contains("key") ||
               lower_key.contains("token") {
                safe_headers.insert(key.clone(), "[MASKED]".to_string());
            } else {
                safe_headers.insert(key.clone(), value.clone());
            }
        }
        
        safe_headers
    }
}

/// HTTP 安全配置
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct HttpSecurityConfig {
    pub max_response_size: usize,
    pub timeout_secs: u64,
    pub max_retry_attempts: u32,
    pub enable_size_limit: bool,
}

impl Default for HttpSecurityConfig {
    fn default() -> Self {
        Self {
            max_response_size: SecurityConstants::MAX_RESPONSE_SIZE_BYTES,
            timeout_secs: SecurityConstants::DEFAULT_TIMEOUT_SECS,
            max_retry_attempts: SecurityConstants::MAX_RETRY_ATTEMPTS,
            enable_size_limit: true,
        }
    }
}

impl HttpSecurityConfig {
    /// 創建適合不同 AI 提供者的安全配置
    #[allow(dead_code)]
    pub fn for_provider(provider_type: &str) -> Self {
        let mut config = Self::default();
        
        match provider_type {
            "ollama" => {
                // 本地 Ollama 可以較為寬鬆
                config.max_response_size = 100 * 1024 * 1024; // 100MB
                config.timeout_secs = 300; // 5 分鐘
            }
            "openai" | "claude" | "gemini" | "openrouter" => {
                // 雲端服務使用標準限制
                config.max_response_size = SecurityConstants::MAX_RESPONSE_SIZE_BYTES;
                config.timeout_secs = SecurityConstants::DEFAULT_TIMEOUT_SECS;
            }
            _ => {
                // 未知提供者使用最嚴格設定
                config.max_response_size = 10 * 1024 * 1024; // 10MB
                config.timeout_secs = 60;
            }
        }
        
        config
    }
}

/// 安全驗證結果
#[derive(Debug)]
#[allow(dead_code)]
pub struct SecurityValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl SecurityValidationResult {
    #[allow(dead_code)]
    pub fn valid() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }
    
    #[allow(dead_code)]
    pub fn invalid_with_errors(errors: Vec<String>) -> Self {
        Self {
            is_valid: false,
            errors,
            warnings: Vec::new(),
        }
    }
    
    #[allow(dead_code)]
    pub fn add_warning(&mut self, warning: String) {
        self.warnings.push(warning);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_api_key_masking() {
        assert_eq!(SecurityUtils::mask_api_key("sk-1234567890abcdef"), "sk-1...cdef");
        assert_eq!(SecurityUtils::mask_api_key("short"), "*****");
        assert_eq!(SecurityUtils::mask_api_key(""), "");
    }
    
    #[test]
    fn test_parameter_validation() {
        use crate::services::ai_providers::r#trait::AIGenerationParams;
        
        // 有效參數
        let valid_params = AIGenerationParams {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: Some(0.9),
            presence_penalty: Some(0.0),
            frequency_penalty: Some(0.0),
            stop: None,
        };
        assert!(SecurityUtils::validate_generation_params(&valid_params).is_ok());
        
        // 無效的 temperature
        let invalid_temp = AIGenerationParams {
            temperature: 3.0, // 超出範圍
            ..valid_params.clone()
        };
        assert!(SecurityUtils::validate_generation_params(&invalid_temp).is_err());
    }
}