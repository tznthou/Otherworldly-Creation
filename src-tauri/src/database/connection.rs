use anyhow::Result;
use rusqlite::{Connection, OpenFlags};
use std::path::PathBuf;

/// 獲取資料庫檔案路徑
pub fn get_db_path() -> Result<PathBuf> {
    // 檢查是否在開發環境 - 通過檢查是否存在 src-tauri 目錄
    let is_dev_env = std::env::current_exe()
        .map(|exe_path| {
            // 開發環境通常會包含 target/debug 或在項目根目錄
            exe_path.to_string_lossy().contains("target/debug") ||
            exe_path.to_string_lossy().contains("target/release") && 
            exe_path.parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
                .map_or(false, |project_root| project_root.join("src-tauri").exists())
        })
        .unwrap_or(false);
    
    if is_dev_env {
        // 開發環境：使用項目根目錄下的資料庫
        let current_dir = std::env::current_dir()?;
        let dev_db_path = current_dir.join("genesis-chronicle-dev.db");
        log::info!("開發環境，使用開發資料庫: {:?}", dev_db_path);
        Ok(dev_db_path)
    } else {
        // 生產環境：使用系統用戶資料目錄
        let data_dir = dirs::data_dir()
            .ok_or_else(|| anyhow::anyhow!("無法獲取用戶資料目錄"))?;
        
        let app_dir = data_dir.join("genesis-chronicle");
        std::fs::create_dir_all(&app_dir)?;
        
        let prod_db_path = app_dir.join("genesis-chronicle.db");
        log::info!("生產環境，使用用戶資料庫: {:?}", prod_db_path);
        Ok(prod_db_path)
    }
}

/// 創建資料庫連接
pub fn create_connection() -> Result<Connection> {
    let db_path = get_db_path()?;
    
    log::info!("正在連接資料庫: {:?}", db_path);
    
    let conn = Connection::open_with_flags(
        &db_path,
        OpenFlags::SQLITE_OPEN_READ_WRITE 
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )?;
    
    // 啟用外鍵約束
    conn.pragma_update(None, "foreign_keys", &true)?;
    
    // 設置 WAL 模式以提高性能
    conn.pragma_update(None, "journal_mode", &"WAL")?;
    
    // 設置同步模式
    conn.pragma_update(None, "synchronous", &"NORMAL")?;
    
    log::info!("資料庫連接成功");
    
    Ok(conn)
}