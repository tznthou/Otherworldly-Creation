import { getModelInfo } from '../../config/modelWhitelist';
import type { ChapterNotesAnalysis } from '../../utils/chapterNotesAnalyzer';

/**
 * AI生成參數類型
 */
export interface AIParams {
  temperature: number;
  topP: number;
  presencePenalty: number;
  maxTokens: number;
  generationCount?: number;
}

/**
 * 參數優化配置
 */
export interface OptimizationConfig {
  modelId: string;
  providerId: string;
  chapterNotesAnalysis?: ChapterNotesAnalysis;
  versionIndex?: number;
  totalVersions?: number;
}

/**
 * 優化後的參數結果
 */
export interface OptimizedParams extends AIParams {
  reasoning?: string; // 優化理由
  adjustments?: string[]; // 調整說明
}

/**
 * 參數優化服務 - 智能參數優化
 * 
 * 職責：
 * - 基於模型特性優化參數
 * - 根據章節筆記調整寫作風格參數
 * - 為多版本生成創建參數變異
 * - 提供參數優化建議和說明
 */
export class ParameterOptimizer {

  /**
   * 為特定模型優化參數
   */
  optimizeForModel(modelId: string, baseParams: AIParams): OptimizedParams {
    const modelInfo = getModelInfo('auto', modelId); // 使用auto讓系統推斷provider
    const adjustments: string[] = [];
    let reasoning = '基於模型特性調整參數';

    // 複製基礎參數
    const optimized: OptimizedParams = { ...baseParams };

    // 思考式模型優化（o1系列）
    if (this.isReasoningModel(modelId)) {
      optimized.temperature = 1.0; // 思考式模型建議使用預設值
      optimized.maxTokens = Math.min(optimized.maxTokens, 32768); // o1系列上限
      adjustments.push('思考式模型：固定temperature為1.0，限制maxTokens');
      reasoning += '，思考式模型會扣除思考部分';
    }
    
    // Gemini Flash系列優化
    else if (this.isGeminiFlash(modelId)) {
      optimized.temperature = Math.min(optimized.temperature, 0.9);
      optimized.maxTokens = Math.min(optimized.maxTokens, 1000); // Flash版本限制
      adjustments.push('Gemini Flash：降低temperature，限制token數');
    }
    
    // GPT-4系列優化
    else if (this.isGPT4Model(modelId)) {
      // GPT-4系列建議稍微保守的參數
      optimized.temperature = Math.max(0.3, Math.min(optimized.temperature, 1.0));
      optimized.presencePenalty = Math.max(0, Math.min(optimized.presencePenalty, 1.0));
    }
    
    // Claude系列優化
    else if (this.isClaudeModel(modelId)) {
      // Claude對創意參數比較敏感
      optimized.topP = Math.max(0.7, Math.min(optimized.topP, 1.0));
    }

    // 使用模型信息進行額外優化
    if (modelInfo) {
      if (modelInfo.maxTokens && optimized.maxTokens > modelInfo.maxTokens) {
        optimized.maxTokens = modelInfo.maxTokens;
        adjustments.push(`限制maxTokens至模型上限：${modelInfo.maxTokens}`);
      }
    }

    return {
      ...optimized,
      reasoning,
      adjustments
    };
  }

  /**
   * 基於章節筆記分析優化參數
   */
  optimizeForChapterNotes(analysis: ChapterNotesAnalysis, baseParams: AIParams): OptimizedParams {
    const optimized: OptimizedParams = { ...baseParams };
    const adjustments: string[] = [];

    // 基於風格分析調整temperature
    const { style, tone } = analysis;
    
    // 對話導向 - 稍微提高創意度
    if (style.dialogue > 0.6) {
      optimized.temperature = Math.min(1.2, optimized.temperature + 0.1);
      adjustments.push('對話導向：提高temperature增加對話自然度');
    }
    
    // 動作導向 - 降低隨機性，提高連貫性
    if (style.action > 0.6) {
      optimized.temperature = Math.max(0.3, optimized.temperature - 0.1);
      optimized.topP = Math.max(0.7, optimized.topP - 0.1);
      adjustments.push('動作導向：降低參數提高動作連貫性');
    }
    
    // 描述導向 - 平衡參數
    if (style.description > 0.6) {
      optimized.topP = Math.min(0.95, optimized.topP + 0.05);
      adjustments.push('描述導向：適度提高topP豐富描述詞彙');
    }
    
    // 情感導向 - 稍微提高創意參數
    if (style.emotion > 0.6) {
      optimized.temperature = Math.min(1.2, optimized.temperature + 0.15);
      optimized.presencePenalty = Math.max(0, optimized.presencePenalty - 0.1);
      adjustments.push('情感導向：提高參數增加情感表達豐富度');
    }

    // 基於基調調整
    const maxTone = Object.entries(tone).sort(([,a], [,b]) => b - a)[0];
    if (maxTone[1] > 0.5) {
      switch (maxTone[0]) {
        case 'dramatic':
          optimized.temperature = Math.min(1.1, optimized.temperature + 0.1);
          adjustments.push('戲劇基調：提高創意度突出戲劇效果');
          break;
        case 'humorous':
          optimized.temperature = Math.min(1.2, optimized.temperature + 0.2);
          optimized.topP = Math.min(1.0, optimized.topP + 0.1);
          adjustments.push('幽默基調：提高隨機性增加幽默變化');
          break;
        case 'mysterious':
          optimized.presencePenalty = Math.min(1.5, optimized.presencePenalty + 0.2);
          adjustments.push('神秘基調：提高presence penalty避免過度重複');
          break;
        case 'emotional':
          optimized.temperature = Math.min(1.0, optimized.temperature + 0.1);
          adjustments.push('情感基調：適度提高溫度增加情感細膩度');
          break;
      }
    }

    return {
      ...optimized,
      reasoning: '基於章節筆記分析調整寫作風格參數',
      adjustments
    };
  }

  /**
   * 為多版本生成創建參數變異
   */
  createVersionParams(
    baseParams: AIParams,
    versionIndex: number,
    totalVersions: number
  ): OptimizedParams {
    if (totalVersions <= 1) {
      return { ...baseParams };
    }

    const optimized: OptimizedParams = { ...baseParams };
    const adjustments: string[] = [];

    // 為每個版本創建略微不同的參數
    const variation = (versionIndex - Math.floor(totalVersions / 2)) * 0.1;
    
    // Temperature變異 (±0.15範圍內)
    optimized.temperature = Math.max(0.3, Math.min(1.2, 
      baseParams.temperature + variation * 0.15));
    
    // TopP變異 (±0.1範圍內)
    optimized.topP = Math.max(0.5, Math.min(1.0, 
      baseParams.topP + variation * 0.1));
    
    // Presence Penalty變異 (±0.2範圍內)
    optimized.presencePenalty = Math.max(0, Math.min(1.5, 
      baseParams.presencePenalty + variation * 0.2));
    
    // 長度變異 (每版本±50 tokens)
    optimized.maxTokens = Math.max(50, baseParams.maxTokens + (versionIndex * 50));

    adjustments.push(`版本${versionIndex + 1}：創建參數變異提供不同風格選擇`);

    return {
      ...optimized,
      reasoning: `第${versionIndex + 1}版本參數優化`,
      adjustments
    };
  }

  /**
   * 綜合優化 - 整合所有優化策略
   */
  optimize(config: OptimizationConfig, baseParams: AIParams): OptimizedParams {
    let optimized = { ...baseParams };

    // 1. 基於模型優化
    const modelOptimized = this.optimizeForModel(config.modelId, optimized);
    optimized = { ...modelOptimized };

    // 2. 基於章節筆記優化
    if (config.chapterNotesAnalysis) {
      const notesOptimized = this.optimizeForChapterNotes(
        config.chapterNotesAnalysis, 
        optimized
      );
      optimized = { ...notesOptimized };
      
      // 合併調整說明
      const allAdjustments = [
        ...(modelOptimized.adjustments || []),
        ...(notesOptimized.adjustments || [])
      ];
      (optimized as any).adjustments = allAdjustments;
    }

    // 3. 基於版本變異
    if (config.versionIndex !== undefined && config.totalVersions !== undefined) {
      const versionOptimized = this.createVersionParams(
        optimized, 
        config.versionIndex, 
        config.totalVersions
      );
      optimized = { ...versionOptimized };
      
      // 合併版本調整說明
      const finalAdjustments = [
        ...((optimized as any).adjustments || []),
        ...(versionOptimized.adjustments || [])
      ];
      (optimized as any).adjustments = finalAdjustments;
    }

    return optimized;
  }

  /**
   * 模型類型檢測方法
   */
  private isReasoningModel(modelId: string): boolean {
    const lowerModel = modelId.toLowerCase();
    return lowerModel.includes('o1') || lowerModel.includes('o3');
  }

  private isGeminiFlash(modelId: string): boolean {
    const lowerModel = modelId.toLowerCase();
    return lowerModel.includes('gemini') && lowerModel.includes('flash');
  }

  private isGPT4Model(modelId: string): boolean {
    const lowerModel = modelId.toLowerCase();
    return lowerModel.includes('gpt-4') || lowerModel.includes('gpt4');
  }

  private isClaudeModel(modelId: string): boolean {
    const lowerModel = modelId.toLowerCase();
    return lowerModel.includes('claude');
  }
}

/**
 * 單例實例
 */
export const parameterOptimizer = new ParameterOptimizer();