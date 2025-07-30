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
    
    // 檢查是否需要多選
    let is_multiple = options.properties
        .as_ref()
        .map(|props| props.contains(&"multiSelections".to_string()))
        .unwrap_or(false);
    
    if is_multiple {
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