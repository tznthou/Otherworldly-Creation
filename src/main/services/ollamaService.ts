import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

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
   * 使用 Node.js http/https 模組發送請求
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const result = JSON.parse(data);
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
          } catch (error) {
            reject(new Error(`解析響應失敗: ${error}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('請求超時'));
      });
      
      req.end();
    });
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
      const data: OllamaVersionResponse = await this.makeRequest<OllamaVersionResponse>('/api/version');
      return {
        available: true,
        version: data.version,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      
      if (errorMessage.includes('ECONNREFUSED')) {
        return {
          available: false,
          error: '無法連接到 Ollama 服務',
        };
      }
      
      if (errorMessage.includes('ENOTFOUND')) {
        return {
          available: false,
          error: '找不到 Ollama 服務主機',
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

      const data: OllamaResponse = await this.makeRequest<OllamaResponse>('/api/tags');
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

        // 使用 Node.js http 發送 POST 請求
        const response = await this.makePostRequest<OllamaGenerateResponse>('/api/generate', requestBody);

        return {
          success: true,
          response: response.response,
          metadata: {
            total_duration: response.total_duration,
            eval_count: response.eval_count,
            eval_duration: response.eval_duration,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : '未知錯誤';
        console.warn(`生成文本嘗試 ${attempt}/${this.retryAttempts} 失敗:`, lastError);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay);
        }
      }
    }

    return {
      success: false,
      error: `生成文本失敗 (${this.retryAttempts} 次嘗試): ${lastError}`,
    };
  }

  /**
   * 使用 Node.js http/https 模組發送 POST 請求
   */
  private async makePostRequest<T>(endpoint: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      const client = url.protocol === 'https:' ? https : http;
      const postData = JSON.stringify(data);
      
      const req = client.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: this.timeout,
      }, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const result = JSON.parse(responseData);
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
          } catch (error) {
            reject(new Error(`解析響應失敗: ${error}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('請求超時'));
      });
      
      req.write(postData);
      req.end();
    });
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
      
      const modelExists = modelsResult.models.some(model => model.name === modelName);
      
      return {
        available: modelExists,
        error: modelExists ? undefined : `模型 ${modelName} 不存在`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      return {
        available: false,
        error: `檢查模型失敗: ${errorMessage}`,
      };
    }
  }

  /**
   * 獲取完整的服務狀態
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
        count: modelsResult.success ? modelsResult.models.length : 0,
        list: modelsResult.success ? modelsResult.models.map(m => m.name) : [],
      },
      lastChecked: new Date(),
    };
  }

  /**
   * 延遲執行
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

// 創建單例實例
export const ollamaService = new OllamaService();