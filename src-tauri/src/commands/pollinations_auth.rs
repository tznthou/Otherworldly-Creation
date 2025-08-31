/// Pollinations API Token 管理命令
/// 
/// 提供用戶管理 Pollinations.ai API tokens 的功能
/// 支援 Seed、Flower、Nectar 等不同層級的認證

use anyhow::Result;
use serde_json::Value;
use crate::database::connection::create_connection;
use rusqlite::{params, Connection, OptionalExtension};

/// API Token 資訊結構
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PollinationsTokenInfo {
    pub id: i64,
    pub user_name: String,
    pub api_token: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
    pub token_tier: String,
}

/// 儲存 Pollinations API token
#[tauri::command]
pub async fn save_pollinations_token(
    token: String,
    user_name: Option<String>,
    token_tier: Option<String>,
) -> Result<String, String> {
    log::info!("[PollinationsAuth] 儲存 API token");
    
    let conn = create_connection()
        .map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    let user_name = user_name.unwrap_or_else(|| "default".to_string());
    let token_tier = token_tier.unwrap_or_else(|| "seed".to_string());
    
    // 先停用所有現有的tokens（確保只有一個活躍token）
    conn.execute(
        "UPDATE pollinations_tokens SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP",
        [],
    ).map_err(|e| format!("停用現有tokens失敗: {:?}", e))?;
    
    // 插入新的token，或更新現有的
    conn.execute(
        "INSERT OR REPLACE INTO pollinations_tokens 
         (user_name, api_token, token_tier, is_active, updated_at) 
         VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)",
        params![user_name, token, token_tier],
    ).map_err(|e| format!("儲存token失敗: {:?}", e))?;
    
    log::info!("[PollinationsAuth] API token 已儲存，層級: {}", token_tier);
    Ok(format!("API token 已成功儲存，層級: {}", token_tier))
}

/// 獲取當前活躍的 Pollinations API token
#[tauri::command]
pub async fn get_pollinations_token() -> Result<Option<String>, String> {
    log::info!("[PollinationsAuth] 獲取當前活躍的 API token");
    
    let conn = create_connection()
        .map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    let token = get_active_token(&conn)?;
    
    match &token {
        Some(t) => log::info!("[PollinationsAuth] 找到活躍token，長度: {}", t.len()),
        None => log::info!("[PollinationsAuth] 未找到活躍token"),
    }
    
    Ok(token)
}

/// 獲取 Pollinations API token 資訊
#[tauri::command]
pub async fn get_pollinations_token_info() -> Result<Option<Value>, String> {
    log::info!("[PollinationsAuth] 獲取 API token 詳細資訊");
    
    let conn = create_connection()
        .map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, user_name, api_token, created_at, updated_at, is_active, token_tier
         FROM pollinations_tokens 
         WHERE is_active = TRUE 
         ORDER BY updated_at DESC 
         LIMIT 1"
    ).map_err(|e| format!("準備查詢失敗: {:?}", e))?;
    
    let token_info = stmt.query_row([], |row| {
        Ok(PollinationsTokenInfo {
            id: row.get(0)?,
            user_name: row.get(1)?,
            api_token: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            is_active: row.get(5)?,
            token_tier: row.get(6)?,
        })
    }).optional()
    .map_err(|e| format!("查詢token資訊失敗: {:?}", e))?;
    
    if let Some(info) = token_info {
        let result = serde_json::to_value(&info)
            .map_err(|e| format!("序列化失敗: {:?}", e))?;
        Ok(Some(result))
    } else {
        Ok(None)
    }
}

/// 移除 Pollinations API token
#[tauri::command]
pub async fn remove_pollinations_token() -> Result<String, String> {
    log::info!("[PollinationsAuth] 移除 API token");
    
    let conn = create_connection()
        .map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    let affected_rows = conn.execute(
        "UPDATE pollinations_tokens SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP",
        [],
    ).map_err(|e| format!("移除token失敗: {:?}", e))?;
    
    if affected_rows > 0 {
        log::info!("[PollinationsAuth] 已停用 {} 個token", affected_rows);
        Ok("API token 已成功移除".to_string())
    } else {
        Ok("未找到活躍的 API token".to_string())
    }
}

/// 測試 Pollinations API token 有效性
#[tauri::command]
pub async fn test_pollinations_token(token: String) -> Result<Value, String> {
    log::info!("[PollinationsAuth] 測試 API token 有效性");
    
    use crate::services::illustration::pollinations_api::PollinationsApiService;
    use crate::services::illustration::pollinations_api::PollinationsRequest;
    
    // 使用提供的token創建服務實例
    let service = PollinationsApiService::with_token(token)
        .map_err(|e| format!("建立API服務失敗: {:?}", e))?;
    
    // 創建一個簡單的測試請求
    let test_request = PollinationsRequest {
        prompt: "test".to_string(),
        width: Some(256),
        height: Some(256),
        model: Some(crate::services::illustration::pollinations_api::PollinationsModel::GptImage),
        seed: Some(42),
        enhance: Some(false),
        transparent: Some(false),
        negative_prompt: None,
        nologo: Some(true),
        reference_image: None,
    };
    
    match service.generate_image(test_request).await {
        Ok(_) => {
            log::info!("[PollinationsAuth] Token 測試成功");
            let result = serde_json::json!({
                "valid": true,
                "message": "API token 有效，可以正常生成圖像",
                "tier_access": "已驗證可存取高級模型"
            });
            Ok(result)
        }
        Err(e) => {
            let error_msg = format!("{:?}", e);
            log::warn!("[PollinationsAuth] Token 測試失敗: {}", error_msg);
            
            // 分析錯誤類型
            let (valid, message, tier_access) = if error_msg.contains("401") || error_msg.contains("Unauthorized") {
                (false, "API token 無效或已過期", "無存取權限")
            } else if error_msg.contains("403") || error_msg.contains("Forbidden") {
                (false, "API token 有效但權限不足", "存取權限受限")
            } else if error_msg.contains("429") || error_msg.contains("Too Many Requests") {
                (true, "API token 有效但已達到速率限制", "需要等待或升級層級")
            } else {
                (true, "API token 可能有效，但遇到其他問題", "請檢查網路連接")
            };
            
            let result = serde_json::json!({
                "valid": valid,
                "message": message,
                "tier_access": tier_access,
                "error_details": error_msg
            });
            Ok(result)
        }
    }
}

/// 內部輔助函數：從資料庫獲取活躍的token
pub fn get_active_token(conn: &Connection) -> Result<Option<String>, String> {
    let mut stmt = conn.prepare(
        "SELECT api_token FROM pollinations_tokens WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1"
    ).map_err(|e| format!("準備查詢失敗: {:?}", e))?;
    
    let token = stmt.query_row([], |row| {
        Ok(row.get::<_, String>(0)?)
    }).optional()
    .map_err(|e| format!("查詢活躍token失敗: {:?}", e))?;
    
    Ok(token)
}

/// 內部輔助函數：從資料庫獲取活躍的token（異步版本）
pub async fn get_active_pollinations_token() -> Result<Option<String>, String> {
    let conn = create_connection()
        .map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    get_active_token(&conn)
}