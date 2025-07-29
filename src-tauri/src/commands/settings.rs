use crate::database::{get_db};
use anyhow::Result;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingEntry {
    pub key: String,
    pub value: String,
}

/// 獲取單個設定值
#[command]
pub async fn get_setting(key: String) -> Result<Option<String>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    
    match stmt.query_row([&key], |row| row.get::<_, String>(0)) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// 設定單個設定值
#[command]
pub async fn set_setting(key: String, value: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 獲取所有設定
#[command]
pub async fn get_all_settings() -> Result<Vec<SettingEntry>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings ORDER BY key")
        .map_err(|e| e.to_string())?;
    
    let setting_iter = stmt
        .query_map([], |row| {
            Ok(SettingEntry {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut settings = Vec::new();
    for setting in setting_iter {
        settings.push(setting.map_err(|e| e.to_string())?);
    }
    
    Ok(settings)
}

/// 重置所有設定
#[command]
pub async fn reset_settings() -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    conn.execute("DELETE FROM settings", [])
        .map_err(|e| e.to_string())?;
    
    log::info!("所有設定已重置");
    Ok(())
}