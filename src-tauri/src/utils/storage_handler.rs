use std::path::PathBuf;
use std::error::Error;
use crate::utils::path_utils::{
    get_temp_image_path, get_final_image_path, to_relative_path, move_file_safe
};

/// 統一的圖片儲存管理器
/// 
/// 這個模組統一處理所有圖片儲存操作，消除程式碼重複並提供一致的錯誤處理
/// 
/// 功能包括：
/// - 臨時圖片儲存
/// - 最終圖片儲存
/// - 檔案移動和驗證
/// - 跨平台相容的檔案操作

#[derive(Debug, Clone)]
pub struct ImageStorageResult {
    pub success: bool,
    pub file_path: String,
    pub relative_path: String,
    pub file_size: u64,
    pub message: String,
}

impl ImageStorageResult {
    pub fn success(file_path: String, relative_path: String, file_size: u64) -> Self {
        Self {
            success: true,
            file_path,
            relative_path,
            file_size,
            message: "圖片儲存成功".to_string(),
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            file_path: String::new(),
            relative_path: String::new(),
            file_size: 0,
            message,
        }
    }
}

/// 統一的圖片儲存處理器
pub struct StorageHandler;

impl StorageHandler {
    /// 儲存圖片到臨時目錄
    /// 
    /// 提供統一的臨時儲存邏輯，包含完整的錯誤處理和檔案驗證
    pub fn save_to_temp(image_data: &[u8], image_id: &str) -> Result<ImageStorageResult, Box<dyn Error>> {
        log::info!("[StorageHandler] 📥 儲存到臨時目錄: {} ({} bytes)", image_id, image_data.len());
        
        // 基本驗證
        if image_data.is_empty() {
            let error = "圖片數據為空".to_string();
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        if image_id.trim().is_empty() {
            let error = "圖片ID不能為空".to_string();
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        // 獲取臨時檔案路徑
        let temp_path = get_temp_image_path(image_id)?;
        
        log::debug!("[StorageHandler] 🎯 臨時路徑: {:?}", temp_path);
        
        // 寫入檔案
        std::fs::write(&temp_path, image_data).map_err(|e| {
            let error = format!("寫入臨時檔案失敗: {:?} - {}", temp_path, e);
            log::error!("[StorageHandler] ❌ {}", error);
            e
        })?;
        
        // 驗證檔案是否成功創建
        if !temp_path.exists() {
            let error = format!("臨時檔案創建失敗: {:?}", temp_path);
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        // 檢查檔案大小
        let file_size = std::fs::metadata(&temp_path)?.len();
        if file_size as usize != image_data.len() {
            let error = format!("檔案大小不一致 - 預期: {}, 實際: {}", image_data.len(), file_size);
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        let filename = format!("{}.jpg", image_id);  // 只返回檔名，前端通過 API 獲取完整路徑
        let relative_path = to_relative_path(&temp_path, image_id);

        log::info!("[StorageHandler] ✅ 臨時儲存成功: {} bytes (返回檔名: {})", file_size, filename);

        Ok(ImageStorageResult::success(filename, relative_path, file_size))
    }
    
    /// 儲存圖片到最終目錄
    /// 
    /// 直接儲存到最終位置，用於不需要臨時預覽的場景
    pub fn save_to_final(image_data: &[u8], image_id: &str) -> Result<ImageStorageResult, Box<dyn Error>> {
        log::info!("[StorageHandler] 📥 儲存到最終目錄: {} ({} bytes)", image_id, image_data.len());
        
        // 基本驗證
        if image_data.is_empty() {
            let error = "圖片數據為空".to_string();
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        if image_id.trim().is_empty() {
            let error = "圖片ID不能為空".to_string();
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        // 獲取最終檔案路徑
        let final_path = get_final_image_path(image_id)?;
        
        log::debug!("[StorageHandler] 🎯 最終路徑: {:?}", final_path);
        
        // 寫入檔案
        std::fs::write(&final_path, image_data).map_err(|e| {
            let error = format!("寫入最終檔案失敗: {:?} - {}", final_path, e);
            log::error!("[StorageHandler] ❌ {}", error);
            e
        })?;
        
        // 驗證檔案是否成功創建
        if !final_path.exists() {
            let error = format!("最終檔案創建失敗: {:?}", final_path);
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        // 檢查檔案大小
        let file_size = std::fs::metadata(&final_path)?.len();
        if file_size as usize != image_data.len() {
            let error = format!("檔案大小不一致 - 預期: {}, 實際: {}", image_data.len(), file_size);
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        let filename = format!("{}.jpg", image_id);  // 只返回檔名，前端通過 API 獲取完整路徑
        let relative_path = to_relative_path(&final_path, image_id);

        log::info!("[StorageHandler] ✅ 最終儲存成功: {} bytes (返回檔名: {})", file_size, filename);

        Ok(ImageStorageResult::success(filename, relative_path, file_size))
    }
    
    /// 將臨時圖片移動到最終目錄
    /// 
    /// 🔧 修復後：真正執行檔案移動，支援跨檔案系統操作
    pub fn move_temp_to_final(temp_path: &str, image_id: &str) -> Result<ImageStorageResult, Box<dyn Error>> {
        log::info!("[StorageHandler] 🔄 執行真實檔案移動: {} -> {}", temp_path, image_id);
        
        let temp_pathbuf = PathBuf::from(temp_path);
        let final_path = get_final_image_path(image_id)?;
        
        // 驗證臨時檔案存在
        if !temp_pathbuf.exists() {
            let error = format!("臨時檔案不存在: {:?}", temp_pathbuf);
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        // 🔧 核心修復: 移除錯誤的相同路徑檢查
        // 現在臨時和最終目錄已真正分離，總是需要執行實際的檔案移動
        
        // 使用安全的檔案移動
        move_file_safe(&temp_pathbuf, &final_path)?;
        
        // 驗證最終檔案
        if !final_path.exists() {
            let error = format!("最終檔案移動後不存在: {:?}", final_path);
            log::error!("[StorageHandler] ❌ {}", error);
            return Ok(ImageStorageResult::error(error));
        }
        
        let file_size = std::fs::metadata(&final_path)?.len();
        let filename = format!("{}.jpg", image_id);  // 只返回檔名，前端通過 API 獲取完整路徑
        let relative_path = to_relative_path(&final_path, image_id);

        log::info!("[StorageHandler] ✅ 檔案移動成功: {} bytes (返回檔名: {})", file_size, filename);

        Ok(ImageStorageResult::success(filename, relative_path, file_size))
    }
    
    /// 刪除臨時檔案
    /// 
    /// 安全地刪除臨時檔案，包含錯誤處理
    pub fn delete_temp_file(temp_path: &str) -> Result<bool, Box<dyn Error>> {
        log::info!("[StorageHandler] 🗑️ 刪除臨時檔案: {}", temp_path);
        
        let temp_pathbuf = PathBuf::from(temp_path);
        
        if !temp_pathbuf.exists() {
            log::warn!("[StorageHandler] ⚠️ 臨時檔案不存在，無需刪除: {:?}", temp_pathbuf);
            return Ok(true);
        }
        
        match std::fs::remove_file(&temp_pathbuf) {
            Ok(_) => {
                log::info!("[StorageHandler] ✅ 臨時檔案刪除成功");
                Ok(true)
            },
            Err(e) => {
                let error = format!("刪除臨時檔案失敗: {:?} - {}", temp_pathbuf, e);
                log::error!("[StorageHandler] ❌ {}", error);
                Err(error.into())
            }
        }
    }
    
    /// 檢查圖片是否存在
    /// 
    /// 檢查指定ID的圖片是否存在於臨時或最終位置
    pub fn check_image_exists(image_id: &str) -> Result<(bool, bool), Box<dyn Error>> {
        let temp_path = get_temp_image_path(image_id)?;
        let final_path = get_final_image_path(image_id)?;
        
        let temp_exists = temp_path.exists();
        let final_exists = final_path.exists();
        
        log::debug!("[StorageHandler] 🔍 圖片存在檢查 {}: 臨時={}, 最終={}", 
            image_id, temp_exists, final_exists);
        
        Ok((temp_exists, final_exists))
    }
    
    /// 清理過期的臨時檔案
    /// 
    /// 根據時間清理舊的臨時檔案
    pub fn cleanup_expired_temp_files(hours_ago: u64) -> Result<u32, Box<dyn Error>> {
        use std::time::{SystemTime, Duration};
        use crate::utils::path_utils::get_temp_images_dir;
        
        log::info!("[StorageHandler] 🧹 清理 {} 小時前的臨時檔案", hours_ago);
        
        let temp_dir = get_temp_images_dir()?;
        let cutoff_time = SystemTime::now() - Duration::from_secs(hours_ago * 3600);
        let mut cleaned_count = 0;
        
        if let Ok(entries) = std::fs::read_dir(&temp_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    // 🔥 修復：使用修改時間而不是建立時間，避免誤刪今天的圖片
                    if let Ok(modified) = metadata.modified() {
                        if modified < cutoff_time {
                            if let Ok(_) = std::fs::remove_file(entry.path()) {
                                cleaned_count += 1;
                                log::debug!("[StorageHandler] 🗑️ 清理過期檔案: {:?} (修改時間: {:?})",
                                           entry.path(), modified);
                            }
                        } else {
                            log::debug!("[StorageHandler] 📄 保留檔案: {:?} (修改時間: {:?}, 截止時間: {:?})",
                                       entry.path(), modified, cutoff_time);
                        }
                    }
                }
            }
        }
        
        log::info!("[StorageHandler] ✅ 清理完成，共清理 {} 個過期臨時檔案", cleaned_count);
        
        Ok(cleaned_count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_storage_result_creation() {
        let success = ImageStorageResult::success(
            "/test/path.jpg".to_string(),
            "src-tauri/generated-images/test.jpg".to_string(),
            1024
        );
        
        assert!(success.success);
        assert_eq!(success.file_size, 1024);
        assert!(!success.message.is_empty());
        
        let error = ImageStorageResult::error("測試錯誤".to_string());
        assert!(!error.success);
        assert_eq!(error.file_size, 0);
        assert_eq!(error.message, "測試錯誤");
    }
    
    #[test]
    fn test_empty_data_validation() {
        let result = StorageHandler::save_to_temp(&[], "test123");
        assert!(result.is_ok());
        
        let storage_result = result.unwrap();
        assert!(!storage_result.success);
        assert!(storage_result.message.contains("圖片數據為空"));
    }
    
    #[test]
    fn test_empty_id_validation() {
        let dummy_data = vec![1, 2, 3, 4];
        let result = StorageHandler::save_to_temp(&dummy_data, "");
        assert!(result.is_ok());
        
        let storage_result = result.unwrap();
        assert!(!storage_result.success);
        assert!(storage_result.message.contains("圖片ID不能為空"));
    }
}