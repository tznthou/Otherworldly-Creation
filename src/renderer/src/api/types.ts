// 統一的 API 接口定義
import type {
  Project,
  Chapter,
  Character,
  Relationship,
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
  AIHistoryQueryParams
} from './models';

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
    createRelationship: (relationship: Omit<Relationship, 'id'>) => Promise<string>;
    deleteRelationship: (id: string) => Promise<void>;
    clearRelationships: (characterId: string) => Promise<void>;
  };

  // AI 功能
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
    runMaintenance: () => Promise<{ success: boolean; message: string }>;
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
}