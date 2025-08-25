use serde_json::Value;
use crate::services::illustration::{
    PollinationsApiService, PollinationsRequest, PollinationsModel
};
use crate::database::connection::create_connection;

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
    log::info!("[FreeGeneration] 免費插畫生成請求: {}", prompt);
    
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

    // 優化：使用原始prompt，移除強制風格添加
    // 只有用戶明確要求時才添加風格描述
    let enhanced_prompt = if let Some(ref style_name) = style {
        match style_name.as_str() {
            "anime" => format!("{}, 動漫風格", prompt),
            "realistic" => format!("{}, 寫實風格", prompt),
            "fantasy" => format!("{}, 奇幻風格", prompt),
            "watercolor" => format!("{}, 水彩風格", prompt),
            "digital_art" => format!("{}, 數位藝術風格", prompt),
            _ => prompt.clone(),
        }
    } else {
        // 沒有指定風格時，直接使用原始prompt
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
            log::info!("[FreeGeneration] 免費插畫生成成功，耗時: {}ms", response.generation_time_ms);
            
            // 儲存圖像到本地
            let image_path = super::utils::save_generated_image(&response.image_data, &response.id)
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
                log::warn!("[FreeGeneration] 保存生成歷史失敗: {}", e);
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
            log::error!("[FreeGeneration] 免費插畫生成失敗: {:?}", e);
            
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
                log::warn!("[FreeGeneration] 保存失敗記錄失敗: {}", save_err);
            }
            
            Err(format!("免費插畫生成失敗: {:?}", e))
        }
    }
}

/// 測試 Pollinations API 連接
#[tauri::command]
pub async fn test_pollinations_connection() -> Result<Value, String> {
    log::info!("[FreeGeneration] 測試 Pollinations API 連接");
    
    let service = PollinationsApiService::new()
        .map_err(|e| format!("Pollinations API 服務初始化失敗: {:?}", e))?;

    match service.test_connection().await {
        Ok(is_connected) => {
            log::info!("[FreeGeneration] Pollinations API 連接測試結果: {}", is_connected);
            
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
            log::error!("[FreeGeneration] Pollinations API 連接測試失敗: {:?}", e);
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
    log::info!("[FreeGeneration] 獲取插畫歷史，專案: {:?}, 角色: {:?}", projectId, characterId);
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    let mut query = String::from(
        "SELECT 
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, seed, enhance, style_applied,
            image_url, local_file_path, file_size_bytes, generation_time_ms,
            status, error_message, created_at, batch_id, user_rating, is_favorite
         FROM pollinations_generations
         WHERE deleted_at IS NULL"
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
        query.push_str(" AND ");
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
                log::warn!("[FreeGeneration] 跳過無效記錄: {}", e);
            }
        }
    }
    
    log::info!("[FreeGeneration] 獲取插畫歷史成功，共 {} 條記錄", illustrations.len());
    
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
    log::info!("[FreeGeneration] 取得免費插畫模型列表");
    
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

/// 保存成功的 Pollinations 生成歷史記錄
pub fn save_pollinations_history(
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
pub fn save_pollinations_history_failed(
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
pub fn update_pollinations_stats(
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