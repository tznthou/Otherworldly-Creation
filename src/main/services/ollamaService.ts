interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaResponse {
  models: OllamaModel[];
}

interface OllamaVersionResponse {
  version: string;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(
    baseUrl: string = 'http://localhost:11434',
    timeout: number = 30000,
    retryAttempts: number = 3,
    retryDelay: number = 1000
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
  }

  /**
   * 檢查 Ollama 服務是否可用
   */
  async checkServiceAvailability(): Promise<{
    available: boolean;
    version?: string;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          available: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data: OllamaVersionResponse = await response.json();
      return {
        available: true,
        version: data.version,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      
      if (errorMessage.includes('AbortError')) {
        return {
          available: false,
          error: '連接超時',
        };
      }
      
      if (errorMessage.includes('ECONNREFUSED')) {
        return {
          available: false,
          error: 'Ollama 服務未運行',
        };
      }

      return {
        available: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 獲取可用模型列表
   */
  async listModels(): Promise<{
    success: boolean;
    models: Array<{
      name: string;
      size: number;
      modified_at: string;
    }>;
    error?: string;
  }> {
    try {
      const serviceCheck = await this.checkServiceAvailability();
      if (!serviceCheck.available) {
        return {
          success: false,
          models: [],
          error: serviceCheck.error,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          models: [],
          error: `無法獲取模型列表: HTTP ${response.status}`,
        };
      }

      const data: OllamaResponse = await response.json();
      const models = data.models?.map(model => ({
        name: model.name,
        size: model.size,
        modified_at: model.modified_at,
      })) || [];

      return {
        success: true,
        models,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      return {
        success: false,
        models: [],
        error: `獲取模型列表失敗: ${errorMessage}`,
      };
    }
  }

  /**
   * 生成文本（帶重試機制）
   */
  async generateText(
    model: string,
    prompt: string,
    options?: {
      temperature?: number;
      topP?: number;
      maxTokens?: number;
      presencePenalty?: number;
      frequencyPenalty?: number;
    }
  ): Promise<{
    success: boolean;
    response?: string;
    error?: string;
    metadata?: {
      total_duration?: number;
      eval_count?: number;
      eval_duration?: number;
    };
  }> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const serviceCheck = await this.checkServiceAvailability();
        if (!serviceCheck.available) {
          return {
            success: false,
            error: serviceCheck.error,
          };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const requestBody: OllamaGenerateRequest = {
          model,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature || 0.7,
            top_p: options?.topP || 0.9,
            max_tokens: options?.maxTokens || 200,
            presence_penalty: options?.presencePenalty || 0,
            frequency_penalty: options?.frequencyPenalty || 0,
          },
        };

        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          
          // 如果是 4xx 錯誤，不重試
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: lastError,
            };
          }
          
          // 5xx 錯誤或其他錯誤，繼續重試
          if (attempt < this.retryAttempts) {
            console.log(`生成文本失敗，第 ${attempt} 次重試: ${lastError}`);
            await this.delay(this.retryDelay * attempt);
            continue;
          }
        }

        const data: OllamaGenerateResponse = await response.json();
        
        return {
          success: true,
          response: data.response,
          metadata: {
            total_duration: data.total_duration,
            eval_count: data.eval_count,
            eval_duration: data.eval_duration,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        lastError = errorMessage;

        if (errorMessage.includes('AbortError')) {
          lastError = '請求超時';
        }

        if (attempt < this.retryAttempts) {
          console.log(`生成文本失敗，第 ${attempt} 次重試: ${lastError}`);
          await this.delay(this.retryDelay * attempt);
          continue;
        }
      }
    }

    return {
      success: false,
      error: `生成文本失敗（已重試 ${this.retryAttempts} 次）: ${lastError}`,
    };
  }

  /**
   * 檢查特定模型是否可用
   */
  async checkModelAvailability(modelName: string): Promise<{
    available: boolean;
    error?: string;
  }> {
    try {
      const modelsResult = await this.listModels();
      
      if (!modelsResult.success) {
        return {
          available: false,
          error: modelsResult.error,
        };
      }

      const modelExists = modelsResult.models.some(model => 
        model.name === modelName || model.name.startsWith(modelName)
      );

      return {
        available: modelExists,
        error: modelExists ? undefined : `模型 "${modelName}" 不存在`,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : '檢查模型失敗',
      };
    }
  }

  /**
   * 獲取服務狀態摘要
   */
  async getServiceStatus(): Promise<{
    service: {
      available: boolean;
      version?: string;
      error?: string;
    };
    models: {
      count: number;
      list: string[];
    };
    lastChecked: Date;
  }> {
    const serviceCheck = await this.checkServiceAvailability();
    const modelsResult = await this.listModels();

    return {
      service: serviceCheck,
      models: {
        count: modelsResult.models.length,
        list: modelsResult.models.map(m => m.name),
      },
      lastChecked: new Date(),
    };
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新配置
   */
  updateConfig(config: {
    baseUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  }): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.timeout) this.timeout = config.timeout;
    if (config.retryAttempts) this.retryAttempts = config.retryAttempts;
    if (config.retryDelay) this.retryDelay = config.retryDelay;
  }
}

// 單例實例
export const ollamaService = new OllamaService();