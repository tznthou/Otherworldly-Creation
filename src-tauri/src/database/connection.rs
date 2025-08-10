use anyhow::Result;
use rusqlite::{Connection, OpenFlags};
use std::path::PathBuf;

/// 檢查是否為打包後的生產環境
fn is_production_environment() -> bool {
    if let Ok(exe_path) = std::env::current_exe() {
        let path_str = exe_path.to_string_lossy();
        
        // 診斷輸出：總是顯示執行路徑用於除錯
        println!("🔍 [診斷] 執行路徑: {}", path_str);
        
        // macOS: 精確檢查是否在 Applications 目錄中
        #[cfg(target_os = "macos")]
        {
            let is_production = path_str.contains("/Applications/");
            println!("🔍 [診斷] macOS 環境判定: {}", if is_production { "🚀 生產環境" } else { "🔧 開發環境" });
            is_production
        }
        
        // Windows: 檢查是否在安裝目錄中 (不是開發目錄)
        #[cfg(target_os = "windows")]
        {
            path_str.ends_with(".exe") && !path_str.contains("target\\")
        }
        
        // 其他平台暫時返回 false
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            false
        }
    } else {
        false
    }
}

/// 獲取資料庫檔案路徑
pub fn get_db_path() -> Result<PathBuf> {
    let exe_path_info = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "無法獲取執行路徑".to_string());
    
    if is_production_environment() {
        // 生產環境：使用系統用戶資料目錄
        let data_dir = dirs::data_dir()
            .ok_or_else(|| anyhow::anyhow!("無法獲取用戶資料目錄"))?;
        
        let app_dir = data_dir.join("genesis-chronicle");
        std::fs::create_dir_all(&app_dir)?;
        
        let prod_db_path = app_dir.join("genesis-chronicle.db");
        log::info!("🚀 生產環境檢測 - 執行路徑: {}", exe_path_info);
        log::info!("📁 使用用戶資料庫: {:?}", prod_db_path);
        Ok(prod_db_path)
    } else {
        // 開發環境：使用項目根目錄下的開發資料庫
        let current_dir = std::env::current_dir()?;
        let dev_db_path = current_dir.join("genesis-chronicle-dev.db");
        log::info!("🔧 開發環境檢測 - 執行路徑: {}", exe_path_info);
        log::info!("📁 使用開發資料庫: {:?}", dev_db_path);
        Ok(dev_db_path)
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