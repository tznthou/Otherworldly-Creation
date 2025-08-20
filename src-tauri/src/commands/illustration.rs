use serde_json::Value;
use crate::services::illustration::{
    CharacterConsistencyManager, SeedManager, VisualTraitsManager,
    IllustrationManager, EnhancedIllustrationRequest,
    IllustrationRequest, PollinationsApiService, PollinationsRequest,
    PollinationsModel
};
use crate::database::connection::create_connection;
use std::sync::{Arc, Mutex};

/// 為角色建立視覺一致性配置
#[tauri::command]
pub async fn setup_character_consistency(
    character_id: String,
    character_name: String,
    description: String,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 設置角色一致性: {} ({})", character_name, character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let consistency_manager = CharacterConsistencyManager::new(db_arc);
    
    match consistency_manager.setup_character_consistency(&character_id, &character_name, &description) {
        Ok(visual_traits) => {
            log::info!("[IllustrationCommand] 角色一致性設置成功: {}", character_name);
            
            // 轉換為前端可用的 JSON 格式
            let response = serde_json::json!({
                "success": true,
                "character_id": visual_traits.character_id,
                "seed_value": visual_traits.seed_value,
                "standard_description": visual_traits.standard_description,
                "chinese_description": visual_traits.chinese_description,
                "traits_version": visual_traits.traits_version,
                "created_at": visual_traits.created_at
            });
            
            Ok(response)
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 角色一致性設置失敗: {:?}", e);
            Err(format!("角色一致性設置失敗: {:?}", e))
        }
    }
}

/// 生成角色一致性檢查報告
#[tauri::command]
pub async fn generate_consistency_report(
    character_id: String,
    character_name: String,
    strict_mode: Option<bool>,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 生成一致性報告: {} ({})", character_name, character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let consistency_manager = CharacterConsistencyManager::new(db_arc);
    
    // 設定檢查配置
    let config = crate::services::illustration::character_consistency::ConsistencyCheckConfig {
        check_seed_stability: true,
        check_visual_completeness: true,
        check_reference_quality: true,
        minimum_consistency_score: 0.7,
        strict_mode: strict_mode.unwrap_or(false),
    };
    
    match consistency_manager.check_character_consistency(&character_id, &character_name, &config) {
        Ok(report) => {
            log::info!("[IllustrationCommand] 一致性報告生成成功，總分: {:.2}", report.overall_score);
            
            // 轉換為 JSON 響應
            match serde_json::to_value(&report) {
                Ok(json_report) => Ok(serde_json::json!({
                    "success": true,
                    "report": json_report
                })),
                Err(e) => Err(format!("JSON 序列化失敗: {}", e))
            }
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 一致性報告生成失敗: {:?}", e);
            Err(format!("一致性報告生成失敗: {:?}", e))
        }
    }
}

/// 手動設定角色的 seed 值
#[tauri::command]
pub async fn set_character_seed(
    character_id: String,
    seed_value: u32,
    reason: String,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 手動設定 seed: {} for character: {}", seed_value, character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let seed_manager = SeedManager::new(db_arc);
    
    match seed_manager.set_manual_seed(&character_id, seed_value, &reason) {
        Ok(_) => {
            log::info!("[IllustrationCommand] Seed 設定成功");
            Ok(serde_json::json!({
                "success": true,
                "character_id": character_id,
                "seed_value": seed_value,
                "message": "Seed 值設定成功"
            }))
        },
        Err(e) => {
            log::error!("[IllustrationCommand] Seed 設定失敗: {:?}", e);
            Err(format!("Seed 設定失敗: {:?}", e))
        }
    }
}

/// 添加參考圖像
#[tauri::command]
pub async fn add_reference_image(
    character_id: String,
    image_url: String,
    image_type: String, // "full_body", "half_body", "portrait", etc.
    tags: Vec<String>,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 添加參考圖像: {} for character: {}", image_url, character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let traits_manager = VisualTraitsManager::new(db_arc);
    
    // 轉換圖像類型
    let reference_type = match image_type.as_str() {
        "full_body" => crate::services::illustration::visual_traits::ReferenceImageType::FullBody,
        "half_body" => crate::services::illustration::visual_traits::ReferenceImageType::HalfBody,
        "portrait" => crate::services::illustration::visual_traits::ReferenceImageType::Portrait,
        expression => crate::services::illustration::visual_traits::ReferenceImageType::Expression(expression.to_string()),
    };
    
    match traits_manager.add_reference_image(&character_id, &image_url, reference_type, tags.clone()) {
        Ok(_) => {
            log::info!("[IllustrationCommand] 參考圖像添加成功");
            Ok(serde_json::json!({
                "success": true,
                "character_id": character_id,
                "image_url": image_url,
                "image_type": image_type,
                "tags": tags,
                "message": "參考圖像添加成功"
            }))
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 參考圖像添加失敗: {:?}", e);
            Err(format!("參考圖像添加失敗: {:?}", e))
        }
    }
}

/// 獲取角色的視覺特徵信息
#[tauri::command]
pub async fn get_character_visual_traits(
    character_id: String,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 獲取角色視覺特徵: {}", character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let traits_manager = VisualTraitsManager::new(db_arc);
    
    match traits_manager.load_visual_traits(&character_id) {
        Ok(Some(traits)) => {
            log::info!("[IllustrationCommand] 視覺特徵獲取成功");
            
            match serde_json::to_value(&traits) {
                Ok(json_traits) => Ok(serde_json::json!({
                    "success": true,
                    "traits": json_traits
                })),
                Err(e) => Err(format!("JSON 序列化失敗: {}", e))
            }
        },
        Ok(None) => {
            log::warn!("[IllustrationCommand] 角色視覺特徵不存在: {}", character_id);
            Ok(serde_json::json!({
                "success": false,
                "message": "角色視覺特徵不存在",
                "character_id": character_id
            }))
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 視覺特徵獲取失敗: {:?}", e);
            Err(format!("視覺特徵獲取失敗: {:?}", e))
        }
    }
}

/// 計算專案中所有角色的相似度矩陣
#[tauri::command]
pub async fn calculate_character_similarity_matrix(
    project_id: String,
    character_ids: Vec<String>,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 計算角色相似度矩陣，專案: {}, 角色數量: {}", project_id, character_ids.len());
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let consistency_manager = CharacterConsistencyManager::new(db_arc);
    
    match consistency_manager.calculate_character_similarity_matrix(&character_ids) {
        Ok(similarity_matrix) => {
            log::info!("[IllustrationCommand] 相似度矩陣計算成功: {}x{}", similarity_matrix.len(), 
                      similarity_matrix.first().map(|row| row.len()).unwrap_or(0));
                      
            Ok(serde_json::json!({
                "success": true,
                "project_id": project_id,
                "character_ids": character_ids,
                "similarity_matrix": similarity_matrix
            }))
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 相似度矩陣計算失敗: {:?}", e);
            Err(format!("相似度矩陣計算失敗: {:?}", e))
        }
    }
}

/// 批次檢查專案中所有角色的一致性
#[tauri::command]
pub async fn batch_check_project_consistency(
    project_id: String,
    strict_mode: Option<bool>,
    minimum_score: Option<f64>,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 批次檢查專案一致性: {}", project_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let consistency_manager = CharacterConsistencyManager::new(db_arc);
    
    // 設定檢查配置
    let config = crate::services::illustration::character_consistency::ConsistencyCheckConfig {
        check_seed_stability: true,
        check_visual_completeness: true,
        check_reference_quality: true,
        minimum_consistency_score: minimum_score.unwrap_or(0.7),
        strict_mode: strict_mode.unwrap_or(false),
    };
    
    match consistency_manager.batch_check_project_consistency(&project_id, &config) {
        Ok(reports) => {
            log::info!("[IllustrationCommand] 批次一致性檢查完成，報告數量: {}", reports.len());
            
            match serde_json::to_value(&reports) {
                Ok(json_reports) => Ok(serde_json::json!({
                    "success": true,
                    "project_id": project_id,
                    "total_characters": reports.len(),
                    "reports": json_reports
                })),
                Err(e) => Err(format!("JSON 序列化失敗: {}", e))
            }
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 批次一致性檢查失敗: {:?}", e);
            Err(format!("批次一致性檢查失敗: {:?}", e))
        }
    }
}

/// 生成批次 seed 值（用於生成相似但略有不同的圖像）
#[tauri::command]
pub async fn generate_batch_seeds(
    base_seed: u32,
    count: u32,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 生成批次 seed，基礎值: {}，數量: {}", base_seed, count);
    
    if count > 50 {
        return Err("批次 seed 數量不能超過 50".to_string());
    }
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let seed_manager = SeedManager::new(db_arc);
    let batch_seeds = seed_manager.generate_batch_seeds(base_seed, count);
    
    log::info!("[IllustrationCommand] 批次 seed 生成完成: {} 個", batch_seeds.len());
    
    Ok(serde_json::json!({
        "success": true,
        "base_seed": base_seed,
        "count": count,
        "seeds": batch_seeds
    }))
}

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
    log::info!("[IllustrationCommand] 增強插畫生成請求，專案: {}", projectId);
    
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
            log::info!("[IllustrationCommand] 插畫生成成功，任務ID: {}", result.basic_response.id);
            
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
            log::error!("[IllustrationCommand] 插畫生成失敗: {:?}", e);
            Err(format!("插畫生成失敗: {:?}", e))
        }
    }
}

/// 基礎插畫生成（向後兼容）
#[tauri::command]
pub async fn generate_illustration(
    request: Value, // IllustrationRequest as JSON
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 基礎插畫生成請求");
    
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
    log::info!("[IllustrationCommand] 查詢插畫生成狀態: {}", taskId);
    
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
    log::info!("[IllustrationCommand] 取消插畫生成: {}", taskId);
    
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
    log::info!("[IllustrationCommand] 驗證 Imagen API 連線");
    
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
            log::error!("[IllustrationCommand] API 連線驗證失敗: {:?}", e);
            Ok(serde_json::json!({
                "success": false,
                "valid": false,
                "error": format!("{:?}", e)
            }))
        }
    }
}

// ========================= 免費插畫生成功能 =========================

/// 免費插畫生成 - 使用 Pollinations.AI
#[tauri::command]
#[allow(non_snake_case)]
pub async fn generate_free_illustration(
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
    log::info!("[IllustrationCommand] 免費插畫生成請求: {}", prompt);
    
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
        _ => PollinationsModel::Flux, // 預設使用 Flux
    };

    // 處理風格增強
    let enhanced_prompt = if let Some(ref style_name) = style {
        match style_name.as_str() {
            "anime" => format!("{}, 動漫風格, 高品質插畫, 精緻線條", prompt),
            "realistic" => format!("{}, 寫實風格, 專業攝影, 高解析度", prompt),
            "fantasy" => format!("{}, 奇幻風格, 魔法世界, 夢幻色彩", prompt),
            "watercolor" => format!("{}, 水彩風格, 柔和色調, 藝術繪畫", prompt),
            "digital_art" => format!("{}, 數位藝術, 現代風格, 精緻渲染", prompt),
            _ => prompt.clone(),
        }
    } else {
        prompt.clone()
    };

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
            log::info!("[IllustrationCommand] 免費插畫生成成功，耗時: {}ms", response.generation_time_ms);
            
            // 儲存圖像到本地
            let image_path = save_generated_image(&response.image_data, &response.id)
                .map_err(|e| format!("圖像儲存失敗: {}", e))?;
            
            // 計算檔案大小
            let file_size = response.image_data.len() as i64;
            
            // 保存生成歷史到數據庫
            if let Err(e) = save_pollinations_history(
                &response.id,
                projectId.as_deref(),
                characterId.as_deref(),
                &prompt,
                &response.prompt, // 使用回應中的實際提示詞
                &response.parameters.model,
                response.parameters.width as i32,
                response.parameters.height as i32,
                response.parameters.seed.map(|s| s as i32),
                response.parameters.enhance,
                style.as_deref(),
                response.image_url.as_deref(),
                &image_path,
                file_size,
                response.generation_time_ms as i32,
            ) {
                log::warn!("[IllustrationCommand] 保存生成歷史失敗: {}", e);
                // 不阻斷主流程，只記錄警告
            }
            
            Ok(serde_json::json!({
                "success": true,
                "id": response.id,
                "prompt": response.prompt,
                "image_path": image_path,
                "image_url": response.image_url,
                "parameters": {
                    "model": response.parameters.model,
                    "width": response.parameters.width,
                    "height": response.parameters.height,
                    "seed": response.parameters.seed,
                    "enhance": response.parameters.enhance
                },
                "generation_time_ms": response.generation_time_ms,
                "provider": "pollinations",
                "is_free": true
            }))
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 免費插畫生成失敗: {:?}", e);
            
            // 即使失敗也記錄到數據庫
            let generation_id = uuid::Uuid::new_v4().to_string();
            if let Err(save_err) = save_pollinations_history_failed(
                &generation_id,
                projectId.as_deref(),
                characterId.as_deref(),
                &prompt,
                &prompt, // 失敗時使用原始提示詞
                model.as_deref().unwrap_or("flux"),
                width.unwrap_or(1024) as i32,
                height.unwrap_or(1024) as i32,
                seed.map(|s| s as i32),
                enhance.unwrap_or(false),
                style.as_deref(),
                &format!("{:?}", e),
            ) {
                log::warn!("[IllustrationCommand] 保存失敗記錄失敗: {}", save_err);
            }
            
            Err(format!("免費插畫生成失敗: {:?}", e))
        }
    }
}

/// 測試 Pollinations API 連接
#[tauri::command]
pub async fn test_pollinations_connection() -> Result<Value, String> {
    log::info!("[IllustrationCommand] 測試 Pollinations API 連接");
    
    let service = PollinationsApiService::new()
        .map_err(|e| format!("Pollinations API 服務初始化失敗: {:?}", e))?;

    match service.test_connection().await {
        Ok(is_connected) => {
            log::info!("[IllustrationCommand] Pollinations API 連接測試結果: {}", is_connected);
            
            Ok(serde_json::json!({
                "success": true,
                "connected": is_connected,
                "message": if is_connected { 
                    "Pollinations API 連接正常" 
                } else { 
                    "Pollinations API 連接失敗" 
                },
                "provider": "pollinations",
                "is_free": true
            }))
        },
        Err(e) => {
            log::error!("[IllustrationCommand] Pollinations API 連接測試失敗: {:?}", e);
            Err(format!("API 連接測試失敗: {:?}", e))
        }
    }
}

/// 獲取插畫生成歷史
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_illustration_history(
    projectId: Option<String>,
    characterId: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 獲取插畫歷史，專案: {:?}, 角色: {:?}", projectId, characterId);
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    let mut query = String::from(
        "SELECT 
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, seed, enhance, style_applied,
            image_url, local_file_path, file_size_bytes, generation_time_ms,
            status, error_message, created_at, batch_id, user_rating, is_favorite
         FROM pollinations_generations"
    );
    
    let mut conditions = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(ref pid) = projectId {
        conditions.push("project_id = ?");
        params.push(Box::new(pid.clone()));
    }
    
    if let Some(ref cid) = characterId {
        conditions.push("character_id = ?");
        params.push(Box::new(cid.clone()));
    }
    
    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }
    
    query.push_str(" ORDER BY created_at DESC");
    
    if let Some(limit_val) = limit {
        query.push_str(" LIMIT ?");
        params.push(Box::new(limit_val));
    }
    
    if let Some(offset_val) = offset {
        query.push_str(" OFFSET ?");
        params.push(Box::new(offset_val));
    }
    
    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("SQL 準備失敗: {}", e))?;
    
    // 轉換參數為引用
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    
    let rows = stmt.query_map(&param_refs[..], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "project_id": row.get::<_, Option<String>>(1)?,
            "character_id": row.get::<_, Option<String>>(2)?,
            "original_prompt": row.get::<_, String>(3)?,
            "enhanced_prompt": row.get::<_, String>(4)?,
            "model": row.get::<_, String>(5)?,
            "width": row.get::<_, i32>(6)?,
            "height": row.get::<_, i32>(7)?,
            "seed": row.get::<_, Option<i32>>(8)?,
            "enhance": row.get::<_, bool>(9)?,
            "style_applied": row.get::<_, Option<String>>(10)?,
            "image_url": row.get::<_, Option<String>>(11)?,
            "local_file_path": row.get::<_, Option<String>>(12)?,
            "file_size_bytes": row.get::<_, Option<i64>>(13)?,
            "generation_time_ms": row.get::<_, Option<i32>>(14)?,
            "status": row.get::<_, String>(15)?,
            "error_message": row.get::<_, Option<String>>(16)?,
            "created_at": row.get::<_, String>(17)?,
            "batch_id": row.get::<_, Option<String>>(18)?,
            "user_rating": row.get::<_, Option<i32>>(19)?,
            "is_favorite": row.get::<_, bool>(20)?,
            "provider": "pollinations",
            "is_free": true
        }))
    }).map_err(|e| format!("查詢執行失敗: {}", e))?;
    
    let mut illustrations = Vec::new();
    for row in rows {
        match row {
            Ok(illustration) => illustrations.push(illustration),
            Err(e) => {
                log::warn!("[IllustrationCommand] 跳過無效記錄: {}", e);
            }
        }
    }
    
    log::info!("[IllustrationCommand] 獲取插畫歷史成功，共 {} 條記錄", illustrations.len());
    
    Ok(serde_json::json!({
        "success": true,
        "illustrations": illustrations,
        "total": illustrations.len(),
        "project_id": projectId,
        "character_id": characterId
    }))
}

/// 取得支援的免費模型列表
#[tauri::command]
pub async fn get_free_illustration_models() -> Result<Value, String> {
    log::info!("[IllustrationCommand] 取得免費插畫模型列表");
    
    let service = PollinationsApiService::new()
        .map_err(|e| format!("Pollinations API 服務初始化失敗: {:?}", e))?;

    let models = service.get_supported_models();
    
    let model_list: Vec<_> = models.into_iter().map(|(model, name, description)| {
        serde_json::json!({
            "id": format!("{:?}", model).to_lowercase(),
            "name": name,
            "description": description,
            "is_free": true,
            "provider": "pollinations"
        })
    }).collect();

    Ok(serde_json::json!({
        "success": true,
        "models": model_list,
        "provider": "pollinations",
        "total_count": model_list.len()
    }))
}

// ========================= 輔助函數 =========================

/// 儲存生成的圖像到本地
fn save_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs;
    
    // 確保圖像目錄存在（使用與EPUB/PDF相同的路徑）
    let images_dir = dirs::home_dir()
        .ok_or("無法獲取用戶目錄")?
        .join("Library")
        .join("Application Support")
        .join("genesis-chronicle")
        .join("generated-images");
    
    fs::create_dir_all(&images_dir)?;
    
    // 生成檔案路徑
    let filename = format!("{}.jpg", image_id);
    let file_path = images_dir.join(&filename);
    
    // 寫入圖像數據
    fs::write(&file_path, image_data)?;
    
    Ok(file_path.to_string_lossy().to_string())
}

/// 保存成功的 Pollinations 生成歷史記錄
fn save_pollinations_history(
    id: &str,
    project_id: Option<&str>,
    character_id: Option<&str>,
    original_prompt: &str,
    enhanced_prompt: &str,
    model: &str,
    width: i32,
    height: i32,
    seed: Option<i32>,
    enhance: bool,
    style_applied: Option<&str>,
    image_url: Option<&str>,
    local_file_path: &str,
    file_size_bytes: i64,
    generation_time_ms: i32,
) -> Result<(), String> {
    use rusqlite::params;
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    conn.execute(
        "INSERT INTO pollinations_generations (
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, seed, enhance, style_applied,
            image_url, local_file_path, file_size_bytes, generation_time_ms,
            status, created_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 'completed', CURRENT_TIMESTAMP
        )",
        params![
            id,
            project_id,
            character_id,
            original_prompt,
            enhanced_prompt,
            model,
            width,
            height,
            seed,
            enhance,
            style_applied,
            image_url,
            local_file_path,
            file_size_bytes,
            generation_time_ms
        ],
    ).map_err(|e| format!("插入生成歷史失敗: {}", e))?;
    
    // 更新使用統計
    update_pollinations_stats(model, true, generation_time_ms as u64, file_size_bytes as u64)?;
    
    Ok(())
}

/// 保存失敗的 Pollinations 生成歷史記錄
fn save_pollinations_history_failed(
    id: &str,
    project_id: Option<&str>,
    character_id: Option<&str>,
    original_prompt: &str,
    enhanced_prompt: &str,
    model: &str,
    width: i32,
    height: i32,
    seed: Option<i32>,
    enhance: bool,
    style_applied: Option<&str>,
    error_message: &str,
) -> Result<(), String> {
    use rusqlite::params;
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    conn.execute(
        "INSERT INTO pollinations_generations (
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, seed, enhance, style_applied,
            status, error_message, created_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'failed', ?12, CURRENT_TIMESTAMP
        )",
        params![
            id,
            project_id,
            character_id,
            original_prompt,
            enhanced_prompt,
            model,
            width,
            height,
            seed,
            enhance,
            style_applied,
            error_message
        ],
    ).map_err(|e| format!("插入失敗記錄失敗: {}", e))?;
    
    // 更新使用統計（失敗記錄）
    update_pollinations_stats(model, false, 0, 0)?;
    
    Ok(())
}

/// 更新 Pollinations 使用統計
fn update_pollinations_stats(
    model: &str,
    success: bool,
    generation_time_ms: u64,
    file_size_bytes: u64,
) -> Result<(), String> {
    use rusqlite::params;
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    // 檢查是否需要重置每日計數
    conn.execute(
        "UPDATE pollinations_usage_stats 
         SET daily_generation_count = 0, daily_reset_date = CURRENT_DATE
         WHERE daily_reset_date < CURRENT_DATE",
        [],
    ).map_err(|e| format!("重置每日計數失敗: {}", e))?;
    
    // 確定模型計數欄位
    let model_field = match model {
        "flux" => "flux_usage",
        "gptimage" => "gptimage_usage", 
        "kontext" => "kontext_usage",
        "sdxl" => "sdxl_usage",
        _ => "flux_usage", // 預設
    };
    
    let sql = if success {
        format!(
            "UPDATE pollinations_usage_stats SET
                total_generations = total_generations + 1,
                total_success = total_success + 1,
                {} = {} + 1,
                total_generation_time_ms = total_generation_time_ms + ?,
                total_images_stored = total_images_stored + 1,
                total_storage_bytes = total_storage_bytes + ?,
                daily_generation_count = daily_generation_count + 1,
                last_generation_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = 'singleton'",
            model_field, model_field
        )
    } else {
        format!(
            "UPDATE pollinations_usage_stats SET
                total_generations = total_generations + 1,
                total_failures = total_failures + 1,
                daily_generation_count = daily_generation_count + 1,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = 'singleton'",
        )
    };
    
    if success {
        let time_ms = generation_time_ms as i64;
        let size_bytes = file_size_bytes as i64;
        conn.execute(
            &sql,
            params![time_ms, size_bytes],
        ).map_err(|e| format!("更新統計失敗: {}", e))?;
    } else {
        conn.execute(
            &sql,
            params![],
        ).map_err(|e| format!("更新統計失敗: {}", e))?;
    }
    
    // 計算並更新平均生成時間
    if success {
        conn.execute(
            "UPDATE pollinations_usage_stats SET
                avg_generation_time_ms = CAST(total_generation_time_ms AS REAL) / total_success
             WHERE id = 'singleton' AND total_success > 0",
            [],
        ).map_err(|e| format!("更新平均時間失敗: {}", e))?;
    }
    
    Ok(())
}

// ========================= 臨時圖像預覽管理 =========================

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
    log::info!("[IllustrationCommand] 免費插畫生成到臨時目錄: {}", prompt);
    
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

    // 處理風格增強
    let enhanced_prompt = if let Some(ref style_name) = style {
        match style_name.as_str() {
            "anime" => format!("{}, 動漫風格, 高品質插畫, 精緻線條", prompt),
            "realistic" => format!("{}, 寫實風格, 專業攝影, 高解析度", prompt),
            "fantasy" => format!("{}, 奇幻風格, 魔法世界, 夢幻色彩", prompt),
            "watercolor" => format!("{}, 水彩風格, 柔和色調, 藝術繪畫", prompt),
            "digital_art" => format!("{}, 數位藝術, 現代風格, 精緻渲染", prompt),
            _ => prompt.clone(),
        }
    } else {
        prompt.clone()
    };

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
            log::info!("[IllustrationCommand] 免費插畫生成成功，耗時: {}ms", response.generation_time_ms);
            
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
            log::error!("[IllustrationCommand] 免費插畫生成失敗: {:?}", e);
            Err(format!("免費插畫生成失敗: {:?}", e))
        }
    }
}

/// 確認保存臨時圖像到正式目錄
#[tauri::command]
pub async fn confirm_temp_image_save(
    temp_image_data: Value
) -> Result<Value, String> {
    log::info!("[IllustrationCommand] 確認保存臨時圖像");
    
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
    if let Err(e) = save_pollinations_history(
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
        log::warn!("[IllustrationCommand] 保存生成歷史失敗: {}", e);
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
    log::info!("[IllustrationCommand] 刪除臨時圖像: {}", temp_path);
    
    use std::fs;
    
    match fs::remove_file(&temp_path) {
        Ok(_) => {
            log::info!("[IllustrationCommand] 臨時圖像已刪除: {}", temp_path);
            Ok(serde_json::json!({
                "success": true,
                "message": "臨時圖像已刪除"
            }))
        },
        Err(e) => {
            log::error!("[IllustrationCommand] 刪除臨時圖像失敗: {}", e);
            Err(format!("刪除臨時圖像失敗: {}", e))
        }
    }
}

/// 清理過期的臨時圖像（超過24小時）
#[tauri::command]
pub async fn cleanup_expired_temp_images() -> Result<Value, String> {
    log::info!("[IllustrationCommand] 清理過期的臨時圖像");
    
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
                            log::info!("[IllustrationCommand] 已清理過期臨時圖像: {:?}", entry.path());
                        }
                    }
                }
            }
        }
    }
    
    log::info!("[IllustrationCommand] 清理完成，共清理 {} 個過期臨時圖像", cleaned_count);
    
    Ok(serde_json::json!({
        "success": true,
        "cleaned_count": cleaned_count,
        "message": format!("已清理 {} 個過期臨時圖像", cleaned_count)
    }))
}

// ========================= 臨時圖像輔助函數 =========================

/// 獲取臨時圖像目錄
fn get_temp_images_dir() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
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
fn save_temp_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
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
fn move_temp_to_final_image(temp_path: &str, image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
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