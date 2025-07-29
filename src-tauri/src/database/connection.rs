use anyhow::Result;
use rusqlite::{Connection, OpenFlags};
use std::path::PathBuf;

/// 獲取資料庫檔案路徑
pub fn get_db_path() -> Result<PathBuf> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| anyhow::anyhow!("無法獲取用戶資料目錄"))?;
    
    let app_dir = data_dir.join("genesis-chronicle");
    std::fs::create_dir_all(&app_dir)?;
    
    Ok(app_dir.join("genesis-chronicle.db"))
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