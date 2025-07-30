import type { API } from './types';

// 安全的 electronAPI 訪問函數
const getElectronAPI = () => {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error('Electron API 不可用');
  }
  return window.electronAPI;
};

// Electron API 實現（直接轉發到 window.electronAPI）
export const electronAPI: API = {
  projects: {
    getAll: () => getElectronAPI().projects.getAll(),
    create: (project) => getElectronAPI().projects.create(project),
    update: (project) => getElectronAPI().projects.update(project),
    delete: (id) => getElectronAPI().projects.delete(id),
    getById: (id) => getElectronAPI().projects.getById(id),
  },
  
  chapters: {
    getByProjectId: (projectId) => getElectronAPI().chapters.getByProjectId(projectId),
    create: (chapter) => getElectronAPI().chapters.create(chapter),
    update: (chapter) => getElectronAPI().chapters.update(chapter),
    delete: (id) => getElectronAPI().chapters.delete(id),
    getById: (id) => getElectronAPI().chapters.getById(id),
  },

  characters: {
    getByProjectId: (projectId) => getElectronAPI().characters.getByProjectId(projectId),
    create: (character) => getElectronAPI().characters.create(character),
    update: (character) => getElectronAPI().characters.update(character),
    delete: (id) => getElectronAPI().characters.delete(id),
    getById: (id) => getElectronAPI().characters.getById(id),
    createRelationship: (relationship) => getElectronAPI().characters.createRelationship(relationship),
    deleteRelationship: (id) => getElectronAPI().characters.deleteRelationship(id),
    clearRelationships: (characterId) => getElectronAPI().characters.clearRelationships(characterId),
  },

  ai: {
    checkOllamaService: () => getElectronAPI().ai.checkOllamaService(),
    getServiceStatus: () => getElectronAPI().ai.getServiceStatus(),
    listModels: () => getElectronAPI().ai.listModels(),
    getModelsInfo: () => getElectronAPI().ai.getModelsInfo(),
    checkModelAvailability: (modelName) => getElectronAPI().ai.checkModelAvailability(modelName),
    generateText: (prompt, model, params) => getElectronAPI().ai.generateText(prompt, model, params),
    generateWithContext: (projectId, chapterId, position, model, params) => 
      getElectronAPI().ai.generateWithContext(projectId, chapterId, position, model, params),
    updateOllamaConfig: (config) => getElectronAPI().ai.updateOllamaConfig(config),
  },

  context: {
    buildContext: (projectId, chapterId, position) => 
      getElectronAPI().context.buildContext(projectId, chapterId, position),
    compressContext: (context, maxTokens) => 
      getElectronAPI().context.compressContext(context, maxTokens),
    getContextStats: (projectId) => getElectronAPI().context.getContextStats(projectId),
  },

  settings: {
    get: (key) => getElectronAPI().settings.get(key),
    set: (key, value) => getElectronAPI().settings.set(key, value),
    getAll: () => getElectronAPI().settings.getAll(),
    reset: () => getElectronAPI().settings.reset(),
  },

  database: {
    backup: (path) => getElectronAPI().database.backup(path),
    restore: (path) => getElectronAPI().database.restore(path),
    runMaintenance: () => getElectronAPI().database.runMaintenance(),
    getStats: () => getElectronAPI().database.getStats(),
  },

  system: {
    getAppVersion: () => getElectronAPI().system.getAppVersion(),
    openExternal: (url) => getElectronAPI().system.openExternal(url),
    showSaveDialog: (options) => getElectronAPI().system.showSaveDialog(options),
    showOpenDialog: (options) => getElectronAPI().system.showOpenDialog(options),
    quitApp: async () => {
      // Electron 版本使用 ipcRenderer
      await getElectronAPI().system.quit();
    },
    reloadApp: async () => {
      // Electron 版本使用 ipcRenderer  
      await getElectronAPI().system.reload();
    },
  },

  updates: {
    checkForUpdates: () => getElectronAPI().updates.checkForUpdates(),
    downloadUpdate: () => getElectronAPI().updates.downloadUpdate(),
    installUpdate: () => getElectronAPI().updates.installUpdate(),
    setAutoUpdate: (enabled) => getElectronAPI().updates.setAutoUpdate(enabled),
  },
};