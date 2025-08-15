interface OpenRouterImageGenerationOptions {
  colorMode: 'color' | 'monochrome';
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages: number;
  sceneType: 'portrait' | 'scene' | 'interaction';
}

interface OpenRouterImageResult {
  imageData: string;  // base64 data URL or URL
  prompt?: string;
  model?: string;
}

interface OpenRouterBatchResult {
  success: boolean;
  data?: OpenRouterImageResult[];
  error?: any;
}

class OpenRouterImageService {
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  /**
   * 根據色彩模式增強提示詞 - 針對圖像生成優化
   */
  private enhancePromptWithColorMode(
    basePrompt: string, 
    colorMode: 'color' | 'monochrome'
  ): string {
    // 為圖像生成使用更直接的提示詞格式
    if (colorMode === 'monochrome') {
      return `Create an image: ${basePrompt}, black and white, monochrome, grayscale`;
    }
    return `Create an image: ${basePrompt}, colorful, vivid colors`;
  }

  /**
   * 生成單張圖像 - 測試 OpenRouter Gemini Image Gen
   */
  async generateImage(
    prompt: string,
    options: OpenRouterImageGenerationOptions,
    apiKey: string,
    model = 'google/gemini-2.0-flash-exp'  // 預設使用 Image Gen 模型
  ): Promise<OpenRouterImageResult[]> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API 金鑰不能為空');
    }

    if (!prompt || prompt.trim() === '') {
      throw new Error('提示詞不能為空');
    }

    // 增強提示詞
    const enhancedPrompt = this.enhancePromptWithColorMode(prompt, options.colorMode);
    
    console.log(`🎨 OpenRouter 圖像生成 - 模式: ${options.colorMode}, 模型: ${model}`);
    console.log(`📝 增強後提示詞: ${enhancedPrompt}`);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Genesis Chronicle - Novel Writing App'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
        throw new Error(`OpenRouter API 錯誤: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 OpenRouter 回應:', data);

      // 檢查回應格式
      if (data.choices && data.choices.length > 0) {
        const choice = data.choices[0];
        const content = choice.message?.content;

        // 方法 1：檢查內容是否包含圖像數據或 URL
        if (typeof content === 'string') {
          // 檢查是否包含 base64 圖像數據
          const base64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
          if (base64Match) {
            return [{
              imageData: base64Match[0],
              prompt: enhancedPrompt,
              model: model
            }];
          }

          // 檢查是否包含圖像 URL
          const urlMatch = content.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/i);
          if (urlMatch) {
            return [{
              imageData: urlMatch[0],
              prompt: enhancedPrompt,
              model: model
            }];
          }

          // 如果是純文字回應，可能模型不支援圖像生成
          console.warn('⚠️ 模型回應純文字，可能不支援圖像生成:', content);
          throw new Error(`模型 ${model} 可能不支援圖像生成。回應內容: ${content.substring(0, 100)}...`);
        }

        // 方法 2：檢查是否有特殊的圖像格式
        if (choice.message?.attachments || choice.message?.images) {
          console.log('🔍 發現附件或圖像字段');
          // 處理可能的附件格式
        }
      }

      throw new Error('OpenRouter 回應中沒有找到圖像數據');

    } catch (error: any) {
      console.error('❌ OpenRouter 圖像生成失敗:', error);
      
      if (error.message?.includes('API key')) {
        throw new Error('OpenRouter API 金鑰無效或已過期');
      } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
        throw new Error('OpenRouter API 配額不足或達到限制');
      } else if (error.message?.includes('model')) {
        throw new Error('指定的模型不可用或不支援圖像生成');
      }
      
      throw new Error(`OpenRouter 圖像生成失敗: ${error.message || '未知錯誤'}`);
    }
  }

  /**
   * 批次生成圖像
   */
  async generateBatch(
    requests: Array<{prompt: string, options: OpenRouterImageGenerationOptions}>,
    apiKey: string,
    model = 'google/gemini-2.0-flash-exp',
    onProgress?: (current: number, total: number, currentPrompt?: string) => void
  ): Promise<OpenRouterBatchResult[]> {
    if (!requests || requests.length === 0) {
      throw new Error('批次請求列表不能為空');
    }

    console.log(`🚀 OpenRouter 批次生成 ${requests.length} 張圖像`);
    
    const results: OpenRouterBatchResult[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      try {
        if (onProgress) {
          onProgress(i + 1, requests.length, request.prompt);
        }

        console.log(`📝 處理第 ${i + 1}/${requests.length} 個 OpenRouter 請求`);
        
        const result = await this.generateImage(
          request.prompt,
          request.options,
          apiKey,
          model
        );
        
        results.push({ success: true, data: result });
        console.log(`✅ 第 ${i + 1} 張 OpenRouter 圖像生成成功`);
        
        // API 限制延遲
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ 第 ${i + 1} 張 OpenRouter 圖像生成失敗:`, error);
        results.push({ success: false, error });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log(`🎯 OpenRouter 批次生成完成: ${successCount} 成功, ${failCount} 失敗`);
    
    return results;
  }

  /**
   * 測試 OpenRouter 圖像生成模型
   */
  async testImageGeneration(apiKey: string): Promise<{
    success: boolean;
    supportedModels: string[];
    testResults: any;
  }> {
    const testModels = [
      'google/gemini-2.0-flash-exp',
      'google/gemini-2.0-flash-preview'
    ];

    const testPrompt = 'A simple red circle on white background';
    const results: any = {};

    for (const model of testModels) {
      try {
        console.log(`🧪 測試 OpenRouter 模型: ${model}`);
        
        const result = await this.generateImage(
          testPrompt,
          {
            colorMode: 'color',
            aspectRatio: '1:1',
            numberOfImages: 1,
            sceneType: 'scene'
          },
          apiKey,
          model
        );

        results[model] = {
          success: true,
          hasImageData: result.length > 0 && !!result[0].imageData
        };

      } catch (error: any) {
        results[model] = {
          success: false,
          error: error.message
        };
      }
    }

    const supportedModels = testModels.filter(model => results[model].success);
    
    return {
      success: supportedModels.length > 0,
      supportedModels,
      testResults: results
    };
  }

  /**
   * 取得可用的圖像生成模型
   */
  getAvailableModels(): string[] {
    return [
      'google/gemini-2.0-flash-exp',
      'google/gemini-2.0-flash-preview'
    ];
  }
}

// 導出單例實例
export const openrouterImageService = new OpenRouterImageService();

// 導出類型
export type {
  OpenRouterImageGenerationOptions,
  OpenRouterImageResult,
  OpenRouterBatchResult
};