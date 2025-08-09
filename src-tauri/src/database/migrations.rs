use anyhow::Result;
use rusqlite::{Connection, params};

const DB_VERSION: i32 = 11;

/// 執行資料庫遷移
pub fn run_migrations(conn: &Connection) -> Result<()> {
    // 建立版本表（如果不存在）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS db_version (
            version INTEGER PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // 獲取當前資料庫版本
    let current_version = get_current_version(conn)?;
    
    log::info!("當前資料庫版本: {}, 目標版本: {}", current_version, DB_VERSION);

    if current_version < DB_VERSION {
        log::info!("執行資料庫遷移...");
        
        if current_version < 1 {
            apply_migration_v1(conn)?;
            update_version(conn, 1)?;
            log::info!("遷移到版本 1 完成");
        }
        
        if current_version < 2 {
            apply_migration_v2(conn)?;
            update_version(conn, 2)?;
            log::info!("遷移到版本 2 完成");
        }
        
        if current_version < 3 {
            apply_migration_v3(conn)?;
            update_version(conn, 3)?;
            log::info!("遷移到版本 3 完成");
        }
        
        if current_version < 4 {
            apply_migration_v4(conn)?;
            update_version(conn, 4)?;
            log::info!("遷移到版本 4 完成");
        }
        
        if current_version < 5 {
            apply_migration_v5(conn)?;
            update_version(conn, 5)?;
            log::info!("遷移到版本 5 完成");
        }
        
        if current_version < 6 {
            apply_migration_v6(conn)?;
            update_version(conn, 6)?;
            log::info!("遷移到版本 6 完成");
        }
        
        if current_version < 7 {
            apply_migration_v7(conn)?;
            update_version(conn, 7)?;
            log::info!("遷移到版本 7 完成");
        }
        
        if current_version < 8 {
            apply_migration_v8(conn)?;
            update_version(conn, 8)?;
            log::info!("遷移到版本 8 完成");
        }
        
        if current_version < 9 {
            apply_migration_v9(conn)?;
            update_version(conn, 9)?;
            log::info!("遷移到版本 9 完成");
        }
        
        if current_version < 10 {
            apply_migration_v10(conn)?;
            update_version(conn, 10)?;
            log::info!("遷移到版本 10 完成");
        }
        
        if current_version < 11 {
            apply_migration_v11(conn)?;
            update_version(conn, 11)?;
            log::info!("遷移到版本 11 完成");
        }
        
        log::info!("資料庫遷移完成");
    } else {
        log::info!("資料庫已是最新版本");
    }

    Ok(())
}

/// 獲取當前資料庫版本
fn get_current_version(conn: &Connection) -> Result<i32> {
    match conn.prepare("SELECT version FROM db_version ORDER BY version DESC LIMIT 1") {
        Ok(mut stmt) => {
            match stmt.query_row([], |row| row.get::<_, i32>(0)) {
                Ok(version) => Ok(version),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0),
                Err(e) => Err(anyhow::anyhow!("查詢版本失敗: {}", e)),
            }
        }
        Err(e) => {
            // 如果表不存在，返回版本 0
            log::info!("db_version 表不存在，返回版本 0: {}", e);
            Ok(0)
        }
    }
}

/// 更新資料庫版本
fn update_version(conn: &Connection, version: i32) -> Result<()> {
    conn.execute(
        "INSERT INTO db_version (version) VALUES (?1)",
        [version],
    )?;
    Ok(())
}

/// 版本 1: 建立基本表格
fn apply_migration_v1(conn: &Connection) -> Result<()> {
    // 建立專案表
    conn.execute(
        "CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT,
            settings TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // 建立章節表
    conn.execute(
        "CREATE TABLE chapters (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // 建立角色表
    conn.execute(
        "CREATE TABLE characters (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            attributes TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // 建立角色關係表
    conn.execute(
        "CREATE TABLE character_relationships (
            id TEXT PRIMARY KEY,
            from_character_id TEXT NOT NULL,
            to_character_id TEXT NOT NULL,
            relationship_type TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_character_id) REFERENCES characters (id) ON DELETE CASCADE,
            FOREIGN KEY (to_character_id) REFERENCES characters (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // 建立設定表
    conn.execute(
        "CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // 建立索引
    conn.execute(
        "CREATE INDEX idx_chapters_project_id ON chapters (project_id)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_chapters_order ON chapters (project_id, order_index)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_characters_project_id ON characters (project_id)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_character_relationships_from ON character_relationships (from_character_id)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_character_relationships_to ON character_relationships (to_character_id)",
        [],
    )?;

    Ok(())
}

/// 版本 2: 新增或修改欄位 (如果需要的話)
fn apply_migration_v2(_conn: &Connection) -> Result<()> {
    // 如果需要新增欄位或修改結構，在這裡實現
    // 目前暫時空白，為未來的遷移預留
    
    log::info!("版本 2 遷移：暫無變更");
    Ok(())
}

/// 版本 3: 將 template_data 欄位重命名為 settings 以匹配 Electron 版本
fn apply_migration_v3(conn: &Connection) -> Result<()> {
    // 檢查是否有 template_data 欄位
    let has_template_data = conn.prepare("PRAGMA table_info(projects)")
        .and_then(|mut stmt| {
            let rows = stmt.query_map([], |row| {
                let col_name: String = row.get(1)?;
                Ok(col_name)
            })?;
            
            for row in rows {
                if let Ok(col_name) = row {
                    if col_name == "template_data" {
                        return Ok(true);
                    }
                }
            }
            Ok(false)
        })
        .unwrap_or(false);
    
    if has_template_data {
        log::info!("發現 template_data 欄位，開始遷移...");
        
        // 1. 創建新的專案表
        conn.execute(
            "CREATE TABLE projects_new (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT,
                settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // 2. 複製資料，將 template_data 重命名為 settings
        conn.execute(
            "INSERT INTO projects_new (id, name, description, type, settings, created_at, updated_at)
             SELECT id, name, description, type, template_data, created_at, updated_at FROM projects",
            [],
        )?;
        
        // 3. 刪除舊表
        conn.execute("DROP TABLE projects", [])?;
        
        // 4. 重命名新表
        conn.execute("ALTER TABLE projects_new RENAME TO projects", [])?;
        
        log::info!("template_data 欄位已成功重命名為 settings");
    } else {
        log::info!("版本 3 遷移：projects 表結構已是正確的");
    }
    
    Ok(())
}

/// 版本 4: 修復章節表的欄位名稱不匹配問題 (order_num -> order_index)
fn apply_migration_v4(conn: &Connection) -> Result<()> {
    // 檢查是否有 order_num 欄位
    let has_order_num = conn.prepare("PRAGMA table_info(chapters)")
        .and_then(|mut stmt| {
            let rows = stmt.query_map([], |row| {
                let col_name: String = row.get(1)?;
                Ok(col_name)
            })?;
            
            for row in rows {
                if let Ok(col_name) = row {
                    if col_name == "order_num" {
                        return Ok(true);
                    }
                }
            }
            Ok(false)
        })
        .unwrap_or(false);
    
    if has_order_num {
        log::info!("發現 order_num 欄位，開始修復章節表結構...");
        
        // 1. 創建新的章節表
        conn.execute(
            "CREATE TABLE chapters_new (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            )",
            [],
        )?;
        
        // 2. 複製資料，將 order_num 重命名為 order_index
        conn.execute(
            "INSERT INTO chapters_new (id, project_id, title, content, order_index, created_at, updated_at)
             SELECT id, project_id, title, content, order_num, created_at, updated_at FROM chapters",
            [],
        )?;
        
        // 3. 刪除舊表
        conn.execute("DROP TABLE chapters", [])?;
        
        // 4. 重命名新表
        conn.execute("ALTER TABLE chapters_new RENAME TO chapters", [])?;
        
        // 5. 重建索引
        conn.execute(
            "CREATE INDEX idx_chapters_project_id ON chapters (project_id)",
            [],
        )?;
        
        conn.execute(
            "CREATE INDEX idx_chapters_order ON chapters (project_id, order_index)",
            [],
        )?;
        
        log::info!("chapters 表欄位已成功從 order_num 重命名為 order_index");
    } else {
        log::info!("版本 4 遷移：chapters 表結構已是正確的");
    }
    
    Ok(())
}

/// 版本 5: 修復 characters 和 character_relationships 表結構以匹配 Tauri 模型
fn apply_migration_v5(conn: &Connection) -> Result<()> {
    log::info!("版本 5 遷移：修復 characters 和 character_relationships 表結構");
    
    // 1. 修復 characters 表
    log::info!("開始修復 characters 表結構...");
    
    // 備份現有資料
    let existing_characters: Vec<(String, String, String)> = conn
        .prepare("SELECT id, project_id, name FROM characters")?
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| anyhow::anyhow!("查詢現有角色失敗: {}", e))?;
    
    // 刪除舊表
    conn.execute("DROP TABLE IF EXISTS characters", [])?;
    
    // 創建新表（匹配 Tauri 模型）
    conn.execute(
        "CREATE TABLE characters (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            attributes TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 重建索引
    conn.execute(
        "CREATE INDEX idx_characters_project_id ON characters (project_id)",
        [],
    )?;
    
    // 恢復資料
    for (id, project_id, name) in existing_characters {
        conn.execute(
            "INSERT INTO characters (id, project_id, name) VALUES (?1, ?2, ?3)",
            params![id, project_id, name],
        )?;
    }
    
    log::info!("characters 表結構修復完成");
    
    // 2. 修復 character_relationships 表
    log::info!("開始修復 character_relationships 表結構...");
    
    // 檢查表是否存在，並備份現有關係資料（如果存在）
    let existing_relationships: Vec<(String, String, String, String, Option<String>)> = match conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='character_relationships'") {
        Ok(mut stmt) => {
            let tables: Result<Vec<String>, _> = stmt.query_map([], |row| {
                Ok(row.get::<_, String>(0)?)
            })?.collect();
            
            if tables.map_or(false, |t| !t.is_empty()) {
                // 表存在，嘗試備份資料
                match conn.prepare("SELECT id, source_id, target_id, type, description FROM character_relationships")
                    .or_else(|_| conn.prepare("SELECT id, from_character_id, to_character_id, relationship_type, description FROM character_relationships")) {
                    Ok(mut stmt) => {
                        stmt.query_map([], |row| {
                            Ok((
                                row.get::<_, String>(0)?,
                                row.get::<_, String>(1)?,
                                row.get::<_, String>(2)?,
                                row.get::<_, String>(3)?,
                                row.get::<_, Option<String>>(4)?,
                            ))
                        })?.collect::<Result<Vec<_>, _>>().unwrap_or_default()
                    },
                    Err(_) => {
                        log::warn!("無法讀取現有關係資料，將創建空表");
                        Vec::new()
                    }
                }
            } else {
                // 表不存在
                Vec::new()
            }
        },
        Err(_) => Vec::new()
    };
    
    // 刪除舊表
    conn.execute("DROP TABLE IF EXISTS character_relationships", [])?;
    
    // 創建新表（匹配 Tauri 模型）
    conn.execute(
        "CREATE TABLE character_relationships (
            id TEXT PRIMARY KEY,
            from_character_id TEXT NOT NULL,
            to_character_id TEXT NOT NULL,
            relationship_type TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_character_id) REFERENCES characters (id) ON DELETE CASCADE,
            FOREIGN KEY (to_character_id) REFERENCES characters (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 重建索引
    conn.execute(
        "CREATE INDEX idx_character_relationships_from ON character_relationships (from_character_id)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_character_relationships_to ON character_relationships (to_character_id)",
        [],
    )?;
    
    // 恢復資料（將 source_id/target_id 轉換為 from_character_id/to_character_id）
    for (id, source_id, target_id, rel_type, description) in existing_relationships {
        conn.execute(
            "INSERT INTO character_relationships (id, from_character_id, to_character_id, relationship_type, description) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, source_id, target_id, rel_type, description],
        )?;
    }
    
    log::info!("character_relationships 表結構修復完成");
    
    // 3. 刪除不需要的表
    conn.execute("DROP TABLE IF EXISTS character_abilities", [])?;
    conn.execute("DROP TABLE IF EXISTS templates", [])?;
    
    log::info!("版本 5 遷移完成：所有表結構已與 Tauri 模型同步");
    
    Ok(())
}

/// 版本 6: 確保 settings 表存在
fn apply_migration_v6(conn: &Connection) -> Result<()> {
    log::info!("版本 6 遷移：確保 settings 表存在");
    
    // 檢查 settings 表是否存在
    let table_exists = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")?
        .query_row([], |_| Ok(()))
        .is_ok();
    
    if !table_exists {
        log::info!("settings 表不存在，開始創建...");
        
        // 創建 settings 表
        conn.execute(
            "CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        log::info!("settings 表創建成功");
    } else {
        log::info!("settings 表已存在，跳過創建");
    }
    
    Ok(())
}

/// 版本 7: 新增 AI 生成歷史記錄表
fn apply_migration_v7(conn: &Connection) -> Result<()> {
    log::info!("版本 7 遷移：新增 AI 生成歷史記錄表");
    
    // 創建 AI 生成歷史記錄表
    conn.execute(
        "CREATE TABLE ai_generation_history (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            chapter_id TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt TEXT NOT NULL,
            generated_text TEXT NOT NULL,
            parameters TEXT, -- JSON string containing generation parameters
            language_purity REAL, -- 語言純度分數 (0-100)
            token_count INTEGER,
            generation_time_ms INTEGER,
            selected BOOLEAN DEFAULT 0, -- 是否被用戶選擇使用
            position INTEGER, -- 在章節中的位置
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 創建索引以提高查詢效能
    conn.execute(
        "CREATE INDEX idx_ai_history_project ON ai_generation_history (project_id)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_ai_history_chapter ON ai_generation_history (chapter_id)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_ai_history_created ON ai_generation_history (created_at DESC)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_ai_history_selected ON ai_generation_history (project_id, selected)",
        [],
    )?;
    
    log::info!("AI 生成歷史記錄表創建成功");
    
    Ok(())
}

/// 版本 8: 新增小說篇幅類型和章節編號功能
fn apply_migration_v8(conn: &Connection) -> Result<()> {
    log::info!("版本 8 遷移：新增小說篇幅類型和章節編號功能");
    
    // 1. 為 projects 表新增 novel_length 欄位
    conn.execute(
        "ALTER TABLE projects ADD COLUMN novel_length TEXT DEFAULT 'medium'",
        [],
    )?;
    log::info!("projects 表新增 novel_length 欄位成功");
    
    // 2. 為 chapters 表新增 chapter_number 欄位
    conn.execute(
        "ALTER TABLE chapters ADD COLUMN chapter_number INTEGER",
        [],
    )?;
    log::info!("chapters 表新增 chapter_number 欄位成功");
    
    // 3. 更新現有章節的 chapter_number（基於 order_index）
    conn.execute(
        "UPDATE chapters 
         SET chapter_number = order_index + 1 
         WHERE chapter_number IS NULL",
        [],
    )?;
    log::info!("更新現有章節編號成功");
    
    Ok(())
}

/// 版本 9: 新增多 AI 提供者支援
fn apply_migration_v9(conn: &Connection) -> Result<()> {
    log::info!("版本 9 遷移：新增多 AI 提供者支援");
    
    // 創建 AI 提供者設定表
    conn.execute(
        "CREATE TABLE ai_providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider_type TEXT NOT NULL, -- 'ollama', 'openai', 'gemini', 'claude', 'openrouter'
            api_key_encrypted TEXT, -- 加密後的 API 金鑰（Ollama 不需要）
            endpoint TEXT, -- API 端點（可自訂）
            model TEXT NOT NULL, -- 預設模型
            is_enabled BOOLEAN DEFAULT 1, -- 是否啟用
            settings_json TEXT, -- JSON 格式的額外設定
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    log::info!("ai_providers 表創建成功");
    
    // 創建索引
    conn.execute(
        "CREATE INDEX idx_ai_providers_type ON ai_providers (provider_type)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_ai_providers_enabled ON ai_providers (is_enabled)",
        [],
    )?;
    
    // 插入預設的 Ollama 提供者（向後相容）
    conn.execute(
        "INSERT INTO ai_providers (
            id, name, provider_type, endpoint, model, is_enabled, settings_json
        ) VALUES (
            'ollama-default', 'Ollama (本地)', 'ollama', 
            'http://127.0.0.1:11434', 'llama3.2', 1,
            '{\"temperature\":0.7,\"max_tokens\":2000,\"top_p\":0.9}'
        )",
        [],
    )?;
    log::info!("預設 Ollama 提供者設定完成");
    
    // 更新 AI 生成歷史表，添加 provider_id 欄位
    conn.execute(
        "ALTER TABLE ai_generation_history ADD COLUMN provider_id TEXT",
        [],
    )?;
    
    // 將現有歷史記錄關聯到預設的 Ollama 提供者
    conn.execute(
        "UPDATE ai_generation_history SET provider_id = 'ollama-default' WHERE provider_id IS NULL",
        [],
    )?;
    
    log::info!("AI 生成歷史表更新完成");
    
    Ok(())
}

/// 遷移到版本 10：添加 EPUB 導出記錄表
pub fn apply_migration_v10(conn: &Connection) -> Result<()> {
    log::info!("開始遷移到版本 10：添加 EPUB 導出功能支援");
    
    // 創建 EPUB 導出記錄表
    conn.execute(
        "CREATE TABLE epub_exports (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            chapter_count INTEGER NOT NULL,
            format_settings TEXT NOT NULL, -- JSON 字符串存儲格式選項
            export_status TEXT NOT NULL DEFAULT 'completed', -- completed, failed, processing
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            downloaded_at TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 創建索引提升查詢效能
    conn.execute(
        "CREATE INDEX idx_epub_exports_project_id ON epub_exports (project_id)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_epub_exports_created_at ON epub_exports (created_at DESC)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX idx_epub_exports_status ON epub_exports (export_status)",
        [],
    )?;
    
    log::info!("EPUB 導出記錄表和索引創建完成");
    
    Ok(())
}

/// 版本 11: Phase 2 進階 AI 功能 - 智能創作分析
pub fn apply_migration_v11(conn: &Connection) -> Result<()> {
    log::info!("開始遷移到版本 11：Phase 2 智能創作分析功能");
    
    // 1. 創建角色分析表 - 支援角色一致性檢查
    conn.execute(
        "CREATE TABLE IF NOT EXISTS character_analysis (
            id TEXT PRIMARY KEY,
            character_id TEXT NOT NULL,
            chapter_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            
            -- 對話分析數據
            dialogue_samples TEXT, -- JSON: 對話樣本集合
            dialogue_count INTEGER DEFAULT 0,
            avg_dialogue_length REAL DEFAULT 0.0,
            
            -- 五維人格特徵向量 (Big Five)
            openness REAL DEFAULT 0.5,           -- 開放性 (0-1)
            conscientiousness REAL DEFAULT 0.5,  -- 盡責性 (0-1)
            extraversion REAL DEFAULT 0.5,       -- 外向性 (0-1)
            agreeableness REAL DEFAULT 0.5,      -- 親和性 (0-1)
            neuroticism REAL DEFAULT 0.5,        -- 神經質 (0-1)
            
            -- 語言模式分析
            linguistic_patterns TEXT, -- JSON: n-gram 模式、常用詞彙等
            vocabulary_richness REAL DEFAULT 0.0, -- 詞彙豐富度
            sentence_complexity REAL DEFAULT 0.0, -- 句子複雜度
            
            -- 情感分析
            emotional_tone TEXT,       -- positive, negative, neutral, mixed
            emotional_intensity REAL DEFAULT 0.5, -- 情緒強度 (0-1)
            
            -- 行為模式
            action_patterns TEXT,      -- JSON: 行為描述集合
            behavior_consistency REAL DEFAULT 1.0, -- 行為一致性分數 (0-1)
            
            -- 元數據
            analysis_version TEXT DEFAULT '1.0',
            confidence_score REAL DEFAULT 0.0, -- 分析置信度 (0-1)
            analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
            FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 創建角色分析索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_analysis_character ON character_analysis (character_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_analysis_chapter ON character_analysis (chapter_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_analysis_project ON character_analysis (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_analysis_consistency ON character_analysis (behavior_consistency)",
        [],
    )?;
    
    // 2. 創建劇情分析表 - 支援劇情節奏和衝突點檢測
    conn.execute(
        "CREATE TABLE IF NOT EXISTS plot_analysis (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            chapter_id TEXT,
            
            -- 劇情衝突分析
            conflict_points TEXT,      -- JSON: 衝突點位置和強度
            tension_level REAL DEFAULT 0.5, -- 整體緊張度 (0-1)
            climax_detected INTEGER DEFAULT 0,
            
            -- 節奏分析
            pacing_score REAL DEFAULT 0.5, -- 節奏評分 (0-1)
            scene_density REAL DEFAULT 0.0, -- 場景密度
            dialogue_ratio REAL DEFAULT 0.0, -- 對話比例
            action_ratio REAL DEFAULT 0.0,   -- 動作描述比例
            description_ratio REAL DEFAULT 0.0, -- 環境描述比例
            
            -- 伏筆追蹤
            foreshadowing_elements TEXT, -- JSON: 伏筆元素列表
            plot_threads TEXT,           -- JSON: 情節線索
            unresolved_threads INTEGER DEFAULT 0, -- 未解決線索數
            
            -- 情緒曲線
            emotional_arc TEXT,          -- JSON: 章節情緒變化數據
            emotional_peaks INTEGER DEFAULT 0, -- 情緒高峰數
            emotional_valleys INTEGER DEFAULT 0, -- 情緒低谷數
            
            -- 章節統計
            word_count INTEGER DEFAULT 0,
            paragraph_count INTEGER DEFAULT 0,
            sentence_count INTEGER DEFAULT 0,
            avg_sentence_length REAL DEFAULT 0.0,
            
            -- AI 分析元數據
            ai_provider TEXT,
            ai_model TEXT,
            analysis_prompt TEXT,        -- 使用的分析提示詞
            
            -- 元數據
            summary TEXT,                -- 分析摘要
            suggestions TEXT,             -- JSON: 改進建議
            confidence_score REAL DEFAULT 0.0,
            processing_time INTEGER,      -- 處理時間（毫秒）
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE SET NULL
        )",
        [],
    )?;
    
    // 創建劇情分析索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plot_analysis_project ON plot_analysis (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plot_analysis_chapter ON plot_analysis (chapter_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plot_analysis_tension ON plot_analysis (tension_level DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plot_analysis_created ON plot_analysis (created_at DESC)",
        [],
    )?;
    
    // 3. 創建創意建議表 - 支援 AI 生成的創意建議
    conn.execute(
        "CREATE TABLE IF NOT EXISTS creative_suggestions (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            chapter_id TEXT,
            target_type TEXT NOT NULL, -- 'plot', 'character', 'dialogue', 'scene', 'general'
            target_id TEXT,             -- 可選：具體目標的 ID
            
            -- 建議內容
            suggestion_type TEXT NOT NULL, -- 'continuation', 'alternative', 'enhancement', 'conflict', 'resolution'
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            context TEXT,                -- 建議的上下文
            
            -- 建議評分
            relevance_score REAL DEFAULT 0.0,    -- 相關性評分 (0-1)
            creativity_score REAL DEFAULT 0.0,   -- 創意性評分 (0-1)
            quality_score REAL DEFAULT 0.0,      -- 品質評分 (0-1)
            
            -- AI 生成資訊
            ai_provider TEXT NOT NULL,
            ai_model TEXT NOT NULL,
            generation_params TEXT,       -- JSON: 生成參數
            prompt_used TEXT,
            
            -- 用戶互動
            status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'modified'
            user_rating INTEGER,          -- 1-5 星評分
            user_feedback TEXT,
            applied_at TIMESTAMP,
            
            -- 多模型投票（如果使用多個 AI）
            votes TEXT,                   -- JSON: 各模型的投票結果
            consensus_score REAL DEFAULT 0.0, -- 共識分數 (0-1)
            
            -- 元數據
            processing_time INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE SET NULL
        )",
        [],
    )?;
    
    // 創建創意建議索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_creative_suggestions_project ON creative_suggestions (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_creative_suggestions_chapter ON creative_suggestions (chapter_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_creative_suggestions_type ON creative_suggestions (target_type, suggestion_type)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_creative_suggestions_status ON creative_suggestions (status)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_creative_suggestions_quality ON creative_suggestions (quality_score DESC)",
        [],
    )?;
    
    // 4. 創建分析快取表 - 提升性能
    conn.execute(
        "CREATE TABLE IF NOT EXISTS analysis_cache (
            id TEXT PRIMARY KEY,
            cache_key TEXT UNIQUE NOT NULL, -- 快取鍵：project_id + analysis_type + target_id + version
            analysis_type TEXT NOT NULL,    -- 'character', 'plot', 'creative'
            project_id TEXT NOT NULL,
            target_id TEXT,
            
            -- 快取數據
            cached_data TEXT NOT NULL,       -- JSON: 完整分析結果
            data_hash TEXT NOT NULL,         -- 數據雜湊值，用於驗證
            
            -- 快取管理
            hit_count INTEGER DEFAULT 0,     -- 命中次數
            last_accessed TIMESTAMP,
            expires_at TIMESTAMP,            -- 過期時間
            is_valid INTEGER DEFAULT 1,
            
            -- 元數據
            cache_size INTEGER,              -- 快取大小（字節）
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 創建分析快取索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_analysis_cache_key ON analysis_cache (cache_key)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_analysis_cache_project ON analysis_cache (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_cache (expires_at)",
        [],
    )?;
    
    // 5. 創建分析任務隊列表 - 支援背景分析
    conn.execute(
        "CREATE TABLE IF NOT EXISTS analysis_queue (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            analysis_type TEXT NOT NULL,     -- 'character', 'plot', 'creative', 'full'
            target_id TEXT,
            priority INTEGER DEFAULT 5,      -- 1-10，10 最高優先級
            
            -- 任務狀態
            status TEXT DEFAULT 'pending',   -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
            progress REAL DEFAULT 0.0,        -- 進度 (0-1)
            current_step TEXT,                -- 當前處理步驟
            
            -- 任務參數
            params TEXT,                      -- JSON: 分析參數
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            
            -- 結果和錯誤
            result_id TEXT,                   -- 完成後的結果 ID
            error_message TEXT,
            error_details TEXT,               -- JSON: 詳細錯誤資訊
            
            -- 時間追蹤
            queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            estimated_completion TIMESTAMP,
            
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 創建分析隊列索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue (status, priority DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_analysis_queue_project ON analysis_queue (project_id)",
        [],
    )?;
    
    log::info!("Phase 2 資料表創建完成");
    
    // 6. 插入預設分析模板
    let analysis_templates = vec![
        ("character_consistency", "角色一致性分析", r#"{"personality_weight": 0.3, "dialogue_weight": 0.3, "behavior_weight": 0.4}"#),
        ("plot_pacing", "劇情節奏分析", r#"{"ideal_tension_curve": "rising", "min_conflict_points": 3, "max_description_ratio": 0.3}"#),
        ("creative_continuation", "創意續寫", r#"{"style_match": true, "surprise_factor": 0.3, "coherence_weight": 0.7}"#),
    ];
    
    // 創建分析模板表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS analysis_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            template_type TEXT NOT NULL,
            config TEXT NOT NULL,        -- JSON: 模板配置
            is_default INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    for (id, name, config) in analysis_templates {
        conn.execute(
            "INSERT OR IGNORE INTO analysis_templates (id, name, template_type, config, is_default) 
             VALUES (?1, ?2, ?3, ?4, 1)",
            params![id, name, id.split('_').next().unwrap_or("general"), config],
        )?;
    }
    
    log::info!("預設分析模板插入完成");
    log::info!("版本 11 遷移完成：Phase 2 智能創作分析功能已準備就緒");
    
    Ok(())
}