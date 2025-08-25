use serde_json::Value;
use crate::services::illustration::{
    IllustrationManager, EnhancedIllustrationRequest, IllustrationRequest
};
use crate::database::connection::create_connection;
use std::sync::{Arc, Mutex};

/// 增強的插畫生成（完整工作流程）
#[tauri::command]
#[allow(non_snake_case)]
pub async fn generate_enhanced_illustration(
    projectId: String,
    characterId: Option<String>,
    sceneDescription: String,
    templateId: Option<String>,
    translationStyle: Option<String>,
    optimizationLevel: Option<String>,
    aspectRatio: Option<String>,
    safetyLevel: Option<String>,
    customNegativePrompt: Option<String>,
    apiKey: Option<String>,
) -> Result<Value, String> {
    log::info!("[EnhancedGeneration] 增強插畫生成請求，專案: {}", projectId);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    // 創建插畫管理器
    let mut manager = IllustrationManager::new(db_arc)
        .map_err(|e| format!("插畫管理器初始化失敗: {:?}", e))?;
    
    // 初始化 Imagen API（如果提供了 API 金鑰）
    if let Some(key) = apiKey {
        manager.initialize_imagen_service(key)
            .map_err(|e| format!("Imagen API 初始化失敗: {:?}", e))?;
    } else {
        return Err("需要提供 Google Cloud API 金鑰".to_string());
    }
    
    // 構建增強請求
    let basic_request = IllustrationRequest {
        project_id: projectId,
        character_id: characterId,
        scene_description: sceneDescription,
        style_template_id: templateId.clone(),
        custom_style_params: None,
        use_reference_image: true,
        quality_preset: "balanced".to_string(),
        batch_size: Some(1),
    };
    
    let enhanced_request = EnhancedIllustrationRequest {
        basic_request,
        template_id: templateId,
        translation_style: translationStyle,
        optimization_level: optimizationLevel,
        consistency_mode: Some("seed_reference".to_string()),
        custom_negative_prompt: customNegativePrompt,
        aspect_ratio: aspectRatio,
        safety_level: safetyLevel,
        guidance_scale: Some(7.5),
    };
    
    // 執行生成
    match manager.generate_illustration(enhanced_request).await {
        Ok(result) => {
            log::info!("[EnhancedGeneration] 插畫生成成功，任務ID: {}", result.basic_response.id);
            
            let response = serde_json::json!({
                "success": true,
                "task_id": result.basic_response.id,
                "status": result.basic_response.status,
                "image_url": result.basic_response.image_url,
                "translated_prompt": result.basic_response.translated_prompt,
                "seed_value": result.basic_response.seed_value,
                "consistency_score": result.basic_response.consistency_score,
                "quality_score": result.basic_response.quality_score,
                "generation_time_ms": result.basic_response.generation_time_ms,
                "images": result.generated_images.iter().map(|img| serde_json::json!({
                    "image_id": img.image_id,
                    "width": img.width,
                    "height": img.height,
                    "file_size_bytes": img.file_size_bytes,
                    "safety_rating": img.safety_rating,
                    "quality_score": img.quality_score,
                    "file_path": img.file_path
                })).collect::<Vec<_>>(),
                "translation_info": result.translation_result.as_ref().map(|t| serde_json::json!({
                    "original_chinese": t.original_chinese,
                    "translated_prompt": t.translated_prompt,
                    "confidence_score": t.confidence_score,
                    "vocabulary_coverage": t.vocabulary_coverage,
                    "applied_template": t.applied_template
                })),
                "optimization_info": result.optimization_result.as_ref().map(|o| serde_json::json!({
                    "original_prompt": o.original_prompt,
                    "optimized_prompt": o.optimized_prompt,
                    "negative_prompt": o.negative_prompt,
                    "improvement_score": o.improvement_score,
                    "applied_optimizations": o.applied_optimizations
                })),
                "consistency_analysis": result.consistency_analysis.as_ref().map(|c| serde_json::json!({
                    "character_seed": c.character_seed,
                    "consistency_score": c.consistency_score,
                    "visual_traits_match": c.visual_traits_match,
                    "reference_image_similarity": c.reference_image_similarity
                })),
                "metadata": {
                    "total_time_ms": result.generation_metadata.total_time_ms,
                    "translation_time_ms": result.generation_metadata.translation_time_ms,
                    "generation_time_ms": result.generation_metadata.generation_time_ms,
                    "processing_time_ms": result.generation_metadata.processing_time_ms,
                    "estimated_cost": result.generation_metadata.estimated_cost,
                    "model_used": result.generation_metadata.model_used,
                    "timestamp": result.generation_metadata.timestamp
                }
            });
            
            Ok(response)
        },
        Err(e) => {
            log::error!("[EnhancedGeneration] 插畫生成失敗: {:?}", e);
            Err(format!("插畫生成失敗: {:?}", e))
        }
    }
}

/// 基礎插畫生成（向後兼容）
#[tauri::command]
pub async fn generate_illustration(
    request: Value, // IllustrationRequest as JSON
) -> Result<Value, String> {
    log::info!("[EnhancedGeneration] 基礎插畫生成請求");
    
    // 解析請求
    let illustration_request: IllustrationRequest = serde_json::from_value(request)
        .map_err(|e| format!("請求解析失敗: {}", e))?;
    
    // 轉換為增強請求並調用增強生成
    generate_enhanced_illustration(
        illustration_request.project_id,
        illustration_request.character_id,
        illustration_request.scene_description,
        illustration_request.style_template_id,
        Some("anime".to_string()),   // 預設動漫風格
        Some("standard".to_string()), // 預設標準優化
        Some("square".to_string()),   // 預設方形
        Some("block_most".to_string()), // 預設最高安全等級
        None,                         // 無自定義負面提示詞
        None,                         // 需要用戶提供 API 金鑰
    ).await
}

/// 獲取插畫生成狀態
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_illustration_generation_status(
    taskId: String,
) -> Result<Value, String> {
    log::info!("[EnhancedGeneration] 查詢插畫生成狀態: {}", taskId);
    
    // 由於 IllustrationManager 需要資料庫初始化，這裡簡化實現
    // 實際應用中應該維護一個全局的管理器實例
    Ok(serde_json::json!({
        "success": false,
        "message": "狀態查詢功能需要維護全局管理器實例",
        "task_id": taskId
    }))
}

/// 取消插畫生成
#[tauri::command]
#[allow(non_snake_case)]
pub async fn cancel_illustration_generation(
    taskId: String,
) -> Result<Value, String> {
    log::info!("[EnhancedGeneration] 取消插畫生成: {}", taskId);
    
    // 簡化實現
    Ok(serde_json::json!({
        "success": false,
        "message": "取消功能需要維護全局管理器實例",
        "task_id": taskId
    }))
}

/// 驗證 Imagen API 連線
#[tauri::command]
#[allow(non_snake_case)]
pub async fn validate_imagen_api_connection(
    apiKey: String,
) -> Result<Value, String> {
    log::info!("[EnhancedGeneration] 驗證 Imagen API 連線");
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let mut manager = IllustrationManager::new(db_arc)
        .map_err(|e| format!("插畫管理器初始化失敗: {:?}", e))?;
    
    manager.initialize_imagen_service(apiKey)
        .map_err(|e| format!("Imagen API 初始化失敗: {:?}", e))?;
    
    match manager.validate_api_connection().await {
        Ok(is_valid) => {
            Ok(serde_json::json!({
                "success": true,
                "valid": is_valid,
                "message": if is_valid { "API 連線驗證成功" } else { "API 連線驗證失敗" }
            }))
        },
        Err(e) => {
            log::error!("[EnhancedGeneration] API 連線驗證失敗: {:?}", e);
            Ok(serde_json::json!({
                "success": false,
                "valid": false,
                "error": format!("{:?}", e)
            }))
        }
    }
}