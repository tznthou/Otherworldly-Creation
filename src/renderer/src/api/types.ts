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
  EPubExportRecord
} from './models';

// 小說分析相關類型
import type { NovelParseResult } from '../services/novelParserService';
import type { 
  DetailedAnalysis,
  AnalysisOptions,
  AnalysisProgress
} from '../services/novelAnalysisService';
import type { NovelTemplate } from '../types/template';

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
  };

  // 上下文管理
  context: {
    buildContext: (projectId: string, chapterId: string, position: number) => Promise<string>;
    compressContext: (context: string, maxTokens: number) => Promise<string>;
    getContextStats: (projectId: string) => Promise<ContextStats>;
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
  };

  // 系統功能
  system: {
    getAppVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    showSaveDialog: (options: SaveDialogOptions) => Promise<DialogResult>;
    showOpenDialog: (options: OpenDialogOptions) => Promise<DialogResult>;
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
}