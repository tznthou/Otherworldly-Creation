// 情節連貫性檢查系統
use crate::database::{get_db, models::*};
use rusqlite::Result as SqliteResult;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use tauri::command;
use chrono::{DateTime, Utc};

/// 情節連貫性系統
pub struct PlotCoherenceSystem {
    timeline: Timeline,
    plot_threads: HashMap<String, PlotThread>,
    foreshadowing_tracker: ForeshadowingTracker,
    causality_chain: CausalityChain,
    consistency_rules: Vec<PlotRule>,
}

/// 時間軸管理
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timeline {
    pub events: Vec<TimelineEvent>,
    pub current_time: Option<StoryTime>,
    pub time_inconsistencies: Vec<TimeInconsistency>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub id: String,
    pub chapter_id: String,
    pub position: usize,
    pub story_time: StoryTime,
    pub event_type: String, // "action", "dialogue", "state_change", "revelation"
    pub description: String,
    pub duration: Option<Duration>,
    pub characters_involved: Vec<String>,
    pub location: Option<String>,
    pub importance: f32, // 0-1
    pub consequences: Vec<String>, // 事件後果
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryTime {
    pub absolute_time: Option<String>, // "Year 2023, Month 5, Day 15, Hour 14:30"
    pub relative_time: String, // "三天後", "同時", "回到過去"
    pub time_precision: String, // "exact", "approximate", "vague"
    pub reference_event: Option<String>, // 參考事件ID
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Duration {
    pub amount: f32,
    pub unit: String, // "minutes", "hours", "days", "months", "years"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeInconsistency {
    pub inconsistency_type: String, // "timeline_conflict", "duration_mismatch", "sequence_error"
    pub description: String,
    pub affected_events: Vec<String>,
    pub severity: String, // "minor", "major", "critical"
    pub suggested_fix: Option<String>,
}

/// 情節線追蹤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlotThread {
    pub id: String,
    pub name: String,
    pub thread_type: String, // "main", "subplot", "character_arc", "mystery"
    pub status: String, // "introduced", "developing", "climax", "resolved", "abandoned"
    pub importance: f32, // 0-1
    pub plot_points: Vec<PlotPoint>,
    pub character_involvement: HashMap<String, f32>, // character_id -> involvement_level
    pub conflicts: Vec<Conflict>,
    pub resolutions: Vec<Resolution>,
    pub thematic_elements: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub id: String,
    pub conflict_type: String, // "character_vs_character", "character_vs_self", "character_vs_society", "character_vs_nature"
    pub description: String,
    pub involved_parties: Vec<String>,
    pub stakes: String, // 衝突的賭注
    pub escalation_level: f32, // 0-1
    pub resolution_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resolution {
    pub conflict_id: String,
    pub resolution_type: String, // "victory", "compromise", "defeat", "transformation"
    pub description: String,
    pub satisfaction_level: f32, // 0-1，解決的滿意度
    pub consequences: Vec<String>,
    pub character_changes: Vec<CharacterChange>,
}

/// 伏筆追蹤系統
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeshadowingTracker {
    pub foreshadowing_items: Vec<ForeshadowingItem>,
    pub payoff_tracking: HashMap<String, PayoffStatus>,
    pub plant_and_payoff_pairs: Vec<PlantPayoffPair>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeshadowingItem {
    pub id: String,
    pub chapter_id: String,
    pub position: usize,
    pub foreshadowing_type: String, // "subtle_hint", "obvious_clue", "symbolic", "prophetic"
    pub content: String,
    pub target_revelation: Option<String>, // 指向的揭示事件
    pub subtlety_level: f32, // 0-1，越低越隱晦
    pub importance: f32, // 0-1
    pub expiration_time: Option<String>, // 如果沒有在此時間前解決，就過期了
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayoffStatus {
    pub foreshadowing_id: String,
    pub status: String, // "pending", "partially_resolved", "fully_resolved", "abandoned"
    pub resolution_chapter: Option<String>,
    pub satisfaction_score: f32, // 0-1，解決的滿意度
    pub reader_surprise_level: f32, // 0-1，預期的讀者驚喜程度
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlantPayoffPair {
    pub plant_id: String, // 伏筆ID
    pub payoff_id: String, // 解答ID
    pub connection_strength: f32, // 0-1，連接強度
    pub time_gap: Duration, // 伏筆到解答的時間間隔
    pub effectiveness_score: f32, // 0-1，效果評分
}

/// 因果關係鏈
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CausalityChain {
    pub causal_links: Vec<CausalLink>,
    pub logical_inconsistencies: Vec<LogicalInconsistency>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CausalLink {
    pub id: String,
    pub cause_event: String, // 原因事件ID
    pub effect_event: String, // 結果事件ID
    pub causal_strength: f32, // 0-1，因果關係強度
    pub causal_type: String, // "direct", "indirect", "probabilistic", "thematic"
    pub intermediate_events: Vec<String>, // 中間事件
    pub logical_necessity: f32, // 0-1，邏輯必然性
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogicalInconsistency {
    pub inconsistency_type: String, // "impossible_cause", "missing_link", "circular_logic", "contradiction"
    pub description: String,
    pub affected_events: Vec<String>,
    pub severity: String, // "minor", "major", "critical"
    pub suggested_fixes: Vec<String>,
}

/// 情節規則
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlotRule {
    pub rule_id: String,
    pub rule_type: String, // "causality", "timeline", "character_motivation", "genre_convention"
    pub condition: String,
    pub requirement: String,
    pub severity: String, // "suggestion", "warning", "error"
    pub applicable_genres: Vec<String>,
}

impl PlotCoherenceSystem {
    pub fn new() -> Self {
        Self {
            timeline: Timeline {
                events: Vec::new(),
                current_time: None,
                time_inconsistencies: Vec::new(),
            },
            plot_threads: HashMap::new(),
            foreshadowing_tracker: ForeshadowingTracker {
                foreshadowing_items: Vec::new(),
                payoff_tracking: HashMap::new(),
                plant_and_payoff_pairs: Vec::new(),
            },
            causality_chain: CausalityChain {
                causal_links: Vec::new(),
                logical_inconsistencies: Vec::new(),
            },
            consistency_rules: Self::default_plot_rules(),
        }
    }

    /// 載入專案的情節結構
    pub async fn load_project_plot_structure(&mut self, project_id: &str) -> Result<(), String> {
        // 載入所有章節和情節點
        self.load_timeline_events(project_id).await?;
        self.load_plot_threads(project_id).await?;
        self.load_foreshadowing_items(project_id).await?;
        self.build_causality_chain().await?;
        
        Ok(())
    }

    /// 分析新內容的情節連貫性
    pub async fn analyze_plot_coherence(
        &mut self,
        new_content: &str,
        chapter_id: &str,
        position: usize,
    ) -> Result<PlotCoherenceAnalysis, String> {
        let mut analysis = PlotCoherenceAnalysis {
            overall_score: 1.0,
            timeline_consistency: 1.0,
            causality_consistency: 1.0,
            character_motivation_consistency: 1.0,
            foreshadowing_consistency: 1.0,
            plot_thread_consistency: 1.0,
            issues: Vec::new(),
            suggestions: Vec::new(),
            affected_plot_threads: Vec::new(),
        };

        // 提取新內容中的事件
        let new_events = self.extract_events_from_content(new_content, chapter_id, position).await?;
        
        // 檢查時間軸一致性
        analysis.timeline_consistency = self.check_timeline_consistency(&new_events)?;
        
        // 檢查因果關係
        analysis.causality_consistency = self.check_causality_consistency(&new_events)?;
        
        // 檢查角色動機一致性
        analysis.character_motivation_consistency = self.check_character_motivation_consistency(&new_events)?;
        
        // 檢查伏筆一致性
        analysis.foreshadowing_consistency = self.check_foreshadowing_consistency(&new_events, new_content)?;
        
        // 檢查情節線一致性
        analysis.plot_thread_consistency = self.check_plot_thread_consistency(&new_events)?;

        // 計算總體分數
        analysis.overall_score = (
            analysis.timeline_consistency * 0.2 +
            analysis.causality_consistency * 0.3 +
            analysis.character_motivation_consistency * 0.2 +
            analysis.foreshadowing_consistency * 0.15 +
            analysis.plot_thread_consistency * 0.15
        );

        // 收集問題和建議
        if analysis.overall_score < 0.8 {
            self.collect_issues_and_suggestions(&mut analysis).await?;
        }

        Ok(analysis)
    }

    /// 檢查時間軸一致性
    fn check_timeline_consistency(&self, new_events: &[TimelineEvent]) -> Result<f32, String> {
        let mut score = 1.0;
        
        for event in new_events {
            // 檢查時間順序
            if let Some(ref_event_id) = &event.story_time.reference_event {
                if let Some(ref_event) = self.timeline.events.iter()
                    .find(|e| e.id == *ref_event_id) {
                    
                    // 比較時間邏輯
                    if !self.is_time_sequence_logical(ref_event, event) {
                        score *= 0.8;
                    }
                }
            }
            
            // 檢查持續時間的合理性
            if let Some(duration) = &event.duration {
                if !self.is_duration_reasonable(event, duration) {
                    score *= 0.9;
                }
            }
        }
        
        Ok(score)
    }

    /// 檢查因果關係一致性
    fn check_causality_consistency(&self, new_events: &[TimelineEvent]) -> Result<f32, String> {
        let mut score = 1.0;
        
        for event in new_events {
            // 檢查是否有足夠的原因支持這個事件
            let causal_support = self.calculate_causal_support(event)?;
            if causal_support < 0.5 {
                score *= 0.7; // 因果關係不足
            }
            
            // 檢查事件的後果是否合理
            for consequence in &event.consequences {
                if !self.is_consequence_logical(event, consequence) {
                    score *= 0.85;
                }
            }
        }
        
        Ok(score)
    }

    /// 檢查角色動機一致性
    fn check_character_motivation_consistency(&self, new_events: &[TimelineEvent]) -> Result<f32, String> {
        let mut score = 1.0;
        
        for event in new_events {
            for character_id in &event.characters_involved {
                // 檢查角色的行為是否有合理動機
                let motivation_score = self.evaluate_character_motivation(character_id, event)?;
                score = score.min(motivation_score);
            }
        }
        
        Ok(score)
    }

    /// 檢查伏筆一致性
    fn check_foreshadowing_consistency(&self, _new_events: &[TimelineEvent], content: &str) -> Result<f32, String> {
        let mut score = 1.0;
        
        // 檢查是否解決了懸而未決的伏筆
        for item in &self.foreshadowing_tracker.foreshadowing_items {
            if let Some(status) = self.foreshadowing_tracker.payoff_tracking.get(&item.id) {
                if status.status == "pending" {
                    // 檢查新內容是否解決了這個伏筆
                    if content.contains(&item.content) {
                        // 可能的解決，需要進一步分析
                        score *= 1.1; // 獎勵分數
                    }
                }
            }
        }
        
        // 檢查是否引入了新的伏筆但沒有計劃解決
        let new_foreshadowing = self.detect_new_foreshadowing(content)?;
        if !new_foreshadowing.is_empty() && !self.has_resolution_plan(&new_foreshadowing) {
            score *= 0.9; // 輕微扣分
        }
        
        Ok(score)
    }

    /// 檢查情節線一致性
    fn check_plot_thread_consistency(&self, new_events: &[TimelineEvent]) -> Result<f32, String> {
        let mut score = 1.0;
        
        for event in new_events {
            // 檢查事件是否推進了相關的情節線
            let mut advances_plot = false;
            
            for (thread_id, thread) in &self.plot_threads {
                if self.event_relates_to_thread(event, thread) {
                    if self.event_advances_thread(event, thread) {
                        advances_plot = true;
                    }
                }
            }
            
            if !advances_plot && event.importance > 0.7 {
                score *= 0.85; // 重要事件應該推進情節
            }
        }
        
        Ok(score)
    }

    /// 更新情節結構
    pub async fn update_plot_structure(
        &mut self,
        chapter_id: &str,
        new_content: &str,
        position: usize,
    ) -> Result<(), String> {
        // 提取新事件
        let new_events = self.extract_events_from_content(new_content, chapter_id, position).await?;
        
        // 更新時間軸
        for event in new_events {
            self.timeline.events.push(event.clone());
            
            // 更新因果關係鏈
            self.update_causality_chain(&event).await?;
            
            // 更新情節線
            self.update_plot_threads(&event).await?;
            
            // 更新伏筆追蹤
            self.update_foreshadowing_tracking(&event, new_content).await?;
        }
        
        // 排序時間軸事件
        self.sort_timeline_events();
        
        // 檢查一致性
        self.validate_consistency().await?;
        
        Ok(())
    }

    // === 輔助方法 ===

    async fn load_timeline_events(&mut self, _project_id: &str) -> Result<(), String> {
        // TODO: 從資料庫載入時間軸事件
        Ok(())
    }

    async fn load_plot_threads(&mut self, _project_id: &str) -> Result<(), String> {
        // TODO: 從資料庫載入情節線
        Ok(())
    }

    async fn load_foreshadowing_items(&mut self, _project_id: &str) -> Result<(), String> {
        // TODO: 從資料庫載入伏筆項目
        Ok(())
    }

    async fn build_causality_chain(&mut self) -> Result<(), String> {
        // TODO: 構建因果關係鏈
        Ok(())
    }

    async fn extract_events_from_content(
        &self,
        content: &str,
        chapter_id: &str,
        position: usize,
    ) -> Result<Vec<TimelineEvent>, String> {
        // TODO: 使用NLP技術從內容中提取事件
        let mut events = Vec::new();
        
        // 這裡應該有複雜的NLP邏輯來識別事件
        // 暫時返回一個模擬事件
        events.push(TimelineEvent {
            id: format!("event_{}", chrono::Utc::now().timestamp()),
            chapter_id: chapter_id.to_string(),
            position,
            story_time: StoryTime {
                absolute_time: None,
                relative_time: "現在".to_string(),
                time_precision: "vague".to_string(),
                reference_event: None,
            },
            event_type: "action".to_string(),
            description: "從內容提取的事件".to_string(),
            duration: None,
            characters_involved: Vec::new(),
            location: None,
            importance: 0.5,
            consequences: Vec::new(),
        });
        
        Ok(events)
    }

    fn is_time_sequence_logical(&self, _ref_event: &TimelineEvent, _event: &TimelineEvent) -> bool {
        // TODO: 實作時間序列邏輯檢查
        true
    }

    fn is_duration_reasonable(&self, _event: &TimelineEvent, _duration: &Duration) -> bool {
        // TODO: 實作持續時間合理性檢查
        true
    }

    fn calculate_causal_support(&self, _event: &TimelineEvent) -> Result<f32, String> {
        // TODO: 計算事件的因果支持度
        Ok(0.8)
    }

    fn is_consequence_logical(&self, _event: &TimelineEvent, _consequence: &str) -> bool {
        // TODO: 檢查後果的邏輯性
        true
    }

    fn evaluate_character_motivation(&self, _character_id: &str, _event: &TimelineEvent) -> Result<f32, String> {
        // TODO: 評估角色動機
        Ok(0.8)
    }

    fn detect_new_foreshadowing(&self, _content: &str) -> Result<Vec<String>, String> {
        // TODO: 檢測新的伏筆
        Ok(Vec::new())
    }

    fn has_resolution_plan(&self, _foreshadowing: &[String]) -> bool {
        // TODO: 檢查是否有解決計劃
        true
    }

    fn event_relates_to_thread(&self, _event: &TimelineEvent, _thread: &PlotThread) -> bool {
        // TODO: 檢查事件是否與情節線相關
        true
    }

    fn event_advances_thread(&self, _event: &TimelineEvent, _thread: &PlotThread) -> bool {
        // TODO: 檢查事件是否推進情節線
        true
    }

    async fn update_causality_chain(&mut self, _event: &TimelineEvent) -> Result<(), String> {
        // TODO: 更新因果關係鏈
        Ok(())
    }

    async fn update_plot_threads(&mut self, _event: &TimelineEvent) -> Result<(), String> {
        // TODO: 更新情節線
        Ok(())
    }

    async fn update_foreshadowing_tracking(&mut self, _event: &TimelineEvent, _content: &str) -> Result<(), String> {
        // TODO: 更新伏筆追蹤
        Ok(())
    }

    fn sort_timeline_events(&mut self) {
        // TODO: 根據時間排序事件
        self.timeline.events.sort_by(|a, b| a.position.cmp(&b.position));
    }

    async fn validate_consistency(&mut self) -> Result<(), String> {
        // TODO: 驗證整體一致性
        Ok(())
    }

    async fn collect_issues_and_suggestions(&self, _analysis: &mut PlotCoherenceAnalysis) -> Result<(), String> {
        // TODO: 收集問題和建議
        Ok(())
    }

    fn default_plot_rules() -> Vec<PlotRule> {
        vec![
            PlotRule {
                rule_id: "causality_requirement".to_string(),
                rule_type: "causality".to_string(),
                condition: "重要事件必須有充分的原因".to_string(),
                requirement: "事件的因果支持度至少為0.6".to_string(),
                severity: "warning".to_string(),
                applicable_genres: vec!["all".to_string()],
            },
            PlotRule {
                rule_id: "timeline_consistency".to_string(),
                rule_type: "timeline".to_string(),
                condition: "事件必須按照邏輯時間順序".to_string(),
                requirement: "不能有時間矛盾".to_string(),
                severity: "error".to_string(),
                applicable_genres: vec!["all".to_string()],
            },
        ]
    }
}

/// 情節連貫性分析結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlotCoherenceAnalysis {
    pub overall_score: f32,
    pub timeline_consistency: f32,
    pub causality_consistency: f32,
    pub character_motivation_consistency: f32,
    pub foreshadowing_consistency: f32,
    pub plot_thread_consistency: f32,
    pub issues: Vec<String>,
    pub suggestions: Vec<String>,
    pub affected_plot_threads: Vec<String>,
}

/// Tauri 命令：分析情節連貫性
#[command]
pub async fn analyze_plot_coherence_command(
    project_id: String,
    chapter_id: String,
    position: usize,
    content: String,
) -> Result<PlotCoherenceAnalysis, String> {
    let mut system = PlotCoherenceSystem::new();
    system.load_project_plot_structure(&project_id).await?;
    
    system.analyze_plot_coherence(&content, &chapter_id, position).await
}

/// Tauri 命令：更新情節結構
#[command]
pub async fn update_plot_structure_command(
    project_id: String,
    chapter_id: String,
    position: usize,
    content: String,
) -> Result<(), String> {
    let mut system = PlotCoherenceSystem::new();
    system.load_project_plot_structure(&project_id).await?;
    
    system.update_plot_structure(&chapter_id, &content, position).await
}