use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::{Result, IllustrationError};

/// 角色視覺特徵管理器
/// 
/// 功能：
/// 1. 從角色描述提取和標準化視覺特徵
/// 2. 管理角色的參考圖像
/// 3. 維護視覺特徵的版本控制
/// 4. 提供視覺特徵的相似度計算
pub struct VisualTraitsManager {
    db_connection: std::sync::Arc<std::sync::Mutex<Connection>>,
}

/// 角色視覺特徵結構
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualTraits {
    pub character_id: String,
    pub seed_value: u32,
    
    // 基礎描述
    pub standard_description: Option<String>, // 英文標準化描述
    pub chinese_description: Option<String>,  // 中文原始描述
    
    // 參考圖像系統
    pub reference_images: Vec<ReferenceImage>,
    pub primary_reference_url: Option<String>,
    
    // 藝術風格參數
    pub art_style_params: ArtStyleParams,
    
    // 視覺特徵向量
    pub feature_vector: VisualFeatureVector,
    
    // 一致性控制
    pub consistency_config: ConsistencyConfig,
    
    // 統計資訊
    pub generation_stats: GenerationStats,
    
    // 元數據
    pub traits_version: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 參考圖像結構
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenceImage {
    pub url: String,
    pub image_type: ReferenceImageType,
    pub tags: Vec<String>,
    pub quality_score: Option<f64>,
    pub uploaded_at: String,
}

/// 參考圖像類型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReferenceImageType {
    /// 全身像
    FullBody,
    /// 半身像  
    HalfBody,
    /// 頭像
    Portrait,
    /// 特定表情
    Expression(String),
    /// 特定服裝
    Costume(String),
    /// 動作姿勢
    Pose(String),
}

/// 藝術風格參數
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtStyleParams {
    pub style_type: String, // "anime", "realistic", "fantasy", etc.
    pub color_palette: Option<Vec<String>>, // 主要色彩
    pub art_technique: Option<String>, // "watercolor", "digital", "oil_painting"
    pub lighting_preference: Option<String>, // "soft", "dramatic", "natural"
    pub detail_level: Option<String>, // "simple", "detailed", "ultra_detailed"
    pub custom_params: HashMap<String, serde_json::Value>,
}

/// 視覺特徵向量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualFeatureVector {
    // 面部特徵
    pub facial_features: FacialFeatures,
    
    // 體型特徵
    pub body_type: BodyType,
    
    // 服裝風格
    pub clothing_style: ClothingStyle,
    
    // 配色方案
    pub color_scheme: ColorScheme,
    
    // 特殊特徵
    pub special_features: Vec<String>,
}

/// 面部特徵
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FacialFeatures {
    pub eye_color: Option<String>,
    pub eye_shape: Option<String>,
    pub hair_color: Option<String>,
    pub hair_style: Option<String>,
    pub hair_length: Option<String>,
    pub skin_tone: Option<String>,
    pub facial_expression: Option<String>,
    pub accessories: Vec<String>, // 眼鏡、耳環等
}

/// 體型特徵
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BodyType {
    pub height: Option<String>, // "tall", "average", "short"
    pub build: Option<String>,  // "slim", "average", "athletic", "curvy"
    pub age_appearance: Option<String>, // "child", "teen", "young_adult", "adult"
}

/// 服裝風格
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClothingStyle {
    pub primary_outfit: Option<String>,
    pub style_category: Option<String>, // "casual", "formal", "fantasy", "modern"
    pub dominant_colors: Vec<String>,
    pub accessories: Vec<String>,
    pub seasonal_preference: Option<String>,
}

/// 配色方案
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorScheme {
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub accent_colors: Vec<String>,
    pub color_temperature: Option<String>, // "warm", "cool", "neutral"
    pub color_saturation: Option<String>,  // "vivid", "muted", "pastel"
}

/// 一致性配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyConfig {
    pub mode: ConsistencyMode,
    pub tolerance_level: f64, // 0.0 - 1.0
    pub auto_enhance: bool,
    pub manual_review_required: bool,
    pub reference_weight: f64, // 參考圖像的權重
    pub seed_weight: f64,      // seed 的權重
}

/// 一致性模式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConsistencyMode {
    /// 僅使用 seed
    SeedOnly,
    /// 僅使用參考圖像
    ReferenceOnly,
    /// 同時使用 seed 和參考圖像
    SeedReference,
    /// 自動選擇最佳模式
    Adaptive,
}

/// 生成統計
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationStats {
    pub generation_count: u32,
    pub success_rate: f64,
    pub avg_consistency_score: Option<f64>,
    pub avg_quality_score: Option<f64>,
    pub last_generation_at: Option<String>,
}

impl VisualTraitsManager {
    /// 創建新的視覺特徵管理器
    pub fn new(db_connection: std::sync::Arc<std::sync::Mutex<Connection>>) -> Self {
        Self { db_connection }
    }

    /// 從角色描述提取視覺特徵
    pub fn extract_traits_from_description(
        &self,
        character_id: &str,
        chinese_description: &str,
        seed_value: u32,
    ) -> Result<VisualTraits> {
        // 解析中文描述提取關鍵視覺元素
        let feature_vector = self.parse_chinese_description(chinese_description)?;
        
        // 生成標準化的英文描述
        let standard_description = self.generate_standard_description(&feature_vector)?;
        
        // 創建預設的藝術風格參數
        let art_style_params = ArtStyleParams {
            style_type: "anime".to_string(),
            color_palette: None,
            art_technique: Some("digital".to_string()),
            lighting_preference: Some("soft".to_string()),
            detail_level: Some("detailed".to_string()),
            custom_params: HashMap::new(),
        };

        // 創建預設的一致性配置
        let consistency_config = ConsistencyConfig {
            mode: ConsistencyMode::SeedReference,
            tolerance_level: 0.8,
            auto_enhance: true,
            manual_review_required: false,
            reference_weight: 0.6,
            seed_weight: 0.4,
        };

        let visual_traits = VisualTraits {
            character_id: character_id.to_string(),
            seed_value,
            standard_description: Some(standard_description),
            chinese_description: Some(chinese_description.to_string()),
            reference_images: Vec::new(),
            primary_reference_url: None,
            art_style_params,
            feature_vector,
            consistency_config,
            generation_stats: GenerationStats {
                generation_count: 0,
                success_rate: 1.0,
                avg_consistency_score: None,
                avg_quality_score: None,
                last_generation_at: None,
            },
            traits_version: "1.0".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        // 保存到資料庫
        self.save_visual_traits(&visual_traits)?;

        Ok(visual_traits)
    }

    /// 解析中文描述提取視覺特徵
    fn parse_chinese_description(&self, description: &str) -> Result<VisualFeatureVector> {
        let mut facial_features = FacialFeatures {
            eye_color: None,
            eye_shape: None,
            hair_color: None,
            hair_style: None,
            hair_length: None,
            skin_tone: None,
            facial_expression: None,
            accessories: Vec::new(),
        };

        let mut body_type = BodyType {
            height: None,
            build: None,
            age_appearance: None,
        };

        let mut clothing_style = ClothingStyle {
            primary_outfit: None,
            style_category: None,
            dominant_colors: Vec::new(),
            accessories: Vec::new(),
            seasonal_preference: None,
        };

        let color_scheme = ColorScheme {
            primary_color: None,
            secondary_color: None,
            accent_colors: Vec::new(),
            color_temperature: None,
            color_saturation: None,
        };

        // 簡化的特徵提取邏輯（實際實現會更複雜）
        let desc_lower = description.to_lowercase();

        // 提取髮色
        if desc_lower.contains("黑髮") || desc_lower.contains("黑色頭髮") {
            facial_features.hair_color = Some("black".to_string());
        } else if desc_lower.contains("金髮") || desc_lower.contains("金色頭髮") {
            facial_features.hair_color = Some("blonde".to_string());
        } else if desc_lower.contains("褐髮") || desc_lower.contains("棕髮") {
            facial_features.hair_color = Some("brown".to_string());
        } else if desc_lower.contains("銀髮") || desc_lower.contains("白髮") {
            facial_features.hair_color = Some("silver".to_string());
        }

        // 提取髮型
        if desc_lower.contains("長髮") {
            facial_features.hair_length = Some("long".to_string());
        } else if desc_lower.contains("短髮") {
            facial_features.hair_length = Some("short".to_string());
        } else if desc_lower.contains("中長") {
            facial_features.hair_length = Some("medium".to_string());
        }

        // 提取眼色
        if desc_lower.contains("藍眼") || desc_lower.contains("藍色眼睛") {
            facial_features.eye_color = Some("blue".to_string());
        } else if desc_lower.contains("綠眼") || desc_lower.contains("綠色眼睛") {
            facial_features.eye_color = Some("green".to_string());
        } else if desc_lower.contains("棕眼") || desc_lower.contains("褐色眼睛") {
            facial_features.eye_color = Some("brown".to_string());
        }

        // 提取年齡外觀
        if desc_lower.contains("少女") || desc_lower.contains("高中生") {
            body_type.age_appearance = Some("teen".to_string());
        } else if desc_lower.contains("小孩") || desc_lower.contains("兒童") {
            body_type.age_appearance = Some("child".to_string());
        } else if desc_lower.contains("成年") || desc_lower.contains("大人") {
            body_type.age_appearance = Some("adult".to_string());
        }

        // 提取服裝風格
        if desc_lower.contains("校服") {
            clothing_style.primary_outfit = Some("school_uniform".to_string());
            clothing_style.style_category = Some("student".to_string());
        } else if desc_lower.contains("洋裝") || desc_lower.contains("連衣裙") {
            clothing_style.primary_outfit = Some("dress".to_string());
            clothing_style.style_category = Some("casual".to_string());
        } else if desc_lower.contains("西裝") {
            clothing_style.primary_outfit = Some("suit".to_string());
            clothing_style.style_category = Some("formal".to_string());
        }

        // 提取特殊特徵
        let mut special_features = Vec::new();
        if desc_lower.contains("眼鏡") {
            special_features.push("glasses".to_string());
            facial_features.accessories.push("glasses".to_string());
        }
        if desc_lower.contains("雀斑") {
            special_features.push("freckles".to_string());
        }
        if desc_lower.contains("疤痕") {
            special_features.push("scar".to_string());
        }

        Ok(VisualFeatureVector {
            facial_features,
            body_type,
            clothing_style,
            color_scheme,
            special_features,
        })
    }

    /// 基於特徵向量生成標準化英文描述
    fn generate_standard_description(&self, features: &VisualFeatureVector) -> Result<String> {
        let mut description_parts = Vec::new();

        // 年齡和體型
        if let Some(age) = &features.body_type.age_appearance {
            match age.as_str() {
                "child" => description_parts.push("young child".to_string()),
                "teen" => description_parts.push("teenage girl".to_string()),
                "young_adult" => description_parts.push("young woman".to_string()),
                "adult" => description_parts.push("adult woman".to_string()),
                _ => {}
            }
        }

        // 髮色和髮型
        let hair_desc = match (
            &features.facial_features.hair_color,
            &features.facial_features.hair_length,
            &features.facial_features.hair_style,
        ) {
            (Some(color), Some(length), style) => {
                let mut hair = format!("{} {} hair", length, color);
                if let Some(s) = style {
                    hair = format!("{}, {} style", hair, s);
                }
                Some(hair)
            }
            (Some(color), None, None) => Some(format!("{} hair", color)),
            (None, Some(length), None) => Some(format!("{} hair", length)),
            _ => None,
        };

        if let Some(hair) = hair_desc {
            description_parts.push(hair);
        }

        // 眼色
        if let Some(eye_color) = &features.facial_features.eye_color {
            description_parts.push(format!("{} eyes", eye_color));
        }

        // 服裝
        if let Some(outfit) = &features.clothing_style.primary_outfit {
            let outfit_desc = match outfit.as_str() {
                "school_uniform" => "wearing school uniform",
                "dress" => "wearing a dress",
                "suit" => "wearing a suit",
                _ => "casual clothing",
            };
            description_parts.push(outfit_desc.to_string());
        }

        // 特殊特徵
        for feature in &features.special_features {
            match feature.as_str() {
                "glasses" => description_parts.push("wearing glasses".to_string()),
                "freckles" => description_parts.push("with freckles".to_string()),
                "scar" => description_parts.push("with a scar".to_string()),
                _ => {}
            }
        }

        // 組合描述
        if description_parts.is_empty() {
            Ok("anime character".to_string())
        } else {
            Ok(description_parts.join(", "))
        }
    }

    /// 保存視覺特徵到資料庫
    fn save_visual_traits(&self, traits: &VisualTraits) -> Result<()> {
        let conn = self.db_connection.lock()
            .map_err(|e| IllustrationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        // 序列化複雜結構為 JSON
        let art_style_json = serde_json::to_string(&traits.art_style_params)?;
        let feature_vector_json = serde_json::to_string(&traits.feature_vector)?;
        let reference_images_json = serde_json::to_string(&traits.reference_images)?;

        conn.execute(
            "INSERT OR REPLACE INTO character_visual_traits 
             (character_id, seed_value, standard_description, chinese_description,
              reference_images, art_style_params, feature_vector, 
              generation_count, success_rate, traits_version,
              created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                traits.character_id,
                traits.seed_value as i32,
                traits.standard_description,
                traits.chinese_description,
                reference_images_json,
                art_style_json,
                feature_vector_json,
                traits.generation_stats.generation_count as i32,
                traits.generation_stats.success_rate,
                traits.traits_version,
                traits.created_at,
                traits.updated_at
            ],
        )?;

        Ok(())
    }

    /// 從資料庫載入視覺特徵
    pub fn load_visual_traits(&self, character_id: &str) -> Result<Option<VisualTraits>> {
        let conn = self.db_connection.lock()
            .map_err(|e| IllustrationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let mut stmt = conn.prepare(
            "SELECT character_id, seed_value, standard_description, chinese_description,
                    reference_images, art_style_params, feature_vector,
                    generation_count, success_rate, avg_consistency_score,
                    traits_version, created_at, updated_at
             FROM character_visual_traits 
             WHERE character_id = ?1"
        )?;

        match stmt.query_row([character_id], |row| {
            let reference_images_json: String = row.get(4)?;
            let art_style_params_json: String = row.get(5)?;
            let feature_vector_json: String = row.get(6)?;

            let reference_images: Vec<ReferenceImage> = serde_json::from_str(&reference_images_json)
                .unwrap_or_default();
            let art_style_params: ArtStyleParams = serde_json::from_str(&art_style_params_json)
                .unwrap_or_else(|_| ArtStyleParams {
                    style_type: "anime".to_string(),
                    color_palette: None,
                    art_technique: None,
                    lighting_preference: None,
                    detail_level: None,
                    custom_params: HashMap::new(),
                });
            let feature_vector: VisualFeatureVector = serde_json::from_str(&feature_vector_json)
                .unwrap_or_else(|_| VisualFeatureVector {
                    facial_features: FacialFeatures {
                        eye_color: None, eye_shape: None, hair_color: None,
                        hair_style: None, hair_length: None, skin_tone: None,
                        facial_expression: None, accessories: Vec::new(),
                    },
                    body_type: BodyType {
                        height: None, build: None, age_appearance: None,
                    },
                    clothing_style: ClothingStyle {
                        primary_outfit: None, style_category: None,
                        dominant_colors: Vec::new(), accessories: Vec::new(),
                        seasonal_preference: None,
                    },
                    color_scheme: ColorScheme {
                        primary_color: None, secondary_color: None,
                        accent_colors: Vec::new(), color_temperature: None,
                        color_saturation: None,
                    },
                    special_features: Vec::new(),
                });

            Ok(VisualTraits {
                character_id: row.get(0)?,
                seed_value: row.get(1)?,
                standard_description: row.get(2)?,
                chinese_description: row.get(3)?,
                reference_images,
                primary_reference_url: None, // TODO: 從 reference_images 中確定
                art_style_params,
                feature_vector,
                consistency_config: ConsistencyConfig {
                    mode: ConsistencyMode::SeedReference,
                    tolerance_level: 0.8,
                    auto_enhance: true,
                    manual_review_required: false,
                    reference_weight: 0.6,
                    seed_weight: 0.4,
                },
                generation_stats: GenerationStats {
                    generation_count: row.get(7).unwrap_or(0),
                    success_rate: row.get(8).unwrap_or(1.0),
                    avg_consistency_score: row.get(9).ok(),
                    avg_quality_score: None,
                    last_generation_at: None,
                },
                traits_version: row.get(10).unwrap_or_else(|_| "1.0".to_string()),
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        }) {
            Ok(traits) => Ok(Some(traits)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(IllustrationError::Database(e)),
        }
    }

    /// 添加參考圖像
    pub fn add_reference_image(
        &self,
        character_id: &str,
        image_url: &str,
        image_type: ReferenceImageType,
        tags: Vec<String>,
    ) -> Result<()> {
        let mut traits = self.load_visual_traits(character_id)?
            .ok_or_else(|| IllustrationError::ConsistencyError("角色視覺特徵不存在".to_string()))?;

        let reference_image = ReferenceImage {
            url: image_url.to_string(),
            image_type,
            tags,
            quality_score: None,
            uploaded_at: chrono::Utc::now().to_rfc3339(),
        };

        traits.reference_images.push(reference_image);
        
        // 如果是第一張圖，設為主要參考
        if traits.primary_reference_url.is_none() {
            traits.primary_reference_url = Some(image_url.to_string());
        }

        traits.updated_at = chrono::Utc::now().to_rfc3339();
        self.save_visual_traits(&traits)?;

        Ok(())
    }

    /// 計算兩個角色視覺特徵的相似度
    pub fn calculate_similarity(&self, traits1: &VisualTraits, traits2: &VisualTraits) -> f64 {
        let mut similarity_scores = Vec::new();

        // 比較面部特徵
        let facial_similarity = self.compare_facial_features(
            &traits1.feature_vector.facial_features,
            &traits2.feature_vector.facial_features,
        );
        similarity_scores.push(facial_similarity);

        // 比較體型特徵
        let body_similarity = self.compare_body_type(
            &traits1.feature_vector.body_type,
            &traits2.feature_vector.body_type,
        );
        similarity_scores.push(body_similarity);

        // 比較服裝風格
        let clothing_similarity = self.compare_clothing_style(
            &traits1.feature_vector.clothing_style,
            &traits2.feature_vector.clothing_style,
        );
        similarity_scores.push(clothing_similarity);

        // 計算平均相似度
        similarity_scores.iter().sum::<f64>() / similarity_scores.len() as f64
    }

    /// 比較面部特徵
    fn compare_facial_features(&self, f1: &FacialFeatures, f2: &FacialFeatures) -> f64 {
        let mut matches = 0;
        let mut total = 0;

        // 比較眼色
        if f1.eye_color.is_some() && f2.eye_color.is_some() {
            total += 1;
            if f1.eye_color == f2.eye_color {
                matches += 1;
            }
        }

        // 比較髮色
        if f1.hair_color.is_some() && f2.hair_color.is_some() {
            total += 1;
            if f1.hair_color == f2.hair_color {
                matches += 1;
            }
        }

        // 比較髮長
        if f1.hair_length.is_some() && f2.hair_length.is_some() {
            total += 1;
            if f1.hair_length == f2.hair_length {
                matches += 1;
            }
        }

        if total == 0 {
            0.5 // 無法比較時返回中性分數
        } else {
            matches as f64 / total as f64
        }
    }

    /// 比較體型特徵
    fn compare_body_type(&self, b1: &BodyType, b2: &BodyType) -> f64 {
        let mut matches = 0;
        let mut total = 0;

        if b1.age_appearance.is_some() && b2.age_appearance.is_some() {
            total += 1;
            if b1.age_appearance == b2.age_appearance {
                matches += 1;
            }
        }

        if b1.build.is_some() && b2.build.is_some() {
            total += 1;
            if b1.build == b2.build {
                matches += 1;
            }
        }

        if total == 0 {
            0.5
        } else {
            matches as f64 / total as f64
        }
    }

    /// 比較服裝風格
    fn compare_clothing_style(&self, c1: &ClothingStyle, c2: &ClothingStyle) -> f64 {
        let mut matches = 0;
        let mut total = 0;

        if c1.primary_outfit.is_some() && c2.primary_outfit.is_some() {
            total += 1;
            if c1.primary_outfit == c2.primary_outfit {
                matches += 1;
            }
        }

        if c1.style_category.is_some() && c2.style_category.is_some() {
            total += 1;
            if c1.style_category == c2.style_category {
                matches += 1;
            }
        }

        if total == 0 {
            0.5
        } else {
            matches as f64 / total as f64
        }
    }
}

impl Default for ArtStyleParams {
    fn default() -> Self {
        Self {
            style_type: "anime".to_string(),
            color_palette: None,
            art_technique: Some("digital".to_string()),
            lighting_preference: Some("soft".to_string()),
            detail_level: Some("detailed".to_string()),
            custom_params: HashMap::new(),
        }
    }
}