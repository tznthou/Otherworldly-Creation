// 統一的 API 接口定義
export interface API {
  // 專案管理
  projects: {
    getAll: () => Promise<any[]>;
    create: (project: any) => Promise<string>;
    update: (project: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
  };
  
  // 章節管理
  chapters: {
    getByProjectId: (projectId: string) => Promise<any[]>;
    create: (chapter: any) => Promise<string>;
    update: (chapter: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
  };

  // 角色管理
  characters: {
    getByProjectId: (projectId: string) => Promise<any[]>;
    create: (character: any) => Promise<string>;
    update: (character: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
    createRelationship: (relationship: any) => Promise<string>;
    deleteRelationship: (id: string) => Promise<void>;
    clearRelationships: (characterId: string) => Promise<void>;
  };

  // AI 功能
  ai: {
    checkOllamaService: () => Promise<boolean>;
    getServiceStatus: () => Promise<any>;
    listModels: () => Promise<string[]>;
    getModelsInfo: () => Promise<any>;
    checkModelAvailability: (modelName: string) => Promise<any>;
    generateText: (prompt: string, model: string, params: any) => Promise<string>;
    generateWithContext: (projectId: string, chapterId: string, position: number, model: string, params: any, language?: string) => Promise<string>;
    updateOllamaConfig: (config: any) => Promise<any>;
  };

  // 上下文管理
  context: {
    buildContext: (projectId: string, chapterId: string, position: number) => Promise<string>;
    compressContext: (context: string, maxTokens: number) => Promise<string>;
    getContextStats: (projectId: string) => Promise<any>;
  };

  // 設定管理
  settings: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    getAll: () => Promise<any>;
    reset: () => Promise<void>;
  };

  // 資料庫維護
  database: {
    backup: (path: string) => Promise<void>;
    restore: (path: string) => Promise<void>;
    runMaintenance: () => Promise<any>;
    getStats: () => Promise<any>;
    healthCheck: () => Promise<any>;
  };

  // 系統功能
  system: {
    getAppVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    showSaveDialog: (options: any) => Promise<any>;
    showOpenDialog: (options: any) => Promise<any>;
    quitApp: () => Promise<void>;
    reloadApp: () => Promise<void>;
  };

  // 更新管理
  updates: {
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    setAutoUpdate: (enabled: boolean) => Promise<void>;
  };

  // AI 歷史記錄管理
  aiHistory: {
    create: (history: any) => Promise<any>;
    query: (params: any) => Promise<any[]>;
    markSelected: (historyId: string, projectId: string) => Promise<void>;
    delete: (historyId: string) => Promise<void>;
    cleanup: (projectId: string, keepCount: number) => Promise<number>;
  };
}