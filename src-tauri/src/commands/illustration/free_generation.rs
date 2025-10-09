use serde_json::Value;
use crate::services::illustration::pollinations_api::{
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
    log::info!("🔍 [get_illustration_history] API調用 - 專案: {:?}, 角色: {:?}, limit: {:?}, offset: {:?}", projectId, characterId, limit, offset);
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    
    let mut all_illustrations = Vec::new();
    
    // 🎯 查詢 pollinations_generations 表
    let mut pollinations_query = String::from(
        "SELECT 
            id, project_id, character_id, original_prompt, enhanced_prompt,
            model, width, height, seed, enhance, style_applied,
            image_url, local_file_path, file_size_bytes, generation_time_ms,
            status, error_message, created_at, batch_id, user_rating, is_favorite
         FROM pollinations_generations
         WHERE deleted_at IS NULL"
    );
    
    // 🎯 查詢 illustration_generations 表 (Gemini, OpenAI 等)
    // 🔧 修復：Gemini 的 image_url 欄位實際存的是相對路徑，不是 HTTP URL
    let mut illustration_query = String::from(
        "SELECT
            id, project_id, character_id, scene_description as original_prompt, translated_prompt as enhanced_prompt,
            api_model as model,
            CAST(SUBSTR(image_size, 1, INSTR(image_size, 'x') - 1) AS INTEGER) as width,
            CAST(SUBSTR(image_size, INSTR(image_size, 'x') + 1) AS INTEGER) as height,
            seed_value as seed, 0 as enhance, '' as style_applied,
            NULL as image_url, image_url as local_file_path, file_size, generation_time_ms,
            status, error_message, created_at, batch_id, user_rating, is_favorite,
            api_provider, is_confirmed
         FROM illustration_generations
         WHERE deleted_at IS NULL AND is_permanently_deleted = 0"
    );
    
    // 構建條件和參數
    let mut conditions = Vec::new();
    let mut pollinations_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut illustration_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(ref pid) = projectId {
        conditions.push("project_id = ?");
        pollinations_params.push(Box::new(pid.clone()));
        illustration_params.push(Box::new(pid.clone()));
    }
    
    if let Some(ref cid) = characterId {
        conditions.push("character_id = ?");
        pollinations_params.push(Box::new(cid.clone()));
        illustration_params.push(Box::new(cid.clone()));
    }
    
    if !conditions.is_empty() {
        let condition_str = format!(" AND {}", conditions.join(" AND "));
        pollinations_query.push_str(&condition_str);
        illustration_query.push_str(&condition_str);
    }
    
    // 🎯 處理 pollinations_generations 查詢
    let mut stmt = conn.prepare(&pollinations_query)
        .map_err(|e| format!("Pollinations SQL 準備失敗: {}", e))?;
    
    let param_refs: Vec<&dyn rusqlite::ToSql> = pollinations_params.iter().map(|p| p.as_ref()).collect();
    
    let pollinations_rows = stmt.query_map(&param_refs[..], |row| {
        let id: String = row.get(0)?;
        let project_id: Option<String> = row.get(1)?;
        let character_id: Option<String> = row.get(2)?;
        let original_prompt: String = row.get(3)?;
        let enhanced_prompt: String = row.get(4)?;
        let model: String = row.get(5)?;
        let width: i32 = row.get(6)?;
        let height: i32 = row.get(7)?;
        let seed: Option<i32> = row.get(8)?;
        let enhance: bool = row.get(9)?;
        let style_applied: Option<String> = row.get(10)?;
        let image_url: Option<String> = row.get(11)?;
        let file_path: Option<String> = row.get(12)?;
        let file_size_bytes: Option<i64> = row.get(13)?;
        let generation_time_ms: Option<i32> = row.get(14)?;
        let status: String = row.get(15)?;
        let error_message: Option<String> = row.get(16)?;
        let created_at: String = row.get(17)?;
        let batch_id: Option<String> = row.get(18)?;
        let user_rating: Option<i32> = row.get(19)?;
        let is_favorite: bool = row.get(20)?;
        
        // 直接返回檔名，前端通過 getImagePath API 獲取完整路徑
        let image_path = file_path.clone().unwrap_or_default();

        // 🔧 修復：計算完整絕對路徑供 convertFileSrc 使用
        let full_image_path = file_path.as_ref().and_then(|path| {
            crate::utils::path_utils::get_final_images_dir()
                .ok()
                .map(|dir| dir.join(path).to_string_lossy().to_string())
        });

        Ok(serde_json::json!({
            "id": id,
            "project_id": project_id,
            "character_id": character_id,
            "original_prompt": original_prompt,
            "enhanced_prompt": enhanced_prompt,
            "model": model,
            "width": width,
            "height": height,
            "seed": seed,
            "enhance": enhance,
            "style_applied": style_applied,
            "image_url": image_url,
            "local_file_path": file_path,
            "image_path": image_path,
            "full_path": full_image_path,
            "file_size_bytes": file_size_bytes,
            "generation_time_ms": generation_time_ms,
            "status": status,
            "error_message": error_message,
            "created_at": created_at,
            "batch_id": batch_id,
            "user_rating": user_rating,
            "is_favorite": is_favorite,
            "is_confirmed": true,
            "provider": "pollinations",
            "is_free": true
        }))
    }).map_err(|e| format!("Pollinations 查詢執行失敗: {}", e))?;
    
    for row in pollinations_rows {
        match row {
            Ok(illustration) => all_illustrations.push(illustration),
            Err(e) => log::warn!("[Pollinations] 跳過無效記錄: {}", e),
        }
    }
    
    // 🎯 處理 illustration_generations 查詢
    let mut stmt2 = conn.prepare(&illustration_query)
        .map_err(|e| format!("Illustration SQL 準備失敗: {}", e))?;
    
    let param_refs2: Vec<&dyn rusqlite::ToSql> = illustration_params.iter().map(|p| p.as_ref()).collect();
    
    let illustration_rows = stmt2.query_map(&param_refs2[..], |row| {
        let id: String = row.get(0)?;
        let project_id: Option<String> = row.get(1)?;
        let character_id: Option<String> = row.get(2)?;
        let original_prompt: String = row.get(3)?;
        let enhanced_prompt: Option<String> = row.get(4)?;
        let model: String = row.get(5)?;
        let width: i32 = row.get(6)?;
        let height: i32 = row.get(7)?;
        let seed: Option<i32> = row.get(8)?;
        let enhance: bool = row.get(9)?;
        let style_applied: String = row.get(10)?;
        let image_url: Option<String> = row.get(11)?;
        let file_path: Option<String> = row.get(12)?;
        let file_size_bytes: Option<i64> = row.get(13)?;
        let generation_time_ms: Option<i32> = row.get(14)?;
        let status: String = row.get(15)?;
        let error_message: Option<String> = row.get(16)?;
        let created_at: String = row.get(17)?;
        let batch_id: Option<String> = row.get(18)?;
        let user_rating: Option<i32> = row.get(19)?;
        let is_favorite: bool = row.get(20)?;
        let api_provider: String = row.get(21)?;
        let is_confirmed: bool = row.get(22)?;
        
        // 直接返回檔名，前端通過 getImagePath API 獲取完整路徑
        let image_path = file_path.clone().unwrap_or_default();

        // 🔧 修復：計算完整絕對路徑供 convertFileSrc 使用
        let full_image_path = file_path.as_ref().and_then(|path| {
            crate::utils::path_utils::get_final_images_dir()
                .ok()
                .map(|dir| dir.join(path).to_string_lossy().to_string())
        });

        // 🎯 智能模型名稱映射
        let display_model = match api_provider.as_str() {
            "gemini" | "gemini-flash" => "gemini-2.5-flash-image-preview",
            "openai" => match model.as_str() {
                "dall-e-2" => "dall-e-2",
                "dall-e-3" => "dall-e-3",
                _ => &model
            },
            "claude" => "claude-3.5-sonnet",
            "imagen" => "imagen-3",
            _ => &model
        };

        // 🎯 判斷是否免費服務
        let is_free = matches!(api_provider.as_str(), "gemini" | "gemini-flash");

        Ok(serde_json::json!({
            "id": id,
            "project_id": project_id,
            "character_id": character_id,
            "original_prompt": original_prompt,
            "enhanced_prompt": enhanced_prompt.unwrap_or_else(|| original_prompt.clone()),
            "model": display_model,
            "width": width,
            "height": height,
            "seed": seed,
            "enhance": enhance,
            "style_applied": style_applied,
            "image_url": image_url,
            "local_file_path": file_path,
            "image_path": image_path,
            "full_path": full_image_path,
            "file_size_bytes": file_size_bytes,
            "generation_time_ms": generation_time_ms,
            "status": status,
            "error_message": error_message,
            "created_at": created_at,
            "batch_id": batch_id,
            "user_rating": user_rating,
            "is_favorite": is_favorite,
            "is_confirmed": is_confirmed,
            "provider": api_provider,
            "is_free": is_free
        }))
    }).map_err(|e| format!("Illustration 查詢執行失敗: {}", e))?;
    
    for row in illustration_rows {
        match row {
            Ok(illustration) => all_illustrations.push(illustration),
            Err(e) => log::warn!("[Illustration] 跳過無效記錄: {}", e),
        }
    }
    
    // 🎯 按創建時間排序 (最新在前)
    all_illustrations.sort_by(|a, b| {
        let a_time = a.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
        let b_time = b.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
        b_time.cmp(a_time)
    });
    
    // 🎯 應用 limit 和 offset
    let total_count = all_illustrations.len();
    let start = offset.unwrap_or(0) as usize;
    let end = if let Some(limit_val) = limit {
        (start + limit_val as usize).min(total_count)
    } else {
        total_count
    };
    
    let paginated_illustrations = if start < total_count {
        all_illustrations[start..end].to_vec()
    } else {
        Vec::new()
    };
    
    log::info!("[get_illustration_history] 合併查詢成功，共 {} 條記錄，返回 {} 條", total_count, paginated_illustrations.len());
    
    Ok(serde_json::json!({
        "success": true,
        "illustrations": paginated_illustrations,
        "total": total_count,
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

/// 自動修復資料庫與檔案系統不同步問題
#[tauri::command]
#[allow(non_snake_case)]
pub async fn repair_database_sync() -> Result<Value, String> {
    log::info!("[DatabaseRepair] 開始自動修復資料庫同步問題");
    
    let conn = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let mut repaired_count = 0;
    let mut orphaned_count = 0;
    let mut errors = Vec::new();
    
    // 1. 查找所有未確認的記錄
    let mut stmt = conn.prepare(
        "SELECT id, local_file_path FROM pollinations_generations 
         WHERE deleted_at IS NULL AND is_confirmed = 0 AND local_file_path IS NOT NULL"
    ).map_err(|e| format!("準備查詢失敗: {}", e))?;
    
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?, // id
            row.get::<_, String>(1)?  // local_file_path
        ))
    }).map_err(|e| format!("執行查詢失敗: {}", e))?;
    
    for row in rows {
        match row {
            Ok((id, local_file_path)) => {
                // 檢查檔案是否存在
                if std::path::Path::new(&local_file_path).exists() {
                    // 檔案存在，標記為已確認
                    match conn.execute(
                        "UPDATE pollinations_generations SET is_confirmed = 1 WHERE id = ?",
                        [&id]
                    ) {
                        Ok(_) => {
                            repaired_count += 1;
                            log::info!("[DatabaseRepair] 修復圖片記錄: {}", id);
                        }
                        Err(e) => {
                            errors.push(format!("更新記錄 {} 失敗: {}", id, e));
                            log::error!("[DatabaseRepair] 更新記錄失敗: {} - {}", id, e);
                        }
                    }
                } else {
                    // 檔案不存在，標記為孤立記錄
                    orphaned_count += 1;
                    log::warn!("[DatabaseRepair] 發現孤立記錄: {} - {}", id, local_file_path);
                }
            }
            Err(e) => {
                errors.push(format!("讀取記錄失敗: {}", e));
                log::error!("[DatabaseRepair] 讀取記錄失敗: {}", e);
            }
        }
    }
    
    log::info!("[DatabaseRepair] 修復完成 - 修復: {}筆, 孤立: {}筆", repaired_count, orphaned_count);
    
    Ok(serde_json::json!({
        "success": true,
        "repaired_count": repaired_count,
        "orphaned_count": orphaned_count,
        "errors": if errors.is_empty() { None } else { Some(errors) },
        "message": format!("資料庫修復完成：修復 {} 筆記錄，發現 {} 筆孤立記錄", repaired_count, orphaned_count)
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
            status, created_timestamp, created_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 'completed', ?16, ?17
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
            generation_time_ms,
            chrono::Utc::now().timestamp(),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string() // 🔧 使用本地時間
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
            status, error_message, created_timestamp, created_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'failed', ?12, ?13, ?14
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
            error_message,
            chrono::Utc::now().timestamp(),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string() // 🔧 使用本地時間
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