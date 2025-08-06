use crate::database::{get_db, models::*};
use chrono::Utc;
use rusqlite::{params, Connection};
use tauri::command;
use uuid::Uuid;

/// 創建新的 AI 生成歷史記錄
#[command]
pub async fn create_ai_history(request: CreateAIHistoryRequest) -> Result<AIGenerationHistory, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().map_err(|e| format!("無法獲取資料庫鎖: {}", e))?;
    
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now();
    
    conn.execute(
        "INSERT INTO ai_generation_history (
            id, project_id, chapter_id, provider_id, model, prompt, generated_text,
            parameters, language_purity, token_count, generation_time_ms,
            selected, position, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id,
            request.project_id,
            request.chapter_id,
            request.provider_id,
            request.model,
            request.prompt,
            request.generated_text,
            request.parameters,
            request.language_purity,
            request.token_count,
            request.generation_time_ms,
            false, // 默認未選擇
            request.position,
            created_at,
        ],
    ).map_err(|e| format!("創建 AI 歷史記錄失敗: {}", e))?;
    
    // 返回創建的記錄
    get_ai_history_by_id(&*conn, &id)
}

/// 根據 ID 獲取 AI 生成歷史記錄
fn get_ai_history_by_id(conn: &Connection, id: &str) -> Result<AIGenerationHistory, String> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, chapter_id, provider_id, model, prompt, generated_text,
                parameters, language_purity, token_count, generation_time_ms,
                selected, position, created_at
         FROM ai_generation_history
         WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let history = stmt.query_row([id], |row| {
        Ok(AIGenerationHistory {
            id: row.get(0)?,
            project_id: row.get(1)?,
            chapter_id: row.get(2)?,
            provider_id: row.get(3)?,
            model: row.get(4)?,
            prompt: row.get(5)?,
            generated_text: row.get(6)?,
            parameters: row.get(7)?,
            language_purity: row.get(8)?,
            token_count: row.get(9)?,
            generation_time_ms: row.get(10)?,
            selected: row.get(11)?,
            position: row.get(12)?,
            created_at: row.get(13)?,
        })
    }).map_err(|e| format!("獲取 AI 歷史記錄失敗: {}", e))?;
    
    Ok(history)
}

/// 查詢 AI 生成歷史記錄
#[command]
pub async fn query_ai_history(request: QueryAIHistoryRequest) -> Result<Vec<AIGenerationHistory>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().map_err(|e| format!("無法獲取資料庫鎖: {}", e))?;
    
    let mut query = String::from(
        "SELECT id, project_id, chapter_id, provider_id, model, prompt, generated_text,
                parameters, language_purity, token_count, generation_time_ms,
                selected, position, created_at
         FROM ai_generation_history
         WHERE 1=1"
    );
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(project_id) = &request.project_id {
        query.push_str(" AND project_id = ?");
        params.push(Box::new(project_id.clone()));
    }
    
    if let Some(chapter_id) = &request.chapter_id {
        query.push_str(" AND chapter_id = ?");
        params.push(Box::new(chapter_id.clone()));
    }
    
    if let Some(true) = request.selected_only {
        query.push_str(" AND selected = 1");
    }
    
    query.push_str(" ORDER BY created_at DESC");
    
    if let Some(limit) = request.limit {
        query.push_str(&format!(" LIMIT {}", limit));
    }
    
    if let Some(offset) = request.offset {
        query.push_str(&format!(" OFFSET {}", offset));
    }
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let history_iter = stmt.query_map(
        params.iter().map(|p| p.as_ref()).collect::<Vec<_>>().as_slice(),
        |row| {
            Ok(AIGenerationHistory {
                id: row.get(0)?,
                project_id: row.get(1)?,
                chapter_id: row.get(2)?,
                provider_id: row.get(3)?,
                model: row.get(4)?,
                prompt: row.get(5)?,
                generated_text: row.get(6)?,
                parameters: row.get(7)?,
                language_purity: row.get(8)?,
                token_count: row.get(9)?,
                generation_time_ms: row.get(10)?,
                selected: row.get(11)?,
                position: row.get(12)?,
                created_at: row.get(13)?,
            })
        }
    ).map_err(|e| e.to_string())?;
    
    let mut histories = Vec::new();
    for history in history_iter {
        histories.push(history.map_err(|e| e.to_string())?);
    }
    
    Ok(histories)
}

/// 標記某個歷史記錄為已選擇
#[command]
pub async fn mark_ai_history_selected(history_id: String, project_id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().map_err(|e| format!("無法獲取資料庫鎖: {}", e))?;
    
    // 首先將該專案的所有歷史記錄標記為未選擇
    conn.execute(
        "UPDATE ai_generation_history SET selected = 0 WHERE project_id = ?1",
        [&project_id],
    ).map_err(|e| format!("更新歷史記錄失敗: {}", e))?;
    
    // 然後將指定的歷史記錄標記為已選擇
    conn.execute(
        "UPDATE ai_generation_history SET selected = 1 WHERE id = ?1",
        [&history_id],
    ).map_err(|e| format!("標記歷史記錄失敗: {}", e))?;
    
    Ok(())
}

/// 刪除 AI 生成歷史記錄
#[command]
pub async fn delete_ai_history(history_id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().map_err(|e| format!("無法獲取資料庫鎖: {}", e))?;
    
    conn.execute(
        "DELETE FROM ai_generation_history WHERE id = ?1",
        [&history_id],
    ).map_err(|e| format!("刪除歷史記錄失敗: {}", e))?;
    
    Ok(())
}

/// 清理舊的 AI 生成歷史記錄（保留最近的 N 條）
#[command]
pub async fn cleanup_ai_history(project_id: String, keep_count: i32) -> Result<i32, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().map_err(|e| format!("無法獲取資料庫鎖: {}", e))?;
    
    // 獲取要保留的記錄 ID
    let keep_ids: Vec<String> = conn.prepare(
        "SELECT id FROM ai_generation_history 
         WHERE project_id = ?1 
         ORDER BY created_at DESC 
         LIMIT ?2"
    )
    .and_then(|mut stmt| {
        stmt.query_map(params![&project_id, keep_count], |row| row.get(0))
            .map(|rows| rows.collect::<Result<Vec<String>, _>>())
    })
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;
    
    if keep_ids.is_empty() {
        return Ok(0);
    }
    
    // 刪除不在保留列表中的記錄
    let placeholders = keep_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let delete_query = format!(
        "DELETE FROM ai_generation_history 
         WHERE project_id = ? AND id NOT IN ({})",
        placeholders
    );
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    params.push(Box::new(project_id));
    for id in keep_ids {
        params.push(Box::new(id));
    }
    
    let deleted_count = conn.execute(
        &delete_query,
        params.iter().map(|p| p.as_ref()).collect::<Vec<_>>().as_slice(),
    ).map_err(|e| format!("清理歷史記錄失敗: {}", e))?;
    
    Ok(deleted_count as i32)
}