import { GoogleGenAI, SafetyFilterLevel } from '@google/genai';

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
  safetyAttributes?: any;
  raiFilteredReason?: string;
}

interface BatchResult {
  success: boolean;
  data?: ImageGenerationResult[];
  error?: any;
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
    console.log('🎨 Google GenAI SDK 初始化成功');
  }

  /**
   * 生成單張圖像
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions,
    apiKey?: string
  ): Promise<ImageGenerationResult[]> {
    // 如果提供新的 API 金鑰，重新初始化
    if (!this.genAI && apiKey) {
      this.initialize(apiKey);
    }
    
    if (!this.genAI) {
      throw new Error('請先提供 API 金鑰初始化服務');
    }

    // 驗證輸入
    if (!prompt || prompt.trim() === '') {
      throw new Error('提示詞不能為空');
    }

    // 增強提示詞（加入色彩模式控制）
    const enhancedPrompt = this.enhancePromptWithColorMode(prompt, options.colorMode);
    
    console.log(`🎨 開始生成圖像 - 模式: ${options.colorMode}, 長寬比: ${options.aspectRatio}`);
    console.log(`📝 增強後提示詞: ${enhancedPrompt}`);

    try {
      const response = await this.genAI.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: options.numberOfImages,
          aspectRatio: options.aspectRatio,
          outputMimeType: 'image/jpeg',
        }
      });

      // 處理回應
      if (response.generatedImages && response.generatedImages.length > 0) {
        const results = response.generatedImages.map(img => ({
          imageData: `data:image/jpeg;base64,${img.image?.imageBytes}`,
          enhancedPrompt: img.enhancedPrompt,
          safetyAttributes: img.safetyAttributes,
          raiFilteredReason: img.raiFilteredReason
        }));

        console.log(`✅ 成功生成 ${results.length} 張圖像`);
        return results;
      }
      
      throw new Error('API 回應中沒有生成的圖像');
    } catch (error: any) {
      console.error('❌ 圖像生成失敗:', error);
      
      // 提供更詳細的錯誤訊息
      if (error.message?.includes('API key')) {
        throw new Error('API 金鑰無效或已過期');
      } else if (error.message?.includes('billed users')) {
        throw new Error('Imagen API 需要啟用計費的 Google Cloud 帳戶。請在 Google Cloud Console 中設定付費方式');
      } else if (error.message?.includes('quota')) {
        throw new Error('API 配額不足，請檢查您的使用限制');
      } else if (error.message?.includes('safety')) {
        throw new Error('圖像內容被安全過濾器攔截，請調整提示詞');
      }
      
      throw new Error(`圖像生成失敗: ${error.message || '未知錯誤'}`);
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

    console.log(`🚀 開始批次生成 ${requests.length} 張圖像`);
    
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

        console.log(`📝 處理第 ${i + 1}/${requests.length} 個請求`);
        
        const result = await this.generateImage(
          request.prompt,
          request.options,
          apiKey
        );
        
        results.push({ success: true, data: result });
        console.log(`✅ 第 ${i + 1} 張圖像生成成功`);
        
        // 避免 API 限制，在請求間加入短暫延遲
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ 第 ${i + 1} 張圖像生成失敗:`, error);
        results.push({ success: false, error });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log(`🎯 批次生成完成: ${successCount} 成功, ${failCount} 失敗`);
    
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
      console.error('API 金鑰驗證失敗:', error);
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