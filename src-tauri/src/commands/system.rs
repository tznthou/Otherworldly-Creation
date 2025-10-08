use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateCheckResult {
    #[serde(rename = "hasUpdate")]
    pub has_update: bool,
    #[serde(rename = "currentVersion")]
    pub current_version: String,
    #[serde(rename = "latestVersion")]
    pub latest_version: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SaveDialogOptions {
    pub title: Option<String>,
    #[serde(rename = "defaultPath")]
    pub default_path: Option<String>,
    pub filters: Option<Vec<DialogFilter>>,
}

#[derive(Serialize, Deserialize)]
pub struct OpenDialogOptions {
    pub title: Option<String>,
    pub filters: Option<Vec<DialogFilter>>,
    pub properties: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize)]
pub struct SaveDialogResult {
    pub canceled: bool,
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct OpenDialogResult {
    pub canceled: bool,
    #[serde(rename = "filePaths")]
    pub file_paths: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EnvironmentInfo {
    #[serde(rename = "isDevelopment")]
    pub is_development: bool,
    #[serde(rename = "imagesDir")]
    pub images_dir: String,
    pub platform: String,
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub async fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub async fn reload_app(window: tauri::Window) -> Result<(), String> {
    // 在 Tauri v2 中使用 emit 來觸發前端的重載
    window.emit("reload-app", ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_save_dialog(
    app: AppHandle,
    options: SaveDialogOptions,
) -> Result<SaveDialogResult, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::{Arc, Mutex};
    
    let mut builder = app.dialog().file();
    
    if let Some(title) = options.title {
        builder = builder.set_title(&title);
    }
    
    if let Some(default_path) = options.default_path {
        builder = builder.set_file_name(&default_path);
    }
    
    if let Some(filters) = options.filters {
        for filter in filters {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&filter.name, &extensions);
        }
    }
    
    let result = Arc::new(Mutex::new(None));
    let result_clone = Arc::clone(&result);
    
    builder.save_file(move |file_path| {
        *result_clone.lock().unwrap() = Some(file_path);
    });
    
    // 等待結果
    loop {
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        let guard = result.lock().unwrap();
        if guard.is_some() {
            let file_path = guard.clone().unwrap();
            break match file_path {
                Some(path) => Ok(SaveDialogResult {
                    canceled: false,
                    file_path: Some(path.to_string()),
                }),
                None => Ok(SaveDialogResult {
                    canceled: true,
                    file_path: None,
                }),
            };
        }
    }
}

#[tauri::command]
pub async fn show_open_dialog(
    app: AppHandle,
    options: OpenDialogOptions,
) -> Result<OpenDialogResult, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::{Arc, Mutex};
    
    let mut builder = app.dialog().file();
    
    if let Some(title) = options.title {
        builder = builder.set_title(&title);
    }
    
    if let Some(filters) = options.filters {
        for filter in filters {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&filter.name, &extensions);
        }
    }
    
    // 檢查是否是目錄選擇
    let is_directory = options.properties
        .as_ref()
        .map(|props| props.contains(&"openDirectory".to_string()))
        .unwrap_or(false);

    // 檢查是否需要多選
    let is_multiple = options.properties
        .as_ref()
        .map(|props| props.contains(&"multiSelections".to_string()))
        .unwrap_or(false);

    if is_directory {
        // 目錄選擇
        let result = Arc::new(Mutex::new(None));
        let result_clone = Arc::clone(&result);

        builder.pick_folder(move |folder_path| {
            *result_clone.lock().unwrap() = Some(folder_path);
        });

        // 等待結果
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            let guard = result.lock().unwrap();
            if guard.is_some() {
                let folder_path = guard.clone().unwrap();
                break match folder_path {
                    Some(path) => Ok(OpenDialogResult {
                        canceled: false,
                        file_paths: Some(vec![path.to_string()]),
                    }),
                    None => Ok(OpenDialogResult {
                        canceled: true,
                        file_paths: None,
                    }),
                };
            }
        }
    } else if is_multiple {
        let result = Arc::new(Mutex::new(None));
        let result_clone = Arc::clone(&result);
        
        builder.pick_files(move |file_paths| {
            *result_clone.lock().unwrap() = Some(file_paths);
        });
        
        // 等待結果
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            let guard = result.lock().unwrap();
            if guard.is_some() {
                let file_paths = guard.clone().unwrap();
                break match file_paths {
                    Some(paths) => Ok(OpenDialogResult {
                        canceled: false,
                        file_paths: Some(paths.iter().map(|p| p.to_string()).collect()),
                    }),
                    None => Ok(OpenDialogResult {
                        canceled: true,
                        file_paths: None,
                    }),
                };
            }
        }
    } else {
        let result = Arc::new(Mutex::new(None));
        let result_clone = Arc::clone(&result);
        
        builder.pick_file(move |file_path| {
            *result_clone.lock().unwrap() = Some(file_path);
        });
        
        // 等待結果
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            let guard = result.lock().unwrap();
            if guard.is_some() {
                let file_path = guard.clone().unwrap();
                break match file_path {
                    Some(path) => Ok(OpenDialogResult {
                        canceled: false,
                        file_paths: Some(vec![path.to_string()]),
                    }),
                    None => Ok(OpenDialogResult {
                        canceled: true,
                        file_paths: None,
                    }),
                };
            }
        }
    }
}

#[tauri::command]
pub async fn open_external(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    
    app.opener()
        .open_url(url, None::<String>)
        .map_err(|e| format!("Failed to open external URL: {}", e))
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    
    // 模擬檢查更新過程
    tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
    
    match fetch_latest_version().await {
        Ok(latest_version) => {
            let has_update = compare_versions(&current_version, &latest_version);
            Ok(UpdateCheckResult {
                has_update,
                current_version,
                latest_version: Some(latest_version),
                error: None,
            })
        }
        Err(error) => {
            Ok(UpdateCheckResult {
                has_update: false,
                current_version,
                latest_version: None,
                error: Some(error),
            })
        }
    }
}

#[tauri::command]
pub async fn download_update() -> Result<String, String> {
    Err("Tauri 版本的更新下載功能尚未實現".to_string())
}

#[tauri::command]
pub async fn install_update() -> Result<(), String> {
    Err("Tauri 版本的更新安裝功能尚未實現".to_string())
}

#[tauri::command]
pub async fn set_auto_update(_enabled: bool) -> Result<(), String> {
    Ok(()) // Tauri 版本暫時不實現自動更新設定
}

// 輔助函數：獲取最新版本
async fn fetch_latest_version() -> Result<String, String> {
    use reqwest;
    
    let client = reqwest::Client::new();
    
    match client
        .get("https://api.github.com/repos/genesis-chronicle/genesis-chronicle/releases/latest")
        .header("User-Agent", format!("genesis-chronicle/{}", env!("CARGO_PKG_VERSION")))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(json) => {
                        if let Some(tag_name) = json.get("tag_name").and_then(|v| v.as_str()) {
                            // 移除 'v' 前綴（如果存在）
                            let version = tag_name.strip_prefix('v').unwrap_or(tag_name);
                            Ok(version.to_string())
                        } else {
                            Err("無法解析版本信息".to_string())
                        }
                    }
                    Err(_) => Err("無法解析 GitHub API 響應".to_string()),
                }
            } else {
                match response.status().as_u16() {
                    404 => Err("此專案尚未在 GitHub 發佈正式版本".to_string()),
                    403 => Err("GitHub API 請求頻率限制，請稍後再試".to_string()),
                    _ => Err(format!("GitHub API 請求失敗: {}", response.status()))
                }
            }
        }
        Err(e) => {
            log::warn!("檢查更新失敗: {}", e);
            Err("無法連接到更新服務器".to_string())
        }
    }
}

// 輔助函數：比較版本號
fn compare_versions(current: &str, latest: &str) -> bool {
    fn parse_version(version: &str) -> Vec<u32> {
        version
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect()
    }
    
    let current_parts = parse_version(current);
    let latest_parts = parse_version(latest);
    
    for i in 0..std::cmp::max(current_parts.len(), latest_parts.len()) {
        let current_part = current_parts.get(i).unwrap_or(&0);
        let latest_part = latest_parts.get(i).unwrap_or(&0);
        
        if latest_part > current_part {
            return true;
        } else if latest_part < current_part {
            return false;
        }
    }
    
    false
}

#[tauri::command]
pub async fn read_image_as_base64(image_path: String) -> Result<String, String> {
    use std::fs;
    use base64::{Engine, engine::general_purpose};
    use crate::utils::path_utils::get_final_image_path;

    log::info!("[read_image_as_base64] 讀取圖片文件: {}", image_path);

    // 獲取完整路徑
    let full_path = match get_final_image_path(&image_path) {
        Ok(path) => path,
        Err(e) => {
            let error_msg = format!("無法解析圖片路徑: {} - {}", image_path, e);
            log::error!("[read_image_as_base64] {}", error_msg);
            return Err(error_msg);
        }
    };
    log::info!("[read_image_as_base64] 完整路徑: {}", full_path.display());

    // 檢查文件是否存在
    if !full_path.exists() {
        let error_msg = format!("圖片文件不存在: {}", full_path.display());
        log::error!("[read_image_as_base64] {}", error_msg);
        return Err(error_msg);
    }

    // 讀取文件為字節
    match fs::read(&full_path) {
        Ok(bytes) => {
            // 轉換為 base64
            let base64_string = general_purpose::STANDARD.encode(&bytes);
            log::info!("[read_image_as_base64] 文件讀取成功，大小: {} bytes, base64 長度: {}", bytes.len(), base64_string.len());
            Ok(base64_string)
        },
        Err(e) => {
            let error_msg = format!("無法讀取圖片文件: {} - {}", full_path.display(), e);
            log::error!("[read_image_as_base64] {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn get_image_path(filename: String) -> Result<String, String> {
    use crate::utils::path_utils;

    log::info!("[get_image_path] 請求圖片路徑: {}", filename);

    match path_utils::from_relative_path(&filename) {
        Ok(path) => {
            // 🔧 Windows兼容性修復：統一路徑分隔符為正斜線
            let path_str = path.to_string_lossy()
                .replace('\\', "/")  // 確保convertFileSrc在Windows上正常工作
                .to_string();
            log::info!("[get_image_path] 返回路徑: {}", path_str);
            Ok(path_str)
        },
        Err(e) => {
            let error_msg = format!("無法解析圖片路徑 {}: {}", filename, e);
            log::error!("[get_image_path] {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn get_environment_info() -> Result<EnvironmentInfo, String> {
    use crate::utils::path_utils;

    let is_development = path_utils::is_development_environment();

    match path_utils::get_images_base_dir() {
        Ok(images_dir) => {
            let result = EnvironmentInfo {
                is_development,
                images_dir: images_dir.to_string_lossy().to_string(),
                platform: std::env::consts::OS.to_string(),
            };

            log::info!("[get_environment_info] 環境資訊: {:?}", result);
            Ok(result)
        },
        Err(e) => {
            let error_msg = format!("無法獲取圖片目錄: {}", e);
            log::error!("[get_environment_info] {}", error_msg);
            Err(error_msg)
        }
    }
}

/* 暫時禁用以驗證 keyring 是否為問題根源
/// 🔐 取得加密設定
#[tauri::command]
pub async fn get_secure_key(key: String) -> Result<Option<String>, String> {
    use crate::services::keyring_service::KeyringService;

    log::info!("🔐 [get_secure_key] 讀取加密設定: {}", key);

    match KeyringService::get_secure_key(&key) {
        Ok(value) => {
            log::info!("🔐 [get_secure_key] 成功讀取: {}", key);
            Ok(value)
        }
        Err(e) => {
            log::warn!("🔐 [get_secure_key] 讀取失敗 (將降級到 localStorage): {} - {}", key, e);
            Ok(None)
        }
    }
}

/// 🔐 設定加密設定
#[tauri::command]
pub async fn set_secure_key(key: String, value: String) -> Result<(), String> {
    use crate::services::keyring_service::KeyringService;

    log::info!("🔐 [set_secure_key] 寫入加密設定: {}", key);

    match KeyringService::set_secure_key(&key, &value) {
        Ok(()) => {
            log::info!("🔐 [set_secure_key] 成功寫入: {}", key);
            Ok(())
        }
        Err(e) => {
            log::error!("🔐 [set_secure_key] 寫入失敗: {} - {}", key, e);
            Err(format!("無法寫入加密設定: {}", e))
        }
    }
}

/// 🔐 刪除加密設定
#[tauri::command]
pub async fn delete_secure_key(key: String) -> Result<(), String> {
    use crate::services::keyring_service::KeyringService;

    log::info!("🔐 [delete_secure_key] 刪除加密設定: {}", key);

    match KeyringService::delete_secure_key(&key) {
        Ok(()) => {
            log::info!("🔐 [delete_secure_key] 成功刪除: {}", key);
            Ok(())
        }
        Err(e) => {
            log::warn!("🔐 [delete_secure_key] 刪除失敗 (可能不存在): {} - {}", key, e);
            Ok(())
        }
    }
}
*/

/// 🔐 診斷 Tauri Store 功能
#[tauri::command]
pub async fn test_store_plugin(app: AppHandle) -> Result<String, String> {
    use tauri_plugin_store::StoreExt;
    use std::fs;

    log::info!("🧪 [test_store_plugin] 開始測試 Tauri Store 功能...");

    let mut results = Vec::new();

    // 1. 測試 Store 初始化
    results.push("步驟 1: 測試 Store 初始化".to_string());
    let store = match app.store(".settings-test.dat") {
        Ok(s) => {
            results.push("✅ Store 初始化成功".to_string());
            s
        }
        Err(e) => {
            let error = format!("❌ Store 初始化失敗: {}", e);
            results.push(error.clone());
            log::error!("🧪 [test_store_plugin] {}", error);
            return Ok(results.join("\n"));
        }
    };

    // 2. 測試寫入
    results.push("\n步驟 2: 測試寫入數據".to_string());
    store.set("test-key".to_string(), serde_json::json!({ "message": "Hello from Store!" }));
    results.push("✅ 寫入數據成功".to_string());

    // 3. 測試儲存
    results.push("\n步驟 3: 測試儲存到檔案".to_string());
    if let Err(e) = store.save() {
        let error = format!("❌ 儲存失敗: {}", e);
        results.push(error.clone());
        log::error!("🧪 [test_store_plugin] {}", error);
        return Ok(results.join("\n"));
    }
    results.push("✅ 儲存到檔案成功".to_string());

    // 4. 測試讀取
    results.push("\n步驟 4: 測試讀取數據".to_string());
    match store.get("test-key") {
        Some(value) => {
            results.push(format!("✅ 讀取數據成功: {}", value));
        }
        None => {
            results.push("⚠️ 數據不存在（可能是 bug）".to_string());
        }
    }

    // 5. 檢查檔案位置
    results.push("\n步驟 5: 檢查檔案位置".to_string());

    // 獲取 app data directory (使用標準方法)
    let app_data_dir = dirs::data_dir()
        .ok_or("無法獲取 app data dir".to_string())?
        .join("genesis-chronicle");

    results.push(format!("📁 App Data Dir: {}", app_data_dir.display()));

    // 確保目錄存在
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("無法創建目錄: {}", e))?;
    }

    let store_file = app_data_dir.join(".settings-test.dat");
    if store_file.exists() {
        results.push(format!("✅ 檔案已建立: {}", store_file.display()));
    } else {
        results.push(format!("⚠️ 檔案不存在: {}", store_file.display()));
    }

    log::info!("🧪 [test_store_plugin] 測試完成");
    Ok(results.join("\n"))
}

#[tauri::command]
pub async fn save_export_file(
    data_url: String,
    output_path: String
) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    use base64::{Engine, engine::general_purpose};

    // 展開路徑中的波浪號
    let expanded_path = if output_path.starts_with("~/") {
        match dirs::home_dir() {
            Some(home) => output_path.replacen("~", &home.to_string_lossy(), 1),
            None => {
                let error_msg = "無法獲取用戶主目錄".to_string();
                log::error!("[save_export_file] {}", error_msg);
                return Err(error_msg);
            }
        }
    } else {
        output_path.clone()
    };

    log::info!("[save_export_file] 原始路徑: {}", output_path);
    log::info!("[save_export_file] 展開路徑: {}", expanded_path);

    // 解析 data URL
    if !data_url.starts_with("data:") {
        let error_msg = "無效的 data URL 格式".to_string();
        log::error!("[save_export_file] {}", error_msg);
        return Err(error_msg);
    }

    // 找到 base64 數據部分
    let parts: Vec<&str> = data_url.split(',').collect();
    if parts.len() != 2 {
        let error_msg = "data URL 格式錯誤".to_string();
        log::error!("[save_export_file] {}", error_msg);
        return Err(error_msg);
    }

    let base64_data = parts[1];

    // 解碼 base64 數據
    let decoded_data = match general_purpose::STANDARD.decode(base64_data) {
        Ok(data) => data,
        Err(e) => {
            let error_msg = format!("base64 解碼失敗: {}", e);
            log::error!("[save_export_file] {}", error_msg);
            return Err(error_msg);
        }
    };

    log::info!("[save_export_file] base64 解碼成功，數據大小: {} bytes", decoded_data.len());

    // 確保輸出目錄存在
    let output_path_obj = Path::new(&expanded_path);
    if let Some(parent) = output_path_obj.parent() {
        log::info!("[save_export_file] 創建目錄: {}", parent.display());
        if let Err(e) = fs::create_dir_all(parent) {
            let error_msg = format!("無法創建目錄 {}: {}", parent.display(), e);
            log::error!("[save_export_file] {}", error_msg);
            return Err(error_msg);
        }
        log::info!("[save_export_file] 目錄已確保存在: {}", parent.display());
    }

    // 寫入檔案
    match fs::write(&expanded_path, &decoded_data) {
        Ok(()) => {
            log::info!("[save_export_file] ✅ 檔案儲存成功: {} ({} bytes)", expanded_path, decoded_data.len());
            Ok(expanded_path)
        },
        Err(e) => {
            let error_msg = format!("檔案寫入失敗: {} - {}", expanded_path, e);
            log::error!("[save_export_file] ❌ {}", error_msg);
            Err(error_msg)
        }
    }
}