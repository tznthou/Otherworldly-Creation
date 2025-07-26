import { contextBridge, ipcRenderer } from 'electron';

// 定義 API 接口
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
    delete: (id: string, forceDelete?: boolean) => Promise<void>;
    getById: (id: string) => Promise<any>;
    updateRelationships: (characterId: string, relationships: any[]) => Promise<void>;
    getRelationships: (characterId: string) => Promise<any[]>;
    checkRelationshipConsistency: (projectId: string) => Promise<any[]>;
    checkReferences: (characterId: string) => Promise<any>;
  };
  
  // AI 引擎
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
  
  // 系統功能
  system: {
    getVersion: () => Promise<string>;
    showMessageBox: (options: any) => Promise<any>;
  };
  
  // 設定管理
  settings: {
    loadSettings: () => Promise<any>;
    saveSettings: (settings: any) => Promise<void>;
    resetSettings: () => Promise<void>;
    updateSettings: (settings: any) => Promise<void>;
  };
  
  // 資料庫維護
  database: {
    healthCheck: () => Promise<any>;
    autoRepair: (issues: any[]) => Promise<any>;
    generateReport: (checkResult: any) => Promise<string>;
    optimize: () => Promise<any>;
    export: () => Promise<any>;
    import: () => Promise<any>;
    getStatistics: () => Promise<any>;
    checkIntegrity: () => Promise<any>;
    vacuum: () => Promise<any>;
    analyze: () => Promise<any>;
  };
  
  // 自動更新
  update: {
    checkForUpdates: () => Promise<any>;
    downloadUpdate: (updateInfo: any) => Promise<string>;
    installUpdate: (updateFilePath: string) => Promise<void>;
    checkPendingUpdate: () => Promise<string | null>;
    getVersion: () => Promise<string>;
    getStatus: () => Promise<any>;
    autoCheck: () => Promise<any>;
    onUpdateAvailable: (callback: (updateInfo: any) => void) => void;
    onDownloadProgress: (callback: (progress: any) => void) => void;
    onPendingInstall: (callback: (updatePath: string) => void) => void;
    removeAllListeners: () => void;
  };
}

// 暴露保護的方法給渲染進程
const electronAPI: ElectronAPI = {
  projects: {
    getAll: () => ipcRenderer.invoke('projects:getAll'),
    create: (project: any) => ipcRenderer.invoke('projects:create', project),
    update: (project: any) => ipcRenderer.invoke('projects:update', project),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
    getById: (id: string) => ipcRenderer.invoke('projects:getById', id),
  },
  
  chapters: {
    getByProjectId: (projectId: string) => ipcRenderer.invoke('chapters:getByProjectId', projectId),
    create: (chapter: any) => ipcRenderer.invoke('chapters:create', chapter),
    update: (chapter: any) => ipcRenderer.invoke('chapters:update', chapter),
    delete: (id: string) => ipcRenderer.invoke('chapters:delete', id),
    getById: (id: string) => ipcRenderer.invoke('chapters:getById', id),
  },
  
  characters: {
    getByProjectId: (projectId: string) => ipcRenderer.invoke('characters:getByProjectId', projectId),
    create: (character: any) => ipcRenderer.invoke('characters:create', character),
    update: (character: any) => ipcRenderer.invoke('characters:update', character),
    delete: (id: string, forceDelete?: boolean) => ipcRenderer.invoke('characters:delete', id, forceDelete),
    getById: (id: string) => ipcRenderer.invoke('characters:getById', id),
    updateRelationships: (characterId: string, relationships: any[]) => 
      ipcRenderer.invoke('characters:updateRelationships', characterId, relationships),
    getRelationships: (characterId: string) => ipcRenderer.invoke('characters:getRelationships', characterId),
    checkRelationshipConsistency: (projectId: string) => 
      ipcRenderer.invoke('characters:checkRelationshipConsistency', projectId),
    checkReferences: (characterId: string) => ipcRenderer.invoke('characters:checkReferences', characterId),
  },
  
  ai: {
    checkOllamaService: () => ipcRenderer.invoke('ai:checkOllamaService'),
    getServiceStatus: () => ipcRenderer.invoke('ai:getServiceStatus'),
    listModels: () => ipcRenderer.invoke('ai:listModels'),
    getModelsInfo: () => ipcRenderer.invoke('ai:getModelsInfo'),
    checkModelAvailability: (modelName: string) => ipcRenderer.invoke('ai:checkModelAvailability', modelName),
    generateText: (prompt: string, model: string, params: any) => 
      ipcRenderer.invoke('ai:generateText', prompt, model, params),
    generateWithContext: (projectId: string, chapterId: string, position: number, model: string, params: any) => 
      ipcRenderer.invoke('ai:generateWithContext', projectId, chapterId, position, model, params),
    updateOllamaConfig: (config: any) => ipcRenderer.invoke('ai:updateOllamaConfig', config),
  },
  
  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    showMessageBox: (options: any) => ipcRenderer.invoke('system:showMessageBox', options),
  },
  
  settings: {
    loadSettings: () => ipcRenderer.invoke('settings:load'),
    saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
    resetSettings: () => ipcRenderer.invoke('settings:reset'),
    updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  },
  
  database: {
    healthCheck: () => ipcRenderer.invoke('database:healthCheck'),
    autoRepair: (issues: any[]) => ipcRenderer.invoke('database:autoRepair', issues),
    generateReport: (checkResult: any) => ipcRenderer.invoke('database:generateReport', checkResult),
    optimize: () => ipcRenderer.invoke('database:optimize'),
    export: () => ipcRenderer.invoke('database:export'),
    import: () => ipcRenderer.invoke('database:import'),
    getStatistics: () => ipcRenderer.invoke('database:getStatistics'),
    checkIntegrity: () => ipcRenderer.invoke('database:checkIntegrity'),
    vacuum: () => ipcRenderer.invoke('database:vacuum'),
    analyze: () => ipcRenderer.invoke('database:analyze'),
  },
  
  update: {
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: (updateInfo: any) => ipcRenderer.invoke('update:download', updateInfo),
    installUpdate: (updateFilePath: string) => ipcRenderer.invoke('update:install', updateFilePath),
    checkPendingUpdate: () => ipcRenderer.invoke('update:check-pending'),
    getVersion: () => ipcRenderer.invoke('update:get-version'),
    getStatus: () => ipcRenderer.invoke('update:get-status'),
    autoCheck: () => ipcRenderer.invoke('update:auto-check'),
    onUpdateAvailable: (callback: (updateInfo: any) => void) => {
      ipcRenderer.on('update:available', (_, updateInfo) => callback(updateInfo));
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('update:download-progress', (_, progress) => callback(progress));
    },
    onPendingInstall: (callback: (updatePath: string) => void) => {
      ipcRenderer.on('update:pending-install', (_, updatePath) => callback(updatePath));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('update:available');
      ipcRenderer.removeAllListeners('update:download-progress');
      ipcRenderer.removeAllListeners('update:pending-install');
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 類型聲明，讓 TypeScript 知道 window.electronAPI 的存在
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}