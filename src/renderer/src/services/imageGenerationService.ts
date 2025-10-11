import { GoogleGenAI, SafetyFilterLevel } from '@google/genai';
import { IllustrationRequest } from '../types/illustration';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('imageGenerationService');

// Google Imagen API 回應類型定義
interface ImageResponseItem {
  image?: {
    imageBytes: string;
  };
  enhancedPrompt?: string;
  safetyAttributes?: ImageSafetyAttributes;
  raiFilteredReason?: string;
}

interface ImageSafetyAttributes {
  blocked: boolean;
  categories: string[];
  scores: number[];
}

interface ImageGenerationOptions {
  colorMode: 'color' | 'monochrome';  // 色彩模式
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages: number;
  sceneType: 'portrait' | 'scene' | 'interaction';
  safetyLevel?: SafetyFilterLevel;
}

interface ImageGenerationResult {
  imageData: string;  // base64 data URL
  enhancedPrompt?: string;
  safetyAttributes?: ImageSafetyAttributes;
  raiFilteredReason?: string;
}

interface BatchResult {
  success: boolean;
  data?: ImageGenerationResult[];
  error?: Error | string;
}

class ImageGenerationService {
  private genAI: GoogleGenAI | null = null;

  /**
   * 根據色彩模式增強提示詞
   * 這是控制黑白效果的關鍵方法，基於官方文檔建議
   */
  private enhancePromptWithColorMode(
    basePrompt: string, 
    colorMode: 'color' | 'monochrome'
  ): string {
    if (colorMode === 'monochrome') {
      // 黑白模式 - 加強提示詞，因為 Gemini API 不支援 negativePrompt
      return `black and white illustration, monochrome art, grayscale only, pencil sketch style, ink drawing, charcoal art, ${basePrompt}, no colors whatsoever, strictly monochrome, avoid any color, desaturated, achromatic`;
    }
    // 彩色模式
    return `vibrant colorful illustration, ${basePrompt}, rich colors, vivid and bright color palette, saturated colors, chromatic`;
  }

  /**
   * 初始化 Google GenAI SDK
   */
  initialize(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API 金鑰不能為空');
    }
    // 嘗試使用自定義配置來解決 CSP 問題
    this.genAI = new GoogleGenAI({ 
      apiKey,
      // 可能需要自定義 baseUrl 來解決 CSP 問題
    });
    log.debug('🎨 Google GenAI SDK 初始化成功');
  }

  /**
   * 生成單張圖像
   */
  async generateImage(
    request: IllustrationRequest,
    projectId?: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageGenerationResult[]> {
    log.debug('🎨 開始生成圖像:', request);
    
    try {
      // 建構 API 請求
      const requestBody = {
        model: 'imagegeneration@006',
        prompt: request.scene_description,
        aspectRatio: '1:1',
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
        sampleCount: request.batch_size || 1,
        includeRaiReason: true,
        ...(request.custom_style_params || {})
      };

      // 設定 API URL 和 headers - 需要從用戶設定獲取
      const gcpProjectId = process.env.GCP_PROJECT_ID;
      const googleApiKey = process.env.GOOGLE_API_KEY;
      
      // 安全檢查：確保憑證存在
      if (!gcpProjectId || !googleApiKey) {
        throw new Error('Google Cloud 憑證未設定。請到設定頁面配置 GCP Project ID 和 API Key。');
      }
      
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/imagegeneration@006:predict`;
      
      onProgress?.(10);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [requestBody],
          parameters: {
            sampleCount: requestBody.sampleCount
          }
        })
      });

      onProgress?.(50);

      if (!response.ok) {
        const errorText = await response.text();
        log.error('❌ API 錯誤回應:', errorText);
        throw new Error(`API 請求失敗 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      log.debug('📦 API 回應:', JSON.stringify(data, null, 2));
      
      onProgress?.(80);

      // 解析 API 回應
      if (data.predictions && data.predictions.length > 0) {
        const prediction = data.predictions[0];
        
        if (!prediction.bytesBase64Encoded || prediction.bytesBase64Encoded.length === 0) {
          throw new Error('API 回應中沒有生成的圖像資料');
        }

        const results = prediction.bytesBase64Encoded.map((img: ImageResponseItem, index: number) => ({
          id: `generated_${Date.now()}_${index}`,
          imageData: `data:image/jpeg;base64,${img.image?.imageBytes}`,
          enhancedPrompt: img.enhancedPrompt,
          safetyAttributes: img.safetyAttributes,
          raiFilteredReason: img.raiFilteredReason
        }));

        console.log(`✅ 成功生成 ${results.length} 張圖像`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
        return results;
      }
      
      throw new Error('API 回應中沒有生成的圖像');
    } catch (error: unknown) {
      log.error('❌ 圖像生成失敗:', error);
      
      // 使用類型守衛安全存取錯誤屬性
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 提供更詳細的錯誤訊息
      if (errorMessage.includes('API key')) {
        throw new Error('API 金鑰無效或已過期');
      } else if (errorMessage.includes('billed users')) {
        throw new Error('Imagen API 需要啟用計費的 Google Cloud 帳戶。請在 Google Cloud Console 中設定付費方式');
      } else if (errorMessage.includes('quota')) {
        throw new Error('API 配額不足，請檢查您的使用限制');
      } else if (errorMessage.includes('safety')) {
        throw new Error('圖像內容被安全過濾器攔截，請調整提示詞');
      }
      
      throw new Error(`圖像生成失敗: ${errorMessage}`);
    } finally {
      onProgress?.(100);
    }
  }

  /**
   * 批次生成圖像
   */
  async generateBatch(
    requests: Array<{prompt: string, options: ImageGenerationOptions}>,
    apiKey: string,
    onProgress?: (current: number, total: number, currentPrompt?: string) => void
  ): Promise<BatchResult[]> {
    if (!requests || requests.length === 0) {
      throw new Error('批次請求列表不能為空');
    }

    console.log(`🚀 開始批次生成 ${requests.length} 張圖像`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
    
    // 初始化服務
    this.initialize(apiKey);
    
    const results: BatchResult[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      try {
        // 更新進度
        if (onProgress) {
          onProgress(i + 1, requests.length, request.prompt);
        }

        console.log(`📝 處理第 ${i + 1}/${requests.length} 個請求`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
        
        // 構建 IllustrationRequest 對象
        const illustrationRequest: IllustrationRequest = {
          project_id: 'batch-generation',
          scene_description: request.prompt,
          use_reference_image: false,
          quality_preset: 'balanced',
          batch_size: request.options.numberOfImages || 1
        };
        
        const result = await this.generateImage(
          illustrationRequest,
          'batch-generation'
        );
        
        results.push({ success: true, data: result });
        console.log(`✅ 第 ${i + 1} 張圖像生成成功`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
        
        // 避免 API 限制，在請求間加入短暫延遲
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ 第 ${i + 1} 張圖像生成失敗:`, error); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
        results.push({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log(`🎯 批次生成完成: ${successCount} 成功, ${failCount} 失敗`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
    
    return results;
  }

  /**
   * 驗證 API 金鑰是否有效
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testService = new GoogleGenAI({ apiKey });
      
      // 使用最小的請求來驗證金鑰
      await testService.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: 'test',
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
        }
      });
      
      return true;
    } catch (error) {
      log.error('API 金鑰驗證失敗:', error);
      return false;
    }
  }

  /**
   * 取得支援的模型列表（目前只有 Imagen 3）
   */
  getSupportedModels(): string[] {
    return ['imagen-3.0-generate-002'];
  }

  /**
   * 取得支援的長寬比
   */
  getSupportedAspectRatios(): string[] {
    return ['1:1', '3:4', '4:3', '9:16', '16:9'];
  }

  /**
   * 取得支援的安全等級
   */
  getSupportedSafetyLevels(): SafetyFilterLevel[] {
    return [
      SafetyFilterLevel.BLOCK_LOW_AND_ABOVE,
      SafetyFilterLevel.BLOCK_MEDIUM_AND_ABOVE,
      SafetyFilterLevel.BLOCK_ONLY_HIGH,
      SafetyFilterLevel.BLOCK_NONE
    ];
  }
}

// 導出單例實例
export const imageGenerationService = new ImageGenerationService();

// 導出類型
export type {
  ImageGenerationOptions,
  ImageGenerationResult,
  BatchResult
};