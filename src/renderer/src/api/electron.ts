import type { API } from './types';

// Electron API 實現（直接轉發到 window.electronAPI）
export const electronAPI: API = {
  projects: {
    getAll: () => window.electronAPI.projects.getAll(),
    create: (project) => window.electronAPI.projects.create(project),
    update: (project) => window.electronAPI.projects.update(project),
    delete: (id) => window.electronAPI.projects.delete(id),
    getById: (id) => window.electronAPI.projects.getById(id),
  },
  
  chapters: {
    getByProjectId: (projectId) => window.electronAPI.chapters.getByProjectId(projectId),
    create: (chapter) => window.electronAPI.chapters.create(chapter),
    update: (chapter) => window.electronAPI.chapters.update(chapter),
    delete: (id) => window.electronAPI.chapters.delete(id),
    getById: (id) => window.electronAPI.chapters.getById(id),
  },

  characters: {
    getByProjectId: (projectId) => window.electronAPI.characters.getByProjectId(projectId),
    create: (character) => window.electronAPI.characters.create(character),
    update: (character) => window.electronAPI.characters.update(character),
    delete: (id) => window.electronAPI.characters.delete(id),
    getById: (id) => window.electronAPI.characters.getById(id),
    createRelationship: (relationship) => window.electronAPI.characters.createRelationship(relationship),
    deleteRelationship: (id) => window.electronAPI.characters.deleteRelationship(id),
    clearRelationships: (characterId) => window.electronAPI.characters.clearRelationships(characterId),
  },

  ai: {
    checkOllamaService: () => window.electronAPI.ai.checkOllamaService(),
    getServiceStatus: () => window.electronAPI.ai.getServiceStatus(),
    listModels: () => window.electronAPI.ai.listModels(),
    getModelsInfo: () => window.electronAPI.ai.getModelsInfo(),
    checkModelAvailability: (modelName) => window.electronAPI.ai.checkModelAvailability(modelName),
    generateText: (prompt, model, params) => window.electronAPI.ai.generateText(prompt, model, params),
    generateWithContext: (projectId, chapterId, position, model, params) => 
      window.electronAPI.ai.generateWithContext(projectId, chapterId, position, model, params),
    updateOllamaConfig: (config) => window.electronAPI.ai.updateOllamaConfig(config),
  },

  context: {
    buildContext: (projectId, chapterId, position) => 
      window.electronAPI.context.buildContext(projectId, chapterId, position),
    compressContext: (context, maxTokens) => 
      window.electronAPI.context.compressContext(context, maxTokens),
    getContextStats: (projectId) => window.electronAPI.context.getContextStats(projectId),
  },

  settings: {
    get: (key) => window.electronAPI.settings.get(key),
    set: (key, value) => window.electronAPI.settings.set(key, value),
    getAll: () => window.electronAPI.settings.getAll(),
    reset: () => window.electronAPI.settings.reset(),
  },

  database: {
    backup: (path) => window.electronAPI.database.backup(path),
    restore: (path) => window.electronAPI.database.restore(path),
    runMaintenance: () => window.electronAPI.database.runMaintenance(),
    getStats: () => window.electronAPI.database.getStats(),
  },

  system: {
    getAppVersion: () => window.electronAPI.system.getAppVersion(),
    openExternal: (url) => window.electronAPI.system.openExternal(url),
    showSaveDialog: (options) => window.electronAPI.system.showSaveDialog(options),
    showOpenDialog: (options) => window.electronAPI.system.showOpenDialog(options),
    quitApp: async () => {
      // Electron 版本使用 ipcRenderer
      await window.electronAPI.system.quit();
    },
    reloadApp: async () => {
      // Electron 版本使用 ipcRenderer  
      await window.electronAPI.system.reload();
    },
  },

  updates: {
    checkForUpdates: () => window.electronAPI.updates.checkForUpdates(),
    downloadUpdate: () => window.electronAPI.updates.downloadUpdate(),
    installUpdate: () => window.electronAPI.updates.installUpdate(),
    setAutoUpdate: (enabled) => window.electronAPI.updates.setAutoUpdate(enabled),
  },
};