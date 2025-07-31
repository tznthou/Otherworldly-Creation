// 安全 API 代理系統 - 完全防故障的 API 包裝器
import type { API } from './types';
import { environmentSafety, safeExecute, isApiSafe, reportError } from '../utils/environmentSafety';

// 純前端模擬資料系統
class FrontendFallbackData {
  private projects: any[] = [];
  private chapters: any[] = [];
  private characters: any[] = [];
  private settings: any = {};

  // 專案相關的模擬資料
  async getProjects() {
    return [...this.projects];
  }

  async createProject(project: any) {
    const newProject = {
      id: Date.now().toString(),
      ...project,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.unshift(newProject);
    return newProject.id;
  }

  async updateProject(project: any) {
    const index = this.projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      this.projects[index] = { ...project, updatedAt: new Date() };
    }
  }

  async deleteProject(id: string) {
    this.projects = this.projects.filter(p => p.id !== id);
    // 同時刪除相關的章節和角色
    this.chapters = this.chapters.filter(c => c.projectId !== id);
    this.characters = this.characters.filter(c => c.projectId !== id);
  }

  async getProjectById(id: string) {
    return this.projects.find(p => p.id === id) || null;
  }

  // 章節相關的模擬資料
  async getChaptersByProjectId(projectId: string) {
    return this.chapters.filter(c => c.projectId === projectId);
  }

  async createChapter(chapter: any) {
    const newChapter = {
      id: Date.now().toString(),
      ...chapter,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chapters.push(newChapter);
    return newChapter.id;
  }

  async updateChapter(chapter: any) {
    const index = this.chapters.findIndex(c => c.id === chapter.id);
    if (index !== -1) {
      this.chapters[index] = { ...chapter, updatedAt: new Date() };
    }
  }

  async deleteChapter(id: string) {
    this.chapters = this.chapters.filter(c => c.id !== id);
  }

  async getChapterById(id: string) {
    return this.chapters.find(c => c.id === id) || null;
  }

  // 角色相關的模擬資料
  async getCharactersByProjectId(projectId: string) {
    return this.characters.filter(c => c.projectId === projectId);
  }

  async createCharacter(character: any) {
    const newCharacter = {
      id: Date.now().toString(),
      ...character,
      createdAt: new Date(),
      updatedAt: new Date(),
      relationships: []
    };
    this.characters.push(newCharacter);
    return newCharacter.id;
  }

  async updateCharacter(character: any) {
    const index = this.characters.findIndex(c => c.id === character.id);
    if (index !== -1) {
      this.characters[index] = { ...character, updatedAt: new Date() };
    }
  }

  async deleteCharacter(id: string) {
    this.characters = this.characters.filter(c => c.id !== id);
  }

  async getCharacterById(id: string) {
    return this.characters.find(c => c.id === id) || null;
  }

  // 設定相關的模擬資料
  async getSetting(key: string) {
    return this.settings[key] || null;
  }

  async setSetting(key: string, value: any) {
    this.settings[key] = value;
  }

  async getAllSettings() {
    return { ...this.settings };
  }

  async resetSettings() {
    this.settings = {};
  }

  // AI 相關的模擬資料
  async checkOllamaService() {
    return false; // 純前端模式下，AI 服務不可用
  }

  async getServiceStatus() {
    return {
      service: { available: false, error: '純前端模式：AI 服務不可用' },
      models: { count: 0, list: [] },
      last_checked: new Date().toISOString()
    };
  }

  async listModels() {
    return [];
  }

  async getModelsInfo() {
    return { success: false, models: [], error: '純前端模式：AI 服務不可用' };
  }
}

// 創建全域純前端資料實例
const frontendFallback = new FrontendFallbackData();

// 安全 API 包裝器
class SafeAPIWrapper {
  private realTauriAPI: any = null;
  private realElectronAPI: any = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    const env = environmentSafety.detectEnvironment();
    console.log('SafeAPIWrapper 初始化，環境:', env);

    // 如果不是安全模式，嘗試載入真實 API
    if (!env.safeMode) {
      if (env.isTauri && env.tauriApiAvailable) {
        try {
          const { tauriAPI } = await import('./tauri');
          this.realTauriAPI = tauriAPI;
          console.log('✅ Tauri API 載入成功');
        } catch (error) {
          reportError(error as Error, 'SafeAPIWrapper-TauriLoad');
          console.warn('❌ Tauri API 載入失敗，使用純前端模式');
        }
      } else if (env.isElectron && env.electronApiAvailable) {
        try {
          const { electronAPI } = await import('./electron');
          this.realElectronAPI = electronAPI;
          console.log('✅ Electron API 載入成功');
        } catch (error) {
          reportError(error as Error, 'SafeAPIWrapper-ElectronLoad');
          console.warn('❌ Electron API 載入失敗，使用純前端模式');
        }
      }
    }

    this.initialized = true;
  }

  // 安全執行 API 調用
  private async safeCall<T>(
    realApiCall: () => Promise<T>,
    fallbackCall: () => Promise<T>,
    context: string
  ): Promise<T> {
    return safeExecute(realApiCall, await fallbackCall(), context);
  }

  // 生成安全的 API 實現
  generateSafeAPI(): API {
    return {
      projects: {
        getAll: () => this.safeCall(
          () => this.realTauriAPI?.projects.getAll() || this.realElectronAPI?.projects.getAll(),
          () => frontendFallback.getProjects(),
          'projects.getAll'
        ),
        create: (project) => this.safeCall(
          () => this.realTauriAPI?.projects.create(project) || this.realElectronAPI?.projects.create(project),
          () => frontendFallback.createProject(project),
          'projects.create'
        ),
        update: (project) => this.safeCall(
          () => this.realTauriAPI?.projects.update(project) || this.realElectronAPI?.projects.update(project),
          () => frontendFallback.updateProject(project),
          'projects.update'
        ),
        delete: (id) => this.safeCall(
          () => this.realTauriAPI?.projects.delete(id) || this.realElectronAPI?.projects.delete(id),
          () => frontendFallback.deleteProject(id),
          'projects.delete'
        ),
        getById: (id) => this.safeCall(
          () => this.realTauriAPI?.projects.getById(id) || this.realElectronAPI?.projects.getById(id),
          () => frontendFallback.getProjectById(id),
          'projects.getById'
        ),
      },

      chapters: {
        getByProjectId: (projectId) => this.safeCall(
          () => this.realTauriAPI?.chapters.getByProjectId(projectId) || this.realElectronAPI?.chapters.getByProjectId(projectId),
          () => frontendFallback.getChaptersByProjectId(projectId),
          'chapters.getByProjectId'
        ),
        create: (chapter) => this.safeCall(
          () => this.realTauriAPI?.chapters.create(chapter) || this.realElectronAPI?.chapters.create(chapter),
          () => frontendFallback.createChapter(chapter),
          'chapters.create'
        ),
        update: (chapter) => this.safeCall(
          () => this.realTauriAPI?.chapters.update(chapter) || this.realElectronAPI?.chapters.update(chapter),
          () => frontendFallback.updateChapter(chapter),
          'chapters.update'
        ),
        delete: (id) => this.safeCall(
          () => this.realTauriAPI?.chapters.delete(id) || this.realElectronAPI?.chapters.delete(id),
          () => frontendFallback.deleteChapter(id),
          'chapters.delete'
        ),
        getById: (id) => this.safeCall(
          () => this.realTauriAPI?.chapters.getById(id) || this.realElectronAPI?.chapters.getById(id),
          () => frontendFallback.getChapterById(id),
          'chapters.getById'
        ),
      },

      characters: {
        getByProjectId: (projectId) => this.safeCall(
          () => this.realTauriAPI?.characters.getByProjectId(projectId) || this.realElectronAPI?.characters.getByProjectId(projectId),
          () => frontendFallback.getCharactersByProjectId(projectId),
          'characters.getByProjectId'
        ),
        create: (character) => this.safeCall(
          () => this.realTauriAPI?.characters.create(character) || this.realElectronAPI?.characters.create(character),
          () => frontendFallback.createCharacter(character),
          'characters.create'
        ),
        update: (character) => this.safeCall(
          () => this.realTauriAPI?.characters.update(character) || this.realElectronAPI?.characters.update(character),
          () => frontendFallback.updateCharacter(character),
          'characters.update'
        ),
        delete: (id) => this.safeCall(
          () => this.realTauriAPI?.characters.delete(id) || this.realElectronAPI?.characters.delete(id),
          () => frontendFallback.deleteCharacter(id),
          'characters.delete'
        ),
        getById: (id) => this.safeCall(
          () => this.realTauriAPI?.characters.getById(id) || this.realElectronAPI?.characters.getById(id),
          () => frontendFallback.getCharacterById(id),
          'characters.getById'
        ),
        createRelationship: (relationship) => this.safeCall(
          () => this.realTauriAPI?.characters.createRelationship(relationship) || this.realElectronAPI?.characters.createRelationship(relationship),
          () => Promise.resolve(),
          'characters.createRelationship'
        ),
        deleteRelationship: (id) => this.safeCall(
          () => this.realTauriAPI?.characters.deleteRelationship(id) || this.realElectronAPI?.characters.deleteRelationship(id),
          () => Promise.resolve(),
          'characters.deleteRelationship'
        ),
        clearRelationships: (characterId) => this.safeCall(
          () => this.realTauriAPI?.characters.clearRelationships(characterId) || this.realElectronAPI?.characters.clearRelationships(characterId),
          () => Promise.resolve(),
          'characters.clearRelationships'
        ),
      },

      ai: {
        checkOllamaService: () => this.safeCall(
          () => this.realTauriAPI?.ai.checkOllamaService() || this.realElectronAPI?.ai.checkOllamaService(),
          () => frontendFallback.checkOllamaService(),
          'ai.checkOllamaService'
        ),
        getServiceStatus: () => this.safeCall(
          () => this.realTauriAPI?.ai.getServiceStatus() || this.realElectronAPI?.ai.getServiceStatus(),
          () => frontendFallback.getServiceStatus(),
          'ai.getServiceStatus'
        ),
        listModels: () => this.safeCall(
          () => this.realTauriAPI?.ai.listModels() || this.realElectronAPI?.ai.listModels(),
          () => frontendFallback.listModels(),
          'ai.listModels'
        ),
        getModelsInfo: () => this.safeCall(
          () => this.realTauriAPI?.ai.getModelsInfo() || this.realElectronAPI?.ai.getModelsInfo(),
          () => frontendFallback.getModelsInfo(),
          'ai.getModelsInfo'
        ),
        checkModelAvailability: (modelName) => this.safeCall(
          () => this.realTauriAPI?.ai.checkModelAvailability(modelName) || this.realElectronAPI?.ai.checkModelAvailability(modelName),
          () => Promise.resolve({ available: false, error: '純前端模式：AI 服務不可用' }),
          'ai.checkModelAvailability'
        ),
        generateText: (prompt, model, params) => this.safeCall(
          () => this.realTauriAPI?.ai.generateText(prompt, model, params) || this.realElectronAPI?.ai.generateText(prompt, model, params),
          () => Promise.reject(new Error('純前端模式：AI 文本生成不可用')),
          'ai.generateText'
        ),
        generateWithContext: (projectId, chapterId, position, model, params) => this.safeCall(
          () => this.realTauriAPI?.ai.generateWithContext(projectId, chapterId, position, model, params) || this.realElectronAPI?.ai.generateWithContext(projectId, chapterId, position, model, params),
          () => Promise.reject(new Error('純前端模式：AI 上下文生成不可用')),
          'ai.generateWithContext'
        ),
        updateOllamaConfig: (config) => this.safeCall(
          () => this.realTauriAPI?.ai.updateOllamaConfig(config) || this.realElectronAPI?.ai.updateOllamaConfig(config),
          () => Promise.resolve(),
          'ai.updateOllamaConfig'
        ),
      },

      context: {
        buildContext: (projectId, chapterId, position) => this.safeCall(
          () => this.realTauriAPI?.context.buildContext(projectId, chapterId, position) || this.realElectronAPI?.context.buildContext(projectId, chapterId, position),
          () => Promise.resolve(''),
          'context.buildContext'
        ),
        compressContext: (context, maxTokens) => this.safeCall(
          () => this.realTauriAPI?.context.compressContext(context, maxTokens) || this.realElectronAPI?.context.compressContext(context, maxTokens),
          () => Promise.resolve(context.slice(0, maxTokens * 4)), // 簡單截斷
          'context.compressContext'
        ),
        getContextStats: (projectId) => this.safeCall(
          () => this.realTauriAPI?.context.getContextStats(projectId) || this.realElectronAPI?.context.getContextStats(projectId),
          () => Promise.resolve({ totalChapters: 0, totalCharacters: 0, totalWords: 0 }),
          'context.getContextStats'
        ),
      },

      settings: {
        get: (key) => this.safeCall(
          () => this.realTauriAPI?.settings.get(key) || this.realElectronAPI?.settings.get(key),
          () => frontendFallback.getSetting(key),
          'settings.get'
        ),
        set: (key, value) => this.safeCall(
          () => this.realTauriAPI?.settings.set(key, value) || this.realElectronAPI?.settings.set(key, value),
          () => frontendFallback.setSetting(key, value),
          'settings.set'
        ),
        getAll: () => this.safeCall(
          () => this.realTauriAPI?.settings.getAll() || this.realElectronAPI?.settings.getAll(),
          () => frontendFallback.getAllSettings(),
          'settings.getAll'
        ),
        reset: () => this.safeCall(
          () => this.realTauriAPI?.settings.reset() || this.realElectronAPI?.settings.reset(),
          () => frontendFallback.resetSettings(),
          'settings.reset'
        ),
      },

      database: {
        backup: (path) => this.safeCall(
          () => this.realTauriAPI?.database.backup(path) || this.realElectronAPI?.database.backup(path),
          () => Promise.reject(new Error('純前端模式：資料庫備份不可用')),
          'database.backup'
        ),
        restore: (path) => this.safeCall(
          () => this.realTauriAPI?.database.restore(path) || this.realElectronAPI?.database.restore(path),
          () => Promise.reject(new Error('純前端模式：資料庫還原不可用')),
          'database.restore'
        ),
        runMaintenance: () => this.safeCall(
          () => this.realTauriAPI?.database.runMaintenance() || this.realElectronAPI?.database.runMaintenance(),
          () => Promise.resolve(),
          'database.runMaintenance'
        ),
        getStats: () => this.safeCall(
          () => this.realTauriAPI?.database.getStats() || this.realElectronAPI?.database.getStats(),
          () => Promise.resolve({ size: 0, projects: 0, chapters: 0, characters: 0 }),
          'database.getStats'
        ),
        healthCheck: () => this.safeCall(
          () => this.realTauriAPI?.database.healthCheck() || this.realElectronAPI?.database.healthCheck(),
          () => Promise.resolve({ healthy: true, message: '純前端模式運行正常' }),
          'database.healthCheck'
        ),
      },

      system: {
        getAppVersion: () => this.safeCall(
          () => this.realTauriAPI?.system.getAppVersion() || this.realElectronAPI?.system.getAppVersion(),
          () => Promise.resolve('0.4.12-frontend'),
          'system.getAppVersion'
        ),
        openExternal: (url) => this.safeCall(
          () => this.realTauriAPI?.system.openExternal(url) || this.realElectronAPI?.system.openExternal(url),
          () => { window.open(url, '_blank'); return Promise.resolve(); },
          'system.openExternal'
        ),
        showSaveDialog: (options) => this.safeCall(
          () => this.realTauriAPI?.system.showSaveDialog(options) || this.realElectronAPI?.system.showSaveDialog(options),
          () => Promise.resolve(null),
          'system.showSaveDialog'
        ),
        showOpenDialog: (options) => this.safeCall(
          () => this.realTauriAPI?.system.showOpenDialog(options) || this.realElectronAPI?.system.showOpenDialog(options),
          () => Promise.resolve(null),
          'system.showOpenDialog'
        ),
        quitApp: () => this.safeCall(
          () => this.realTauriAPI?.system.quitApp() || this.realElectronAPI?.system.quitApp(),
          () => { window.close(); return Promise.resolve(); },
          'system.quitApp'
        ),
        reloadApp: () => this.safeCall(
          () => this.realTauriAPI?.system.reloadApp() || this.realElectronAPI?.system.reloadApp(),
          () => { window.location.reload(); return Promise.resolve(); },
          'system.reloadApp'
        ),
      },

      updates: {
        checkForUpdates: () => this.safeCall(
          () => this.realTauriAPI?.updates.checkForUpdates() || this.realElectronAPI?.updates.checkForUpdates(),
          () => Promise.resolve({ available: false, version: '', notes: '' }),
          'updates.checkForUpdates'
        ),
        downloadUpdate: () => this.safeCall(
          () => this.realTauriAPI?.updates.downloadUpdate() || this.realElectronAPI?.updates.downloadUpdate(),
          () => Promise.reject(new Error('純前端模式：更新功能不可用')),
          'updates.downloadUpdate'
        ),
        installUpdate: () => this.safeCall(
          () => this.realTauriAPI?.updates.installUpdate() || this.realElectronAPI?.updates.installUpdate(),
          () => Promise.reject(new Error('純前端模式：更新功能不可用')),
          'updates.installUpdate'
        ),
        setAutoUpdate: (enabled) => this.safeCall(
          () => this.realTauriAPI?.updates.setAutoUpdate(enabled) || this.realElectronAPI?.updates.setAutoUpdate(enabled),
          () => Promise.resolve(),
          'updates.setAutoUpdate'
        ),
      },
    };
  }
}

// 創建並導出安全 API 實例
const safeAPIWrapper = new SafeAPIWrapper();

export const initializeSafeAPI = async (): Promise<API> => {
  await safeAPIWrapper.initialize();
  return safeAPIWrapper.generateSafeAPI();
};

export default safeAPIWrapper;