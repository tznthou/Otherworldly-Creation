pub mod connection;
pub mod migrations;
pub mod models;

use anyhow::Result;
use rusqlite::Connection;
use std::sync::{Arc, Mutex};

// 全域資料庫連接
static DB_INSTANCE: std::sync::OnceLock<Arc<Mutex<Connection>>> = std::sync::OnceLock::new();

/// 初始化資料庫連接
pub fn init_database() -> Result<()> {
    let db = connection::create_connection()?;
    migrations::run_migrations(&db)?;
    
    DB_INSTANCE.set(Arc::new(Mutex::new(db)))
        .map_err(|_| anyhow::anyhow!("Database already initialized"))?;
    
    log::info!("資料庫初始化完成");
    Ok(())
}

/// 獲取資料庫連接
pub fn get_db() -> Result<Arc<Mutex<Connection>>> {
    DB_INSTANCE.get()
        .ok_or_else(|| anyhow::anyhow!("Database not initialized"))
        .map(|db| db.clone())
}