use crate::database::{get_db, models::*};
use anyhow::Result;
use chrono::Utc;
use rusqlite::params;
use uuid::Uuid;

#[tauri::command]
pub async fn get_characters_by_project_id(projectId: String) -> Result<Vec<Character>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, description, attributes, avatar_url, created_at, updated_at 
                  FROM characters WHERE project_id = ?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    
    let character_iter = stmt
        .query_map([projectId], |row| {
            Ok(Character {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                attributes: row.get(4)?,
                avatar_url: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut characters = Vec::new();
    for character in character_iter {
        characters.push(character.map_err(|e| e.to_string())?);
    }
    
    Ok(characters)
}

#[tauri::command]
pub async fn get_character_by_id(id: String) -> Result<Character, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, description, attributes, avatar_url, created_at, updated_at 
                  FROM characters WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let character = stmt
        .query_row([id], |row| {
            Ok(Character {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                attributes: row.get(4)?,
                avatar_url: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("角色不存在: {}", e))?;
    
    Ok(character)
}

#[tauri::command]
pub async fn create_character(character: CreateCharacterRequest) -> Result<String, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let character_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    conn.execute(
        "INSERT INTO characters (id, project_id, name, description, attributes, avatar_url, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            character_id,
            character.project_id,
            character.name,
            character.description,
            character.attributes,
            character.avatar_url,
            now,
            now
        ],
    )
    .map_err(|e| format!("建立角色失敗: {}", e))?;
    
    log::info!("建立角色成功: {} (ID: {})", character.name, character_id);
    Ok(character_id)
}

#[tauri::command]
pub async fn update_character(character: UpdateCharacterRequest) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let now = Utc::now();
    
    let rows_affected = conn
        .execute(
            "UPDATE characters SET name = ?1, description = ?2, attributes = ?3, avatar_url = ?4, updated_at = ?5 
             WHERE id = ?6",
            params![
                character.name,
                character.description,
                character.attributes,
                character.avatar_url,
                now,
                character.id
            ],
        )
        .map_err(|e| format!("更新角色失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("角色不存在".to_string());
    }
    
    log::info!("更新角色成功: {} (ID: {})", character.name, character.id);
    Ok(())
}

#[tauri::command]
pub async fn delete_character(id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    // 因為有外鍵約束，刪除角色會自動刪除相關的關係
    let rows_affected = conn
        .execute("DELETE FROM characters WHERE id = ?1", [&id])
        .map_err(|e| format!("刪除角色失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("角色不存在".to_string());
    }
    
    log::info!("刪除角色成功: ID {}", id);
    Ok(())
}

// 角色關係管理

#[tauri::command]
pub async fn create_character_relationship(
    from_character_id: String,
    to_character_id: String,
    relationship_type: String,
    description: Option<String>,
) -> Result<String, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let relationship_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    conn.execute(
        "INSERT INTO character_relationships (id, from_character_id, to_character_id, relationship_type, description, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            relationship_id,
            from_character_id,
            to_character_id,
            relationship_type,
            description,
            now,
            now
        ],
    )
    .map_err(|e| format!("建立角色關係失敗: {}", e))?;
    
    log::info!("建立角色關係成功: ID {}", relationship_id);
    Ok(relationship_id)
}

#[tauri::command]
pub async fn delete_character_relationship(id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let rows_affected = conn
        .execute("DELETE FROM character_relationships WHERE id = ?1", [&id])
        .map_err(|e| format!("刪除角色關係失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("角色關係不存在".to_string());
    }
    
    log::info!("刪除角色關係成功: ID {}", id);
    Ok(())
}

#[tauri::command]
pub async fn get_character_relationships(character_id: String) -> Result<Vec<CharacterRelationship>, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    let mut stmt = conn
        .prepare("SELECT id, from_character_id, to_character_id, relationship_type, description, created_at, updated_at 
                  FROM character_relationships WHERE from_character_id = ?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    
    let relationship_iter = stmt
        .query_map([character_id], |row| {
            Ok(CharacterRelationship {
                id: row.get(0)?,
                from_character_id: row.get(1)?,
                to_character_id: row.get(2)?,
                relationship_type: row.get(3)?,
                description: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    
    let mut relationships = Vec::new();
    for relationship in relationship_iter {
        relationships.push(relationship.map_err(|e| e.to_string())?);
    }
    
    Ok(relationships)
}

#[tauri::command]
pub async fn clear_character_relationships(character_id: String) -> Result<(), String> {
    let db = get_db().map_err(|e| e.to_string())?;
    let conn = db.lock().unwrap();
    
    conn.execute(
        "DELETE FROM character_relationships WHERE from_character_id = ?1 OR to_character_id = ?1",
        [&character_id],
    )
    .map_err(|e| format!("清除角色關係失敗: {}", e))?;
    
    log::info!("清除角色關係成功: Character ID {}", character_id);
    Ok(())
}