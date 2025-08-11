use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::{Result, TranslationError};

/// 提示詞優化器
/// 
/// 功能：
/// 1. 針對不同 AI 模型優化提示詞格式
/// 2. 自動調整權重和優先級
/// 3. 負面提示詞生成
/// 4. 提示詞品質分析和評估
pub struct PromptOptimizer {
    model_configs: HashMap<String, ModelConfig>,
    optimization_rules: Vec<OptimizationRule>,
}

/// 優化等級
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationLevel {
    /// 基礎優化
    Basic,
    /// 標準優化
    Standard,
    /// 高級優化
    Advanced,
    /// 專家級優化
    Expert,
}

/// 提示詞風格
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PromptStyle {
    /// 簡潔風格
    Concise,
    /// 詳細風格
    Detailed,
    /// 藝術風格
    Artistic,
    /// 技術風格
    Technical,
    /// 自然語言風格
    Natural,
}

/// 優化請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationRequest {
    pub base_prompt: String,
    pub target_model: String, // "stable_diffusion", "midjourney", "dalle", etc.
    pub optimization_level: OptimizationLevel,
    pub prompt_style: PromptStyle,
    pub include_negative_prompt: bool,
    pub max_length: Option<usize>,
    pub quality_focus: Vec<QualityFocus>,
}

/// 品質焦點
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QualityFocus {
    /// 角色一致性
    CharacterConsistency,
    /// 藝術品質
    ArtisticQuality,
    /// 細節豐富度
    DetailRichness,
    /// 構圖美感
    Composition,
    /// 光影效果
    Lighting,
    /// 色彩和諧
    ColorHarmony,
}

/// 優化結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub optimized_prompt: String,
    pub negative_prompt: Option<String>,
    pub improvement_score: f64, // 改善分數 0.0-1.0
    
    // 詳細資訊
    pub applied_optimizations: Vec<String>,
    pub prompt_analysis: PromptAnalysis,
    pub model_specific_adjustments: Vec<String>,
    
    // 建議
    pub further_improvements: Vec<String>,
    pub estimated_generation_quality: f64,
    
    // 統計
    pub processing_time_ms: u64,
    pub token_count_estimate: usize,
}

/// 提示詞分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptAnalysis {
    pub readability_score: f64,    // 可讀性分數
    pub specificity_score: f64,    // 具體性分數
    pub coherence_score: f64,      // 連貫性分數
    pub keyword_density: f64,       // 關鍵詞密度
    pub redundancy_ratio: f64,      // 冗餘比例
    pub missing_elements: Vec<String>, // 缺失元素
}

/// 模型配置
#[derive(Debug, Clone)]
struct ModelConfig {
    #[allow(dead_code)]
    name: String,
    max_prompt_length: usize,
    supports_negative_prompts: bool,
    preferred_separators: Vec<String>,
    quality_keywords: Vec<String>,
    style_keywords: HashMap<PromptStyle, Vec<String>>,
    #[allow(dead_code)]
    weight_syntax: WeightSyntax,
}

/// 權重語法
#[derive(Debug, Clone)]
enum WeightSyntax {
    /// Stable Diffusion 風格：(keyword:weight)
    StableDiffusion,
    /// NovelAI 風格：{keyword}
    #[allow(dead_code)]
    NovelAI,
    /// Midjourney 風格：keyword::weight
    Midjourney,
    /// 無權重支援
    None,
}

/// 優化規則
#[derive(Debug, Clone)]
struct OptimizationRule {
    name: String,
    condition: RuleCondition,
    action: RuleAction,
    #[allow(dead_code)]
    priority: i32,
}

/// 規則條件
#[derive(Debug, Clone)]
enum RuleCondition {
    /// 包含特定關鍵詞
    #[allow(dead_code)]
    ContainsKeyword(String),
    /// 提示詞長度超過閾值
    LengthExceeds(usize),
    /// 缺少品質關鍵詞
    MissingQualityKeywords,
    /// 重複詞彙過多
    ExcessiveRepetition,
}

/// 規則動作
#[derive(Debug, Clone)]
enum RuleAction {
    /// 添加關鍵詞
    AddKeyword(String),
    /// 移除關鍵詞
    #[allow(dead_code)]
    RemoveKeyword(String),
    /// 重新排序
    Reorder,
    /// 添加權重
    #[allow(dead_code)]
    AddWeight(String, f64),
    /// 合併相似詞彙
    MergeSimilar,
}

impl PromptOptimizer {
    /// 創建新的提示詞優化器
    pub fn new() -> Self {
        let model_configs = Self::build_model_configs();
        let optimization_rules = Self::build_optimization_rules();

        Self {
            model_configs,
            optimization_rules,
        }
    }

    /// 建立模型配置
    fn build_model_configs() -> HashMap<String, ModelConfig> {
        let mut configs = HashMap::new();

        // Stable Diffusion 配置
        let sd_config = ModelConfig {
            name: "stable_diffusion".to_string(),
            max_prompt_length: 400,
            supports_negative_prompts: true,
            preferred_separators: vec![", ".to_string()],
            quality_keywords: vec![
                "masterpiece".to_string(),
                "best quality".to_string(),
                "high resolution".to_string(),
                "detailed".to_string(),
                "ultra detailed".to_string(),
            ],
            style_keywords: {
                let mut styles = HashMap::new();
                styles.insert(PromptStyle::Artistic, vec![
                    "artstation".to_string(),
                    "concept art".to_string(),
                    "trending".to_string(),
                ]);
                styles.insert(PromptStyle::Detailed, vec![
                    "highly detailed".to_string(),
                    "intricate".to_string(),
                    "fine details".to_string(),
                ]);
                styles
            },
            weight_syntax: WeightSyntax::StableDiffusion,
        };
        configs.insert("stable_diffusion".to_string(), sd_config);

        // Midjourney 配置
        let mj_config = ModelConfig {
            name: "midjourney".to_string(),
            max_prompt_length: 300,
            supports_negative_prompts: false,
            preferred_separators: vec![", ".to_string(), " ".to_string()],
            quality_keywords: vec![
                "8k".to_string(),
                "highly detailed".to_string(),
                "professional".to_string(),
            ],
            style_keywords: {
                let mut styles = HashMap::new();
                styles.insert(PromptStyle::Artistic, vec![
                    "artistic".to_string(),
                    "beautiful".to_string(),
                    "stunning".to_string(),
                ]);
                styles
            },
            weight_syntax: WeightSyntax::Midjourney,
        };
        configs.insert("midjourney".to_string(), mj_config);

        // DALL-E 配置
        let dalle_config = ModelConfig {
            name: "dalle".to_string(),
            max_prompt_length: 1000,
            supports_negative_prompts: false,
            preferred_separators: vec![", ".to_string()],
            quality_keywords: vec![
                "high quality".to_string(),
                "detailed".to_string(),
                "professional".to_string(),
            ],
            style_keywords: {
                let mut styles = HashMap::new();
                styles.insert(PromptStyle::Natural, vec![
                    "realistic".to_string(),
                    "photographic".to_string(),
                ]);
                styles
            },
            weight_syntax: WeightSyntax::None,
        };
        configs.insert("dalle".to_string(), dalle_config);

        configs
    }

    /// 建立優化規則
    fn build_optimization_rules() -> Vec<OptimizationRule> {
        vec![
            OptimizationRule {
                name: "Add Quality Keywords".to_string(),
                condition: RuleCondition::MissingQualityKeywords,
                action: RuleAction::AddKeyword("high quality, detailed".to_string()),
                priority: 10,
            },
            OptimizationRule {
                name: "Remove Excessive Length".to_string(),
                condition: RuleCondition::LengthExceeds(500),
                action: RuleAction::Reorder,
                priority: 8,
            },
            OptimizationRule {
                name: "Merge Similar Terms".to_string(),
                condition: RuleCondition::ExcessiveRepetition,
                action: RuleAction::MergeSimilar,
                priority: 6,
            },
        ]
    }

    /// 執行提示詞優化
    pub fn optimize(&self, request: OptimizationRequest) -> Result<OptimizationResult> {
        let start_time = std::time::Instant::now();
        
        log::info!("[PromptOptimizer] 開始優化提示詞，目標模型: {}", request.target_model);

        // 1. 獲取模型配置
        let model_config = self.model_configs.get(&request.target_model)
            .ok_or_else(|| TranslationError::OptimizationError(
                format!("不支援的模型: {}", request.target_model)
            ))?;

        // 2. 分析原始提示詞
        let initial_analysis = self.analyze_prompt(&request.base_prompt)?;

        // 3. 應用優化規則
        let mut optimized_prompt = request.base_prompt.clone();
        let mut applied_optimizations = Vec::new();

        for rule in &self.optimization_rules {
            if self.should_apply_rule(rule, &optimized_prompt)? {
                optimized_prompt = self.apply_rule_action(&rule.action, optimized_prompt)?;
                applied_optimizations.push(rule.name.clone());
            }
        }

        // 4. 模型特定優化
        let model_adjustments = self.apply_model_specific_optimizations(
            &optimized_prompt,
            model_config,
            &request
        )?;
        optimized_prompt = model_adjustments.0;
        let model_specific_adjustments = model_adjustments.1;

        // 5. 生成負面提示詞
        let negative_prompt = if request.include_negative_prompt && model_config.supports_negative_prompts {
            Some(self.generate_negative_prompt(&request)?)
        } else {
            None
        };

        // 6. 最終分析和品質評估
        let final_analysis = self.analyze_prompt(&optimized_prompt)?;
        let improvement_score = self.calculate_improvement_score(&initial_analysis, &final_analysis);

        let processing_time = start_time.elapsed().as_millis() as u64;
        let token_count = self.estimate_token_count(&optimized_prompt);

        let result = OptimizationResult {
            optimized_prompt,
            negative_prompt,
            improvement_score,
            applied_optimizations,
            prompt_analysis: final_analysis,
            model_specific_adjustments,
            further_improvements: self.suggest_further_improvements(&initial_analysis),
            estimated_generation_quality: improvement_score * 0.8 + 0.2, // 基礎品質分數
            processing_time_ms: processing_time,
            token_count_estimate: token_count,
        };

        log::info!("[PromptOptimizer] 優化完成，改善分數: {:.2}, 預估品質: {:.2}", 
                   result.improvement_score, result.estimated_generation_quality);

        Ok(result)
    }

    /// 分析提示詞
    fn analyze_prompt(&self, prompt: &str) -> Result<PromptAnalysis> {
        let words: Vec<&str> = prompt.split_whitespace().collect();
        let total_words = words.len();

        // 可讀性分數（基於詞彙數量和複雜度）
        let readability_score = if total_words > 0 {
            (1.0 - (total_words as f64 / 100.0).min(1.0)) * 0.6 + 0.4
        } else {
            0.0
        };

        // 具體性分數（檢查是否包含具體描述詞）
        let specific_keywords = [
            "detailed", "high quality", "masterpiece", "professional",
            "8k", "4k", "ultra detailed", "intricate"
        ];
        let specificity_count = specific_keywords.iter()
            .filter(|&&keyword| prompt.to_lowercase().contains(keyword))
            .count();
        let specificity_score = (specificity_count as f64 / specific_keywords.len() as f64).min(1.0);

        // 連貫性分數（簡化計算：檢查逗號分隔的合理性）
        let comma_count = prompt.matches(',').count();
        let coherence_score = if total_words > 0 {
            let comma_ratio = comma_count as f64 / total_words as f64;
            if comma_ratio > 0.1 && comma_ratio < 0.3 {
                1.0
            } else {
                0.7
            }
        } else {
            0.0
        };

        // 關鍵詞密度
        let unique_words: std::collections::HashSet<&str> = words.iter().cloned().collect();
        let keyword_density = if total_words > 0 {
            unique_words.len() as f64 / total_words as f64
        } else {
            0.0
        };

        // 冗餘比例
        let redundancy_ratio = if total_words > 0 {
            1.0 - keyword_density
        } else {
            0.0
        };

        // 檢查缺失元素
        let mut missing_elements = Vec::new();
        if !prompt.to_lowercase().contains("quality") {
            missing_elements.push("品質關鍵詞".to_string());
        }
        if prompt.len() < 20 {
            missing_elements.push("描述詳細度".to_string());
        }
        if !prompt.contains("anime") && !prompt.contains("realistic") {
            missing_elements.push("風格指定".to_string());
        }

        Ok(PromptAnalysis {
            readability_score,
            specificity_score,
            coherence_score,
            keyword_density,
            redundancy_ratio,
            missing_elements,
        })
    }

    /// 檢查是否應該應用規則
    fn should_apply_rule(&self, rule: &OptimizationRule, prompt: &str) -> Result<bool> {
        match &rule.condition {
            RuleCondition::ContainsKeyword(keyword) => {
                Ok(prompt.to_lowercase().contains(&keyword.to_lowercase()))
            },
            RuleCondition::LengthExceeds(max_length) => {
                Ok(prompt.len() > *max_length)
            },
            RuleCondition::MissingQualityKeywords => {
                let quality_keywords = ["quality", "detailed", "masterpiece", "professional"];
                let has_quality = quality_keywords.iter()
                    .any(|&keyword| prompt.to_lowercase().contains(keyword));
                Ok(!has_quality)
            },
            RuleCondition::ExcessiveRepetition => {
                let words: Vec<&str> = prompt.split_whitespace().collect();
                let unique_words: std::collections::HashSet<&str> = words.iter().cloned().collect();
                let repetition_ratio = 1.0 - (unique_words.len() as f64 / words.len() as f64);
                Ok(repetition_ratio > 0.3)
            },
        }
    }

    /// 應用規則動作
    fn apply_rule_action(&self, action: &RuleAction, prompt: String) -> Result<String> {
        match action {
            RuleAction::AddKeyword(keyword) => {
                Ok(format!("{}, {}", keyword, prompt))
            },
            RuleAction::RemoveKeyword(keyword) => {
                Ok(prompt.replace(keyword, "").replace("  ", " ").trim().to_string())
            },
            RuleAction::Reorder => {
                // 簡化的重排序：將品質關鍵詞移到前面
                let mut parts: Vec<&str> = prompt.split(", ").collect();
                parts.sort_by(|a, b| {
                    let a_is_quality = a.to_lowercase().contains("quality") || 
                                     a.to_lowercase().contains("detailed") ||
                                     a.to_lowercase().contains("masterpiece");
                    let b_is_quality = b.to_lowercase().contains("quality") || 
                                     b.to_lowercase().contains("detailed") ||
                                     b.to_lowercase().contains("masterpiece");
                    
                    match (a_is_quality, b_is_quality) {
                        (true, false) => std::cmp::Ordering::Less,
                        (false, true) => std::cmp::Ordering::Greater,
                        _ => std::cmp::Ordering::Equal,
                    }
                });
                Ok(parts.join(", "))
            },
            RuleAction::AddWeight(_keyword, _weight) => {
                // 簡化實現：暫時不添加權重語法
                Ok(prompt)
            },
            RuleAction::MergeSimilar => {
                // 簡化實現：移除重複詞彙
                let parts: Vec<&str> = prompt.split(", ").collect();
                let mut unique_parts = Vec::new();
                let mut seen = std::collections::HashSet::new();
                
                for part in parts {
                    if seen.insert(part.trim().to_lowercase()) {
                        unique_parts.push(part.trim());
                    }
                }
                
                Ok(unique_parts.join(", "))
            },
        }
    }

    /// 應用模型特定優化
    fn apply_model_specific_optimizations(
        &self,
        prompt: &str,
        model_config: &ModelConfig,
        request: &OptimizationRequest,
    ) -> Result<(String, Vec<String>)> {
        let mut optimized = prompt.to_string();
        let mut adjustments = Vec::new();

        // 1. 添加品質關鍵詞
        match request.optimization_level {
            OptimizationLevel::Expert | OptimizationLevel::Advanced => {
                if !model_config.quality_keywords.is_empty() {
                    let quality_prefix = model_config.quality_keywords.join(", ");
                    optimized = format!("{}, {}", quality_prefix, optimized);
                    adjustments.push("添加高品質關鍵詞".to_string());
                }
            },
            OptimizationLevel::Standard => {
                if let Some(first_quality) = model_config.quality_keywords.first() {
                    optimized = format!("{}, {}", first_quality, optimized);
                    adjustments.push("添加品質關鍵詞".to_string());
                }
            },
            OptimizationLevel::Basic => {
                // 基礎級別不添加品質關鍵詞
            }
        }

        // 2. 添加風格關鍵詞
        if let Some(style_keywords) = model_config.style_keywords.get(&request.prompt_style) {
            if let Some(style_keyword) = style_keywords.first() {
                optimized = format!("{}, {}", optimized, style_keyword);
                adjustments.push("添加風格關鍵詞".to_string());
            }
        }

        // 3. 長度限制
        if optimized.len() > model_config.max_prompt_length {
            optimized.truncate(model_config.max_prompt_length);
            if let Some(last_comma) = optimized.rfind(", ") {
                optimized.truncate(last_comma);
            }
            adjustments.push("應用長度限制".to_string());
        }

        // 4. 分隔符標準化
        if let Some(separator) = model_config.preferred_separators.first() {
            optimized = optimized.replace(", ", separator);
            if separator != ", " {
                adjustments.push("標準化分隔符".to_string());
            }
        }

        Ok((optimized, adjustments))
    }

    /// 生成負面提示詞
    fn generate_negative_prompt(&self, request: &OptimizationRequest) -> Result<String> {
        let mut negative_terms = vec![
            "low quality",
            "worst quality", 
            "blurry",
            "pixelated",
            "artifacts",
            "jpeg artifacts",
            "distorted",
            "bad anatomy",
            "poorly drawn",
            "amateur",
        ];

        // 根據品質焦點添加特定負面詞彙
        for focus in &request.quality_focus {
            match focus {
                QualityFocus::CharacterConsistency => {
                    negative_terms.extend([
                        "inconsistent character",
                        "multiple characters",
                        "character variation",
                    ]);
                },
                QualityFocus::ArtisticQuality => {
                    negative_terms.extend([
                        "amateur art",
                        "poor composition",
                        "bad proportions",
                    ]);
                },
                QualityFocus::DetailRichness => {
                    negative_terms.extend([
                        "simple",
                        "lacking detail",
                        "minimalistic",
                    ]);
                },
                QualityFocus::Lighting => {
                    negative_terms.extend([
                        "bad lighting",
                        "harsh shadows",
                        "overexposed",
                        "underexposed",
                    ]);
                },
                QualityFocus::ColorHarmony => {
                    negative_terms.extend([
                        "color clash",
                        "oversaturated",
                        "washed out colors",
                    ]);
                },
                _ => {}
            }
        }

        Ok(negative_terms.join(", "))
    }

    /// 計算改善分數
    fn calculate_improvement_score(&self, initial: &PromptAnalysis, final_analysis: &PromptAnalysis) -> f64 {
        let improvements = vec![
            (final_analysis.readability_score - initial.readability_score).max(0.0),
            (final_analysis.specificity_score - initial.specificity_score).max(0.0),
            (final_analysis.coherence_score - initial.coherence_score).max(0.0),
            (final_analysis.keyword_density - initial.keyword_density).max(0.0),
            (initial.redundancy_ratio - final_analysis.redundancy_ratio).max(0.0), // 冗餘降低是好的
        ];

        let average_improvement = improvements.iter().sum::<f64>() / improvements.len() as f64;
        average_improvement.min(1.0).max(0.0)
    }

    /// 建議進一步改善
    fn suggest_further_improvements(&self, analysis: &PromptAnalysis) -> Vec<String> {
        let mut suggestions = Vec::new();

        if analysis.specificity_score < 0.5 {
            suggestions.push("考慮添加更多具體的描述詞彙".to_string());
        }

        if analysis.readability_score < 0.6 {
            suggestions.push("簡化提示詞結構以提高可讀性".to_string());
        }

        if analysis.redundancy_ratio > 0.3 {
            suggestions.push("移除重複或相似的詞彙".to_string());
        }

        if !analysis.missing_elements.is_empty() {
            suggestions.push(format!("考慮添加: {}", analysis.missing_elements.join(", ")));
        }

        suggestions
    }

    /// 估算 token 數量
    fn estimate_token_count(&self, prompt: &str) -> usize {
        // 簡化估算：平均每個詞約 1.3 個 token
        let word_count = prompt.split_whitespace().count();
        (word_count as f64 * 1.3) as usize
    }
}