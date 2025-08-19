use crate::database::{get_db, models::*};
use anyhow::Result;
use chrono::Utc;
use rusqlite::params;
use uuid::Uuid;

#[tauri::command]
pub async fn get_chapters_by_project_id(project_id: String) -> Result<Vec<Chapter>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT id, project_id, title, content, order_index, chapter_number, metadata, created_at, updated_at 
                  FROM chapters WHERE project_id = ?1 ORDER BY order_index ASC")
        .map_err(|e| e.to_string())?;
    
    let chapter_iter = stmt
        .query_map([project_id], |row| {
            Ok(Chapter {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                order_index: row.get(4)?,
                chapter_number: row.get(5)?,
                metadata: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut chapters = Vec::new();
    for chapter in chapter_iter {
        chapters.push(chapter.map_err(|e| e.to_string())?);
    }
    
    Ok(chapters)
}

#[tauri::command]
pub async fn get_chapter_by_id(id: String) -> Result<Chapter, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT id, project_id, title, content, order_index, chapter_number, metadata, created_at, updated_at 
                  FROM chapters WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let chapter = stmt
        .query_row([id], |row| {
            Ok(Chapter {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                order_index: row.get(4)?,
                chapter_number: row.get(5)?,
                metadata: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("章節不存在: {}", e))?;
    
    Ok(chapter)
}

#[tauri::command]
pub async fn create_chapter(chapter: CreateChapterRequest) -> Result<String, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let chapter_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    // 如果沒有指定 order_index，則設為最大值 + 1
    let order_index = if let Some(order) = chapter.order_index {
        order
    } else {
        let max_order: i32 = conn
            .prepare("SELECT COALESCE(MAX(order_index), 0) FROM chapters WHERE project_id = ?1")
            .map_err(|e| e.to_string())?
            .query_row([&chapter.project_id], |row| row.get(0))
            .unwrap_or(0);
        max_order + 1
    };
    
    // 計算章節編號
    let chapter_number = if let Some(num) = chapter.chapter_number {
        num
    } else {
        order_index
    };
    
    // 設置預設的章節內容
    let default_content = r#"[{"type":"paragraph","children":[{"text":""}]}]"#.to_string();
    let content = chapter.content.as_ref().unwrap_or(&default_content);
    
    conn.execute(
        "INSERT INTO chapters (id, project_id, title, content, order_index, chapter_number, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            chapter_id,
            chapter.project_id,
            chapter.title,
            content,
            order_index,
            chapter_number,
            now,
            now
        ],
    )
    .map_err(|e| format!("建立章節失敗: {}", e))?;
    
    log::info!("建立章節成功: {} (ID: {})", chapter.title, chapter_id);
    Ok(chapter_id)
}

#[tauri::command]
pub async fn update_chapter(chapter: UpdateChapterRequest) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let now = Utc::now();
    
    // 先獲取章節的 project_id，用於後續更新父專案的時間戳
    let project_id: String = conn
        .prepare("SELECT project_id FROM chapters WHERE id = ?1")
        .map_err(|e| e.to_string())?
        .query_row([&chapter.id], |row| row.get(0))
        .map_err(|e| format!("章節不存在: {}", e))?;
    
    // 構建更新語句，只更新有提供的欄位
    let mut sql = "UPDATE chapters SET title = ?1, updated_at = ?2".to_string();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![
        Box::new(chapter.title),
        Box::new(now),
    ];
    
    if let Some(content) = chapter.content {
        sql.push_str(", content = ?");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(content));
    }
    
    if let Some(order_index) = chapter.order_index {
        sql.push_str(", order_index = ?");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(order_index));
    }
    
    if let Some(chapter_number) = chapter.chapter_number {
        sql.push_str(", chapter_number = ?");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(chapter_number));
    }
    
    if let Some(metadata) = chapter.metadata {
        sql.push_str(", metadata = ?");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(metadata));
    }
    
    sql.push_str(" WHERE id = ?");
    sql.push_str(&(params.len() + 1).to_string());
    params.push(Box::new(chapter.id.clone()));
    
    let rows_affected = conn
        .execute(&sql, rusqlite::params_from_iter(params))
        .map_err(|e| format!("更新章節失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("章節不存在".to_string());
    }
    
    // 同時更新父專案的 updated_at 時間戳，以反映專案內容的實際更新時間
    conn.execute(
        "UPDATE projects SET updated_at = ?1 WHERE id = ?2",
        params![now, project_id],
    ).map_err(|e| format!("更新專案時間戳失敗: {}", e))?;
    
    log::info!("更新章節成功: ID {} (專案 ID: {})", chapter.id, project_id);
    Ok(())
}

#[tauri::command]
pub async fn delete_chapter(id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let rows_affected = conn
        .execute("DELETE FROM chapters WHERE id = ?1", [&id])
        .map_err(|e| format!("刪除章節失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("章節不存在".to_string());
    }
    
    log::info!("刪除章節成功: ID {}", id);
    Ok(())
}