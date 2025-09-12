//! 圖片生成系統資料修復工具
//! 
//! 🔧 修復路徑分離後的資料一致性問題
//! 📊 掃描現有圖片並修正資料庫狀態

use std::error::Error;
use serde_json::Value;
use crate::database::connection::create_connection;
use crate::utils::path_utils::{get_images_base_dir, get_temp_images_dir, get_final_images_dir};
use log::{info, warn, error};

/// 資料修復結果
#[derive(Debug, Clone)]
pub struct RepairResult {
    pub success: bool,
    pub total_checked: u32,
    pub repaired_count: u32,
    pub moved_to_temp: u32,
    pub confirmed_count: u32,
    pub errors: Vec<String>,
    pub message: String,
}

impl RepairResult {
    pub fn success(total: u32, repaired: u32, moved: u32, confirmed: u32) -> Self {
        Self {
            success: true,
            total_checked: total,
            repaired_count: repaired,
            moved_to_temp: moved,
            confirmed_count: confirmed,
            errors: Vec::new(),
            message: format!("修復完成：檢查 {} 筆記錄，修復 {} 筆，移動 {} 張到臨時目錄，確認 {} 張", total, repaired, moved, confirmed),
        }
    }

    pub fn error(message: String, errors: Vec<String>) -> Self {
        Self {
            success: false,
            total_checked: 0,
            repaired_count: 0,
            moved_to_temp: 0,
            confirmed_count: 0,
            errors,
            message,
        }
    }
}

/// 執行完整的資料修復
/// 
/// 🔧 這個函數會：
/// 1. 掃描資料庫中的所有圖片記錄
/// 2. 檢查檔案實際位置與資料庫狀態是否一致
/// 3. 修正不一致的記錄
/// 4. 將未確認的圖片移動到臨時目錄
#[tauri::command]
pub async fn repair_image_paths() -> Result<Value, String> {
    info!("[DataRepair] 🔧 開始圖片路徑修復作業");
    
    let result = ImageDataRepairer::internal_repair_paths().await;
    
    match result {
        Ok(repair_result) => {
            if repair_result.success {
                info!("[DataRepair] ✅ 修復完成: {}", repair_result.message);
            } else {
                error!("[DataRepair] ❌ 修復失敗: {}", repair_result.message);
            }
            
            Ok(serde_json::json!({
                "success": repair_result.success,
                "total_checked": repair_result.total_checked,
                "repaired_count": repair_result.repaired_count,
                "moved_to_temp": repair_result.moved_to_temp,
                "confirmed_count": repair_result.confirmed_count,
                "errors": repair_result.errors,
                "message": repair_result.message
            }))
        },
        Err(e) => {
            error!("[DataRepair] 💥 修復過程發生錯誤: {}", e);
            Err(format!("修復失敗: {}", e))
        }
    }
}

/// 掃描孤立檔案（存在於檔案系統但不在資料庫中）
#[tauri::command]
pub async fn scan_orphaned_files() -> Result<Value, String> {
    info!("[DataRepair] 🔍 掃描孤立檔案");
    
    let result = ImageDataRepairer::internal_scan_orphaned().await;
    
    match result {
        Ok((orphaned_temp, orphaned_final)) => {
            info!("[DataRepair] 📊 發現孤立檔案: 臨時目錄 {} 個，最終目錄 {} 個", 
                orphaned_temp.len(), orphaned_final.len());
            
            Ok(serde_json::json!({
                "success": true,
                "orphaned_temp": orphaned_temp,
                "orphaned_final": orphaned_final,
                "message": format!("掃描完成：臨時目錄 {} 個孤立檔案，最終目錄 {} 個孤立檔案", 
                    orphaned_temp.len(), orphaned_final.len())
            }))
        },
        Err(e) => {
            error!("[DataRepair] 💥 掃描孤立檔案失敗: {}", e);
            Err(format!("掃描失敗: {}", e))
        }
    }
}

/// 圖片資料修復處理器
pub struct ImageDataRepairer;

impl ImageDataRepairer {
    /// 內部修復邏輯
    pub async fn internal_repair_paths() -> Result<RepairResult, Box<dyn Error>> {
        // 1. 確保目錄結構正確
        Self::ensure_directory_structure()?;
        
        // 2. 連接資料庫並立即收集所有記錄，避免跨 await 持有 Statement
        let records = {
            let conn = create_connection()?;
            let mut stmt = conn.prepare(
                "SELECT id, local_file_path, is_confirmed FROM pollinations_generations WHERE deleted_at IS NULL"
            )?;
            
            let image_records: Result<Vec<(String, String, bool)>, _> = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,  // id
                    row.get::<_, String>(1)?,  // local_file_path
                    row.get::<_, bool>(2)?     // is_confirmed
                ))
            })?.collect();
            
            image_records?
        }; // conn 和 stmt 在這裡被釋放
        
        let total_records = records.len() as u32;
        
        info!("[DataRepair] 📊 找到 {} 筆圖片記錄", total_records);
        
        let mut repaired_count = 0;
        let mut moved_to_temp = 0;
        let mut confirmed_count = 0;
        let mut errors = Vec::new();
        
        // 4. 逐一檢查和修復每筆記錄
        for (image_id, file_path, is_confirmed) in records {
            match Self::repair_single_record(&image_id, &file_path, is_confirmed).await {
                Ok(action) => {
                    match action.as_str() {
                        "repaired" => repaired_count += 1,
                        "moved_to_temp" => moved_to_temp += 1,
                        "confirmed" => confirmed_count += 1,
                        _ => {} // "no_action"
                    }
                },
                Err(e) => {
                    let error_msg = format!("修復圖片 {} 失敗: {}", image_id, e);
                    warn!("[DataRepair] ⚠️ {}", error_msg);
                    errors.push(error_msg);
                }
            }
        }
        
        // 5. 返回修復結果
        Ok(RepairResult::success(total_records, repaired_count, moved_to_temp, confirmed_count))
    }

    /// 確保目錄結構正確
    fn ensure_directory_structure() -> Result<(), Box<dyn Error>> {
        info!("[DataRepair] 🏗️ 確保目錄結構正確");
        
        let temp_dir = get_temp_images_dir()?;
        let final_dir = get_final_images_dir()?;
        
        info!("[DataRepair] 臨時目錄: {:?}", temp_dir);
        info!("[DataRepair] 最終目錄: {:?}", final_dir);
        
        // 確保兩個目錄都存在
        std::fs::create_dir_all(&temp_dir)?;
        std::fs::create_dir_all(&final_dir)?;
        
        info!("[DataRepair] ✅ 目錄結構確認完成");
        Ok(())
    }

    /// 修復單一記錄
    /// 
    /// 返回修復動作：
    /// - "no_action": 無需修復
    /// - "repaired": 已修復資料庫狀態
    /// - "moved_to_temp": 已移動到臨時目錄
    /// - "confirmed": 已確認到最終目錄
    async fn repair_single_record(
        image_id: &str, 
        file_path: &str, 
        is_confirmed: bool
    ) -> Result<String, Box<dyn Error>> {
        
        // 取得檔名（去除路徑部分）
        let filename = std::path::Path::new(file_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(file_path);
        
        let _base_dir = get_images_base_dir()?;
        let temp_dir = get_temp_images_dir()?;
        let final_dir = get_final_images_dir()?;
        
        let temp_path = temp_dir.join(filename);
        let final_path = final_dir.join(filename);
        
        // 檢查檔案實際位置
        let temp_exists = temp_path.exists();
        let final_exists = final_path.exists();
        
        info!("[DataRepair] 檢查 {}: temp={}, final={}, is_confirmed={}", 
            image_id, temp_exists, final_exists, is_confirmed);
        
        match (temp_exists, final_exists, is_confirmed) {
            // 情況1: 檔案在臨時目錄，資料庫標記為未確認 - 正確狀態
            (true, false, false) => {
                info!("[DataRepair] ✅ {} 狀態正確（臨時+未確認）", image_id);
                Ok("no_action".to_string())
            },
            
            // 情況2: 檔案在最終目錄，資料庫標記為已確認 - 正確狀態
            (false, true, true) => {
                info!("[DataRepair] ✅ {} 狀態正確（最終+已確認）", image_id);
                Ok("no_action".to_string())
            },
            
            // 情況3: 檔案在最終目錄，但資料庫標記為未確認 - 需要修復資料庫
            (false, true, false) => {
                info!("[DataRepair] 🔧 {} 檔案在最終目錄但未確認，修復資料庫狀態", image_id);
                Self::update_confirmation_status(image_id, true)?;
                Ok("repaired".to_string())
            },
            
            // 情況4: 檔案在臨時目錄，但資料庫標記為已確認 - 需要移動到最終目錄
            (true, false, true) => {
                info!("[DataRepair] 🔄 {} 資料庫已確認但檔案在臨時目錄，移動到最終目錄", image_id);
                std::fs::copy(&temp_path, &final_path)?;
                std::fs::remove_file(&temp_path)?;
                Ok("confirmed".to_string())
            },
            
            // 情況5: 檔案同時存在兩處 - 以最終目錄為準，刪除臨時檔案
            (true, true, _) => {
                info!("[DataRepair] 🧹 {} 檔案重複，刪除臨時檔案並確認最終狀態", image_id);
                std::fs::remove_file(&temp_path)?;
                if !is_confirmed {
                    Self::update_confirmation_status(image_id, true)?;
                }
                Ok("repaired".to_string())
            },
            
            // 情況6: 檔案不存在 - 記錄錯誤
            (false, false, _) => {
                let error_msg = format!("圖片檔案 {} 完全丟失", filename);
                warn!("[DataRepair] ⚠️ {}", error_msg);
                Err(error_msg.into())
            }
        }
    }

    /// 更新確認狀態
    fn update_confirmation_status(image_id: &str, is_confirmed: bool) -> Result<(), Box<dyn Error>> {
        let conn = create_connection()?;
        
        conn.execute(
            "UPDATE pollinations_generations SET is_confirmed = ?1 WHERE id = ?2",
            rusqlite::params![is_confirmed, image_id],
        )?;
        
        info!("[DataRepair] 🔄 已更新 {} 的確認狀態為 {}", image_id, is_confirmed);
        Ok(())
    }

    /// 內部掃描孤立檔案邏輯
    pub async fn internal_scan_orphaned() -> Result<(Vec<String>, Vec<String>), Box<dyn Error>> {
        // 獲取資料庫中所有的檔案名稱，避免跨 await 持有 Connection
        let db_filenames: std::collections::HashSet<String> = {
            let conn = create_connection()?;
            let mut stmt = conn.prepare("SELECT local_file_path FROM pollinations_generations WHERE deleted_at IS NULL")?;
            let db_files: Result<Vec<String>, _> = stmt.query_map([], |row| {
                let file_path: String = row.get(0)?;
                // 提取檔名
                let filename = std::path::Path::new(&file_path)
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or(&file_path)
                    .to_string();
                Ok(filename)
            })?.collect();
            
            db_files?.into_iter().collect()
        }; // conn 和 stmt 在這裡被釋放
        
        // 掃描實際的檔案系統
        let temp_dir = get_temp_images_dir()?;
        let final_dir = get_final_images_dir()?;
        
        let mut orphaned_temp = Vec::new();
        let mut orphaned_final = Vec::new();
        
        // 掃描臨時目錄
        if let Ok(entries) = std::fs::read_dir(&temp_dir) {
            for entry in entries.flatten() {
                if let Some(filename) = entry.file_name().to_str() {
                    if filename.ends_with(".jpg") && !db_filenames.contains(filename) {
                        orphaned_temp.push(filename.to_string());
                    }
                }
            }
        }
        
        // 掃描最終目錄
        if let Ok(entries) = std::fs::read_dir(&final_dir) {
            for entry in entries.flatten() {
                if let Some(filename) = entry.file_name().to_str() {
                    if filename.ends_with(".jpg") && !db_filenames.contains(filename) {
                        orphaned_final.push(filename.to_string());
                    }
                }
            }
        }
        
        Ok((orphaned_temp, orphaned_final))
    }
}