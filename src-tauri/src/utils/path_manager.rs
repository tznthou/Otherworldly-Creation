/// Genesis Chronicle 統一路徑管理模組
/// 
/// 提供跨平台、環境區分的路徑管理功能
/// - 自動檢測開發/生產環境
/// - Mac/Windows 路徑自動適配
/// - 集中管理所有應用程式路徑

use std::path::PathBuf;
use std::env;

pub struct PathManager;

impl PathManager {
    /// 檢測是否為開發環境
    /// 
    /// 檢測邏輯：
    /// 1. 執行檔路徑包含 target/debug
    /// 2. 環境變數 TAURI_DEV 存在
    /// 3. 環境變數 NODE_ENV=development
    pub fn is_development() -> bool {
        // 1. 檢查執行檔路徑
        if let Ok(exe_path) = env::current_exe() {
            if let Some(path_str) = exe_path.to_str() {
                if path_str.contains("/target/debug/") || 
                   path_str.contains("\\target\\debug\\") {
                    log::info!("檢測到開發環境：執行檔路徑包含 debug");
                    return true;
                }
            }
        }
        
        // 2. 檢查環境變數
        let is_dev = env::var("NODE_ENV").map(|v| v == "development").unwrap_or(false) ||
                     env::var("TAURI_DEV").is_ok();
        
        if is_dev {
            log::info!("檢測到開發環境：環境變數");
        } else {
            log::info!("檢測到生產環境");
        }
        
        is_dev
    }
    
    /// 取得 AI 圖片儲存目錄
    /// 
    /// 開發環境：專案根目錄/generated-images
    /// 生產環境：
    /// - macOS: ~/Library/Application Support/genesis-chronicle/images
    /// - Windows: %LOCALAPPDATA%\genesis-chronicle\images
    pub fn get_images_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let images_dir = if Self::is_development() {
            // 開發環境：src-tauri/generated-images (Tauri 應用結構)
            env::current_dir()?.join("src-tauri").join("generated-images")
        } else {
            // 生產環境：平台特定目錄
            #[cfg(target_os = "macos")]
            {
                dirs::data_dir()
                    .ok_or("無法獲取 macOS 資料目錄")?
                    .join("genesis-chronicle")
                    .join("images")
            }
            #[cfg(target_os = "windows")]
            {
                // 🔧 修復：使用 data_dir() 而非 data_local_dir()
                // data_dir() = %APPDATA% (Roaming) 與實際存放位置一致
                dirs::data_dir()
                    .ok_or("無法獲取 Windows 資料目錄")?
                    .join("genesis-chronicle")
                    .join("images")
            }
            #[cfg(not(any(target_os = "macos", target_os = "windows")))]
            {
                dirs::data_local_dir()
                    .ok_or("無法獲取資料目錄")?
                    .join("genesis-chronicle")
                    .join("images")
            }
        };
        
        log::info!("圖片目錄: {:?} (開發環境: {})", images_dir, Self::is_development());
        
        // 確保目錄存在
        if !images_dir.exists() {
            std::fs::create_dir_all(&images_dir)?;
            log::info!("已創建圖片目錄: {:?}", images_dir);
        }
        
        Ok(images_dir)
    }
    
    /// 取得垃圾桶目錄（軟刪除圖片存放處）
    /// 
    /// 開發環境：專案根目錄/deleted-images
    /// 生產環境：
    /// - macOS: ~/Library/Application Support/genesis-chronicle/deleted-images
    /// - Windows: %LOCALAPPDATA%\genesis-chronicle\deleted-images
    pub fn get_trash_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let trash_dir = if Self::is_development() {
            // 開發環境：src-tauri/deleted-images (Tauri 應用結構)
            env::current_dir()?.join("src-tauri").join("deleted-images")
        } else {
            // 生產環境：平台特定目錄
            #[cfg(target_os = "macos")]
            {
                dirs::data_dir()
                    .ok_or("無法獲取 macOS 資料目錄")?
                    .join("genesis-chronicle")
                    .join("deleted-images")
            }
            #[cfg(target_os = "windows")]
            {
                // 🔧 修復：使用 data_dir() 保持與圖片目錄一致
                dirs::data_dir()
                    .ok_or("無法獲取 Windows 資料目錄")?
                    .join("genesis-chronicle")
                    .join("deleted-images")
            }
            #[cfg(not(any(target_os = "macos", target_os = "windows")))]
            {
                dirs::data_local_dir()
                    .ok_or("無法獲取資料目錄")?
                    .join("genesis-chronicle")
                    .join("deleted-images")
            }
        };
        
        log::info!("垃圾桶目錄: {:?} (開發環境: {})", trash_dir, Self::is_development());
        
        // 確保目錄存在
        if !trash_dir.exists() {
            std::fs::create_dir_all(&trash_dir)?;
            log::info!("已創建垃圾桶目錄: {:?}", trash_dir);
        }
        
        Ok(trash_dir)
    }
    
    /// 取得資料庫路徑
    /// 
    /// 開發環境：專案根目錄/genesis-chronicle-dev.db
    /// 生產環境：
    /// - macOS: ~/Library/Application Support/genesis-chronicle/genesis-chronicle.db
    /// - Windows: %LOCALAPPDATA%\genesis-chronicle\genesis-chronicle.db
    pub fn get_database_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let db_path = if Self::is_development() {
            // 開發環境：專案根目錄/genesis-chronicle-dev.db
            env::current_dir()?.join("genesis-chronicle-dev.db")
        } else {
            // 生產環境：平台特定目錄
            #[cfg(target_os = "macos")]
            {
                let data_dir = dirs::data_dir()
                    .ok_or("無法獲取 macOS 資料目錄")?
                    .join("genesis-chronicle");
                    
                // 確保目錄存在
                std::fs::create_dir_all(&data_dir)?;
                data_dir.join("genesis-chronicle.db")
            }
            #[cfg(target_os = "windows")]
            {
                // 🔧 修復：使用 data_dir() 與圖片目錄保持一致
                let data_dir = dirs::data_dir()
                    .ok_or("無法獲取 Windows 資料目錄")?
                    .join("genesis-chronicle");

                // 確保目錄存在
                std::fs::create_dir_all(&data_dir)?;
                data_dir.join("genesis-chronicle.db")
            }
            #[cfg(not(any(target_os = "macos", target_os = "windows")))]
            {
                let data_dir = dirs::data_local_dir()
                    .ok_or("無法獲取資料目錄")?
                    .join("genesis-chronicle");
                    
                // 確保目錄存在
                std::fs::create_dir_all(&data_dir)?;
                data_dir.join("genesis-chronicle.db")
            }
        };
        
        log::info!("資料庫路徑: {:?} (開發環境: {})", db_path, Self::is_development());
        Ok(db_path)
    }
    
    /// 取得下載目錄（PDF、EPUB 輸出）
    pub fn get_downloads_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let downloads_dir = dirs::download_dir()
            .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
            
        log::info!("下載目錄: {:?}", downloads_dir);
        Ok(downloads_dir)
    }
    
    /// 取得臨時目錄
    pub fn get_temp_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let temp_dir = if Self::is_development() {
            env::current_dir()?.join("src-tauri").join("temp")
        } else {
            dirs::cache_dir()
                .ok_or("無法獲取快取目錄")?
                .join("genesis-chronicle")
                .join("temp")
        };
        
        if !temp_dir.exists() {
            std::fs::create_dir_all(&temp_dir)?;
        }
        
        log::info!("臨時目錄: {:?}", temp_dir);
        Ok(temp_dir)
    }
}

/// 測試用途：取得所有路徑資訊
pub fn get_all_paths_info() -> serde_json::Value {
    use serde_json::json;
    
    json!({
        "is_development": PathManager::is_development(),
        "images_dir": PathManager::get_images_dir()
            .ok()
            .map(|p| p.to_string_lossy().to_string()),
        "trash_dir": PathManager::get_trash_dir()
            .ok()
            .map(|p| p.to_string_lossy().to_string()),
        "database_path": PathManager::get_database_path()
            .ok()
            .map(|p| p.to_string_lossy().to_string()),
        "downloads_dir": PathManager::get_downloads_dir()
            .ok()
            .map(|p| p.to_string_lossy().to_string()),
        "temp_dir": PathManager::get_temp_dir()
            .ok()
            .map(|p| p.to_string_lossy().to_string()),
    })
}