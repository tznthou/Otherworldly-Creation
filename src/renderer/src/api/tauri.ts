import type { API } from './types';

// 動態導入 Tauri API
let tauriInvoke: any = null;
let isInitialized = false;

const waitForTauri = (): Promise<void> => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 100; // 最多等待 10 秒
    
    const checkTauri = () => {
      attempts++;
      
      // 檢查 Tauri API 是否可用
      if (typeof window !== 'undefined') {
        // 檢查各種可能的 Tauri API
        if (window.__TAURI_INVOKE__ || 
            (window.__TAURI__ && window.__TAURI__.invoke) ||
            (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke)) {
          console.log('Tauri API detected after', attempts, 'attempts');
          resolve();
          return;
        }
        
        // 在開發模式中，也嘗試檢查是否能動態載入
        if (attempts === 1) {
          try {
            import('@tauri-apps/api/core').then(() => {
              console.log('Tauri API module available');
              resolve();
            }).catch(() => {
              // 繼續等待
              if (attempts < maxAttempts) {
                setTimeout(checkTauri, 100);
              } else {
                console.warn('Tauri API not available after waiting, proceeding anyway');
                resolve(); // 不拒絕，讓後續代碼處理
              }
            });
            return;
          } catch (e) {
            // 繼續等待
          }
        }
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkTauri, 100);
      } else {
        console.warn('Tauri API not detected after maximum attempts, proceeding anyway');
        resolve(); // 不拒絕，讓後續代碼處理
      }
    };
    
    checkTauri();
  });
};

const loadTauriAPI = async () => {
  if (tauriInvoke) return tauriInvoke;
  
  // 等待 Tauri 初始化
  await waitForTauri();
  
  try {
    // 檢查全域對象是否存在（優先檢查）
    if (typeof window !== 'undefined') {
      // Tauri v2 的標準方式
      if (window.__TAURI_INVOKE__) {
        console.log('使用 window.__TAURI_INVOKE__');
        tauriInvoke = window.__TAURI_INVOKE__;
        isInitialized = true;
        return window.__TAURI_INVOKE__;
      }
      
      // 嘗試從 __TAURI__ 對象獲取
      if (window.__TAURI__ && window.__TAURI__.invoke) {
        console.log('使用 window.__TAURI__.invoke');
        tauriInvoke = window.__TAURI__.invoke;
        isInitialized = true;
        return window.__TAURI__.invoke;
      }
    }
    
    // 最後嘗試動態導入
    console.log('嘗試動態導入 @tauri-apps/api/core');
    const { invoke } = await import('@tauri-apps/api/core');
    tauriInvoke = invoke;
    isInitialized = true;
    return invoke;
  } catch (error) {
    console.warn('無法載入 Tauri API:', error);
    throw new Error('無法找到 Tauri invoke 函數 - 請確保在 Tauri 環境中運行');
  }
};

// 安全的 invoke 函數 - 使用標準 Tauri API
const safeInvoke = async (command: string, args?: any) => {
  try {
    console.log(`調用 Tauri 命令: ${command}`, args);
    
    const invoke = await loadTauriAPI();
    if (!invoke) {
      const errorMsg = 'Tauri invoke 函數不可用 - 可能不在 Tauri 環境中運行';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // 使用獲取到的 invoke 函數，確保參數格式正確
    const invokeArgs = args || {};
    const result = await invoke(command, invokeArgs);
    
    console.log(`Tauri 命令 ${command} 成功:`, result);
    return result;
    
  } catch (error) {
    console.error(`Tauri command ${command} failed:`, error);
    
    // 特別處理 callbackId 相關錯誤
    if (error && error.message && error.message.includes('callbackId')) {
      console.error('檢測到 Tauri 回調錯誤，可能是版本不匹配問題');
      throw new Error(`Tauri 回調機制錯誤 - 命令: ${command}`);
    }
    
    // 提供更詳細的錯誤信息
    if (error && error.message && error.message.includes('not available')) {
      throw new Error(`Tauri 命令 ${command} 不可用 - 請確保在 Tauri 環境中運行`);
    }
    
    throw error;
  }
};

// 臨時的模擬資料回退
const createFallbackData = (commandName: string) => {
  console.warn(`使用 ${commandName} 的模擬資料回退`);
  
  switch (commandName) {
    case 'get_all_projects':
      return Promise.resolve([]);
    case 'get_all_settings':
      return Promise.resolve([]);
    case 'check_ollama_service':
      return Promise.resolve(false);
    case 'get_service_status':
      return Promise.resolve({
        service: { available: false, error: 'Tauri API 不可用' },
        models: { count: 0, list: [] },
        last_checked: new Date().toISOString()
      });
    case 'list_models':
      return Promise.resolve([]);
    case 'get_models_info':
      return Promise.resolve({ success: false, models: [], error: 'Tauri API 不可用' });
    case 'get_chapters_by_project_id':
      return Promise.resolve([]);
    case 'get_characters_by_project_id':
      return Promise.resolve([]);
    default:
      console.warn(`命令 ${commandName} 沒有模擬資料，返回空結果`);
      return Promise.resolve(null);
  }
};

// 增強的 safeInvoke，在開發模式下提供回退
const enhancedSafeInvoke = async (command: string, args?: any) => {
  try {
    return await safeInvoke(command, args);
  } catch (error) {
    console.error(`enhancedSafeInvoke 錯誤 (${command}):`, error);
    
    // 特別處理 callbackId 相關錯誤
    if (error && error.message && (
      error.message.includes('callbackId') || 
      error.message.includes('undefined is not an object')
    )) {
      console.warn(`檢測到 Tauri 回調機制錯誤，使用模擬資料 - 命令: ${command}`);
      return createFallbackData(command);
    }
    
    // 在開發模式下，如果是特定的命令錯誤，提供模擬資料
    if (error && error.message && (
      error.message.includes('不可用') || 
      error.message.includes('not available') ||
      error.message.includes('無法找到 Tauri invoke')
    )) {
      console.warn(`Tauri 命令 ${command} 失敗，嘗試使用模擬資料`);
      return createFallbackData(command);
    }
    throw error;
  }
};

// Tauri API 實現
export const tauriAPI: API = {
  projects: {
    getAll: async () => {
      const projects = await enhancedSafeInvoke('get_all_projects');
      // 轉換 Tauri 後端格式到前端格式
      return projects.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        type: project.type || 'isekai',
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        settings: project.settings ? JSON.parse(project.settings) : {}
      }));
    },
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
    getById: async (id) => {
      const project = await safeInvoke('get_project_by_id', { id });
      // 轉換 Tauri 後端格式到前端格式
      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        type: project.type || 'isekai',
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        settings: project.settings ? JSON.parse(project.settings) : {}
      };
    },
  },
  
  chapters: {
    getByProjectId: async (projectId) => {
      const chapters = await safeInvoke('get_chapters_by_project_id', { projectId });
      // 轉換 Tauri 後端格式到前端格式
      return chapters.map((chapter: any) => ({
        id: chapter.id,
        projectId: chapter.project_id,
        title: chapter.title,
        content: chapter.content || '',
        orderIndex: chapter.order_index,
        createdAt: new Date(chapter.created_at),
        updatedAt: new Date(chapter.updated_at)
      }));
    },
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
    getById: async (id) => {
      const chapter = await safeInvoke('get_chapter_by_id', { id });
      // 轉換 Tauri 後端格式到前端格式
      return {
        id: chapter.id,
        projectId: chapter.project_id,
        title: chapter.title,
        content: chapter.content || '',
        orderIndex: chapter.order_index,
        createdAt: new Date(chapter.created_at),
        updatedAt: new Date(chapter.updated_at)
      };
    },
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
    checkOllamaService: () => enhancedSafeInvoke('check_ollama_service'),
    getServiceStatus: () => enhancedSafeInvoke('get_service_status'),
    listModels: () => enhancedSafeInvoke('list_models'),
    getModelsInfo: () => enhancedSafeInvoke('get_models_info'),
    checkModelAvailability: (modelName) => safeInvoke('check_model_availability', { modelName }),
    generateText: (prompt, model, params) => safeInvoke('generate_text', { prompt, model, params }),
    generateWithContext: (projectId, chapterId, position, model, params) => {
      console.log('Tauri API: generateWithContext 被調用，參數:', { projectId, chapterId, position, model, params });
      return safeInvoke('generate_with_context', { 
        projectId: String(projectId), 
        chapterId: String(chapterId), 
        position: Number(position), 
        model: String(model), 
        params 
      });
    },
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
    get: async (key) => {
      const value = await enhancedSafeInvoke('get_setting', { key });
      // Tauri 後端返回字串，需要嘗試解析 JSON
      if (value && typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value; // 如果不是 JSON，返回原始字串
        }
      }
      return value;
    },
    set: (key, value) => {
      // 將值轉換為 JSON 字串（與 Tauri 後端一致）
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      return safeInvoke('set_setting', { key, value: stringValue });
    },
    getAll: async () => {
      const settingsArray = await enhancedSafeInvoke('get_all_settings');
      // 將 SettingEntry[] 轉換為物件格式
      const settings = {};
      for (const entry of settingsArray || []) {
        try {
          settings[entry.key] = JSON.parse(entry.value);
        } catch {
          settings[entry.key] = entry.value;
        }
      }
      return settings;
    },
    reset: () => safeInvoke('reset_settings'),
  },

  database: {
    backup: (path) => safeInvoke('backup_database', { path }),
    restore: (path) => safeInvoke('restore_database', { path }),
    runMaintenance: () => safeInvoke('run_database_maintenance'),
    getStats: () => safeInvoke('get_database_stats'),
    healthCheck: () => safeInvoke('health_check'),
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