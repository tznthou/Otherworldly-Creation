use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use super::{
    SeedManager, VisualTraitsManager, VisualTraits,
    Result, IllustrationError,
};

/// 角色一致性管理器 - 統籌所有角色視覺一致性功能
/// 
/// 這是 AI 插畫生成系統的核心組件，負責：
/// 1. 協調 seed 管理和視覺特徵管理
/// 2. 實施角色一致性策略
/// 3. 生成一致性檢查報告
/// 4. 管理角色特徵的版本控制
/// 5. 提供角色相似度分析
pub struct CharacterConsistencyManager {
    seed_manager: SeedManager,
    traits_manager: VisualTraitsManager,
    #[allow(dead_code)]
    db_connection: Arc<Mutex<Connection>>,
}

/// 角色一致性報告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyReport {
    pub character_id: String,
    pub character_name: String,
    pub overall_score: f64, // 0.0 - 1.0
    pub seed_consistency: SeedConsistencyInfo,
    pub visual_consistency: VisualConsistencyInfo,
    pub reference_consistency: ReferenceConsistencyInfo,
    pub recommendations: Vec<ConsistencyRecommendation>,
    pub generated_at: String,
}

/// Seed 一致性資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedConsistencyInfo {
    pub seed_value: u32,
    pub seed_stability: f64, // seed 使用的穩定性
    pub usage_count: u32,
    pub last_used: Option<String>,
    pub seed_effectiveness: f64, // seed 產生一致結果的效果
}

/// 視覺一致性資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualConsistencyInfo {
    pub traits_completeness: f64, // 特徵描述的完整性
    pub description_clarity: f64,  // 描述的清晰度
    pub feature_stability: f64,    // 特徵的穩定性
    pub inconsistent_features: Vec<String>, // 不一致的特徵
}

/// 參考一致性資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenceConsistencyInfo {
    pub has_reference_images: bool,
    pub reference_count: u32,
    pub reference_quality: f64, // 參考圖像品質
    pub reference_diversity: f64, // 參考圖像多樣性
}

/// 一致性建議
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyRecommendation {
    pub recommendation_type: RecommendationType,
    pub priority: RecommendationPriority,
    pub title: String,
    pub description: String,
    pub suggested_action: String,
    pub impact_score: f64, // 預期改善效果
}

/// 建議類型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecommendationType {
    /// Seed 相關建議
    SeedOptimization,
    /// 描述改進建議
    DescriptionImprovement,
    /// 參考圖像建議
    ReferenceImage,
    /// 風格統一建議
    StyleConsistency,
    /// 生成參數調整
    GenerationParams,
}

/// 建議優先級
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecommendationPriority {
    Critical,  // 嚴重問題，需要立即處理
    High,      // 高優先級，建議盡快處理
    Medium,    // 中等優先級，可以安排處理
    Low,       // 低優先級，可選擇處理
}

/// 角色一致性檢查配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyCheckConfig {
    pub check_seed_stability: bool,
    pub check_visual_completeness: bool,
    pub check_reference_quality: bool,
    pub minimum_consistency_score: f64,
    pub strict_mode: bool, // 嚴格模式會進行更詳細的檢查
}

impl CharacterConsistencyManager {
    /// 創建新的角色一致性管理器
    pub fn new(db_connection: Arc<Mutex<Connection>>) -> Self {
        let seed_manager = SeedManager::new(db_connection.clone());
        let traits_manager = VisualTraitsManager::new(db_connection.clone());

        Self {
            seed_manager,
            traits_manager,
            db_connection,
        }
    }

    /// 為角色建立完整的一致性配置
    /// 
    /// 這是設置新角色時的主要入口點，會：
    /// 1. 生成或獲取角色的 seed 值
    /// 2. 從描述提取視覺特徵
    /// 3. 建立一致性基準
    pub fn setup_character_consistency(
        &self,
        character_id: &str,
        character_name: &str,
        description: &str,
    ) -> Result<VisualTraits> {
        log::info!("[CharacterConsistency] 設置角色一致性: {} ({})", character_name, character_id);

        // 1. 獲取或創建 seed 值
        let seed_value = self.seed_manager.get_or_create_seed(character_id, character_name)?;
        log::info!("[CharacterConsistency] 角色 seed: {}", seed_value);

        // 2. 提取視覺特徵
        let visual_traits = self.traits_manager.extract_traits_from_description(
            character_id,
            description,
            seed_value,
        )?;

        log::info!("[CharacterConsistency] 視覺特徵提取完成");
        log::info!("[CharacterConsistency] 標準化描述: {:?}", visual_traits.standard_description);

        Ok(visual_traits)
    }

    /// 執行角色一致性檢查
    pub fn check_character_consistency(
        &self,
        character_id: &str,
        character_name: &str,
        config: &ConsistencyCheckConfig,
    ) -> Result<ConsistencyReport> {
        log::info!("[CharacterConsistency] 開始一致性檢查: {}", character_name);

        // 載入角色的視覺特徵
        let visual_traits = self.traits_manager.load_visual_traits(character_id)?
            .ok_or_else(|| IllustrationError::ConsistencyError(
                format!("角色 {} 的視覺特徵不存在", character_name)
            ))?;

        // 載入 seed 資訊
        let seed_info = self.seed_manager.get_seed_info(character_id)?
            .ok_or_else(|| IllustrationError::ConsistencyError(
                format!("角色 {} 的 seed 資訊不存在", character_name)
            ))?;

        // 執行各項一致性檢查
        let seed_consistency = self.check_seed_consistency(&seed_info, config)?;
        let visual_consistency = self.check_visual_consistency(&visual_traits, config)?;
        let reference_consistency = self.check_reference_consistency(&visual_traits, config)?;

        // 計算整體一致性分數
        let overall_score = self.calculate_overall_consistency_score(
            &seed_consistency,
            &visual_consistency,
            &reference_consistency,
        );

        // 生成改進建議
        let recommendations = self.generate_recommendations(
            &visual_traits,
            &seed_consistency,
            &visual_consistency,
            &reference_consistency,
            overall_score,
        );

        let report = ConsistencyReport {
            character_id: character_id.to_string(),
            character_name: character_name.to_string(),
            overall_score,
            seed_consistency,
            visual_consistency,
            reference_consistency,
            recommendations,
            generated_at: chrono::Utc::now().to_rfc3339(),
        };

        log::info!("[CharacterConsistency] 一致性檢查完成，總分: {:.2}", overall_score);
        Ok(report)
    }

    /// 檢查 seed 一致性
    fn check_seed_consistency(
        &self,
        seed_info: &super::seed_manager::SeedInfo,
        _config: &ConsistencyCheckConfig,
    ) -> Result<SeedConsistencyInfo> {
        // 計算 seed 穩定性（基於使用次數和成功率）
        let seed_stability = if seed_info.usage_count == 0 {
            1.0 // 新 seed，假設穩定
        } else {
            // 基於使用頻率計算穩定性
            (seed_info.usage_count as f64).ln() / 10.0 // 對數衰減，最大值約為 1.0
        };

        // seed 效果評估（簡化版，實際會基於生成歷史）
        let seed_effectiveness = 0.85; // TODO: 從實際生成結果計算

        Ok(SeedConsistencyInfo {
            seed_value: seed_info.seed_value,
            seed_stability: seed_stability.min(1.0),
            usage_count: seed_info.usage_count,
            last_used: seed_info.last_used_at.clone(),
            seed_effectiveness,
        })
    }

    /// 檢查視覺一致性
    fn check_visual_consistency(
        &self,
        visual_traits: &VisualTraits,
        _config: &ConsistencyCheckConfig,
    ) -> Result<VisualConsistencyInfo> {
        // 計算特徵完整性
        let traits_completeness = self.calculate_traits_completeness(&visual_traits.feature_vector);
        
        // 計算描述清晰度
        let description_clarity = match &visual_traits.standard_description {
            Some(desc) => self.calculate_description_clarity(desc),
            None => 0.0,
        };

        // 特徵穩定性（基於生成統計）
        let feature_stability = visual_traits.generation_stats.avg_consistency_score.unwrap_or(1.0);

        // 找出不一致的特徵（簡化實現）
        let inconsistent_features = self.identify_inconsistent_features(visual_traits);

        Ok(VisualConsistencyInfo {
            traits_completeness,
            description_clarity,
            feature_stability,
            inconsistent_features,
        })
    }

    /// 檢查參考一致性
    fn check_reference_consistency(
        &self,
        visual_traits: &VisualTraits,
        _config: &ConsistencyCheckConfig,
    ) -> Result<ReferenceConsistencyInfo> {
        let has_reference_images = !visual_traits.reference_images.is_empty();
        let reference_count = visual_traits.reference_images.len() as u32;

        // 計算參考圖像品質平均分
        let reference_quality = if reference_count > 0 {
            let total_quality: f64 = visual_traits.reference_images
                .iter()
                .map(|img| img.quality_score.unwrap_or(0.5))
                .sum();
            total_quality / reference_count as f64
        } else {
            0.0
        };

        // 計算參考圖像多樣性
        let reference_diversity = self.calculate_reference_diversity(&visual_traits.reference_images);

        Ok(ReferenceConsistencyInfo {
            has_reference_images,
            reference_count,
            reference_quality,
            reference_diversity,
        })
    }

    /// 計算特徵完整性
    fn calculate_traits_completeness(&self, features: &super::visual_traits::VisualFeatureVector) -> f64 {
        let mut completeness_score = 0.0;
        let mut total_features = 0;

        // 檢查面部特徵
        let facial = &features.facial_features;
        total_features += 7; // 總共 7 個面部特徵字段
        
        if facial.eye_color.is_some() { completeness_score += 1.0; }
        if facial.hair_color.is_some() { completeness_score += 1.0; }
        if facial.hair_length.is_some() { completeness_score += 1.0; }
        if facial.hair_style.is_some() { completeness_score += 1.0; }
        if facial.skin_tone.is_some() { completeness_score += 1.0; }
        if facial.facial_expression.is_some() { completeness_score += 1.0; }
        if !facial.accessories.is_empty() { completeness_score += 1.0; }

        // 檢查體型特徵
        let body = &features.body_type;
        total_features += 3;
        
        if body.height.is_some() { completeness_score += 1.0; }
        if body.build.is_some() { completeness_score += 1.0; }
        if body.age_appearance.is_some() { completeness_score += 1.0; }

        // 檢查服裝風格
        let clothing = &features.clothing_style;
        total_features += 3;
        
        if clothing.primary_outfit.is_some() { completeness_score += 1.0; }
        if clothing.style_category.is_some() { completeness_score += 1.0; }
        if !clothing.dominant_colors.is_empty() { completeness_score += 1.0; }

        completeness_score / total_features as f64
    }

    /// 計算描述清晰度
    fn calculate_description_clarity(&self, description: &str) -> f64 {
        // 簡化的清晰度評估
        let word_count = description.split_whitespace().count();
        let has_key_features = description.to_lowercase().contains("hair") 
            || description.to_lowercase().contains("eyes")
            || description.to_lowercase().contains("wearing");

        let length_score = match word_count {
            0..=3 => 0.3,      // 太簡短
            4..=10 => 0.8,     // 適中
            11..=20 => 1.0,    // 詳細
            _ => 0.7,          // 可能過於詳細
        };

        let feature_score = if has_key_features { 1.0 } else { 0.5 };

        (length_score + feature_score) / 2.0
    }

    /// 識別不一致的特徵
    fn identify_inconsistent_features(&self, _visual_traits: &VisualTraits) -> Vec<String> {
        // TODO: 實現基於生成歷史的不一致特徵檢測
        // 這需要分析多次生成的結果，找出變化較大的特徵
        Vec::new()
    }

    /// 計算參考圖像多樣性
    fn calculate_reference_diversity(&self, reference_images: &[super::visual_traits::ReferenceImage]) -> f64 {
        if reference_images.len() <= 1 {
            return if reference_images.is_empty() { 0.0 } else { 0.5 };
        }

        // 計算不同類型的參考圖像比例
        let mut type_counts = std::collections::HashMap::new();
        for img in reference_images {
            *type_counts.entry(std::mem::discriminant(&img.image_type)).or_insert(0) += 1;
        }

        let unique_types = type_counts.len() as f64;
        let total_images = reference_images.len() as f64;

        // 多樣性分數：不同類型的比例
        (unique_types / total_images).min(1.0)
    }

    /// 計算整體一致性分數
    fn calculate_overall_consistency_score(
        &self,
        seed_consistency: &SeedConsistencyInfo,
        visual_consistency: &VisualConsistencyInfo,
        reference_consistency: &ReferenceConsistencyInfo,
    ) -> f64 {
        let seed_weight = 0.3;
        let visual_weight = 0.5;
        let reference_weight = 0.2;

        let seed_score = (seed_consistency.seed_stability + seed_consistency.seed_effectiveness) / 2.0;
        let visual_score = (visual_consistency.traits_completeness + 
                          visual_consistency.description_clarity + 
                          visual_consistency.feature_stability) / 3.0;
        let reference_score = if reference_consistency.has_reference_images {
            (reference_consistency.reference_quality + reference_consistency.reference_diversity) / 2.0
        } else {
            0.5 // 無參考圖像時給予中性分數
        };

        seed_score * seed_weight + visual_score * visual_weight + reference_score * reference_weight
    }

    /// 生成改進建議
    fn generate_recommendations(
        &self,
        _visual_traits: &VisualTraits,
        seed_consistency: &SeedConsistencyInfo,
        visual_consistency: &VisualConsistencyInfo,
        reference_consistency: &ReferenceConsistencyInfo,
        overall_score: f64,
    ) -> Vec<ConsistencyRecommendation> {
        let mut recommendations = Vec::new();

        // 檢查整體分數
        if overall_score < 0.6 {
            recommendations.push(ConsistencyRecommendation {
                recommendation_type: RecommendationType::StyleConsistency,
                priority: RecommendationPriority::Critical,
                title: "整體一致性偏低".to_string(),
                description: "角色的整體視覺一致性分數低於建議閾值".to_string(),
                suggested_action: "建議檢查並改善角色描述、添加參考圖像或調整 seed 值".to_string(),
                impact_score: 0.8,
            });
        }

        // 檢查 seed 效果
        if seed_consistency.seed_effectiveness < 0.7 {
            recommendations.push(ConsistencyRecommendation {
                recommendation_type: RecommendationType::SeedOptimization,
                priority: RecommendationPriority::High,
                title: "Seed 效果不佳".to_string(),
                description: "當前 seed 值產生的一致性結果不理想".to_string(),
                suggested_action: "考慮重新生成 seed 值或使用手動設定".to_string(),
                impact_score: 0.6,
            });
        }

        // 檢查描述完整性
        if visual_consistency.traits_completeness < 0.5 {
            recommendations.push(ConsistencyRecommendation {
                recommendation_type: RecommendationType::DescriptionImprovement,
                priority: RecommendationPriority::High,
                title: "角色描述不夠詳細".to_string(),
                description: "角色的視覺特徵描述缺少關鍵資訊".to_string(),
                suggested_action: "添加更多關於髮色、眼色、服裝等詳細描述".to_string(),
                impact_score: 0.7,
            });
        }

        // 檢查參考圖像
        if !reference_consistency.has_reference_images {
            recommendations.push(ConsistencyRecommendation {
                recommendation_type: RecommendationType::ReferenceImage,
                priority: RecommendationPriority::Medium,
                title: "缺少參考圖像".to_string(),
                description: "添加參考圖像可以大幅提升生成的一致性".to_string(),
                suggested_action: "上傳 1-3 張高品質的角色參考圖像".to_string(),
                impact_score: 0.5,
            });
        } else if reference_consistency.reference_quality < 0.6 {
            recommendations.push(ConsistencyRecommendation {
                recommendation_type: RecommendationType::ReferenceImage,
                priority: RecommendationPriority::Medium,
                title: "參考圖像品質偏低".to_string(),
                description: "當前參考圖像的品質可能影響生成效果".to_string(),
                suggested_action: "使用更高解析度、更清晰的參考圖像".to_string(),
                impact_score: 0.4,
            });
        }

        // 按優先級和影響分數排序
        recommendations.sort_by(|a, b| {
            match (a.priority.clone(), b.priority.clone()) {
                (RecommendationPriority::Critical, RecommendationPriority::Critical) => 
                    b.impact_score.partial_cmp(&a.impact_score).unwrap_or(std::cmp::Ordering::Equal),
                (RecommendationPriority::Critical, _) => std::cmp::Ordering::Less,
                (_, RecommendationPriority::Critical) => std::cmp::Ordering::Greater,
                _ => b.impact_score.partial_cmp(&a.impact_score).unwrap_or(std::cmp::Ordering::Equal),
            }
        });

        recommendations
    }

    /// 批次檢查專案中所有角色的一致性
    pub fn batch_check_project_consistency(
        &self,
        project_id: &str,
        config: &ConsistencyCheckConfig,
    ) -> Result<Vec<ConsistencyReport>> {
        // 獲取專案中所有角色的 seed 資訊
        let seed_infos = self.seed_manager.get_project_seeds(project_id)?;
        
        let mut reports = Vec::new();
        
        for seed_info in seed_infos {
            // TODO: 需要從角色表獲取角色名稱
            let character_name = format!("Character_{}", seed_info.character_id);
            
            match self.check_character_consistency(&seed_info.character_id, &character_name, config) {
                Ok(report) => reports.push(report),
                Err(e) => {
                    log::warn!("[CharacterConsistency] 角色 {} 一致性檢查失敗: {:?}", 
                              seed_info.character_id, e);
                }
            }
        }

        Ok(reports)
    }

    /// 獲取角色相似度矩陣（用於檢測角色間的混淆）
    pub fn calculate_character_similarity_matrix(
        &self,
        character_ids: &[String],
    ) -> Result<Vec<Vec<f64>>> {
        let mut similarity_matrix = Vec::new();
        
        // 載入所有角色的視覺特徵
        let mut traits_list = Vec::new();
        for character_id in character_ids {
            if let Some(traits) = self.traits_manager.load_visual_traits(character_id)? {
                traits_list.push(traits);
            } else {
                return Err(IllustrationError::ConsistencyError(
                    format!("角色 {} 的視覺特徵不存在", character_id)
                ));
            }
        }

        // 計算相似度矩陣
        for i in 0..traits_list.len() {
            let mut row = Vec::new();
            for j in 0..traits_list.len() {
                if i == j {
                    row.push(1.0); // 自己與自己相似度為 1
                } else {
                    let similarity = self.traits_manager.calculate_similarity(
                        &traits_list[i], 
                        &traits_list[j]
                    );
                    row.push(similarity);
                }
            }
            similarity_matrix.push(row);
        }

        Ok(similarity_matrix)
    }
}