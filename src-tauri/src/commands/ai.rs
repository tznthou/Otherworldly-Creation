use crate::services::ollama::{get_ollama_service, OllamaOptions, UpdateConfig};
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceStatus {
    pub service: ServiceInfo,
    pub models: ModelsInfo,
    pub last_checked: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceInfo {
    pub available: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelsInfo {
    pub count: usize,
    pub list: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateParams {
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub max_tokens: Option<u32>,
    pub presence_penalty: Option<f32>,
    pub frequency_penalty: Option<f32>,
    pub max_context_tokens: Option<u32>,
}

/// 檢查 Ollama 服務是否可用
#[command]
pub async fn check_ollama_service() -> Result<bool, String> {
    log::info!("=== Tauri Command: 檢查 Ollama 服務 ===");
    
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let result = service.check_service_availability().await;
    
    log::info!("Tauri: Ollama 服務檢查結果: {:?}", result);
    
    Ok(result.available)
}

/// 獲取詳細的服務狀態
#[command]
pub async fn get_service_status() -> Result<ServiceStatus, String> {
    log::info!("=== 開始獲取服務狀態 ===");
    
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let service_check = service.check_service_availability().await;
    let models_result = service.list_models().await;
    
    let service_info = ServiceInfo {
        available: service_check.available,
        version: service_check.version,
        error: service_check.error,
    };
    
    let models_info = ModelsInfo {
        count: if models_result.success { models_result.models.len() } else { 0 },
        list: if models_result.success {
            models_result.models.iter().map(|m| m.name.clone()).collect()
        } else {
            vec![]
        },
    };
    
    let status = ServiceStatus {
        service: service_info,
        models: models_info,
        last_checked: chrono::Utc::now().to_rfc3339(),
    };
    
    log::info!("服務狀態: {:?}", status);
    Ok(status)
}

/// 獲取模型列表
#[command]
pub async fn list_models() -> Result<Vec<String>, String> {
    log::info!("=== 開始獲取模型列表 ===");
    
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let result = service.list_models().await;
    log::info!("模型列表結果: {:?}", result);
    
    if result.success {
        let model_names: Vec<String> = result.models.iter().map(|model| model.name.clone()).collect();
        log::info!("可用模型: {:?}", model_names);
        log::info!("模型數量: {}", model_names.len());
        Ok(model_names)
    } else {
        log::error!("獲取模型列表失敗: {:?}", result.error);
        Ok(vec![])
    }
}

/// 獲取詳細的模型資訊
#[command]
pub async fn get_models_info() -> Result<crate::services::ollama::ModelsResult, String> {
    log::info!("=== 開始獲取詳細模型資訊 ===");
    
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let result = service.list_models().await;
    log::info!("詳細模型資訊: {:?}", result);
    Ok(result)
}

/// 檢查特定模型是否可用
#[command]
pub async fn check_model_availability(model_name: String) -> Result<crate::services::ollama::ModelAvailability, String> {
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let result = service.check_model_availability(&model_name).await;
    Ok(result)
}

/// 生成文本
#[command]
pub async fn generate_text(
    prompt: String,
    model: String,
    params: GenerateParams,
) -> Result<String, String> {
    log::info!("=== 開始生成文本，模型: {} ===", model);
    
    let options = OllamaOptions {
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
        presence_penalty: params.presence_penalty,
        frequency_penalty: params.frequency_penalty,
    };
    
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let result = service.generate_text(&model, &prompt, Some(options)).await;
    
    if result.success {
        Ok(result.response.unwrap_or_default())
    } else {
        Err(result.error.unwrap_or("生成文本失敗".to_string()))
    }
}

/// 使用分離上下文生成文本（簡化版）
#[command]
pub async fn generate_with_separated_context(
    project_id: String,
    chapter_id: String,
    position: usize,
    model: String,
    params: GenerateParams,
) -> Result<String, String> {
    log::info!("=== 開始使用分離上下文生成文本（簡化版）===");
    log::info!("專案: {}, 章節: {}, 位置: {}, 模型: {}", project_id, chapter_id, position, model);
    
    // 1. 構建分離的上下文
    let (system_prompt, user_context) = crate::commands::context::build_separated_context(
        project_id.clone(), chapter_id.clone(), position
    )
        .await
        .map_err(|e| format!("構建分離上下文失敗: {}", e))?;
    
    log::info!("系統提示長度: {} 字符", system_prompt.len());
    log::info!("用戶上下文長度: {} 字符", user_context.len());
    
    // 2. 如果有 Chat API 支援，使用 Chat API
    // 目前先回退到傳統方式，但結構已準備好 Chat API 升級
    let combined_prompt = format!("{}\n\n{}", system_prompt, user_context);
    
    // 3. 使用上下文生成文本
    let options = crate::services::ollama::OllamaOptions {
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
        presence_penalty: params.presence_penalty,
        frequency_penalty: params.frequency_penalty,
    };
    
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let result = service.generate_text(&model, &combined_prompt, Some(options)).await;
    
    if result.success {
        let generated_text = result.response.unwrap_or_default();
        log::info!("生成文本成功，長度: {} 字符", generated_text.len());
        Ok(generated_text)
    } else {
        let error_msg = result.error.unwrap_or("生成文本失敗".to_string());
        log::error!("生成文本失敗: {}", error_msg);
        Err(error_msg)
    }
}

/// 使用上下文生成文本（傳統版本）
#[command]
pub async fn generate_with_context(
    project_id: String,
    chapter_id: String,
    position: usize,
    model: String,
    params: GenerateParams,
    language: Option<String>,
) -> Result<String, String> {
    log::info!("=== 開始使用上下文生成文本 ===");
    log::info!("專案: {}, 章節: {}, 位置: {}, 模型: {}, 語言: {:?}", project_id, chapter_id, position, model, language);
    
    // 🔥 修復：使用新的多提供者系統
    // 首先需要找到使用此模型的提供者
    use crate::database::connection::create_connection;
    use rusqlite::params;
    
    // 🔥 智能提供者匹配邏輯 - 讓一個提供者支持多個模型
    let provider_id = {
        let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
        
        // 首先嘗試精確模型匹配（向後兼容）
        let mut stmt = conn.prepare(
            "SELECT id FROM ai_providers WHERE model = ?1 AND is_enabled = 1 LIMIT 1"
        ).map_err(|e| format!("準備查詢失敗: {}", e))?;
        
        match stmt.query_row(params![model], |row| row.get::<_, String>(0)) {
            Ok(provider_id) => {
                log::info!("✅ 精確匹配找到提供者: {} for model: {}", provider_id, model);
                provider_id
            }
            Err(_) => {
                // 精確匹配失敗，使用智能匹配
                log::info!("📍 精確匹配失敗，嘗試智能匹配模型: {}", model);
                
                let provider_type = if model.starts_with("gpt-") || model.contains("openai") {
                    "openai"
                } else if model.contains("gemini") || model.starts_with("gemini-") {
                    "gemini" 
                } else if model.contains("claude") || model.starts_with("claude-") {
                    "claude"
                } else if model.contains("/") { // OpenRouter format: provider/model
                    "openrouter"
                } else {
                    "ollama" // Default fallback
                };
                
                log::info!("🎯 智能匹配: 模型 '{}' 映射到提供者類型 '{}'", model, provider_type);
                
                let mut stmt2 = conn.prepare(
                    "SELECT id FROM ai_providers WHERE provider_type = ?1 AND is_enabled = 1 LIMIT 1"
                ).map_err(|e| format!("準備智能匹配查詢失敗: {}", e))?;
                
                stmt2.query_row(params![provider_type], |row| row.get::<_, String>(0))
                    .map_err(|e| format!("智能匹配失敗: 找不到類型為 '{}' 的啟用提供者來支持模型 '{}'. 請先配置對應的AI提供者。錯誤: {}", provider_type, model, e))?
            }
        }
    }; // 在這裡關閉資料庫連接的作用域
    
    log::info!("找到提供者 ID: {}", provider_id);
    
    // 使用新的多提供者系統調用 generate_ai_text
    let request = crate::commands::ai_providers::AIGenerationRequestData {
        provider_id,
        model,
        prompt: String::new(), // 空的提示，讓系統自動構建上下文續寫
        system_prompt: None,
        project_id,
        chapter_id,
        position: Some(position),
        temperature: params.temperature.map(|x| x as f64),
        max_tokens: params.max_tokens.map(|x| x as i32),
        top_p: params.top_p.map(|x| x as f64),
        presence_penalty: params.presence_penalty.map(|x| x as f64),
        frequency_penalty: params.frequency_penalty.map(|x| x as f64),
        stop: None,
    };
    
    match crate::commands::ai_providers::generate_ai_text(request).await {
        Ok(result) => {
            if result.success {
                let generated_text = result.generated_text.unwrap_or_default();
                log::info!("生成文本成功，長度: {} 字符", generated_text.len());
                Ok(generated_text)
            } else {
                let error_msg = result.error.unwrap_or("生成文本失敗".to_string());
                log::error!("生成文本失敗: {}", error_msg);
                Err(error_msg)
            }
        }
        Err(e) => {
            log::error!("調用AI提供者失敗: {}", e);
            Err(e)
        }
    }
}

/// 更新 Ollama 配置
#[command]
pub async fn update_ollama_config(config: UpdateConfigRequest) -> Result<ConfigUpdateResult, String> {
    let ollama_service = get_ollama_service();
    let mut service = ollama_service.lock().await;
    
    let update_config = UpdateConfig {
        base_url: config.base_url,
        timeout: config.timeout,
        retry_attempts: config.retry_attempts,
        retry_delay: config.retry_delay,
    };
    
    service.update_config(update_config);
    
    Ok(ConfigUpdateResult { success: true })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateConfigRequest {
    pub base_url: Option<String>,
    pub timeout: Option<u64>,
    pub retry_attempts: Option<u32>,
    pub retry_delay: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigUpdateResult {
    pub success: bool,
}