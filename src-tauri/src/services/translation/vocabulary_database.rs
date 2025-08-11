use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::{Result, TranslationError};

/// 專業詞彙庫管理器
/// 
/// 功能：
/// 1. 維護動漫、輕小說專業詞彙對照表
/// 2. 提供智能詞彙匹配和建議
/// 3. 支援詞彙分類和權重管理
/// 4. 動態更新和學習新詞彙
pub struct VocabularyDatabase {
    db_connection: std::sync::Arc<std::sync::Mutex<Connection>>,
    #[allow(dead_code)]
    vocabulary_cache: std::sync::Arc<std::sync::Mutex<HashMap<String, VocabularyEntry>>>,
}

/// 詞彙條目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabularyEntry {
    pub id: i64,
    pub chinese_term: String,
    pub english_term: String,
    pub category: VocabularyCategory,
    pub subcategory: Option<String>,
    
    // 優先級和權重
    pub priority: i32, // 1-10，數值越高優先級越高
    pub usage_weight: f64, // 在提示詞中的權重
    
    // 語境資訊
    pub context_tags: Vec<String>, // 使用場景標籤
    pub style_tags: Vec<String>,   // 風格標籤 (anime, realistic, fantasy)
    pub gender_specific: Option<Gender>,
    pub age_appropriate: Option<AgeRange>,
    
    // 替代詞彙
    pub synonyms: Vec<String>,     // 英文同義詞
    pub variations: Vec<String>,   // 中文變體
    
    // 統計資訊
    pub usage_count: u32,
    pub success_rate: f64,
    pub last_used_at: Option<String>,
    
    // 元數據
    pub source: VocabularySource,
    pub verified: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// 詞彙分類
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum VocabularyCategory {
    /// 面部特徵
    FacialFeatures,
    /// 髮型髮色
    Hair,
    /// 眼部特徵
    Eyes,
    /// 身材體型
    BodyType,
    /// 服裝類型
    Clothing,
    /// 配件飾品
    Accessories,
    /// 表情情緒
    Expression,
    /// 動作姿勢
    Pose,
    /// 場景背景
    Background,
    /// 藝術風格
    ArtStyle,
    /// 特殊效果
    Effects,
    /// 顏色描述
    Colors,
    /// 材質紋理
    Texture,
    /// 光影效果
    Lighting,
    /// 角色性格
    Personality,
    /// 其他
    Other,
}

/// 性別限定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Gender {
    Male,
    Female,
    Neutral,
}

/// 年齡範圍
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgeRange {
    Child,      // 兒童
    Teen,       // 青少年
    YoungAdult, // 年輕成年
    Adult,      // 成年
    Senior,     // 長者
    Ageless,    // 不限年齡
}

/// 詞彙來源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VocabularySource {
    /// 內建詞庫
    Builtin,
    /// 使用者新增
    UserAdded,
    /// AI 學習
    AILearned,
    /// 社群貢獻
    Community,
    /// 專家審核
    Expert,
}

impl VocabularyDatabase {
    /// 創建新的詞彙庫管理器
    pub fn new(db_connection: std::sync::Arc<std::sync::Mutex<Connection>>) -> Self {
        let vocabulary_cache = std::sync::Arc::new(std::sync::Mutex::new(HashMap::new()));
        
        let db = Self {
            db_connection,
            vocabulary_cache,
        };
        
        // 初始化詞彙庫表
        if let Err(e) = db.initialize_vocabulary_tables() {
            log::error!("[VocabularyDatabase] 初始化失敗: {:?}", e);
        }
        
        // 載入內建詞彙庫
        if let Err(e) = db.load_builtin_vocabulary() {
            log::error!("[VocabularyDatabase] 內建詞彙庫載入失敗: {:?}", e);
        }
        
        db
    }

    /// 初始化資料庫表
    fn initialize_vocabulary_tables(&self) -> Result<()> {
        let conn = self.db_connection.lock()
            .map_err(|e| TranslationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        // 詞彙條目表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vocabulary_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chinese_term TEXT NOT NULL,
                english_term TEXT NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT,
                priority INTEGER DEFAULT 5,
                usage_weight REAL DEFAULT 1.0,
                context_tags TEXT, -- JSON array
                style_tags TEXT,   -- JSON array
                gender_specific TEXT,
                age_appropriate TEXT,
                synonyms TEXT,     -- JSON array
                variations TEXT,   -- JSON array
                usage_count INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 1.0,
                last_used_at TEXT,
                source TEXT NOT NULL,
                verified BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(chinese_term, category)
            )",
            [],
        )?;

        // 建立索引以提高查詢效能
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabulary_chinese ON vocabulary_entries(chinese_term)",
            [],
        )?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabulary_category ON vocabulary_entries(category)",
            [],
        )?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabulary_priority ON vocabulary_entries(priority DESC)",
            [],
        )?;

        log::info!("[VocabularyDatabase] 詞彙庫表初始化完成");
        Ok(())
    }

    /// 載入內建詞彙庫
    fn load_builtin_vocabulary(&self) -> Result<()> {
        log::info!("[VocabularyDatabase] 開始載入內建詞彙庫...");
        
        // 面部特徵詞彙
        let facial_vocab = vec![
            ("大眼睛", "large eyes", 8),
            ("小眼睛", "small eyes", 6),
            ("雙眼皮", "double eyelids", 5),
            ("單眼皮", "monolids", 5),
            ("濃眉", "thick eyebrows", 6),
            ("細眉", "thin eyebrows", 6),
            ("高鼻梁", "high nose bridge", 7),
            ("小鼻子", "small nose", 6),
            ("櫻桃小嘴", "cherry lips", 8),
            ("豐唇", "full lips", 6),
            ("薄唇", "thin lips", 5),
            ("酒窩", "dimples", 7),
            ("雀斑", "freckles", 6),
            ("美人痣", "beauty mark", 7),
            ("嬰兒肥", "baby face", 7),
            ("瓜子臉", "oval face", 6),
            ("圓臉", "round face", 6),
            ("方臉", "square face", 5),
        ];

        for (chinese, english, priority) in &facial_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::FacialFeatures,
                *priority,
                1.0,
                vec!["anime".to_string(), "character".to_string()],
            )?;
        }

        // 髮型髮色詞彙
        let hair_vocab = vec![
            ("黑髮", "black hair", 9),
            ("褐髮", "brown hair", 8),
            ("金髮", "blonde hair", 8),
            ("銀髮", "silver hair", 7),
            ("白髮", "white hair", 7),
            ("紅髮", "red hair", 7),
            ("藍髮", "blue hair", 6),
            ("粉紅髮", "pink hair", 6),
            ("紫髮", "purple hair", 6),
            ("綠髮", "green hair", 5),
            ("長髮", "long hair", 9),
            ("短髮", "short hair", 8),
            ("中長髮", "medium hair", 7),
            ("馬尾", "ponytail", 8),
            ("雙馬尾", "twintails", 8),
            ("公主頭", "half updo", 7),
            ("丸子頭", "hair bun", 7),
            ("辮子", "braids", 7),
            ("卷髮", "curly hair", 7),
            ("直髮", "straight hair", 8),
            ("波浪髮", "wavy hair", 6),
            ("瀏海", "bangs", 8),
            ("齊瀏海", "blunt bangs", 7),
            ("斜瀏海", "side bangs", 7),
            ("空氣瀏海", "wispy bangs", 6),
        ];

        for (chinese, english, priority) in &hair_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::Hair,
                *priority,
                1.2, // 髮型是重要特徵，權重較高
                vec!["anime".to_string(), "hairstyle".to_string()],
            )?;
        }

        // 眼部特徵詞彙
        let eyes_vocab = vec![
            ("藍眼", "blue eyes", 8),
            ("綠眼", "green eyes", 7),
            ("褐眼", "brown eyes", 8),
            ("黑眼", "black eyes", 7),
            ("紅眼", "red eyes", 6),
            ("紫眼", "purple eyes", 5),
            ("金眼", "golden eyes", 6),
            ("異色瞳", "heterochromia", 7),
            ("貓眼", "cat-like eyes", 6),
            ("銳利眼神", "sharp eyes", 7),
            ("溫和眼神", "gentle eyes", 7),
            ("無辜眼神", "innocent eyes", 7),
            ("媚眼", "seductive eyes", 6),
            ("睡眼惺忪", "sleepy eyes", 6),
        ];

        for (chinese, english, priority) in &eyes_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::Eyes,
                *priority,
                1.1,
                vec!["anime".to_string(), "eyes".to_string()],
            )?;
        }

        // 身材體型詞彙
        let body_vocab = vec![
            ("嬌小", "petite", 7),
            ("高挑", "tall", 7),
            ("苗條", "slender", 8),
            ("豐滿", "curvy", 7),
            ("運動型", "athletic", 7),
            ("肌肉發達", "muscular", 6),
            ("纖細", "slim", 8),
            ("圓潤", "chubby", 6),
            ("骨感", "skinny", 5),
            ("勻稱", "well-proportioned", 7),
        ];

        for (chinese, english, priority) in &body_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::BodyType,
                *priority,
                0.8, // 身材描述權重適中
                vec!["anime".to_string(), "body".to_string()],
            )?;
        }

        // 服裝類型詞彙
        let clothing_vocab = vec![
            ("校服", "school uniform", 9),
            ("水手服", "sailor uniform", 8),
            ("洋裝", "dress", 8),
            ("連身裙", "one-piece dress", 7),
            ("迷你裙", "mini skirt", 7),
            ("長裙", "long skirt", 7),
            ("牛仔裙", "denim skirt", 6),
            ("百褶裙", "pleated skirt", 7),
            ("襯衫", "shirt", 7),
            ("T恤", "t-shirt", 7),
            ("毛衣", "sweater", 7),
            ("外套", "jacket", 7),
            ("大衣", "coat", 6),
            ("和服", "kimono", 8),
            ("浴衣", "yukata", 7),
            ("女僕裝", "maid outfit", 7),
            ("護士服", "nurse outfit", 6),
            ("泳裝", "swimsuit", 7),
            ("比基尼", "bikini", 6),
            ("睡衣", "pajamas", 6),
            ("內衣", "underwear", 5),
            ("絲襪", "stockings", 7),
            ("過膝襪", "thigh-high socks", 7),
            ("短襪", "ankle socks", 6),
        ];

        for (chinese, english, priority) in &clothing_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::Clothing,
                *priority,
                1.0,
                vec!["anime".to_string(), "clothing".to_string()],
            )?;
        }

        // 配件飾品詞彙
        let accessories_vocab = vec![
            ("眼鏡", "glasses", 8),
            ("太陽眼鏡", "sunglasses", 6),
            ("耳環", "earrings", 7),
            ("項鍊", "necklace", 7),
            ("手鍊", "bracelet", 6),
            ("戒指", "ring", 6),
            ("髮飾", "hair accessory", 7),
            ("蝴蝶結", "bow", 8),
            ("髮夾", "hair clip", 7),
            ("頭帶", "headband", 7),
            ("帽子", "hat", 7),
            ("貝雷帽", "beret", 6),
            ("棒球帽", "baseball cap", 6),
            ("手套", "gloves", 6),
            ("圍巾", "scarf", 6),
            ("包包", "bag", 6),
            ("背包", "backpack", 6),
            ("手提包", "handbag", 6),
        ];

        for (chinese, english, priority) in &accessories_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::Accessories,
                *priority,
                0.7, // 配件權重較低
                vec!["anime".to_string(), "accessory".to_string()],
            )?;
        }

        // 表情情緒詞彙
        let expression_vocab = vec![
            ("微笑", "smile", 9),
            ("大笑", "laugh", 8),
            ("哭泣", "crying", 7),
            ("生氣", "angry", 7),
            ("害羞", "shy", 8),
            ("臉紅", "blushing", 8),
            ("驚訝", "surprised", 7),
            ("困惑", "confused", 6),
            ("傷心", "sad", 7),
            ("開心", "happy", 8),
            ("冷漠", "expressionless", 6),
            ("嚴肅", "serious", 7),
            ("溫柔", "gentle", 8),
            ("調皮", "mischievous", 7),
            ("無辜", "innocent", 7),
            ("得意", "smug", 6),
            ("害怕", "scared", 6),
            ("睡覺", "sleeping", 6),
        ];

        for (chinese, english, priority) in &expression_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::Expression,
                *priority,
                1.3, // 表情很重要，權重較高
                vec!["anime".to_string(), "expression".to_string()],
            )?;
        }

        // 藝術風格詞彙
        let style_vocab = vec![
            ("動漫風格", "anime style", 10),
            ("寫實風格", "realistic style", 8),
            ("卡通風格", "cartoon style", 7),
            ("水彩風格", "watercolor style", 7),
            ("油畫風格", "oil painting style", 6),
            ("素描風格", "sketch style", 6),
            ("賽璐璐風格", "cel shading", 8),
            ("像素風格", "pixel art", 5),
            ("漫畫風格", "manga style", 9),
            ("插畫風格", "illustration style", 8),
            ("高品質", "high quality", 9),
            ("精緻", "detailed", 8),
            ("柔和光線", "soft lighting", 7),
            ("戲劇性光線", "dramatic lighting", 6),
            ("暖色調", "warm colors", 7),
            ("冷色調", "cool colors", 6),
            ("鮮豔色彩", "vibrant colors", 7),
            ("柔和色彩", "pastel colors", 7),
        ];

        for (chinese, english, priority) in &style_vocab {
            self.add_builtin_entry(
                chinese,
                english,
                VocabularyCategory::ArtStyle,
                *priority,
                0.9, // 風格權重適中
                vec!["style".to_string(), "quality".to_string()],
            )?;
        }

        log::info!("[VocabularyDatabase] 內建詞彙庫載入完成，共載入約 {} 個詞彙條目", 
                   facial_vocab.len() + hair_vocab.len() + eyes_vocab.len() + 
                   body_vocab.len() + clothing_vocab.len() + accessories_vocab.len() + 
                   expression_vocab.len() + style_vocab.len());

        Ok(())
    }

    /// 添加內建詞彙條目
    fn add_builtin_entry(
        &self,
        chinese_term: &str,
        english_term: &str,
        category: VocabularyCategory,
        priority: i32,
        weight: f64,
        context_tags: Vec<String>,
    ) -> Result<()> {
        // 檢查是否已存在
        if self.term_exists(chinese_term, &category)? {
            return Ok(());
        }

        let entry = VocabularyEntry {
            id: 0, // 由資料庫自動分配
            chinese_term: chinese_term.to_string(),
            english_term: english_term.to_string(),
            category,
            subcategory: None,
            priority,
            usage_weight: weight,
            context_tags,
            style_tags: vec!["anime".to_string()],
            gender_specific: None,
            age_appropriate: None,
            synonyms: Vec::new(),
            variations: Vec::new(),
            usage_count: 0,
            success_rate: 1.0,
            last_used_at: None,
            source: VocabularySource::Builtin,
            verified: true,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        self.insert_vocabulary_entry(&entry)?;
        Ok(())
    }

    /// 檢查詞彙是否已存在
    fn term_exists(&self, chinese_term: &str, category: &VocabularyCategory) -> Result<bool> {
        let conn = self.db_connection.lock()
            .map_err(|e| TranslationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let category_str = serde_json::to_string(category)?;
        
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM vocabulary_entries WHERE chinese_term = ?1 AND category = ?2",
            params![chinese_term, category_str],
            |row| row.get(0)
        )?;

        Ok(count > 0)
    }

    /// 插入詞彙條目到資料庫
    fn insert_vocabulary_entry(&self, entry: &VocabularyEntry) -> Result<i64> {
        let conn = self.db_connection.lock()
            .map_err(|e| TranslationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let category_json = serde_json::to_string(&entry.category)?;
        let context_tags_json = serde_json::to_string(&entry.context_tags)?;
        let style_tags_json = serde_json::to_string(&entry.style_tags)?;
        let gender_json = serde_json::to_string(&entry.gender_specific)?;
        let age_json = serde_json::to_string(&entry.age_appropriate)?;
        let synonyms_json = serde_json::to_string(&entry.synonyms)?;
        let variations_json = serde_json::to_string(&entry.variations)?;
        let source_json = serde_json::to_string(&entry.source)?;

        let _id = conn.execute(
            "INSERT INTO vocabulary_entries 
             (chinese_term, english_term, category, subcategory, priority, usage_weight,
              context_tags, style_tags, gender_specific, age_appropriate, 
              synonyms, variations, usage_count, success_rate, last_used_at,
              source, verified, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            params![
                entry.chinese_term,
                entry.english_term,
                category_json,
                entry.subcategory,
                entry.priority,
                entry.usage_weight,
                context_tags_json,
                style_tags_json,
                gender_json,
                age_json,
                synonyms_json,
                variations_json,
                entry.usage_count,
                entry.success_rate,
                entry.last_used_at,
                source_json,
                entry.verified,
                entry.created_at,
                entry.updated_at
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// 根據中文詞彙搜尋英文翻譯
    pub fn find_translation(&self, chinese_term: &str, category: Option<VocabularyCategory>) -> Result<Vec<VocabularyEntry>> {
        let conn = self.db_connection.lock()
            .map_err(|e| TranslationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let mut entries = Vec::new();

        if let Some(cat) = &category {
            let category_json = serde_json::to_string(cat)?;
            let mut stmt = conn.prepare(
                "SELECT * FROM vocabulary_entries 
                 WHERE chinese_term = ?1 AND category = ?2 
                 ORDER BY priority DESC, usage_count DESC"
            )?;
            
            let rows = stmt.query_map(params![chinese_term, category_json], |row| {
                self.row_to_vocabulary_entry(row)
            })?;
            
            for row in rows {
                entries.push(row?);
            }
        } else {
            let mut stmt = conn.prepare(
                "SELECT * FROM vocabulary_entries 
                 WHERE chinese_term = ?1 
                 ORDER BY priority DESC, usage_count DESC"
            )?;
            
            let rows = stmt.query_map(params![chinese_term], |row| {
                self.row_to_vocabulary_entry(row)
            })?;
            
            for row in rows {
                entries.push(row?);
            }
        }

        Ok(entries)
    }

    /// 模糊搜尋詞彙
    pub fn fuzzy_search(&self, chinese_term: &str, limit: Option<i32>) -> Result<Vec<VocabularyEntry>> {
        let conn = self.db_connection.lock()
            .map_err(|e| TranslationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let search_limit = limit.unwrap_or(20);
        
        let mut stmt = conn.prepare(
            "SELECT * FROM vocabulary_entries 
             WHERE chinese_term LIKE ?1 
             ORDER BY priority DESC, usage_count DESC
             LIMIT ?2"
        )?;

        let search_pattern = format!("%{}%", chinese_term);
        let rows = stmt.query_map(params![search_pattern, search_limit], |row| {
            self.row_to_vocabulary_entry(row)
        })?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row?);
        }

        Ok(entries)
    }

    /// 將資料庫行轉換為詞彙條目
    fn row_to_vocabulary_entry(&self, row: &rusqlite::Row) -> rusqlite::Result<VocabularyEntry> {
        let category_json: String = row.get(3)?;
        let context_tags_json: String = row.get(7)?;
        let style_tags_json: String = row.get(8)?;
        let gender_json: String = row.get(9)?;
        let age_json: String = row.get(10)?;
        let synonyms_json: String = row.get(11)?;
        let variations_json: String = row.get(12)?;
        let source_json: String = row.get(17)?;

        Ok(VocabularyEntry {
            id: row.get(0)?,
            chinese_term: row.get(1)?,
            english_term: row.get(2)?,
            category: serde_json::from_str(&category_json).unwrap_or(VocabularyCategory::Other),
            subcategory: row.get(4)?,
            priority: row.get(5)?,
            usage_weight: row.get(6)?,
            context_tags: serde_json::from_str(&context_tags_json).unwrap_or_default(),
            style_tags: serde_json::from_str(&style_tags_json).unwrap_or_default(),
            gender_specific: serde_json::from_str(&gender_json).unwrap_or(None),
            age_appropriate: serde_json::from_str(&age_json).unwrap_or(None),
            synonyms: serde_json::from_str(&synonyms_json).unwrap_or_default(),
            variations: serde_json::from_str(&variations_json).unwrap_or_default(),
            usage_count: row.get(13).unwrap_or(0),
            success_rate: row.get(14).unwrap_or(1.0),
            last_used_at: row.get(15).ok(),
            source: serde_json::from_str(&source_json).unwrap_or(VocabularySource::Builtin),
            verified: row.get(18).unwrap_or(false),
            created_at: row.get(19)?,
            updated_at: row.get(20)?,
        })
    }

    /// 更新詞彙使用統計
    pub fn update_usage_stats(&self, entry_id: i64, success: bool) -> Result<()> {
        let conn = self.db_connection.lock()
            .map_err(|e| TranslationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let now = chrono::Utc::now().to_rfc3339();
        
        if success {
            conn.execute(
                "UPDATE vocabulary_entries 
                 SET usage_count = usage_count + 1, 
                     success_rate = (success_rate * usage_count + 1.0) / (usage_count + 1),
                     last_used_at = ?1,
                     updated_at = ?1
                 WHERE id = ?2",
                params![now, entry_id],
            )?;
        } else {
            conn.execute(
                "UPDATE vocabulary_entries 
                 SET usage_count = usage_count + 1,
                     success_rate = (success_rate * usage_count) / (usage_count + 1),
                     last_used_at = ?1,
                     updated_at = ?1
                 WHERE id = ?2",
                params![now, entry_id],
            )?;
        }

        Ok(())
    }

    /// 獲取詞彙統計資訊
    pub fn get_vocabulary_stats(&self) -> Result<VocabularyStats> {
        let conn = self.db_connection.lock()
            .map_err(|e| TranslationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let total_entries: i64 = conn.query_row(
            "SELECT COUNT(*) FROM vocabulary_entries",
            [],
            |row| row.get(0)
        )?;

        let verified_entries: i64 = conn.query_row(
            "SELECT COUNT(*) FROM vocabulary_entries WHERE verified = 1",
            [],
            |row| row.get(0)
        )?;

        let mut category_counts = HashMap::new();
        let mut stmt = conn.prepare(
            "SELECT category, COUNT(*) FROM vocabulary_entries GROUP BY category"
        )?;
        let rows = stmt.query_map([], |row| {
            let category_json: String = row.get(0)?;
            let count: i64 = row.get(1)?;
            Ok((category_json, count))
        })?;

        for row in rows {
            let (category_json, count) = row?;
            if let Ok(category) = serde_json::from_str::<VocabularyCategory>(&category_json) {
                category_counts.insert(category, count as u32);
            }
        }

        Ok(VocabularyStats {
            total_entries: total_entries as u32,
            verified_entries: verified_entries as u32,
            category_counts,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }
}

/// 詞彙庫統計資訊
#[derive(Debug, Serialize, Deserialize)]
pub struct VocabularyStats {
    pub total_entries: u32,
    pub verified_entries: u32,
    pub category_counts: HashMap<VocabularyCategory, u32>,
    pub last_updated: String,
}