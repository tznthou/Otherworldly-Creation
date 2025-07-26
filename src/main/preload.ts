import { contextBridge, ipcRenderer } from 'electron';

// 定義完整的 API 接口
export interface ElectronAPI {
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
  };

  // AI 功能
  ai: {
    checkOllamaService: () => Promise<boolean>;
    getServiceStatus: () => Promise<any>;
    listModels: () => Promise<string[]>;
    getModelsInfo: () => Promise<any>;
    checkModelAvailability: (modelName: string) => Promise<any>;
    generateText: (prompt: string, model: string, params: any) => Promise<string>;
    generateWithContext: (projectId: string, chapterId: string, position: number, model: string, params: any) => Promise<string>;
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
  };

  // 系統功能
  system: {
    getAppVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    showSaveDialog: (options: any) => Promise<any>;
    showOpenDialog: (options: any) => Promise<any>;
  };

  // 更新管理
  updates: {
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    getUpdateStatus: () => Promise<any>;
  };
}

// 暴露完整 API 到渲染進程
const electronAPI: ElectronAPI = {
  projects: {
    getAll: () => ipcRenderer.invoke('projects:getAll'),
    create: (project) => ipcRenderer.invoke('projects:create', project),
    update: (project) => ipcRenderer.invoke('projects:update', project),
    delete: (id) => ipcRenderer.invoke('projects:delete', id),
    getById: (id) => ipcRenderer.invoke('projects:getById', id),
  },
  chapters: {
    getByProjectId: (projectId) => ipcRenderer.invoke('chapters:getByProjectId', projectId),
    create: (chapter) => ipcRenderer.invoke('chapters:create', chapter),
    update: (chapter) => ipcRenderer.invoke('chapters:update', chapter),
    delete: (id) => ipcRenderer.invoke('chapters:delete', id),
    getById: (id) => ipcRenderer.invoke('chapters:getById', id),
  },
  characters: {
    getByProjectId: (projectId) => ipcRenderer.invoke('characters:getByProjectId', projectId),
    create: (character) => ipcRenderer.invoke('characters:create', character),
    update: (character) => ipcRenderer.invoke('characters:update', character),
    delete: (id) => ipcRenderer.invoke('characters:delete', id),
    getById: (id) => ipcRenderer.invoke('characters:getById', id),
  },
  ai: {
    checkOllamaService: () => ipcRenderer.invoke('ai:checkOllamaService'),
    getServiceStatus: () => ipcRenderer.invoke('ai:getServiceStatus'),
    listModels: () => ipcRenderer.invoke('ai:listModels'),
    getModelsInfo: () => ipcRenderer.invoke('ai:getModelsInfo'),
    checkModelAvailability: (modelName) => ipcRenderer.invoke('ai:checkModelAvailability', modelName),
    generateText: (prompt, model, params) => ipcRenderer.invoke('ai:generateText', prompt, model, params),
    generateWithContext: (projectId, chapterId, position, model, params) => ipcRenderer.invoke('ai:generateWithContext', projectId, chapterId, position, model, params),
    updateOllamaConfig: (config) => ipcRenderer.invoke('ai:updateOllamaConfig', config),
  },
  context: {
    buildContext: (projectId, chapterId, position) => ipcRenderer.invoke('context:buildContext', projectId, chapterId, position),
    compressContext: (context, maxTokens) => ipcRenderer.invoke('context:compressContext', context, maxTokens),
    getContextStats: (projectId) => ipcRenderer.invoke('context:getContextStats', projectId),
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },
  database: {
    backup: (path) => ipcRenderer.invoke('database:backup', path),
    restore: (path) => ipcRenderer.invoke('database:restore', path),
    runMaintenance: () => ipcRenderer.invoke('database:runMaintenance'),
    getStats: () => ipcRenderer.invoke('database:getStats'),
  },
  system: {
    getAppVersion: () => ipcRenderer.invoke('system:getAppVersion'),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
    showSaveDialog: (options) => ipcRenderer.invoke('system:showSaveDialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('system:showOpenDialog', options),
  },
  updates: {
    checkForUpdates: () => ipcRenderer.invoke('updates:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updates:downloadUpdate'),
    installUpdate: () => ipcRenderer.invoke('updates:installUpdate'),
    getUpdateStatus: () => ipcRenderer.invoke('updates:getUpdateStatus'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('完整 Preload 腳本載入完成，包含 AI 功能');

// 擴展全域類型定義
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}