// 圖像重命名管理模組
// 支援單個和批次重命名功能，同步更新資料庫和檔案系統

use std::path::PathBuf;
use std::fs;
use tauri::{command, AppHandle};
use serde::{Serialize, Deserialize};
use crate::database::connection::create_connection;
use serde_json::Value;

// ========================= 重命名相關結構體 =========================

#[derive(Debug, Serialize, Deserialize)]
pub struct RenameRequest {
    pub id: String,
    pub new_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchRenameRequest {
    pub operations: Vec<RenameRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenameResponse {
    pub id: String,
    pub old_name: String,
    pub new_name: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchRenameResponse {
    pub results: Vec<RenameResponse>,
    pub success_count: usize,
    pub failure_count: usize,
}

// ========================= 內部輔助函數 =========================

/// 從資料庫獲取插畫信息
fn get_illustration_info(conn: &rusqlite::Connection, id: &str) -> Result<(String, String), String> {
    // 先檢查 pollinations_generations 表
    if let Ok(mut stmt) = conn.prepare(
        "SELECT original_prompt, local_file_path FROM pollinations_generations WHERE id = ?1 AND deleted_at IS NULL"
    ) {
        if let Ok(result) = stmt.query_row([id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?.unwrap_or_default(),
            ))
        }) {
            return Ok(result);
        }
    }

    // 再檢查 illustration_generations 表
    if let Ok(mut stmt) = conn.prepare(
        "SELECT original_prompt, local_file_path FROM illustration_generations WHERE id = ?1 AND deleted_at IS NULL"
    ) {
        if let Ok(result) = stmt.query_row([id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?.unwrap_or_default(),
            ))
        }) {
            return Ok(result);
        }
    }

    Err("找不到指定的插畫".to_string())
}

/// 更新資料庫中的插畫名稱
fn update_illustration_name(conn: &rusqlite::Connection, id: &str, new_name: &str) -> Result<(), String> {
    // 先嘗試更新 pollinations_generations
    if let Ok(mut stmt) = conn.prepare(
        "UPDATE pollinations_generations SET original_prompt = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"
    ) {
        if let Ok(changes) = stmt.execute([new_name, id]) {
            if changes > 0 {
                return Ok(());
            }
        }
    }

    // 再嘗試更新 illustration_generations
    if let Ok(mut stmt) = conn.prepare(
        "UPDATE illustration_generations SET original_prompt = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"
    ) {
        if let Ok(changes) = stmt.execute([new_name, id]) {
            if changes > 0 {
                return Ok(());
            }
        }
    }

    Err("未找到要更新的記錄".to_string())
}

/// 重命名檔案系統中的圖片檔案
fn rename_file_on_disk(old_path: &str, new_name: &str) -> Result<String, String> {
    let old_path_buf = PathBuf::from(old_path);
    
    // 檢查原檔案是否存在
    if !old_path_buf.exists() {
        // 如果檔案不存在，仍然允許重命名（可能檔案已被移動）
        log::warn!("原檔案不存在，但仍繼續重命名操作: {}", old_path);
        return Ok(old_path.to_string()); // 返回原路徑
    }

    // 獲取檔案擴展名
    let extension = old_path_buf.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png");

    // 構建新檔案路徑
    let parent_dir = old_path_buf.parent()
        .ok_or("無法獲取檔案目錄")?;
    
    let new_filename = format!("{}.{}", new_name, extension);
    let new_path = parent_dir.join(&new_filename);

    // 避免覆蓋現有檔案
    if new_path.exists() && new_path != old_path_buf {
        return Err(format!("目標檔案已存在: {}", new_path.display()));
    }

    // 執行重命名
    if old_path_buf != new_path {
        fs::rename(&old_path_buf, &new_path)
            .map_err(|e| format!("重命名檔案失敗: {}", e))?;
        
        log::info!("檔案重命名成功: {} -> {}", old_path, new_path.display());
    }

    Ok(new_path.to_string_lossy().to_string())
}

/// 更新資料庫中的檔案路徑
fn update_file_path(conn: &rusqlite::Connection, id: &str, new_path: &str) -> Result<(), String> {
    // 先嘗試更新 pollinations_generations
    if let Ok(mut stmt) = conn.prepare(
        "UPDATE pollinations_generations SET local_file_path = ?1 WHERE id = ?2"
    ) {
        if let Ok(changes) = stmt.execute([new_path, id]) {
            if changes > 0 {
                return Ok(());
            }
        }
    }

    // 再嘗試更新 illustration_generations
    if let Ok(mut stmt) = conn.prepare(
        "UPDATE illustration_generations SET local_file_path = ?1 WHERE id = ?2"
    ) {
        if let Ok(changes) = stmt.execute([new_path, id]) {
            if changes > 0 {
                return Ok(());
            }
        }
    }

    Ok(()) // 即使沒有更新也不報錯，因為檔案路徑可能為空
}

// ========================= 公開API函數 =========================

/// 重命名單個插畫
#[command]
pub async fn rename_illustration(
    _app: AppHandle,
    id: String,
    new_name: String,
) -> Result<Value, String> {
    log::info!("開始重命名插畫: ID={}, 新名稱={}", id, new_name);

    // 驗證輸入
    if id.trim().is_empty() {
        return Err("插畫ID不能為空".to_string());
    }
    if new_name.trim().is_empty() {
        return Err("新名稱不能為空".to_string());
    }

    // 檢查名稱長度
    if new_name.len() > 200 {
        return Err("名稱過長，請限制在200字符內".to_string());
    }

    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    // 獲取原插畫信息
    let (old_name, old_file_path) = get_illustration_info(&conn, &id)?;
    
    // 如果名稱相同，直接返回成功
    if old_name == new_name {
        return Ok(serde_json::json!({
            "success": true,
            "data": {
                "id": id,
                "old_name": old_name,
                "new_name": new_name,
                "success": true,
                "error": null
            }
        }));
    }

    // 重命名檔案（如果有檔案路徑）
    let new_file_path = if !old_file_path.is_empty() {
        match rename_file_on_disk(&old_file_path, &new_name) {
            Ok(path) => path,
            Err(e) => {
                log::error!("重命名檔案失敗: {}", e);
                // 檔案重命名失敗，但仍可以更新資料庫中的名稱
                old_file_path.clone()
            }
        }
    } else {
        old_file_path.clone()
    };

    // 更新資料庫名稱
    update_illustration_name(&conn, &id, &new_name)?;
    
    // 如果檔案路徑有變化，更新檔案路徑
    if new_file_path != old_file_path {
        update_file_path(&conn, &id, &new_file_path)?;
    }

    log::info!("插畫重命名完成: {} -> {}", old_name, new_name);

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "id": id,
            "old_name": old_name,
            "new_name": new_name,
            "success": true,
            "error": null
        }
    }))
}

/// 批次重命名插畫
#[command]
pub async fn batch_rename_illustrations(
    app: AppHandle,
    request: BatchRenameRequest,
) -> Result<Value, String> {
    log::info!("開始批次重命名，操作數量: {}", request.operations.len());

    if request.operations.is_empty() {
        return Err("批次操作列表不能為空".to_string());
    }

    if request.operations.len() > 100 {
        return Err("單次批次操作不能超過100個項目".to_string());
    }

    let mut results = Vec::new();
    let mut success_count = 0;
    let mut failure_count = 0;

    for operation in request.operations {
        match rename_illustration(app.clone(), operation.id.clone(), operation.new_name.clone()).await {
            Ok(response) => {
                if let Some(data) = response.get("data") {
                    results.push(serde_json::json!({
                        "id": operation.id,
                        "old_name": data.get("old_name").unwrap_or(&serde_json::Value::String("".to_string())),
                        "new_name": data.get("new_name").unwrap_or(&serde_json::Value::String(operation.new_name.clone())),
                        "success": true,
                        "error": null
                    }));
                    success_count += 1;
                } else {
                    failure_count += 1;
                }
            }
            Err(error) => {
                results.push(serde_json::json!({
                    "id": operation.id,
                    "old_name": "",
                    "new_name": operation.new_name,
                    "success": false,
                    "error": error
                }));
                failure_count += 1;
            }
        }
    }

    log::info!("批次重命名完成: 成功{}, 失敗{}", success_count, failure_count);

    Ok(serde_json::json!({
        "success": true,
        "data": {
            "results": results,
            "success_count": success_count,
            "failure_count": failure_count
        }
    }))
}