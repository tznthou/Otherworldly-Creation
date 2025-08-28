use serde_json::Value;
use std::{fs, time::Instant};
use crate::services::illustration::pollinations_api::{
    PollinationsApiService, PollinationsRequest, PollinationsModel
};
use crate::database::connection::create_connection;

/// 免費插畫生成到臨時目錄 - 供預覽使用
#[tauri::command]
#[allow(non_snake_case)]
pub async fn generate_free_illustration_to_temp(
    prompt: String,
    width: Option<u32>,
    height: Option<u32>,
    model: Option<String>,
    seed: Option<u32>,
    enhance: Option<bool>,
    style: Option<String>,
    projectId: Option<String>,
    characterId: Option<String>,
) -> Result<Value, String> {
    log::info!("[TempImageManager] 免費插畫生成到臨時目錄: {}", prompt);
    
    if prompt.trim().is_empty() {
        return Err("提示詞不能為空".to_string());
    }

    // 建立 Pollinations API 服務
    let service = PollinationsApiService::new()
        .map_err(|e| format!("Pollinations API 服務初始化失敗: {:?}", e))?;

    // 解析模型
    let pollinations_model = match model.as_deref().unwrap_or("flux") {
        "flux" => PollinationsModel::Flux,
        "gptimage" => PollinationsModel::GptImage,
        "kontext" => PollinationsModel::Kontext,
        "sdxl" => PollinationsModel::Sdxl,
        _ => PollinationsModel::Flux,
    };

    // 不再自動添加風格描述，使用原始prompt
    // 用戶可以在前端自行控制是否添加風格關鍵字
    let enhanced_prompt = prompt.clone();

    // 構建請求
    let request = PollinationsRequest {
        prompt: enhanced_prompt,
        width: width.or(Some(1024)),
        height: height.or(Some(1024)),
        model: Some(pollinations_model),
        seed,
        enhance: enhance.or(Some(false)),
        nologo: Some(true),
        transparent: Some(false),
        ..Default::default()
    };

    // 生成圖像
    match service.generate_image(request).await {
        Ok(response) => {
            log::info!("[TempImageManager] 免費插畫生成成功，耗時: {}ms", response.generation_time_ms);
            
            // 儲存圖像到臨時目錄
            let temp_path = save_temp_generated_image(&response.image_data, &response.id)
                .map_err(|e| format!("臨時圖像儲存失敗: {}", e))?;
            
            // 計算檔案大小
            let file_size = response.image_data.len() as i64;
            
            Ok(serde_json::json!({
                "success": true,
                "id": response.id,
                "prompt": response.prompt,
                "temp_path": temp_path,
                "image_url": response.image_url,
                "parameters": {
                    "model": response.parameters.model,
                    "width": response.parameters.width,
                    "height": response.parameters.height,
                    "seed": response.parameters.seed,
                    "enhance": response.parameters.enhance,
                    "style": style
                },
                "file_size_bytes": file_size,
                "generation_time_ms": response.generation_time_ms,
                "provider": "pollinations",
                "is_free": true,
                "is_temp": true,
                "project_id": projectId,
                "character_id": characterId,
                "original_prompt": prompt
            }))
        },
        Err(e) => {
            log::error!("[TempImageManager] 免費插畫生成失敗: {:?}", e);
            Err(format!("免費插畫生成失敗: {:?}", e))
        }
    }
}

/// 確認保存臨時圖像到正式目錄
#[tauri::command]
pub async fn confirm_temp_image_save(
    temp_image_data: Value
) -> Result<Value, String> {
    log::info!("[TempImageManager] 確認保存臨時圖像");
    
    // 解析臨時圖像數據
    let temp_id = temp_image_data.get("id")
        .and_then(|v| v.as_str())
        .ok_or("缺少圖像 ID")?;
    
    let temp_path = temp_image_data.get("temp_path")
        .and_then(|v| v.as_str())
        .ok_or("缺少臨時路徑")?;
    
    let project_id = temp_image_data.get("project_id")
        .and_then(|v| v.as_str());
    
    let character_id = temp_image_data.get("character_id")
        .and_then(|v| v.as_str());
    
    let original_prompt = temp_image_data.get("original_prompt")
        .and_then(|v| v.as_str())
        .ok_or("缺少原始提示詞")?;
    
    let prompt = temp_image_data.get("prompt")
        .and_then(|v| v.as_str())
        .ok_or("缺少增強提示詞")?;
    
    let parameters = temp_image_data.get("parameters")
        .ok_or("缺少生成參數")?;
    
    let model = parameters.get("model")
        .and_then(|v| v.as_str())
        .ok_or("缺少模型參數")?;
    
    let width = parameters.get("width")
        .and_then(|v| v.as_i64())
        .ok_or("缺少寬度參數")? as i32;
    
    let height = parameters.get("height")
        .and_then(|v| v.as_i64())
        .ok_or("缺少高度參數")? as i32;
    
    let seed = parameters.get("seed")
        .and_then(|v| v.as_i64())
        .map(|s| s as i32);
    
    let enhance = parameters.get("enhance")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    let style = parameters.get("style")
        .and_then(|v| v.as_str());
    
    let file_size = temp_image_data.get("file_size_bytes")
        .and_then(|v| v.as_i64())
        .ok_or("缺少檔案大小")?;
    
    let generation_time = temp_image_data.get("generation_time_ms")
        .and_then(|v| v.as_i64())
        .ok_or("缺少生成時間")? as i32;
    
    // 移動臨時圖像到正式目錄
    let final_path = move_temp_to_final_image(temp_path, temp_id)
        .map_err(|e| format!("移動圖像失敗: {}", e))?;
    
    // 保存生成歷史到數據庫
    if let Err(e) = super::free_generation::save_pollinations_history(
        temp_id,
        project_id,
        character_id,
        original_prompt,
        prompt,
        model,
        width,
        height,
        seed,
        enhance,
        style,
        temp_image_data.get("image_url").and_then(|v| v.as_str()),
        &final_path,
        file_size,
        generation_time,
    ) {
        log::warn!("[TempImageManager] 保存生成歷史失敗: {}", e);
        // 不阻斷主流程
    }
    
    Ok(serde_json::json!({
        "success": true,
        "id": temp_id,
        "final_path": final_path,
        "message": "圖像已成功保存"
    }))
}

/// 刪除臨時圖像
#[tauri::command]
pub async fn delete_temp_image(
    temp_path: String
) -> Result<Value, String> {
    log::info!("[TempImageManager] 刪除臨時圖像: {}", temp_path);
    
    use std::fs;
    
    match fs::remove_file(&temp_path) {
        Ok(_) => {
            log::info!("[TempImageManager] 臨時圖像已刪除: {}", temp_path);
            Ok(serde_json::json!({
                "success": true,
                "message": "臨時圖像已刪除"
            }))
        },
        Err(e) => {
            log::error!("[TempImageManager] 刪除臨時圖像失敗: {}", e);
            Err(format!("刪除臨時圖像失敗: {}", e))
        }
    }
}

/// 清理過期的臨時圖像（超過24小時）
#[tauri::command]
pub async fn cleanup_expired_temp_images() -> Result<Value, String> {
    log::info!("[TempImageManager] 清理過期的臨時圖像");
    
    use std::fs;
    use std::time::{Duration, SystemTime};
    
    let temp_dir = get_temp_images_dir()
        .map_err(|e| format!("獲取臨時目錄失敗: {}", e))?;
    
    let mut cleaned_count = 0;
    let cutoff_time = SystemTime::now() - Duration::from_secs(24 * 60 * 60); // 24小時前
    
    if let Ok(entries) = fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(created) = metadata.created() {
                    if created < cutoff_time {
                        if let Ok(_) = fs::remove_file(entry.path()) {
                            cleaned_count += 1;
                            log::info!("[TempImageManager] 已清理過期臨時圖像: {:?}", entry.path());
                        }
                    }
                }
            }
        }
    }
    
    log::info!("[TempImageManager] 清理完成，共清理 {} 個過期臨時圖像", cleaned_count);
    
    Ok(serde_json::json!({
        "success": true,
        "cleaned_count": cleaned_count,
        "message": format!("已清理 {} 個過期臨時圖像", cleaned_count)
    }))
}

// ========================= 臨時圖像輔助函數 =========================

/// 獲取臨時圖像目錄
pub fn get_temp_images_dir() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    // 檢查是否為開發環境
    let temp_dir = if is_development_environment() {
        // 開發環境：使用項目根目錄下的 generated-images（避免觸發熱重載）
        std::env::current_dir()?.parent()
            .ok_or("無法獲取父目錄")?
            .join("generated-images")
    } else {
        // 生產環境：使用 Application Support
        dirs::home_dir()
            .ok_or("無法獲取用戶目錄")?
            .join("Library")
            .join("Application Support")
            .join("genesis-chronicle")
            .join("generated-images")
    };
    
    std::fs::create_dir_all(&temp_dir)?;
    Ok(temp_dir)
}

/// 檢查是否為開發環境
fn is_development_environment() -> bool {
    // 檢查執行檔路徑是否包含 debug 目錄
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(path_str) = exe_path.to_str() {
            return path_str.contains("/target/debug/") || path_str.contains("\\target\\debug\\");
        }
    }
    
    // 檢查環境變數
    std::env::var("NODE_ENV").map(|v| v == "development").unwrap_or(false) ||
    std::env::var("TAURI_DEV").is_ok()
}

/// 儲存生成的圖像到臨時目錄
pub fn save_temp_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs;
    
    let temp_dir = get_temp_images_dir()?;
    
    // 生成檔案路徑
    let filename = format!("{}.jpg", image_id);
    let file_path = temp_dir.join(&filename);
    
    // 寫入圖像數據
    fs::write(&file_path, image_data)?;
    
    Ok(file_path.to_string_lossy().to_string())
}

/// 將臨時圖像移動到正式目錄
pub fn move_temp_to_final_image(temp_path: &str, image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs;
    
    // 使用與臨時圖片相同的目錄邏輯
    let images_dir = if is_development_environment() {
        // 開發環境：使用專案根目錄下的 generated-images（與臨時圖片一致）
        std::env::current_dir()?.parent()
            .ok_or("無法獲取父目錄")?
            .join("generated-images")
    } else {
        // 生產環境：使用 Application Support
        dirs::home_dir()
            .ok_or("無法獲取用戶目錄")?
            .join("Library")
            .join("Application Support")
            .join("genesis-chronicle")
            .join("generated-images")
    };
    
    fs::create_dir_all(&images_dir)?;
    
    // 生成最終檔案路徑
    let filename = format!("{}.jpg", image_id);
    let final_path = images_dir.join(&filename);
    
    // 移動檔案
    fs::copy(temp_path, &final_path)?;
    fs::remove_file(temp_path)?;
    
    Ok(final_path.to_string_lossy().to_string())
}

/// 優化的圖片生成：直接儲存到最終位置，使用標記系統
#[tauri::command]
#[allow(non_snake_case)]
pub async fn generate_illustration_optimized(
    prompt: String,
    width: Option<u32>,
    height: Option<u32>,
    model: Option<String>,
    seed: Option<u32>,
    enhance: Option<bool>,
    style: Option<String>,
    projectId: Option<String>,
    characterId: Option<String>,
) -> Result<Value, String> {
    log::info!("[OptimizedGenerator] 直接生成圖片到最終位置: {}", prompt);
    
    if prompt.trim().is_empty() {
        return Err("提示詞不能為空".to_string());
    }

    // 建立 Pollinations API 服務
    let service = PollinationsApiService::new()
        .map_err(|e| format!("Pollinations API 服務初始化失敗: {:?}", e))?;

    // 解析模型
    let pollinations_model = match model.as_deref().unwrap_or("flux") {
        "flux" => PollinationsModel::Flux,
        "gptimage" => PollinationsModel::GptImage, 
        "kontext" => PollinationsModel::Kontext,
        "sdxl" => PollinationsModel::Sdxl,
        _ => PollinationsModel::Flux,
    };

    // 建立請求參數
    let request = PollinationsRequest {
        prompt: prompt.clone(),
        model: Some(pollinations_model),
        width: Some(width.unwrap_or(1024)),
        height: Some(height.unwrap_or(1024)),
        seed,
        enhance: Some(enhance.unwrap_or(false)),
        transparent: Some(false),
        negative_prompt: None,
        nologo: Some(true),
        reference_image: None,
    };

    let now = Instant::now();
    
    // 呼叫 API 生成圖片  
    let response = service.generate_image(request.clone()).await
        .map_err(|e| format!("圖片生成失敗: {:?}", e))?;
    
    let generation_time = now.elapsed().as_millis() as i32;

    // 直接儲存到最終目錄
    let final_path = save_to_final_directory(&response.image_data, &response.id)
        .map_err(|e| format!("圖片儲存失敗: {}", e))?;
    
    let file_size = fs::metadata(&final_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    // 儲存到資料庫，標記為未確認
    if let Err(e) = save_pollinations_history_unconfirmed(
        &response.id,
        projectId.as_deref(),
        characterId.as_deref(), 
        &prompt,
        &request.prompt,
        &model.unwrap_or_else(|| "flux".to_string()),
        width.unwrap_or(1024),
        height.unwrap_or(1024),
        seed,
        enhance.unwrap_or(false),
        style.as_deref(),
        response.image_url.as_deref(),
        &final_path,
        file_size,
        generation_time,
    ) {
        log::warn!("[OptimizedGenerator] 儲存歷史記錄失敗: {}", e);
        // 不阻斷主流程
    }

    Ok(serde_json::json!({
        "success": true,
        "id": response.id,
        "final_path": final_path,
        "image_url": response.image_url,
        "is_confirmed": false,
        "file_size_bytes": file_size,
        "generation_time_ms": generation_time,
        "message": "圖片已生成（待確認）"
    }))
}

/// 確認圖片：將is_confirmed標記為true
#[tauri::command]
pub async fn confirm_illustrations(image_ids: Vec<String>) -> Result<Value, String> {
    log::info!("[OptimizedGenerator] 確認圖片: {:?}", image_ids);
    
    if image_ids.is_empty() {
        return Err("沒有提供圖片ID".to_string());
    }

    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    // 構建 IN 子句的佔位符
    let placeholders: Vec<&str> = image_ids.iter().map(|_| "?").collect();
    let in_clause = placeholders.join(",");
    
    // 更新 pollinations_generations
    let mut stmt = conn.prepare(&format!(
        "UPDATE pollinations_generations SET is_confirmed = 1 WHERE id IN ({})",
        in_clause
    )).map_err(|e| format!("SQL準備失敗: {:?}", e))?;
    
    let updated_count = stmt.execute(rusqlite::params_from_iter(image_ids.iter()))
        .map_err(|e| format!("更新失敗: {:?}", e))?;
    
    log::info!("[OptimizedGenerator] 已確認 {} 張圖片", updated_count);

    Ok(serde_json::json!({
        "success": true,
        "confirmed_count": updated_count,
        "message": format!("已確認 {} 張圖片", updated_count)
    }))
}

/// 儲存圖片到最終目錄
pub fn save_to_final_directory(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    // 使用與臨時圖片相同的目錄邏輯
    let images_dir = if is_development_environment() {
        // 開發環境：使用專案根目錄下的 generated-images（與臨時圖片一致）
        std::env::current_dir()?.parent()
            .ok_or("無法獲取父目錄")?
            .join("generated-images")
    } else {
        // 生產環境：使用 Application Support
        dirs::home_dir()
            .ok_or("無法獲取用戶目錄")?
            .join("Library")
            .join("Application Support")
            .join("genesis-chronicle")
            .join("generated-images")
    };
    
    fs::create_dir_all(&images_dir)?;
    
    // 生成最終檔案路徑
    let filename = format!("{}.jpg", image_id);
    let final_path = images_dir.join(&filename);
    
    // 直接寫入檔案
    fs::write(&final_path, image_data)?;
    
    Ok(final_path.to_string_lossy().to_string())
}

/// 儲存Pollinations歷史記錄（標記為未確認）
pub fn save_pollinations_history_unconfirmed(
    id: &str,
    project_id: Option<&str>,
    character_id: Option<&str>,
    original_prompt: &str,
    enhanced_prompt: &str,
    model: &str,
    width: u32,
    height: u32,
    seed: Option<u32>,
    enhance: bool,
    style_applied: Option<&str>,
    image_url: Option<&str>,
    local_file_path: &str,
    file_size_bytes: i64,
    generation_time_ms: i32,
) -> Result<(), Box<dyn std::error::Error>> {
    let conn = create_connection()?;
    
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs() as i64;
    
    conn.execute(
        "INSERT INTO pollinations_generations (
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, seed, enhance, style_applied,
            image_url, local_file_path, file_size_bytes, generation_time_ms,
            is_confirmed, created_timestamp, created_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 0, ?16, CURRENT_TIMESTAMP
        )",
        rusqlite::params![
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, seed, enhance, style_applied,
            image_url, local_file_path, file_size_bytes, generation_time_ms,
            current_time
        ],
    )?;
    
    log::info!("已儲存未確認的圖片記錄: {}", id);
    Ok(())
}