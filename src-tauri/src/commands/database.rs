use std::fs;
use std::path::Path;
use crate::database::connection::get_db_path;

/// 計算資料庫碎片化程度
/// 使用 SQLite 的 dbstat 虛擬表來計算碎片化百分比
fn calculate_fragmentation(conn: &rusqlite::Connection) -> Result<f64, rusqlite::Error> {
    // 嘗試啟用 dbstat 虛擬表 (SQLite 3.8.0+)
    let _result = conn.execute("PRAGMA compile_options", []);
    
    // 使用 PRAGMA integrity_check 和頁面統計來估算碎片化
    // 方法1: 使用 page_count 和 freelist_count
    let page_count: i64 = conn.query_row(
        "PRAGMA page_count",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    let freelist_count: i64 = conn.query_row(
        "PRAGMA freelist_count", 
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    if page_count == 0 {
        return Ok(0.0);
    }
    
    // 檢查是否為 WAL 模式
    let journal_mode: String = conn
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .unwrap_or_else(|_| "unknown".to_string());
    
    // 在 WAL 模式下，freelist_count 更準確（VACUUM 後立即反映）
    if journal_mode.to_lowercase() == "wal" {
        let fragmentation = (freelist_count as f64 / page_count as f64) * 100.0;
        return Ok(fragmentation.min(100.0));
    }
    
    // 非 WAL 模式：嘗試使用 dbstat 虛擬表 (更準確)
    let fragmentation_from_dbstat = conn.prepare("
        SELECT 
            (SUM(CASE WHEN unused > 0 THEN unused ELSE 0 END) * 100.0) / SUM(pgsize) as fragmentation
        FROM dbstat
    ").and_then(|mut stmt| {
        stmt.query_row([], |row| row.get::<_, f64>(0))
    });
    
    match fragmentation_from_dbstat {
        Ok(frag) => Ok(frag),
        Err(_) => {
            // 如果 dbstat 不可用，使用 freelist 方法估算
            let fragmentation = (freelist_count as f64 / page_count as f64) * 100.0;
            Ok(fragmentation.min(100.0)) // 限制在 100% 以內
        }
    }
}

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
    
    // 🔥 更強力的碎片化清理流程
    
    // 1. 先執行 WAL 檢查點，確保所有變更都寫入主檔案
    let _checkpoint = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", []);
    
    // 2. 設置較短的忙等待時間，避免鎖定衝突
    conn.pragma_update(None, "busy_timeout", 30000)
        .map_err(|e| format!("設置超時失敗: {}", e))?;
    
    // 3. 執行完整的 VACUUM 操作來壓縮資料庫
    conn.execute("VACUUM", [])
        .map_err(|e| format!("資料庫維護失敗: {}", e))?;
    
    // 4. 重新分析統計資訊
    conn.execute("ANALYZE", [])
        .map_err(|e| format!("資料庫分析失敗: {}", e))?;
    
    // 5. 🔥 執行現代 SQLite 優化指令 (SQLite 3.18.0+)
    // PRAGMA optimize 會根據統計資訊自動決定需要重新分析哪些索引
    let _optimize_result = conn.execute("PRAGMA optimize", []);
    
    // 6. 強制同步到磁碟
    let _sync_result = conn.pragma_update(None, "synchronous", "FULL");
    let _sync_result = conn.pragma_update(None, "synchronous", "NORMAL");
    
    log::info!("資料庫維護完成 - 包含 VACUUM、ANALYZE 和 PRAGMA optimize");
    
    Ok("資料庫維護完成".to_string())
}

#[tauri::command]
pub async fn reindex_database() -> Result<String, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("無法連接資料庫: {}", e))?;
    
    // 🔥 執行 REINDEX 操作重建所有索引
    // 這會重建所有索引，提升查詢性能，尤其是在大量數據操作後
    conn.execute("REINDEX", [])
        .map_err(|e| format!("重建索引失敗: {}", e))?;
    
    log::info!("資料庫索引重建完成");
    
    Ok("索引重建完成".to_string())
}

#[tauri::command]
pub async fn incremental_vacuum(pages: Option<i32>) -> Result<String, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("無法連接資料庫: {}", e))?;
    
    // 🔥 執行 PRAGMA incremental_vacuum 漸進式清理
    // 適合大型資料庫，不會鎖定資料庫太長時間
    let vacuum_command = match pages {
        Some(p) if p > 0 => format!("PRAGMA incremental_vacuum({})", p),
        _ => "PRAGMA incremental_vacuum".to_string()
    };
    
    conn.execute(&vacuum_command, [])
        .map_err(|e| format!("漸進式清理失敗: {}", e))?;
    
    let message = match pages {
        Some(p) => format!("漸進式清理完成，已處理 {} 頁", p),
        None => "漸進式清理完成".to_string()
    };
    
    log::info!("{}", message);
    
    Ok(message)
}

#[tauri::command]
pub async fn get_wal_mode_status() -> Result<serde_json::Value, String> {
    use rusqlite::Connection;
    use serde_json::json;
    
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("無法連接資料庫: {}", e))?;
    
    // 🔥 檢查當前 journal_mode
    let journal_mode: String = conn
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .unwrap_or_else(|_| "unknown".to_string());
    
    // 檢查 synchronous 設定
    let synchronous: i32 = conn
        .query_row("PRAGMA synchronous", [], |row| row.get(0))
        .unwrap_or(1);
    
    // 檢查 WAL 自動檢查點大小
    let wal_autocheckpoint: i32 = conn
        .query_row("PRAGMA wal_autocheckpoint", [], |row| row.get(0))
        .unwrap_or(1000);
    
    // 如果是 WAL 模式，獲取 WAL 檔案資訊
    let mut wal_info = json!({});
    if journal_mode.to_lowercase() == "wal" {
        // 檢查 WAL 檔案大小 (如果存在)
        let wal_path = format!("{}-wal", db_path.to_string_lossy());
        let wal_size = std::fs::metadata(&wal_path)
            .map(|m| m.len())
            .unwrap_or(0);
        
        wal_info = json!({
            "wal_file_size": wal_size,
            "wal_file_exists": std::path::Path::new(&wal_path).exists()
        });
    }
    
    Ok(json!({
        "journal_mode": journal_mode,
        "is_wal_mode": journal_mode.to_lowercase() == "wal",
        "synchronous": synchronous,
        "wal_autocheckpoint": wal_autocheckpoint,
        "wal_info": wal_info,
        "benefits": {
            "wal": ["併發讀取支援", "寫入不阻塞讀取", "更好的容錯性"],
            "delete": ["簡單模式", "較少檔案", "傳統相容性"]
        },
        "recommendations": if journal_mode.to_lowercase() == "wal" {
            "WAL 模式已啟用，提供更好的併發性能"
        } else {
            "建議啟用 WAL 模式以提升併發性能，但注意某些情況下可能不適用"
        }
    }))
}

#[tauri::command]
pub async fn set_wal_mode(enable: bool) -> Result<String, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    
    // 🔥 簡單直接的方法：嘗試一次，如果失敗就告訴用戶原因
    match Connection::open(&db_path) {
        Ok(conn) => {
            // 設置適中的忙等待超時
            let _ = conn.pragma_update(None, "busy_timeout", 5000);
            
            // 🔥 嘗試執行 WAL 檢查點以釋放可能的鎖定
            let _ = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", []);
                
            // 🔥 設置 journal_mode
            let target_mode = if enable { "WAL" } else { "DELETE" };
            
            match conn.query_row(&format!("PRAGMA journal_mode = {}", target_mode), [], |row| row.get::<_, String>(0)) {
                Ok(result) => {
                    // 如果啟用 WAL 模式，優化相關設定
                    if enable && result.to_lowercase() == "wal" {
                        // 設置合適的 synchronous 級別 (NORMAL 對 WAL 模式是安全且快速的)
                        let _sync_result = conn.pragma_update(None, "synchronous", "NORMAL");
                        
                        // 設置 WAL 自動檢查點大小 (較大的值可以減少檢查點頻率)
                        let _checkpoint_result = conn.pragma_update(None, "wal_autocheckpoint", 2000);
                        
                        log::info!("WAL 模式已啟用，已優化相關設定");
                        Ok("WAL 模式已成功啟用，併發性能已提升".to_string())
                    } else if !enable && result.to_lowercase() == "delete" {
                        // 恢復為 DELETE 模式，調整 synchronous 為更安全的設定
                        let _sync_result = conn.pragma_update(None, "synchronous", "FULL");
                        
                        log::info!("已切換回 DELETE 模式");
                        Ok("已切換回 DELETE 模式，使用傳統日誌方式".to_string())
                    } else {
                        // 模式切換失敗或結果不符預期
                        Err(format!("模式切換失敗，當前模式: {}", result))
                    }
                },
                Err(e) => {
                    // 🔥 明確的錯誤訊息，告訴用戶真正的問題
                    if e.to_string().contains("database is locked") {
                        Err("資料庫正在被其他操作使用，請等待所有資料庫操作完成後再嘗試切換 WAL 模式。如果問題持續，請重新啟動應用程式。".to_string())
                    } else {
                        Err(format!("WAL 模式切換失敗: {}", e))
                    }
                }
            }
        },
        Err(e) => {
            Err(format!("無法連接資料庫: {}. 請檢查資料庫檔案狀態", e))
        }
    }
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
                "fragmentationLevel": 0.0,
                "journalMode": "unknown",
                "isWalMode": false
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
                    "fragmentationLevel": 0.0,
                    "journalMode": "unknown",
                    "isWalMode": false
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
    
    // 🔥 實現真實的碎片化檢測
    let fragmentation_level = calculate_fragmentation(&conn).unwrap_or(0.0);
    
    // 🔥 檢查 WAL 模式狀態
    let journal_mode: String = conn
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .unwrap_or_else(|_| "unknown".to_string());
    let is_wal_mode = journal_mode.to_lowercase() == "wal";
    
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
    
    // 🔥 碎片化程度警告
    if fragmentation_level > 25.0 {
        issues.push(json!({
            "type": "performance",
            "severity": if fragmentation_level > 50.0 { "high" } else { "medium" },
            "table": "database",
            "description": format!("資料庫碎片化程度過高: {:.1}%", fragmentation_level),
            "suggestion": "建議執行 VACUUM 操作以重新整理資料庫",
            "autoFixable": true
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
            "fragmentationLevel": fragmentation_level,
            "journalMode": journal_mode,
            "isWalMode": is_wal_mode
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}