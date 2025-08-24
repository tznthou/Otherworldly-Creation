import { generateTextWithProvider } from '../../store/slices/aiSlice';
import type { AppDispatch } from '../../store/store';
import type { AIParams } from './ParameterOptimizer';
import type { PromptContext } from './ContextPreparationService';

/**
 * 生成配置類型
 */
export interface GenerationConfig {
  projectId: string;
  chapterId: string;
  model: string;
  providerId: string;
  context: PromptContext;
  params: AIParams;
  dispatch: AppDispatch;
}

/**
 * 生成結果類型
 */
export interface GenerationResult {
  id: string;
  text: string;
  temperature: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  rawResponse?: any;
}

/**
 * 批次生成結果類型
 */
export interface BatchGenerationResult {
  results: GenerationResult[];
  successCount: number;
  failureCount: number;
  errors: string[];
  totalRequested: number;
}

/**
 * 重試配置
 */
export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * 生成執行器 - 處理AI生成的核心邏輯
 * 
 * 職責：
 * - 執行單次AI文本生成
 * - 處理多版本批次生成
 * - 實作智能重試機制
 * - 過濾和處理響應內容
 * - 統一的錯誤處理和日誌
 */
export class GenerationExecutor {

  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 2,
    delayMs: 1000,
    backoffMultiplier: 2,
    retryableErrors: ['429', 'timeout', 'network', 'temporary']
  };

  /**
   * 執行單次生成
   */
  async executeGeneration(config: GenerationConfig): Promise<GenerationResult> {
    const startTime = Date.now();
    const generationId = `${startTime}-${Math.random().toString(36).slice(2, 11)}`;

    try {
      console.log(`🚀 開始生成 [${generationId}]:`, {
        model: config.model,
        provider: config.providerId,
        temperature: config.params.temperature,
        maxTokens: config.params.maxTokens
      });

      const genResult = await config.dispatch(generateTextWithProvider({
        prompt: config.context.basePrompt,
        providerId: config.providerId,
        model: config.model,
        projectId: config.projectId,
        chapterId: config.chapterId,
        position: config.context.position,
        aiParams: config.params,
        systemPrompt: config.context.systemPrompt
      })).unwrap();

      // 過濾思考標籤和其他不需要的內容
      const filteredText = this.filterResponse(genResult.result);

      const result: GenerationResult = {
        id: generationId,
        text: filteredText,
        temperature: config.params.temperature,
        timestamp: new Date(),
        success: true,
        rawResponse: genResult
      };

      console.log(`✅ 生成成功 [${generationId}]: ${filteredText.length} 字符`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ 生成失敗 [${generationId}]:`, error);
      
      return {
        id: generationId,
        text: '',
        temperature: config.params.temperature,
        timestamp: new Date(),
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 帶重試的生成執行
   */
  async executeWithRetry(
    config: GenerationConfig, 
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<GenerationResult> {
    const finalRetryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: any;

    for (let attempt = 0; attempt <= finalRetryConfig.maxRetries; attempt++) {
      try {
        // 如果不是第一次嘗試，等待一段時間
        if (attempt > 0) {
          const delay = finalRetryConfig.delayMs * Math.pow(finalRetryConfig.backoffMultiplier, attempt - 1);
          console.log(`⏳ 第${attempt}次重試，等待 ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await this.executeGeneration(config);
        
        if (result.success) {
          if (attempt > 0) {
            console.log(`🔄 重試成功 [${result.id}] - 第${attempt}次嘗試`);
          }
          return result;
        }

        // 檢查是否為可重試的錯誤
        if (!this.isRetryableError(result.error, finalRetryConfig)) {
          console.log(`🚫 不可重試的錯誤: ${result.error}`);
          return result;
        }

        lastError = result.error;

      } catch (error) {
        lastError = error;
        if (!this.isRetryableError(String(error), finalRetryConfig)) {
          break;
        }
      }
    }

    console.error(`💥 重試耗盡，最終失敗: ${lastError}`);
    return {
      id: `failed-${Date.now()}`,
      text: '',
      temperature: config.params.temperature,
      timestamp: new Date(),
      success: false,
      error: `重試${finalRetryConfig.maxRetries}次後仍然失敗: ${lastError}`
    };
  }

  /**
   * 批次生成多個版本
   */
  async executeBatchGeneration(
    configs: GenerationConfig[],
    onProgress?: (current: number, total: number, result?: GenerationResult) => void
  ): Promise<BatchGenerationResult> {
    const results: GenerationResult[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    console.log(`📊 開始批次生成 ${configs.length} 個版本`);

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      
      try {
        // 為非第一個請求添加延遲，避免API限制
        if (i > 0) {
          const isGeminiAPI = config.model.toLowerCase().includes('gemini');
          const delay = isGeminiAPI ? 2000 : 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await this.executeWithRetry(config);
        results.push(result);

        if (result.success) {
          successCount++;
          console.log(`✅ 批次進度 ${i + 1}/${configs.length} - 成功`);
        } else {
          failureCount++;
          if (result.error) errors.push(result.error);
          console.log(`❌ 批次進度 ${i + 1}/${configs.length} - 失敗: ${result.error}`);
          
          // 檢查是否為配額錯誤，如果是則停止後續生成
          if (this.isQuotaError(result.error)) {
            console.warn('🛑 檢測到配額限制，停止後續生成');
            break;
          }
        }

        // 調用進度回調
        onProgress?.(i + 1, configs.length, result);

      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        console.error(`💥 批次生成第${i + 1}項發生未捕獲錯誤:`, error);
        
        // 為未成功的項目添加失敗結果
        results.push({
          id: `batch-error-${i}`,
          text: '',
          temperature: config.params.temperature,
          timestamp: new Date(),
          success: false,
          error: errorMsg
        });

        onProgress?.(i + 1, configs.length);
      }
    }

    const batchResult: BatchGenerationResult = {
      results,
      successCount,
      failureCount,
      errors,
      totalRequested: configs.length
    };

    console.log(`📈 批次生成完成: ${successCount}成功, ${failureCount}失敗`);
    return batchResult;
  }

  /**
   * 過濾響應內容 - 移除思考標籤等不需要的內容
   */
  filterResponse(rawText: string): string {
    if (!rawText) return '';

    let filtered = rawText;

    // 移除常見的思考標籤
    const thinkingPatterns = [
      /<thinking>[\s\S]*?<\/thinking>/gi,
      /<think>[\s\S]*?<\/think>/gi,
      /\[思考\][\s\S]*?\[\/思考\]/gi,
      /\[thinking\][\s\S]*?\[\/thinking\]/gi
    ];

    thinkingPatterns.forEach(pattern => {
      filtered = filtered.replace(pattern, '');
    });

    // 移除多餘的空行和空白
    filtered = filtered
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 多個空行合併為兩個
      .trim();

    return filtered;
  }

  /**
   * 檢查是否為可重試的錯誤
   */
  private isRetryableError(error: string | undefined, retryConfig: RetryConfig): boolean {
    if (!error) return false;
    
    const lowerError = error.toLowerCase();
    return retryConfig.retryableErrors.some(retryableError => 
      lowerError.includes(retryableError)
    );
  }

  /**
   * 檢查是否為配額錯誤
   */
  private isQuotaError(error: string | undefined): boolean {
    if (!error) return false;
    
    const lowerError = error.toLowerCase();
    const quotaIndicators = ['429', 'quota', 'resource_exhausted', '配額', 'limit exceeded'];
    
    return quotaIndicators.some(indicator => lowerError.includes(indicator));
  }
}

/**
 * 單例實例
 */
export const generationExecutor = new GenerationExecutor();