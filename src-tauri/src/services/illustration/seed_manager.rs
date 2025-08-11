use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use super::{Result, IllustrationError};

/// Seed 管理器 - 負責角色一致性的核心機制
/// 
/// 功能：
/// 1. 為每個角色生成唯一且穩定的 seed 值
/// 2. 管理 seed 值的持久化存儲
/// 3. 提供 seed 相關的驗證和查詢功能
/// 4. 支援手動覆蓋和自動生成
pub struct SeedManager {
    db_connection: std::sync::Arc<std::sync::Mutex<Connection>>,
}

/// Seed 資訊結構
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedInfo {
    pub character_id: String,
    pub seed_value: u32,
    pub generation_source: SeedSource,
    pub created_at: String,
    pub usage_count: u32,
    pub last_used_at: Option<String>,
}

/// Seed 來源類型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SeedSource {
    /// 基於角色名稱自動生成
    NameHash,
    /// 基於角色描述生成
    DescriptionHash,
    /// 用戶手動設定
    Manual,
    /// 基於成功圖像的反推
    ImageBased,
    /// 系統隨機生成
    Random,
}

impl SeedManager {
    /// 創建新的 Seed 管理器實例
    pub fn new(db_connection: std::sync::Arc<std::sync::Mutex<Connection>>) -> Self {
        Self { db_connection }
    }

    /// 為角色獲取或生成 seed 值
    /// 
    /// 邏輯：
    /// 1. 首先檢查資料庫中是否已有該角色的 seed
    /// 2. 如果沒有，基於角色名稱生成新的 seed
    /// 3. 將新 seed 保存到資料庫
    pub fn get_or_create_seed(&self, character_id: &str, character_name: &str) -> Result<u32> {
        // 首先嘗試從資料庫獲取現有的 seed
        if let Some(seed_info) = self.get_seed_info(character_id)? {
            // 更新使用次數和最後使用時間
            self.update_seed_usage(&character_id, seed_info.usage_count + 1)?;
            log::info!("[SeedManager] 使用現有 seed: {} for character: {}", seed_info.seed_value, character_name);
            return Ok(seed_info.seed_value);
        }

        // 如果沒有現有 seed，基於角色名稱生成新的
        let seed_value = self.generate_seed_from_name(character_name);
        
        // 保存到資料庫
        self.save_seed_info(&SeedInfo {
            character_id: character_id.to_string(),
            seed_value,
            generation_source: SeedSource::NameHash,
            created_at: chrono::Utc::now().to_rfc3339(),
            usage_count: 1,
            last_used_at: Some(chrono::Utc::now().to_rfc3339()),
        })?;

        log::info!("[SeedManager] 生成新 seed: {} for character: {} (基於名稱雜湊)", seed_value, character_name);
        Ok(seed_value)
    }

    /// 基於角色名稱生成確定性的 seed 值
    /// 
    /// 使用 Rust 的 DefaultHasher 確保：
    /// 1. 相同的角色名稱總是生成相同的 seed
    /// 2. 不同的角色名稱生成不同的 seed
    /// 3. seed 值在 u32 範圍內，適合 AI API
    fn generate_seed_from_name(&self, character_name: &str) -> u32 {
        let mut hasher = DefaultHasher::new();
        
        // 添加前缀增加唯一性
        "genesis_chronicle_character".hash(&mut hasher);
        character_name.hash(&mut hasher);
        
        let hash_result = hasher.finish();
        
        // 將 u64 雜湊值轉為 u32，確保正數範圍
        (hash_result % u32::MAX as u64) as u32
    }

    /// 基於角色描述生成 seed（更詳細的方法）
    #[allow(dead_code)]
    pub fn generate_seed_from_description(&self, character_name: &str, description: &str) -> u32 {
        let mut hasher = DefaultHasher::new();
        
        "genesis_chronicle_description".hash(&mut hasher);
        character_name.hash(&mut hasher);
        
        // 清理和標準化描述文本
        let cleaned_description = self.normalize_description(description);
        cleaned_description.hash(&mut hasher);
        
        let hash_result = hasher.finish();
        (hash_result % u32::MAX as u64) as u32
    }

    /// 標準化描述文本以確保一致的雜湊
    #[allow(dead_code)]
    fn normalize_description(&self, description: &str) -> String {
        description
            .to_lowercase()
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// 手動設定角色的 seed 值
    pub fn set_manual_seed(&self, character_id: &str, seed_value: u32, reason: &str) -> Result<()> {
        let seed_info = SeedInfo {
            character_id: character_id.to_string(),
            seed_value,
            generation_source: SeedSource::Manual,
            created_at: chrono::Utc::now().to_rfc3339(),
            usage_count: 0,
            last_used_at: None,
        };

        self.save_seed_info(&seed_info)?;
        log::info!("[SeedManager] 手動設定 seed: {} for character: {} (原因: {})", seed_value, character_id, reason);
        Ok(())
    }

    /// 從資料庫獲取角色的 seed 資訊
    pub fn get_seed_info(&self, character_id: &str) -> Result<Option<SeedInfo>> {
        let conn = self.db_connection.lock()
            .map_err(|e| IllustrationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let mut stmt = conn.prepare(
            "SELECT character_id, seed_value, generation_count, success_rate, 
                    art_style_params, created_at, updated_at
             FROM character_visual_traits 
             WHERE character_id = ?1"
        )?;

        match stmt.query_row([character_id], |row| {
            Ok(SeedInfo {
                character_id: row.get(0)?,
                seed_value: row.get(1)?,
                generation_source: SeedSource::NameHash, // 從資料庫讀取時預設為 NameHash
                created_at: row.get(5)?,
                usage_count: row.get(2).unwrap_or(0),
                last_used_at: row.get(6).ok(),
            })
        }) {
            Ok(seed_info) => Ok(Some(seed_info)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(IllustrationError::Database(e)),
        }
    }

    /// 保存 seed 資訊到資料庫
    fn save_seed_info(&self, seed_info: &SeedInfo) -> Result<()> {
        let conn = self.db_connection.lock()
            .map_err(|e| IllustrationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        // 使用 character_visual_traits 表存儲 seed 資訊
        conn.execute(
            "INSERT OR REPLACE INTO character_visual_traits 
             (character_id, seed_value, art_style_params, generation_count, success_rate,
              created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                seed_info.character_id,
                seed_info.seed_value as i32, // SQLite 使用 i32
                "{}".to_string(), // 預設空的藝術風格參數
                seed_info.usage_count as i32,
                1.0, // 預設成功率
                seed_info.created_at,
                chrono::Utc::now().to_rfc3339()
            ],
        )?;

        Ok(())
    }

    /// 更新 seed 的使用統計
    fn update_seed_usage(&self, character_id: &str, new_usage_count: u32) -> Result<()> {
        let conn = self.db_connection.lock()
            .map_err(|e| IllustrationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        conn.execute(
            "UPDATE character_visual_traits 
             SET generation_count = ?1, last_generation_at = ?2, updated_at = ?3
             WHERE character_id = ?4",
            params![
                new_usage_count as i32,
                chrono::Utc::now().to_rfc3339(),
                chrono::Utc::now().to_rfc3339(),
                character_id
            ],
        )?;

        Ok(())
    }

    /// 獲取專案中所有角色的 seed 資訊（用於批次操作）
    pub fn get_project_seeds(&self, project_id: &str) -> Result<Vec<SeedInfo>> {
        let conn = self.db_connection.lock()
            .map_err(|e| IllustrationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let mut stmt = conn.prepare(
            "SELECT cvt.character_id, cvt.seed_value, cvt.generation_count, 
                    cvt.created_at, cvt.updated_at
             FROM character_visual_traits cvt
             INNER JOIN characters c ON cvt.character_id = c.id
             WHERE c.project_id = ?1"
        )?;

        let seed_iter = stmt.query_map([project_id], |row| {
            Ok(SeedInfo {
                character_id: row.get(0)?,
                seed_value: row.get(1)?,
                generation_source: SeedSource::NameHash,
                created_at: row.get(3)?,
                usage_count: row.get(2).unwrap_or(0),
                last_used_at: row.get(4).ok(),
            })
        })?;

        let mut seeds = Vec::new();
        for seed in seed_iter {
            seeds.push(seed?);
        }

        Ok(seeds)
    }

    /// 驗證 seed 值的有效性
    #[allow(dead_code)]
    pub fn validate_seed(&self, seed_value: u32) -> bool {
        // 基本驗證：確保 seed 在合理範圍內
        seed_value > 0 && seed_value < u32::MAX
    }

    /// 生成批次 seed 值（用於批次生成相似但略有不同的圖像）
    pub fn generate_batch_seeds(&self, base_seed: u32, count: u32) -> Vec<u32> {
        let mut seeds = Vec::new();
        
        for i in 0..count {
            // 基於基礎 seed 和索引生成變體
            let variant_seed = base_seed.wrapping_add(i * 1000); // 增加足夠的間隔避免相似性過高
            seeds.push(variant_seed);
        }

        seeds
    }

    /// 清理未使用的 seed 記錄（維護功能）
    #[allow(dead_code)]
    pub fn cleanup_unused_seeds(&self, days_threshold: i64) -> Result<usize> {
        let conn = self.db_connection.lock()
            .map_err(|e| IllustrationError::Unknown(format!("資料庫鎖定失敗: {}", e)))?;

        let cutoff_date = chrono::Utc::now() - chrono::Duration::days(days_threshold);
        
        let deleted_count = conn.execute(
            "DELETE FROM character_visual_traits 
             WHERE generation_count = 0 AND created_at < ?1",
            [cutoff_date.to_rfc3339()],
        )?;

        if deleted_count > 0 {
            log::info!("[SeedManager] 清理了 {} 個未使用的 seed 記錄", deleted_count);
        }

        Ok(deleted_count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::sync::{Arc, Mutex};

    fn create_test_db() -> Arc<Mutex<Connection>> {
        let conn = Connection::open_in_memory().unwrap();
        
        // 創建測試用的表格結構（簡化版）
        conn.execute(
            "CREATE TABLE character_visual_traits (
                character_id TEXT PRIMARY KEY,
                seed_value INTEGER NOT NULL,
                art_style_params TEXT NOT NULL,
                generation_count INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        ).unwrap();

        Arc::new(Mutex::new(conn))
    }

    #[test]
    fn test_seed_generation_consistency() {
        let db = create_test_db();
        let seed_manager = SeedManager::new(db);

        let name = "小雨";
        let seed1 = seed_manager.generate_seed_from_name(name);
        let seed2 = seed_manager.generate_seed_from_name(name);

        // 相同名稱應該產生相同的 seed
        assert_eq!(seed1, seed2);

        // 不同名稱應該產生不同的 seed
        let seed3 = seed_manager.generate_seed_from_name("小櫻");
        assert_ne!(seed1, seed3);
    }

    #[test]
    fn test_seed_validation() {
        let db = create_test_db();
        let seed_manager = SeedManager::new(db);

        assert!(seed_manager.validate_seed(12345));
        assert!(seed_manager.validate_seed(1));
        assert!(!seed_manager.validate_seed(0)); // 0 無效
        assert!(!seed_manager.validate_seed(u32::MAX)); // 最大值無效
    }

    #[test]
    fn test_batch_seed_generation() {
        let db = create_test_db();
        let seed_manager = SeedManager::new(db);

        let base_seed = 12345;
        let batch_seeds = seed_manager.generate_batch_seeds(base_seed, 4);

        assert_eq!(batch_seeds.len(), 4);
        
        // 每個 seed 都應該不同
        for i in 0..batch_seeds.len() {
            for j in i+1..batch_seeds.len() {
                assert_ne!(batch_seeds[i], batch_seeds[j]);
            }
        }
    }
}