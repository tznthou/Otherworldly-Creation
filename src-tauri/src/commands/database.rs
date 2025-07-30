use std::fs;
use std::path::Path;
use crate::database::connection::get_db_path;

#[tauri::command]
pub async fn backup_database(path: String) -> Result<(), String> {
    let source_path = get_db_path().map_err(|e| e.to_string())?;
    let dest_path = Path::new(&path);
    
    // 檢查來源檔案是否存在
    if !source_path.exists() {
        return Err("資料庫檔案不存在".to_string());
    }
    
    // 確保目標目錄存在
    if let Some(parent) = dest_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("無法建立目標目錄: {}", e))?;
        }
    }
    
    // 複製檔案
    fs::copy(&source_path, dest_path)
        .map_err(|e| format!("備份失敗: {}", e))?;
    
    log::info!("資料庫已備份至: {}", path);
    Ok(())
}

#[tauri::command]
pub async fn restore_database(path: String) -> Result<(), String> {
    let source_path = Path::new(&path);
    let dest_path = get_db_path().map_err(|e| e.to_string())?;
    
    // 檢查來源檔案是否存在
    if !source_path.exists() {
        return Err("備份檔案不存在".to_string());
    }
    
    // 確保目標目錄存在
    if let Some(parent) = dest_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("無法建立資料庫目錄: {}", e))?;
        }
    }
    
    // 複製檔案
    fs::copy(source_path, &dest_path)
        .map_err(|e| format!("還原失敗: {}", e))?;
    
    log::info!("資料庫已從備份還原: {}", path);
    Ok(())
}

#[tauri::command]
pub async fn run_database_maintenance() -> Result<String, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("無法連接資料庫: {}", e))?;
    
    // 執行 VACUUM 操作來壓縮資料庫
    conn.execute("VACUUM", [])
        .map_err(|e| format!("資料庫維護失敗: {}", e))?;
    
    // 重新分析統計資訊
    conn.execute("ANALYZE", [])
        .map_err(|e| format!("資料庫分析失敗: {}", e))?;
    
    Ok("資料庫維護完成".to_string())
}

#[tauri::command]
pub async fn get_database_stats() -> Result<serde_json::Value, String> {
    use rusqlite::Connection;
    use serde_json::json;
    
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("無法連接資料庫: {}", e))?;
    
    // 獲取資料庫檔案大小
    let file_size = fs::metadata(&db_path)
        .map_err(|e| format!("無法獲取檔案資訊: {}", e))?
        .len();
    
    // 獲取表的數量和記錄數
    let mut project_count = 0i64;
    let mut chapter_count = 0i64;
    let mut character_count = 0i64;
    let mut relationship_count = 0i64;
    
    // 查詢各表的記錄數
    if let Ok(count) = conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get::<_, i64>(0)) {
        project_count = count;
    }
    
    if let Ok(count) = conn.query_row("SELECT COUNT(*) FROM chapters", [], |row| row.get::<_, i64>(0)) {
        chapter_count = count;
    }
    
    if let Ok(count) = conn.query_row("SELECT COUNT(*) FROM characters", [], |row| row.get::<_, i64>(0)) {
        character_count = count;
    }
    
    if let Ok(count) = conn.query_row("SELECT COUNT(*) FROM character_relationships", [], |row| row.get::<_, i64>(0)) {
        relationship_count = count;
    }
    
    Ok(json!({
        "file_size": file_size,
        "file_path": db_path.to_string_lossy(),
        "tables": {
            "projects": project_count,
            "chapters": chapter_count,
            "characters": character_count,
            "character_relationships": relationship_count
        }
    }))
}