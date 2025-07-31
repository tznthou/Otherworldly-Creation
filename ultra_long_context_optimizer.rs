// 超長上下文處理優化器
use crate::database::{get_db, models::*};
use rusqlite::Result as SqliteResult;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, BinaryHeap, VecDeque};
use tauri::command;
use std::cmp::Ordering;

/// 超長上下文優化器
pub struct UltraLongContextOptimizer {
    max_tokens: usize,
    compression_levels: Vec<CompressionLevel>,
    content_analyzer: ContentAnalyzer,
    context_cache: ContextCache,
    attention_mechanism: AttentionMechanism,
}

/// 壓縮等級配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionLevel {
    pub level: u8, // 1-5，1最輕微，5最激進
    pub name: String,
    pub description: String,
    pub compression_ratio: f32, // 0.1-1.0
    pub quality_loss: f32, // 0.0-1.0，品質損失程度
    pub strategies: Vec<CompressionStrategy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionStrategy {
    pub strategy_type: String, // "summarization", "elimination", "abstraction", "clustering"
    pub target_content: String, // "dialogue", "description", "action", "internal_thought"
    pub parameters: HashMap<String, f32>,
}

/// 內容分析器
#[derive(Debug, Clone)]
pub struct ContentAnalyzer {
    pub importance_weights: ImportanceWeights,
    pub semantic_analyzer: SemanticAnalyzer,
    pub redundancy_detector: RedundancyDetector,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportanceWeights {
    pub character_mention: f32,      // 角色提及的重要性
    pub plot_advancement: f32,       // 情節推進的重要性
    pub dialogue_weight: f32,        // 對話的重要性
    pub world_building: f32,         // 世界構建的重要性
    pub foreshadowing: f32,         // 伏筆的重要性
    pub conflict_escalation: f32,    // 衝突升級的重要性
    pub character_development: f32,  // 角色發展的重要性
    pub emotional_beats: f32,        // 情感節拍的重要性
}

#[derive(Debug, Clone)]
pub struct SemanticAnalyzer {
    pub concept_clusters: HashMap<String, Vec<String>>,
    pub semantic_similarity_threshold: f32,
    pub context_relationships: Vec<SemanticRelationship>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticRelationship {
    pub concept_a: String,
    pub concept_b: String,
    pub relationship_type: String, // "synonym", "antonym", "cause_effect", "part_whole"
    pub strength: f32, // 0-1
}

#[derive(Debug, Clone)]
pub struct RedundancyDetector {
    pub similarity_threshold: f32,
    pub redundant_patterns: Vec<RedundancyPattern>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedundancyPattern {
    pub pattern_type: String, // "repetitive_description", "circular_dialogue", "redundant_exposition"
    pub detection_regex: String,
    pub consolidation_strategy: String,
}

/// 上下文快取系統
#[derive(Debug, Clone)]
pub struct ContextCache {
    pub cache_entries: HashMap<String, CacheEntry>,
    pub access_patterns: AccessPatternTracker,
    pub max_cache_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry {
    pub cache_key: String,
    pub content_hash: String,
    pub compressed_content: String,
    pub original_length: usize,
    pub compressed_length: usize,
    pub compression_level: u8,
    pub quality_score: f32,
    pub access_count: u32,
    pub last_accessed: chrono::DateTime<chrono::Utc>,
    pub expiry_time: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone)]
pub struct AccessPatternTracker {
    pub access_frequency: HashMap<String, f32>,
    pub access_recency: HashMap<String, chrono::DateTime<chrono::Utc>>,
    pub access_prediction: HashMap<String, f32>, // 預測未來訪問機率
}

/// 注意力機制
#[derive(Debug, Clone)]
pub struct AttentionMechanism {
    pub attention_weights: HashMap<String, f32>,
    pub focus_zones: Vec<FocusZone>,
    pub attention_decay: AttentionDecay,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusZone {
    pub zone_id: String,
    pub content_type: String, // "current_scene", "active_characters", "main_plot", "subplot"
    pub weight: f32,
    pub radius: usize, // token範圍
    pub decay_rate: f32, // 權重衰減率
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttentionDecay {
    pub temporal_decay: f32,    // 時間衰減率
    pub spatial_decay: f32,     // 空間衰減率
    pub semantic_decay: f32,    // 語義衰減率
    pub importance_boost: f32,  // 重要性增強因子
}

/// 內容塊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentBlock {
    pub id: String,
    pub content: String,
    pub block_type: String, // "dialogue", "action", "description", "internal_thought"
    pub importance_score: f32,
    pub character_relevance: HashMap<String, f32>,
    pub plot_relevance: f32,
    pub temporal_position: usize,
    pub compression_resistance: f32, // 抗壓縮性，越高越不容易被壓縮
    pub semantic_tags: Vec<String>,
    pub dependencies: Vec<String>, // 依賴的其他塊ID
}

impl Ord for ContentBlock {
    fn cmp(&self, other: &Self) -> Ordering {
        self.importance_score.partial_cmp(&other.importance_score)
            .unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for ContentBlock {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for ContentBlock {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for ContentBlock {}

impl UltraLongContextOptimizer {
    pub fn new(max_tokens: usize) -> Self {
        Self {
            max_tokens,
            compression_levels: Self::default_compression_levels(),
            content_analyzer: ContentAnalyzer::new(),
            context_cache: ContextCache::new(),
            attention_mechanism: AttentionMechanism::new(),
        }
    }

    /// 優化超長上下文
    pub async fn optimize_ultra_long_context(
        &mut self,
        original_context: &str,
        focus_characters: &[String],
        current_scene_position: usize,
    ) -> Result<OptimizedContext, String> {
        // 1. 分析內容結構
        let content_blocks = self.analyze_content_structure(original_context).await?;
        
        // 2. 計算重要性分數
        let scored_blocks = self.calculate_importance_scores(content_blocks, focus_characters).await?;
        
        // 3. 檢測冗餘內容
        let deduplicated_blocks = self.detect_and_remove_redundancy(scored_blocks).await?;
        
        // 4. 應用注意力機制
        let attention_weighted_blocks = self.apply_attention_mechanism(
            deduplicated_blocks, 
            current_scene_position
        ).await?;
        
        // 5. 選擇最佳壓縮策略
        let compression_level = self.select_optimal_compression_level(&attention_weighted_blocks)?;
        
        // 6. 執行智能壓縮
        let compressed_context = self.execute_intelligent_compression(
            attention_weighted_blocks,
            compression_level,
        ).await?;
        
        // 7. 快取結果
        self.cache_optimized_context(&compressed_context).await?;
        
        Ok(compressed_context)
    }

    /// 分析內容結構
    async fn analyze_content_structure(&self, content: &str) -> Result<Vec<ContentBlock>, String> {
        let mut blocks = Vec::new();
        let mut current_id = 0;
        
        // 按段落分割內容
        let paragraphs: Vec<&str> = content.split("\n\n").collect();
        
        for paragraph in paragraphs {
            if paragraph.trim().is_empty() {
                continue;
            }
            
            let block = ContentBlock {
                id: format!("block_{}", current_id),
                content: paragraph.to_string(),
                block_type: self.classify_content_type(paragraph),
                importance_score: 0.0, // 稍後計算
                character_relevance: HashMap::new(),
                plot_relevance: 0.0,
                temporal_position: current_id,
                compression_resistance: self.calculate_compression_resistance(paragraph),
                semantic_tags: self.extract_semantic_tags(paragraph),
                dependencies: Vec::new(),
            };
            
            blocks.push(block);
            current_id += 1;
        }
        
        Ok(blocks)
    }

    /// 計算重要性分數
    async fn calculate_importance_scores(
        &self,
        mut blocks: Vec<ContentBlock>,
        focus_characters: &[String],
    ) -> Result<Vec<ContentBlock>, String> {
        for block in &mut blocks {
            let mut importance = 0.0;
            
            // 角色相關性
            let character_score = self.calculate_character_relevance(&block.content, focus_characters);
            importance += character_score * self.content_analyzer.importance_weights.character_mention;
            
            // 對話權重
            if block.block_type == "dialogue" {
                importance += self.content_analyzer.importance_weights.dialogue_weight;
            }
            
            // 情節推進檢測
            let plot_score = self.detect_plot_advancement(&block.content);
            importance += plot_score * self.content_analyzer.importance_weights.plot_advancement;
            
            // 伏筆檢測
            let foreshadowing_score = self.detect_foreshadowing(&block.content);
            importance += foreshadowing_score * self.content_analyzer.importance_weights.foreshadowing;
            
            // 角色發展檢測
            let character_dev_score = self.detect_character_development(&block.content);
            importance += character_dev_score * self.content_analyzer.importance_weights.character_development;
            
            // 情感節拍檢測
            let emotional_score = self.detect_emotional_beats(&block.content);
            importance += emotional_score * self.content_analyzer.importance_weights.emotional_beats;
            
            block.importance_score = importance.min(1.0);
        }
        
        Ok(blocks)
    }

    /// 檢測並移除冗餘內容
    async fn detect_and_remove_redundancy(&self, blocks: Vec<ContentBlock>) -> Result<Vec<ContentBlock>, String> {
        let mut deduplicated = Vec::new();
        let mut seen_concepts = HashSet::new();
        
        for block in blocks {
            let block_concepts = self.extract_key_concepts(&block.content);
            let mut is_redundant = false;
            
            // 檢查語義相似性
            for concept in &block_concepts {
                if seen_concepts.contains(concept) {
                    let similarity = self.calculate_semantic_similarity(&block, &deduplicated);
                    if similarity > self.content_analyzer.redundancy_detector.similarity_threshold {
                        is_redundant = true;
                        break;
                    }
                }
            }
            
            if !is_redundant || block.compression_resistance > 0.8 {
                for concept in block_concepts {
                    seen_concepts.insert(concept);
                }
                deduplicated.push(block);
            }
        }
        
        Ok(deduplicated)
    }

    /// 應用注意力機制
    async fn apply_attention_mechanism(
        &self,
        mut blocks: Vec<ContentBlock>,
        current_position: usize,
    ) -> Result<Vec<ContentBlock>, String> {
        for block in &mut blocks {
            let mut attention_weight = 1.0;
            
            // 距離衰減
            let distance = if block.temporal_position > current_position {
                block.temporal_position - current_position
            } else {
                current_position - block.temporal_position
            };
            
            let distance_decay = (-distance as f32 * self.attention_mechanism.attention_decay.temporal_decay).exp();
            attention_weight *= distance_decay;
            
            // 重要性增強
            if block.importance_score > 0.7 {
                attention_weight *= self.attention_mechanism.attention_decay.importance_boost;
            }
            
            block.importance_score *= attention_weight;
        }
        
        Ok(blocks)
    }

    /// 選擇最佳壓縮等級
    fn select_optimal_compression_level(&self, blocks: &[ContentBlock]) -> Result<CompressionLevel, String> {
        let total_tokens = self.estimate_total_tokens(blocks);
        
        if total_tokens <= self.max_tokens {
            return Ok(self.compression_levels[0].clone()); // 最輕微壓縮
        }
        
        let compression_ratio_needed = self.max_tokens as f32 / total_tokens as f32;
        
        // 選擇合適的壓縮等級
        for level in &self.compression_levels {
            if level.compression_ratio <= compression_ratio_needed {
                return Ok(level.clone());
            }
        }
        
        // 如果都不夠，使用最激進的壓縮
        Ok(self.compression_levels.last().unwrap().clone())
    }

    /// 執行智能壓縮
    async fn execute_intelligent_compression(
        &self,
        blocks: Vec<ContentBlock>,
        compression_level: CompressionLevel,
    ) -> Result<OptimizedContext, String> {
        // 使用二進制堆按重要性排序
        let mut priority_queue: BinaryHeap<ContentBlock> = blocks.into_iter().collect();
        let mut selected_blocks = Vec::new();
        let mut current_tokens = 0;
        
        // 選擇最重要的內容塊，直到達到token限制
        while let Some(block) = priority_queue.pop() {
            let block_tokens = self.estimate_block_tokens(&block);
            
            if current_tokens + block_tokens <= self.max_tokens {
                current_tokens += block_tokens;
                selected_blocks.push(block);
            } else {
                // 嘗試壓縮這個塊
                if let Ok(compressed_block) = self.compress_block(&block, &compression_level).await {
                    let compressed_tokens = self.estimate_block_tokens(&compressed_block);
                    if current_tokens + compressed_tokens <= self.max_tokens {
                        current_tokens += compressed_tokens;
                        selected_blocks.push(compressed_block);
                    }
                }
            }
        }
        
        // 按時間順序重新排列
        selected_blocks.sort_by_key(|block| block.temporal_position);
        
        // 組合最終內容
        let final_content = selected_blocks
            .iter()
            .map(|block| block.content.clone())
            .collect::<Vec<String>>()
            .join("\n\n");
        
        Ok(OptimizedContext {
            content: final_content,
            original_token_count: priority_queue.len() * 50, // 估算
            final_token_count: current_tokens,
            compression_ratio: current_tokens as f32 / (priority_queue.len() * 50) as f32,
            compression_level: compression_level.level,
            quality_score: self.calculate_context_quality(&selected_blocks),
            preserved_elements: self.identify_preserved_elements(&selected_blocks),
            lost_elements: self.identify_lost_elements(&selected_blocks),
            optimization_stats: OptimizationStats {
                blocks_processed: selected_blocks.len(),
                redundancy_removed: 0, // TODO: 計算
                attention_applied: true,
                compression_strategies_used: compression_level.strategies.clone(),
            },
        })
    }

    // === 輔助方法 ===

    fn classify_content_type(&self, content: &str) -> String {
        if content.contains("「") && content.contains("」") {
            "dialogue".to_string()
        } else if content.contains("想到") || content.contains("心中") {
            "internal_thought".to_string()
        } else if content.contains("走向") || content.contains("拿起") {
            "action".to_string()
        } else {
            "description".to_string()
        }
    }

    fn calculate_compression_resistance(&self, content: &str) -> f32 {
        let mut resistance = 0.0;
        
        // 對話有較高的抗壓縮性
        if content.contains("「") {
            resistance += 0.3;
        }
        
        // 角色名稱提及
        if content.chars().filter(|c| c.is_uppercase()).count() > 0 {
            resistance += 0.2;
        }
        
        // 情感詞彙
        let emotional_words = ["愛", "恨", "怒", "喜", "悲", "恐"];
        for word in &emotional_words {
            if content.contains(word) {
                resistance += 0.1;
                break;
            }
        }
        
        resistance.min(1.0)
    }

    fn extract_semantic_tags(&self, _content: &str) -> Vec<String> {
        // TODO: 使用NLP技術提取語義標籤
        Vec::new()
    }

    fn calculate_character_relevance(&self, content: &str, focus_characters: &[String]) -> f32 {
        let mut relevance = 0.0;
        for character in focus_characters {
            if content.contains(character) {
                relevance += 0.5;
            }
        }
        relevance.min(1.0)
    }

    fn detect_plot_advancement(&self, _content: &str) -> f32 {
        // TODO: 使用NLP檢測情節推進
        0.5
    }

    fn detect_foreshadowing(&self, _content: &str) -> f32 {
        // TODO: 檢測伏筆
        0.0
    }

    fn detect_character_development(&self, _content: &str) -> f32 {
        // TODO: 檢測角色發展
        0.3
    }

    fn detect_emotional_beats(&self, _content: &str) -> f32 {
        // TODO: 檢測情感節拍
        0.2
    }

    fn extract_key_concepts(&self, _content: &str) -> Vec<String> {
        // TODO: 提取關鍵概念
        Vec::new()
    }

    fn calculate_semantic_similarity(&self, _block: &ContentBlock, _others: &[ContentBlock]) -> f32 {
        // TODO: 計算語義相似性
        0.0
    }

    fn estimate_total_tokens(&self, blocks: &[ContentBlock]) -> usize {
        blocks.iter().map(|block| self.estimate_block_tokens(block)).sum()
    }

    fn estimate_block_tokens(&self, block: &ContentBlock) -> usize {
        // 中文約2字符=1token
        block.content.chars().count() / 2
    }

    async fn compress_block(&self, block: &ContentBlock, _level: &CompressionLevel) -> Result<ContentBlock, String> {
        // TODO: 實作塊壓縮
        Ok(block.clone())
    }

    fn calculate_context_quality(&self, _blocks: &[ContentBlock]) -> f32 {
        // TODO: 計算上下文品質
        0.8
    }

    fn identify_preserved_elements(&self, _blocks: &[ContentBlock]) -> Vec<String> {
        // TODO: 識別保留的元素
        Vec::new()
    }

    fn identify_lost_elements(&self, _blocks: &[ContentBlock]) -> Vec<String> {
        // TODO: 識別丟失的元素
        Vec::new()
    }

    async fn cache_optimized_context(&mut self, _context: &OptimizedContext) -> Result<(), String> {
        // TODO: 快取優化結果
        Ok(())
    }

    fn default_compression_levels() -> Vec<CompressionLevel> {
        vec![
            CompressionLevel {
                level: 1,
                name: "輕微壓縮".to_string(),
                description: "移除冗餘描述，保留所有重要內容".to_string(),
                compression_ratio: 0.9,
                quality_loss: 0.05,
                strategies: vec![
                    CompressionStrategy {
                        strategy_type: "elimination".to_string(),
                        target_content: "redundant_description".to_string(),
                        parameters: HashMap::new(),
                    }
                ],
            },
            CompressionLevel {
                level: 2,
                name: "中等壓縮".to_string(),
                description: "摘要非關鍵段落，壓縮描述性內容".to_string(),
                compression_ratio: 0.7,
                quality_loss: 0.15,
                strategies: vec![
                    CompressionStrategy {
                        strategy_type: "summarization".to_string(),
                        target_content: "description".to_string(),
                        parameters: HashMap::new(),
                    }
                ],
            },
            CompressionLevel {
                level: 3,
                name: "激進壓縮".to_string(),
                description: "大幅縮減內容，僅保留核心情節和對話".to_string(),
                compression_ratio: 0.5,
                quality_loss: 0.3,
                strategies: vec![
                    CompressionStrategy {
                        strategy_type: "abstraction".to_string(),
                        target_content: "all".to_string(),
                        parameters: HashMap::new(),
                    }
                ],
            },
        ]
    }
}

// === 相關結構體實作 ===

impl ContentAnalyzer {
    fn new() -> Self {
        Self {
            importance_weights: ImportanceWeights::default(),
            semantic_analyzer: SemanticAnalyzer::new(),
            redundancy_detector: RedundancyDetector::new(),
        }
    }
}

impl Default for ImportanceWeights {
    fn default() -> Self {
        Self {
            character_mention: 0.3,
            plot_advancement: 0.4,
            dialogue_weight: 0.3,
            world_building: 0.2,
            foreshadowing: 0.5,
            conflict_escalation: 0.4,
            character_development: 0.35,
            emotional_beats: 0.25,
        }
    }
}

impl SemanticAnalyzer {
    fn new() -> Self {
        Self {
            concept_clusters: HashMap::new(),
            semantic_similarity_threshold: 0.7,
            context_relationships: Vec::new(),
        }
    }
}

impl RedundancyDetector {
    fn new() -> Self {
        Self {
            similarity_threshold: 0.8,
            redundant_patterns: Vec::new(),
        }
    }
}

impl ContextCache {
    fn new() -> Self {
        Self {
            cache_entries: HashMap::new(),
            access_patterns: AccessPatternTracker::new(),
            max_cache_size: 100,
        }
    }
}

impl AccessPatternTracker {
    fn new() -> Self {
        Self {
            access_frequency: HashMap::new(),
            access_recency: HashMap::new(),
            access_prediction: HashMap::new(),
        }
    }
}

impl AttentionMechanism {
    fn new() -> Self {
        Self {
            attention_weights: HashMap::new(),
            focus_zones: Vec::new(),
            attention_decay: AttentionDecay::default(),
        }
    }
}

impl Default for AttentionDecay {
    fn default() -> Self {
        Self {
            temporal_decay: 0.1,
            spatial_decay: 0.05,
            semantic_decay: 0.08,
            importance_boost: 1.5,
        }
    }
}

/// 優化後的上下文結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizedContext {
    pub content: String,
    pub original_token_count: usize,
    pub final_token_count: usize,
    pub compression_ratio: f32,
    pub compression_level: u8,
    pub quality_score: f32, // 0-1
    pub preserved_elements: Vec<String>,
    pub lost_elements: Vec<String>,
    pub optimization_stats: OptimizationStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationStats {
    pub blocks_processed: usize,
    pub redundancy_removed: usize,
    pub attention_applied: bool,
    pub compression_strategies_used: Vec<CompressionStrategy>,
}

/// Tauri 命令：優化超長上下文
#[command]
pub async fn optimize_ultra_long_context_command(
    original_context: String,
    max_tokens: usize,
    focus_characters: Vec<String>,
    current_position: usize,
) -> Result<OptimizedContext, String> {
    let mut optimizer = UltraLongContextOptimizer::new(max_tokens);
    
    optimizer.optimize_ultra_long_context(
        &original_context,
        &focus_characters,
        current_position,
    ).await
}

use std::collections::HashSet;