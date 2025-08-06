use crate::database::{connection::create_connection, models::*};
use crate::services::ai_providers::{AIProvider as AIProviderTrait, AIProviderFactory, ProviderConfig};
use anyhow::{Result, anyhow};
use chrono::Utc;
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// 響應結構體
#[derive(Debug, Serialize)]
pub struct AIProviderResponse {
    pub success: bool,
    pub data: Option<crate::database::models::AIProvider>,
    pub providers: Option<Vec<crate::database::models::AIProvider>>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AIProviderTestResult {
    pub success: bool,
    pub provider_type: String,
    pub models: Option<Vec<serde_json::Value>>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AIGenerationResult {
    pub success: bool,
    pub generated_text: Option<String>,
    pub model: Option<String>,
    pub usage: Option<serde_json::Value>,
    pub provider_id: Option<String>,
    pub error: Option<String>,
}

// 請求結構體
#[derive(Debug, Deserialize)]
pub struct AIGenerationRequestData {
    pub provider_id: String,
    pub model: String,
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub project_id: String,
    pub chapter_id: String,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i32>,
    pub top_p: Option<f64>,
    pub presence_penalty: Option<f64>,
    pub frequency_penalty: Option<f64>,
    pub stop: Option<Vec<String>>,
}

// 加密工具函數
fn encrypt_api_key(api_key: &str) -> Result<String> {
    // 簡單的base64編碼，實際應用中應使用更強的加密
    use base64::{Engine as _, engine::general_purpose};
    Ok(general_purpose::STANDARD.encode(api_key))
}

fn decrypt_api_key(encrypted_key: &str) -> Result<String> {
    // 對應的解碼
    use base64::{Engine as _, engine::general_purpose};
    general_purpose::STANDARD.decode(encrypted_key)
        .map_err(|e| anyhow!("解密API金鑰失敗: {}", e))
        .and_then(|bytes| String::from_utf8(bytes).map_err(|e| anyhow!("轉換字符串失敗: {}", e)))
}

// 從數據庫行構建AIProvider
fn build_ai_provider_from_row(row: &Row) -> rusqlite::Result<crate::database::models::AIProvider> {
    Ok(crate::database::models::AIProvider {
        id: row.get("id")?,
        name: row.get("name")?,
        provider_type: row.get("provider_type")?,
        api_key_encrypted: row.get("api_key_encrypted")?,
        endpoint: row.get("endpoint")?,
        model: row.get("model")?,
        is_enabled: row.get("is_enabled")?,
        settings_json: row.get("settings_json")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

// 從AIProvider模型轉換為ProviderConfig
fn provider_to_config(provider: &crate::database::models::AIProvider) -> Result<ProviderConfig> {
    let api_key = if let Some(encrypted) = &provider.api_key_encrypted {
        Some(decrypt_api_key(encrypted)?)
    } else {
        None
    };

    let settings: HashMap<String, serde_json::Value> = if let Some(settings_json) = &provider.settings_json {
        serde_json::from_str(settings_json).unwrap_or_default()
    } else {
        HashMap::new()
    };

    Ok(ProviderConfig {
        id: provider.id.clone(),
        name: provider.name.clone(),
        provider_type: provider.provider_type.clone(),
        api_key,
        endpoint: provider.endpoint.clone(),
        model: provider.model.clone(),
        is_enabled: provider.is_enabled,
        settings,
    })
}

/// 獲取所有AI提供者
#[tauri::command]
pub async fn get_ai_providers() -> Result<AIProviderResponse, String> {
    log::info!("獲取所有AI提供者");
    
    let conn = create_connection().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, provider_type, api_key_encrypted, endpoint, model, 
         is_enabled, settings_json, created_at, updated_at 
         FROM ai_providers ORDER BY created_at"
    ).map_err(|e| e.to_string())?;
    
    let provider_iter = stmt.query_map([], build_ai_provider_from_row)
        .map_err(|e| e.to_string())?;
    
    let mut providers = Vec::new();
    for provider in provider_iter {
        providers.push(provider.map_err(|e| e.to_string())?);
    }
    
    Ok(AIProviderResponse {
        success: true,
        data: None,
        providers: Some(providers),
        error: None,
    })
}

/// 創建新的AI提供者
#[tauri::command]
pub async fn create_ai_provider(request: CreateAIProviderRequest) -> Result<AIProviderResponse, String> {
    log::info!("創建AI提供者: {}", request.name);
    
    let conn = create_connection().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    // 加密API金鑰（如果有）
    let encrypted_api_key = if let Some(api_key) = &request.api_key {
        Some(encrypt_api_key(api_key).map_err(|e| e.to_string())?)
    } else {
        None
    };
    
    conn.execute(
        "INSERT INTO ai_providers (
            id, name, provider_type, api_key_encrypted, endpoint, model, 
            is_enabled, settings_json, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            request.name,
            request.provider_type,
            encrypted_api_key,
            request.endpoint,
            request.model,
            request.is_enabled.unwrap_or(true),
            request.settings_json,
            now,
            now
        ],
    ).map_err(|e| e.to_string())?;
    
    // 返回創建的提供者
    let provider = crate::database::models::AIProvider {
        id: id.clone(),
        name: request.name,
        provider_type: request.provider_type,
        api_key_encrypted: encrypted_api_key,
        endpoint: request.endpoint,
        model: request.model,
        is_enabled: request.is_enabled.unwrap_or(true),
        settings_json: request.settings_json,
        created_at: now,
        updated_at: now,
    };
    
    Ok(AIProviderResponse {
        success: true,
        data: Some(provider),
        providers: None,
        error: None,
    })
}

/// 更新AI提供者
#[tauri::command]
pub async fn update_ai_provider(request: UpdateAIProviderRequest) -> Result<AIProviderResponse, String> {
    log::info!("更新AI提供者: {}", request.id);
    
    let conn = create_connection().map_err(|e| e.to_string())?;
    let now = Utc::now();
    
    // 構建動態SQL更新語句
    let mut sql_parts = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(name) = &request.name {
        sql_parts.push("name = ?");
        params.push(Box::new(name.clone()));
    }
    
    if let Some(api_key) = &request.api_key {
        let encrypted = encrypt_api_key(api_key).map_err(|e| e.to_string())?;
        sql_parts.push("api_key_encrypted = ?");
        params.push(Box::new(encrypted));
    }
    
    if let Some(endpoint) = &request.endpoint {
        sql_parts.push("endpoint = ?");
        params.push(Box::new(endpoint.clone()));
    }
    
    if let Some(model) = &request.model {
        sql_parts.push("model = ?");
        params.push(Box::new(model.clone()));
    }
    
    if let Some(is_enabled) = request.is_enabled {
        sql_parts.push("is_enabled = ?");
        params.push(Box::new(is_enabled));
    }
    
    if let Some(settings_json) = &request.settings_json {
        sql_parts.push("settings_json = ?");
        params.push(Box::new(settings_json.clone()));
    }
    
    sql_parts.push("updated_at = ?");
    params.push(Box::new(now));
    params.push(Box::new(request.id.clone()));
    
    let sql = format!(
        "UPDATE ai_providers SET {} WHERE id = ?",
        sql_parts.join(", ")
    );
    
    conn.execute(&sql, rusqlite::params_from_iter(params.iter()))
        .map_err(|e| e.to_string())?;
    
    Ok(AIProviderResponse {
        success: true,
        data: None,
        providers: None,
        error: None,
    })
}

/// 刪除AI提供者
#[tauri::command]
pub async fn delete_ai_provider(id: String) -> Result<AIProviderResponse, String> {
    log::info!("刪除AI提供者: {}", id);
    
    let conn = create_connection().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM ai_providers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    
    Ok(AIProviderResponse {
        success: true,
        data: None,
        providers: None,
        error: None,
    })
}

/// 測試AI提供者連接
#[tauri::command]
pub async fn test_ai_provider(id: String) -> Result<AIProviderTestResult, String> {
    log::info!("測試AI提供者: {}", id);
    
    // 先從數據庫獲取提供者資訊，然後關閉連接
    let (config, provider_type) = {
        let conn = create_connection().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(
            "SELECT id, name, provider_type, api_key_encrypted, endpoint, model, 
             is_enabled, settings_json, created_at, updated_at 
             FROM ai_providers WHERE id = ?1"
        ).map_err(|e| e.to_string())?;
        
        let provider = stmt.query_row(params![id], build_ai_provider_from_row)
            .map_err(|e| e.to_string())?;
        
        let config = provider_to_config(&provider).map_err(|e| e.to_string())?;
        (config, provider.provider_type)
    };
    
    // 創建提供者實例並測試
    match AIProviderFactory::create_provider(&config) {
        Ok(provider_instance) => {
            match provider_instance.check_availability().await {
                Ok(true) => {
                    // 嘗試獲取模型列表
                    let models = provider_instance.get_models().await
                        .map(|models| {
                            models.into_iter()
                                .map(|model| serde_json::json!({
                                    "id": model.id,
                                    "name": model.name,
                                    "description": model.description,
                                    "max_tokens": model.max_tokens,
                                    "supports_streaming": model.supports_streaming,
                                    "cost_per_token": model.cost_per_token,
                                }))
                                .collect::<Vec<_>>()
                        })
                        .ok();
                    
                    Ok(AIProviderTestResult {
                        success: true,
                        provider_type: provider_type.clone(),
                        models,
                        error: None,
                    })
                }
                Ok(false) => {
                    Ok(AIProviderTestResult {
                        success: false,
                        provider_type: provider_type.clone(),
                        models: None,
                        error: Some("服務不可用".to_string()),
                    })
                }
                Err(e) => {
                    Ok(AIProviderTestResult {
                        success: false,
                        provider_type: provider_type.clone(),
                        models: None,
                        error: Some(e.to_string()),
                    })
                }
            }
        }
        Err(e) => {
            Ok(AIProviderTestResult {
                success: false,
                provider_type: provider_type,
                models: None,
                error: Some(format!("創建提供者實例失敗: {}", e)),
            })
        }
    }
}

/// 使用指定提供者生成文本
#[tauri::command]
pub async fn generate_ai_text(request: AIGenerationRequestData) -> Result<AIGenerationResult, String> {
    log::info!("使用AI提供者生成文本: {} -> {}", request.provider_id, request.model);
    
    let start_time = std::time::Instant::now();
    
    // 先從數據庫獲取提供者資訊，然後關閉連接
    let config = {
        let conn = create_connection().map_err(|e| e.to_string())?;
        
        let mut stmt = conn.prepare(
            "SELECT id, name, provider_type, api_key_encrypted, endpoint, model, 
             is_enabled, settings_json, created_at, updated_at 
             FROM ai_providers WHERE id = ?1 AND is_enabled = 1"
        ).map_err(|e| e.to_string())?;
        
        let provider = stmt.query_row(params![request.provider_id], build_ai_provider_from_row)
            .map_err(|e| format!("找不到或未啟用的AI提供者: {}", e))?;
        
        provider_to_config(&provider).map_err(|e| e.to_string())?
    };
    
    // 創建提供者實例
    let provider_instance = AIProviderFactory::create_provider(&config)
        .map_err(|e| format!("創建提供者實例失敗: {}", e))?;
    
    // 構建生成請求
    let generation_request = crate::services::ai_providers::AIGenerationRequest {
        model: request.model.clone(),
        prompt: request.prompt.clone(),
        system_prompt: request.system_prompt.clone(),
        params: crate::services::ai_providers::AIGenerationParams {
            temperature: request.temperature.unwrap_or(0.7),
            max_tokens: request.max_tokens.unwrap_or(2000),
            top_p: request.top_p,
            presence_penalty: request.presence_penalty,
            frequency_penalty: request.frequency_penalty,
            stop: request.stop.clone(),
        },
    };
    
    // 生成文本
    match provider_instance.generate_text(generation_request).await {
        Ok(response) => {
            let generation_time_ms = start_time.elapsed().as_millis() as i32;
            
            // 將結果保存到歷史記錄（可選）
            // TODO: 實現歷史記錄保存
            
            Ok(AIGenerationResult {
                success: true,
                generated_text: Some(response.text),
                model: Some(response.model),
                usage: response.usage.map(|usage| serde_json::json!({
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "total_tokens": usage.total_tokens,
                })),
                provider_id: Some(request.provider_id),
                error: None,
            })
        }
        Err(e) => {
            Ok(AIGenerationResult {
                success: false,
                generated_text: None,
                model: None,
                usage: None,
                provider_id: Some(request.provider_id),
                error: Some(e.to_string()),
            })
        }
    }
}

/// 獲取支援的AI提供者類型
#[tauri::command]
pub async fn get_supported_ai_provider_types() -> Result<Vec<String>, String> {
    Ok(AIProviderFactory::supported_providers().iter().map(|s| s.to_string()).collect())
}