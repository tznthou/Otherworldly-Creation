use anyhow::Result;
use rusqlite::{Connection, params};

const DB_VERSION: i32 = 8;

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