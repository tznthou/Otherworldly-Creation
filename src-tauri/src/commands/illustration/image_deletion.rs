use serde_json::Value;
use crate::database::connection::create_connection;

/// 刪除插畫（支援軟刪除和永久刪除）
#[tauri::command]
#[allow(non_snake_case)] // Tauri 需要駝峰式參數名
pub async fn delete_illustrations(
    imageIds: Vec<String>,        // 改為駝峰式，匹配其他函數
    deleteType: String,           // 改為駝峰式
    preserveMetadata: Option<bool>, // 改為駝峰式
    reason: Option<String>,
) -> Result<Value, String> {
    log::info!("[ImageDeletion] 刪除插畫: {} 張，類型: {}", imageIds.len(), deleteType);
    
    let preserve_metadata = preserveMetadata.unwrap_or(true);
    let mut deleted_count = 0;
    let mut failed_count = 0;
    let mut deleted_image_ids = Vec::new();
    let mut failed_image_ids = Vec::new();
    let mut errors = Vec::new();
    
    // 建立資料庫連接
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    // 準備垃圾桶目錄（僅軟刪除需要）
    let deleted_images_dir = if deleteType == "soft" {
        let dir = get_deleted_images_dir()
            .map_err(|e| format!("建立垃圾桶目錄失敗: {}", e))?;
        Some(dir)
    } else {
        None
    };
    
    for image_id in imageIds.iter() {
        match process_single_image_deletion(
            &conn,
            image_id,
            &deleteType,
            preserve_metadata,
            reason.as_deref(),
            deleted_images_dir.as_deref(),
        ) {
            Ok(_) => {
                deleted_count += 1;
                deleted_image_ids.push(image_id.clone());
                log::info!("[ImageDeletion] 成功{}圖片: {}", 
                    if deleteType == "soft" { "軟刪除" } else { "永久刪除" }, image_id);
            }
            Err(e) => {
                failed_count += 1;
                failed_image_ids.push(image_id.clone());
                errors.push(format!("圖片 {}: {}", image_id, e));
                log::error!("[ImageDeletion] 刪除圖片失敗 {}: {}", image_id, e);
            }
        }
    }
    
    let deleted_to_path = if deleteType == "soft" {
        deleted_images_dir.map(|p| p.to_string_lossy().to_string())
    } else {
        None
    };
    
    Ok(serde_json::json!({
        "success": true,
        "deletedCount": deleted_count,
        "failedCount": failed_count,
        "totalRequested": imageIds.len(),
        "deletedImageIds": deleted_image_ids,
        "failedImageIds": failed_image_ids,
        "errors": if errors.is_empty() { None } else { Some(errors) },
        "deletedToPath": deleted_to_path,
        "message": format!("成功{} {} 張圖片{}",
            if deleteType == "soft" { "移至垃圾桶" } else { "永久刪除" },
            deleted_count,
            if failed_count > 0 { format!("，{} 張失敗", failed_count) } else { String::new() }
        )
    }))
}

/// 恢復軟刪除的插畫
#[tauri::command]
#[allow(non_snake_case)] // Tauri 需要駝峰式參數名
pub async fn restore_illustrations(
    imageIds: Vec<String>
) -> Result<Value, String> {
    log::info!("[ImageDeletion] 恢復軟刪除插畫: {} 張", imageIds.len());
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let mut restored_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();
    
    for image_id in imageIds.iter() {
        match restore_single_image(&conn, image_id) {
            Ok(_) => {
                restored_count += 1;
                log::info!("[ImageDeletion] 成功恢復圖片: {}", image_id);
            }
            Err(e) => {
                failed_count += 1;
                errors.push(format!("圖片 {}: {}", image_id, e));
                log::error!("[ImageDeletion] 恢復圖片失敗 {}: {}", image_id, e);
            }
        }
    }
    
    Ok(serde_json::json!({
        "success": true,
        "deletedCount": restored_count,
        "failedCount": failed_count,
        "totalRequested": imageIds.len(),
        "deletedImageIds": imageIds.iter().take(restored_count).cloned().collect::<Vec<_>>(),
        "failedImageIds": imageIds.iter().skip(restored_count).cloned().collect::<Vec<_>>(),
        "errors": if errors.is_empty() { None } else { Some(errors) },
        "message": format!("成功恢復 {} 張圖片{}", 
            restored_count,
            if failed_count > 0 { format!("，{} 張失敗", failed_count) } else { String::new() }
        )
    }))
}

/// 獲取已軟刪除的插畫列表
#[tauri::command]
pub async fn get_deleted_illustrations(
    project_id: String
) -> Result<Value, String> {
    log::info!("[ImageDeletion] 獲取專案 {} 的已刪除插畫", project_id);
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    // 查詢軟刪除的圖片
    let mut stmt = conn.prepare(
        "SELECT id, project_id, character_id, original_prompt, optimized_prompt, 
                model, width, height, seed, provider, image_url, local_file_path,
                file_size_bytes, generation_time_ms, created_at, deleted_at, 
                deleted_reason, original_file_path, deleted_file_path
         FROM (
           SELECT id, project_id, character_id, original_prompt, '' as optimized_prompt,
                  model, width, height, seed, 'pollinations' as provider, 
                  image_url, local_file_path, file_size_bytes, generation_time_ms,
                  created_at, deleted_at, deleted_reason, 
                  local_file_path as original_file_path, deleted_file_path
           FROM pollinations_generations 
           WHERE project_id = ?1 AND deleted_at IS NOT NULL AND is_permanently_deleted = 0
           UNION ALL
           SELECT id, project_id, character_id, original_prompt, optimized_prompt,
                  model, width, height, seed, 'imagen' as provider,
                  image_url, local_file_path, file_size_bytes, generation_time_ms,
                  created_at, deleted_at, deleted_reason,
                  local_file_path as original_file_path, deleted_file_path
           FROM illustration_generations
           WHERE project_id = ?1 AND deleted_at IS NOT NULL AND is_permanently_deleted = 0
         ) 
         ORDER BY deleted_at DESC"
    ).map_err(|e| format!("準備查詢失敗: {}", e))?;
    
    let rows = stmt.query_map([&project_id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>("id")?,
            "project_id": row.get::<_, Option<String>>("project_id")?,
            "character_id": row.get::<_, Option<String>>("character_id")?,
            "original_prompt": row.get::<_, String>("original_prompt")?,
            "optimized_prompt": row.get::<_, String>("optimized_prompt")?,
            "model": row.get::<_, String>("model")?,
            "width": row.get::<_, i32>("width")?,
            "height": row.get::<_, i32>("height")?,
            "seed": row.get::<_, Option<i32>>("seed")?,
            "provider": row.get::<_, String>("provider")?,
            "image_url": row.get::<_, Option<String>>("image_url")?,
            "local_file_path": row.get::<_, Option<String>>("local_file_path")?,
            "file_size_bytes": row.get::<_, Option<i64>>("file_size_bytes")?,
            "generation_time_ms": row.get::<_, Option<i32>>("generation_time_ms")?,
            "created_at": row.get::<_, String>("created_at")?,
            "deleted_at": row.get::<_, String>("deleted_at")?,
            "deleted_reason": row.get::<_, Option<String>>("deleted_reason")?,
            "original_file_path": row.get::<_, Option<String>>("original_file_path")?,
            "deleted_file_path": row.get::<_, Option<String>>("deleted_file_path")?,
            "can_restore": true
        }))
    }).map_err(|e| format!("查詢執行失敗: {}", e))?;
    
    let deleted_images: Result<Vec<_>, _> = rows.collect();
    let deleted_images = deleted_images.map_err(|e| format!("處理查詢結果失敗: {}", e))?;
    
    Ok(serde_json::json!(deleted_images))
}

/// 永久刪除插畫（直接刪除，不可恢復）
#[tauri::command]
#[allow(non_snake_case)] // Tauri 需要駝峰式參數名
pub async fn permanent_delete_illustrations(
    imageIds: Vec<String>
) -> Result<Value, String> {
    log::info!("[ImageDeletion] 永久刪除插畫: {} 張", imageIds.len());
    
    // 直接調用 delete_illustrations 並指定永久刪除
    delete_illustrations(imageIds, "permanent".to_string(), Some(false), Some("永久清理".to_string())).await
}

// ========================= 刪除功能輔助函數 =========================

/// 獲取垃圾桶目錄
pub fn get_deleted_images_dir() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let deleted_dir = dirs::data_local_dir()
        .ok_or("無法獲取應用資料目錄")?
        .join("genesis-chronicle")
        .join("deleted-images");
    
    std::fs::create_dir_all(&deleted_dir)?;
    Ok(deleted_dir)
}

/// 處理單個圖片的刪除操作
#[allow(non_snake_case)] // 保持與調用函數的參數名一致
pub fn process_single_image_deletion(
    conn: &rusqlite::Connection,
    image_id: &str,
    deleteType: &str,
    preserve_metadata: bool,
    reason: Option<&str>,
    deleted_images_dir: Option<&std::path::Path>,
) -> Result<(), String> {
    use std::fs;
    
    // 首先查詢圖片信息（檢查 pollinations_generations 和 illustration_history）
    let image_info = get_image_info(conn, image_id)?;
    
    if deleteType == "soft" {
        // 軟刪除：移動檔案到垃圾桶並更新資料庫標記
        if let Some(file_path) = &image_info.local_file_path {
            if let Some(deleted_dir) = deleted_images_dir {
                let file_name = std::path::Path::new(file_path)
                    .file_name()
                    .ok_or("無效的檔案路徑")?;
                
                let deleted_file_path = deleted_dir.join(file_name);
                
                // 移動檔案到垃圾桶
                if std::path::Path::new(file_path).exists() {
                    fs::copy(file_path, &deleted_file_path)
                        .map_err(|e| format!("複製檔案到垃圾桶失敗: {}", e))?;
                    fs::remove_file(file_path)
                        .map_err(|e| format!("移除原檔案失敗: {}", e))?;
                }
                
                // 更新資料庫標記為軟刪除
                update_image_soft_delete_status(
                    conn,
                    image_id,
                    &image_info.table_name,
                    Some(&deleted_file_path.to_string_lossy()),
                    preserve_metadata,
                    reason,
                )?;
            } else {
                return Err("軟刪除需要垃圾桶目錄".to_string());
            }
        } else {
            // 沒有本地檔案，只更新資料庫狀態
            update_image_soft_delete_status(
                conn,
                image_id,
                &image_info.table_name,
                None,
                preserve_metadata,
                reason,
            )?;
        }
    } else {
        // 永久刪除：直接刪除檔案和資料庫記錄
        if let Some(file_path) = &image_info.local_file_path {
            if std::path::Path::new(file_path).exists() {
                fs::remove_file(file_path)
                    .map_err(|e| format!("刪除檔案失敗: {}", e))?;
            }
        }
        
        // 從資料庫永久刪除記錄
        if preserve_metadata {
            // 保留元數據，僅標記為永久刪除
            update_image_permanent_delete_status(conn, image_id, &image_info.table_name, reason)?;
        } else {
            // 完全刪除記錄
            delete_image_record_completely(conn, image_id, &image_info.table_name)?;
        }
    }
    
    Ok(())
}

/// 獲取圖片資訊
pub fn get_image_info(conn: &rusqlite::Connection, image_id: &str) -> Result<ImageInfo, String> {
    use rusqlite::params;
    
    // 先檢查 pollinations_generations
    if let Ok(mut stmt) = conn.prepare(
        "SELECT local_file_path FROM pollinations_generations WHERE id = ?1"
    ) {
        if let Ok(row) = stmt.query_row(params![image_id], |row| {
            Ok(ImageInfo {
                local_file_path: row.get::<_, Option<String>>("local_file_path")?,
                table_name: "pollinations_generations".to_string(),
            })
        }) {
            return Ok(row);
        }
    }
    
    // 再檢查 illustration_generations
    if let Ok(mut stmt) = conn.prepare(
        "SELECT local_file_path FROM illustration_generations WHERE id = ?1"
    ) {
        if let Ok(row) = stmt.query_row(params![image_id], |row| {
            Ok(ImageInfo {
                local_file_path: row.get::<_, Option<String>>("local_file_path")?,
                table_name: "illustration_generations".to_string(),
            })
        }) {
            return Ok(row);
        }
    }
    
    Err(format!("找不到圖片 ID: {}", image_id))
}

/// 更新圖片軟刪除狀態
pub fn update_image_soft_delete_status(
    conn: &rusqlite::Connection,
    image_id: &str,
    table_name: &str,
    deleted_file_path: Option<&str>,
    _preserve_metadata: bool,
    reason: Option<&str>,
) -> Result<(), String> {
    use rusqlite::params;
    
    let sql = format!(
        "UPDATE {} SET deleted_at = CURRENT_TIMESTAMP, deleted_reason = ?2, 
         deleted_file_path = ?3, is_permanently_deleted = 0 WHERE id = ?1",
        table_name
    );
    
    conn.execute(
        &sql,
        params![image_id, reason, deleted_file_path],
    ).map_err(|e| format!("更新軟刪除狀態失敗: {}", e))?;
    
    Ok(())
}

/// 更新圖片永久刪除狀態
pub fn update_image_permanent_delete_status(
    conn: &rusqlite::Connection,
    image_id: &str,
    table_name: &str,
    reason: Option<&str>,
) -> Result<(), String> {
    use rusqlite::params;
    
    let sql = format!(
        "UPDATE {} SET deleted_at = CURRENT_TIMESTAMP, deleted_reason = ?2, 
         is_permanently_deleted = 1, local_file_path = NULL, deleted_file_path = NULL 
         WHERE id = ?1",
        table_name
    );
    
    conn.execute(&sql, params![image_id, reason])
        .map_err(|e| format!("更新永久刪除狀態失敗: {}", e))?;
    
    Ok(())
}

/// 完全刪除圖片記錄
pub fn delete_image_record_completely(
    conn: &rusqlite::Connection,
    image_id: &str,
    table_name: &str,
) -> Result<(), String> {
    use rusqlite::params;
    
    let sql = format!("DELETE FROM {} WHERE id = ?1", table_name);
    
    conn.execute(&sql, params![image_id])
        .map_err(|e| format!("刪除圖片記錄失敗: {}", e))?;
    
    Ok(())
}

/// 恢復單個圖片
pub fn restore_single_image(
    conn: &rusqlite::Connection,
    image_id: &str,
) -> Result<(), String> {
    use rusqlite::params;
    use std::fs;
    
    // 獲取軟刪除的圖片信息
    let image_info = get_soft_deleted_image_info(conn, image_id)?;
    
    // 如果有垃圾桶中的檔案，移回原位置
    if let (Some(deleted_path), Some(original_path)) = (&image_info.deleted_file_path, &image_info.original_file_path) {
        if std::path::Path::new(deleted_path).exists() {
            // 確保目標目錄存在
            if let Some(parent) = std::path::Path::new(original_path).parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("建立目標目錄失敗: {}", e))?;
            }
            
            fs::copy(deleted_path, original_path)
                .map_err(|e| format!("恢復檔案失敗: {}", e))?;
            fs::remove_file(deleted_path)
                .map_err(|e| format!("清理垃圾桶檔案失敗: {}", e))?;
        }
    }
    
    // 更新資料庫狀態（清除刪除標記）
    let sql = format!(
        "UPDATE {} SET deleted_at = NULL, deleted_reason = NULL, 
         deleted_file_path = NULL, is_permanently_deleted = 0 WHERE id = ?1",
        image_info.table_name
    );
    
    conn.execute(&sql, params![image_id])
        .map_err(|e| format!("更新恢復狀態失敗: {}", e))?;
    
    Ok(())
}

/// 獲取軟刪除圖片的詳細信息
pub fn get_soft_deleted_image_info(
    conn: &rusqlite::Connection,
    image_id: &str,
) -> Result<DeletedImageInfo, String> {
    use rusqlite::params;
    
    // 檢查 pollinations_generations
    if let Ok(mut stmt) = conn.prepare(
        "SELECT local_file_path, deleted_file_path FROM pollinations_generations 
         WHERE id = ?1 AND deleted_at IS NOT NULL AND is_permanently_deleted = 0"
    ) {
        if let Ok(row) = stmt.query_row(params![image_id], |row| {
            Ok(DeletedImageInfo {
                original_file_path: row.get::<_, Option<String>>("local_file_path")?,
                deleted_file_path: row.get::<_, Option<String>>("deleted_file_path")?,
                table_name: "pollinations_generations".to_string(),
            })
        }) {
            return Ok(row);
        }
    }
    
    // 檢查 illustration_generations
    if let Ok(mut stmt) = conn.prepare(
        "SELECT local_file_path, deleted_file_path FROM illustration_generations 
         WHERE id = ?1 AND deleted_at IS NOT NULL AND is_permanently_deleted = 0"
    ) {
        if let Ok(row) = stmt.query_row(params![image_id], |row| {
            Ok(DeletedImageInfo {
                original_file_path: row.get::<_, Option<String>>("local_file_path")?,
                deleted_file_path: row.get::<_, Option<String>>("deleted_file_path")?,
                table_name: "illustration_generations".to_string(),
            })
        }) {
            return Ok(row);
        }
    }
    
    Err(format!("找不到軟刪除的圖片 ID: {}", image_id))
}

// ========================= 刪除功能資料結構 =========================

#[derive(Debug)]
pub struct ImageInfo {
    pub local_file_path: Option<String>,
    pub table_name: String,
}

#[derive(Debug)]
pub struct DeletedImageInfo {
    pub original_file_path: Option<String>,
    pub deleted_file_path: Option<String>,
    pub table_name: String,
}