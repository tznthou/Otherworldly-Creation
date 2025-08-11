use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::{Result, TranslationError};

/// 提示詞模板管理器
/// 
/// 功能：
/// 1. 管理不同角色類型和場景的提示詞模板
/// 2. 支援模板參數化和動態替換
/// 3. 提供模板分類和搜尋功能
/// 4. 支援自定義模板和社群模板
pub struct PromptTemplateManager {
    templates: HashMap<String, PromptTemplate>,
    template_categories: HashMap<TemplateCategory, Vec<String>>,
}

/// 提示詞模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: TemplateCategory,
    pub subcategory: Option<String>,
    
    // 模板內容
    pub template: String,                    // 基礎模板文字
    pub required_parameters: Vec<String>,    // 必需參數
    pub optional_parameters: Vec<String>,    // 可選參數
    pub default_values: HashMap<String, String>, // 預設值
    
    // 品質設定
    pub quality_modifiers: Vec<String>,      // 品質修飾詞
    pub negative_prompts: Vec<String>,       // 負面提示詞
    pub style_tags: Vec<String>,            // 風格標籤
    
    // 使用統計和評分
    pub usage_count: u32,
    pub average_rating: f64,
    pub success_rate: f64,
    
    // 元數據
    pub author: String,
    pub version: String,
    pub language: String,                   // "zh", "en", "ja"
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 模板分類
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TemplateCategory {
    /// 角色類型
    CharacterTypes,
    /// 場景背景
    Backgrounds,
    /// 服裝風格
    ClothingStyles,
    /// 表情情緒
    Expressions,
    /// 動作姿勢
    Poses,
    /// 藝術風格
    ArtStyles,
    /// 光影效果
    Lighting,
    /// 特殊效果
    Effects,
    /// 組合模板
    Composite,
    /// 自定義模板
    Custom,
}

/// 模板應用請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateApplicationRequest {
    pub template_id: String,
    pub parameters: HashMap<String, String>,
    pub character_description: Option<String>, // 角色基礎描述
    pub apply_quality_modifiers: bool,
    pub include_negative_prompts: bool,
    pub target_style: Option<String>,          // 目標藝術風格
}

/// 模板應用結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateApplicationResult {
    pub final_prompt: String,
    pub negative_prompt: Option<String>,
    pub applied_parameters: HashMap<String, String>,
    pub missing_parameters: Vec<String>,
    pub template_info: TemplateInfo,
    pub estimated_quality_score: f64,
}

/// 模板資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateInfo {
    pub template_name: String,
    pub category: TemplateCategory,
    pub description: String,
    pub author: String,
    pub version: String,
}

/// 模板搜尋請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateSearchRequest {
    pub query: Option<String>,               // 搜尋關鍵詞
    pub category: Option<TemplateCategory>,  // 分類篩選
    pub tags: Vec<String>,                   // 標籤篩選
    pub language: Option<String>,            // 語言篩選
    pub min_rating: Option<f64>,             // 最低評分
    pub limit: Option<usize>,                // 結果數量限制
}

impl PromptTemplateManager {
    /// 創建新的模板管理器
    pub fn new() -> Self {
        let mut manager = Self {
            templates: HashMap::new(),
            template_categories: HashMap::new(),
        };
        
        // 初始化內建模板
        if let Err(e) = manager.load_builtin_templates() {
            log::error!("[PromptTemplateManager] 內建模板載入失敗: {:?}", e);
        }
        
        manager
    }
    
    /// 載入內建模板
    fn load_builtin_templates(&mut self) -> Result<()> {
        log::info!("[PromptTemplateManager] 開始載入內建模板...");
        
        // 角色類型模板
        self.add_character_type_templates()?;
        
        // 場景背景模板
        self.add_background_templates()?;
        
        // 服裝風格模板
        self.add_clothing_templates()?;
        
        // 表情情緒模板
        self.add_expression_templates()?;
        
        // 動作姿勢模板
        self.add_pose_templates()?;
        
        // 藝術風格模板
        self.add_art_style_templates()?;
        
        // 光影效果模板
        self.add_lighting_templates()?;
        
        // 組合模板
        self.add_composite_templates()?;
        
        log::info!("[PromptTemplateManager] 內建模板載入完成，共 {} 個模板", self.templates.len());
        Ok(())
    }
    
    /// 添加角色類型模板
    fn add_character_type_templates(&mut self) -> Result<()> {
        // 學生角色模板
        self.add_template(PromptTemplate {
            id: "student_character".to_string(),
            name: "學生角色".to_string(),
            description: "適用於學生角色的基礎模板，包含校服、年輕特徵等元素".to_string(),
            category: TemplateCategory::CharacterTypes,
            subcategory: Some("學生".to_string()),
            template: "{age} year old {gender}, {hair_description}, {eye_description}, wearing {uniform_type}, {expression}, {pose}, school setting".to_string(),
            required_parameters: vec![
                "age".to_string(), 
                "gender".to_string(),
                "hair_description".to_string(),
                "eye_description".to_string(),
                "uniform_type".to_string()
            ],
            optional_parameters: vec![
                "expression".to_string(),
                "pose".to_string(),
                "accessories".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("age".to_string(), "16".to_string());
                defaults.insert("expression".to_string(), "gentle smile".to_string());
                defaults.insert("pose".to_string(), "standing naturally".to_string());
                defaults.insert("uniform_type".to_string(), "school uniform".to_string());
                defaults
            },
            quality_modifiers: vec![
                "anime style".to_string(),
                "high quality".to_string(),
                "detailed".to_string(),
                "clean art".to_string()
            ],
            negative_prompts: vec![
                "adult".to_string(),
                "mature".to_string(),
                "inappropriate".to_string(),
                "low quality".to_string()
            ],
            style_tags: vec!["anime".to_string(), "school".to_string(), "youth".to_string()],
            usage_count: 0,
            average_rating: 4.5,
            success_rate: 0.9,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["角色".to_string(), "學生".to_string(), "校園".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        // 魔法師角色模板
        self.add_template(PromptTemplate {
            id: "mage_character".to_string(),
            name: "魔法師角色".to_string(),
            description: "適用於魔法師、法師角色的模板，包含魔法元素和神秘氛圍".to_string(),
            category: TemplateCategory::CharacterTypes,
            subcategory: Some("魔法師".to_string()),
            template: "{gender} mage, {hair_description}, {eye_description}, wearing {robe_type}, holding {magical_item}, {magical_effects}, {expression}, fantasy setting".to_string(),
            required_parameters: vec![
                "gender".to_string(),
                "hair_description".to_string(),
                "eye_description".to_string(),
                "robe_type".to_string(),
                "magical_item".to_string()
            ],
            optional_parameters: vec![
                "magical_effects".to_string(),
                "expression".to_string(),
                "background_magic".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("robe_type".to_string(), "wizard robe".to_string());
                defaults.insert("magical_item".to_string(), "magic staff".to_string());
                defaults.insert("magical_effects".to_string(), "glowing magic circle".to_string());
                defaults.insert("expression".to_string(), "confident".to_string());
                defaults
            },
            quality_modifiers: vec![
                "fantasy art".to_string(),
                "magical atmosphere".to_string(),
                "detailed magic effects".to_string(),
                "mystical".to_string()
            ],
            negative_prompts: vec![
                "modern clothing".to_string(),
                "realistic setting".to_string(),
                "no magic".to_string()
            ],
            style_tags: vec!["fantasy".to_string(), "magic".to_string(), "mystical".to_string()],
            usage_count: 0,
            average_rating: 4.3,
            success_rate: 0.85,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["角色".to_string(), "魔法師".to_string(), "奇幻".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        // 武士角色模板
        self.add_template(PromptTemplate {
            id: "samurai_character".to_string(),
            name: "武士角色".to_string(),
            description: "適用於武士、劍客角色的模板，包含日式元素和武術氛圍".to_string(),
            category: TemplateCategory::CharacterTypes,
            subcategory: Some("武士".to_string()),
            template: "{gender} samurai, {hair_description}, {eye_description}, wearing {armor_type}, holding {weapon}, {stance}, {expression}, Japanese setting".to_string(),
            required_parameters: vec![
                "gender".to_string(),
                "hair_description".to_string(),
                "eye_description".to_string(),
                "armor_type".to_string(),
                "weapon".to_string()
            ],
            optional_parameters: vec![
                "stance".to_string(),
                "expression".to_string(),
                "background_elements".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("armor_type".to_string(), "traditional samurai armor".to_string());
                defaults.insert("weapon".to_string(), "katana sword".to_string());
                defaults.insert("stance".to_string(), "ready for battle".to_string());
                defaults.insert("expression".to_string(), "determined".to_string());
                defaults
            },
            quality_modifiers: vec![
                "Japanese art style".to_string(),
                "detailed armor".to_string(),
                "traditional".to_string(),
                "honorable".to_string()
            ],
            negative_prompts: vec![
                "modern weapons".to_string(),
                "western style".to_string(),
                "casual clothing".to_string()
            ],
            style_tags: vec!["Japanese".to_string(), "samurai".to_string(), "traditional".to_string()],
            usage_count: 0,
            average_rating: 4.4,
            success_rate: 0.88,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["角色".to_string(), "武士".to_string(), "日式".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加場景背景模板
    fn add_background_templates(&mut self) -> Result<()> {
        // 校園場景模板
        self.add_template(PromptTemplate {
            id: "school_background".to_string(),
            name: "校園場景".to_string(),
            description: "校園環境背景模板，包含教室、走廊、操場等場景".to_string(),
            category: TemplateCategory::Backgrounds,
            subcategory: Some("校園".to_string()),
            template: "{location_type}, {time_of_day}, {weather}, {crowd_level}, {architectural_details}, school atmosphere".to_string(),
            required_parameters: vec![
                "location_type".to_string(),
                "time_of_day".to_string()
            ],
            optional_parameters: vec![
                "weather".to_string(),
                "crowd_level".to_string(),
                "architectural_details".to_string(),
                "seasonal_elements".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("location_type".to_string(), "school classroom".to_string());
                defaults.insert("time_of_day".to_string(), "afternoon".to_string());
                defaults.insert("weather".to_string(), "sunny day".to_string());
                defaults.insert("crowd_level".to_string(), "few students".to_string());
                defaults
            },
            quality_modifiers: vec![
                "detailed background".to_string(),
                "anime style".to_string(),
                "school setting".to_string(),
                "clean environment".to_string()
            ],
            negative_prompts: vec![
                "dark atmosphere".to_string(),
                "abandoned".to_string(),
                "adult setting".to_string()
            ],
            style_tags: vec!["school".to_string(), "educational".to_string(), "youth".to_string()],
            usage_count: 0,
            average_rating: 4.2,
            success_rate: 0.9,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["背景".to_string(), "校園".to_string(), "日常".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        // 魔法森林場景模板
        self.add_template(PromptTemplate {
            id: "magical_forest".to_string(),
            name: "魔法森林".to_string(),
            description: "神秘魔法森林背景模板，包含魔法元素和奇幻生物".to_string(),
            category: TemplateCategory::Backgrounds,
            subcategory: Some("奇幻".to_string()),
            template: "magical forest, {tree_types}, {magical_creatures}, {lighting_effects}, {magical_elements}, {atmosphere}, fantasy setting".to_string(),
            required_parameters: vec![
                "tree_types".to_string(),
                "lighting_effects".to_string()
            ],
            optional_parameters: vec![
                "magical_creatures".to_string(),
                "magical_elements".to_string(),
                "atmosphere".to_string(),
                "weather_magic".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("tree_types".to_string(), "ancient glowing trees".to_string());
                defaults.insert("lighting_effects".to_string(), "mystical light filtering through".to_string());
                defaults.insert("magical_creatures".to_string(), "fireflies and spirits".to_string());
                defaults.insert("atmosphere".to_string(), "mystical and serene".to_string());
                defaults
            },
            quality_modifiers: vec![
                "fantasy art".to_string(),
                "magical atmosphere".to_string(),
                "detailed forest".to_string(),
                "enchanted".to_string()
            ],
            negative_prompts: vec![
                "realistic forest".to_string(),
                "dark scary".to_string(),
                "no magic".to_string()
            ],
            style_tags: vec!["fantasy".to_string(), "magical".to_string(), "nature".to_string()],
            usage_count: 0,
            average_rating: 4.6,
            success_rate: 0.87,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["背景".to_string(), "魔法".to_string(), "森林".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加服裝風格模板
    fn add_clothing_templates(&mut self) -> Result<()> {
        // 校服風格模板
        self.add_template(PromptTemplate {
            id: "school_uniform_style".to_string(),
            name: "校服風格".to_string(),
            description: "各種校服風格模板，包含日式、韓式、英式等不同風格".to_string(),
            category: TemplateCategory::ClothingStyles,
            subcategory: Some("校服".to_string()),
            template: "{uniform_style} school uniform, {shirt_type}, {skirt_or_pants}, {accessories}, {color_scheme}, {seasonal_variation}".to_string(),
            required_parameters: vec![
                "uniform_style".to_string(),
                "shirt_type".to_string(),
                "skirt_or_pants".to_string()
            ],
            optional_parameters: vec![
                "accessories".to_string(),
                "color_scheme".to_string(),
                "seasonal_variation".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("uniform_style".to_string(), "Japanese style".to_string());
                defaults.insert("shirt_type".to_string(), "white blouse".to_string());
                defaults.insert("skirt_or_pants".to_string(), "pleated skirt".to_string());
                defaults.insert("color_scheme".to_string(), "navy and white".to_string());
                defaults
            },
            quality_modifiers: vec![
                "clean uniform".to_string(),
                "proper fit".to_string(),
                "school appropriate".to_string(),
                "detailed clothing".to_string()
            ],
            negative_prompts: vec![
                "inappropriate".to_string(),
                "adult clothing".to_string(),
                "wrinkled".to_string(),
                "damaged".to_string()
            ],
            style_tags: vec!["uniform".to_string(), "school".to_string(), "formal".to_string()],
            usage_count: 0,
            average_rating: 4.3,
            success_rate: 0.92,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["服裝".to_string(), "校服".to_string(), "學生".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加表情情緒模板
    fn add_expression_templates(&mut self) -> Result<()> {
        // 快樂表情模板
        self.add_template(PromptTemplate {
            id: "happy_expressions".to_string(),
            name: "快樂表情".to_string(),
            description: "各種快樂、愉悅的表情模板，包含微笑、大笑等".to_string(),
            category: TemplateCategory::Expressions,
            subcategory: Some("正面情緒".to_string()),
            template: "{smile_type}, {eye_expression}, {facial_details}, {emotion_intensity}, cheerful mood".to_string(),
            required_parameters: vec![
                "smile_type".to_string(),
                "eye_expression".to_string()
            ],
            optional_parameters: vec![
                "facial_details".to_string(),
                "emotion_intensity".to_string(),
                "context_emotion".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("smile_type".to_string(), "gentle smile".to_string());
                defaults.insert("eye_expression".to_string(), "bright eyes".to_string());
                defaults.insert("emotion_intensity".to_string(), "moderate".to_string());
                defaults
            },
            quality_modifiers: vec![
                "natural expression".to_string(),
                "warm feeling".to_string(),
                "positive emotion".to_string(),
                "genuine happiness".to_string()
            ],
            negative_prompts: vec![
                "forced smile".to_string(),
                "sad expression".to_string(),
                "angry".to_string(),
                "unnatural".to_string()
            ],
            style_tags: vec!["emotion".to_string(), "positive".to_string(), "natural".to_string()],
            usage_count: 0,
            average_rating: 4.5,
            success_rate: 0.95,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["表情".to_string(), "快樂".to_string(), "情緒".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加動作姿勢模板
    fn add_pose_templates(&mut self) -> Result<()> {
        // 站立姿勢模板
        self.add_template(PromptTemplate {
            id: "standing_poses".to_string(),
            name: "站立姿勢".to_string(),
            description: "各種站立姿勢模板，包含自然站立、優雅站立等".to_string(),
            category: TemplateCategory::Poses,
            subcategory: Some("基礎姿勢".to_string()),
            template: "{standing_style}, {arm_position}, {leg_position}, {body_angle}, {weight_distribution}, natural pose".to_string(),
            required_parameters: vec![
                "standing_style".to_string(),
                "arm_position".to_string()
            ],
            optional_parameters: vec![
                "leg_position".to_string(),
                "body_angle".to_string(),
                "weight_distribution".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("standing_style".to_string(), "naturally standing".to_string());
                defaults.insert("arm_position".to_string(), "arms at sides".to_string());
                defaults.insert("leg_position".to_string(), "feet together".to_string());
                defaults
            },
            quality_modifiers: vec![
                "natural pose".to_string(),
                "good proportions".to_string(),
                "balanced stance".to_string(),
                "confident posture".to_string()
            ],
            negative_prompts: vec![
                "awkward pose".to_string(),
                "unnatural position".to_string(),
                "bad anatomy".to_string(),
                "stiff".to_string()
            ],
            style_tags: vec!["pose".to_string(), "standing".to_string(), "basic".to_string()],
            usage_count: 0,
            average_rating: 4.2,
            success_rate: 0.89,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["姿勢".to_string(), "站立".to_string(), "基礎".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加藝術風格模板
    fn add_art_style_templates(&mut self) -> Result<()> {
        // 動漫風格模板
        self.add_template(PromptTemplate {
            id: "anime_art_style".to_string(),
            name: "動漫風格".to_string(),
            description: "經典動漫藝術風格模板，適合角色插畫生成".to_string(),
            category: TemplateCategory::ArtStyles,
            subcategory: Some("動漫".to_string()),
            template: "anime style, {art_quality}, {color_palette}, {shading_style}, {line_art_quality}, {background_detail}".to_string(),
            required_parameters: vec![
                "art_quality".to_string(),
                "shading_style".to_string()
            ],
            optional_parameters: vec![
                "color_palette".to_string(),
                "line_art_quality".to_string(),
                "background_detail".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("art_quality".to_string(), "high quality".to_string());
                defaults.insert("shading_style".to_string(), "cel shading".to_string());
                defaults.insert("color_palette".to_string(), "vibrant colors".to_string());
                defaults.insert("line_art_quality".to_string(), "clean line art".to_string());
                defaults
            },
            quality_modifiers: vec![
                "masterpiece".to_string(),
                "best quality".to_string(),
                "detailed".to_string(),
                "professional anime art".to_string()
            ],
            negative_prompts: vec![
                "realistic style".to_string(),
                "western cartoon".to_string(),
                "low quality".to_string(),
                "amateur art".to_string()
            ],
            style_tags: vec!["anime".to_string(), "Japanese".to_string(), "illustration".to_string()],
            usage_count: 0,
            average_rating: 4.7,
            success_rate: 0.93,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["風格".to_string(), "動漫".to_string(), "日式".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加光影效果模板
    fn add_lighting_templates(&mut self) -> Result<()> {
        // 柔和光線模板
        self.add_template(PromptTemplate {
            id: "soft_lighting".to_string(),
            name: "柔和光線".to_string(),
            description: "柔和光線效果模板，適合營造溫暖舒適的氛圍".to_string(),
            category: TemplateCategory::Lighting,
            subcategory: Some("環境光".to_string()),
            template: "{light_source}, {light_direction}, {shadow_softness}, {color_temperature}, {ambient_lighting}, soft lighting effect".to_string(),
            required_parameters: vec![
                "light_source".to_string(),
                "light_direction".to_string()
            ],
            optional_parameters: vec![
                "shadow_softness".to_string(),
                "color_temperature".to_string(),
                "ambient_lighting".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("light_source".to_string(), "natural sunlight".to_string());
                defaults.insert("light_direction".to_string(), "from above".to_string());
                defaults.insert("shadow_softness".to_string(), "soft shadows".to_string());
                defaults.insert("color_temperature".to_string(), "warm light".to_string());
                defaults
            },
            quality_modifiers: vec![
                "beautiful lighting".to_string(),
                "professional lighting".to_string(),
                "atmospheric".to_string(),
                "cinematic lighting".to_string()
            ],
            negative_prompts: vec![
                "harsh lighting".to_string(),
                "overexposed".to_string(),
                "dark shadows".to_string(),
                "bad lighting".to_string()
            ],
            style_tags: vec!["lighting".to_string(), "soft".to_string(), "warm".to_string()],
            usage_count: 0,
            average_rating: 4.4,
            success_rate: 0.88,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["光線".to_string(), "柔和".to_string(), "氛圍".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加組合模板
    fn add_composite_templates(&mut self) -> Result<()> {
        // 完整角色場景組合模板
        self.add_template(PromptTemplate {
            id: "complete_character_scene".to_string(),
            name: "完整角色場景".to_string(),
            description: "包含角色、背景、光線的完整場景組合模板".to_string(),
            category: TemplateCategory::Composite,
            subcategory: Some("全場景".to_string()),
            template: "{character_template}, {background_template}, {lighting_template}, {art_style}, {mood}, complete scene".to_string(),
            required_parameters: vec![
                "character_template".to_string(),
                "background_template".to_string(),
                "art_style".to_string()
            ],
            optional_parameters: vec![
                "lighting_template".to_string(),
                "mood".to_string(),
                "special_effects".to_string()
            ],
            default_values: {
                let mut defaults = HashMap::new();
                defaults.insert("art_style".to_string(), "anime style".to_string());
                defaults.insert("mood".to_string(), "peaceful".to_string());
                defaults.insert("lighting_template".to_string(), "soft natural lighting".to_string());
                defaults
            },
            quality_modifiers: vec![
                "masterpiece".to_string(),
                "complete illustration".to_string(),
                "detailed scene".to_string(),
                "professional composition".to_string()
            ],
            negative_prompts: vec![
                "incomplete scene".to_string(),
                "inconsistent style".to_string(),
                "poor composition".to_string()
            ],
            style_tags: vec!["composite".to_string(), "complete".to_string(), "scene".to_string()],
            usage_count: 0,
            average_rating: 4.6,
            success_rate: 0.85,
            author: "Genesis Chronicle".to_string(),
            version: "1.0".to_string(),
            language: "zh".to_string(),
            tags: vec!["組合".to_string(), "完整".to_string(), "場景".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        })?;
        
        Ok(())
    }
    
    /// 添加模板到管理器
    fn add_template(&mut self, template: PromptTemplate) -> Result<()> {
        let template_id = template.id.clone();
        let category = template.category.clone();
        
        // 添加模板
        self.templates.insert(template_id.clone(), template);
        
        // 更新分類索引
        let category_list = self.template_categories.entry(category).or_insert_with(Vec::new);
        if !category_list.contains(&template_id) {
            category_list.push(template_id);
        }
        
        Ok(())
    }
    
    /// 應用模板
    pub fn apply_template(&self, request: TemplateApplicationRequest) -> Result<TemplateApplicationResult> {
        let template = self.templates.get(&request.template_id)
            .ok_or_else(|| TranslationError::OptimizationError(
                format!("模板不存在: {}", request.template_id)
            ))?;
        
        log::info!("[PromptTemplateManager] 應用模板: {}", template.name);
        
        // 合併參數（請求參數優先，然後是預設值）
        let mut final_parameters = template.default_values.clone();
        for (key, value) in &request.parameters {
            final_parameters.insert(key.clone(), value.clone());
        }
        
        // 檢查缺少的必需參數
        let mut missing_parameters = Vec::new();
        for required_param in &template.required_parameters {
            if !final_parameters.contains_key(required_param) {
                missing_parameters.push(required_param.clone());
            }
        }
        
        // 替換模板中的參數
        let mut final_prompt = template.template.clone();
        for (key, value) in &final_parameters {
            let placeholder = format!("{{{}}}", key);
            final_prompt = final_prompt.replace(&placeholder, value);
        }
        
        // 添加角色基礎描述
        if let Some(char_desc) = &request.character_description {
            final_prompt = format!("{}, {}", char_desc, final_prompt);
        }
        
        // 應用品質修飾詞
        if request.apply_quality_modifiers {
            let quality_mods = template.quality_modifiers.join(", ");
            final_prompt = format!("{}, {}", quality_mods, final_prompt);
        }
        
        // 應用目標風格
        if let Some(target_style) = &request.target_style {
            final_prompt = format!("{}, {}", final_prompt, target_style);
        }
        
        // 生成負面提示詞
        let negative_prompt = if request.include_negative_prompts {
            Some(template.negative_prompts.join(", "))
        } else {
            None
        };
        
        // 計算品質分數
        let quality_score = self.calculate_template_quality_score(template, &missing_parameters);
        
        let result = TemplateApplicationResult {
            final_prompt: final_prompt.trim().to_string(),
            negative_prompt,
            applied_parameters: final_parameters,
            missing_parameters,
            template_info: TemplateInfo {
                template_name: template.name.clone(),
                category: template.category.clone(),
                description: template.description.clone(),
                author: template.author.clone(),
                version: template.version.clone(),
            },
            estimated_quality_score: quality_score,
        };
        
        log::info!("[PromptTemplateManager] 模板應用完成，品質分數: {:.2}", quality_score);
        Ok(result)
    }
    
    /// 搜尋模板
    pub fn search_templates(&self, request: TemplateSearchRequest) -> Result<Vec<PromptTemplate>> {
        let mut results: Vec<&PromptTemplate> = self.templates.values().collect();
        
        // 分類篩選
        if let Some(category) = &request.category {
            results.retain(|template| &template.category == category);
        }
        
        // 語言篩選
        if let Some(language) = &request.language {
            results.retain(|template| &template.language == language);
        }
        
        // 評分篩選
        if let Some(min_rating) = request.min_rating {
            results.retain(|template| template.average_rating >= min_rating);
        }
        
        // 關鍵詞搜尋
        if let Some(query) = &request.query {
            let query_lower = query.to_lowercase();
            results.retain(|template| {
                template.name.to_lowercase().contains(&query_lower) ||
                template.description.to_lowercase().contains(&query_lower) ||
                template.tags.iter().any(|tag| tag.to_lowercase().contains(&query_lower))
            });
        }
        
        // 標籤篩選
        if !request.tags.is_empty() {
            results.retain(|template| {
                request.tags.iter().any(|tag| template.tags.contains(tag))
            });
        }
        
        // 按評分排序
        results.sort_by(|a, b| {
            b.average_rating.partial_cmp(&a.average_rating).unwrap_or(std::cmp::Ordering::Equal)
                .then(b.usage_count.cmp(&a.usage_count))
        });
        
        // 限制結果數量
        if let Some(limit) = request.limit {
            results.truncate(limit);
        }
        
        Ok(results.into_iter().cloned().collect())
    }
    
    /// 獲取所有分類
    pub fn get_categories(&self) -> Vec<TemplateCategory> {
        self.template_categories.keys().cloned().collect()
    }
    
    /// 獲取分類下的模板
    pub fn get_templates_by_category(&self, category: &TemplateCategory) -> Vec<PromptTemplate> {
        if let Some(template_ids) = self.template_categories.get(category) {
            template_ids.iter()
                .filter_map(|id| self.templates.get(id))
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }
    
    /// 計算模板品質分數
    fn calculate_template_quality_score(&self, template: &PromptTemplate, missing_params: &[String]) -> f64 {
        let mut score = 0.8; // 基礎分數
        
        // 根據缺少參數降分
        let missing_ratio = missing_params.len() as f64 / template.required_parameters.len() as f64;
        score -= missing_ratio * 0.3;
        
        // 根據模板評分加分
        score += (template.average_rating - 3.0) / 5.0 * 0.2;
        
        // 根據成功率加分
        score += (template.success_rate - 0.5) * 0.1;
        
        score.max(0.0).min(1.0)
    }
    
    /// 獲取模板統計資訊
    pub fn get_template_stats(&self) -> TemplateStats {
        let total_templates = self.templates.len();
        let mut category_counts = HashMap::new();
        
        for (category, template_ids) in &self.template_categories {
            category_counts.insert(category.clone(), template_ids.len());
        }
        
        let average_rating = if !self.templates.is_empty() {
            self.templates.values().map(|t| t.average_rating).sum::<f64>() / total_templates as f64
        } else {
            0.0
        };
        
        let total_usage = self.templates.values().map(|t| t.usage_count).sum::<u32>();
        
        TemplateStats {
            total_templates,
            category_counts,
            average_rating,
            total_usage,
            last_updated: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// 模板統計資訊
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateStats {
    pub total_templates: usize,
    pub category_counts: HashMap<TemplateCategory, usize>,
    pub average_rating: f64,
    pub total_usage: u32,
    pub last_updated: String,
}