use std::path::PathBuf;
use std::error::Error;

/// 跨平台路徑管理工具
/// 
/// 這個模組統一處理所有圖片相關的路徑邏輯，確保在 Windows、macOS 等不同平台上的一致性
/// 
/// 路徑策略：
/// - 開發環境：使用專案目錄下的 src-tauri/generated-images
/// - 生產環境：使用系統標準位置 (~/.local/share 或 AppData)
/// - 臨時和最終目錄使用相同的基礎路徑邏輯
/// - 資料庫儲存相對路徑格式：src-tauri/generated-images/xxx.jpg

/// 判斷是否為開發環境
///
/// 優先級：
/// 1. 檢查 TAURI_ENV 環境變數
/// 2. 檢查 NODE_ENV 環境變數
/// 3. 檢查執行檔路徑是否包含 debug 目錄
/// 4. Windows特定檢查
pub fn is_development_environment() -> bool {
    // 優先檢查 TAURI_ENV（最可靠）
    if let Ok(env) = std::env::var("TAURI_ENV") {
        log::debug!("[PathUtils] TAURI_ENV = {}", env);
        return env == "development";
    }

    // 備用：檢查 NODE_ENV
    if let Ok(env) = std::env::var("NODE_ENV") {
        log::debug!("[PathUtils] NODE_ENV = {}", env);
        return env == "development";
    }

    // 檢查執行檔路徑
    if let Ok(exe_path) = std::env::current_exe() {
        let path_str = exe_path.to_string_lossy();
        log::debug!("[PathUtils] 執行檔路徑: {}", path_str);

        // 支援 Windows 和 Unix 路徑分隔符
        let is_debug = path_str.contains("target/debug") ||
                      path_str.contains("target\\debug");

        if is_debug {
            return true;
        }

        // Windows特定檢查：檢查是否在 .exe 檔名中包含 dev 或 debug
        #[cfg(target_os = "windows")]
        {
            if path_str.to_lowercase().contains("debug") ||
               path_str.to_lowercase().contains("dev") {
                log::debug!("[PathUtils] Windows開發模式檢測: 路徑包含debug/dev");
                return true;
            }
        }
    }

    // 最後檢查：檢查當前工作目錄是否在專案根目錄
    if let Ok(current_dir) = std::env::current_dir() {
        let current_path = current_dir.to_string_lossy();
        log::debug!("[PathUtils] 當前工作目錄: {}", current_path);

        // 如果工作目錄包含 src-tauri，很可能是開發環境
        if current_path.contains("src-tauri") || current_dir.join("src-tauri").exists() {
            log::debug!("[PathUtils] 檢測到src-tauri目錄，判定為開發環境");
            return true;
        }
    }

    log::debug!("[PathUtils] 判定為生產環境");
    false
}

/// 獲取 src-tauri 目錄（開發環境專用）
///
/// 不依賴當前工作目錄。工作目錄會隨啟動方式改變（`cargo tauri dev` 為 src-tauri，
/// 從專案根手動啟動則為專案根），用它算路徑會讓資料落在兩個不同位置。
///
/// 三層定位，每層都用 Cargo.toml 驗證，確認找到的是真正的 src-tauri：
/// 1. 執行檔位置往上找（主要路徑，與工作目錄無關）
/// 2. 工作目錄本身就是 src-tauri（`cargo tauri dev` / `cargo test`）
/// 3. 工作目錄下有 src-tauri（從專案根啟動）
///
/// 保留 2、3 兩層後備是因為環境判定並非完全可靠——例如 Windows 上若殘留
/// `NODE_ENV=development`，安裝版也會被判成開發環境。直接回傳 Err 會讓功能整個壞掉，
/// 留後備至少能繼續運作。驗證 Cargo.toml 則確保後備不會退回舊的巢狀路徑問題。
pub fn get_src_tauri_dir() -> Result<PathBuf, Box<dyn Error>> {
    let is_src_tauri = |p: &std::path::Path| p.join("Cargo.toml").is_file();

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(dir) = exe_path
            .ancestors()
            .map(|p| p.join("src-tauri"))
            .find(|p| is_src_tauri(p))
        {
            return Ok(dir);
        }
    }

    let current_dir = std::env::current_dir()?;

    if current_dir.file_name() == Some(std::ffi::OsStr::new("src-tauri")) && is_src_tauri(&current_dir) {
        log::warn!("[PathUtils] 無法從執行檔定位 src-tauri，改用工作目錄: {:?}", current_dir);
        return Ok(current_dir);
    }

    let nested = current_dir.join("src-tauri");
    if is_src_tauri(&nested) {
        log::warn!("[PathUtils] 無法從執行檔定位 src-tauri，改用工作目錄下的: {:?}", nested);
        return Ok(nested);
    }

    Err(format!(
        "無法定位 src-tauri 目錄（執行檔: {:?}，工作目錄: {:?}）",
        std::env::current_exe().ok(),
        current_dir
    )
    .into())
}

/// 獲取圖片儲存的基礎目錄
///
/// 返回的路徑會根據開發/生產環境自動選擇：
/// - 開發環境：{project_root}/src-tauri/generated-images
/// - 生產環境：{data_dir}/genesis-chronicle/images
pub fn get_images_base_dir() -> Result<PathBuf, Box<dyn Error>> {
    let base_path = if is_development_environment() {
        // 開發環境：使用絕對路徑找到專案根目錄，避免工作目錄問題
        get_src_tauri_dir()?.join("generated-images")
    } else {
        // 生產環境：使用系統標準位置
        #[cfg(target_os = "windows")]
        {
            // Windows: 使用 AppData\Local
            dirs::data_local_dir()
                .ok_or("無法獲取Windows用戶資料目錄")?
                .join("genesis-chronicle")
                .join("generated-images")
        }
        #[cfg(not(target_os = "windows"))]
        {
            // macOS/Linux: 使用標準資料目錄
            dirs::data_dir()
                .ok_or("無法獲取用戶資料目錄")?
                .join("genesis-chronicle")
                .join("generated-images")
        }
    };
    
    // 確保目錄存在
    std::fs::create_dir_all(&base_path)?;
    
    log::info!("[PathUtils] 圖片基礎目錄: {:?} (開發環境: {}, 當前目錄: {:?})", 
        base_path, is_development_environment(), std::env::current_dir());
    
    Ok(base_path)
}

/// 獲取臨時圖片目錄
///
/// 臨時圖片在用戶確認前儲存在這裡
/// 🔧 修復：所有環境都分離臨時和最終目錄，防止資料丟失
pub fn get_temp_images_dir() -> Result<PathBuf, Box<dyn Error>> {
    let base_dir = get_images_base_dir()?;

    // 🔧 關鍵修復：開發和生產環境都使用 temp 子目錄分離臨時和最終圖片
    let temp_path = base_dir.join("temp");
    std::fs::create_dir_all(&temp_path)?;

    log::info!("[PathUtils] 臨時圖片目錄: {:?} (開發環境: {})", temp_path, is_development_environment());

    Ok(temp_path)
}

/// 獲取最終圖片目錄
/// 
/// 確認後的圖片儲存在這裡
pub fn get_final_images_dir() -> Result<PathBuf, Box<dyn Error>> {
    let final_dir = get_images_base_dir()?;
    
    // 確保目錄存在
    std::fs::create_dir_all(&final_dir)?;
    
    log::info!("[PathUtils] 最終圖片目錄: {:?}", final_dir);
    
    Ok(final_dir)
}

/// 將絕對路徑轉換為資料庫儲存用的檔名
/// 
/// 輸入: /path/to/project/src-tauri/generated-images/abc123.jpg
/// 輸出: abc123.jpg
/// 
/// 🔧 新策略：資料庫只存檔名，實際路徑由環境動態決定
/// 這徹底解決了開發/生產環境路徑不一致的問題
pub fn to_relative_path(_absolute_path: &PathBuf, image_id: &str) -> String {
    // 只返回檔名，不包含任何路徑資訊
    // 實際儲存路徑將由 get_images_base_dir() 根據環境自動決定
    format!("{}.jpg", image_id)
}

/// 從檔名獲取對應的完整絕對路徑
/// 
/// 輸入: abc123.jpg (只是檔名)
/// 輸出: 
/// - 開發環境: /project/src-tauri/generated-images/abc123.jpg
/// - 生產環境: /Users/.../Library/Application Support/genesis-chronicle/images/abc123.jpg
/// 
/// 🔧 新策略：根據環境動態計算完整路徑，自動適應開發/生產環境
pub fn from_relative_path(filename: &str) -> Result<PathBuf, Box<dyn Error>> {
    // filename 現在應該只是檔名，如 "abc123.jpg"
    // 如果還包含舊的路徑格式，先提取檔名
    let clean_filename = std::path::Path::new(filename)
        .file_name()
        .ok_or("無效的檔案名稱")?
        .to_string_lossy();
    
    // 根據當前環境動態計算基礎目錄，然後組合完整路徑
    let base_dir = get_images_base_dir()?;
    let absolute_path = base_dir.join(clean_filename.as_ref());
    
    log::debug!("[PathUtils] 檔名轉換: {} -> {:?}", filename, absolute_path);
    
    Ok(absolute_path)
}

/// 生成臨時圖片的完整檔案路徑
/// 
/// 為新生成的圖片建立臨時儲存路徑
pub fn get_temp_image_path(image_id: &str) -> Result<PathBuf, Box<dyn Error>> {
    let temp_dir = get_temp_images_dir()?;

    // 🔧 修復重複副檔名問題：檢查是否已有 .jpg 副檔名
    let filename = if image_id.ends_with(".jpg") {
        image_id.to_string()
    } else {
        format!("{}.jpg", image_id)
    };

    let full_path = temp_dir.join(filename);

    log::debug!("[PathUtils] 臨時圖片路徑: {:?}", full_path);

    Ok(full_path)
}

/// 生成最終圖片的完整檔案路徑
/// 
/// 為確認後的圖片建立最終儲存路徑
pub fn get_final_image_path(image_id: &str) -> Result<PathBuf, Box<dyn Error>> {
    let final_dir = get_final_images_dir()?;

    // 🔧 修復重複副檔名問題：檢查是否已有 .jpg 副檔名
    let filename = if image_id.ends_with(".jpg") {
        image_id.to_string()
    } else {
        format!("{}.jpg", image_id)
    };

    let full_path = final_dir.join(filename);

    log::debug!("[PathUtils] 最終圖片路徑: {:?}", full_path);

    Ok(full_path)
}

/// 檢查圖片檔案是否存在
/// 
/// 同時檢查臨時和最終位置
pub fn image_exists(image_id: &str) -> (bool, bool) {
    let temp_exists = get_temp_image_path(image_id)
        .map(|path| path.exists())
        .unwrap_or(false);
        
    let final_exists = get_final_image_path(image_id)
        .map(|path| path.exists())
        .unwrap_or(false);
    
    (temp_exists, final_exists)
}

/// 安全地移動檔案（跨平台相容）
/// 
/// 使用 copy + remove 的方式來確保跨檔案系統的相容性
pub fn move_file_safe(from: &PathBuf, to: &PathBuf) -> Result<(), Box<dyn Error>> {
    // 確保目標目錄存在
    if let Some(parent) = to.parent() {
        std::fs::create_dir_all(parent)?;
    }
    
    // 複製檔案
    std::fs::copy(from, to)?;
    
    // 驗證複製是否成功
    if !to.exists() {
        return Err(format!("檔案複製失敗: {:?} -> {:?}", from, to).into());
    }
    
    // 刪除原始檔案
    std::fs::remove_file(from)?;
    
    log::info!("[PathUtils] 檔案移動成功: {:?} -> {:?}", from, to);
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_environment_detection() {
        // 基本測試確保函數不會 panic
        let is_dev = is_development_environment();
        println!("Development environment: {}", is_dev);
    }
    
    #[test]
    fn test_relative_path_format() {
        let relative = to_relative_path(&PathBuf::new(), "test123");
        assert_eq!(relative, "test123.jpg");  // 🔧 現在只返回檔名
    }
    
    #[test]
    fn test_path_separation() {
        // 🔧 修復測試：確認臨時和最終目錄已正確分離（所有環境）
        if let (Ok(temp), Ok(final_dir)) = (get_temp_images_dir(), get_final_images_dir()) {
            // 現在所有環境中，臨時目錄都應該是最終目錄的 "temp" 子目錄
            assert_ne!(temp, final_dir, "臨時和最終目錄應該不同");
            assert!(temp.parent() == Some(&final_dir), "臨時目錄應該是最終目錄的子目錄");
            assert!(temp.file_name() == Some(std::ffi::OsStr::new("temp")), "臨時目錄名稱應該是 'temp'");
        }
    }

    /// 迴歸測試：src-tauri 目錄必須從執行檔推導，不得依賴工作目錄
    ///
    /// cargo test 的工作目錄就是 src-tauri，舊版 `current_dir().join("src-tauri")`
    /// 會推出不存在的 src-tauri/src-tauri，讓資料落在錯誤位置。
    #[test]
    fn test_src_tauri_dir_not_derived_from_cwd() {
        let src_tauri = get_src_tauri_dir().expect("應能從執行檔位置定位 src-tauri 目錄");

        assert!(
            src_tauri.file_name() == Some(std::ffi::OsStr::new("src-tauri")),
            "路徑結尾應為 src-tauri，實際為 {:?}",
            src_tauri
        );
        assert!(
            src_tauri.join("Cargo.toml").exists(),
            "src-tauri 下應有 Cargo.toml，實際路徑 {:?} 不是真正的 src-tauri（巢狀重複的徵兆）",
            src_tauri
        );
        assert!(
            !src_tauri.join("src-tauri").exists(),
            "不應存在巢狀的 src-tauri/src-tauri"
        );
    }
}
#[cfg(test)]
mod test {
    use super::*;
    
    #[test]
    fn test_path_conversion() {
        let result = from_relative_path("b329dbd6-66d5-4bb3-a737-89fbb1fa435d.jpg");
        println!("轉換結果: {:?}", result);
    }
}

