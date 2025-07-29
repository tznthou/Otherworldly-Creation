use crate::database::{get_db, models::*};
use anyhow::Result;
use chrono::Utc;
use rusqlite::params;
use uuid::Uuid;

#[tauri::command]
pub async fn get_all_projects() -> Result<Vec<Project>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT id, name, description, type, settings, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    
    let project_iter = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                r#type: row.get(3)?,
                settings: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut projects = Vec::new();
    for project in project_iter {
        projects.push(project.map_err(|e| e.to_string())?);
    }
    
    Ok(projects)
}

#[tauri::command]
pub async fn get_project_by_id(id: String) -> Result<Project, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT id, name, description, type, settings, created_at, updated_at FROM projects WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let project = stmt
        .query_row([id], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                r#type: row.get(3)?,
                settings: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("專案不存在: {}", e))?;
    
    Ok(project)
}

#[tauri::command]
pub async fn create_project(project: CreateProjectRequest) -> Result<String, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let project_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    conn.execute(
        "INSERT INTO projects (id, name, description, type, settings, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            project_id,
            project.name,
            project.description,
            project.r#type,
            project.settings,
            now,
            now
        ],
    )
    .map_err(|e| format!("建立專案失敗: {}", e))?;
    
    log::info!("建立專案成功: {} (ID: {})", project.name, project_id);
    Ok(project_id)
}

#[tauri::command]
pub async fn update_project(project: UpdateProjectRequest) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let now = Utc::now();
    
    let rows_affected = conn
        .execute(
            "UPDATE projects SET name = ?1, description = ?2, type = ?3, settings = ?4, updated_at = ?5 WHERE id = ?6",
            params![
                project.name,
                project.description,
                project.r#type,
                project.settings,
                now,
                project.id
            ],
        )
        .map_err(|e| format!("更新專案失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("專案不存在".to_string());
    }
    
    log::info!("更新專案成功: {} (ID: {})", project.name, project.id);
    Ok(())
}

#[tauri::command]
pub async fn delete_project(id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    // 因為有外鍵約束，刪除專案會自動刪除相關的章節和角色
    let rows_affected = conn
        .execute("DELETE FROM projects WHERE id = ?1", [&id])
        .map_err(|e| format!("刪除專案失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("專案不存在".to_string());
    }
    
    log::info!("刪除專案成功: ID {}", id);
    Ok(())
}