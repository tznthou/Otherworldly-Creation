use serde_json::Value;
use crate::services::illustration::{
    PollinationsApiService, PollinationsRequest, PollinationsModel
};

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
    let temp_dir = dirs::home_dir()
        .ok_or("無法獲取用戶目錄")?
        .join("Library")
        .join("Application Support")
        .join("genesis-chronicle")
        .join("temp-images");
    
    std::fs::create_dir_all(&temp_dir)?;
    Ok(temp_dir)
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
    
    // 確保正式圖像目錄存在
    let images_dir = dirs::home_dir()
        .ok_or("無法獲取用戶目錄")?
        .join("Library")
        .join("Application Support")
        .join("genesis-chronicle")
        .join("generated-images");
    
    fs::create_dir_all(&images_dir)?;
    
    // 生成最終檔案路徑
    let filename = format!("{}.jpg", image_id);
    let final_path = images_dir.join(&filename);
    
    // 移動檔案
    fs::copy(temp_path, &final_path)?;
    fs::remove_file(temp_path)?;
    
    Ok(final_path.to_string_lossy().to_string())
}