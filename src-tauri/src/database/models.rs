use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub r#type: Option<String>, // 使用 r#type 因為 type 是 Rust 關鍵字
    pub settings: Option<String>, // JSON 字串
    pub novel_length: Option<String>, // 小說篇幅: short, medium, long
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
    pub chapter_number: Option<i32>, // 章節編號
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
    #[serde(rename = "type")]
    pub r#type: Option<String>,
    pub settings: Option<String>,
    pub novel_length: Option<String>, // 小說篇幅: short, medium, long
}

// 更新專案的請求結構
#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub r#type: Option<String>,
    pub settings: Option<String>,
    pub novel_length: Option<String>, // 小說篇幅: short, medium, long
}

// 新增章節的請求結構
#[derive(Debug, Deserialize)]
pub struct CreateChapterRequest {
    pub project_id: String,
    pub title: String,
    pub content: Option<String>,
    pub order_index: Option<i32>,
    pub chapter_number: Option<i32>, // 章節編號
}

// 更新章節的請求結構
#[derive(Debug, Deserialize)]
pub struct UpdateChapterRequest {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub order_index: Option<i32>,
    pub chapter_number: Option<i32>, // 章節編號
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

// AI 生成歷史記錄模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIGenerationHistory {
    pub id: String,
    pub project_id: String,
    pub chapter_id: String,
    pub model: String,
    pub prompt: String,
    pub generated_text: String,
    pub parameters: Option<String>, // JSON string
    pub language_purity: Option<f64>,
    pub token_count: Option<i32>,
    pub generation_time_ms: Option<i32>,
    pub selected: bool,
    pub position: Option<i32>,
    pub created_at: DateTime<Utc>,
}

// 新增 AI 生成歷史記錄的請求結構
#[derive(Debug, Deserialize)]
pub struct CreateAIHistoryRequest {
    pub project_id: String,
    pub chapter_id: String,
    pub model: String,
    pub prompt: String,
    pub generated_text: String,
    pub parameters: Option<String>,
    pub language_purity: Option<f64>,
    pub token_count: Option<i32>,
    pub generation_time_ms: Option<i32>,
    pub position: Option<i32>,
}

// 查詢 AI 生成歷史記錄的請求結構
#[derive(Debug, Deserialize)]
pub struct QueryAIHistoryRequest {
    pub project_id: Option<String>,
    pub chapter_id: Option<String>,
    pub selected_only: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}