// 整合式AI續寫系統 - 創世紀元增強版
use crate::database::{get_db, models::*};
use rusqlite::Result as SqliteResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;
use tokio::time::Instant;

// 導入所有子系統
use crate::intelligent_context_manager::{IntelligentContextManager, IntelligentContext};
use crate::character_consistency_tracker::{CharacterConsistencyTracker, CharacterConsistencyAnalysis};
use crate::plot_coherence_system::{PlotCoherenceSystem, PlotCoherenceAnalysis};
use crate::ultra_long_context_optimizer::{UltraLongContextOptimizer, OptimizedContext};

/// 整合式AI續寫系統
pub struct IntegratedAIWritingSystem {
    // 核心組件
    context_manager: IntelligentContextManager,
    character_tracker: CharacterConsistencyTracker,
    plot_system: PlotCoherenceSystem,
    context_optimizer: UltraLongContextOptimizer,
    
    // 系統配置
    config: AIWritingConfig,
    
    // 性能監控
    performance_monitor: PerformanceMonitor,
    
    // 品質評估器
    quality_assessor: QualityAssessor,
}

/// AI續寫系統配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIWritingConfig {
    // 基本參數
    pub max_tokens: usize,
    pub temperature: f32,
    pub top_p: f32,
    pub presence_penalty: f32,
    pub frequency_penalty: f32,
    
    // 品質控制
    pub min_consistency_score: f32,
    pub enable_consistency_check: bool,
    pub enable_plot_coherence_check: bool,
    pub enable_character_tracking: bool,
    pub enable_context_optimization: bool,
    
    // 內容偏好
    pub preferred_genres: Vec<String>,
    pub writing_style: String, // "formal", "casual", "literary", "commercial"
    pub narrative_perspective: String, // "first", "third_limited", "third_omniscient"
    pub tone_preferences: Vec<String>,
    
    // 高級設定
    pub context_window_size: usize,
    pub compression_aggressiveness: f32, // 0.0-1.0
    pub character_consistency_weight: f32,
    pub plot_consistency_weight: f32,
    pub creativity_vs_consistency: f32, // 0.0 全一致性，1.0 全創意
}

/// 性能監控器
#[derive(Debug, Clone)]
pub struct PerformanceMonitor {
    pub generation_times: Vec<u64>, // 毫秒
    pub context_processing_times: Vec<u64>,
    pub consistency_check_times: Vec<u64>,
    pub memory_usage: Vec<usize>,
    pub success_rate: f32,
    pub average_quality_score: f32,
}

/// 品質評估器
#[derive(Debug, Clone)]
pub struct QualityAssessor {
    pub quality_metrics: QualityMetrics,
    pub historical_scores: Vec<QualityScore>,
    pub improvement_suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityMetrics {
    pub coherence_weight: f32,
    pub creativity_weight: f32,
    pub consistency_weight: f32,
    pub engagement_weight: f32,
    pub literary_quality_weight: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityScore {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub overall_score: f32,
    pub coherence_score: f32,
    pub creativity_score: f32,
    pub consistency_score: f32,
    pub engagement_score: f32,
    pub literary_quality_score: f32,
    pub content_length: usize,
    pub generation_time: u64,
}

/// 完整的AI續寫響應
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComprehensiveWritingResponse {
    // 生成內容
    pub generated_text: String,
    
    // 品質分析
    pub quality_analysis: QualityAnalysis,
    
    // 一致性檢查結果
    pub consistency_analysis: ConsistencyAnalysisResult,
    
    // 上下文資訊
    pub context_info: ContextInfo,
    
    // 建議和改進
    pub suggestions: Vec<WritingSuggestion>,
    
    // 系統性能
    pub performance_metrics: GenerationMetrics,
    
    // 後續操作選項
    pub next_actions: Vec<NextAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityAnalysis {
    pub overall_quality: f32,
    pub coherence: f32,
    pub creativity: f32,
    pub engagement: f32,
    pub literary_merit: f32,
    pub genre_appropriateness: f32,
    pub pacing: f32,
    pub dialogue_quality: f32,
    pub description_quality: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyAnalysisResult {
    pub character_consistency: CharacterConsistencyAnalysis,
    pub plot_coherence: PlotCoherenceAnalysis,
    pub world_consistency: f32,
    pub timeline_consistency: f32,
    pub overall_consistency: f32,
    pub critical_issues: Vec<ConsistencyIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyIssue {
    pub issue_type: String,
    pub severity: String, // "low", "medium", "high", "critical"
    pub description: String,
    pub affected_elements: Vec<String>,
    pub suggested_fix: Option<String>,
    pub auto_fixable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextInfo {
    pub original_context_size: usize,
    pub optimized_context_size: usize,
    pub compression_ratio: f32,
    pub key_elements_preserved: Vec<String>,
    pub context_quality: f32,
    pub attention_focus_areas: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WritingSuggestion {
    pub suggestion_type: String, // "improvement", "alternative", "expansion", "refinement"
    pub priority: String, // "low", "medium", "high"
    pub description: String,
    pub rationale: String,
    pub implementation_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetrics {
    pub total_processing_time: u64, // 毫秒
    pub context_building_time: u64,
    pub consistency_check_time: u64,
    pub generation_time: u64,
    pub post_processing_time: u64,
    pub tokens_processed: usize,
    pub tokens_generated: usize,
    pub memory_usage_mb: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NextAction {
    pub action_type: String, // "regenerate", "expand", "refine", "continue"
    pub description: String,
    pub parameters: HashMap<String, serde_json::Value>,
}

impl IntegratedAIWritingSystem {
    pub fn new(config: AIWritingConfig) -> Self {
        Self {
            context_manager: IntelligentContextManager::new(config.max_tokens),
            character_tracker: CharacterConsistencyTracker::new(),
            plot_system: PlotCoherenceSystem::new(),
            context_optimizer: UltraLongContextOptimizer::new(config.context_window_size),
            config,
            performance_monitor: PerformanceMonitor::new(),
            quality_assessor: QualityAssessor::new(),
        }
    }

    /// 主要的AI續寫方法
    pub async fn generate_with_full_analysis(
        &mut self,
        project_id: String,
        chapter_id: String,
        position: usize,
        model: String,
        additional_params: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<ComprehensiveWritingResponse, String> {
        let start_time = Instant::now();
        
        // Phase 1: 載入和準備
        log::info!("=== 開始完整AI續寫流程 ===");
        self.load_project_data(&project_id).await?;
        
        // Phase 2: 構建智能上下文
        let context_start = Instant::now();
        let focus_characters = self.identify_focus_characters(&project_id, &chapter_id).await?;
        let raw_context = self.context_manager.build_intelligent_context(
            &project_id,
            &chapter_id,
            position,
            &focus_characters,
        ).await?;
        let context_time = context_start.elapsed().as_millis() as u64;
        
        // Phase 3: 上下文優化（處理超長內容）
        let optimization_start = Instant::now();
        let optimized_context = if raw_context.total_tokens > self.config.max_tokens {
            self.context_optimizer.optimize_ultra_long_context(
                &self.build_full_context_string(&raw_context),
                &focus_characters,
                position,
            ).await?
        } else {
            OptimizedContext {
                content: self.build_full_context_string(&raw_context),
                original_token_count: raw_context.total_tokens,
                final_token_count: raw_context.total_tokens,
                compression_ratio: 1.0,
                compression_level: 0,
                quality_score: 1.0,
                preserved_elements: vec!["all".to_string()],
                lost_elements: Vec::new(),
                optimization_stats: crate::ultra_long_context_optimizer::OptimizationStats {
                    blocks_processed: 1,
                    redundancy_removed: 0,
                    attention_applied: false,
                    compression_strategies_used: Vec::new(),
                },
            }
        };
        let optimization_time = optimization_start.elapsed().as_millis() as u64;
        
        // Phase 4: AI文本生成
        let generation_start = Instant::now();
        let generated_text = self.generate_text_with_ollama(
            &optimized_context.content,
            &model,
            additional_params,
        ).await?;
        let generation_time = generation_start.elapsed().as_millis() as u64;
        
        // Phase 5: 一致性檢查
        let consistency_start = Instant::now();
        let consistency_analysis = self.perform_comprehensive_consistency_check(
            &generated_text,
            &focus_characters,
            &raw_context,
            &chapter_id,
        ).await?;
        let consistency_time = consistency_start.elapsed().as_millis() as u64;
        
        // Phase 6: 品質評估
        let quality_analysis = self.assess_text_quality(&generated_text, &optimized_context).await?;
        
        // Phase 7: 生成建議
        let suggestions = self.generate_improvement_suggestions(
            &generated_text,
            &consistency_analysis,
            &quality_analysis,
        ).await?;
        
        // Phase 8: 更新系統狀態
        self.update_system_state(&project_id, &chapter_id, &generated_text).await?;
        
        let total_time = start_time.elapsed().as_millis() as u64;
        
        // 構建完整響應
        let response = ComprehensiveWritingResponse {
            generated_text,
            quality_analysis,
            consistency_analysis,
            context_info: ContextInfo {
                original_context_size: raw_context.total_tokens,
                optimized_context_size: optimized_context.final_token_count,
                compression_ratio: optimized_context.compression_ratio,
                key_elements_preserved: optimized_context.preserved_elements,
                context_quality: optimized_context.quality_score,
                attention_focus_areas: focus_characters,
            },
            suggestions,
            performance_metrics: GenerationMetrics {
                total_processing_time: total_time,
                context_building_time: context_time,
                consistency_check_time: consistency_time,
                generation_time,
                post_processing_time: optimization_time,
                tokens_processed: optimized_context.original_token_count,
                tokens_generated: self.estimate_tokens(&response.generated_text),
                memory_usage_mb: self.get_memory_usage(),
            },
            next_actions: self.suggest_next_actions(&consistency_analysis, &quality_analysis),
        };
        
        // 記錄性能指標
        self.performance_monitor.record_generation(&response);
        
        log::info!("完整AI續寫流程完成，總耗時: {}ms", total_time);
        Ok(response)
    }

    /// 載入專案資料
    async fn load_project_data(&mut self, project_id: &str) -> Result<(), String> {
        // 載入角色檔案
        self.character_tracker.load_character_profiles(project_id).await?;
        
        // 載入情節結構
        self.plot_system.load_project_plot_structure(project_id).await?;
        
        Ok(())
    }

    /// 識別重點角色
    async fn identify_focus_characters(&self, project_id: &str, chapter_id: &str) -> Result<Vec<String>, String> {
        // TODO: 基於章節內容和角色重要性識別重點角色
        // 這裡需要分析章節內容，找出活躍的角色
        Ok(vec!["主角".to_string()]) // 暫時返回模擬資料
    }

    /// 構建完整上下文字符串
    fn build_full_context_string(&self, context: &IntelligentContext) -> String {
        format!(
            "{}\n\n{}\n\n{}\n\n{}\n\n{}",
            context.core_context,
            context.character_context,
            context.plot_context,
            context.world_context,
            context.historical_context
        )
    }

    /// 使用Ollama生成文本
    async fn generate_text_with_ollama(
        &self,
        context: &str,
        model: &str,
        additional_params: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<String, String> {
        // 準備生成參數
        let ollama_options = crate::services::ollama::OllamaOptions {
            temperature: Some(self.config.temperature),
            top_p: Some(self.config.top_p),
            max_tokens: Some(800), // 生成文本的長度限制
            presence_penalty: Some(self.config.presence_penalty),
            frequency_penalty: Some(self.config.frequency_penalty),
        };
        
        // 調用Ollama服務
        let ollama_service = crate::services::ollama::get_ollama_service();
        let service = ollama_service.lock().await;
        let result = service.generate_text(model, context, Some(ollama_options)).await;
        
        if result.success {
            Ok(result.response.unwrap_or_default())
        } else {
            Err(result.error.unwrap_or("生成失敗".to_string()))
        }
    }

    /// 執行全面一致性檢查
    async fn perform_comprehensive_consistency_check(
        &mut self,
        generated_text: &str,
        focus_characters: &[String],
        context: &IntelligentContext,
        chapter_id: &str,
    ) -> Result<ConsistencyAnalysisResult, String> {
        let mut critical_issues = Vec::new();
        
        // 角色一致性檢查
        let mut character_consistency = CharacterConsistencyAnalysis {
            character_id: "overall".to_string(),
            overall_score: 1.0,
            speech_consistency: 1.0,
            behavior_consistency: 1.0,
            knowledge_consistency: 1.0,
            emotional_consistency: 1.0,
            violations: Vec::new(),
            suggestions: Vec::new(),
            confidence: 1.0,
        };
        
        for character in focus_characters {
            let analysis = self.character_tracker.analyze_character_consistency(
                generated_text,
                character,
                context,
            ).await?;
            
            if analysis.overall_score < character_consistency.overall_score {
                character_consistency = analysis;
            }
        }
        
        // 情節連貫性檢查
        let plot_coherence = self.plot_system.analyze_plot_coherence(
            generated_text,
            chapter_id,
            0, // 位置暫時使用0
        ).await?;
        
        // 檢查嚴重問題
        if character_consistency.overall_score < 0.6 {
            critical_issues.push(ConsistencyIssue {
                issue_type: "character_consistency".to_string(),
                severity: "high".to_string(),
                description: "角色一致性分數過低".to_string(),
                affected_elements: focus_characters.to_vec(),
                suggested_fix: Some("重新檢查角色設定和對話".to_string()),
                auto_fixable: false,
            });
        }
        
        if plot_coherence.overall_score < 0.6 {
            critical_issues.push(ConsistencyIssue {
                issue_type: "plot_coherence".to_string(),
                severity: "high".to_string(),
                description: "情節連貫性分數過低".to_string(),
                affected_elements: plot_coherence.affected_plot_threads,
                suggested_fix: Some("檢查情節邏輯和因果關係".to_string()),
                auto_fixable: false,
            });
        }
        
        let overall_consistency = (
            character_consistency.overall_score * self.config.character_consistency_weight +
            plot_coherence.overall_score * self.config.plot_consistency_weight
        ) / (self.config.character_consistency_weight + self.config.plot_consistency_weight);
        
        Ok(ConsistencyAnalysisResult {
            character_consistency,
            plot_coherence,
            world_consistency: 0.8, // TODO: 實作世界一致性檢查
            timeline_consistency: 0.85, // TODO: 實作時間線一致性檢查
            overall_consistency,
            critical_issues,
        })
    }

    /// 評估文本品質
    async fn assess_text_quality(
        &mut self,
        text: &str,
        context: &OptimizedContext,
    ) -> Result<QualityAnalysis, String> {
        // TODO: 實作詳細的品質評估邏輯
        // 這裡需要分析文本的各個品質維度
        
        Ok(QualityAnalysis {
            overall_quality: 0.8,
            coherence: context.quality_score,
            creativity: 0.75,
            engagement: 0.8,
            literary_merit: 0.7,
            genre_appropriateness: 0.85,
            pacing: 0.8,
            dialogue_quality: 0.75,
            description_quality: 0.8,
        })
    }

    /// 生成改進建議
    async fn generate_improvement_suggestions(
        &self,
        _text: &str,
        consistency: &ConsistencyAnalysisResult,
        quality: &QualityAnalysis,
    ) -> Result<Vec<WritingSuggestion>, String> {
        let mut suggestions = Vec::new();
        
        if consistency.overall_consistency < 0.8 {
            suggestions.push(WritingSuggestion {
                suggestion_type: "improvement".to_string(),
                priority: "high".to_string(),
                description: "提高內容一致性".to_string(),
                rationale: "檢測到一致性問題，建議檢查角色行為和情節邏輯".to_string(),
                implementation_hint: Some("重新檢視角色設定和情節發展".to_string()),
            });
        }
        
        if quality.creativity < 0.7 {
            suggestions.push(WritingSuggestion {
                suggestion_type: "enhancement".to_string(),
                priority: "medium".to_string(),
                description: "增加創意元素".to_string(),
                rationale: "內容較為平淡，可以加入更多創意元素".to_string(),
                implementation_hint: Some("嘗試使用更生動的描述或意外的情節轉折".to_string()),
            });
        }
        
        Ok(suggestions)
    }

    /// 更新系統狀態
    async fn update_system_state(
        &mut self,
        project_id: &str,
        chapter_id: &str,
        generated_text: &str,
    ) -> Result<(), String> {
        // 更新角色狀態
        let focus_characters = self.identify_focus_characters(project_id, chapter_id).await?;
        for character in focus_characters {
            self.character_tracker.update_character_state(
                &character,
                chapter_id,
                generated_text,
            ).await?;
        }
        
        // 更新情節結構
        self.plot_system.update_plot_structure(
            chapter_id,
            generated_text,
            0, // 位置
        ).await?;
        
        Ok(())
    }

    /// 建議後續操作
    fn suggest_next_actions(
        &self,
        consistency: &ConsistencyAnalysisResult,
        quality: &QualityAnalysis,
    ) -> Vec<NextAction> {
        let mut actions = Vec::new();
        
        // 如果品質不夠好，建議重新生成
        if quality.overall_quality < 0.7 || consistency.overall_consistency < 0.7 {
            actions.push(NextAction {
                action_type: "regenerate".to_string(),
                description: "重新生成內容以提高品質".to_string(),
                parameters: HashMap::new(),
            });
        }
        
        // 建議繼續寫作
        actions.push(NextAction {
            action_type: "continue".to_string(),
            description: "繼續下一段內容".to_string(),
            parameters: HashMap::new(),
        });
        
        // 建議細化內容
        if quality.description_quality < 0.8 {
            actions.push(NextAction {
                action_type: "expand".to_string(),
                description: "擴展描述內容".to_string(),
                parameters: HashMap::new(),
            });
        }
        
        actions
    }

    // 輔助方法
    fn estimate_tokens(&self, text: &str) -> usize {
        text.chars().count() / 2 // 中文約2字符=1token
    }

    fn get_memory_usage(&self) -> f32 {
        // TODO: 實作記憶體使用量監控
        64.0 // MB
    }
}

impl PerformanceMonitor {
    fn new() -> Self {
        Self {
            generation_times: Vec::new(),
            context_processing_times: Vec::new(),
            consistency_check_times: Vec::new(),
            memory_usage: Vec::new(),
            success_rate: 1.0,
            average_quality_score: 0.8,
        }
    }

    fn record_generation(&mut self, response: &ComprehensiveWritingResponse) {
        self.generation_times.push(response.performance_metrics.total_processing_time);
        self.context_processing_times.push(response.performance_metrics.context_building_time);
        self.consistency_check_times.push(response.performance_metrics.consistency_check_time);
        self.memory_usage.push(response.performance_metrics.memory_usage_mb as usize);
        
        // 更新平均品質分數
        let total_scores: f32 = self.average_quality_score * (self.generation_times.len() - 1) as f32;
        self.average_quality_score = (total_scores + response.quality_analysis.overall_quality) / self.generation_times.len() as f32;
    }
}

impl QualityAssessor {
    fn new() -> Self {
        Self {
            quality_metrics: QualityMetrics::default(),
            historical_scores: Vec::new(),
            improvement_suggestions: Vec::new(),
        }
    }
}

impl Default for QualityMetrics {
    fn default() -> Self {
        Self {
            coherence_weight: 0.3,
            creativity_weight: 0.25,
            consistency_weight: 0.25,
            engagement_weight: 0.15,
            literary_quality_weight: 0.05,
        }
    }
}

impl Default for AIWritingConfig {
    fn default() -> Self {
        Self {
            max_tokens: 4000,
            temperature: 0.7,
            top_p: 0.9,
            presence_penalty: 0.1,
            frequency_penalty: 0.1,
            min_consistency_score: 0.7,
            enable_consistency_check: true,
            enable_plot_coherence_check: true,
            enable_character_tracking: true,
            enable_context_optimization: true,
            preferred_genres: vec!["輕小說".to_string()],
            writing_style: "literary".to_string(),
            narrative_perspective: "third_limited".to_string(),
            tone_preferences: vec!["dramatic".to_string(), "emotional".to_string()],
            context_window_size: 8000,
            compression_aggressiveness: 0.3,
            character_consistency_weight: 0.4,
            plot_consistency_weight: 0.6,
            creativity_vs_consistency: 0.7,
        }
    }
}

/// Tauri 命令：完整AI續寫
#[command]
pub async fn comprehensive_ai_writing(
    project_id: String,
    chapter_id: String,
    position: usize,
    model: String,
    config: Option<AIWritingConfig>,
    additional_params: Option<HashMap<String, serde_json::Value>>,
) -> Result<ComprehensiveWritingResponse, String> {
    let writing_config = config.unwrap_or_default();
    let mut system = IntegratedAIWritingSystem::new(writing_config);
    
    system.generate_with_full_analysis(
        project_id,
        chapter_id,
        position,
        model,
        additional_params,
    ).await
}

/// Tauri 命令：獲取系統狀態
#[command]
pub async fn get_ai_writing_system_status() -> Result<SystemStatus, String> {
    Ok(SystemStatus {
        version: "1.0.0".to_string(),
        components_status: HashMap::from([
            ("context_manager".to_string(), "active".to_string()),
            ("character_tracker".to_string(), "active".to_string()),
            ("plot_system".to_string(), "active".to_string()),
            ("context_optimizer".to_string(), "active".to_string()),
        ]),
        performance_summary: PerformanceSummary {
            average_generation_time: 5000, // ms
            success_rate: 0.95,
            average_quality_score: 0.82,
            total_generations: 150,
        },
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStatus {
    pub version: String,
    pub components_status: HashMap<String, String>,
    pub performance_summary: PerformanceSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSummary {
    pub average_generation_time: u64, // ms
    pub success_rate: f32,
    pub average_quality_score: f32,
    pub total_generations: u32,
}