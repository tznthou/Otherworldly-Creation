import { invoke } from '@tauri-apps/api/core';
import type { API } from './types';

// Tauri API 實現
export const tauriAPI: API = {
  projects: {
    getAll: () => invoke('get_all_projects'),
    create: (project) => invoke('create_project', { project }),
    update: (project) => invoke('update_project', { project }),
    delete: (id) => invoke('delete_project', { id }),
    getById: (id) => invoke('get_project_by_id', { id }),
  },
  
  chapters: {
    getByProjectId: (projectId) => invoke('get_chapters_by_project_id', { projectId }),
    create: (chapter) => invoke('create_chapter', { chapter }),
    update: (chapter) => invoke('update_chapter', { chapter }),
    delete: (id) => invoke('delete_chapter', { id }),
    getById: (id) => invoke('get_chapter_by_id', { id }),
  },

  characters: {
    getByProjectId: (projectId) => invoke('get_characters_by_project_id', { projectId }),
    create: (character) => invoke('create_character', { character }),
    update: (character) => invoke('update_character', { character }),
    delete: (id) => invoke('delete_character', { id }),
    getById: (id) => invoke('get_character_by_id', { id }),
    createRelationship: (relationship) => invoke('create_character_relationship', { relationship }),
    deleteRelationship: (id) => invoke('delete_character_relationship', { id }),
    clearRelationships: (characterId) => invoke('clear_character_relationships', { characterId }),
  },

  ai: {
    checkOllamaService: () => invoke('check_ollama_service'),
    getServiceStatus: () => invoke('get_ai_service_status'),
    listModels: () => invoke('list_ai_models'),
    getModelsInfo: () => invoke('get_models_info'),
    checkModelAvailability: (modelName) => invoke('check_model_availability', { modelName }),
    generateText: (prompt, model, params) => invoke('generate_text', { prompt, model, params }),
    generateWithContext: (projectId, chapterId, position, model, params) => 
      invoke('generate_with_context', { projectId, chapterId, position, model, params }),
    updateOllamaConfig: (config) => invoke('update_ollama_config', { config }),
  },

  context: {
    buildContext: (projectId, chapterId, position) => 
      invoke('build_context', { projectId, chapterId, position }),
    compressContext: (context, maxTokens) => 
      invoke('compress_context', { context, maxTokens }),
    getContextStats: (projectId) => invoke('get_context_stats', { projectId }),
  },

  settings: {
    get: (key) => invoke('get_setting', { key }),
    set: (key, value) => invoke('set_setting', { key, value }),
    getAll: () => invoke('get_all_settings'),
    reset: () => invoke('reset_settings'),
  },

  database: {
    backup: (path) => invoke('backup_database', { path }),
    restore: (path) => invoke('restore_database', { path }),
    runMaintenance: () => invoke('run_database_maintenance'),
    getStats: () => invoke('get_database_stats'),
  },

  system: {
    getAppVersion: () => invoke('get_app_version'),
    openExternal: async (url) => {
      // 在 Tauri v2 中，shell 功能需要通過 invoke 調用後端
      await invoke('open_external', { url });
    },
    showSaveDialog: async (options) => {
      // 在 Tauri v2 中，對話框功能需要通過 invoke 調用後端
      return await invoke('show_save_dialog', { options });
    },
    showOpenDialog: async (options) => {
      // 在 Tauri v2 中，對話框功能需要通過 invoke 調用後端
      return await invoke('show_open_dialog', { options });
    },
    quitApp: () => invoke('quit_app'),
    reloadApp: () => invoke('reload_app'),
  },

  updates: {
    checkForUpdates: () => invoke('check_for_updates'),
    downloadUpdate: () => invoke('download_update'),
    installUpdate: () => invoke('install_update'),
    setAutoUpdate: (enabled) => invoke('set_auto_update', { enabled }),
  },
};