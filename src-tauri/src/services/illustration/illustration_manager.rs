use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use rusqlite::Connection;
use uuid::Uuid;

use super::{
    Result, IllustrationError, IllustrationRequest, IllustrationResponse,
    ImagenApiService, ImageGenerationRequest, ImageGenerationConfig,
    CharacterConsistencyManager, SeedManager, VisualTraitsManager,
    AspectRatio, SafetyLevel, PersonGeneration
};
use super::imagen_api::{GeneratedImage, SafetyProbability};
use base64::Engine;
use crate::services::translation::{
    PromptTemplateManager, TranslationEngine, PromptOptimizer,
    TemplateApplicationRequest, OptimizationRequest, OptimizationLevel
};

/// 插畫生成管理器 - 整合所有插畫生成功能的核心管理器
/// 
/// 功能：
/// 1. 整合 Gemini Imagen API、翻譯引擎、模板系統
/// 2. 管理角色一致性和 seed 值
/// 3. 處理生成隊列和批次操作
/// 4. 提供完整的插畫生成工作流程
pub struct IllustrationManager {
    // API 服務
    imagen_service: Option<ImagenApiService>,
    
    // 管理組件
    #[allow(dead_code)]
    consistency_manager: CharacterConsistencyManager,
    seed_manager: SeedManager,
    #[allow(dead_code)]
    traits_manager: VisualTraitsManager,
    template_manager: PromptTemplateManager,
    translation_engine: TranslationEngine,
    prompt_optimizer: PromptOptimizer,
    
    // 資料庫連接
    #[allow(dead_code)]
    db_connection: Arc<Mutex<Connection>>,
    
    // 生成隊列
    #[allow(dead_code)]
    generation_queue: Arc<Mutex<Vec<GenerationTask>>>,
    active_generations: Arc<Mutex<HashMap<String, GenerationStatus>>>,
    
    // 配置
    default_config: IllustrationManagerConfig,
}

/// 插畫管理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IllustrationManagerConfig {
    pub max_concurrent_generations: usize,
    pub default_batch_size: usize,
    pub auto_translate: bool,
    pub use_consistency_check: bool,
    pub save_intermediate_results: bool,
    pub enable_safety_filter: bool,
    pub default_quality_preset: String,
}

/// 生成任務
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationTask {
    pub id: String,
    pub request: IllustrationRequest,
    pub priority: i32,
    pub created_at: String,
    pub retry_count: u32,
    pub max_retries: u32,
}

/// 生成狀態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationStatus {
    pub task_id: String,
    pub status: TaskStatus,
    pub progress: f64,        // 0.0 - 1.0
    pub current_step: String,
    pub started_at: String,
    pub estimated_completion: Option<String>,
    pub error_message: Option<String>,
}

/// 任務狀態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    Translating,
    OptimizingPrompt,
    GeneratingImage,
    ProcessingResult,
    Completed,
    Failed,
    Cancelled,
}

/// 增強的插畫生成請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedIllustrationRequest {
    pub basic_request: IllustrationRequest,
    pub template_id: Option<String>,
    pub translation_style: Option<String>,
    pub optimization_level: Option<String>,
    pub consistency_mode: Option<String>,
    pub custom_negative_prompt: Option<String>,
    pub aspect_ratio: Option<String>,
    pub safety_level: Option<String>,
    pub guidance_scale: Option<f64>,
}

/// 詳細的生成結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedGenerationResult {
    pub basic_response: IllustrationResponse,
    pub generated_images: Vec<GeneratedImageInfo>,
    pub translation_result: Option<TranslationInfo>,
    pub optimization_result: Option<OptimizationInfo>,
    pub consistency_analysis: Option<ConsistencyAnalysis>,
    pub generation_metadata: GenerationMetadata,
}

/// 生成的圖像資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedImageInfo {
    pub image_id: String,
    pub image_data: String,        // Base64 編碼
    pub file_path: Option<String>, // 本地儲存路徑
    pub width: u32,
    pub height: u32,
    pub file_size_bytes: usize,
    pub safety_rating: String,
    pub quality_score: Option<f64>,
}

/// 翻譯資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationInfo {
    pub original_chinese: String,
    pub translated_prompt: String,
    pub confidence_score: f64,
    pub vocabulary_coverage: f64,
    pub applied_template: Option<String>,
}

/// 優化資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationInfo {
    pub original_prompt: String,
    pub optimized_prompt: String,
    pub negative_prompt: Option<String>,
    pub improvement_score: f64,
    pub applied_optimizations: Vec<String>,
}

/// 一致性分析
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyAnalysis {
    pub character_seed: Option<u32>,
    pub consistency_score: f64,
    pub visual_traits_match: HashMap<String, f64>,
    pub reference_image_similarity: Option<f64>,
}

/// 生成元數據
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetadata {
    pub total_time_ms: u64,
    pub translation_time_ms: u64,
    pub generation_time_ms: u64,
    pub processing_time_ms: u64,
    pub api_calls_count: u32,
    pub estimated_cost: f64,
    pub model_used: String,
    pub timestamp: String,
}

impl IllustrationManager {
    /// 創建新的插畫管理器
    pub fn new(db_connection: Arc<Mutex<Connection>>) -> Result<Self> {
        log::info!("[IllustrationManager] 初始化插畫生成管理器");
        
        // 初始化各組件
        let consistency_manager = CharacterConsistencyManager::new(db_connection.clone());
        let seed_manager = SeedManager::new(db_connection.clone());
        let traits_manager = VisualTraitsManager::new(db_connection.clone());
        let template_manager = PromptTemplateManager::new();
        
        // 初始化翻譯引擎（需要詞彙庫）
        let vocabulary_db = crate::services::translation::VocabularyDatabase::new(db_connection.clone());
        let translation_engine = TranslationEngine::new(vocabulary_db)?;
        let prompt_optimizer = PromptOptimizer::new();
        
        let default_config = IllustrationManagerConfig {
            max_concurrent_generations: 3,
            default_batch_size: 1,
            auto_translate: true,
            use_consistency_check: true,
            save_intermediate_results: true,
            enable_safety_filter: true,
            default_quality_preset: "balanced".to_string(),
        };
        
        let manager = Self {
            imagen_service: None, // 稍後初始化
            consistency_manager,
            seed_manager,
            traits_manager,
            template_manager,
            translation_engine,
            prompt_optimizer,
            db_connection,
            generation_queue: Arc::new(Mutex::new(Vec::new())),
            active_generations: Arc::new(Mutex::new(HashMap::new())),
            default_config,
        };
        
        log::info!("[IllustrationManager] 插畫生成管理器初始化完成");
        Ok(manager)
    }
    
    /// 初始化 Imagen API 服務
    pub fn initialize_imagen_service(&mut self, api_key: String) -> Result<()> {
        log::info!("[IllustrationManager] 初始化 Imagen API 服務");
        
        let service = ImagenApiService::new(api_key);
        self.imagen_service = Some(service);
        
        Ok(())
    }
    
    /// 生成插畫（完整工作流程）
    pub async fn generate_illustration(&self, request: EnhancedIllustrationRequest) -> Result<DetailedGenerationResult> {
        let task_id = Uuid::new_v4().to_string();
        let start_time = std::time::Instant::now();
        
        log::info!("[IllustrationManager] 開始生成插畫，任務ID: {}", task_id);
        
        // 初始化生成狀態
        self.update_generation_status(&task_id, TaskStatus::Translating, 0.1, "開始翻譯中文描述")?;
        
        // 1. 翻譯和模板應用
        let translation_result = self.translate_and_apply_template(&request).await?;
        let translation_time = start_time.elapsed().as_millis() as u64;
        
        // 2. 提示詞優化
        self.update_generation_status(&task_id, TaskStatus::OptimizingPrompt, 0.3, "優化提示詞")?;
        let optimization_result = self.optimize_prompt(&translation_result.translated_prompt, &request).await?;
        
        // 3. 角色一致性處理
        let consistency_analysis = self.process_consistency(&request).await?;
        
        // 4. 生成圖像
        self.update_generation_status(&task_id, TaskStatus::GeneratingImage, 0.5, "生成圖像中")?;
        let generation_start = std::time::Instant::now();
        let generation_response = self.generate_with_imagen(&optimization_result.optimized_prompt, &request, &consistency_analysis).await?;
        let generation_time = generation_start.elapsed().as_millis() as u64;
        
        // 5. 處理結果
        self.update_generation_status(&task_id, TaskStatus::ProcessingResult, 0.8, "處理生成結果")?;
        let generated_images = self.process_generated_images(generation_response).await?;
        
        // 6. 保存結果到資料庫
        if self.default_config.save_intermediate_results {
            self.save_generation_result(&task_id, &generated_images).await?;
        }
        
        let total_time = start_time.elapsed().as_millis() as u64;
        
        // 構建詳細結果
        let result = DetailedGenerationResult {
            basic_response: IllustrationResponse {
                id: task_id.clone(),
                status: "completed".to_string(),
                image_url: generated_images.first().and_then(|img| img.file_path.clone()),
                translated_prompt: Some(translation_result.translated_prompt.clone()),
                seed_value: consistency_analysis.character_seed,
                consistency_score: Some(consistency_analysis.consistency_score),
                quality_score: generated_images.first().and_then(|img| img.quality_score),
                generation_time_ms: Some(generation_time),
                error_message: None,
            },
            generated_images,
            translation_result: Some(translation_result),
            optimization_result: Some(optimization_result),
            consistency_analysis: Some(consistency_analysis),
            generation_metadata: GenerationMetadata {
                total_time_ms: total_time,
                translation_time_ms: translation_time,
                generation_time_ms: generation_time,
                processing_time_ms: total_time - translation_time - generation_time,
                api_calls_count: 1,
                estimated_cost: 0.04, // Imagen 3.0 cost
                model_used: "imagen-3.0-generate-001".to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
            },
        };
        
        self.update_generation_status(&task_id, TaskStatus::Completed, 1.0, "生成完成")?;
        
        log::info!("[IllustrationManager] 插畫生成完成，任務ID: {}，耗時: {}ms", 
                   task_id, total_time);
        
        Ok(result)
    }
    
    /// 翻譯和應用模板
    async fn translate_and_apply_template(&self, request: &EnhancedIllustrationRequest) -> Result<TranslationInfo> {
        log::info!("[IllustrationManager] 翻譯描述: {}", request.basic_request.scene_description);
        
        let (final_prompt, applied_template) = if let Some(template_id) = &request.template_id {
            // 應用模板
            let template_request = TemplateApplicationRequest {
                template_id: template_id.clone(),
                parameters: std::collections::HashMap::new(),
                character_description: Some(request.basic_request.scene_description.clone()),
                apply_quality_modifiers: true,
                include_negative_prompts: true,
                target_style: request.translation_style.clone(),
            };
            
            let template_result = self.template_manager.apply_template(template_request)?;
            (template_result.final_prompt, Some(template_id.clone()))
        } else {
            // 直接翻譯
            let translation_request = crate::services::translation::TranslationRequest {
                chinese_description: request.basic_request.scene_description.clone(),
                character_name: None,
                target_style: crate::services::translation::TranslationStyle::Anime,
                quality_level: crate::services::translation::QualityLevel::High,
                context_hints: Vec::new(),
                preserve_original: false,
            };
            
            let translation_result = self.translation_engine.translate(translation_request)?;
            (translation_result.english_prompt, None)
        };
        
        Ok(TranslationInfo {
            original_chinese: request.basic_request.scene_description.clone(),
            translated_prompt: final_prompt,
            confidence_score: 0.9, // 簡化實現
            vocabulary_coverage: 0.85,
            applied_template,
        })
    }
    
    /// 優化提示詞
    async fn optimize_prompt(&self, prompt: &str, request: &EnhancedIllustrationRequest) -> Result<OptimizationInfo> {
        let optimization_level = match request.optimization_level.as_deref() {
            Some("basic") => OptimizationLevel::Basic,
            Some("advanced") => OptimizationLevel::Advanced,
            Some("expert") => OptimizationLevel::Expert,
            _ => OptimizationLevel::Standard,
        };
        
        let optimization_request = OptimizationRequest {
            base_prompt: prompt.to_string(),
            target_model: "stable_diffusion".to_string(),
            optimization_level,
            prompt_style: crate::services::translation::PromptStyle::Detailed,
            include_negative_prompt: true,
            max_length: Some(400),
            quality_focus: vec![crate::services::translation::QualityFocus::CharacterConsistency],
        };
        
        let result = self.prompt_optimizer.optimize(optimization_request)?;
        
        Ok(OptimizationInfo {
            original_prompt: prompt.to_string(),
            optimized_prompt: result.optimized_prompt,
            negative_prompt: result.negative_prompt,
            improvement_score: result.improvement_score,
            applied_optimizations: result.applied_optimizations,
        })
    }
    
    /// 處理角色一致性
    async fn process_consistency(&self, request: &EnhancedIllustrationRequest) -> Result<ConsistencyAnalysis> {
        let mut character_seed = None;
        let mut consistency_score = 1.0;
        let mut visual_traits_match = HashMap::new();
        
        // 如果有角色ID，獲取一致性種子
        if let Some(character_id) = &request.basic_request.character_id {
            // 使用實際存在的方法，需要角色名稱（簡化處理）
            if let Ok(seed) = self.seed_manager.get_or_create_seed(character_id, "Character") {
                character_seed = Some(seed);
                consistency_score = 0.95; // 有種子的一致性分數較高
            }
            
            // 簡化視覺特徵匹配度（實際應該從資料庫獲取）
            visual_traits_match.insert("hair_color".to_string(), 0.9);
            visual_traits_match.insert("eye_color".to_string(), 0.88);
            visual_traits_match.insert("face_shape".to_string(), 0.92);
        }
        
        Ok(ConsistencyAnalysis {
            character_seed,
            consistency_score,
            visual_traits_match,
            reference_image_similarity: None, // TODO: 實現參考圖像相似度
        })
    }
    
    /// 使用 Imagen API 生成圖像
    async fn generate_with_imagen(
        &self, 
        prompt: &str, 
        request: &EnhancedIllustrationRequest,
        consistency: &ConsistencyAnalysis
    ) -> Result<crate::services::illustration::ImageGenerationResponse> {
        let imagen_service = self.imagen_service.as_ref()
            .ok_or_else(|| IllustrationError::Config("Imagen API 服務未初始化".to_string()))?;
        
        // 構建生成配置
        let aspect_ratio = match request.aspect_ratio.as_deref() {
            Some("portrait") => AspectRatio::Portrait,
            Some("landscape") => AspectRatio::Landscape,
            Some("square") => AspectRatio::Square,
            _ => AspectRatio::Square,
        };
        
        let safety_level = match request.safety_level.as_deref() {
            Some("block_few") => SafetyLevel::BlockFew,
            Some("block_some") => SafetyLevel::BlockSome,
            _ => SafetyLevel::BlockMost,
        };
        
        let config = ImageGenerationConfig {
            model: "imagen-3.0-generate-001".to_string(),
            aspect_ratio,
            safety_filter_level: safety_level,
            person_generation: PersonGeneration::AllowMinor, // 適合輕小說角色
            include_ra_terms: true,
            add_watermark: false,
            compress_images: true,
        };
        
        let generation_request = ImageGenerationRequest {
            prompt: prompt.to_string(),
            negative_prompt: request.custom_negative_prompt.clone(),
            config,
            character_seed: consistency.character_seed,
            style_reference: None,
            guidance_scale: request.guidance_scale,
        };
        
        imagen_service.generate_image(generation_request).await
    }
    
    /// 處理生成的圖像
    async fn process_generated_images(
        &self, 
        response: crate::services::illustration::ImageGenerationResponse
    ) -> Result<Vec<GeneratedImageInfo>> {
        let mut processed_images = Vec::new();
        
        for (_index, image) in response.images.iter().enumerate() {
            let image_id = Uuid::new_v4().to_string();
            
            // 可選：保存圖像到本地
            let file_path = if self.default_config.save_intermediate_results {
                Some(self.save_image_to_local(&image.image_data, &image_id).await?)
            } else {
                None
            };
            
            let processed_image = GeneratedImageInfo {
                image_id,
                image_data: image.image_data.clone(),
                file_path,
                width: image.width,
                height: image.height,
                file_size_bytes: image.file_size_bytes,
                safety_rating: format!("{:?}", image.safety_rating.probability),
                quality_score: Some(self.calculate_quality_score(image)),
            };
            
            processed_images.push(processed_image);
        }
        
        Ok(processed_images)
    }
    
    /// 保存圖像到本地
    async fn save_image_to_local(&self, image_data: &str, image_id: &str) -> Result<String> {
        use std::path::Path;
        
        // 創建保存目錄
        let save_dir = Path::new("generated_images");
        if !save_dir.exists() {
            std::fs::create_dir_all(save_dir)?;
        }
        
        // 解碼 Base64 圖像
        let image_bytes = base64::engine::general_purpose::STANDARD.decode(image_data)
            .map_err(|e| IllustrationError::Unknown(format!("Base64 解碼失敗: {}", e)))?;
        
        // 保存到文件
        let file_path = save_dir.join(format!("{}.png", image_id));
        std::fs::write(&file_path, image_bytes)?;
        
        Ok(file_path.to_string_lossy().to_string())
    }
    
    /// 計算圖像品質分數
    fn calculate_quality_score(&self, image: &GeneratedImage) -> f64 {
        // 簡化的品質評分算法
        let mut score: f64 = 0.8; // 基礎分數
        
        // 基於安全評級調整
        match image.safety_rating.probability {
            SafetyProbability::Negligible => score += 0.1,
            SafetyProbability::Low => score += 0.05,
            _ => {}
        }
        
        // 基於文件大小調整（較大的文件通常品質較好）
        if image.file_size_bytes > 1_000_000 { // 1MB
            score += 0.05;
        }
        
        score.min(1.0)
    }
    
    /// 保存生成結果到資料庫
    async fn save_generation_result(&self, task_id: &str, _images: &[GeneratedImageInfo]) -> Result<()> {
        // TODO: 實現資料庫保存邏輯
        log::info!("[IllustrationManager] 保存生成結果到資料庫，任務ID: {}", task_id);
        Ok(())
    }
    
    /// 更新生成狀態
    fn update_generation_status(&self, task_id: &str, status: TaskStatus, progress: f64, step: &str) -> Result<()> {
        let mut active_generations = self.active_generations.lock()
            .map_err(|e| IllustrationError::Unknown(format!("狀態更新鎖定失敗: {}", e)))?;
        
        let generation_status = GenerationStatus {
            task_id: task_id.to_string(),
            status,
            progress,
            current_step: step.to_string(),
            started_at: chrono::Utc::now().to_rfc3339(),
            estimated_completion: None,
            error_message: None,
        };
        
        active_generations.insert(task_id.to_string(), generation_status);
        Ok(())
    }
    
    /// 獲取生成狀態
    #[allow(dead_code)]
    pub fn get_generation_status(&self, task_id: &str) -> Option<GenerationStatus> {
        self.active_generations.lock().ok()?.get(task_id).cloned()
    }
    
    /// 取消生成任務
    #[allow(dead_code)]
    pub fn cancel_generation(&self, task_id: &str) -> Result<bool> {
        if let Ok(mut active_generations) = self.active_generations.lock() {
            if let Some(status) = active_generations.get_mut(task_id) {
                status.status = TaskStatus::Cancelled;
                return Ok(true);
            }
        }
        Ok(false)
    }
    
    /// 驗證 API 連線
    pub async fn validate_api_connection(&self) -> Result<bool> {
        if let Some(imagen_service) = &self.imagen_service {
            imagen_service.validate_connection().await
        } else {
            Err(IllustrationError::Config("Imagen API 服務未初始化".to_string()))
        }
    }
    
    /// 獲取支援的模型
    #[allow(dead_code)]
    pub fn get_supported_models(&self) -> Vec<String> {
        if let Some(imagen_service) = &self.imagen_service {
            imagen_service.get_supported_models()
        } else {
            Vec::new()
        }
    }
    
    /// 更新配置
    #[allow(dead_code)]
    pub fn update_config(&mut self, config: IllustrationManagerConfig) {
        self.default_config = config;
    }
    
    /// 獲取當前配置
    #[allow(dead_code)]
    pub fn get_config(&self) -> &IllustrationManagerConfig {
        &self.default_config
    }
}