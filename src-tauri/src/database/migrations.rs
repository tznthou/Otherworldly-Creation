use anyhow::Result;
use rusqlite::{Connection, params};

const DB_VERSION: i32 = 15;

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
        
        if current_version < 12 {
            apply_migration_v12(conn)?;
            update_version(conn, 12)?;
            log::info!("遷移到版本 12 完成");
        }
        
        if current_version < 13 {
            apply_migration_v13(conn)?;
            update_version(conn, 13)?;
            log::info!("遷移到版本 13 完成");
        }
        
        if current_version < 14 {
            apply_migration_v14(conn)?;
            update_version(conn, 14)?;
            log::info!("遷移到版本 14 完成");
        }
        
        if current_version < 15 {
            apply_migration_v15(conn)?;
            update_version(conn, 15)?;
            log::info!("遷移到版本 15 完成");
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

/// 版本 12: Phase 3 AI插畫生成 - 角色視覺一致性系統
pub fn apply_migration_v12(conn: &Connection) -> Result<()> {
    log::info!("開始遷移到版本 12：Phase 3 AI插畫生成功能");
    
    // 1. 創建插畫生成記錄表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS illustration_generations (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            character_id TEXT,              -- 可選：如果是角色插畫
            
            -- 生成請求資訊
            scene_description TEXT NOT NULL,  -- 原始中文場景描述
            translated_prompt TEXT NOT NULL,  -- 翻譯後的英文提示詞
            prompt_template TEXT,            -- 使用的提示詞模板
            negative_prompt TEXT,            -- 負面提示詞
            
            -- 角色一致性參數
            seed_value INTEGER,              -- 用於保持一致性的種子值
            reference_image_url TEXT,        -- 參考圖像URL（如果使用）
            style_params TEXT,               -- JSON: 藝術風格參數
            
            -- 生成結果
            image_url TEXT,                  -- 生成圖像的存儲位置
            image_size TEXT,                 -- 圖像尺寸 (e.g., '512x512')
            image_format TEXT DEFAULT 'jpeg', -- 圖像格式
            file_size INTEGER,               -- 檔案大小（字節）
            
            -- API 調用資訊
            api_provider TEXT NOT NULL DEFAULT 'gemini', -- 'gemini', 'dalle', etc.
            api_model TEXT NOT NULL,         -- 使用的具體模型
            api_params TEXT,                 -- JSON: API 調用參數
            
            -- 生成統計
            generation_time_ms INTEGER,      -- 生成耗時（毫秒）
            api_cost REAL,                   -- API 調用成本
            retry_count INTEGER DEFAULT 0,   -- 重試次數
            
            -- 品質評估
            quality_score REAL,              -- AI評估的品質分數 (0-1)
            consistency_score REAL,          -- 與角色一致性分數 (0-1)
            user_rating INTEGER,             -- 用戶評分 (1-5)
            user_feedback TEXT,              -- 用戶反饋
            
            -- 使用狀態
            status TEXT DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
            error_message TEXT,              -- 錯誤訊息（如果失敗）
            is_favorite INTEGER DEFAULT 0,   -- 是否為收藏
            is_deleted INTEGER DEFAULT 0,    -- 軟刪除標記
            
            -- 批次資訊
            batch_id TEXT,                   -- 批次生成ID
            generation_index INTEGER,        -- 在批次中的索引
            
            -- 元數據
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            downloaded_at TIMESTAMP,         -- 首次下載時間
            
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE SET NULL
        )",
        [],
    )?;
    
    // 創建插畫生成記錄索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_project ON illustration_generations (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_character ON illustration_generations (character_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_status ON illustration_generations (status)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_created ON illustration_generations (created_at DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_batch ON illustration_generations (batch_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_seed ON illustration_generations (seed_value)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_quality ON illustration_generations (quality_score DESC)",
        [],
    )?;
    
    log::info!("插畫生成記錄表創建完成");
    
    // 2. 創建角色視覺特徵表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS character_visual_traits (
            character_id TEXT PRIMARY KEY,   -- 與角色表關聯
            
            -- 基礎視覺特徵
            seed_value INTEGER NOT NULL,     -- 專屬種子值（基於角色名稱生成）
            standard_description TEXT,       -- 標準化的角色外貌描述（英文）
            chinese_description TEXT,        -- 中文角色外貌描述
            
            -- 參考圖像系統
            reference_images TEXT,           -- JSON: 參考圖像URL列表
            primary_reference_url TEXT,      -- 主要參考圖像
            reference_tags TEXT,             -- JSON: 參考圖像標籤
            
            -- 藝術風格參數
            art_style_params TEXT NOT NULL, -- JSON: 藝術風格配置
            default_prompt_template TEXT,   -- 預設提示詞模板
            negative_prompt_template TEXT,   -- 預設負面提示詞模板
            
            -- 一致性控制
            consistency_mode TEXT DEFAULT 'seed_reference', -- 'seed', 'reference', 'seed_reference'
            tolerance_level REAL DEFAULT 0.8, -- 一致性容忍度 (0-1)
            
            -- 視覺特徵向量
            feature_vector TEXT,             -- JSON: 視覺特徵編碼
            dominant_colors TEXT,            -- JSON: 主要顏色配置
            facial_features TEXT,            -- JSON: 面部特徵描述
            clothing_style TEXT,             -- JSON: 服裝風格配置
            
            -- 生成統計
            generation_count INTEGER DEFAULT 0, -- 生成次數
            success_rate REAL DEFAULT 1.0,     -- 成功率
            avg_consistency_score REAL,        -- 平均一致性分數
            last_generation_at TIMESTAMP,      -- 最後生成時間
            
            -- 品質控制
            quality_threshold REAL DEFAULT 0.7, -- 品質閾值
            auto_enhance INTEGER DEFAULT 1,     -- 自動增強開關
            manual_review INTEGER DEFAULT 0,    -- 需要手動審核
            
            -- 版本控制
            traits_version TEXT DEFAULT '1.0',  -- 特徵版本
            last_updated_by TEXT,               -- 最後更新來源
            update_reason TEXT,                 -- 更新原因
            
            -- 元數據
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
        )",
        [],
    )?;
    
    // 創建角色視覺特徵索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_visual_traits_seed ON character_visual_traits (seed_value)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_visual_traits_consistency ON character_visual_traits (avg_consistency_score DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_visual_traits_generation_count ON character_visual_traits (generation_count DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_visual_traits_updated ON character_visual_traits (updated_at DESC)",
        [],
    )?;
    
    log::info!("角色視覺特徵表創建完成");
    
    // 3. 創建插畫風格模板表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS illustration_style_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,              -- 風格模板名稱
            description TEXT,                -- 風格描述
            
            -- 模板配置
            style_type TEXT NOT NULL,        -- 'anime', 'realistic', 'cartoon', 'fantasy', etc.
            prompt_template TEXT NOT NULL,   -- 提示詞模板
            negative_prompt TEXT,            -- 負面提示詞
            
            -- API 參數
            default_api_params TEXT,         -- JSON: 預設API參數
            recommended_models TEXT,         -- JSON: 推薦模型列表
            
            -- 適用範圍
            suitable_for TEXT,               -- JSON: 適用場景 ['character', 'scene', 'cover']
            genre_tags TEXT,                 -- JSON: 流派標籤
            
            -- 品質設定
            quality_preset TEXT DEFAULT 'balanced', -- 'speed', 'balanced', 'quality'
            resolution_options TEXT,        -- JSON: 支援解析度選項
            
            -- 元數據
            is_default INTEGER DEFAULT 0,   -- 是否為預設模板
            is_system INTEGER DEFAULT 1,    -- 是否為系統模板
            usage_count INTEGER DEFAULT 0,  -- 使用次數
            rating REAL DEFAULT 0.0,        -- 用戶評分
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // 創建風格模板索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_style_templates_type ON illustration_style_templates (style_type)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_style_templates_rating ON illustration_style_templates (rating DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_style_templates_usage ON illustration_style_templates (usage_count DESC)",
        [],
    )?;
    
    log::info!("插畫風格模板表創建完成");
    
    // 4. 插入預設風格模板
    let default_templates = vec![
        (
            "anime_character",
            "動漫角色風格",
            "anime",
            "anime style, detailed character art, clean lines, vibrant colors, {character_description}, high quality",
            "blurry, low quality, realistic photo, western cartoon, 3d render"
        ),
        (
            "light_novel_illustration",
            "輕小說插圖風格", 
            "anime",
            "light novel illustration style, detailed anime art, soft shading, beautiful character design, {character_description}, professional artwork",
            "blurry, low quality, photo realistic, sketch, unfinished"
        ),
        (
            "fantasy_scene",
            "奇幻場景風格",
            "fantasy", 
            "fantasy art style, detailed background, magical atmosphere, cinematic lighting, {scene_description}, concept art quality",
            "modern, contemporary, realistic photo, low quality, blur"
        )
    ];
    
    for (id, name, style_type, prompt_template, negative_prompt) in default_templates {
        conn.execute(
            "INSERT OR IGNORE INTO illustration_style_templates 
             (id, name, description, style_type, prompt_template, negative_prompt, 
              default_api_params, suitable_for, is_default, is_system) 
             VALUES (?1, ?2, ?2, ?3, ?4, ?5, 
                     '{\"aspectRatio\":\"1:1\",\"numberOfImages\":1}', 
                     '[\"character\",\"scene\"]', 1, 1)",
            params![id, name, style_type, prompt_template, negative_prompt],
        )?;
    }
    
    log::info!("預設插畫風格模板插入完成");
    
    // 5. 創建專案插畫設定表（專案級配置）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS project_illustration_settings (
            project_id TEXT PRIMARY KEY,
            
            -- 預設風格設定
            default_style_template_id TEXT,  -- 預設風格模板
            default_art_style TEXT DEFAULT 'anime', -- 預設藝術風格
            
            -- API 設定
            preferred_api_provider TEXT DEFAULT 'gemini',
            preferred_model TEXT,
            api_quota_limit INTEGER DEFAULT 100, -- 每日配額限制
            api_quota_used INTEGER DEFAULT 0,    -- 已使用配額
            quota_reset_date DATE,               -- 配額重置日期
            
            -- 一致性設定
            global_consistency_mode TEXT DEFAULT 'seed_reference',
            auto_seed_generation INTEGER DEFAULT 1, -- 自動生成種子
            character_consistency_required INTEGER DEFAULT 1, -- 需要角色一致性
            
            -- 品質控制
            min_quality_score REAL DEFAULT 0.6,  -- 最低品質要求
            auto_retry_failed INTEGER DEFAULT 1, -- 自動重試失敗生成
            max_retry_count INTEGER DEFAULT 3,   -- 最大重試次數
            
            -- 批次設定
            default_batch_size INTEGER DEFAULT 4, -- 預設批次大小
            parallel_generation INTEGER DEFAULT 1, -- 並行生成開關
            
            -- 存儲設定
            image_storage_path TEXT,             -- 圖像存儲路徑
            auto_cleanup_days INTEGER DEFAULT 30, -- 自動清理天數
            max_storage_size_mb INTEGER DEFAULT 1000, -- 最大存儲限制(MB)
            
            -- 元數據
            total_generations INTEGER DEFAULT 0, -- 總生成次數
            total_cost REAL DEFAULT 0.0,        -- 總花費
            last_generation_at TIMESTAMP,       -- 最後生成時間
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (default_style_template_id) REFERENCES illustration_style_templates (id) ON DELETE SET NULL
        )",
        [],
    )?;
    
    log::info!("專案插畫設定表創建完成");
    
    // 6. 為現有專案插入預設插畫設定
    conn.execute(
        "INSERT OR IGNORE INTO project_illustration_settings (project_id, default_style_template_id)
         SELECT id, 'light_novel_illustration' FROM projects",
        [],
    )?;
    
    log::info!("現有專案插畫設定初始化完成");
    log::info!("版本 12 遷移完成：Phase 3 AI插畫生成功能已準備就緒");
    
    Ok(())
}

/// 版本 13: 性能優化 - 添加數據庫索引
pub fn apply_migration_v13(conn: &Connection) -> Result<()> {
    log::info!("開始遷移到版本 13：資料庫性能優化");
    
    // === 核心表索引 ===
    
    // 專案查詢索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects (updated_at DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_projects_type ON projects (type)",
        [],
    )?;
    
    // 章節查詢索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters (project_id, order_index)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chapters_updated_at ON chapters (updated_at DESC)",
        [],
    )?;
    
    // 角色查詢索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters (project_id)",
        [],
    )?;
    // 移除不存在欄位的索引 - archetype 存儲在 attributes JSON 中
    
    // === AI 功能索引 ===
    
    // 角色分析索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_analysis_character_id ON character_analysis (character_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_character_analysis_analyzed_at ON character_analysis (analyzed_at DESC)",
        [],
    )?;
    
    // 插畫生成索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_project_id ON illustration_generations (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_character_id ON illustration_generations (character_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_status ON illustration_generations (status)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_illustration_generations_created_at ON illustration_generations (created_at DESC)",
        [],
    )?;
    
    // 複合索引用於常見查詢模式
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chapters_project_content ON chapters (project_id, content) WHERE content IS NOT NULL",
        [],
    )?;
    
    // AI 提供者配置索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled ON ai_providers (enabled)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON ai_providers (provider_type)",
        [],
    )?;
    
    // === 批量操作索引 ===
    
    // 批次生成任務索引 - 表格尚未實現，暫時跳過
    
    log::info!("版本 13 遷移完成：資料庫索引優化完成");
    
    Ok(())
}

/// 版本 14：添加章節 metadata 支援
pub fn apply_migration_v14(conn: &Connection) -> Result<()> {
    log::info!("執行版本 14 遷移：添加章節 metadata 支援");
    
    // 檢查 chapters 表是否已有 metadata 欄位
    let has_metadata: bool = conn
        .prepare("PRAGMA table_info(chapters)")?
        .query_map([], |row| {
            let column_name: String = row.get(1)?;
            Ok(column_name)
        })?
        .any(|result| match result {
            Ok(name) => name == "metadata",
            Err(_) => false,
        });
    
    if !has_metadata {
        log::info!("添加 metadata 欄位到 chapters 表");
        
        // 添加 metadata 欄位來儲存章節筆記和其他元數據
        conn.execute(
            "ALTER TABLE chapters ADD COLUMN metadata TEXT",
            [],
        )?;
        
        log::info!("成功添加 metadata 欄位");
    } else {
        log::info!("chapters 表已有 metadata 欄位，跳過添加");
    }
    
    // 創建 metadata 查詢索引（用於快速查找有筆記的章節）
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chapters_metadata ON chapters (metadata) WHERE metadata IS NOT NULL",
        [],
    )?;
    
    log::info!("版本 14 遷移完成：章節 metadata 支援已添加");
    
    Ok(())
}

/// 版本 15：添加 Pollinations.AI 免費插畫生成歷史記錄表
pub fn apply_migration_v15(conn: &Connection) -> Result<()> {
    log::info!("執行版本 15 遷移：添加 Pollinations.AI 免費插畫生成支援");
    
    // 創建 Pollinations 生成歷史記錄表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pollinations_generations (
            id TEXT PRIMARY KEY,
            project_id TEXT,                 -- 關聯專案（可選）
            character_id TEXT,               -- 關聯角色（可選）
            
            -- 生成請求資訊
            original_prompt TEXT NOT NULL,   -- 原始提示詞（中文/英文皆可）
            enhanced_prompt TEXT,            -- 風格增強後的提示詞
            negative_prompt TEXT,            -- 負面提示詞
            
            -- Pollinations 參數
            model TEXT NOT NULL DEFAULT 'flux', -- flux, gptimage, kontext, sdxl
            width INTEGER DEFAULT 1024,      -- 圖像寬度
            height INTEGER DEFAULT 1024,     -- 圖像高度
            seed INTEGER,                    -- 種子值（可重現結果）
            enhance BOOLEAN DEFAULT 0,       -- 是否增強提示詞
            style_applied TEXT,              -- 應用的風格（anime, realistic, fantasy等）
            
            -- 生成結果
            image_url TEXT,                  -- 原始 Pollinations API URL
            local_file_path TEXT,            -- 本地儲存路徑
            file_size_bytes INTEGER,         -- 檔案大小
            
            -- 生成統計
            generation_time_ms INTEGER,      -- 生成耗時（毫秒）
            
            -- 品質和用戶反饋
            user_rating INTEGER,             -- 用戶評分 (1-5)
            user_feedback TEXT,              -- 用戶反饋
            is_favorite BOOLEAN DEFAULT 0,   -- 是否收藏
            is_deleted BOOLEAN DEFAULT 0,    -- 軟刪除標記
            
            -- 使用狀態
            status TEXT DEFAULT 'completed', -- pending, processing, completed, failed
            error_message TEXT,              -- 錯誤訊息（如果失敗）
            retry_count INTEGER DEFAULT 0,   -- 重試次數
            
            -- 批次資訊
            batch_id TEXT,                   -- 批次生成ID（如果是批次操作）
            generation_index INTEGER,        -- 在批次中的索引
            
            -- 元數據
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            downloaded_at TIMESTAMP,         -- 首次下載時間
            last_accessed TIMESTAMP,         -- 最後訪問時間
            
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
            FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE SET NULL
        )",
        [],
    )?;
    
    // 創建 Pollinations 生成記錄索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_project ON pollinations_generations (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_character ON pollinations_generations (character_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_model ON pollinations_generations (model)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_status ON pollinations_generations (status)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_created ON pollinations_generations (created_at DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_batch ON pollinations_generations (batch_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_seed ON pollinations_generations (seed)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_rating ON pollinations_generations (user_rating DESC)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_favorites ON pollinations_generations (is_favorite DESC)",
        [],
    )?;
    
    log::info!("Pollinations 生成歷史記錄表和索引創建完成");
    
    // 創建 Pollinations 使用統計表（追蹤總體使用情況）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pollinations_usage_stats (
            id TEXT PRIMARY KEY DEFAULT 'singleton', -- 單例記錄
            
            -- 總體統計
            total_generations INTEGER DEFAULT 0,      -- 總生成次數
            total_success INTEGER DEFAULT 0,          -- 成功次數
            total_failures INTEGER DEFAULT 0,         -- 失敗次數
            
            -- 模型使用統計
            flux_usage INTEGER DEFAULT 0,             -- Flux 模型使用次數
            gptimage_usage INTEGER DEFAULT 0,         -- GPTImage 模型使用次數
            kontext_usage INTEGER DEFAULT 0,          -- Kontext 模型使用次數
            sdxl_usage INTEGER DEFAULT 0,             -- SDXL 模型使用次數
            
            -- 時間統計
            total_generation_time_ms INTEGER DEFAULT 0, -- 總耗時
            avg_generation_time_ms INTEGER DEFAULT 0,   -- 平均耗時
            
            -- 存儲統計
            total_images_stored INTEGER DEFAULT 0,      -- 總存儲圖片數
            total_storage_bytes INTEGER DEFAULT 0,      -- 總存儲大小
            
            -- 最後更新時間
            last_generation_at TIMESTAMP,              -- 最後生成時間
            daily_generation_count INTEGER DEFAULT 0,   -- 今日生成次數
            daily_reset_date DATE DEFAULT CURRENT_DATE, -- 每日計數重置日期
            
            -- 元數據
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // 插入初始統計記錄
    conn.execute(
        "INSERT OR IGNORE INTO pollinations_usage_stats (id) VALUES ('singleton')",
        [],
    )?;
    
    log::info!("Pollinations 使用統計表創建完成");
    
    // 創建自動清理任務表（管理舊圖像清理）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pollinations_cleanup_tasks (
            id TEXT PRIMARY KEY,
            task_type TEXT NOT NULL,         -- 'daily_cleanup', 'storage_limit', 'manual'
            
            -- 清理條件
            older_than_days INTEGER,         -- 清理多少天前的圖像
            max_storage_mb INTEGER,          -- 最大存儲限制
            
            -- 執行狀態
            status TEXT DEFAULT 'pending',   -- pending, running, completed, failed
            
            -- 清理結果
            files_deleted INTEGER DEFAULT 0, -- 刪除檔案數
            space_freed_bytes INTEGER DEFAULT 0, -- 釋放空間大小
            
            -- 執行時間
            scheduled_at TIMESTAMP,          -- 計劃執行時間
            started_at TIMESTAMP,            -- 開始執行時間
            completed_at TIMESTAMP,          -- 完成時間
            
            -- 錯誤處理
            error_message TEXT,              -- 錯誤訊息
            retry_count INTEGER DEFAULT 0,   -- 重試次數
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // 創建清理任務索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_cleanup_status ON pollinations_cleanup_tasks (status)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_pollinations_cleanup_scheduled ON pollinations_cleanup_tasks (scheduled_at)",
        [],
    )?;
    
    log::info!("Pollinations 清理任務表創建完成");
    log::info!("版本 15 遷移完成：Pollinations.AI 免費插畫生成功能已準備就緒");
    
    Ok(())
}