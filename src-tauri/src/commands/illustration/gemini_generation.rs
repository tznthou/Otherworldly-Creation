use serde_json::Value;
use crate::services::illustration::gemini_image_api::{
    GeminiImageApiService, GeminiImageRequest, GeminiImageConfig
};
// use crate::database::connection::create_connection; // 暫時不使用
use crate::utils::storage_handler::StorageHandler;
use crate::utils::db_operations::{IllustrationDbHandler, IllustrationRecord};
// use crate::utils::path_utils::to_relative_path; // 🔧 移除：不再需要，StorageHandler直接返回正確路徑

/// Gemini 插畫生成命令
#[tauri::command]
#[allow(non_snake_case)]
pub async fn generate_gemini_illustration(
    prompt: String,
    provider: String, // "gemini" 或 "gemini-flash"
    apiKey: String,
    width: Option<u32>,
    height: Option<u32>,
    projectId: Option<String>,
    characterId: Option<String>,
    style: Option<String>,
) -> Result<Value, String> {
    log::info!("[GeminiGeneration] 🎨 Gemini 插畫生成: {} (provider: {})", prompt, provider);
    
    if prompt.trim().is_empty() {
        return Err("提示詞不能為空".to_string());
    }

    if apiKey.trim().is_empty() {
        return Err("需要提供 Gemini API Key".to_string());
    }

    // 根據 provider 選擇配置和正確的 API key
    let config = match provider.as_str() {
        "gemini" => {
            // 免費版使用 Gemini API key
            GeminiImageConfig::Free { api_key: apiKey.clone() }
        },
        "gemini-flash" => {
            // 付費版需要使用 OpenRouter API key，不是 Gemini API key
            // 這裡傳入的 apiKey 應該是從 OpenRouter provider 載入的
            if apiKey.trim().is_empty() {
                return Err("Gemini Flash Image 付費版需要 OpenRouter API Key".to_string());
            }
            GeminiImageConfig::Paid { api_key: apiKey.clone() }
        },
        _ => return Err(format!("不支援的 provider: {}", provider)),
    };

    // 建立 Gemini API 服務
    let service = GeminiImageApiService::new(config)
        .map_err(|e| format!("Gemini API 服務初始化失敗: {:?}", e))?;

    // 應用風格增強
    let enhanced_prompt = if let Some(ref style_name) = style {
        match style_name.as_str() {
            "anime" => format!("{}, anime style, manga art", prompt),
            "realistic" => format!("{}, photorealistic, high quality", prompt),
            "fantasy" => format!("{}, fantasy art, magical", prompt),
            "watercolor" => format!("{}, watercolor painting style", prompt),
            "digital_art" => format!("{}, digital art, concept art", prompt),
            _ => prompt.clone(),
        }
    } else {
        prompt.clone()
    };

    // 構建 Gemini 請求
    let request = GeminiImageRequest {
        prompt: enhanced_prompt.clone(),
        width: width.or(Some(1024)),
        height: height.or(Some(1024)),
        seed: None,
        negative_prompt: None,
        quality: Some("standard".to_string()),
        style: style.clone(),
        safety_level: Some("block_most".to_string()),
    };

    // 生成圖像
    match service.generate_image(request).await {
        Ok(response) => {
            log::info!("[GeminiGeneration] Gemini 插畫生成成功，耗時: {}ms", response.generation_time_ms);
            
            // 🔧 修復：Gemini圖片直接儲存到最終目錄，避免檔案路徑不一致問題
            let storage_result = StorageHandler::save_to_final(&response.image_data, &response.id)
                .map_err(|e| format!("圖像儲存失敗: {}", e))?;

            if !storage_result.success {
                return Err(storage_result.message);
            }

            log::info!("[GeminiGeneration] ✅ 圖片已直接保存到最終目錄: {}", storage_result.relative_path);

            // 🔧 修復：建立資料庫記錄，使用正確的相對路徑（與實際檔案位置一致）
            let record = IllustrationRecord {
                id: response.id.clone(),
                project_id: projectId.clone(),
                character_id: characterId.clone(),
                original_prompt: prompt,
                enhanced_prompt: enhanced_prompt,
                model: provider.clone(),
                width: width.unwrap_or(1024),
                height: height.unwrap_or(1024),
                seed: None, // Gemini 不使用 seed
                enhance: style.is_some(),
                style_applied: style.clone(),
                image_url: None, // Gemini 沒有外部 URL
                local_file_path: storage_result.relative_path.clone(), // 🔧 使用StorageHandler返回的正確相對路徑
                file_size_bytes: storage_result.file_size as i64,
                generation_time_ms: response.generation_time_ms as i32,
            };

            // 儲存到資料庫（使用統一的資料庫處理器）
            let db_result = IllustrationDbHandler::save_illustration_generation(&record);
            if !db_result.success {
                log::error!("[GeminiGeneration] ❌ 資料庫保存失敗: {}", db_result.message);
                log::warn!("[GeminiGeneration] 圖片已保存到檔案系統: {}，但資料庫記錄失敗", storage_result.file_path);
            } else {
                log::info!("[GeminiGeneration] ✅ 資料庫記錄保存成功: {} -> {}", record.id, record.local_file_path);
            }

            Ok(serde_json::json!({
                "success": true,
                "id": response.id,
                "prompt": response.prompt,
                "image_path": storage_result.file_path, // 🔧 統一字段名：與 Pollinations 保持一致
                "image_url": null,
                "parameters": {
                    "model": provider,
                    "width": width.unwrap_or(1024),
                    "height": height.unwrap_or(1024),
                    "style": style
                },
                "file_size_bytes": storage_result.file_size,
                "generation_time_ms": response.generation_time_ms,
                "provider": provider,
                "is_free": provider == "gemini",
                "is_temp": true,
                "project_id": projectId,
                "character_id": characterId,
                "original_prompt": record.original_prompt
            }))
        },
        Err(e) => {
            log::error!("[GeminiGeneration] Gemini 插畫生成失敗: {:?}", e);
            Err(format!("Gemini 插畫生成失敗: {:?}", e))
        }
    }
}

/// 測試 Gemini API 連接
#[tauri::command]
pub async fn test_gemini_connection(apiKey: String, provider: String) -> Result<Value, String> {
    log::info!("[GeminiGeneration] 測試 Gemini API 連接: {}", provider);
    
    if apiKey.trim().is_empty() {
        return Err("需要提供 Gemini API Key".to_string());
    }

    let config = match provider.as_str() {
        "gemini" => GeminiImageConfig::Free { api_key: apiKey },
        "gemini-flash" => GeminiImageConfig::Paid { api_key: apiKey },
        _ => return Err(format!("不支援的 provider: {}", provider)),
    };

    // 嘗試初始化服務來測試 API Key
    match GeminiImageApiService::new(config) {
        Ok(_) => {
            Ok(serde_json::json!({
                "success": true,
                "message": format!("{} API 連接測試成功", provider),
                "provider": provider
            }))
        },
        Err(e) => {
            log::error!("[GeminiGeneration] API 連接測試失敗: {:?}", e);
            Err(format!("{} API 連接測試失敗: {:?}", provider, e))
        }
    }
}