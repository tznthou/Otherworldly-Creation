import type { API } from './types';

// 安全的 invoke 函數
const safeInvoke = async (command: string, args?: any) => {
  try {
    // 動態載入 Tauri API
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke(command, args);
  } catch (error) {
    console.error(`Tauri command ${command} failed:`, error);
    throw error;
  }
};

// Tauri API 實現
export const tauriAPI: API = {
  projects: {
    getAll: () => safeInvoke('get_all_projects'),
    create: (project) => {
      // 轉換前端 Project 格式為後端 CreateProjectRequest 格式
      const createRequest = {
        name: project.name,
        description: project.description || null,
        type: project.type || null,
        settings: project.settings ? JSON.stringify(project.settings) : null,
      };
      return safeInvoke('create_project', { project: createRequest });
    },
    update: (project) => {
      // 轉換前端 Project 格式為後端 UpdateProjectRequest 格式
      const updateRequest = {
        id: project.id,
        name: project.name,
        description: project.description || null,
        type: project.type || null,
        settings: project.settings ? JSON.stringify(project.settings) : null,
      };
      return safeInvoke('update_project', { project: updateRequest });
    },
    delete: (id) => safeInvoke('delete_project', { id }),
    getById: (id) => safeInvoke('get_project_by_id', { id }),
  },
  
  chapters: {
    getByProjectId: (projectId) => safeInvoke('get_chapters_by_project_id', { projectId }),
    create: (chapter) => safeInvoke('create_chapter', {
      chapter: {
        project_id: chapter.projectId,
        title: chapter.title,
        content: chapter.content,
        order_index: chapter.orderIndex
      }
    }),
    update: (chapter) => safeInvoke('update_chapter', {
      chapter: {
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        order_index: chapter.orderIndex
      }
    }),
    delete: (id) => safeInvoke('delete_chapter', { id }),
    getById: (id) => safeInvoke('get_chapter_by_id', { id }),
  },

  characters: {
    getByProjectId: async (projectId) => {
      const characters = await safeInvoke('get_characters_by_project_id', { projectId });
      
      // 轉換 Tauri 格式到前端格式，並載入關係資料
      const charactersWithRelationships = await Promise.all(
        characters.map(async (char: any) => {
          let attributes = {};
          try {
            attributes = char.attributes ? JSON.parse(char.attributes) : {};
          } catch (e) {
            console.warn('Failed to parse character attributes:', char.attributes);
          }
          
          // 載入該角色的關係資料
          let relationships = [];
          try {
            const rawRelationships = await safeInvoke('get_character_relationships', { characterId: char.id });
            relationships = rawRelationships.map((rel: any) => ({
              id: rel.id,
              targetId: rel.to_character_id,
              type: rel.relationship_type,
              description: rel.description,
            }));
          } catch (e) {
            console.warn('Failed to load relationships for character:', char.id, e);
          }
          
          return {
            id: char.id,
            projectId: char.project_id,
            name: char.name,
            description: char.description,
            avatarUrl: char.avatar_url,
            createdAt: new Date(char.created_at),
            updatedAt: new Date(char.updated_at),
            // 展開 attributes 到個別欄位
            archetype: attributes.archetype || '',
            age: attributes.age,
            gender: attributes.gender || '',
            appearance: attributes.appearance || '',
            personality: attributes.personality || '',
            background: attributes.background || char.description || '',
            relationships,
          };
        })
      );
      
      return charactersWithRelationships;
    },
    create: async (character) => {
      console.log('Tauri API: create character called with:', character);
      const payload = {
        character: {
          project_id: character.projectId,
          name: character.name,
          description: character.description,
          attributes: character.attributes,
          avatar_url: character.avatarUrl
        }
      };
      console.log('Tauri API: sending payload:', payload);
      try {
        const result = await safeInvoke('create_character', payload);
        console.log('Tauri API: create character result:', result);
        return result;
      } catch (error) {
        console.error('Tauri API: create character failed:', error);
        throw error;
      }
    },
    update: (character) => safeInvoke('update_character', {
      character: {
        id: character.id,
        name: character.name,
        description: character.description,
        attributes: character.attributes,
        avatar_url: character.avatarUrl
      }
    }),
    delete: (id) => safeInvoke('delete_character', { id }),
    getById: async (id) => {
      const char = await safeInvoke('get_character_by_id', { id });
      let attributes = {};
      try {
        attributes = char.attributes ? JSON.parse(char.attributes) : {};
      } catch (e) {
        console.warn('Failed to parse character attributes:', char.attributes);
      }
      
      // 載入該角色的關係資料
      let relationships = [];
      try {
        const rawRelationships = await safeInvoke('get_character_relationships', { characterId: char.id });
        relationships = rawRelationships.map((rel: any) => ({
          id: rel.id,
          targetId: rel.to_character_id,
          type: rel.relationship_type,
          description: rel.description,
        }));
      } catch (e) {
        console.warn('Failed to load relationships for character:', char.id, e);
      }
      
      return {
        id: char.id,
        projectId: char.project_id,
        name: char.name,
        description: char.description,
        avatarUrl: char.avatar_url,
        createdAt: new Date(char.created_at),
        updatedAt: new Date(char.updated_at),
        // 展開 attributes 到個別欄位
        archetype: attributes.archetype || '',
        age: attributes.age,
        gender: attributes.gender || '',
        appearance: attributes.appearance || '',
        personality: attributes.personality || '',
        background: attributes.background || char.description || '',
        relationships,
      };
    },
    createRelationship: (relationship) => safeInvoke('create_character_relationship', {
      fromCharacterId: relationship.fromCharacterId,
      toCharacterId: relationship.toCharacterId,
      relationshipType: relationship.relationshipType,
      description: relationship.description || null,
    }),
    deleteRelationship: (id) => safeInvoke('delete_character_relationship', { id }),
    clearRelationships: (characterId) => safeInvoke('clear_character_relationships', { characterId }),
  },

  ai: {
    checkOllamaService: () => safeInvoke('check_ollama_service'),
    getServiceStatus: () => safeInvoke('get_service_status'),
    listModels: () => safeInvoke('list_models'),
    getModelsInfo: () => safeInvoke('get_models_info'),
    checkModelAvailability: (modelName) => safeInvoke('check_model_availability', { modelName }),
    generateText: (prompt, model, params) => safeInvoke('generate_text', { prompt, model, params }),
    generateWithContext: (projectId, chapterId, position, model, params) => 
      safeInvoke('generate_with_context', { projectId: parseInt(projectId), chapterId: parseInt(chapterId), position, model, params }),
    updateOllamaConfig: (config) => safeInvoke('update_ollama_config', { config }),
  },

  context: {
    buildContext: (projectId, chapterId, position) => 
      safeInvoke('build_context', { projectId, chapterId, position }),
    compressContext: (context, maxTokens) => 
      safeInvoke('compress_context', { context, maxTokens }),
    getContextStats: (projectId) => safeInvoke('get_context_stats', { projectId }),
  },

  settings: {
    get: (key) => safeInvoke('get_setting', { key }),
    set: (key, value) => safeInvoke('set_setting', { key, value }),
    getAll: () => safeInvoke('get_all_settings'),
    reset: () => safeInvoke('reset_settings'),
  },

  database: {
    backup: (path) => safeInvoke('backup_database', { path }),
    restore: (path) => safeInvoke('restore_database', { path }),
    runMaintenance: () => safeInvoke('run_database_maintenance'),
    getStats: () => safeInvoke('get_database_stats'),
  },

  system: {
    getAppVersion: () => safeInvoke('get_app_version'),
    openExternal: async (url) => {
      // 在 Tauri v2 中，shell 功能需要通過 invoke 調用後端
      await safeInvoke('open_external', { url });
    },
    showSaveDialog: async (options) => {
      // 在 Tauri v2 中，對話框功能需要通過 invoke 調用後端
      return await safeInvoke('show_save_dialog', { options });
    },
    showOpenDialog: async (options) => {
      // 在 Tauri v2 中，對話框功能需要通過 invoke 調用後端
      return await safeInvoke('show_open_dialog', { options });
    },
    quitApp: () => safeInvoke('quit_app'),
    reloadApp: () => safeInvoke('reload_app'),
  },

  updates: {
    checkForUpdates: () => safeInvoke('check_for_updates'),
    downloadUpdate: () => safeInvoke('download_update'),
    installUpdate: () => safeInvoke('install_update'),
    setAutoUpdate: (enabled) => safeInvoke('set_auto_update', { enabled }),
  },
};