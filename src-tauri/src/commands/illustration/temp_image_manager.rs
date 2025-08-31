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

    // 嘗試獲取 API token 以支援高級模型
    let api_token = crate::commands::pollinations_auth::get_active_pollinations_token().await.ok().flatten();
    
    // 根據是否有 token 建立不同等級的 Pollinations API 服務
    let service = if let Some(token) = &api_token {
        log::info!("[TempImageManager] 使用認證token，可存取Seed/Flower/Nectar層級模型");
        PollinationsApiService::with_token(token.clone())
            .map_err(|e| format!("認證API服務初始化失敗: {:?}", e))?
    } else {
        log::info!("[TempImageManager] 使用匿名存取，僅限基礎模型");
        PollinationsApiService::new()
            .map_err(|e| format!("基礎API服務初始化失敗: {:?}", e))?
    };

    // 解析模型 - 預設使用 gptimage 作為備用方案
    let pollinations_model = match model.as_deref().unwrap_or("gptimage") {
        "flux" => PollinationsModel::Flux,
        "gptimage" => PollinationsModel::GptImage,
        "kontext" => PollinationsModel::Kontext,
        "sdxl" => PollinationsModel::Sdxl,
        _ => PollinationsModel::GptImage, // 改為 GptImage 作為預設備用
    };

    // 不再自動添加風格描述，使用原始prompt
    // 用戶可以在前端自行控制是否添加風格關鍵字
    let enhanced_prompt = prompt.clone();

    // 構建請求
    let request = PollinationsRequest {
        prompt: enhanced_prompt.clone(),
        width: width.or(Some(1024)),
        height: height.or(Some(1024)),
        model: Some(pollinations_model),
        seed,
        enhance: enhance.or(Some(false)),
        nologo: Some(true),
        transparent: Some(false),
        ..Default::default()
    };

    // 生成圖像 - 使用備用模型機制
    // 根據是否有認證token動態調整可用模型
    let fallback_models = if api_token.is_some() {
        // 有token：可以使用所有模型，包括需要認證的Kontext
        vec![
            pollinations_model, // 原始選擇的模型
            PollinationsModel::GptImage, // 最穩定，支援透明背景
            PollinationsModel::Sdxl,     // 經典 Stable Diffusion XL
            PollinationsModel::Kontext,  // 認證用戶可用：圖像到圖像轉換
        ]
    } else {
        // 無token：只使用不需認證的基礎模型
        vec![
            pollinations_model, // 原始選擇的模型
            PollinationsModel::GptImage, // 最穩定，支援透明背景
            PollinationsModel::Sdxl,     // 經典 Stable Diffusion XL
            // 不包含Kontext：需要認證
        ]
    };
    
    let mut errors = Vec::new();
    
    for (i, &model) in fallback_models.iter().enumerate() {
        // 避免重複嘗試相同模型
        if i > 0 && std::mem::discriminant(&model) == std::mem::discriminant(&pollinations_model) {
            continue;
        }
        
        let fallback_request = PollinationsRequest {
            model: Some(model),
            ..request.clone()
        };
        
        match service.generate_image(fallback_request).await {
            Ok(response) => {
                if i > 0 {
                    log::info!("[TempImageManager] 使用備用模型 {:?} 生成成功，耗時: {}ms", model, response.generation_time_ms);
                } else {
                    log::info!("[TempImageManager] 免費插畫生成成功，耗時: {}ms", response.generation_time_ms);
                }
                
                // 儲存圖像到臨時目錄
                let temp_path = save_temp_generated_image(&response.image_data, &response.id)
                    .map_err(|e| format!("臨時圖像儲存失敗: {}", e))?;
                
                // 計算檔案大小
                let file_size = response.image_data.len() as i64;
                
                return Ok(serde_json::json!({
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
                    "original_prompt": prompt,
                    "fallback_used": i > 0
                }));
            },
            Err(e) => {
                let error_msg = format!("{:?} 模型失敗: {:?}", model, e);
                errors.push(error_msg);
                log::warn!("[TempImageManager] 模型 {:?} 生成失敗: {:?}", model, e);
                continue;
            }
        }
    }
    
    // 如果所有具體模型都失敗，最後嘗試不指定模型（讓 Pollinations 自動選擇）
    log::info!("[TempImageManager] 所有指定模型失敗，嘗試使用 API 預設模型");
    let default_request = PollinationsRequest {
        prompt: enhanced_prompt.clone(),
        width: width.or(Some(1024)),
        height: height.or(Some(1024)),
        model: None, // 不指定模型，讓 API 自動選擇最佳可用模型
        seed,
        enhance: enhance.or(Some(false)),
        nologo: Some(true),
        transparent: Some(false),
        ..Default::default()
    };
    
    match service.generate_image(default_request).await {
        Ok(response) => {
            log::info!("[TempImageManager] API預設模型生成成功，耗時: {}ms", response.generation_time_ms);
            
            // 儲存圖像到臨時目錄
            let temp_path = save_temp_generated_image(&response.image_data, &response.id)
                .map_err(|e| format!("臨時圖像儲存失敗: {}", e))?;
            
            let file_size = response.image_data.len() as i64;
            
            return Ok(serde_json::json!({
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
                "original_prompt": prompt,
                "fallback_used": true,
                "model_description": "API預設模型（自動選擇）"
            }));
        },
        Err(e) => {
            let api_error = format!("API預設模型也失敗: {:?}", e);
            errors.push(api_error);
            log::error!("[TempImageManager] API預設模型也失敗: {:?}", e);
        }
    }
    
    // 所有模型都失敗了
    let all_errors = errors.join("; ");
    log::error!("[TempImageManager] 所有模型（包括預設）都失敗了，錯誤詳情: {}", all_errors);
    Err(format!("Pollinations.AI 服務暫時不可用，請稍後再試。如果問題持續，可嘗試使用其他 AI 插畫功能。錯誤詳情: {}", all_errors))
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
    // 使用與資料庫相同的路徑策略
    let temp_dir = if is_development_environment() {
        // 開發環境：使用項目根目錄下的 generated-images
        std::env::current_dir()?.join("generated-images")
    } else {
        // 生產環境：使用與資料庫相同的 dirs::data_dir()
        dirs::data_dir()
            .ok_or("無法獲取用戶資料目錄")?
            .join("genesis-chronicle")
            .join("images")
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
    
    // 使用與資料庫相同的路徑策略
    let images_dir = if is_development_environment() {
        // 開發環境：使用項目根目錄下的 generated-images
        std::env::current_dir()?.join("generated-images")
    } else {
        // 生產環境：使用與資料庫相同的 dirs::data_dir()
        dirs::data_dir()
            .ok_or("無法獲取用戶資料目錄")?
            .join("genesis-chronicle")
            .join("images")
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

    // 嘗試獲取 API token 以支援高級模型
    let api_token = crate::commands::pollinations_auth::get_active_pollinations_token().await.ok().flatten();
    
    // 根據是否有 token 建立不同等級的 Pollinations API 服務
    let service = if let Some(token) = &api_token {
        log::info!("[OptimizedGenerator] 使用認證token，可存取Seed/Flower/Nectar層級模型");
        PollinationsApiService::with_token(token.clone())
            .map_err(|e| format!("認證API服務初始化失敗: {:?}", e))?
    } else {
        log::info!("[OptimizedGenerator] 使用匿名存取，僅限基礎模型");
        PollinationsApiService::new()
            .map_err(|e| format!("基礎API服務初始化失敗: {:?}", e))?
    };

    // 解析模型 - 預設改為 gptimage（更穩定，無需認證）
    let pollinations_model = match model.as_deref().unwrap_or("gptimage") {
        "flux" => PollinationsModel::Flux,
        "gptimage" => PollinationsModel::GptImage, 
        "kontext" => PollinationsModel::Kontext,
        "sdxl" => PollinationsModel::Sdxl,
        _ => PollinationsModel::GptImage, // 預設使用 GptImage（較穩定）
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
        &model.unwrap_or_else(|| "gptimage".to_string()),
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

/// 加入收藏：將圖片加入收藏並標記為永久保存
/// 如果圖片還是臨時狀態，會先自動確認保存到資料庫
#[tauri::command]
#[allow(non_snake_case)]
pub async fn add_to_collection(imageIds: Vec<String>) -> Result<Value, String> {
    log::info!("[Collection] 加入收藏: {:?}", imageIds);
    
    if imageIds.is_empty() {
        return Err("沒有提供圖片ID".to_string());
    }

    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    let mut total_collected = 0;
    let mut newly_confirmed = 0;
    
    for image_id in &imageIds {
        // 檢查圖片是否已存在於資料庫中
        let exists: i32 = conn.query_row(
            "SELECT COUNT(*) FROM pollinations_generations WHERE id = ?",
            [image_id],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if exists == 0 {
            // 圖片不在資料庫中，嘗試從臨時檔案確認保存
            log::info!("[Collection] 圖片 {} 不在資料庫中，嘗試從臨時檔案確認保存", image_id);
            
            // 尋找臨時檔案
            let temp_dir = get_temp_images_dir()
                .map_err(|e| format!("無法獲取臨時目錄: {}", e))?;
            let temp_file = temp_dir.join(format!("{}.jpg", image_id));
            
            if temp_file.exists() {
                // 讀取臨時檔案
                let image_data = std::fs::read(&temp_file)
                    .map_err(|e| format!("讀取臨時檔案失敗: {}", e))?;
                
                // 保存到最終目錄
                let final_path = save_to_final_directory(&image_data, image_id)
                    .map_err(|e| format!("保存到最終目錄失敗: {}", e))?;
                
                let file_size = image_data.len() as i64;
                
                // 插入資料庫記錄（使用基本資訊）
                if let Err(e) = save_pollinations_history_unconfirmed(
                    image_id,
                    None, // project_id
                    None, // character_id
                    "Generated image", // original_prompt
                    "Generated image", // enhanced_prompt
                    "flux", // model
                    1024, // width
                    1024, // height
                    None, // seed
                    false, // enhance
                    None, // style_applied
                    None, // image_url
                    &final_path,
                    file_size,
                    0, // generation_time_ms
                ) {
                    log::warn!("[Collection] 保存圖片記錄失敗: {}", e);
                    continue;
                }
                
                newly_confirmed += 1;
                log::info!("[Collection] 已確認保存臨時圖片: {}", image_id);
                
                // 刪除臨時檔案
                let _ = std::fs::remove_file(&temp_file);
            } else {
                log::warn!("[Collection] 圖片 {} 既不在資料庫中，臨時檔案也不存在", image_id);
                continue;
            }
        }
        
        // 更新為收藏狀態
        let updated = conn.execute(
            "UPDATE pollinations_generations 
             SET in_collection = 1, 
                 collected_at = CURRENT_TIMESTAMP, 
                 is_confirmed = 1 
             WHERE id = ?",
            [image_id]
        ).map_err(|e| format!("更新收藏狀態失敗: {}", e))?;
        
        if updated > 0 {
            total_collected += 1;
        }
    }
    
    log::info!("[Collection] 完成收藏: {} 張圖片收藏, {} 張新確認", total_collected, newly_confirmed);

    Ok(serde_json::json!({
        "success": true,
        "collected_count": total_collected,
        "newly_confirmed_count": newly_confirmed,
        "message": format!("已加入收藏 {} 張圖片{}", 
            total_collected,
            if newly_confirmed > 0 { format!("（其中 {} 張為新確認）", newly_confirmed) } else { String::new() }
        )
    }))
}

/// 帶完整資料的收藏功能：處理臨時圖片並保留原始上下文
#[tauri::command]
#[allow(non_snake_case)]
pub async fn add_to_collection_with_data(imageData: Vec<Value>) -> Result<Value, String> {
    log::info!("[Collection] 帶資料的收藏請求: {} 張圖片", imageData.len());
    
    if imageData.is_empty() {
        return Err("沒有提供圖片資料".to_string());
    }

    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {:?}", e))?;
    
    let mut total_collected = 0;
    let mut newly_confirmed = 0;
    
    for image_data in &imageData {
        let image_id = image_data.get("id")
            .and_then(|v| v.as_str())
            .ok_or("圖片ID缺失")?;
        
        let project_id = image_data.get("project_id").and_then(|v| v.as_str());
        let character_id = image_data.get("character_id").and_then(|v| v.as_str());
        let original_prompt = image_data.get("original_prompt").and_then(|v| v.as_str()).unwrap_or("Generated image");
        
        // 檢查圖片是否已存在於資料庫中
        let exists: i32 = conn.query_row(
            "SELECT COUNT(*) FROM pollinations_generations WHERE id = ?",
            [image_id],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if exists == 0 {
            // 圖片不在資料庫中，嘗試從臨時檔案確認保存
            log::info!("[Collection] 圖片 {} 不在資料庫中，嘗試從臨時檔案確認保存", image_id);
            
            // 尋找臨時檔案
            let temp_dir = get_temp_images_dir()
                .map_err(|e| format!("無法獲取臨時目錄: {}", e))?;
            let temp_file = temp_dir.join(format!("{}.jpg", image_id));
            
            if temp_file.exists() {
                // 讀取臨時檔案
                let image_bytes = std::fs::read(&temp_file)
                    .map_err(|e| format!("讀取臨時檔案失敗: {}", e))?;
                
                // 保存到最終目錄
                let final_path = save_to_final_directory(&image_bytes, image_id)
                    .map_err(|e| format!("保存到最終目錄失敗: {}", e))?;
                
                let file_size = image_bytes.len() as i64;
                
                // 插入資料庫記錄（保留原始上下文）
                if let Err(e) = save_pollinations_history_unconfirmed(
                    image_id,
                    project_id,
                    character_id,
                    original_prompt,
                    original_prompt,
                    "flux",
                    1024,
                    1024,
                    None,
                    false,
                    None,
                    None,
                    &final_path,
                    file_size,
                    0,
                ) {
                    log::warn!("[Collection] 保存圖片記錄失敗: {}", e);
                    continue;
                }
                
                newly_confirmed += 1;
                log::info!("[Collection] 已確認保存臨時圖片: {} (專案: {:?})", image_id, project_id);
                
                // 刪除臨時檔案
                let _ = std::fs::remove_file(&temp_file);
            } else {
                log::warn!("[Collection] 圖片 {} 既不在資料庫中，臨時檔案也不存在", image_id);
                continue;
            }
        }
        
        // 更新為收藏狀態
        let updated = conn.execute(
            "UPDATE pollinations_generations 
             SET in_collection = 1, 
                 collected_at = CURRENT_TIMESTAMP, 
                 is_confirmed = 1 
             WHERE id = ?",
            [image_id]
        ).map_err(|e| format!("更新收藏狀態失敗: {}", e))?;
        
        if updated > 0 {
            total_collected += 1;
        }
    }
    
    log::info!("[Collection] 完成帶資料收藏: {} 張圖片收藏, {} 張新確認", total_collected, newly_confirmed);

    Ok(serde_json::json!({
        "success": true,
        "collected_count": total_collected,
        "newly_confirmed_count": newly_confirmed,
        "message": format!("已加入收藏 {} 張圖片{}", 
            total_collected,
            if newly_confirmed > 0 { format!("（其中 {} 張為新確認）", newly_confirmed) } else { String::new() }
        )
    }))
}

/// 儲存圖片到最終目錄
pub fn save_to_final_directory(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    log::info!("[save_to_final_directory] 開始保存圖片 ID: {}, 數據大小: {} bytes", image_id, image_data.len());
    
    // 檢查圖片數據是否為空
    if image_data.is_empty() {
        return Err("圖片數據為空".into());
    }
    
    // 使用與資料庫相同的路徑策略
    let images_dir = if is_development_environment() {
        // 開發環境：使用項目根目錄下的 generated-images
        std::env::current_dir()?.join("generated-images")
    } else {
        // 生產環境：使用與資料庫相同的 dirs::data_dir()
        dirs::data_dir()
            .ok_or("無法獲取用戶資料目錄")?
            .join("genesis-chronicle")
            .join("images")
    };
    
    log::info!("[save_to_final_directory] 目標目錄: {:?}", images_dir);
    
    fs::create_dir_all(&images_dir)?;
    
    // 生成最終檔案路徑
    let filename = format!("{}.jpg", image_id);
    let final_path = images_dir.join(&filename);
    
    log::info!("[save_to_final_directory] 完整檔案路徑: {:?}", final_path);
    
    // 直接寫入檔案
    fs::write(&final_path, image_data)?;
    
    // 驗證檔案是否真的被創建
    if final_path.exists() {
        let file_size = fs::metadata(&final_path)?.len();
        log::info!("[save_to_final_directory] 檔案保存成功，最終檔案大小: {} bytes", file_size);
    } else {
        log::error!("[save_to_final_directory] 檔案寫入後不存在！");
        return Err("檔案寫入後不存在".into());
    }
    
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