use serde_json::Value;
use std::sync::{Arc, Mutex};
use crate::services::translation::{
    PromptTemplateManager, TemplateApplicationRequest, TemplateSearchRequest, TemplateCategory
};

// 全局模板管理器
lazy_static::lazy_static! {
    static ref TEMPLATE_MANAGER: Arc<Mutex<PromptTemplateManager>> = {
        Arc::new(Mutex::new(PromptTemplateManager::new()))
    };
}

/// 應用提示詞模板
#[tauri::command]
#[allow(non_snake_case)]
pub async fn apply_prompt_template(
    templateId: String,
    parameters: serde_json::Map<String, Value>,
    characterDescription: Option<String>,
    applyQualityModifiers: Option<bool>,
    includeNegativePrompts: Option<bool>,
    targetStyle: Option<String>,
) -> Result<Value, String> {
    log::info!("[Commands] 應用提示詞模板: {}", templateId);
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    // 轉換參數格式
    let mut param_map = std::collections::HashMap::new();
    for (key, value) in parameters {
        match value {
            Value::String(s) => {
                param_map.insert(key, s);
            },
            _ => {
                param_map.insert(key, value.to_string());
            }
        }
    }
    
    let request = TemplateApplicationRequest {
        template_id: templateId,
        parameters: param_map,
        character_description: characterDescription,
        apply_quality_modifiers: applyQualityModifiers.unwrap_or(true),
        include_negative_prompts: includeNegativePrompts.unwrap_or(true),
        target_style: targetStyle,
    };
    
    match manager.apply_template(request) {
        Ok(result) => {
            let json_result = serde_json::to_value(result)
                .map_err(|e| format!("結果序列化失敗: {}", e))?;
            
            log::info!("[Commands] 模板應用成功");
            Ok(json_result)
        },
        Err(e) => {
            log::error!("[Commands] 模板應用失敗: {:?}", e);
            Err(format!("模板應用失敗: {}", e))
        }
    }
}

/// 搜尋提示詞模板
#[tauri::command]
#[allow(non_snake_case)]
pub async fn search_prompt_templates(
    query: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    language: Option<String>,
    minRating: Option<f64>,
    limit: Option<usize>,
) -> Result<Value, String> {
    log::info!("[Commands] 搜尋提示詞模板: {:?}", query);
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    // 解析分類
    let template_category = if let Some(cat_str) = category {
        match cat_str.as_str() {
            "CharacterTypes" => Some(TemplateCategory::CharacterTypes),
            "Backgrounds" => Some(TemplateCategory::Backgrounds),
            "ClothingStyles" => Some(TemplateCategory::ClothingStyles),
            "Expressions" => Some(TemplateCategory::Expressions),
            "Poses" => Some(TemplateCategory::Poses),
            "ArtStyles" => Some(TemplateCategory::ArtStyles),
            "Lighting" => Some(TemplateCategory::Lighting),
            "Effects" => Some(TemplateCategory::Effects),
            "Composite" => Some(TemplateCategory::Composite),
            "Custom" => Some(TemplateCategory::Custom),
            _ => None,
        }
    } else {
        None
    };
    
    let request = TemplateSearchRequest {
        query,
        category: template_category,
        tags: tags.unwrap_or_default(),
        language,
        min_rating: minRating,
        limit,
    };
    
    match manager.search_templates(request) {
        Ok(templates) => {
            let json_result = serde_json::to_value(templates)
                .map_err(|e| format!("結果序列化失敗: {}", e))?;
            
            log::info!("[Commands] 找到 {} 個模板", 
                      json_result.as_array().map(|a| a.len()).unwrap_or(0));
            Ok(json_result)
        },
        Err(e) => {
            log::error!("[Commands] 模板搜尋失敗: {:?}", e);
            Err(format!("模板搜尋失敗: {}", e))
        }
    }
}

/// 獲取所有模板分類
#[tauri::command]
pub async fn get_template_categories() -> Result<Value, String> {
    log::info!("[Commands] 獲取模板分類");
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    let categories = manager.get_categories();
    let json_result = serde_json::to_value(categories)
        .map_err(|e| format!("結果序列化失敗: {}", e))?;
    
    Ok(json_result)
}

/// 根據分類獲取模板
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_templates_by_category(
    category: String,
) -> Result<Value, String> {
    log::info!("[Commands] 獲取分類模板: {}", category);
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    // 解析分類
    let template_category = match category.as_str() {
        "CharacterTypes" => TemplateCategory::CharacterTypes,
        "Backgrounds" => TemplateCategory::Backgrounds,
        "ClothingStyles" => TemplateCategory::ClothingStyles,
        "Expressions" => TemplateCategory::Expressions,
        "Poses" => TemplateCategory::Poses,
        "ArtStyles" => TemplateCategory::ArtStyles,
        "Lighting" => TemplateCategory::Lighting,
        "Effects" => TemplateCategory::Effects,
        "Composite" => TemplateCategory::Composite,
        "Custom" => TemplateCategory::Custom,
        _ => {
            return Err(format!("不支援的分類: {}", category));
        }
    };
    
    let templates = manager.get_templates_by_category(&template_category);
    log::info!("[Commands] 找到 {} 個 {} 分類模板", 
              templates.len(), category);
    
    let json_result = serde_json::to_value(templates)
        .map_err(|e| format!("結果序列化失敗: {}", e))?;
    Ok(json_result)
}

/// 獲取模板統計資訊
#[tauri::command]
pub async fn get_template_stats() -> Result<Value, String> {
    log::info!("[Commands] 獲取模板統計");
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    let stats = manager.get_template_stats();
    let json_result = serde_json::to_value(stats)
        .map_err(|e| format!("結果序列化失敗: {}", e))?;
    
    Ok(json_result)
}

/// 批次應用多個模板
#[tauri::command]
#[allow(non_snake_case)]
pub async fn batch_apply_templates(
    templateRequests: Vec<Value>,
) -> Result<Value, String> {
    log::info!("[Commands] 批次應用 {} 個模板", templateRequests.len());
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    let mut results = Vec::new();
    
    for (index, request_value) in templateRequests.iter().enumerate() {
        // 解析請求
        let request: TemplateApplicationRequest = serde_json::from_value(request_value.clone())
            .map_err(|e| format!("請求 {} 解析失敗: {}", index, e))?;
        
        match manager.apply_template(request) {
            Ok(result) => {
                results.push(serde_json::json!({
                    "success": true,
                    "result": result
                }));
            },
            Err(e) => {
                log::error!("[Commands] 模板 {} 應用失敗: {:?}", index, e);
                results.push(serde_json::json!({
                    "success": false,
                    "error": format!("{}", e)
                }));
            }
        }
    }
    
    let json_result = serde_json::to_value(results)
        .map_err(|e| format!("結果序列化失敗: {}", e))?;
    
    log::info!("[Commands] 批次模板應用完成");
    Ok(json_result)
}

/// 獲取熱門模板（按使用次數排序）
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_popular_templates(
    limit: Option<usize>,
) -> Result<Value, String> {
    log::info!("[Commands] 獲取熱門模板");
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    let request = TemplateSearchRequest {
        query: None,
        category: None,
        tags: Vec::new(),
        language: None,
        min_rating: None,
        limit: limit.or(Some(20)), // 預設返回前20個
    };
    
    match manager.search_templates(request) {
        Ok(mut templates) => {
            // 按使用次數排序
            templates.sort_by(|a, b| b.usage_count.cmp(&a.usage_count));
            
            let json_result = serde_json::to_value(templates)
                .map_err(|e| format!("結果序列化失敗: {}", e))?;
            
            log::info!("[Commands] 獲取熱門模板成功");
            Ok(json_result)
        },
        Err(e) => {
            log::error!("[Commands] 獲取熱門模板失敗: {:?}", e);
            Err(format!("獲取熱門模板失敗: {}", e))
        }
    }
}

/// 獲取推薦模板（基於評分和成功率）
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_recommended_templates(
    category: Option<String>,
    limit: Option<usize>,
) -> Result<Value, String> {
    log::info!("[Commands] 獲取推薦模板");
    
    let manager = TEMPLATE_MANAGER.lock()
        .map_err(|e| format!("模板管理器鎖定失敗: {}", e))?;
    
    // 解析分類
    let template_category = if let Some(cat_str) = category {
        match cat_str.as_str() {
            "CharacterTypes" => Some(TemplateCategory::CharacterTypes),
            "Backgrounds" => Some(TemplateCategory::Backgrounds),
            "ClothingStyles" => Some(TemplateCategory::ClothingStyles),
            "Expressions" => Some(TemplateCategory::Expressions),
            "Poses" => Some(TemplateCategory::Poses),
            "ArtStyles" => Some(TemplateCategory::ArtStyles),
            "Lighting" => Some(TemplateCategory::Lighting),
            "Effects" => Some(TemplateCategory::Effects),
            "Composite" => Some(TemplateCategory::Composite),
            "Custom" => Some(TemplateCategory::Custom),
            _ => None,
        }
    } else {
        None
    };
    
    let request = TemplateSearchRequest {
        query: None,
        category: template_category,
        tags: Vec::new(),
        language: None,
        min_rating: Some(4.0), // 只推薦高評分模板
        limit: limit.or(Some(10)), // 預設返回前10個
    };
    
    match manager.search_templates(request) {
        Ok(mut templates) => {
            // 按綜合分數排序（評分 * 成功率）
            templates.sort_by(|a, b| {
                let score_a = a.average_rating * a.success_rate;
                let score_b = b.average_rating * b.success_rate;
                score_b.partial_cmp(&score_a).unwrap_or(std::cmp::Ordering::Equal)
            });
            
            let json_result = serde_json::to_value(templates)
                .map_err(|e| format!("結果序列化失敗: {}", e))?;
            
            log::info!("[Commands] 獲取推薦模板成功");
            Ok(json_result)
        },
        Err(e) => {
            log::error!("[Commands] 獲取推薦模板失敗: {:?}", e);
            Err(format!("獲取推薦模板失敗: {}", e))
        }
    }
}