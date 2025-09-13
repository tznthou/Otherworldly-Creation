//! 資料庫操作統一管理模組
//! 
//! 🎯 目標：統一處理 AI 插畫相關的資料庫操作
//! 📊 包含：插畫記錄保存、確認、收藏、清理等操作
//! 🔧 優勢：減少重複代碼、統一錯誤處理、提升可維護性

use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::database::connection::create_connection;
use log::{info, warn, error};
use serde_json::Value;
use chrono::Local;

/// AI 插畫記錄資料結構
#[derive(Debug, Clone)]
pub struct IllustrationRecord {
    pub id: String,
    pub project_id: Option<String>,
    pub character_id: Option<String>,
    pub original_prompt: String,
    pub enhanced_prompt: String,
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub seed: Option<u32>,
    pub enhance: bool,
    pub style_applied: Option<String>,
    pub image_url: Option<String>,
    pub local_file_path: String,
    pub file_size_bytes: i64,
    pub generation_time_ms: i32,
}

/// 資料庫操作結果
#[derive(Debug, Clone)]
pub struct DatabaseResult {
    pub success: bool,
    pub affected_rows: usize,
    pub message: String,
    pub error_details: Option<String>,
}

impl DatabaseResult {
    pub fn success(affected_rows: usize, message: String) -> Self {
        Self {
            success: true,
            affected_rows,
            message,
            error_details: None,
        }
    }

    pub fn error(message: String, details: Option<String>) -> Self {
        Self {
            success: false,
            affected_rows: 0,
            message,
            error_details: details,
        }
    }
}

/// AI 插畫資料庫操作處理器
pub struct IllustrationDbHandler;

impl IllustrationDbHandler {
    /// 🔧 新增：帶檔案操作的事務處理
    /// 
    /// 確保檔案操作和資料庫更新的原子性
    pub fn save_with_file_transaction<F>(
        record: &IllustrationRecord,
        file_op: F
    ) -> DatabaseResult 
    where F: FnOnce() -> Result<(), Box<dyn std::error::Error>> 
    {
        info!("[DB Transaction] 開始檔案+資料庫事務: {}", record.id);
        
        let mut conn = match create_connection() {
            Ok(conn) => conn,
            Err(e) => {
                error!("[DB Transaction] 連接失敗: {}", e);
                return DatabaseResult::error(
                    "資料庫連接失敗".to_string(),
                    Some(e.to_string())
                );
            }
        };
        
        let tx = match conn.transaction() {
            Ok(tx) => tx,
            Err(e) => {
                error!("[DB Transaction] 事務開始失敗: {}", e);
                return DatabaseResult::error(
                    "事務開始失敗".to_string(),
                    Some(e.to_string())
                );
            }
        };
        
        // 先執行檔案操作
        match file_op() {
            Ok(_) => {
                info!("[DB Transaction] 檔案操作成功，執行資料庫更新");
                
                // 檔案操作成功，執行資料庫更新
                let local_time = Local::now();
                let current_time = local_time.timestamp();
                let formatted_time = local_time.format("%Y/%m/%d %H:%M:%S").to_string();
                
                let result = tx.execute(
                    "INSERT INTO pollinations_generations (
                        id, project_id, character_id, original_prompt, enhanced_prompt,
                        model, width, height, seed, enhance, style_applied,
                        image_url, local_file_path, file_size_bytes, generation_time_ms,
                        is_confirmed, created_timestamp, created_at
                    ) VALUES (
                        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 1, ?16, ?17
                    )",
                    rusqlite::params![
                        record.id,
                        record.project_id.as_deref(),
                        record.character_id.as_deref(),
                        record.original_prompt,
                        record.enhanced_prompt,
                        record.model,
                        record.width,
                        record.height,
                        record.seed,
                        record.enhance,
                        record.style_applied.as_deref(),
                        record.image_url.as_deref(),
                        record.local_file_path,
                        record.file_size_bytes,
                        record.generation_time_ms,
                        current_time,
                        formatted_time
                    ],
                );
                
                match result {
                    Ok(_) => {
                        match tx.commit() {
                            Ok(_) => {
                                info!("[DB Transaction] ✅ 事務成功提交: {}", record.id);
                                DatabaseResult::success(1, format!("插畫記錄事務成功: {}", record.id))
                            },
                            Err(e) => {
                                error!("[DB Transaction] 事務提交失敗: {}", e);
                                DatabaseResult::error(
                                    "事務提交失敗".to_string(),
                                    Some(e.to_string())
                                )
                            }
                        }
                    },
                    Err(e) => {
                        error!("[DB Transaction] 資料庫更新失敗，回滾事務: {}", e);
                        let _ = tx.rollback();
                        DatabaseResult::error(
                            "資料庫更新失敗".to_string(),
                            Some(e.to_string())
                        )
                    }
                }
            },
            Err(e) => {
                error!("[DB Transaction] 檔案操作失敗，回滾事務: {}", e);
                let _ = tx.rollback();
                DatabaseResult::error(
                    "檔案操作失敗".to_string(),
                    Some(e.to_string())
                )
            }
        }
    }

    /// 保存插畫生成記錄到統一表格
    pub fn save_illustration_generation(record: &IllustrationRecord) -> DatabaseResult {
        let result = Self::internal_save_illustration_generation(record);
        
        match result {
            Ok(()) => {
                info!("✅ 已保存插畫生成記錄: {}", record.id);
                DatabaseResult::success(1, format!("插畫記錄已保存: {}", record.id))
            }
            Err(e) => {
                error!("❌ 保存插畫記錄失敗: {}", e);
                DatabaseResult::error(
                    "保存插畫記錄失敗".to_string(),
                    Some(e.to_string())
                )
            }
        }
    }

    /// 保存未確認的插畫記錄
    pub fn save_unconfirmed_record(record: &IllustrationRecord) -> DatabaseResult {
        let result = Self::internal_save_unconfirmed_record(record);
        
        match result {
            Ok(()) => {
                info!("✅ 已保存未確認插畫記錄: {}", record.id);
                DatabaseResult::success(1, format!("插畫記錄已保存: {}", record.id))
            }
            Err(e) => {
                error!("❌ 保存插畫記錄失敗: {}", e);
                DatabaseResult::error(
                    "保存插畫記錄失敗".to_string(),
                    Some(e.to_string())
                )
            }
        }
    }

    /// 內部方法：寫入 illustration_generations 表
    fn internal_save_illustration_generation(record: &IllustrationRecord) -> Result<(), Box<dyn Error>> {
        let conn = create_connection()?;
        
        let local_time = Local::now();
        let formatted_time = local_time.format("%Y-%m-%d %H:%M:%S").to_string();
        
        log::info!("[DB] 保存到 illustration_generations 表: {} 時間: {}", record.id, formatted_time);
        
        conn.execute(
            "INSERT INTO illustration_generations (
                id, project_id, character_id, 
                scene_description, translated_prompt,
                api_provider, api_model, image_url,
                image_size, file_size, generation_time_ms,
                status, created_at, is_confirmed, in_collection
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 1, 0
            )",
            rusqlite::params![
                record.id,
                record.project_id.as_deref(),
                record.character_id.as_deref(),
                record.original_prompt,          // scene_description
                record.enhanced_prompt,          // translated_prompt
                record.model,                    // api_provider (gemini/gemini-flash)
                record.model,                    // api_model
                record.local_file_path,          // 使用本地路徑作為 image_url
                format!("{}x{}", record.width, record.height),  // image_size
                record.file_size_bytes,
                record.generation_time_ms,
                "completed",                     // status
                formatted_time
            ],
        )?;
        
        Ok(())
    }

    /// 內部保存方法（處理實際資料庫操作）
    fn internal_save_unconfirmed_record(record: &IllustrationRecord) -> Result<(), Box<dyn Error>> {
        let conn = create_connection()?;
        
        // 🔧 修正時間記錄：使用本地時間確保顯示正確
        let local_time = Local::now();
        let current_time = local_time.timestamp();
        let formatted_time = local_time.format("%Y/%m/%d %H:%M:%S").to_string();
        
        log::info!("[DB] 記錄圖片時間: {} (timestamp: {})", formatted_time, current_time);
        
        conn.execute(
            "INSERT INTO pollinations_generations (
                id, project_id, character_id, original_prompt, enhanced_prompt,
                model, width, height, seed, enhance, style_applied,
                image_url, local_file_path, file_size_bytes, generation_time_ms,
                is_confirmed, created_timestamp, created_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 0, ?16, ?17
            )",
            rusqlite::params![
                record.id,
                record.project_id.as_deref(),
                record.character_id.as_deref(),
                record.original_prompt,
                record.enhanced_prompt,
                record.model,
                record.width,
                record.height,
                record.seed,
                record.enhance,
                record.style_applied.as_deref(),
                record.image_url.as_deref(),
                record.local_file_path,
                record.file_size_bytes,
                record.generation_time_ms,
                current_time,
                formatted_time  // 🔧 使用格式化的本地時間字串
            ],
        )?;
        
        Ok(())
    }

    /// 確認插畫（將 is_confirmed 設為 true）
    pub fn confirm_illustrations(image_ids: &[String]) -> DatabaseResult {
        if image_ids.is_empty() {
            return DatabaseResult::error(
                "沒有提供圖片ID".to_string(),
                Some("image_ids 參數為空".to_string())
            );
        }

        let result = Self::internal_confirm_illustrations(image_ids);
        
        match result {
            Ok(updated_count) => {
                info!("✅ 已確認 {} 張插畫", updated_count);
                DatabaseResult::success(
                    updated_count,
                    format!("已確認 {} 張插畫", updated_count)
                )
            }
            Err(e) => {
                error!("❌ 確認插畫失敗: {}", e);
                DatabaseResult::error(
                    "確認插畫失敗".to_string(),
                    Some(e.to_string())
                )
            }
        }
    }

    /// 內部確認方法
    fn internal_confirm_illustrations(image_ids: &[String]) -> Result<usize, Box<dyn Error>> {
        let conn = create_connection()?;
        
        // 構建 IN 子句的佔位符
        let placeholders: Vec<&str> = image_ids.iter().map(|_| "?").collect();
        let in_clause = placeholders.join(",");
        
        let mut stmt = conn.prepare(&format!(
            "UPDATE pollinations_generations SET is_confirmed = 1 WHERE id IN ({})",
            in_clause
        ))?;
        
        let updated_count = stmt.execute(rusqlite::params_from_iter(image_ids.iter()))?;
        
        Ok(updated_count)
    }

    /// 加入收藏（確認並標記為收藏）
    pub fn add_to_collection(image_ids: &[String]) -> DatabaseResult {
        if image_ids.is_empty() {
            return DatabaseResult::error(
                "沒有提供圖片ID".to_string(),
                Some("image_ids 參數為空".to_string())
            );
        }

        let result = Self::internal_add_to_collection(image_ids);
        
        match result {
            Ok((newly_confirmed, total_collected)) => {
                info!("✅ 收藏操作完成: {} 新確認, {} 總收藏", newly_confirmed, total_collected);
                DatabaseResult::success(
                    total_collected,
                    format!("已收藏 {} 張插畫 (其中 {} 張新確認)", total_collected, newly_confirmed)
                )
            }
            Err(e) => {
                error!("❌ 加入收藏失敗: {}", e);
                DatabaseResult::error(
                    "加入收藏失敗".to_string(),
                    Some(e.to_string())
                )
            }
        }
    }

    /// 內部收藏方法
    fn internal_add_to_collection(image_ids: &[String]) -> Result<(usize, usize), Box<dyn Error>> {
        let conn = create_connection()?;
        
        // 首先確認所有圖片
        let placeholders: Vec<&str> = image_ids.iter().map(|_| "?").collect();
        let in_clause = placeholders.join(",");
        
        // 先檢查是否需要添加 is_collected 欄位（向後相容性）
        // 更新為已確認並加入收藏
        let mut stmt = conn.prepare(&format!(
            "UPDATE pollinations_generations 
             SET is_confirmed = 1
             WHERE id IN ({})",
            in_clause
        ))?;
        
        let total_collected = stmt.execute(rusqlite::params_from_iter(image_ids.iter()))?;
        
        // 查詢新確認的數量（已確認的）
        let mut newly_confirmed_stmt = conn.prepare(&format!(
            "SELECT COUNT(*) FROM pollinations_generations 
             WHERE id IN ({}) AND is_confirmed = 1",
            in_clause
        ))?;
        
        let newly_confirmed: i64 = newly_confirmed_stmt.query_row(
            rusqlite::params_from_iter(image_ids.iter()),
            |row| row.get(0)
        )?;
        
        Ok((newly_confirmed as usize, total_collected))
    }

    /// 清理過期的臨時檔案記錄
    pub fn cleanup_expired_temp_records(hours: u64) -> DatabaseResult {
        let result = Self::internal_cleanup_expired_temp_records(hours);
        
        match result {
            Ok(cleaned_count) => {
                info!("✅ 已清理 {} 筆過期臨時記錄", cleaned_count);
                DatabaseResult::success(
                    cleaned_count,
                    format!("已清理 {} 筆過期臨時記錄", cleaned_count)
                )
            }
            Err(e) => {
                warn!("⚠️ 清理過期記錄時發生錯誤: {}", e);
                DatabaseResult::error(
                    "清理過期記錄失敗".to_string(),
                    Some(e.to_string())
                )
            }
        }
    }

    /// 內部清理方法
    fn internal_cleanup_expired_temp_records(hours: u64) -> Result<usize, Box<dyn Error>> {
        let conn = create_connection()?;
        
        let cutoff_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_secs() as i64 - (hours * 3600) as i64;
        
        let cleaned_count = conn.execute(
            "DELETE FROM pollinations_generations 
             WHERE is_confirmed = 0 
             AND is_temp = 1 
             AND created_timestamp < ?1",
            rusqlite::params![cutoff_time],
        )?;
        
        Ok(cleaned_count)
    }

    /// 查詢插畫記錄統計
    pub fn get_illustration_stats() -> Result<Value, Box<dyn Error>> {
        let conn = create_connection()?;
        
        let confirmed_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM pollinations_generations WHERE is_confirmed = 1",
            [],
            |row| row.get(0)
        )?;
        
        let temp_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM pollinations_generations WHERE is_confirmed = 0 AND is_temp = 1",
            [],
            |row| row.get(0)
        )?;
        
        let collected_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM pollinations_generations WHERE is_collected = 1",
            [],
            |row| row.get(0)
        )?;
        
        Ok(serde_json::json!({
            "confirmed_count": confirmed_count,
            "temp_count": temp_count, 
            "collected_count": collected_count,
            "total_count": confirmed_count + temp_count
        }))
    }
}