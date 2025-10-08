// 增強的AI續寫系統數據模型
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 世界設定管理
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldSetting {
    pub id: String,
    pub project_id: String,
    pub category: String, // "magic_system", "world_rules", "geography", "culture" 等
    pub name: String,
    pub description: String,
    pub importance_level: i32, // 1-10，重要性等級
    pub usage_count: i32, // 使用頻率統計
    pub last_used: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 角色狀態時間軸追蹤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterState {
    pub id: String,
    pub character_id: String,
    pub chapter_id: String,
    pub position: usize, // 在章節中的位置
    pub emotional_state: String, // "happy", "angry", "confused" 等
    pub physical_state: String, // "healthy", "injured", "tired" 等
    pub knowledge_state: Vec<String>, // 角色此時知道的資訊
    pub goals: Vec<String>, // 當前目標
    pub location: Option<String>, // 當前位置
    pub relationships_snapshot: String, // JSON: 與其他角色關係的快照
    pub created_at: DateTime<Utc>,
}

/// 角色語言風格模式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterSpeechPattern {
    pub id: String,
    pub character_id: String,
    pub vocabulary_style: Vec<String>, // 常用詞彙
    pub sentence_patterns: Vec<String>, // 句式特點
    pub emotional_expressions: HashMap<String, Vec<String>>, // 不同情緒的表達方式
    pub catchphrases: Vec<String>, // 口頭禪
    pub formality_level: String, // "formal", "casual", "rough" 等
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 情節要點追蹤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlotPoint {
    pub id: String,
    pub project_id: String,
    pub chapter_id: String,
    pub position: usize,
    pub plot_type: String, // "setup", "conflict", "climax", "resolution", "foreshadowing" 等
    pub title: String,
    pub description: String,
    pub importance: i32, // 1-10
    pub status: String, // "introduced", "developing", "resolved"
    pub related_characters: Vec<String>, // 相關角色ID
    pub foreshadowing_target: Option<String>, // 如果是伏筆，指向目標情節點
    pub resolution_target: Option<String>, // 如果是解答，指向對應伏筆
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 上下文權重計算
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextWeight {
    pub content_type: String, // "character", "plot", "world_setting", "dialogue", "description"
    pub relevance_score: f32, // 0.0-1.0，相關性分數
    pub importance_score: f32, // 0.0-1.0，重要性分數
    pub recency_score: f32, // 0.0-1.0，時間相關性
    pub character_involvement: f32, // 0.0-1.0，角色參與度
    pub final_weight: f32, // 最終權重
}

/// 智能上下文結構
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntelligentContext {
    pub project_id: String,
    pub chapter_id: String,
    pub position: usize,
    pub core_context: String, // 核心上下文（當前場景）
    pub character_context: String, // 角色相關上下文
    pub plot_context: String, // 情節相關上下文
    pub world_context: String, // 世界設定上下文
    pub historical_context: String, // 歷史事件摘要
    pub total_tokens: usize, // 估算的總token數
    pub compression_ratio: f32, // 壓縮比例
    pub context_hash: String, // 上下文的雜湊值，用於緩存
    pub created_at: DateTime<Utc>,
}

/// 一致性檢查結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyCheck {
    pub id: String,
    pub content: String, // 被檢查的內容
    pub check_type: String, // "character_consistency", "plot_consistency", "world_consistency"
    pub issues: Vec<ConsistencyIssue>,
    pub overall_score: f32, // 0.0-1.0，整體一致性分數
    pub suggestions: Vec<String>, // 改進建議
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyIssue {
    pub issue_type: String, // "character_ooc", "plot_hole", "world_conflict" 等
    pub severity: String, // "low", "medium", "high", "critical"
    pub description: String,
    pub context: String, // 相關上下文
    pub suggestion: Option<String>, // 修正建議
}

/// 動態壓縮策略配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionStrategy {
    pub max_tokens: usize,
    pub core_context_ratio: f32, // 核心上下文佔比
    pub character_context_ratio: f32,
    pub plot_context_ratio: f32,
    pub world_context_ratio: f32,
    pub historical_context_ratio: f32,
    pub preserve_dialogue: bool, // 是否保留對話
    pub preserve_foreshadowing: bool, // 是否保留伏筆
    pub min_character_mentions: usize, // 最少角色提及次數
}

/// 生成參數增強版
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedGenerateParams {
    // 基礎參數
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub max_tokens: Option<u32>,
    pub presence_penalty: Option<f32>,
    pub frequency_penalty: Option<f32>,
    
    // 增強參數
    pub focus_characters: Vec<String>, // 重點關注的角色
    pub desired_tone: Option<String>, // 期望的語調
    pub plot_direction: Option<String>, // 情節發展方向
    pub consistency_check: bool, // 是否進行一致性檢查
    pub style_adaptation: bool, // 是否進行風格適配
    pub max_context_tokens: Option<u32>,
    
    // 壓縮策略
    pub compression_strategy: Option<CompressionStrategy>,
}

/// AI續寫響應增強版
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedGenerateResponse {
    pub generated_text: String,
    pub consistency_score: f32, // 一致性分數
    pub character_scores: HashMap<String, f32>, // 各角色的一致性分數
    pub plot_coherence_score: f32, // 情節連貫性分數
    pub world_consistency_score: f32, // 世界設定一致性分數
    pub issues: Vec<ConsistencyIssue>, // 發現的問題
    pub suggestions: Vec<String>, // 改進建議
    pub context_utilization: f32, // 上下文利用率
    pub processing_time: u64, // 處理時間（毫秒）
}