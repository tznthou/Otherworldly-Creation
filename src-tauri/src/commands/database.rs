use std::fs;
use std::path::{Path, PathBuf};
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

/// 將資料庫檔案備份到指定路徑
///
/// 走 SQLite Online Backup API 而不是 fs::copy——資料庫是 WAL 模式，
/// 單純複製主檔會漏掉 -wal 裡尚未 checkpoint 的內容，而且備份檔照樣通過
/// integrity_check，看起來健康卻少了最近寫入的章節。
///
/// 抽成獨立函式讓測試能用暫存目錄的資料庫驗證，不碰真實資料。
pub fn backup_db_file(source_path: &Path, dest_path: &Path) -> Result<(), String> {
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

    let result = run_online_backup(source_path, dest_path);

    // 失敗時清掉半成品，否則會留下一個看似有效的殘缺備份檔
    if result.is_err() {
        let _ = fs::remove_file(dest_path);
    }

    result
}

fn run_online_backup(source_path: &Path, dest_path: &Path) -> Result<(), String> {
    let source = rusqlite::Connection::open(source_path)
        .map_err(|e| format!("無法開啟來源資料庫: {}", e))?;
    let mut dest = rusqlite::Connection::open(dest_path)
        .map_err(|e| format!("無法建立備份檔: {}", e))?;

    let backup = rusqlite::backup::Backup::new(&source, &mut dest)
        .map_err(|e| format!("備份初始化失敗: {}", e))?;

    // 分批複製並在批次間讓出鎖，避免長時間卡住正在寫入的 app
    backup
        .run_to_completion(100, std::time::Duration::from_millis(50), None)
        .map_err(|e| format!("備份失敗: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn backup_database(path: String) -> Result<(), String> {
    let source_path = get_db_path().map_err(|e| e.to_string())?;
    let dest_path = Path::new(&path);

    backup_db_file(&source_path, dest_path)?;

    log::info!("資料庫已備份至: {}", path);
    Ok(())
}

/// 從備份檔還原資料庫
///
/// 抽成獨立函式讓測試能用暫存目錄驗證完整的備份→還原循環。
pub fn restore_db_file(source_path: &Path, dest_path: &Path) -> Result<(), String> {
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
    fs::copy(source_path, dest_path)
        .map_err(|e| format!("還原失敗: {}", e))?;

    // 清掉舊資料庫留下的 -wal / -shm。留著的話下次開啟時是新主檔配舊 WAL，
    // 還原等於只做了一半。
    remove_wal_sidecars(dest_path)?;

    Ok(())
}

/// SQLite 的 WAL 附屬檔命名是主檔完整檔名後綴 -wal / -shm，
/// 不是替換副檔名——`with_extension` 會把 `foo.db` 變成 `foo-wal` 而不是 `foo.db-wal`。
fn sidecar_path(db_path: &Path, suffix: &str) -> PathBuf {
    let mut name = db_path.as_os_str().to_os_string();
    name.push(suffix);
    PathBuf::from(name)
}

fn remove_wal_sidecars(db_path: &Path) -> Result<(), String> {
    for suffix in ["-wal", "-shm"] {
        let sidecar = sidecar_path(db_path, suffix);
        if sidecar.exists() {
            fs::remove_file(&sidecar)
                .map_err(|e| format!("無法清除 {}: {}", sidecar.display(), e))?;
        }
    }
    Ok(())
}

/// 自動備份檔名前綴。rotation 靠它辨認哪些檔案歸自己管，
/// 使用者放在同一個資料夾的其他檔案不會被掃到。
const AUTO_BACKUP_PREFIX: &str = "genesis-chronicle-backup-";

/// 預設備份目錄：資料庫檔案旁邊的 backups/
///
/// 跟著資料庫走，dev 落在 src-tauri/backups/，
/// 正式版落在 app data 目錄下，不需要另一套環境判斷。
fn backup_dir_for_db(db_path: &Path) -> PathBuf {
    db_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("backups")
}

fn auto_backup_filename(timestamp: &str) -> String {
    format!("{}{}.db", AUTO_BACKUP_PREFIX, timestamp)
}

/// 在指定目錄產生一份備份，並依保留上限刪掉最舊的幾份
///
/// timestamp 由呼叫端傳入而不是在函式內取當前時間，測試才能穩定地
/// 排出多份備份驗證 rotation。
pub fn create_backup_in_dir(
    source_db: &Path,
    dir: &Path,
    timestamp: &str,
    max_files: Option<usize>,
) -> Result<PathBuf, String> {
    let dest = dir.join(auto_backup_filename(timestamp));
    backup_db_file(source_db, &dest)?;

    if let Some(max) = max_files {
        prune_old_backups(dir, max)?;
    }

    Ok(dest)
}

/// 只保留最新的 max_files 份自動備份
///
/// 檔名時間戳是零填補的固定格式，字典序即時間序，不必讀 mtime——
/// 同一秒內建立的檔案 mtime 會相同，排不出先後。
fn prune_old_backups(dir: &Path, max_files: usize) -> Result<(), String> {
    // 0 視為不限制。若照字面刪到只剩 0 份，會把剛建好的那份也刪掉。
    if max_files == 0 {
        return Ok(());
    }

    let entries = fs::read_dir(dir).map_err(|e| format!("無法讀取備份目錄: {}", e))?;

    let mut backups: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.is_file()
                && path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| {
                        name.starts_with(AUTO_BACKUP_PREFIX) && name.ends_with(".db")
                    })
        })
        .collect();

    backups.sort();

    let excess = backups.len().saturating_sub(max_files);
    for path in backups.into_iter().take(excess) {
        fs::remove_file(&path)
            .map_err(|e| format!("無法刪除舊備份 {}: {}", path.display(), e))?;
    }

    Ok(())
}

/// 回傳預設備份目錄，給設定畫面顯示「沒有自訂位置時會存到哪」
#[tauri::command]
pub async fn get_default_backup_dir() -> Result<String, String> {
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    Ok(backup_dir_for_db(&db_path).to_string_lossy().to_string())
}

/// 執行一次自動備份，回傳備份檔完整路徑
///
/// location 留空時落到預設目錄；max_files 決定保留幾份。
#[tauri::command]
pub async fn create_auto_backup(
    location: Option<String>,
    max_files: Option<usize>,
) -> Result<String, String> {
    log::info!(
        "開始自動備份 (location={:?}, max_files={:?})",
        location,
        max_files
    );
    let db_path = get_db_path().map_err(|e| e.to_string())?;

    let dir = match location.as_deref().map(str::trim) {
        Some(custom) if !custom.is_empty() => PathBuf::from(custom),
        _ => backup_dir_for_db(&db_path),
    };

    let timestamp = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_path = create_backup_in_dir(&db_path, &dir, &timestamp, max_files)?;

    log::info!("自動備份完成: {}", backup_path.display());
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn restore_database(path: String) -> Result<(), String> {
    let source_path = Path::new(&path);
    let dest_path = get_db_path().map_err(|e| e.to_string())?;

    restore_db_file(source_path, &dest_path)?;

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

#[cfg(test)]
mod backup_tests {
    use super::*;
    use rusqlite::Connection;

    /// 建一顆 WAL 模式的測試資料庫：先寫一筆並 checkpoint 進主檔，
    /// 之後關掉 autocheckpoint 再寫，讓新資料留在 -wal 裡。
    ///
    /// 回傳的連線必須保持開啟——一旦關閉，SQLite 會自動把 WAL 併回主檔，
    /// 就再也重現不出「app 執行中備份」的真實狀態。
    fn open_db_with_uncheckpointed_rows(db_path: &Path, wal_rows: usize) -> Connection {
        let conn = Connection::open(db_path).expect("開啟測試資料庫失敗");
        conn.pragma_update(None, "journal_mode", &"WAL")
            .expect("啟用 WAL 模式失敗");
        conn.execute(
            "CREATE TABLE chapters (id INTEGER PRIMARY KEY, content TEXT NOT NULL)",
            [],
        )
        .expect("建立測試表失敗");
        conn.execute("INSERT INTO chapters (content) VALUES ('已存檔的第一章')", [])
            .expect("寫入已存檔資料失敗");

        // 把上面那筆推進主檔，模擬 app 已經跑過一段時間
        conn.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()))
            .expect("checkpoint 失敗");

        // 之後的寫入全部留在 WAL，不進主檔
        conn.pragma_update(None, "wal_autocheckpoint", &0i64)
            .expect("關閉 autocheckpoint 失敗");
        for i in 0..wal_rows {
            conn.execute(
                "INSERT INTO chapters (content) VALUES (?1)",
                [format!("尚未 checkpoint 的第 {} 章", i + 1)],
            )
            .expect("寫入 WAL 資料失敗");
        }

        conn
    }

    fn count_chapters(db_path: &Path) -> i64 {
        let conn = Connection::open(db_path).expect("開啟資料庫失敗");
        conn.query_row("SELECT COUNT(*) FROM chapters", [], |row| row.get(0))
            .expect("查詢章節數失敗")
    }

    /// 這是整個備份功能的核心保證：app 執行中未 checkpoint 的內容也要進備份。
    /// 單純複製主檔會漏掉 -wal 裡的資料，備份看起來成功卻少了最近的章節。
    #[test]
    fn backup_includes_uncheckpointed_wal_data() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let dest = dir.path().join("backup.db");

        let conn = open_db_with_uncheckpointed_rows(&source, 3);
        assert_eq!(count_chapters(&source), 4, "來源資料庫應該有 4 筆（連線仍開著）");

        backup_db_file(&source, &dest).expect("備份失敗");

        assert_eq!(
            count_chapters(&dest),
            4,
            "備份漏掉了 WAL 裡尚未 checkpoint 的章節"
        );

        drop(conn);
    }

    /// 備份檔要能獨立開啟並通過完整性檢查，不能依賴來源的 -wal / -shm 陪在旁邊
    #[test]
    fn backup_file_passes_integrity_check() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let dest = dir.path().join("backup.db");

        let conn = open_db_with_uncheckpointed_rows(&source, 2);
        backup_db_file(&source, &dest).expect("備份失敗");
        drop(conn);

        let backup_conn = Connection::open(&dest).expect("開啟備份檔失敗");
        let result: String = backup_conn
            .query_row("PRAGMA integrity_check", [], |row| row.get(0))
            .expect("完整性檢查失敗");
        assert_eq!(result, "ok", "備份檔未通過完整性檢查");
    }

    #[test]
    fn backup_creates_missing_destination_directory() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let dest = dir.path().join("nested").join("deeper").join("backup.db");

        let conn = open_db_with_uncheckpointed_rows(&source, 1);
        backup_db_file(&source, &dest).expect("備份失敗");
        drop(conn);

        assert!(dest.exists(), "備份未建立缺少的目標目錄");
    }

    /// 備份的價值全在還原那一刻。這條走完整循環：
    /// 備份 → 來源繼續被改壞 → 還原 → 內容必須回到備份當下的狀態。
    #[test]
    fn restore_brings_data_back_to_backup_point() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let backup = dir.path().join("backup.db");

        let conn = open_db_with_uncheckpointed_rows(&source, 3);
        backup_db_file(&source, &backup).expect("備份失敗");

        // 模擬備份之後使用者又寫了東西、然後資料毀損（這裡直接刪光）
        conn.execute("DELETE FROM chapters", []).expect("清空失敗");
        drop(conn);
        assert_eq!(count_chapters(&source), 0, "前置條件：來源應已被清空");

        restore_db_file(&backup, &source).expect("還原失敗");

        assert_eq!(
            count_chapters(&source),
            4,
            "還原後的內容不等於備份當下的狀態"
        );
    }

    /// 還原是覆蓋主檔，但目標的 -wal / -shm 是舊資料庫留下的。
    /// 沒清掉的話，下次開啟時 SQLite 面對的是新主檔配舊 WAL。
    #[test]
    fn restore_clears_stale_wal_files() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let backup = dir.path().join("backup.db");

        let conn = open_db_with_uncheckpointed_rows(&source, 3);
        backup_db_file(&source, &backup).expect("備份失敗");
        drop(conn);

        // 模擬還原前殘留的舊 WAL / SHM（SQLite 的命名就是主檔名後綴 -wal / -shm）
        let stale_wal = dir.path().join("source.db-wal");
        let stale_shm = dir.path().join("source.db-shm");
        fs::write(&stale_wal, b"stale").expect("寫入假 WAL 失敗");
        fs::write(&stale_shm, b"stale").expect("寫入假 SHM 失敗");

        restore_db_file(&backup, &source).expect("還原失敗");

        assert!(
            !stale_wal.exists(),
            "還原後仍留著舊的 -wal，下次開啟會拿新主檔配舊 WAL"
        );
        assert!(!stale_shm.exists(), "還原後仍留著舊的 -shm");
        assert_eq!(count_chapters(&source), 4, "還原後資料筆數不對");
    }

    #[test]
    fn creates_backup_under_given_directory_with_timestamped_name() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let backup_dir = dir.path().join("backups");

        let conn = open_db_with_uncheckpointed_rows(&source, 2);
        let path = create_backup_in_dir(&source, &backup_dir, "20260807-143022", None)
            .expect("備份失敗");
        drop(conn);

        assert_eq!(
            path.file_name().unwrap().to_str().unwrap(),
            "genesis-chronicle-backup-20260807-143022.db"
        );
        assert_eq!(count_chapters(&path), 3, "備份內容不完整");
    }

    #[test]
    fn prunes_oldest_backups_beyond_limit() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let backup_dir = dir.path().join("backups");

        let conn = open_db_with_uncheckpointed_rows(&source, 1);
        // 時間戳字典序即時間序，最舊的是 01
        for stamp in ["20260807-000001", "20260807-000002", "20260807-000003"] {
            create_backup_in_dir(&source, &backup_dir, stamp, Some(2)).expect("備份失敗");
        }
        drop(conn);

        let mut remaining: Vec<String> = fs::read_dir(&backup_dir)
            .expect("讀取備份目錄失敗")
            .map(|e| e.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        remaining.sort();

        assert_eq!(
            remaining,
            vec![
                "genesis-chronicle-backup-20260807-000002.db",
                "genesis-chronicle-backup-20260807-000003.db",
            ],
            "應該只留下最新的兩份"
        );
    }

    #[test]
    fn keeps_all_backups_when_under_limit() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let backup_dir = dir.path().join("backups");

        let conn = open_db_with_uncheckpointed_rows(&source, 1);
        for stamp in ["20260807-000001", "20260807-000002"] {
            create_backup_in_dir(&source, &backup_dir, stamp, Some(5)).expect("備份失敗");
        }
        drop(conn);

        let count = fs::read_dir(&backup_dir).expect("讀取備份目錄失敗").count();
        assert_eq!(count, 2, "未達上限不應該刪任何一份");
    }

    /// 使用者可能把備份目錄指到自己的資料夾，rotation 只能碰自己產生的檔案
    #[test]
    fn prune_leaves_unrelated_files_alone() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("source.db");
        let backup_dir = dir.path().join("backups");
        fs::create_dir_all(&backup_dir).expect("建立備份目錄失敗");

        let bystander = backup_dir.join("我的手稿.db");
        fs::write(&bystander, b"not a backup").expect("寫入無關檔案失敗");

        let conn = open_db_with_uncheckpointed_rows(&source, 1);
        for stamp in ["20260807-000001", "20260807-000002"] {
            create_backup_in_dir(&source, &backup_dir, stamp, Some(1)).expect("備份失敗");
        }
        drop(conn);

        assert!(bystander.exists(), "rotation 刪掉了不屬於自己的檔案");
        assert!(
            backup_dir
                .join("genesis-chronicle-backup-20260807-000002.db")
                .exists(),
            "最新的備份應該保留"
        );
    }

    #[test]
    fn default_backup_dir_sits_next_to_the_database() {
        let db = Path::new("/tmp/genesis/genesis-chronicle-dev.db");
        assert_eq!(
            backup_dir_for_db(db),
            PathBuf::from("/tmp/genesis/backups"),
            "備份目錄應該跟著資料庫走"
        );
    }

    #[test]
    fn restore_rejects_missing_backup() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let backup = dir.path().join("不存在.db");
        let dest = dir.path().join("target.db");

        let err = restore_db_file(&backup, &dest).expect_err("備份檔不存在時應該回錯誤");
        assert!(err.contains("不存在"), "錯誤訊息未指出備份缺失: {}", err);
    }

    #[test]
    fn backup_rejects_missing_source() {
        let dir = tempfile::tempdir().expect("建立暫存目錄失敗");
        let source = dir.path().join("不存在.db");
        let dest = dir.path().join("backup.db");

        let err = backup_db_file(&source, &dest).expect_err("來源不存在時應該回錯誤");
        assert!(err.contains("不存在"), "錯誤訊息未指出來源缺失: {}", err);
        assert!(!dest.exists(), "來源不存在時不應產生備份檔");
    }
}