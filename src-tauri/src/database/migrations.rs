use anyhow::Result;
use rusqlite::Connection;

const DB_VERSION: i32 = 3;

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