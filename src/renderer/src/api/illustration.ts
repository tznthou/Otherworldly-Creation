import { api } from './tauri';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('illustration');

export interface IllustrationGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  enhance?: boolean;
  style?: string;
  projectId?: string;
  characterId?: string;
  [key: string]: unknown;
}

export interface IllustrationResponse {
  success: boolean;
  id: string;
  image_path: string;
  image_url: string;
  is_confirmed: boolean;
  file_size_bytes: number;
  generation_time_ms: number;
  message: string;
}

export interface ConfirmationResponse {
  success: boolean;
  confirmed_count: number;
  message: string;
}

export interface RenameRequest {
  id: string;
  new_name: string;
}

export interface RenameResponse {
  id: string;
  old_name: string;
  new_name: string;
  success: boolean;
  error?: string;
}

export interface BatchRenameRequest {
  operations: RenameRequest[];
}

export interface BatchRenameResponse {
  results: RenameResponse[];
  success_count: number;
  failure_count: number;
}

export const illustrationAPI = {
  /**
   * Gemini 插畫生成
   */
  generateGeminiIllustration: async (params: IllustrationGenerationParams & {
    provider: string;
    apiKey: string;
  }) => {
    log.debug('🎨 [API] 生成 Gemini 圖片:', params);
    
    const result = await api.invoke('generate_gemini_illustration', {
      prompt: params.prompt,
      provider: params.provider,
      apiKey: params.apiKey,
      width: params.width,
      height: params.height,
      projectId: params.projectId,
      characterId: params.characterId,
      style: params.style,
    });
    
    log.debug('✅ [API] Gemini 圖片生成完成:', result);
    
    return result;
  },

  /**
   * 測試 Gemini 連接
   */
  testGeminiConnection: async (apiKey: string, provider: string) => {
    log.debug('🔗 [API] 測試 Gemini 連接:', provider);
    
    const result = await api.invoke('test_gemini_connection', {
      apiKey,
      provider,
    });
    
    log.debug('✅ [API] Gemini 連接測試完成:', result);
    
    return result;
  },

  /**
   * 優化的圖片生成：直接儲存到最終位置，標記為未確認
   */
  generateOptimized: async (params: IllustrationGenerationParams): Promise<IllustrationResponse> => {
    log.debug('🎨 [API] 生成優化圖片:', params);
    
    const result = await api.invoke<IllustrationResponse>('generate_illustration_optimized', {
      prompt: params.prompt,
      width: params.width,
      height: params.height,
      model: params.model,
      seed: params.seed,
      enhance: params.enhance,
      style: params.style,
      projectId: params.projectId,
      characterId: params.characterId,
    });
    
    log.debug('✅ [API] 圖片生成完成:', {
      id: result.id,
      is_confirmed: result.is_confirmed,
      file_size: result.file_size_bytes
    });
    
    return result;
  },

  /**
   * 確認圖片：將選中的圖片標記為已確認
   */
  confirm: async (imageIds: string[]): Promise<ConfirmationResponse> => {
    log.debug('✅ [API] 確認圖片:', imageIds);
    
    if (imageIds.length === 0) {
      throw new Error('沒有選中的圖片');
    }
    
    const result = await api.invoke<ConfirmationResponse>('confirm_illustrations', {
      imageIds
    });
    
    log.debug('✅ [API] 圖片確認完成:', result);
    
    return result;
  },

  /**
   * 傳統臨時生成（保留向後兼容）
   */
  generateTemp: async (params: IllustrationGenerationParams) => {
    return api.invoke('generate_free_illustration_to_temp', params);
  },

  /**
   * 確認臨時圖片（保留向後兼容）
   */
  confirmTemp: async (tempImageData: {
    temp_path: string;
    prompt: string;
    project_id?: string;
    character_id?: string;
    generation_time?: string;
    width?: number;
    height?: number;
    file_size_bytes?: number;
    provider?: string;
  }) => {
    return api.invoke('confirm_temp_image_save', { tempImageData });
  },

  /**
   * 重命名單個插畫
   */
  rename: async (id: string, newName: string): Promise<RenameResponse> => {
    log.debug('🏷️ [API] 重命名插畫:', { id, newName });
    
    if (!id || !newName.trim()) {
      throw new Error('插畫ID和新名稱不能為空');
    }
    
    const result = await api.invoke<{success: boolean; data: RenameResponse}>('rename_illustration', {
      id,
      new_name: newName
    });
    
    if (!result.success) {
      throw new Error('重命名失敗');
    }
    
    log.debug('✅ [API] 插畫重命名完成:', result.data);
    return result.data;
  },

  /**
   * 批次重命名插畫
   */
  batchRename: async (operations: RenameRequest[]): Promise<BatchRenameResponse> => {
    log.debug('🏷️ [API] 批次重命名插畫:', operations);
    
    if (operations.length === 0) {
      throw new Error('沒有重命名操作');
    }
    
    const result = await api.invoke<{success: boolean; data: BatchRenameResponse}>('batch_rename_illustrations', {
      operations
    });
    
    if (!result.success) {
      throw new Error('批次重命名失敗');
    }
    
    log.debug('✅ [API] 批次重命名完成:', result.data);
    return result.data;
  }
};