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

#[tauri::command]
pub async fn health_check() -> Result<serde_json::Value, String> {
    use rusqlite::Connection;
    use serde_json::json;
    use std::fs;
    
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    
    // 檢查資料庫檔案是否存在
    if !db_path.exists() {
        return Ok(json!({
            "isHealthy": false,
            "issues": [
                {
                    "type": "corruption",
                    "severity": "critical",
                    "table": "database",
                    "description": "資料庫檔案不存在",
                    "suggestion": "請重新初始化資料庫",
                    "autoFixable": true
                }
            ],
            "statistics": {
                "totalProjects": 0,
                "totalChapters": 0,
                "totalCharacters": 0,
                "totalTemplates": 0,
                "databaseSize": 0,
                "lastVacuum": null,
                "fragmentationLevel": 0.0
            },
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));
    }
    
    // 嘗試連接資料庫
    let conn = match Connection::open(&db_path) {
        Ok(conn) => conn,
        Err(e) => {
            return Ok(json!({
                "isHealthy": false,
                "issues": [
                    {
                        "type": "corruption",
                        "severity": "critical",
                        "table": "database",
                        "description": format!("無法連接資料庫: {}", e),
                        "suggestion": "請檢查資料庫檔案是否損壞",
                        "autoFixable": false
                    }
                ],
                "statistics": {
                    "totalProjects": 0,
                    "totalChapters": 0,
                    "totalCharacters": 0,
                    "totalTemplates": 0,
                    "databaseSize": 0,
                    "lastVacuum": null,
                    "fragmentationLevel": 0.0
                },
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));
        }
    };
    
    // 收集統計資訊
    let project_count = conn
        .prepare("SELECT COUNT(*) FROM projects")
        .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, i64>(0)))
        .unwrap_or(0);
        
    let chapter_count = conn
        .prepare("SELECT COUNT(*) FROM chapters")
        .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, i64>(0)))
        .unwrap_or(0);
        
    let character_count = conn
        .prepare("SELECT COUNT(*) FROM characters")
        .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, i64>(0)))
        .unwrap_or(0);
    
    // 取得資料庫檔案大小
    let db_size = fs::metadata(&db_path)
        .map(|metadata| metadata.len())
        .unwrap_or(0);
    
    // 檢查必要的表是否存在
    let required_tables = vec!["projects", "chapters", "characters", "character_relationships", "settings"];
    let mut issues = Vec::new();
    
    for table in &required_tables {
        let exists = conn
            .prepare(&format!("SELECT name FROM sqlite_master WHERE type='table' AND name='{}'", table))
            .and_then(|mut stmt| stmt.query_row([], |_| Ok(())))
            .is_ok();
        
        if !exists {
            issues.push(json!({
                "type": "constraint",
                "severity": "high",
                "table": table,
                "description": format!("缺少必要的表格: {}", table),
                "suggestion": "執行資料庫初始化以建立缺少的表格",
                "autoFixable": true
            }));
        }
    }
    
    // 檢查資料庫完整性
    let integrity_result = conn
        .prepare("PRAGMA integrity_check")
        .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, String>(0)))
        .unwrap_or_else(|_| "unknown".to_string());
    
    if integrity_result != "ok" {
        issues.push(json!({
            "type": "integrity",
            "severity": "critical",
            "table": "database",
            "description": format!("資料庫完整性檢查失敗: {}", integrity_result),
            "suggestion": "執行資料庫修復或還原備份",
            "autoFixable": false
        }));
    }
    
    let is_healthy = issues.is_empty();
    
    Ok(json!({
        "isHealthy": is_healthy,
        "issues": issues,
        "statistics": {
            "totalProjects": project_count,
            "totalChapters": chapter_count,
            "totalCharacters": character_count,
            "totalTemplates": 0,
            "databaseSize": db_size,
            "lastVacuum": null,
            "fragmentationLevel": 0.0
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}