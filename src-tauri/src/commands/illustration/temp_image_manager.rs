use serde_json::Value;
use crate::database::connection::create_connection;
use crate::utils::storage_handler::StorageHandler;
use crate::utils::api_handler::{PollinationsApiHandler, ApiGenerationRequest};
use crate::utils::db_operations::{IllustrationDbHandler, IllustrationRecord};

/// 安全地截取 Unicode 字符串的前 n 個字符
/// 避免在多字節 UTF-8 字符中間切片導致 panic
fn truncate_unicode_safe(s: &str, max_chars: usize) -> String {
    s.chars().take(max_chars).collect()
}

/// 免費插畫生成到臨時目錄 - 供預覽使用
/// 
/// 🔧 重構: 使用統一的 API 處理器，大幅簡化邏輯
#[tauri::command]
#[allow(non_snake_case)]
pub async fn generate_free_illustration_to_temp(
    prompt: String,
    _width: Option<u32>, // 參數保留以維持 API 相容性
    _height: Option<u32>, // 參數保留以維持 API 相容性
    model: Option<String>,
    _seed: Option<u32>, // 參數保留以維持 API 相容性
    enhance: Option<bool>,
    style: Option<String>,
    projectId: Option<String>,
    characterId: Option<String>,
) -> Result<Value, String> {
    log::info!("[TempImageManager] 🎨 免費插畫生成到臨時目錄: {}", prompt);
    
    // 建構 API 請求
    let api_request = ApiGenerationRequest {
        prompt,
        model,
        width: _width,
        height: _height,
        seed: _seed,
        enhance,
        style,
        project_id: projectId,
        character_id: characterId,
    };
    
    // 使用統一的 API 處理器生成圖片
    let api_result = PollinationsApiHandler::generate_with_fallback(api_request.clone()).await;
    
    if !api_result.success {
        let error_msg = api_result.error_message.unwrap_or_else(|| "未知錯誤".to_string());
        log::error!("[TempImageManager] ❌ 生成失敗: {}", error_msg);
        return Err(error_msg);
    }

    // 儲存圖像到臨時目錄
    let temp_path = save_temp_generated_image(&api_result.image_data, &api_result.id)
        .map_err(|e| format!("臨時圖像儲存失敗: {}", e))?;
    
    // 計算檔案大小
    let file_size = api_result.image_data.len() as i64;
    
    log::info!("[TempImageManager] ✅ 免費插畫生成成功，耗時: {}ms", api_result.generation_time_ms);
    
    Ok(serde_json::json!({
        "success": true,
        "id": api_result.id,
        "prompt": api_result.prompt,
        "temp_path": temp_path,
        "image_url": api_result.image_url,
        "parameters": {
            "model": api_result.parameters.model,
            "width": api_result.parameters.width,
            "height": api_result.parameters.height,
            "seed": api_result.parameters.seed,
            "enhance": api_result.parameters.enhance,
            "style": api_result.parameters.style
        },
        "file_size_bytes": file_size,
        "generation_time_ms": api_result.generation_time_ms,
        "provider": "pollinations",
        "is_free": true,
        "is_temp": true,
        "project_id": api_request.project_id,
        "character_id": api_request.character_id,
        "original_prompt": api_request.prompt,
        "fallback_used": api_result.fallback_used
    }))
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
        "image_path": final_path,
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
/// 
/// 🔧 重構: 使用統一的 StorageHandler，簡化清理邏輯
#[tauri::command]
pub async fn cleanup_expired_temp_images() -> Result<Value, String> {
    log::info!("[TempImageManager] 🧹 開始清理過期的臨時圖像");
    
    match StorageHandler::cleanup_expired_temp_files(24) {
        Ok(cleaned_count) => {
            log::info!("[TempImageManager] ✅ 清理完成，共清理 {} 個過期臨時圖像", cleaned_count);
            
            Ok(serde_json::json!({
                "success": true,
                "cleaned_count": cleaned_count,
                "message": format!("已清理 {} 個過期臨時圖像", cleaned_count)
            }))
        },
        Err(e) => {
            let error_msg = format!("清理過期臨時圖像失敗: {}", e);
            log::error!("[TempImageManager] ❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

// ========================= 臨時圖像輔助函數 =========================

/// 獲取臨時圖像目錄
/// 
/// ⚠️ DEPRECATED: 請使用 crate::utils::path_utils::get_temp_images_dir()
/// 這個函數保留是為了向後相容，但內部已重導向到新的統一路徑系統
pub fn get_temp_images_dir() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    // 重導向到新的統一路徑系統
    crate::utils::path_utils::get_temp_images_dir()
        .map_err(|e| e.into())
}

/// 檢查是否為開發環境
/// 
/// ⚠️ DEPRECATED: 請使用 crate::utils::path_utils::is_development_environment()
/// 這個函數保留是為了向後相容，但內部已重導向到新的統一實現
fn is_development_environment() -> bool {
    crate::utils::path_utils::is_development_environment()
}

/// 儲存生成的圖像到臨時目錄
/// 
/// 🔧 重構: 使用統一的 StorageHandler，提供更好的錯誤處理和一致性
pub fn save_temp_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    match StorageHandler::save_to_temp(image_data, image_id)? {
        result if result.success => {
            log::info!("[save_temp_generated_image] ✅ {}", result.message);
            Ok(result.file_path)
        },
        result => {
            log::error!("[save_temp_generated_image] ❌ {}", result.message);
            Err(result.message.into())
        }
    }
}

/// 將臨時圖像移動到正式目錄
/// 
/// 🔧 重構: 使用統一的 StorageHandler，提供更一致的處理邏輯
pub fn move_temp_to_final_image(temp_path: &str, image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    match StorageHandler::move_temp_to_final(temp_path, image_id)? {
        result if result.success => {
            log::info!("[move_temp_to_final] ✅ {}", result.message);
            Ok(result.relative_path)
        },
        result => {
            log::error!("[move_temp_to_final] ❌ {}", result.message);
            Err(result.message.into())
        }
    }
}

/// 優化的圖片生成：直接儲存到最終位置，使用標記系統
#[tauri::command]
#[allow(non_snake_case)]
pub async fn generate_illustration_optimized(
    prompt: String,
    _width: Option<u32>, // 參數保留以維持 API 相容性，但 Pollinations 現在對尺寸參數過敏
    _height: Option<u32>, // 參數保留以維持 API 相容性，但 Pollinations 現在對尺寸參數過敏
    model: Option<String>,
    _seed: Option<u32>, // 參數保留以維持 API 相容性，但實際使用 safe_seed
    enhance: Option<bool>,
    style: Option<String>,
    projectId: Option<String>,
    characterId: Option<String>,
) -> Result<Value, String> {
    log::info!("[OptimizedGenerator] 直接生成圖片到最終位置: {}", prompt);
    
    if prompt.trim().is_empty() {
        return Err("提示詞不能為空".to_string());
    }

    // 使用新的 ApiHandler 進行 API 調用
    let api_request = ApiGenerationRequest {
        prompt: prompt.clone(),
        model,
        width: _width,
        height: _height,
        seed: _seed,
        enhance,
        style: style.clone(),
        project_id: projectId.clone(),
        character_id: characterId.clone(),
    };
    
    let api_result = PollinationsApiHandler::generate_with_fallback(api_request.clone()).await;
    
    if !api_result.success {
        return Err(api_result.error_message.unwrap_or_else(|| "API調用失敗".to_string()));
    }

    // 使用 StorageHandler 儲存到最終目錄
    let storage_result = StorageHandler::save_to_final(&api_result.image_data, &api_result.id)
        .map_err(|e| format!("圖片儲存失敗: {}", e))?;
    
    if !storage_result.success {
        return Err(storage_result.message);
    }

    // 使用新的 DbHandler 儲存到資料庫，標記為未確認
    let db_record = IllustrationRecord {
        id: api_result.id.clone(),
        project_id: projectId.clone(),
        character_id: characterId.clone(),
        original_prompt: prompt.clone(),
        enhanced_prompt: api_result.prompt.clone(),
        model: api_result.parameters.model.clone(),
        width: api_result.parameters.width,
        height: api_result.parameters.height,
        seed: api_result.parameters.seed,
        enhance: api_result.parameters.enhance,
        style_applied: style.clone(),
        image_url: api_result.image_url.clone(),
        local_file_path: storage_result.file_path.clone(),
        file_size_bytes: storage_result.file_size as i64,
        generation_time_ms: api_result.generation_time_ms,
    };
    
    let db_result = IllustrationDbHandler::save_unconfirmed_record(&db_record);
    if !db_result.success {
        log::warn!("[OptimizedGenerator] ⚠️ {}", db_result.message);
        if let Some(details) = &db_result.error_details {
            log::warn!("[OptimizedGenerator] 詳細錯誤: {}", details);
        }
        // 不阻斷主流程
    }

    log::info!("[OptimizedGenerator] ✅ 圖片生成完成: {} bytes, {}ms", 
        storage_result.file_size, api_result.generation_time_ms);

    Ok(serde_json::json!({
        "success": true,
        "id": api_result.id,
        "image_path": storage_result.file_path,
        "image_url": api_result.image_url,
        "is_confirmed": false,
        "file_size_bytes": storage_result.file_size,
        "generation_time_ms": api_result.generation_time_ms,
        "parameters": {
            "model": api_result.parameters.model,
            "width": api_result.parameters.width,
            "height": api_result.parameters.height,
            "enhance": api_result.parameters.enhance,
            "fallback_used": api_result.fallback_used
        },
        "message": "圖片已生成（待確認）"
    }))
}

/// 確認圖片：將is_confirmed標記為true
#[tauri::command]
pub async fn confirm_illustrations(image_ids: Vec<String>) -> Result<Value, String> {
    log::info!("[OptimizedGenerator] 🎯 確認圖片: {:?}", image_ids);
    
    let db_result = IllustrationDbHandler::confirm_illustrations(&image_ids);
    
    if !db_result.success {
        return Err(db_result.message);
    }

    Ok(serde_json::json!({
        "success": true,
        "confirmed_count": db_result.affected_rows,
        "message": db_result.message
    }))
}

/// 加入收藏：將圖片加入收藏並標記為永久保存
/// 如果圖片還是臨時狀態，會先自動確認保存到資料庫
#[tauri::command]
#[allow(non_snake_case)]
pub async fn add_to_collection(imageIds: Vec<String>) -> Result<Value, String> {
    log::info!("[Collection] 🎨 加入收藏: {:?}", imageIds);
    
    // TODO: 處理臨時圖片到收藏的複雜邏輯，目前簡化為基本收藏功能
    let db_result = IllustrationDbHandler::add_to_collection(&imageIds);
    
    if !db_result.success {
        log::warn!("[Collection] ⚠️ 收藏失敗: {}", db_result.message);
        return Err(db_result.message);
    }

    Ok(serde_json::json!({
        "success": true,
        "collected_count": db_result.affected_rows,
        "message": db_result.message
    }))
}

/// 帶完整資料的收藏功能：處理臨時圖片並保留原始上下文
/// 🔧 優化版：避免大數據 IPC 傳輸，只傳遞 ID 和元數據
#[tauri::command]
#[allow(non_snake_case)]
pub async fn add_to_collection_with_data(imageData: Vec<Value>) -> Result<Value, String> {
    log::info!("[Collection] 🚀 優化的收藏請求開始: {} 張圖片", imageData.len());
    
    // 🛡️ 基本輸入驗證
    if imageData.is_empty() {
        log::warn!("[Collection] ⚠️ 沒有提供圖片資料");
        return Err("沒有提供圖片資料".to_string());
    }

    // 🛡️ 安全的資料庫連接，加強錯誤處理
    let conn = match create_connection() {
        Ok(connection) => {
            log::info!("[Collection] ✅ 資料庫連接成功");
            connection
        },
        Err(e) => {
            log::error!("[Collection] ❌ 資料庫連接失敗: {:?}", e);
            return Err(format!("資料庫連接失敗，請檢查資料庫狀態: {:?}", e));
        }
    };
    
    let mut total_collected = 0;
    let mut newly_confirmed = 0;
    let mut skipped_duplicates = 0; // 跳過的重複圖片計數
    let mut processing_errors = Vec::new();
    
    // 🛡️ 逐一處理，即使部分失敗也不影響整體
    for (index, image_data) in imageData.iter().enumerate() {
        log::info!("[Collection] 🔄 處理第 {}/{} 張圖片", index + 1, imageData.len());
        
        // 🛡️ 安全提取圖片ID
        let image_id = match image_data.get("id").and_then(|v| v.as_str()) {
            Some(id) if !id.is_empty() => {
                log::info!("[Collection] 📷 處理圖片ID: {}", id);
                id
            },
            _ => {
                let error = format!("第 {} 張圖片資料缺少有效ID", index + 1);
                log::error!("[Collection] ❌ {}", error);
                processing_errors.push(error);
                continue; // 跳過這個無效的圖片資料，不會導致崩潰
            }
        };
        
        let project_id = image_data.get("project_id").and_then(|v| v.as_str());
        let character_id = image_data.get("character_id").and_then(|v| v.as_str());
        let original_prompt = image_data.get("original_prompt")
            .and_then(|v| v.as_str())
            .unwrap_or("Generated image");

        // 🔧 提取模型和提供者信息，避免硬編碼問題
        let model = image_data.get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let provider = image_data.get("provider")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        log::info!("[Collection] 📋 圖片上下文 - 專案: {:?}, 角色: {:?}, 提示: {}",
            project_id, character_id, truncate_unicode_safe(original_prompt, 50));
        log::info!("[Collection] 🤖 模型信息 - 模型: {}, 提供者: {}", model, provider);
        
        // 🛡️ 檢查圖片是否已存在於任何資料庫表中（防止重複收藏）
        let already_exists = match check_image_exists_in_any_table(&conn, image_id) {
            Ok(exists) => exists,
            Err(e) => {
                let error = format!("圖片 {} 資料庫查詢失敗: {}", image_id, e);
                log::error!("[Collection] ❌ {}", error);
                processing_errors.push(error);
                false // 假設不存在，繼續處理
            }
        };

        // 如果圖片已存在於任一表中，跳過重複收藏
        if already_exists {
            log::warn!("[Collection] ⚠️ 圖片 {} 已存在於資料庫中，跳過重複收藏", image_id);
            skipped_duplicates += 1; // 增加跳過計數

            // 更新收藏狀態（如果尚未收藏）
            match update_collection_status(&conn, image_id) {
                Ok(updated) => {
                    if updated > 0 {
                        total_collected += 1;
                        log::info!("[Collection] ✅ 已更新圖片 {} 的收藏狀態", image_id);
                    } else {
                        log::info!("[Collection] ℹ️ 圖片 {} 已在收藏中", image_id);
                    }
                },
                Err(e) => {
                    let error = format!("更新圖片 {} 收藏狀態失敗: {}", image_id, e);
                    log::warn!("[Collection] ⚠️ {}", error);
                    processing_errors.push(error);
                }
            }
            continue; // 跳過後續的檔案操作和資料庫寫入
        }
        
        // 🛡️ 圖片不在資料庫中，嘗試從臨時檔案或正式檔案確認保存
        {
            log::info!("[Collection] 📂 圖片 {} 不在資料庫中，嘗試從檔案系統確認保存", image_id);
            
            // 🛡️ 安全獲取臨時目錄
            let temp_dir = match get_temp_images_dir() {
                Ok(dir) => {
                    log::info!("[Collection] 📁 臨時目錄路徑: {:?}", dir);
                    dir
                },
                Err(e) => {
                    let error = format!("圖片 {} 無法獲取臨時目錄: {}", image_id, e);
                    log::error!("[Collection] ❌ {}", error);
                    processing_errors.push(error);
                    continue; // 跳過這張圖片，不會導致崩潰
                }
            };
            
            let temp_file = temp_dir.join(format!("{}.jpg", image_id));
            log::info!("[Collection] 🔍 檢查臨時檔案: {:?}", temp_file);
            
            // 🛡️ 先檢查正式檔案是否存在（適用於 Gemini 等直接保存到正式目錄的圖片）
            let generated_images_dir = temp_dir.parent().unwrap().join("generated-images");
            let final_file = generated_images_dir.join(format!("{}.jpg", image_id));
            log::info!("[Collection] 🔍 檢查正式檔案: {:?}", final_file);
            
            // 🔧 檢查檔案存在情況，正確處理重複檔案邏輯
            let (source_file, is_from_temp) = if final_file.exists() {
                log::info!("[Collection] ✅ 找到正式檔案（可能是 Gemini 圖片）");
                log::info!("[Collection] 🔄 圖片 {} 已在正式目錄，更新收藏狀態並清理temp檔案", image_id);

                // 🛡️ 清理temp檔案（如果存在）
                if temp_file.exists() {
                    match std::fs::remove_file(&temp_file) {
                        Ok(_) => log::info!("[Collection] 🗑️ 已清理重複的temp檔案: {:?}", temp_file),
                        Err(e) => log::warn!("[Collection] ⚠️ 清理temp檔案失敗: {:?} - {}", temp_file, e),
                    }
                }

                // 🔧 更新收藏狀態（對已存在於正式目錄的圖片）
                match update_collection_status(&conn, image_id) {
                    Ok(updated) => {
                        if updated > 0 {
                            total_collected += 1;
                            log::info!("[Collection] ✅ 已更新正式檔案的收藏狀態: {}", image_id);
                        } else {
                            skipped_duplicates += 1; // 已收藏的重複檔案
                            log::info!("[Collection] ℹ️ 正式檔案已在收藏中: {}", image_id);
                        }
                    },
                    Err(e) => {
                        let error = format!("更新正式檔案收藏狀態失敗: {} - {}", image_id, e);
                        log::warn!("[Collection] ⚠️ {}", error);
                        processing_errors.push(error);
                        skipped_duplicates += 1;
                    }
                }
                continue; // 處理下一張圖片
            } else if temp_file.exists() {
                log::info!("[Collection] ✅ 找到臨時檔案");
                (temp_file.clone(), true)
            } else {
                let warning = format!("圖片 {} 既不在資料庫中，臨時檔案也不存在，正式檔案也不存在", image_id);
                log::warn!("[Collection] ⚠️ {}", warning);
                processing_errors.push(warning);
                continue;
            };
            
            // 🛡️ 處理找到的檔案
            log::info!("[Collection] ✅ 找到檔案，開始處理");
            
            // 🛡️ 安全讀取檔案
            let image_bytes = match std::fs::read(&source_file) {
                Ok(bytes) => {
                    log::info!("[Collection] 📖 成功讀取檔案，大小: {} bytes", bytes.len());
                    if bytes.is_empty() {
                        let error = format!("圖片 {} 的檔案為空", image_id);
                        log::error!("[Collection] ❌ {}", error);
                        processing_errors.push(error);
                        continue;
                    }
                    bytes
                },
                Err(e) => {
                    let error = format!("圖片 {} 讀取檔案失敗: {}", image_id, e);
                    log::error!("[Collection] ❌ {}", error);
                    processing_errors.push(error);
                    continue; // 跳過這張圖片，不會導致崩潰
                }
            };
            
            // 🛡️ 處理檔案保存到最終目錄
            let final_path = if is_from_temp {
                // 從臨時目錄移動到最終目錄
                match save_to_final_directory(&image_bytes, image_id) {
                    Ok(path) => {
                        log::info!("[Collection] ✅ 成功從臨時目錄保存到最終目錄: {}", path);

                        // 🧹 清理臨時文件，避免重複佔用空間
                        if let Err(e) = std::fs::remove_file(&source_file) {
                            log::warn!("[Collection] ⚠️ 清理臨時文件失敗: {:?} - {}", source_file, e);
                        } else {
                            log::info!("[Collection] 🗑️ 臨時文件清理成功: {:?}", source_file);
                        }

                        path
                    },
                    Err(e) => {
                        let error = format!("圖片 {} 保存到最終目錄失敗: {}", image_id, e);
                        log::error!("[Collection] ❌ {}", error);
                        processing_errors.push(error);
                        continue; // 跳過這張圖片，不會導致崩潰
                    }
                }
            } else {
                // 檔案已經在最終目錄，直接使用相對路徑
                let relative_path = format!("generated-images/{}.jpg", image_id);
                log::info!("[Collection] ✅ 檔案已在最終目錄，使用路徑: {}", relative_path);
                relative_path
            };
            
            let file_size = image_bytes.len() as i64;
            
            // 🛡️ 安全插入資料庫記錄，使用正確的模型信息
            match save_pollinations_history_unconfirmed(
                image_id,
                project_id,
                character_id,
                original_prompt,
                original_prompt,
                model, // 🔧 使用從前端傳遞來的模型信息，而不是硬編碼
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
                Ok(_) => {
                    newly_confirmed += 1;
                    log::info!("[Collection] ✅ 已成功確認保存臨時圖片: {} (專案: {:?})", image_id, project_id);
                },
                Err(e) => {
                    let error = format!("圖片 {} 保存記錄到資料庫失敗: {}", image_id, e);
                    log::warn!("[Collection] ⚠️ {}", error);
                    processing_errors.push(error);
                    // 不使用continue，因為檔案已經保存成功，只是資料庫記錄失敗
                    // 可以繼續進行收藏狀態更新
                }
            }
            
            // 🛡️ 清理臨時檔案（只有從臨時目錄來的檔案才需要清理）
            if is_from_temp {
                match std::fs::remove_file(&temp_file) {
                    Ok(_) => log::info!("[Collection] 🗑️ 已清理臨時檔案"),
                    Err(e) => log::warn!("[Collection] ⚠️ 清理臨時檔案失敗: {}", e),
                }
            } else {
                log::info!("[Collection] 📁 檔案已在最終目錄，無需清理臨時檔案");
            }
        }

        // 🔧 更新收藏狀態（對新確認的圖片）
        match update_collection_status(&conn, image_id) {
            Ok(updated) => {
                if updated > 0 {
                    total_collected += 1;
                    log::info!("[Collection] ✅ 已設置圖片 {} 為收藏狀態", image_id);
                }
            },
            Err(e) => {
                let warning = format!("圖片 {} 收藏狀態更新失敗: {}", image_id, e);
                log::warn!("[Collection] ⚠️ {}", warning);
                processing_errors.push(warning);
            }
        }
        // 繼續處理下一張圖片
    }
    
    // 🎯 總結處理結果
    log::info!("[Collection] 🏁 處理完成統計:");
    log::info!("[Collection]   ✅ 成功收藏: {} 張圖片", total_collected);
    log::info!("[Collection]   🆕 新確認: {} 張圖片", newly_confirmed);
    log::info!("[Collection]   ⏭️ 跳過重複: {} 張圖片", skipped_duplicates);
    log::info!("[Collection]   ⚠️ 處理錯誤: {} 個", processing_errors.len());
    
    if !processing_errors.is_empty() {
        log::warn!("[Collection] 📋 錯誤詳情:");
        for (i, error) in processing_errors.iter().enumerate() {
            log::warn!("[Collection]   {}. {}", i + 1, error);
        }
    }

    // 🛡️ 構建安全的回應
    let success_message = if total_collected > 0 || skipped_duplicates > 0 {
        let mut parts = Vec::new();

        if total_collected > 0 {
            parts.push(format!("已加入收藏 {} 張圖片", total_collected));
        }

        if skipped_duplicates > 0 {
            parts.push(format!("跳過 {} 張重複圖片", skipped_duplicates));
        }

        if newly_confirmed > 0 {
            parts.push(format!("其中 {} 張為新確認", newly_confirmed));
        }

        if !processing_errors.is_empty() {
            parts.push(format!("{} 個處理錯誤（詳見日誌）", processing_errors.len()));
        }

        parts.join("，")
    } else {
        "沒有圖片處理成功，請檢查日誌了解詳情".to_string()
    };

    Ok(serde_json::json!({
        "success": total_collected > 0 || skipped_duplicates > 0, // 有成功處理的圖片就算成功
        "collected_count": total_collected,
        "newly_confirmed_count": newly_confirmed,
        "skipped_duplicates": skipped_duplicates,
        "error_count": processing_errors.len(),
        "errors": if processing_errors.len() <= 5 { processing_errors } else { processing_errors[..5].to_vec() }, // 最多返回5個錯誤
        "message": success_message
    }))
}

/// 儲存圖片到最終目錄
/// 
/// 🔧 重構: 使用統一的 StorageHandler，簡化邏輯並提高一致性
pub fn save_to_final_directory(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    match StorageHandler::save_to_final(image_data, image_id)? {
        result if result.success => {
            log::info!("[save_to_final_directory] ✅ {}", result.message);
            Ok(result.relative_path)
        },
        result => {
            log::error!("[save_to_final_directory] ❌ {}", result.message);
            Err(result.message.into())
        }
    }
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
    _seed: Option<u32>, // 參數保留以維持 API 相容性，但實際使用 safe_seed
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
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 0, ?16, ?17
        )",
        rusqlite::params![
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, _seed, enhance, style_applied,
            image_url, local_file_path, file_size_bytes, generation_time_ms,
            current_time,
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string() // 🔧 使用本地時間
        ],
    )?;
    
    log::info!("已儲存未確認的圖片記錄: {}", id);
    Ok(())
}

/// 檢查圖片是否存在於任何資料庫表中
///
/// 防止重複收藏的核心函數，檢查兩個主要表格
fn check_image_exists_in_any_table(conn: &rusqlite::Connection, image_id: &str) -> Result<bool, Box<dyn std::error::Error>> {
    // 檢查 pollinations_generations 表
    let count_pollinations: i32 = conn.query_row(
        "SELECT COUNT(*) FROM pollinations_generations WHERE id = ? AND deleted_at IS NULL",
        [image_id],
        |row| row.get(0)
    ).unwrap_or(0);

    // 檢查 illustration_generations 表
    let count_illustration: i32 = conn.query_row(
        "SELECT COUNT(*) FROM illustration_generations WHERE id = ? AND deleted_at IS NULL AND is_permanently_deleted = 0",
        [image_id],
        |row| row.get(0)
    ).unwrap_or(0);

    let exists = count_pollinations > 0 || count_illustration > 0;

    if exists {
        log::info!("[check_image_exists] 圖片 {} 存在於資料庫: Pollinations={}, Illustration={}",
                   image_id, count_pollinations, count_illustration);
    } else {
        log::info!("[check_image_exists] 圖片 {} 不存在於任何表中", image_id);
    }

    Ok(exists)
}

/// 只更新收藏狀態，不重複寫入記錄
///
/// 返回更新的記錄數量
fn update_collection_status(conn: &rusqlite::Connection, image_id: &str) -> Result<usize, Box<dyn std::error::Error>> {
    // 更新 pollinations_generations 表的收藏狀態
    let pollinations_updated = conn.execute(
        "UPDATE pollinations_generations
         SET in_collection = 1,
             collected_at = CURRENT_TIMESTAMP,
             is_confirmed = 1
         WHERE id = ? AND in_collection = 0",
        [image_id]
    ).unwrap_or(0);

    // 更新 illustration_generations 表的收藏狀態
    let illustration_updated = conn.execute(
        "UPDATE illustration_generations
         SET in_collection = 1,
             collected_at = CURRENT_TIMESTAMP,
             is_confirmed = 1
         WHERE id = ? AND in_collection = 0",
        [image_id]
    ).unwrap_or(0);

    let total_updated = pollinations_updated + illustration_updated;

    if pollinations_updated > 0 {
        log::info!("[update_collection_status] ✅ 更新 Pollinations 表收藏狀態: {}", image_id);
    }
    if illustration_updated > 0 {
        log::info!("[update_collection_status] ✅ 更新 Illustration 表收藏狀態: {}", image_id);
    }

    if total_updated == 0 {
        log::info!("[update_collection_status] ℹ️ 圖片 {} 已在收藏中或不存在", image_id);
    }

    Ok(total_updated)
}