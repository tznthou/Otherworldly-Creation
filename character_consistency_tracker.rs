// 角色一致性追蹤系統
use crate::database::{get_db, models::*};
use rusqlite::Result as SqliteResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;
use regex::Regex;

/// 角色一致性追蹤器
pub struct CharacterConsistencyTracker {
    character_profiles: HashMap<String, CharacterProfile>,
    consistency_rules: Vec<ConsistencyRule>,
}

/// 角色檔案（擴展版）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterProfile {
    pub id: String,
    pub name: String,
    pub core_traits: Vec<String>, // 核心性格特徵
    pub speech_patterns: SpeechPatterns,
    pub behavioral_patterns: BehavioralPatterns,
    pub knowledge_base: KnowledgeBase,
    pub emotional_profile: EmotionalProfile,
    pub relationship_dynamics: HashMap<String, RelationshipDynamic>,
    pub growth_trajectory: Vec<CharacterGrowthPoint>,
    pub consistency_score: f32, // 整體一致性分數
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

/// 語言模式詳細分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechPatterns {
    pub vocabulary_level: String, // "formal", "casual", "academic", "street"
    pub sentence_structure: String, // "simple", "complex", "varied"
    pub emotional_expressions: HashMap<String, Vec<String>>, // 情緒對應的表達方式
    pub catchphrases: Vec<String>,
    pub speech_quirks: Vec<String>, // 語言習慣，如口吃、重複等
    pub formality_variations: HashMap<String, String>, // 對不同對象的正式程度
    pub cultural_markers: Vec<String>, // 文化背景標記詞
    pub taboo_words: Vec<String>, // 角色不會使用的詞彙
}

/// 行為模式分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehavioralPatterns {
    pub reaction_patterns: HashMap<String, String>, // 情況->典型反應
    pub decision_making_style: String, // "impulsive", "analytical", "cautious"
    pub stress_responses: Vec<String>, // 壓力下的反應
    pub comfort_behaviors: Vec<String>, // 舒適時的行為
    pub conflict_style: String, // "aggressive", "passive", "assertive", "avoidant"
    pub leadership_style: Option<String>, // 領導風格（如果適用）
    pub moral_boundaries: Vec<String>, // 道德底線
    pub fears_and_phobias: Vec<String>, // 恐懼和恐懼症
}

/// 知識庫管理
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeBase {
    pub known_facts: Vec<KnowledgeItem>,
    pub secrets_kept: Vec<Secret>,
    pub skills_and_abilities: Vec<Skill>,
    pub memories: Vec<Memory>,
    pub beliefs_and_values: Vec<Belief>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItem {
    pub fact: String,
    pub confidence_level: f32, // 0-1，角色對此事實的確信程度
    pub source: String, // 如何得知的
    pub learned_at: String, // 章節ID或時間點
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Secret {
    pub secret: String,
    pub importance: i32, // 1-10
    pub who_knows: Vec<String>, // 還有誰知道
    pub revelation_conditions: Option<String>, // 什麼情況下會透露
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub skill_name: String,
    pub proficiency_level: i32, // 1-10
    pub learned_from: Option<String>,
    pub last_used: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    pub event_description: String,
    pub emotional_impact: f32, // -1 to 1
    pub vividness: f32, // 0-1，記憶的清晰度
    pub chapter_reference: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Belief {
    pub belief: String,
    pub strength: f32, // 0-1，信念強度
    pub origin: String, // 信念來源
    pub challenges: Vec<String>, // 挑戰過這個信念的事件
}

/// 情感檔案
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionalProfile {
    pub base_temperament: String, // "sanguine", "choleric", "melancholic", "phlegmatic"
    pub emotional_stability: f32, // 0-1
    pub empathy_level: f32, // 0-1
    pub emotional_intelligence: f32, // 0-1
    pub trigger_emotions: HashMap<String, String>, // 觸發器->情緒反應
    pub emotional_recovery_time: HashMap<String, i32>, // 情緒->恢復時間（分鐘）
    pub emotional_expressions: HashMap<String, Vec<String>>, // 情緒->表達方式
}

/// 關係動態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipDynamic {
    pub target_character: String,
    pub relationship_type: String,
    pub intimacy_level: f32, // 0-1
    pub trust_level: f32, // -1 to 1
    pub power_dynamic: String, // "equal", "dominant", "submissive"
    pub communication_style: String, // 與此角色的溝通方式
    pub shared_history: Vec<String>, // 共同經歷
    pub conflicts: Vec<String>, // 衝突歷史
    pub evolution_trajectory: Vec<RelationshipChange>, // 關係變化軌跡
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipChange {
    pub change_type: String, // "trust_increase", "conflict", "reconciliation"
    pub description: String,
    pub chapter_reference: String,
    pub impact_score: f32, // -1 to 1
}

/// 角色成長點
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterGrowthPoint {
    pub chapter_reference: String,
    pub growth_type: String, // "personality", "skill", "knowledge", "relationship"
    pub description: String,
    pub significance: f32, // 0-1
    pub permanence: f32, // 0-1，變化的持久性
}

/// 一致性規則
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyRule {
    pub rule_id: String,
    pub rule_type: String, // "speech", "behavior", "knowledge", "emotion"
    pub condition: String, // 條件描述
    pub expectation: String, // 預期結果
    pub severity: String, // "low", "medium", "high", "critical"
}

impl CharacterConsistencyTracker {
    pub fn new() -> Self {
        Self {
            character_profiles: HashMap::new(),
            consistency_rules: Self::default_consistency_rules(),
        }
    }

    /// 載入角色檔案
    pub async fn load_character_profiles(&mut self, project_id: &str) -> Result<(), String> {
        let db = get_db().map_err(|e| e.to_string())?;
        let conn = db.lock().map_err(|e| format!("無法獲取資料庫鎖: {}", e))?;

        // 獲取專案中的所有角色
        let mut stmt = conn
            .prepare("SELECT * FROM characters WHERE project_id = ?")
            .map_err(|e| e.to_string())?;

        let characters: Vec<Character> = stmt
            .query_map([project_id], |row| {
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
            .map_err(|e| e.to_string())?
            .collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?;

        // 為每個角色建立詳細檔案
        for character in characters {
            let profile = self.build_character_profile(character).await?;
            self.character_profiles.insert(profile.id.clone(), profile);
        }

        Ok(())
    }

    /// 建立角色詳細檔案
    async fn build_character_profile(&self, character: Character) -> Result<CharacterProfile, String> {
        // 解析現有的屬性
        let attributes = if let Some(attrs) = &character.attributes {
            serde_json::from_str::<serde_json::Value>(attrs)
                .unwrap_or(serde_json::Value::Object(serde_json::Map::new()))
        } else {
            serde_json::Value::Object(serde_json::Map::new())
        };

        // 建立語言模式
        let speech_patterns = self.extract_speech_patterns(&character, &attributes).await?;
        
        // 建立行為模式
        let behavioral_patterns = self.extract_behavioral_patterns(&character, &attributes).await?;
        
        // 建立知識庫
        let knowledge_base = self.build_knowledge_base(&character).await?;
        
        // 建立情感檔案
        let emotional_profile = self.build_emotional_profile(&character, &attributes).await?;
        
        // 建立關係動態
        let relationship_dynamics = self.build_relationship_dynamics(&character).await?;

        Ok(CharacterProfile {
            id: character.id,
            name: character.name,
            core_traits: self.extract_core_traits(&attributes),
            speech_patterns,
            behavioral_patterns,
            knowledge_base,
            emotional_profile,
            relationship_dynamics,
            growth_trajectory: Vec::new(), // 初始化時為空，需要通過分析填充
            consistency_score: 1.0, // 初始分數
            last_updated: chrono::Utc::now(),
        })
    }

    /// 分析文本中的角色一致性
    pub async fn analyze_character_consistency(
        &self,
        text: &str,
        character_id: &str,
        context: &IntelligentContext,
    ) -> Result<CharacterConsistencyAnalysis, String> {
        let profile = self.character_profiles.get(character_id)
            .ok_or_else(|| format!("找不到角色檔案: {}", character_id))?;

        let mut analysis = CharacterConsistencyAnalysis {
            character_id: character_id.to_string(),
            overall_score: 1.0,
            speech_consistency: 1.0,
            behavior_consistency: 1.0,
            knowledge_consistency: 1.0,
            emotional_consistency: 1.0,
            violations: Vec::new(),
            suggestions: Vec::new(),
            confidence: 1.0,
        };

        // 分析語言一致性
        analysis.speech_consistency = self.analyze_speech_consistency(text, profile)?;
        
        // 分析行為一致性
        analysis.behavior_consistency = self.analyze_behavior_consistency(text, profile)?;
        
        // 分析知識一致性
        analysis.knowledge_consistency = self.analyze_knowledge_consistency(text, profile, context)?;
        
        // 分析情感一致性
        analysis.emotional_consistency = self.analyze_emotional_consistency(text, profile)?;

        // 計算總體分數
        analysis.overall_score = (
            analysis.speech_consistency * 0.3 +
            analysis.behavior_consistency * 0.3 +
            analysis.knowledge_consistency * 0.2 +
            analysis.emotional_consistency * 0.2
        );

        // 收集違規和建議
        if analysis.overall_score < 0.8 {
            analysis.violations.push("角色表現可能不一致".to_string());
            analysis.suggestions.push("檢查角色的語言和行為是否符合設定".to_string());
        }

        Ok(analysis)
    }

    /// 分析語言一致性
    fn analyze_speech_consistency(&self, text: &str, profile: &CharacterProfile) -> Result<f32, String> {
        let mut score = 1.0;
        let dialogue_pattern = Regex::new(r"「([^」]*)」").unwrap();
        
        for cap in dialogue_pattern.captures_iter(text) {
            if let Some(dialogue) = cap.get(1) {
                let speech = dialogue.as_str();
                
                // 檢查語言正式程度
                let formality_score = self.check_formality_consistency(speech, &profile.speech_patterns);
                score = score.min(formality_score);
                
                // 檢查詞彙使用
                let vocabulary_score = self.check_vocabulary_consistency(speech, &profile.speech_patterns);
                score = score.min(vocabulary_score);
                
                // 檢查禁用詞彙
                for taboo in &profile.speech_patterns.taboo_words {
                    if speech.contains(taboo) {
                        score *= 0.7; // 嚴重扣分
                    }
                }
            }
        }

        Ok(score)
    }

    /// 分析行為一致性
    fn analyze_behavior_consistency(&self, text: &str, profile: &CharacterProfile) -> Result<f32, String> {
        let mut score = 1.0;
        
        // 檢查反應模式
        for (situation, expected_reaction) in &profile.behavioral_patterns.reaction_patterns {
            if text.contains(situation) {
                if !text.contains(expected_reaction) {
                    score *= 0.8; // 扣分
                }
            }
        }
        
        // 檢查道德底線
        for boundary in &profile.behavioral_patterns.moral_boundaries {
            if self.text_violates_moral_boundary(text, boundary) {
                score *= 0.6; // 嚴重扣分
            }
        }

        Ok(score)
    }

    /// 分析知識一致性
    fn analyze_knowledge_consistency(
        &self, 
        text: &str, 
        profile: &CharacterProfile, 
        _context: &IntelligentContext
    ) -> Result<f32, String> {
        let mut score = 1.0;
        
        // 檢查角色是否提到了不應該知道的資訊
        for knowledge in &profile.knowledge_base.known_facts {
            if knowledge.confidence_level < 0.5 && text.contains(&knowledge.fact) {
                score *= 0.9; // 輕微扣分
            }
        }
        
        // 檢查秘密洩露
        for secret in &profile.knowledge_base.secrets_kept {
            if text.contains(&secret.secret) {
                if let Some(conditions) = &secret.revelation_conditions {
                    if !text.contains(conditions) {
                        score *= 0.7; // 不當洩露秘密
                    }
                }
            }
        }

        Ok(score)
    }

    /// 分析情感一致性
    fn analyze_emotional_consistency(&self, text: &str, profile: &CharacterProfile) -> Result<f32, String> {
        let mut score = 1.0;
        
        // 檢查情緒表達是否符合角色設定
        for (emotion, expressions) in &profile.emotional_profile.emotional_expressions {
            if self.text_contains_emotion(text, emotion) {
                let has_appropriate_expression = expressions.iter()
                    .any(|expr| text.contains(expr));
                
                if !has_appropriate_expression {
                    score *= 0.85; // 情緒表達不當
                }
            }
        }

        Ok(score)
    }

    /// 更新角色狀態
    pub async fn update_character_state(
        &mut self,
        character_id: &str,
        chapter_id: &str,
        new_content: &str,
    ) -> Result<(), String> {
        if let Some(profile) = self.character_profiles.get_mut(character_id) {
            // 分析新內容中的角色變化
            let changes = self.extract_character_changes(new_content, profile).await?;
            
            // 更新角色成長軌跡
            for change in changes {
                profile.growth_trajectory.push(CharacterGrowthPoint {
                    chapter_reference: chapter_id.to_string(),
                    growth_type: change.change_type,
                    description: change.description,
                    significance: change.significance,
                    permanence: change.permanence,
                });
            }
            
            profile.last_updated = chrono::Utc::now();
        }

        Ok(())
    }

    // === 輔助方法 ===

    async fn extract_speech_patterns(&self, _character: &Character, attributes: &serde_json::Value) -> Result<SpeechPatterns, String> {
        // 從屬性中提取或推斷語言模式
        Ok(SpeechPatterns {
            vocabulary_level: attributes.get("vocabulary_level")
                .and_then(|v| v.as_str())
                .unwrap_or("casual")
                .to_string(),
            sentence_structure: "varied".to_string(),
            emotional_expressions: HashMap::new(),
            catchphrases: Vec::new(),
            speech_quirks: Vec::new(),
            formality_variations: HashMap::new(),
            cultural_markers: Vec::new(),
            taboo_words: Vec::new(),
        })
    }

    async fn extract_behavioral_patterns(&self, _character: &Character, attributes: &serde_json::Value) -> Result<BehavioralPatterns, String> {
        Ok(BehavioralPatterns {
            reaction_patterns: HashMap::new(),
            decision_making_style: attributes.get("decision_style")
                .and_then(|v| v.as_str())
                .unwrap_or("balanced")
                .to_string(),
            stress_responses: Vec::new(),
            comfort_behaviors: Vec::new(),
            conflict_style: "assertive".to_string(),
            leadership_style: None,
            moral_boundaries: Vec::new(),
            fears_and_phobias: Vec::new(),
        })
    }

    async fn build_knowledge_base(&self, _character: &Character) -> Result<KnowledgeBase, String> {
        Ok(KnowledgeBase {
            known_facts: Vec::new(),
            secrets_kept: Vec::new(),
            skills_and_abilities: Vec::new(),
            memories: Vec::new(),
            beliefs_and_values: Vec::new(),
        })
    }

    async fn build_emotional_profile(&self, _character: &Character, attributes: &serde_json::Value) -> Result<EmotionalProfile, String> {
        Ok(EmotionalProfile {
            base_temperament: attributes.get("temperament")
                .and_then(|v| v.as_str())
                .unwrap_or("sanguine")
                .to_string(),
            emotional_stability: 0.7,
            empathy_level: 0.6,
            emotional_intelligence: 0.7,
            trigger_emotions: HashMap::new(),
            emotional_recovery_time: HashMap::new(),
            emotional_expressions: HashMap::new(),
        })
    }

    async fn build_relationship_dynamics(&self, _character: &Character) -> Result<HashMap<String, RelationshipDynamic>, String> {
        Ok(HashMap::new())
    }

    fn extract_core_traits(&self, attributes: &serde_json::Value) -> Vec<String> {
        if let Some(personality) = attributes.get("personality").and_then(|v| v.as_str()) {
            personality.split(',').map(|s| s.trim().to_string()).collect()
        } else {
            Vec::new()
        }
    }

    fn check_formality_consistency(&self, _speech: &str, _patterns: &SpeechPatterns) -> f32 {
        // TODO: 實作正式程度檢查
        1.0
    }

    fn check_vocabulary_consistency(&self, _speech: &str, _patterns: &SpeechPatterns) -> f32 {
        // TODO: 實作詞彙一致性檢查
        1.0
    }

    fn text_violates_moral_boundary(&self, _text: &str, _boundary: &str) -> bool {
        // TODO: 實作道德底線檢查
        false
    }

    fn text_contains_emotion(&self, _text: &str, _emotion: &str) -> bool {
        // TODO: 實作情緒檢測
        false
    }

    async fn extract_character_changes(&self, _content: &str, _profile: &CharacterProfile) -> Result<Vec<CharacterChange>, String> {
        // TODO: 實作角色變化提取
        Ok(Vec::new())
    }

    fn default_consistency_rules() -> Vec<ConsistencyRule> {
        vec![
            ConsistencyRule {
                rule_id: "speech_formality".to_string(),
                rule_type: "speech".to_string(),
                condition: "角色的語言正式程度應保持一致".to_string(),
                expectation: "除非有特殊情況，否則不應突然改變說話風格".to_string(),
                severity: "medium".to_string(),
            },
            ConsistencyRule {
                rule_id: "moral_consistency".to_string(),
                rule_type: "behavior".to_string(),
                condition: "角色不應違背已建立的道德原則".to_string(),
                expectation: "行為應符合角色的價值觀".to_string(),
                severity: "high".to_string(),
            },
        ]
    }
}

/// 角色一致性分析結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterConsistencyAnalysis {
    pub character_id: String,
    pub overall_score: f32,
    pub speech_consistency: f32,
    pub behavior_consistency: f32,
    pub knowledge_consistency: f32,
    pub emotional_consistency: f32,
    pub violations: Vec<String>,
    pub suggestions: Vec<String>,
    pub confidence: f32,
}

/// 角色變化
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterChange {
    pub change_type: String,
    pub description: String,
    pub significance: f32,
    pub permanence: f32,
}

/// Tauri 命令：分析角色一致性
#[command]
pub async fn analyze_character_consistency_command(
    project_id: String,
    character_id: String,
    text: String,
    context: IntelligentContext,
) -> Result<CharacterConsistencyAnalysis, String> {
    let mut tracker = CharacterConsistencyTracker::new();
    tracker.load_character_profiles(&project_id).await?;
    
    tracker.analyze_character_consistency(&text, &character_id, &context).await
}

/// Tauri 命令：更新角色狀態
#[command]
pub async fn update_character_state_command(
    project_id: String,
    character_id: String,
    chapter_id: String,
    new_content: String,
) -> Result<(), String> {
    let mut tracker = CharacterConsistencyTracker::new();
    tracker.load_character_profiles(&project_id).await?;
    
    tracker.update_character_state(&character_id, &chapter_id, &new_content).await
}