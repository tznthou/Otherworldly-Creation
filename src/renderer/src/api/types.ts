// 統一的 API 接口定義
import type {
  Project,
  Chapter,
  Character,
  CreateRelationshipRequest,
  AIGenerationHistory,
  AIServiceStatus,
  AIModelInfo,
  AIModelAvailability,
  AIGenerationParams,
  OllamaConfig,
  ContextStats,
  Settings,
  DatabaseStats,
  DatabaseHealth,
  SaveDialogOptions,
  OpenDialogOptions,
  DialogResult,
  UpdateInfo,
  AIHistoryQueryParams,
  CreateAIProviderRequest,
  UpdateAIProviderRequest,
  AIProviderResponse,
  AIProviderTestResult,
  AIGenerationResult,
  AIGenerationRequestData,
  EPubGenerationOptions,
  EPubResult,
  EPubExportRecord,
  PDFGenerationOptions,
  PDFResult,
  PDFExportRecord
} from './models';

// 小說分析相關類型
import type { NovelParseResult } from '../services/novelParserService';
import type { 
  DetailedAnalysis,
  AnalysisOptions,
  AnalysisProgress
} from '../services/novelAnalysisService';
import type { NovelTemplate } from '../types/template';
import type { 
  BatchRequest,
  IllustrationHistoryItem,
  BatchListResponse,
  BatchStatusResponse,
  VisualTraitsApiResponse,
  ConsistencyCheckResponse,
  IllustrationGenerationResponse,
  TranslationValidationResponse,
} from '../types/illustration';

export interface API {
  // 專案管理
  projects: {
    getAll: () => Promise<Project[]>;
    create: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
    update: (project: Project) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<Project>;
  };
  
  // 章節管理
  chapters: {
    getByProjectId: (projectId: string) => Promise<Chapter[]>;
    create: (chapter: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
    update: (chapter: Chapter) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<Chapter>;
  };

  // 角色管理
  characters: {
    getByProjectId: (projectId: string) => Promise<Character[]>;
    create: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
    update: (character: Character) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<Character>;
    createRelationship: (request: CreateRelationshipRequest) => Promise<string>;
    deleteRelationship: (id: string) => Promise<void>;
    clearRelationships: (characterId: string) => Promise<void>;
  };

  // AI 功能 (傳統 Ollama)
  ai: {
    checkOllamaService: () => Promise<boolean>;
    getServiceStatus: () => Promise<AIServiceStatus>;
    listModels: () => Promise<string[]>;
    getModelsInfo: () => Promise<AIModelInfo[]>;
    checkModelAvailability: (modelName: string) => Promise<AIModelAvailability>;
    generateText: (prompt: string, model: string, params: AIGenerationParams) => Promise<string>;
    generateWithContext: (projectId: string, chapterId: string, position: number, model: string, params: AIGenerationParams, language?: string) => Promise<string>;
    updateOllamaConfig: (config: OllamaConfig) => Promise<OllamaConfig>;
  };

  // AI 提供者管理 (新多提供者系統)
  aiProviders: {
    getAll: () => Promise<AIProviderResponse>;
    create: (request: CreateAIProviderRequest) => Promise<AIProviderResponse>;
    update: (request: UpdateAIProviderRequest) => Promise<AIProviderResponse>;
    delete: (id: string) => Promise<AIProviderResponse>;
    test: (id: string) => Promise<AIProviderTestResult>;
    generateText: (request: AIGenerationRequestData) => Promise<AIGenerationResult>;
    getSupportedTypes: () => Promise<string[]>;
    getAvailableModels: (providerId: string) => Promise<AIProviderTestResult>;
  };

  // 上下文管理
  context: {
    buildContext: (projectId: string, chapterId: string, position: number) => Promise<string>;
    compressContext: (context: string, maxTokens: number) => Promise<string>;
    getContextStats: (projectId: string) => Promise<ContextStats>;
    optimizeUltraLongContext: (params: UltraLongContextOptimizationParams) => Promise<OptimizedContextResult>;
  };

  // 設定管理
  settings: {
    get: <T = unknown>(key: string) => Promise<T>;
    set: <T = unknown>(key: string, value: T) => Promise<void>;
    getAll: () => Promise<Settings>;
    reset: () => Promise<void>;
  };

  // 資料庫維護
  database: {
    backup: (path: string) => Promise<void>;
    restore: (path: string) => Promise<void>;
    runMaintenance: () => Promise<string>;
    getStats: () => Promise<DatabaseStats>;
    healthCheck: () => Promise<DatabaseHealth>;
    reindex: () => Promise<string>;
    incrementalVacuum: (pages?: number) => Promise<string>;
    getWalModeStatus: () => Promise<{ journal_mode: string; is_wal_mode: boolean; synchronous: number; wal_autocheckpoint: number; wal_info: Record<string, unknown>; benefits: Record<string, string[]>; recommendations: string }>;
    setWalMode: (enable: boolean) => Promise<string>;
  };

  // 系統功能
  system: {
    getAppVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    showSaveDialog: (options: SaveDialogOptions) => Promise<DialogResult>;
    showOpenDialog: (options: OpenDialogOptions) => Promise<DialogResult>;
    selectDirectory: (title?: string) => Promise<string>;
    quitApp: () => Promise<void>;
    reloadApp: () => Promise<void>;
  };

  // 更新管理
  updates: {
    checkForUpdates: () => Promise<UpdateInfo>;
    downloadUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    setAutoUpdate: (enabled: boolean) => Promise<void>;
  };

  // AI 歷史記錄管理
  aiHistory: {
    create: (history: Omit<AIGenerationHistory, 'id' | 'createdAt'>) => Promise<AIGenerationHistory>;
    query: (params: AIHistoryQueryParams) => Promise<AIGenerationHistory[]>;
    markSelected: (historyId: string, projectId: string) => Promise<void>;
    delete: (historyId: string) => Promise<void>;
    cleanup: (projectId: string, keepCount: number) => Promise<number>;
  };

  // 小說分析功能
  novelAnalysis: {
    parseNovel: (text: string, filename?: string) => Promise<NovelParseResult>;
    analyzeNovel: (parseResult: NovelParseResult, options?: AnalysisOptions, onProgress?: (progress: AnalysisProgress) => void) => Promise<NovelTemplate>;
    analyzeChunk: (text: string, analysisType: 'world' | 'character' | 'plot' | 'style') => Promise<string>;
    generateTemplate: (title: string, analysis: DetailedAnalysis) => Promise<NovelTemplate>;
  };

  // EPUB 電子書生成
  epub: {
    generate: (projectId: string, options?: EPubGenerationOptions) => Promise<EPubResult>;
    getExports: (projectId: string) => Promise<EPubExportRecord[]>;
    deleteExport: (exportId: string) => Promise<void>;
  };

  // PDF 文檔生成
  pdf: {
    generate: (projectId: string, options?: PDFGenerationOptions) => Promise<PDFResult>;
    getExports: (projectId: string) => Promise<PDFExportRecord[]>;
    deleteExport: (exportId: string) => Promise<void>;
  };

  // AI 插畫生成
  illustration: {
    // 角色一致性管理
    setupCharacterConsistency: (characterId: string, characterName: string, description: string) => Promise<{ success: boolean; message?: string }>;
    generateConsistencyReport: (characterId: string, characterName: string, strictMode?: boolean) => Promise<ConsistencyCheckResponse>;
    setCharacterSeed: (characterId: string, seedValue: number, reason: string) => Promise<VisualTraitsApiResponse>;
    addReferenceImage: (characterId: string, imageUrl: string, imageType: string, tags: string[]) => Promise<{ success: boolean; message?: string }>;
    getCharacterVisualTraits: (characterId: string) => Promise<VisualTraitsApiResponse>;

    // 插畫生成
    generateIllustration: (
      projectId: string, characterId: string | null, sceneDescription: string,
      styleTemplateId: string, translationStyle: string, optimizationLevel: string,
      aspectRatio: string, safetyLevel: string, customNegativePrompt?: string,
      apiKey?: string
    ) => Promise<IllustrationGenerationResponse>;
    getIllustrationHistory: (projectId: string, characterId?: string, limit?: number, offset?: number) => Promise<IllustrationHistoryItem[]>;
    cancelGeneration: (taskId: string) => Promise<void>;
    validateImagenConnection: (apiKey: string) => Promise<TranslationValidationResponse>;

    // 批次管理
    initializeBatchManager: () => Promise<{ success: boolean; message?: string }>;
    submitBatchRequest: (name: string, projectId: string, requests: BatchRequest[], priority: string, maxParallel: number, apiKey: string) => Promise<{ batchId: string }>;
    getBatchStatus: (batchId: string) => Promise<BatchStatusResponse>;
    cancelBatch: (batchId: string) => Promise<{ success: boolean; message?: string }>;
    getAllBatchesSummary: () => Promise<BatchListResponse>;
    retryFailedTasks: (batchId: string) => Promise<{ success: boolean; message?: string }>;
    pauseBatch: (batchId: string) => Promise<{ success: boolean; message?: string }>;
    resumeBatch: (batchId: string) => Promise<{ success: boolean; message?: string }>;

    // 相似度分析
    calculateSimilarityMatrix: (projectId: string, characterIds: string[]) => Promise<{ success: boolean; character_ids?: string[]; similarity_matrix?: number[][]; message?: string }>;
    batchCheckConsistency: (projectId: string, strictMode: boolean, minScore: number) => Promise<{ success: boolean; reports?: { characterId: string; score: number; issues: string[] }[]; message?: string }>;

    // === 免費插畫生成 (Pollinations.AI) ===
    generateFreeIllustration: (
      prompt: string,
      width?: number,
      height?: number,
      model?: 'flux' | 'gptimage' | 'kontext' | 'sdxl',
      seed?: number,
      enhance?: boolean,
      style?: 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art',
      projectId?: string,
      characterId?: string
    ) => Promise<{
      success: boolean;
      id?: string;
      prompt?: string;
      image_path?: string;
      image_url?: string;
      parameters?: {
        model: string;
        width: number;
        height: number;
        seed?: number;
        enhance: boolean;
        style?: string;
      };
      generation_time_ms?: number;
      provider?: string;
      is_free?: boolean;
      message?: string;
    }>;
    testPollinationsConnection: () => Promise<{
      success: boolean;
      connected?: boolean;
      message?: string;
      provider?: string;
      is_free?: boolean;
    }>;
    getFreeIllustrationModels: () => Promise<{
      success: boolean;
      models?: Array<{
        id: string;
        name: string;
        description: string;
        is_free: boolean;
        provider: string;
      }>;
      provider?: string;
      total_count?: number;
    }>;

    // === 臨時圖像預覽管理 ===
    generateFreeIllustrationToTemp: (
      prompt: string,
      width?: number,
      height?: number,
      model?: 'flux' | 'gptimage' | 'kontext' | 'sdxl',
      seed?: number,
      enhance?: boolean,
      style?: 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art',
      projectId?: string,
      characterId?: string
    ) => Promise<{
      success: boolean;
      id?: string;
      prompt?: string;
      temp_path?: string;
      temp_url?: string;
      parameters?: {
        model: string;
        width: number;
        height: number;
        seed?: number;
        enhance: boolean;
      };
      generation_time_ms?: number;
      provider?: string;
      is_temp?: boolean;
      message?: string;
    }>;

    confirmTempImageSave: (tempImageData: any) => Promise<{
      success: boolean;
      id?: string;
      permanent_path?: string;
      permanent_url?: string;
      message?: string;
    }>;

    deleteTempImage: (tempPath: string) => Promise<{
      success: boolean;
      message?: string;
    }>;

    cleanupExpiredTempImages: () => Promise<{
      success: boolean;
      cleaned_count?: number;
      message?: string;
    }>;

    // === 批次導出功能 ===
    exportImage: (exportParams: {
      imagePath: string;
      outputPath: string;
      format: 'png' | 'jpg' | 'webp';
      quality: number;
      includeMetadata: boolean;
      metadata?: {
        prompt: string;
        parameters: any;
        provider: string;
        generationTime: number;
      };
    }) => Promise<{
      success: boolean;
      outputPath?: string;
      message?: string;
    }>;

    exportMultipleImages: (exports: Array<{
      imagePath: string;
      outputPath: string;
      format: 'png' | 'jpg' | 'webp';
      quality: number;
      includeMetadata: boolean;
      metadata?: any;
    }>) => Promise<{
      success: boolean;
      exportedFiles: string[];
      failedFiles: string[];
      message?: string;
    }>;
  };
}

// 超長上下文優化相關類型
export interface UltraLongContextOptimizationParams {
  originalContext: string;
  maxTokens: number;
  focusCharacters: string[];
  currentPosition: number;
}

export interface OptimizedContextResult {
  content: string;
  originalTokenCount: number;
  finalTokenCount: number;
  compressionRatio: number;
  compressionLevel: number;
  qualityScore: number;
  preservedElements: string[];
  lostElements: string[];
  optimizationStats: OptimizationStats;
}

export interface OptimizationStats {
  blocksProcessed: number;
  redundancyRemoved: number;
  attentionApplied: boolean;
  compressionStrategiesUsed: CompressionStrategy[];
}

export interface CompressionStrategy {
  strategyType: string;
  targetContent: string;
  parameters: Record<string, number>;
}