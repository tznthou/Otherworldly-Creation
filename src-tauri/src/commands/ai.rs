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

/// 使用分離上下文生成文本（Chat API 優化版）
#[command]
pub async fn generate_with_separated_context(
    project_id: String,
    chapter_id: String,
    position: usize,
    model: String,
    params: GenerateParams,
    language: Option<String>,
) -> Result<String, String> {
    log::info!("=== 開始使用分離上下文生成文本（Chat API 優化版）===");
    log::info!("專案: {}, 章節: {}, 位置: {}, 模型: {}, 語言: {:?}", project_id, chapter_id, position, model, language);
    
    let lang = language.unwrap_or_else(|| "zh-TW".to_string());
    
    // 1. 構建分離的上下文
    let (system_prompt, user_context) = crate::commands::context::build_separated_context(
        project_id.clone(), chapter_id.clone(), position, lang
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
    
    let lang = language.unwrap_or_else(|| "zh-TW".to_string());
    
    // 1. 構建上下文
    let context = crate::commands::context::build_context(project_id, chapter_id, position, lang)
        .await
        .map_err(|e| format!("構建上下文失敗: {}", e))?;
    
    log::info!("上下文長度: {} 字符", context.len());
    
    // 2. 如果設定了最大上下文 token，進行壓縮
    let final_context = if let Some(max_context_tokens) = params.max_context_tokens {
        crate::commands::context::compress_context(context, max_context_tokens as usize)
            .await
            .map_err(|e| format!("壓縮上下文失敗: {}", e))?
    } else {
        context
    };
    
    log::info!("最終上下文長度: {} 字符", final_context.len());
    
    // 3. 使用上下文生成文本
    let options = OllamaOptions {
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
        presence_penalty: params.presence_penalty,
        frequency_penalty: params.frequency_penalty,
    };
    
    let ollama_service = get_ollama_service();
    let service = ollama_service.lock().await;
    let result = service.generate_text(&model, &final_context, Some(options)).await;
    
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