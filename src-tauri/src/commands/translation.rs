use serde_json::Value;
use crate::services::translation::{
    TranslationEngine, TranslationRequest, TranslationStyle, QualityLevel,
    VocabularyDatabase, PromptOptimizer, OptimizationRequest, OptimizationLevel, PromptStyle, QualityFocus,
};
use crate::database::connection::create_connection;
use std::sync::{Arc, Mutex};

/// 翻譯中文角色描述為英文提示詞
#[tauri::command]
pub async fn translate_character_description(
    chinese_description: String,
    character_name: Option<String>,
    target_style: String, // "anime", "realistic", "concept_art", "comic"
    quality_level: String, // "fast", "standard", "high", "professional"
    preserve_original: Option<bool>,
) -> Result<Value, String> {
    log::info!("[TranslationCommand] 翻譯角色描述: {}", chinese_description);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    // 建立詞彙庫和翻譯引擎
    let vocabulary_db = VocabularyDatabase::new(db_arc);
    let translation_engine = TranslationEngine::new(vocabulary_db)
        .map_err(|e| format!("翻譯引擎初始化失敗: {:?}", e))?;

    // 解析參數
    let translation_style = match target_style.as_str() {
        "anime" => TranslationStyle::Anime,
        "realistic" => TranslationStyle::Realistic,
        "concept_art" => TranslationStyle::ConceptArt,
        "comic" => TranslationStyle::Comic,
        custom => TranslationStyle::Custom(custom.to_string()),
    };

    let quality = match quality_level.as_str() {
        "fast" => QualityLevel::Fast,
        "standard" => QualityLevel::Standard,
        "high" => QualityLevel::High,
        "professional" => QualityLevel::Professional,
        _ => QualityLevel::Standard,
    };

    // 建立翻譯請求
    let request = TranslationRequest {
        chinese_description,
        character_name,
        target_style: translation_style,
        quality_level: quality,
        context_hints: Vec::new(),
        preserve_original: preserve_original.unwrap_or(false),
    };

    // 執行翻譯
    match translation_engine.translate(request) {
        Ok(result) => {
            log::info!("[TranslationCommand] 翻譯成功，品質分數: {:.2}", result.estimated_quality);
            
            match serde_json::to_value(&result) {
                Ok(json_result) => Ok(serde_json::json!({
                    "success": true,
                    "result": json_result
                })),
                Err(e) => Err(format!("JSON 序列化失敗: {}", e))
            }
        },
        Err(e) => {
            log::error!("[TranslationCommand] 翻譯失敗: {:?}", e);
            Err(format!("翻譯失敗: {:?}", e))
        }
    }
}

/// 優化現有的英文提示詞
#[tauri::command]
pub async fn optimize_prompt(
    base_prompt: String,
    target_model: String, // "stable_diffusion", "midjourney", "dalle"
    optimization_level: String, // "basic", "standard", "advanced", "expert"
    prompt_style: String, // "concise", "detailed", "artistic", "technical", "natural"
    include_negative_prompt: Option<bool>,
    max_length: Option<usize>,
    quality_focus: Vec<String>, // ["character_consistency", "artistic_quality", etc.]
) -> Result<Value, String> {
    log::info!("[TranslationCommand] 優化提示詞: {}", base_prompt);

    let optimizer = PromptOptimizer::new();

    // 解析參數
    let opt_level = match optimization_level.as_str() {
        "basic" => OptimizationLevel::Basic,
        "standard" => OptimizationLevel::Standard,
        "advanced" => OptimizationLevel::Advanced,
        "expert" => OptimizationLevel::Expert,
        _ => OptimizationLevel::Standard,
    };

    let style = match prompt_style.as_str() {
        "concise" => PromptStyle::Concise,
        "detailed" => PromptStyle::Detailed,
        "artistic" => PromptStyle::Artistic,
        "technical" => PromptStyle::Technical,
        "natural" => PromptStyle::Natural,
        _ => PromptStyle::Detailed,
    };

    let focus_items: Vec<QualityFocus> = quality_focus.iter().filter_map(|f| {
        match f.as_str() {
            "character_consistency" => Some(QualityFocus::CharacterConsistency),
            "artistic_quality" => Some(QualityFocus::ArtisticQuality),
            "detail_richness" => Some(QualityFocus::DetailRichness),
            "composition" => Some(QualityFocus::Composition),
            "lighting" => Some(QualityFocus::Lighting),
            "color_harmony" => Some(QualityFocus::ColorHarmony),
            _ => None,
        }
    }).collect();

    let request = OptimizationRequest {
        base_prompt,
        target_model,
        optimization_level: opt_level,
        prompt_style: style,
        include_negative_prompt: include_negative_prompt.unwrap_or(false),
        max_length,
        quality_focus: focus_items,
    };

    // 執行優化
    match optimizer.optimize(request) {
        Ok(result) => {
            log::info!("[TranslationCommand] 優化成功，改善分數: {:.2}", result.improvement_score);
            
            match serde_json::to_value(&result) {
                Ok(json_result) => Ok(serde_json::json!({
                    "success": true,
                    "result": json_result
                })),
                Err(e) => Err(format!("JSON 序列化失敗: {}", e))
            }
        },
        Err(e) => {
            log::error!("[TranslationCommand] 優化失敗: {:?}", e);
            Err(format!("優化失敗: {:?}", e))
        }
    }
}

/// 搜尋詞彙庫中的翻譯
#[tauri::command]
pub async fn search_vocabulary(
    chinese_term: String,
    category: Option<String>,
    fuzzy_search: Option<bool>,
    limit: Option<i32>,
) -> Result<Value, String> {
    log::info!("[TranslationCommand] 搜尋詞彙: {}", chinese_term);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let vocabulary_db = VocabularyDatabase::new(db_arc);

    let results = if fuzzy_search.unwrap_or(false) {
        vocabulary_db.fuzzy_search(&chinese_term, limit)
            .map_err(|e| format!("模糊搜尋失敗: {:?}", e))?
    } else {
        let category_enum = category.and_then(|cat| {
            match cat.as_str() {
                "facial_features" => Some(crate::services::translation::VocabularyCategory::FacialFeatures),
                "hair" => Some(crate::services::translation::VocabularyCategory::Hair),
                "eyes" => Some(crate::services::translation::VocabularyCategory::Eyes),
                "body_type" => Some(crate::services::translation::VocabularyCategory::BodyType),
                "clothing" => Some(crate::services::translation::VocabularyCategory::Clothing),
                "accessories" => Some(crate::services::translation::VocabularyCategory::Accessories),
                "expression" => Some(crate::services::translation::VocabularyCategory::Expression),
                "pose" => Some(crate::services::translation::VocabularyCategory::Pose),
                "background" => Some(crate::services::translation::VocabularyCategory::Background),
                "art_style" => Some(crate::services::translation::VocabularyCategory::ArtStyle),
                "effects" => Some(crate::services::translation::VocabularyCategory::Effects),
                "colors" => Some(crate::services::translation::VocabularyCategory::Colors),
                "texture" => Some(crate::services::translation::VocabularyCategory::Texture),
                "lighting" => Some(crate::services::translation::VocabularyCategory::Lighting),
                "personality" => Some(crate::services::translation::VocabularyCategory::Personality),
                _ => None,
            }
        });

        vocabulary_db.find_translation(&chinese_term, category_enum)
            .map_err(|e| format!("翻譯搜尋失敗: {:?}", e))?
    };

    log::info!("[TranslationCommand] 搜尋完成，找到 {} 個結果", results.len());

    match serde_json::to_value(&results) {
        Ok(json_results) => Ok(serde_json::json!({
            "success": true,
            "results": json_results,
            "count": results.len()
        })),
        Err(e) => Err(format!("JSON 序列化失敗: {}", e))
    }
}

/// 獲取詞彙庫統計資訊
#[tauri::command]
pub async fn get_vocabulary_stats() -> Result<Value, String> {
    log::info!("[TranslationCommand] 獲取詞彙庫統計資訊");
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let vocabulary_db = VocabularyDatabase::new(db_arc);

    match vocabulary_db.get_vocabulary_stats() {
        Ok(stats) => {
            log::info!("[TranslationCommand] 統計獲取成功，總詞彙數: {}", stats.total_entries);
            
            match serde_json::to_value(&stats) {
                Ok(json_stats) => Ok(serde_json::json!({
                    "success": true,
                    "stats": json_stats
                })),
                Err(e) => Err(format!("JSON 序列化失敗: {}", e))
            }
        },
        Err(e) => {
            log::error!("[TranslationCommand] 統計獲取失敗: {:?}", e);
            Err(format!("統計獲取失敗: {:?}", e))
        }
    }
}

/// 批次翻譯多個角色描述
#[tauri::command]
pub async fn batch_translate_descriptions(
    descriptions: Vec<String>,
    character_names: Option<Vec<String>>,
    target_style: String,
    quality_level: String,
) -> Result<Value, String> {
    log::info!("[TranslationCommand] 批次翻譯 {} 個描述", descriptions.len());
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let vocabulary_db = VocabularyDatabase::new(db_arc);
    let translation_engine = TranslationEngine::new(vocabulary_db)
        .map_err(|e| format!("翻譯引擎初始化失敗: {:?}", e))?;

    // 解析參數
    let translation_style = match target_style.as_str() {
        "anime" => TranslationStyle::Anime,
        "realistic" => TranslationStyle::Realistic,
        "concept_art" => TranslationStyle::ConceptArt,
        "comic" => TranslationStyle::Comic,
        custom => TranslationStyle::Custom(custom.to_string()),
    };

    let quality = match quality_level.as_str() {
        "fast" => QualityLevel::Fast,
        "standard" => QualityLevel::Standard,
        "high" => QualityLevel::High,
        "professional" => QualityLevel::Professional,
        _ => QualityLevel::Standard,
    };

    let mut results = Vec::new();
    let mut failed_count = 0;

    for (index, description) in descriptions.iter().enumerate() {
        let character_name = character_names.as_ref()
            .and_then(|names| names.get(index))
            .cloned();

        let request = TranslationRequest {
            chinese_description: description.clone(),
            character_name,
            target_style: translation_style.clone(),
            quality_level: quality.clone(),
            context_hints: Vec::new(),
            preserve_original: false,
        };

        match translation_engine.translate(request) {
            Ok(result) => {
                results.push(serde_json::json!({
                    "index": index,
                    "success": true,
                    "result": result
                }));
            },
            Err(e) => {
                failed_count += 1;
                log::error!("[TranslationCommand] 描述 {} 翻譯失敗: {:?}", index, e);
                results.push(serde_json::json!({
                    "index": index,
                    "success": false,
                    "error": format!("{:?}", e)
                }));
            }
        }
    }

    log::info!("[TranslationCommand] 批次翻譯完成，成功: {}, 失敗: {}", 
               descriptions.len() - failed_count, failed_count);

    Ok(serde_json::json!({
        "success": true,
        "results": results,
        "total_count": descriptions.len(),
        "success_count": descriptions.len() - failed_count,
        "failed_count": failed_count
    }))
}