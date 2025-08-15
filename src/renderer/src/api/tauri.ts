import type { API } from './types';
import type { NovelTemplate } from '../types/template';
import type {
  Character,
  Relationship,
  CharacterAttributes,
  CreateRelationshipRequest
} from './models';
import type { BatchRequest } from '../types/illustration';
import type { Descendant } from 'slate';
import { measureAsyncFunction, performanceLogger } from '../utils/performanceLogger';

// Tauri 後端類型定義
interface TauriProject {
  id: string;
  name: string;
  description?: string;
  type?: string;
  novel_length?: string;
  created_at: string;
  updated_at: string;
  settings?: string;
}

interface TauriChapter {
  id: string;
  project_id: string;
  title: string;
  content?: string;
  order_index: number;
  chapter_number?: number;
  created_at: string;
  updated_at: string;
}

// 動態導入 Tauri API
type TauriInvokeFunction = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
let tauriInvoke: TauriInvokeFunction | null = null;

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
          } catch {
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

const loadTauriAPI = async (): Promise<TauriInvokeFunction> => {
  if (tauriInvoke) return tauriInvoke;
  
  // 等待 Tauri 初始化
  await waitForTauri();
  
  try {
    // 檢查全域對象是否存在（優先檢查）
    if (typeof window !== 'undefined') {
      // Tauri v2 的標準方式
      if (window.__TAURI_INVOKE__) {
        console.log('使用 window.__TAURI_INVOKE__');
        tauriInvoke = window.__TAURI_INVOKE__ as TauriInvokeFunction;
        return window.__TAURI_INVOKE__ as TauriInvokeFunction;
      }
      
      // 嘗試從 __TAURI__ 對象獲取
      if (window.__TAURI__ && window.__TAURI__.invoke) {
        console.log('使用 window.__TAURI__.invoke');
        tauriInvoke = window.__TAURI__.invoke as TauriInvokeFunction;
        return window.__TAURI__.invoke as TauriInvokeFunction;
      }
    }
    
    // 最後嘗試動態導入
    console.log('嘗試動態導入 @tauri-apps/api/core');
    const { invoke } = await import('@tauri-apps/api/core');
    tauriInvoke = invoke as TauriInvokeFunction;
    return invoke as TauriInvokeFunction;
  } catch (_error) {
    console.warn('無法載入 Tauri API:', _error);
    throw new Error('無法找到 Tauri invoke 函數 - 請確保在 Tauri 環境中運行');
  }
};

// 安全的 invoke 函數 - 使用標準 Tauri API 並整合性能監控
const safeInvoke = async <T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> => {
  return measureAsyncFunction(
    `tauri_${command}`,
    'api',
    async () => {
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
        const result = await invoke<T>(command, invokeArgs);
        
        console.log(`Tauri 命令 ${command} 成功:`, result);
        
        // 記錄 API 調用成功
        performanceLogger.log('api', `tauri_${command}_success`, {
          metadata: { command, success: true }
        });
        
        return result as T;
        
      } catch (_error) {
        console.error(`Tauri command ${command} failed:`, _error);
        
        // 記錄 API 調用失敗
        performanceLogger.log('api', `tauri_${command}_error`, {
          severity: 'error',
          metadata: { command, error: _error instanceof Error ? _error.message : String(_error) }
        });
        
        // 特別處理 callbackId 相關錯誤
        if (_error && typeof _error === 'object' && 'message' in _error && typeof _error.message === 'string' && _error.message.includes('callbackId')) {
          console.error('檢測到 Tauri 回調錯誤，可能是版本不匹配問題');
          throw new Error(`Tauri 回調機制錯誤 - 命令: ${command}`);
        }
        
        // 提供更詳細的錯誤信息
        if (_error && typeof _error === 'object' && 'message' in _error && typeof _error.message === 'string' && _error.message.includes('not available')) {
          throw new Error(`Tauri 命令 ${command} 不可用 - 請確保在 Tauri 環境中運行`);
        }
        
        throw _error;
      }
    }
  );
};

// 臨時的模擬資料回退
const createFallbackData = (commandName: string) => {
  console.warn(`使用 ${commandName} 的模擬資料回退`);
  
  switch (commandName) {
    case 'get_all_projects':
      console.error('get_all_projects fallback 被觸發 - 這表示 Tauri API 連接有問題');
      throw new Error('Tauri API 連接失敗，無法獲取專案資料');
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

// 增強的 safeInvoke，在開發模式下提供回退並整合性能監控
const enhancedSafeInvoke = async <T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> => {
  return measureAsyncFunction(
    `enhanced_tauri_${command}`,
    'api',
    async () => {
      try {
        const result = await safeInvoke(command, args);
        console.log(`✅ Tauri 命令成功: ${command}`, result);
        return result as T;
      } catch (_error) {
        console.error(`❌ enhancedSafeInvoke 錯誤 (${command}):`, _error);
        
        // 特別處理 callbackId 相關錯誤
        if (_error && typeof _error === 'object' && 'message' in _error && typeof _error.message === 'string' && (
          _error.message.includes('callbackId') || 
          _error.message.includes('undefined is not an object')
        )) {
          console.warn(`檢測到 Tauri 回調機制錯誤，使用模擬資料 - 命令: ${command}`);
          performanceLogger.log('api', `tauri_fallback_${command}`, {
            severity: 'warning',
            metadata: { command, reason: 'callback_error' }
          });
          return createFallbackData(command) as T;
        }
        
        // 在開發模式下，如果是特定的命令錯誤，提供模擬資料
        if (_error && typeof _error === 'object' && 'message' in _error && typeof _error.message === 'string' && (
          _error.message.includes('不可用') || 
          _error.message.includes('not available') ||
          _error.message.includes('無法找到 Tauri invoke')
        )) {
          console.warn(`Tauri 命令 ${command} 失敗，嘗試使用模擬資料`);
          performanceLogger.log('api', `tauri_fallback_${command}`, {
            severity: 'warning',
            metadata: { command, reason: 'api_unavailable' }
          });
          return createFallbackData(command) as T;
        }
        throw _error;
      }
    }
  );
};

// Tauri API 實現
export const tauriAPI: API = {
  projects: {
    getAll: async () => {
      const projects = await enhancedSafeInvoke<TauriProject[]>('get_all_projects');
      // 轉換 Tauri 後端格式到前端格式
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        type: (project.type as 'isekai' | 'school' | 'scifi' | 'fantasy') || 'isekai',
        novelLength: (project.novel_length as 'short' | 'medium' | 'long') || 'medium',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        settings: project.settings ? JSON.parse(project.settings) : {}
      }));
    },
    create: (project) => {
      // 轉換前端 Project 格式為後端 CreateProjectRequest 格式
      const createRequest = {
        name: project.name,
        description: project.description || null,
        type: project.type || null,
        novel_length: project.novelLength || 'medium',
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
        novel_length: project.novelLength || 'medium',
        settings: project.settings ? JSON.stringify(project.settings) : null,
      };
      return safeInvoke('update_project', { project: updateRequest });
    },
    delete: (id) => safeInvoke('delete_project', { id }),
    getById: async (id) => {
      const project = await safeInvoke<TauriProject>('get_project_by_id', { id });
      // 轉換 Tauri 後端格式到前端格式
      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        type: (project.type as 'isekai' | 'school' | 'scifi' | 'fantasy') || 'isekai',
        novelLength: (project.novel_length as 'short' | 'medium' | 'long') || 'medium',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        settings: project.settings ? JSON.parse(project.settings) : {}
      };
    },
  },
  
  chapters: {
    getByProjectId: async (projectId) => {
      console.log('🔍 [API] 調用 Tauri 後端獲取章節:', projectId);
      
      const chapters = await safeInvoke<TauriChapter[]>('get_chapters_by_project_id', { projectId });
      console.log('🔍 [API] Tauri 後端返回的原始數據數量:', chapters.length);
      
      // 記錄原始數據格式
      chapters.forEach((rawChapter, index) => {
        console.log(`🔍 [API] 原始章節 ${index + 1}:`, {
          id: rawChapter.id,
          title: rawChapter.title,
          content_type: typeof rawChapter.content,
          content_length: rawChapter.content ? rawChapter.content.length : 0,
          content_preview: rawChapter.content ? rawChapter.content.substring(0, 100) + '...' : 'empty',
          order_index: rawChapter.order_index,
          chapter_number: rawChapter.chapter_number
        });
      });
      
      // 轉換 Tauri 後端格式到前端格式
      const processedChapters = chapters.map((chapter, index) => {
        let content: Descendant[] = [{ type: 'paragraph', children: [{ text: '' }] }];
        
        if (chapter.content) {
          try {
            // 嘗試解析 JSON 格式的內容
            const parsedContent = JSON.parse(chapter.content);
            // 驗證解析後的內容是否為有效的 Descendant[] 格式
            if (Array.isArray(parsedContent) && parsedContent.length > 0) {
              content = parsedContent;
            } else {
              // 如果不是有效陣列，使用預設空內容
              content = [{ type: 'paragraph', children: [{ text: '' }] }];
            }
            console.log(`🔍 [API] 章節 ${index + 1} JSON 解析成功:`, {
              解析後類型: typeof parsedContent,
              是否為陣列: Array.isArray(parsedContent),
              陣列長度: Array.isArray(parsedContent) ? parsedContent.length : 'N/A',
              第一個元素: Array.isArray(parsedContent) && parsedContent.length > 0 
                ? JSON.stringify(parsedContent[0]).substring(0, 80) + '...'
                : 'empty or invalid'
            });
          } catch (error) {
            // 如果解析失敗，將純文字轉換為 Slate.js 格式
            console.log(`🔍 [API] 章節 ${index + 1} JSON 解析失敗，轉換純文字:`, error);
            const textLines = chapter.content.split('\n');
            content = textLines.map(line => ({
              type: 'paragraph' as const,
              children: [{ text: line }]
            }));
          }
        } else {
          console.log(`🔍 [API] 章節 ${index + 1} 內容為空`);
        }
        
        const processedChapter = {
          id: chapter.id,
          projectId: chapter.project_id,
          title: chapter.title,
          content: content,
          order: chapter.order_index,
          chapterNumber: chapter.chapter_number,
          createdAt: chapter.created_at,
          updatedAt: chapter.updated_at
        };
        
        console.log(`🔍 [API] 處理後章節 ${index + 1}:`, {
          id: processedChapter.id,
          title: processedChapter.title,
          content_type: typeof processedChapter.content,
          content_array_length: Array.isArray(processedChapter.content) ? processedChapter.content.length : 'not array',
          content_first_element: Array.isArray(processedChapter.content) && processedChapter.content.length > 0
            ? JSON.stringify(processedChapter.content[0]).substring(0, 80) + '...'
            : 'empty'
        });
        
        return processedChapter;
      });
      
      // 檢查處理後是否有重複內容
      const processedContentHashes = processedChapters.map(c => JSON.stringify(c.content));
      const uniqueProcessedContents = new Set(processedContentHashes);
      console.log('🔍 [API] 處理後內容唯一性檢查:', {
        總章節數: processedChapters.length,
        唯一內容數: uniqueProcessedContents.size,
        是否有重複: processedChapters.length !== uniqueProcessedContents.size
      });
      
      return processedChapters;
    },
    create: (chapter) => safeInvoke('create_chapter', {
      chapter: {
        project_id: chapter.projectId,
        title: chapter.title,
        content: JSON.stringify(chapter.content),
        order_index: chapter.order,
        chapter_number: chapter.chapterNumber
      }
    }),
    update: (chapter) => safeInvoke('update_chapter', {
      chapter: {
        id: chapter.id,
        title: chapter.title,
        content: JSON.stringify(chapter.content),
        order_index: chapter.order,
        chapter_number: chapter.chapterNumber
      }
    }),
    delete: (id) => safeInvoke('delete_chapter', { id }),
    getById: async (id) => {
      const chapter = await safeInvoke<TauriChapter>('get_chapter_by_id', { id });
      
      let content: Descendant[] = [{ type: 'paragraph', children: [{ text: '' }] }];
      
      if (chapter.content) {
        try {
          // 嘗試解析 JSON 格式的內容
          const parsedContent = JSON.parse(chapter.content);
          // 驗證解析後的內容是否為有效的 Descendant[] 格式
          if (Array.isArray(parsedContent) && parsedContent.length > 0) {
            content = parsedContent;
          } else {
            // 如果不是有效陣列，使用預設空內容
            content = [{ type: 'paragraph', children: [{ text: '' }] }];
          }
        } catch (_error) {
          // 如果解析失敗，將純文字轉換為 Slate.js 格式
          console.log('轉換純文字章節內容為 Slate 格式');
          const textLines = chapter.content.split('\n');
          content = textLines.map(line => ({
            type: 'paragraph' as const,
            children: [{ text: line }]
          }));
        }
      }
      
      return {
        id: chapter.id,
        projectId: chapter.project_id,
        title: chapter.title,
        content: content,
        order: chapter.order_index,
        chapterNumber: chapter.chapter_number,
        createdAt: chapter.created_at,
        updatedAt: chapter.updated_at
      };
    },
  },

  characters: {
    getByProjectId: async (projectId) => {
      interface TauriCharacter {
        id: string;
        project_id: string;
        name: string;
        description?: string;
        attributes?: string;
        avatar_url?: string;
        created_at: string;
        updated_at: string;
      }
      interface TauriRelationship {
        id: string;
        to_character_id: string;
        relationship_type: string;
        description?: string;
      }
      const characters = await safeInvoke<TauriCharacter[]>('get_characters_by_project_id', { projectId });
      
      // 轉換 Tauri 格式到前端格式，並載入關係資料
      const charactersWithRelationships = await Promise.all(
        characters.map(async (char) => {
          let attributes: CharacterAttributes = {};
          try {
            attributes = char.attributes ? JSON.parse(char.attributes) : {};
          } catch {
            console.warn('Failed to parse character attributes:', char.attributes);
          }
          
          // 載入該角色的關係資料
          let relationships: Relationship[] = [];
          try {
            const rawRelationships = await safeInvoke<TauriRelationship[]>('get_character_relationships', { characterId: char.id });
            relationships = rawRelationships.map((rel) => ({
              id: rel.id,
              targetId: rel.to_character_id,
              type: rel.relationship_type,
              description: rel.description || '',
            } as Relationship));
          } catch (e) {
            console.warn('Failed to load relationships for character:', char.id, e);
          }
          
          return {
            id: char.id,
            projectId: char.project_id,
            name: char.name,
            description: char.description,
            avatarUrl: char.avatar_url,
            createdAt: char.created_at,
            updatedAt: char.updated_at,
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
      
      return charactersWithRelationships as Character[];
    },
    create: async (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> & { description?: string; avatarUrl?: string }) => {
      console.log('Tauri API: create character called with:', character);
      
      // 構建 attributes 對象
      const attributes = {
        archetype: character.archetype,
        age: character.age,
        gender: character.gender,
        appearance: character.appearance,
        personality: character.personality,
        background: character.background
      };
      
      const payload = {
        character: {
          project_id: character.projectId,
          name: character.name,
          description: character.description || '',
          attributes: JSON.stringify(attributes),
          avatar_url: character.avatarUrl
        }
      };
      console.log('Tauri API: sending payload:', payload);
      try {
        const result = await safeInvoke<string>('create_character', payload);
        console.log('Tauri API: create character result:', result);
        return result;
      } catch (_error) {
        console.error('Tauri API: create character failed:', _error);
        throw _error;
      }
    },
    update: (character: Character & { description?: string; avatarUrl?: string }) => {
      // 構建 attributes 對象
      const attributes = {
        archetype: character.archetype,
        age: character.age,
        gender: character.gender,
        appearance: character.appearance,
        personality: character.personality,
        background: character.background
      };
      
      return safeInvoke('update_character', {
        character: {
          id: character.id,
          name: character.name,
          description: character.description || '',
          attributes: JSON.stringify(attributes),
          avatar_url: character.avatarUrl
        }
      });
    },
    delete: (id) => safeInvoke('delete_character', { id }),
    getById: async (id) => {
      interface TauriCharacter {
        id: string;
        project_id: string;
        name: string;
        description?: string;
        attributes?: string;
        avatar_url?: string;
        created_at: string;
        updated_at: string;
      }
      interface TauriRelationship {
        id: string;
        to_character_id: string;
        relationship_type: string;
        description?: string;
      }
      const char = await safeInvoke<TauriCharacter>('get_character_by_id', { id });
      let attributes: CharacterAttributes = {};
      try {
        attributes = char.attributes ? JSON.parse(char.attributes) : {};
      } catch {
        console.warn('Failed to parse character attributes:', char.attributes);
      }
      
      // 載入該角色的關係資料
      let relationships: Relationship[] = [];
      try {
        const rawRelationships = await safeInvoke<TauriRelationship[]>('get_character_relationships', { characterId: char.id });
        relationships = rawRelationships.map((rel) => ({
          id: rel.id,
          targetId: rel.to_character_id,
          type: rel.relationship_type,
          description: rel.description || '',
        } as Relationship));
      } catch (e) {
        console.warn('Failed to load relationships for character:', char.id, e);
      }
      
      return {
        id: char.id,
        projectId: char.project_id,
        name: char.name,
        description: char.description,
        avatarUrl: char.avatar_url,
        createdAt: char.created_at,
        updatedAt: char.updated_at,
        // 展開 attributes 到個別欄位
        archetype: attributes.archetype || '',
        age: attributes.age,
        gender: attributes.gender || '',
        appearance: attributes.appearance || '',
        personality: attributes.personality || '',
        background: attributes.background || char.description || '',
        relationships,
      } as Character;
    },
    createRelationship: (request: CreateRelationshipRequest) => safeInvoke('create_character_relationship', {
      fromCharacterId: request.fromCharacterId,
      toCharacterId: request.toCharacterId,
      relationshipType: request.relationshipType,
      description: request.description || null,
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
    generateWithContext: (projectId, chapterId, position, model, params, language) => {
      console.log('Tauri API: generateWithContext 被調用，參數:', { projectId, chapterId, position, model, params, language });
      return safeInvoke('generate_with_context', { 
        projectId: String(projectId), 
        chapterId: String(chapterId), 
        position: Number(position), 
        model: String(model), 
        params,
        language: language || 'zh-TW'
      });
    },
    updateOllamaConfig: (config) => safeInvoke('update_ollama_config', { config }),
  },
  // AI 提供者管理 (新多提供者系統)
  aiProviders: {
    getAll: async () => {
      return await safeInvoke('get_ai_providers');
    },
    create: async (request) => {
      return await safeInvoke('create_ai_provider', { request });
    },
    update: async (request) => {
      return await safeInvoke('update_ai_provider', { request });
    },
    delete: async (id) => {
      return await safeInvoke('delete_ai_provider', { id });
    },
    test: async (id) => {
      return await safeInvoke('test_ai_provider', { id });
    },
    generateText: async (request) => {
      return await safeInvoke('generate_ai_text', { request });
    },
    getSupportedTypes: async () => {
      return await safeInvoke('get_supported_ai_provider_types');
    },
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
      interface TauriSettingEntry {
        key: string;
        value: string;
      }
      const settingsArray = await enhancedSafeInvoke<TauriSettingEntry[]>('get_all_settings');
      // 將 SettingEntry[] 轉換為物件格式
      const settings: Record<string, unknown> = {};
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

  aiHistory: {
    create: async (history) => {
      const createRequest = {
        project_id: history.projectId,
        chapter_id: history.chapterId,
        model: history.model,
        prompt: history.prompt,
        generated_text: history.generatedText,
        parameters: history.parameters ? JSON.stringify(history.parameters) : null,
        language_purity: history.languagePurity,
        token_count: history.tokenCount,
        generation_time_ms: history.generationTimeMs,
        position: history.position,
      };
      interface TauriAIHistoryResult {
        id: string;
        project_id: string;
        chapter_id: string;
        model: string;
        prompt: string;
        generated_text: string;
        parameters?: string;
        language_purity?: number;
        token_count?: number;
        generation_time_ms?: number;
        selected: boolean;
        position?: number;
        created_at: string;
      }
      const result = await safeInvoke<TauriAIHistoryResult>('create_ai_history', { request: createRequest });
      return {
        id: result.id,
        projectId: result.project_id,
        chapterId: result.chapter_id,
        model: result.model,
        prompt: result.prompt,
        generatedText: result.generated_text,
        parameters: result.parameters ? JSON.parse(result.parameters) : null,
        languagePurity: result.language_purity,
        tokenCount: result.token_count,
        generationTimeMs: result.generation_time_ms,
        selected: result.selected,
        position: result.position,
        createdAt: result.created_at,
      };
    },
    query: async (params) => {
      const queryRequest = {
        project_id: params.projectId,
        chapter_id: params.chapterId,
        selected_only: (params as { selectedOnly?: boolean }).selectedOnly,
        limit: params.limit,
        offset: params.offset,
      };
      interface TauriAIHistory {
        id: string;
        project_id: string;
        chapter_id: string;
        model: string;
        prompt: string;
        generated_text: string;
        parameters?: string;
        language_purity?: number;
        token_count?: number;
        generation_time_ms?: number;
        selected: boolean;
        position?: number;
        created_at: string;
      }
      const results = await safeInvoke<TauriAIHistory[]>('query_ai_history', { request: queryRequest });
      return results.map((result) => ({
        id: result.id,
        projectId: result.project_id,
        chapterId: result.chapter_id,
        model: result.model,
        prompt: result.prompt,
        generatedText: result.generated_text,
        parameters: result.parameters ? JSON.parse(result.parameters) : null,
        languagePurity: result.language_purity,
        tokenCount: result.token_count,
        generationTimeMs: result.generation_time_ms,
        selected: result.selected,
        position: result.position,
        createdAt: result.created_at,
      }));
    },
    markSelected: (historyId, projectId) => 
      safeInvoke('mark_ai_history_selected', { historyId, projectId }),
    delete: (historyId) => 
      safeInvoke('delete_ai_history', { historyId }),
    cleanup: (projectId, keepCount) => 
      safeInvoke('cleanup_ai_history', { projectId, keepCount }),
  },

  // 小說分析功能
  novelAnalysis: {
    parseNovel: async (text, filename) => {
      // 在前端直接使用 novelParserService 進行解析
      const { novelParserService } = await import('../services/novelParserService');
      return novelParserService.parseNovel(text, filename);
    },
    
    analyzeNovel: async (parseResult, options, onProgress) => {
      // 在前端使用 novelAnalysisService 進行分析
      const { novelAnalysisService } = await import('../services/novelAnalysisService');
      return novelAnalysisService.analyzeNovel(parseResult, options, onProgress);
    },
    
    analyzeChunk: async (text, analysisType) => {
      // 調用 AI 服務分析單個文本片段
      const prompts = {
        world: `分析以下文本的世界觀設定，包括時代、科技、社會結構等：\n${text}`,
        character: `分析以下文本中的角色信息，包括姓名、性格、外貌等：\n${text}`,
        plot: `分析以下文本的劇情結構和關鍵事件：\n${text}`,
        style: `分析以下文本的寫作風格和語言特色：\n${text}`
      };
      
      return safeInvoke('generate_ai_text', {
        prompt: prompts[analysisType],
        model: 'llama3.2',
        params: {
          temperature: 0.3,
          max_tokens: 800,
          top_p: 0.9
        }
      });
    },
    
    generateTemplate: async (title, analysis) => {
      // 基於分析結果生成模板（主要在前端完成）
      
      // 基於分析結果創建模板（這個函數暫時未實現完整功能）
      const template: NovelTemplate = {
        id: `generated-${Date.now()}`,
        name: title,
        description: '基於分析生成的模板',
        type: 'fantasy',
        version: '1.0.0',
        isCustom: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        worldSetting: analysis.worldSetting,
        characterArchetypes: analysis.characters,
        plotFramework: analysis.plotStructure,
        writingGuidelines: analysis.writingStyle,
        aiPromptTemplate: {
          context: '',
          characterPrompts: [],
          worldPrompts: [],
          stylePrompts: [],
          continuationPrompts: []
        },
        sampleContent: {
          opening: '',
          dialogue: [],
          description: []
        }
      };
      
      return template;
    }
  },

  // EPUB 電子書生成
  epub: {
    generate: async (projectId, options) => {
      // 參數驗證
      if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
        throw new Error('無效的專案 ID：專案 ID 不能為空');
      }

      console.log('📚 API 調用 generate_epub，專案 ID:', projectId);
      
      return safeInvoke('generate_epub', {
        projectId: projectId.trim(),
        options: options || {
          include_cover: true,
          font_family: 'Noto Sans TC',
          chapter_break_style: 'page-break'
        }
      });
    },

    getExports: async (projectId) => {
      return safeInvoke('get_epub_exports', {
        projectId: projectId
      });
    },

    deleteExport: async (exportId) => {
      return safeInvoke('delete_epub_export', {
        exportId: exportId
      });
    }
  },

  // PDF 文檔生成
  pdf: {
    generate: async (projectId, options) => {
      // 參數驗證
      if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
        throw new Error('無效的專案 ID：專案 ID 不能為空');
      }

      console.log('📄 API 調用 generate_pdf，專案 ID:', projectId);
      
      return safeInvoke('generate_pdf', {
        projectId: projectId.trim(),
        options: options || {
          page_size: 'A4',
          font_family: 'Helvetica',
          font_size: 12.0,
          line_height: 1.5,
          margin_top: 20.0,
          margin_bottom: 20.0,
          margin_left: 20.0,
          margin_right: 20.0,
          include_cover: true,
          chapter_break_style: 'new_page',
          author: null
        }
      });
    },

    getExports: async (projectId) => {
      return safeInvoke('get_pdf_exports', {
        project_id: projectId
      });
    },

    deleteExport: async (exportId) => {
      return safeInvoke('delete_pdf_export', {
        export_id: exportId
      });
    }
  },

  // AI 插畫生成
  illustration: {
    // 角色一致性管理
    setupCharacterConsistency: async (characterId: string, characterName: string, description: string) => {
      return safeInvoke('setup_character_consistency', {
        character_id: characterId,
        character_name: characterName,
        description: description
      });
    },

    generateConsistencyReport: async (characterId: string, characterName: string, strictMode?: boolean) => {
      return safeInvoke('generate_consistency_report', {
        character_id: characterId,
        character_name: characterName,
        strict_mode: strictMode || false
      });
    },

    setCharacterSeed: async (characterId: string, seedValue: number, reason: string) => {
      return safeInvoke('set_character_seed', {
        character_id: characterId,
        seed_value: seedValue,
        reason: reason
      });
    },

    addReferenceImage: async (characterId: string, imageUrl: string, imageType: string, tags: string[]) => {
      return safeInvoke('add_reference_image', {
        character_id: characterId,
        image_url: imageUrl,
        image_type: imageType,
        tags: tags
      });
    },

    getCharacterVisualTraits: async (characterId: string) => {
      return safeInvoke('get_character_visual_traits', {
        character_id: characterId
      });
    },

    calculateSimilarityMatrix: async (projectId: string, characterIds: string[]) => {
      return safeInvoke('calculate_character_similarity_matrix', {
        project_id: projectId,
        character_ids: characterIds
      });
    },

    batchCheckConsistency: async (projectId: string, strictMode?: boolean, minimumScore?: number) => {
      return safeInvoke('batch_check_project_consistency', {
        project_id: projectId,
        strict_mode: strictMode || false,
        minimum_score: minimumScore || 0.7
      });
    },

    // 插畫生成
    generateIllustration: async (
      projectId: string,
      characterId: string | null,
      sceneDescription: string,
      templateId?: string,
      translationStyle?: string,
      optimizationLevel?: string,
      aspectRatio?: string,
      safetyLevel?: string,
      customNegativePrompt?: string,
      apiKey?: string
    ) => {
      return safeInvoke('generate_enhanced_illustration', {
        projectId: projectId,
        characterId: characterId,
        sceneDescription: sceneDescription,
        templateId: templateId,
        translationStyle: translationStyle || 'anime',
        optimizationLevel: optimizationLevel || 'standard',
        aspectRatio: aspectRatio || 'square',
        safetyLevel: safetyLevel || 'block_most',
        customNegativePrompt: customNegativePrompt,
        apiKey: apiKey
      });
    },

    cancelGeneration: async (taskId: string) => {
      return safeInvoke('cancel_illustration_generation', {
        taskId: taskId
      });
    },

    validateImagenConnection: async (apiKey: string) => {
      return safeInvoke('validate_imagen_api_connection', {
        apiKey: apiKey
      });
    },

    // 批次生成管理
    initializeBatchManager: async () => {
      return safeInvoke('initialize_batch_manager', {});
    },

    submitBatchRequest: async (
      batchName: string,
      projectId: string,
      requests: BatchRequest[],
      priority?: string,
      maxParallel?: number,
      apiKey?: string
    ) => {
      return safeInvoke('submit_batch_illustration_request', {
        batchName: batchName,
        projectId: projectId,
        requests: requests,
        priority: priority,
        maxParallel: maxParallel,
        apiKey: apiKey
      });
    },

    getBatchStatus: async (batchId: string) => {
      return safeInvoke('get_batch_status', {
        batchId: batchId
      });
    },

    cancelBatch: async (batchId: string) => {
      return safeInvoke('cancel_batch', {
        batchId: batchId
      });
    },

    getIllustrationHistory: async (projectId: string, characterId?: string, limit?: number, offset?: number) => {
      return safeInvoke('get_illustration_history', {
        projectId: projectId,
        characterId: characterId,
        limit: limit,
        offset: offset
      });
    },

    getAllBatchesSummary: async () => {
      return safeInvoke('get_all_batches_summary', {});
    },

    retryFailedTasks: async (batchId: string) => {
      return safeInvoke('retry_failed_tasks', {
        batchId: batchId
      });
    },

    pauseBatch: async (batchId: string) => {
      return safeInvoke('pause_batch', {
        batchId: batchId
      });
    },

    resumeBatch: async (batchId: string) => {
      return safeInvoke('resume_batch', {
        batchId: batchId
      });
    }
  },
};