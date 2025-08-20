// Phase 3: AI 插畫生成 TypeScript 類型定義
// 對應後端 Rust 結構的前端類型定義

/** 插畫生成請求 */
export interface IllustrationRequest {
  project_id: string;
  character_id?: string;
  scene_description: string;
  style_template_id?: string;
  custom_style_params?: Record<string, unknown>;
  use_reference_image: boolean;
  quality_preset: 'speed' | 'balanced' | 'quality';
  batch_size?: number;
}

/** 增強的插畫生成請求 */
export interface EnhancedIllustrationRequest {
  basic_request: IllustrationRequest;
  template_id?: string;
  translation_style?: string;
  optimization_level?: string;
  consistency_mode?: string;
  custom_negative_prompt?: string;
  aspect_ratio?: string;
  safety_level?: string;
  guidance_scale?: number;
}

/** 插畫生成響應 */
export interface IllustrationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url?: string;
  translated_prompt?: string;
  seed_value?: number;
  consistency_score?: number;
  quality_score?: number;
  generation_time_ms?: number;
  error_message?: string;
}

/** 詳細生成結果 */
export interface DetailedGenerationResult {
  basic_response: IllustrationResponse;
  generated_images: GeneratedImageInfo[];
  translation_result?: TranslationResult;
  optimization_result?: OptimizationResult;
  consistency_analysis?: ConsistencyAnalysis;
  generation_metadata: GenerationMetadata;
}

/** 生成的圖像資訊 */
export interface GeneratedImageInfo {
  image_id: string;
  width: number;
  height: number;
  file_size_bytes: number;
  safety_rating: SafetyRating;
  quality_score: number;
  file_path: string;
}

/** 安全評級 */
export interface SafetyRating {
  category: 'hate_speech' | 'dangerous_content' | 'harassment' | 'sexually_explicit';
  probability: 'negligible' | 'low' | 'medium' | 'high';
  blocked: boolean;
}

/** 翻譯結果 */
export interface TranslationResult {
  original_chinese: string;
  translated_prompt: string;
  confidence_score: number;
  vocabulary_coverage: number;
  applied_template?: string;
}

/** 優化結果 */
export interface OptimizationResult {
  original_prompt: string;
  optimized_prompt: string;
  negative_prompt: string;
  improvement_score: number;
  applied_optimizations: string[];
}

/** 一致性分析 */
export interface ConsistencyAnalysis {
  character_seed: number;
  consistency_score: number;
  visual_traits_match: number;
  reference_image_similarity: number;
}

/** 生成元數據 */
export interface GenerationMetadata {
  total_time_ms: number;
  translation_time_ms: number;
  generation_time_ms: number;
  processing_time_ms: number;
  estimated_cost: number;
  model_used: string;
  timestamp: string;
}

/** 角色視覺特徵（API 響應格式） */
export interface VisualTraitsResponse {
  character_id: string;
  seed_value: number;
  standard_description: string;
  chinese_description: string;
  traits_version: number;
  created_at: string;
}

/** 一致性報告 */
export interface ConsistencyReport {
  character_id: string;
  character_name: string;
  overall_score: number;
  seed_consistency: SeedConsistencyInfo;
  visual_consistency: VisualConsistencyInfo;
  reference_consistency: ReferenceConsistencyInfo;
  recommendations: ConsistencyRecommendation[];
  generated_at: string;
}

/** Seed 一致性資訊 */
export interface SeedConsistencyInfo {
  seed_value: number;
  seed_stability: number;
  usage_count: number;
  last_used?: string;
  seed_effectiveness: number;
}

/** 視覺一致性資訊 */
export interface VisualConsistencyInfo {
  traits_completeness: number;
  description_clarity: number;
  standard_compliance: number;
  chinese_accuracy: number;
}

/** 參考一致性資訊 */
export interface ReferenceConsistencyInfo {
  reference_count: number;
  quality_average: number;
  coverage_score: number;
  consistency_across_references: number;
}

/** 一致性建議 */
export interface ConsistencyRecommendation {
  type: 'seed' | 'description' | 'reference' | 'template';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggested_action?: string;
}

/** 批次請求 */
export interface BatchRequest {
  batch_id?: string;
  requests: EnhancedIllustrationRequest[];
  priority?: TaskPriority;
  metadata?: BatchRequestMetadata;
  execution_config?: BatchExecutionConfig;
}

/** 任務優先級 */
export enum TaskPriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Critical = 4,
  Urgent = 5
}

/** 批次請求元數據 */
export interface BatchRequestMetadata {
  batch_name: string;
  description?: string;
  project_id: string;
  user_id?: string;
  tags: string[];
  notify_on_completion: boolean;
}

/** 批次執行配置 */
export interface BatchExecutionConfig {
  max_parallel?: number;
  timeout_seconds?: number;
  retry_failed_tasks?: boolean;
  preserve_order: boolean;
  fail_fast: boolean;
  continue_on_error: boolean;
}

/** 批次狀態報告 */
export interface BatchStatusReport {
  batch_id: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  running_tasks: number;
  queued_tasks: number;
  overall_progress: number;
  estimated_completion?: string;
  statistics: BatchStatistics;
  task_details: BatchTaskStatus[];
}

/** 批次統計 */
export interface BatchStatistics {
  total_tasks_processed: number;
  successful_tasks: number;
  failed_tasks: number;
  cancelled_tasks: number;
  timeout_tasks: number;
  retried_tasks: number;
  average_execution_time_ms: number;
  total_api_costs: number;
  peak_concurrent_tasks: number;
  queue_utilization: number;
  error_rate: number;
  throughput_per_hour: number;
}

/** 批次任務狀態 */
export interface BatchTaskStatus {
  task_id: string;
  batch_id: string;
  status: TaskStatus;
  progress: number;
  current_step: string;
  started_at?: string;
  estimated_completion?: string;
  error_message?: string;
  retry_count: number;
  performance_metrics: TaskPerformanceMetrics;
}

/** 任務狀態 */
export enum TaskStatus {
  Queued = 'queued',
  Waiting = 'waiting',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Timeout = 'timeout',
  Retrying = 'retrying'
}

/** 任務效能指標 */
export interface TaskPerformanceMetrics {
  queue_time_ms: number;
  execution_time_ms: number;
  memory_usage_mb: number;
  api_calls_count: number;
  total_cost: number;
}

/** 插畫風格模板 */
export interface StyleTemplate {
  id: string;
  name: string;
  style_type: 'anime' | 'realistic' | 'fantasy' | 'chibi' | 'manga' | 'illustration';
  prompt_template: string;
  negative_prompt?: string;
  api_params: Record<string, unknown>;
  suitable_for: ('character' | 'scene' | 'cover' | 'background')[];
}

/** 插畫生成配置 */
export interface IllustrationConfig {
  default_aspect_ratio: string;
  default_quality_preset: string;
  max_batch_size: number;
  auto_save_images: boolean;
  preferred_style_templates: string[];
  enable_character_consistency: boolean;
  safety_filter_level: 'strict' | 'moderate' | 'permissive';
}

/** UI 狀態管理 */
export interface IllustrationUIState {
  isGenerating: boolean;
  currentStep: string;
  progress: number;
  selectedCharacter?: string;
  selectedTemplate?: string;
  recentGenerations: IllustrationResponse[];
  batchQueue: BatchRequest[];
  errors: string[];
}

/** 插畫庫項目 */
export interface IllustrationGalleryItem {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  title: string;
  description: string;
  character_name?: string;
  style_template: string;
  created_at: string;
  metadata: {
    seed_value: number;
    quality_score: number;
    consistency_score?: number;
    generation_time_ms: number;
    cost: number;
  };
  tags: string[];
}

/** 插畫搜索過濾器 */
export interface IllustrationFilter {
  character_ids?: string[];
  style_types?: string[];
  quality_range?: [number, number];
  date_range?: [string, string];
  tags?: string[];
  sort_by: 'created_at' | 'quality_score' | 'consistency_score';
  sort_order: 'asc' | 'desc';
}

/** 插畫歷史項目 */
export interface IllustrationHistoryItem {
  id: string;
  project_id?: string;
  character_id?: string;
  original_prompt: string;
  enhanced_prompt?: string;
  model: string;
  width: number;
  height: number;
  seed?: number;
  enhance: boolean;
  style_applied?: string;
  image_url?: string;
  local_file_path?: string;
  file_size_bytes?: number;
  generation_time_ms?: number;
  status: 'completed' | 'failed' | 'pending' | 'processing';
  error_message?: string;
  created_at: string;
  batch_id?: string;
  user_rating?: number;
  is_favorite: boolean;
  provider: string;
  is_free: boolean;
  
  // Legacy fields for backward compatibility
  scene_description?: string;
  generated_image_url?: string;
  thumbnail_url?: string;
  translated_prompt?: string;
  seed_value?: number;
  quality_score?: number;
  consistency_score?: number;
  cost?: number;
  style_template_id?: string;
  aspect_ratio?: string;
  safety_level?: string;
}

/** 角色一致性報告 */
export interface CharacterConsistencyReport {
  character_id: string;
  character_name: string;
  consistency_score: number;
  total_images: number;
  analyzed_traits: string[];
  consistency_details: {
    trait_name: string;
    consistency_percentage: number;
    variations_found: string[];
    recommendations: string[];
  }[];
  overall_recommendations: string[];
  generated_at: string;
  strict_mode: boolean;
}

/** 視覺特徵 */
export interface VisualTraits {
  character_id: string;
  character_name: string;
  seed_value?: number;
  traits_version?: number;
  standard_description?: string;
  chinese_description?: string;
  created_at?: string;
  primary_traits?: {
    hair_color?: string;
    hair_style?: string;
    eye_color?: string;
    skin_tone?: string;
    height_description?: string;
    build_description?: string;
  };
  clothing_style?: {
    casual?: string[];
    formal?: string[];
    accessories?: string[];
  };
  distinguishing_features?: string[];
  art_style_preferences?: string[];
  reference_seed?: number;
  reference_images?: {
    url: string;
    description: string;
    tags: string[];
  }[];
  last_updated?: string;
}

/** 批次狀態 */
export interface BatchStatus {
  batch_id: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  progress_percentage: number;
  estimated_completion_time?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  tasks: {
    task_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    scene_description: string;
    character_id?: string;
    result?: IllustrationResponse;
    error_message?: string;
  }[];
}

/** 批次摘要 */
export interface BatchSummary {
  batch_id: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  running_tasks: number;
  queued_tasks: number;
  overall_progress: number;
  progress_percentage: number;
  created_at: string;
  estimated_completion_time?: string;
  estimated_completion?: string;
  statistics: BatchStatistics;
  task_details: BatchTaskStatus[];
}

/** API 響應包裝器 */
export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/** 批次列表響應 */
export interface BatchListResponse extends APIResponse {
  batches?: BatchSummary[];
}

/** 批次狀態響應 */
export interface BatchStatusResponse extends APIResponse {
  batch?: BatchStatus;
  status?: string;
  task_id?: string;
  image_url?: string;
  translated_prompt?: string;
  seed_value?: number;
  consistency_analysis?: ConsistencyAnalysis;
  generation_metadata?: GenerationMetadata;
}

/** 視覺特徵響應 */
export interface VisualTraitsApiResponse extends APIResponse {
  traits?: VisualTraits;
  character_id?: string;
  seed_value?: number;
  standard_description?: string;
  chinese_description?: string;
  traits_version?: number;
  created_at?: string;
}

/** 角色一致性檢查響應 */
export interface ConsistencyCheckResponse extends APIResponse {
  report?: CharacterConsistencyReport;
}

/** 插畫生成響應 */
export interface IllustrationGenerationResponse extends APIResponse {
  success: boolean;
  task_id?: string;
  status?: string;
  image_url?: string;
  translated_prompt?: string;
  seed_value?: number;
  quality_score?: number;
  consistency_score?: number;
  generation_time_ms?: number;
  estimated_cost?: number;
  consistency_analysis?: ConsistencyAnalysis;
  generation_metadata?: GenerationMetadata;
  translation_result?: TranslationResult;
  optimization_result?: OptimizationResult;
  generated_images?: GeneratedImageInfo[];
  images?: string[];
  translation_info?: Record<string, unknown>;
  optimization_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: string;
}

/** 翻譯驗證響應 */
export interface TranslationValidationResponse extends APIResponse {
  valid?: boolean;
  error?: string;
}