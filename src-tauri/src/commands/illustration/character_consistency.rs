use serde_json::Value;
use crate::services::illustration::{
    CharacterConsistencyManager, SeedManager, VisualTraitsManager
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
    log::info!("[CharacterConsistency] 設置角色一致性: {} ({})", character_name, character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let consistency_manager = CharacterConsistencyManager::new(db_arc);
    
    match consistency_manager.setup_character_consistency(&character_id, &character_name, &description) {
        Ok(visual_traits) => {
            log::info!("[CharacterConsistency] 角色一致性設置成功: {}", character_name);
            
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
            log::error!("[CharacterConsistency] 角色一致性設置失敗: {:?}", e);
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
    log::info!("[CharacterConsistency] 生成一致性報告: {} ({})", character_name, character_id);
    
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
            log::info!("[CharacterConsistency] 一致性報告生成成功，總分: {:.2}", report.overall_score);
            
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
            log::error!("[CharacterConsistency] 一致性報告生成失敗: {:?}", e);
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
    log::info!("[CharacterConsistency] 手動設定 seed: {} for character: {}", seed_value, character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let seed_manager = SeedManager::new(db_arc);
    
    match seed_manager.set_manual_seed(&character_id, seed_value, &reason) {
        Ok(_) => {
            log::info!("[CharacterConsistency] Seed 設定成功");
            Ok(serde_json::json!({
                "success": true,
                "character_id": character_id,
                "seed_value": seed_value,
                "message": "Seed 值設定成功"
            }))
        },
        Err(e) => {
            log::error!("[CharacterConsistency] Seed 設定失敗: {:?}", e);
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
    log::info!("[CharacterConsistency] 添加參考圖像: {} for character: {}", image_url, character_id);
    
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
            log::info!("[CharacterConsistency] 參考圖像添加成功");
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
            log::error!("[CharacterConsistency] 參考圖像添加失敗: {:?}", e);
            Err(format!("參考圖像添加失敗: {:?}", e))
        }
    }
}

/// 獲取角色的視覺特徵信息
#[tauri::command]
pub async fn get_character_visual_traits(
    character_id: String,
) -> Result<Value, String> {
    log::info!("[CharacterConsistency] 獲取角色視覺特徵: {}", character_id);
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let traits_manager = VisualTraitsManager::new(db_arc);
    
    match traits_manager.load_visual_traits(&character_id) {
        Ok(Some(traits)) => {
            log::info!("[CharacterConsistency] 視覺特徵獲取成功");
            
            match serde_json::to_value(&traits) {
                Ok(json_traits) => Ok(serde_json::json!({
                    "success": true,
                    "traits": json_traits
                })),
                Err(e) => Err(format!("JSON 序列化失敗: {}", e))
            }
        },
        Ok(None) => {
            log::warn!("[CharacterConsistency] 角色視覺特徵不存在: {}", character_id);
            Ok(serde_json::json!({
                "success": false,
                "message": "角色視覺特徵不存在",
                "character_id": character_id
            }))
        },
        Err(e) => {
            log::error!("[CharacterConsistency] 視覺特徵獲取失敗: {:?}", e);
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
    log::info!("[CharacterConsistency] 計算角色相似度矩陣，專案: {}, 角色數量: {}", project_id, character_ids.len());
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let consistency_manager = CharacterConsistencyManager::new(db_arc);
    
    match consistency_manager.calculate_character_similarity_matrix(&character_ids) {
        Ok(similarity_matrix) => {
            log::info!("[CharacterConsistency] 相似度矩陣計算成功: {}x{}", similarity_matrix.len(), 
                      similarity_matrix.first().map(|row| row.len()).unwrap_or(0));
                      
            Ok(serde_json::json!({
                "success": true,
                "project_id": project_id,
                "character_ids": character_ids,
                "similarity_matrix": similarity_matrix
            }))
        },
        Err(e) => {
            log::error!("[CharacterConsistency] 相似度矩陣計算失敗: {:?}", e);
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
    log::info!("[CharacterConsistency] 批次檢查專案一致性: {}", project_id);
    
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
            log::info!("[CharacterConsistency] 批次一致性檢查完成，報告數量: {}", reports.len());
            
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
            log::error!("[CharacterConsistency] 批次一致性檢查失敗: {:?}", e);
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
    log::info!("[CharacterConsistency] 生成批次 seed，基礎值: {}，數量: {}", base_seed, count);
    
    if count > 50 {
        return Err("批次 seed 數量不能超過 50".to_string());
    }
    
    let db_connection = create_connection().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let db_arc = Arc::new(Mutex::new(db_connection));
    
    let seed_manager = SeedManager::new(db_arc);
    let batch_seeds = seed_manager.generate_batch_seeds(base_seed, count);
    
    log::info!("[CharacterConsistency] 批次 seed 生成完成: {} 個", batch_seeds.len());
    
    Ok(serde_json::json!({
        "success": true,
        "base_seed": base_seed,
        "count": count,
        "seeds": batch_seeds
    }))
}