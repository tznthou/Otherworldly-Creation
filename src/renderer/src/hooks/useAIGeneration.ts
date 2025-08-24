import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { addNotification } from '../store/slices/uiSlice';
import { Editor } from 'slate';

// 導入所有服務
import { validationService } from '../services/ai-generation/ValidationService';
import { contextPreparationService } from '../services/ai-generation/ContextPreparationService';
import { parameterOptimizer } from '../services/ai-generation/ParameterOptimizer';
import { generationExecutor } from '../services/ai-generation/GenerationExecutor';
import { progressManager, type ProgressState } from '../services/ai-generation/ProgressManager';

import type { AIParams } from '../services/ai-generation/ParameterOptimizer';

/**
 * AI生成配置類型
 */
export interface AIGenerationConfig {
  model: string;
  provider: string;
  editor: Editor;
  projectId: string;
  chapterId: string;
  generationCount: number;
  baseParams: AIParams;
  enableContextOptimization?: boolean;
}

/**
 * 生成選項類型（用於UI顯示）
 */
export interface GenerationOption {
  id: string;
  text: string;
  temperature: number;
  timestamp: Date;
}

/**
 * AI生成Hook返回類型
 */
export interface AIGenerationHook {
  // 狀態
  isGenerating: boolean;
  progress: ProgressState;
  generationOptions: GenerationOption[];
  
  // 方法
  generate: (config: AIGenerationConfig) => Promise<void>;
  clearOptions: () => void;
  cancelGeneration: () => void;
  
  // 實用方法
  getEstimatedTime: () => number | null;
  getSuccessRate: () => number;
}

/**
 * AI生成Hook - 封裝完整的AI生成流程
 * 
 * 功能：
 * - 整合所有AI生成服務
 * - 提供簡單易用的API
 * - 自動處理錯誤和進度
 * - 支援取消操作
 * - 統一的狀態管理
 */
export function useAIGeneration(): AIGenerationHook {
  const dispatch = useDispatch<AppDispatch>();
  
  // 狀態管理
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(progressManager.getCurrentProgress());
  const [generationOptions, setGenerationOptions] = useState<GenerationOption[]>([]);
  
  // 取消控制
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 主要生成方法
   */
  const generate = useCallback(async (config: AIGenerationConfig): Promise<void> => {
    console.log('🚀 開始AI生成流程:', config);
    
    // 1. 驗證階段
    const validationResult = validationService.validateAll({
      model: config.model,
      provider: config.provider,
      editor: config.editor,
      projectId: config.projectId,
      chapterId: config.chapterId
    });

    if (!validationResult.isValid) {
      dispatch(addNotification({
        type: 'warning',
        title: '驗證失敗',
        message: validationResult.error || '未知驗證錯誤',
        duration: 3000,
      }));
      return;
    }

    // 2. 初始化狀態
    setIsGenerating(true);
    setGenerationOptions([]);
    abortControllerRef.current = new AbortController();
    
    // 初始化進度管理
    progressManager.initProgress(config.generationCount, '準備生成上下文...');

    try {
      // 3. 準備上下文階段
      progressManager.updateStep('分析編輯器狀態...');
      const editorContext = contextPreparationService.prepareEditorContext(config.editor);
      
      progressManager.updateStep('準備上下文和章節筆記...');
      const promptContext = await contextPreparationService.preparePromptContext(
        editorContext,
        config.chapterId,
        {
          maxTokens: config.baseParams.maxTokens,
          enableOptimization: config.enableContextOptimization || false
        }
      );

      // 4. 參數優化階段
      progressManager.updateStep('優化AI參數...');
      
      // 準備生成配置列表
      const generationConfigs = [];
      for (let i = 0; i < config.generationCount; i++) {
        // 為每個版本優化參數
        const optimizedParams = parameterOptimizer.optimize({
          modelId: config.model,
          providerId: config.provider,
          chapterNotesAnalysis: promptContext.chapterNotes?.analysis,
          versionIndex: i,
          totalVersions: config.generationCount
        }, config.baseParams);

        generationConfigs.push({
          projectId: config.projectId,
          chapterId: config.chapterId,
          model: config.model,
          providerId: config.provider,
          context: promptContext,
          params: optimizedParams,
          dispatch
        });

        console.log(`📋 版本${i + 1}參數:`, optimizedParams);
      }

      // 5. 執行生成階段
      progressManager.updateStep('開始生成內容...');
      
      const batchResult = await generationExecutor.executeBatchGeneration(
        generationConfigs,
        (current, total, result) => {
          // 進度回調
          if (result) {
            progressManager.markVersionComplete(current - 1, result.success);
            if (result.error) {
              progressManager.addError(result.error);
            }
          }
        }
      );

      // 6. 處理結果階段
      const successfulResults = batchResult.results.filter(r => r.success);
      const options: GenerationOption[] = successfulResults.map(result => ({
        id: result.id,
        text: result.text,
        temperature: result.temperature,
        timestamp: result.timestamp
      }));

      setGenerationOptions(options);

      // 7. 完成階段
      progressManager.completeProgress();

      // 顯示完成通知
      if (successfulResults.length > 0) {
        const message = batchResult.failureCount > 0
          ? `成功生成 ${batchResult.successCount} 個版本，${batchResult.failureCount} 個失敗`
          : `成功生成 ${batchResult.successCount} 個版本`;
          
        dispatch(addNotification({
          type: batchResult.failureCount === 0 ? 'success' : 'warning',
          title: 'AI 續寫完成',
          message,
          duration: 4000,
        }));
      } else {
        throw new Error('所有版本生成都失敗了');
      }

    } catch (error) {
      console.error('❌ AI生成流程失敗:', error);
      
      // 更新進度為失敗狀態
      progressManager.addError(error instanceof Error ? error.message : '未知錯誤');
      progressManager.completeProgress('生成失敗');
      
      dispatch(addNotification({
        type: 'error',
        title: 'AI 續寫失敗',
        message: error instanceof Error ? error.message : '生成文本時發生錯誤',
        duration: 5000,
      }));
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [dispatch]);

  /**
   * 清除生成選項
   */
  const clearOptions = useCallback(() => {
    setGenerationOptions([]);
  }, []);

  /**
   * 取消生成
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    progressManager.completeProgress('已取消');
  }, []);

  /**
   * 獲取預估剩餘時間
   */
  const getEstimatedTime = useCallback((): number | null => {
    return progress.estimatedTimeRemaining || null;
  }, [progress.estimatedTimeRemaining]);

  /**
   * 獲取成功率
   */
  const getSuccessRate = useCallback((): number => {
    const total = progress.completedVersions + progress.failedVersions;
    if (total === 0) return 0;
    return (progress.completedVersions / total) * 100;
  }, [progress.completedVersions, progress.failedVersions]);

  // 訂閱進度管理器更新
  useEffect(() => {
    const unsubscribe = progressManager.subscribe((newProgress) => {
      setProgress(newProgress);
    });
    
    return unsubscribe;
  }, []);

  return {
    // 狀態
    isGenerating,
    progress,
    generationOptions,
    
    // 方法
    generate,
    clearOptions,
    cancelGeneration,
    
    // 實用方法
    getEstimatedTime,
    getSuccessRate
  };
}