import { api } from './tauri';

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
  final_path: string;
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

export const illustrationAPI = {
  /**
   * 優化的圖片生成：直接儲存到最終位置，標記為未確認
   */
  generateOptimized: async (params: IllustrationGenerationParams): Promise<IllustrationResponse> => {
    console.log('🎨 [API] 生成優化圖片:', params);
    
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
    
    console.log('✅ [API] 圖片生成完成:', {
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
    console.log('✅ [API] 確認圖片:', imageIds);
    
    if (imageIds.length === 0) {
      throw new Error('沒有選中的圖片');
    }
    
    const result = await api.invoke<ConfirmationResponse>('confirm_illustrations', {
      imageIds
    });
    
    console.log('✅ [API] 圖片確認完成:', result);
    
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
  }
};