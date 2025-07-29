use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub r#type: Option<String>, // 使用 r#type 因為 type 是 Rust 關鍵字
    pub settings: Option<String>, // JSON 字串
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub content: Option<String>,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub attributes: Option<String>, // JSON 字串
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterRelationship {
    pub id: String,
    pub from_character_id: String,
    pub to_character_id: String,
    pub relationship_type: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// 新增專案的請求結構
#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub settings: Option<String>,
}

// 更新專案的請求結構
#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub settings: Option<String>,
}

// 新增章節的請求結構
#[derive(Debug, Deserialize)]
pub struct CreateChapterRequest {
    pub project_id: String,
    pub title: String,
    pub content: Option<String>,
    pub order_index: Option<i32>,
}

// 更新章節的請求結構
#[derive(Debug, Deserialize)]
pub struct UpdateChapterRequest {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub order_index: Option<i32>,
}

// 新增角色的請求結構
#[derive(Debug, Deserialize)]
pub struct CreateCharacterRequest {
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub attributes: Option<String>,
    pub avatar_url: Option<String>,
}

// 更新角色的請求結構
#[derive(Debug, Deserialize)]
pub struct UpdateCharacterRequest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub attributes: Option<String>,
    pub avatar_url: Option<String>,
}