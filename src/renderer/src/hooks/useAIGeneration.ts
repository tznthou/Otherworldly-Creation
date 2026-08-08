import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { addNotification } from '../store/slices/uiSlice';
import { Editor } from 'slate';

// 導入所有服務
import { validationService } from '../services/ai-generation/ValidationService';
import { contextPreparationService } from '../services/ai-generation/ContextPreparationService';
import { parameterOptimizer } from '../services/ai-generation/ParameterOptimizer';
import { generationExecutor } from '../services/ai-generation/GenerationExecutor';
import { progressManager, type ProgressState } from '../services/ai-generation/ProgressManager';

import type { AIParams } from '../services/ai-generation/ParameterOptimizer';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('useAIGeneration');

// 🐛 開發模式 debug logging (生產環境會被優化掉)
const DEBUG_AI_GENERATION = process.env.NODE_ENV === 'development';

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
  const settings = useSelector((state: RootState) => state.settings.settings);

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
    if (DEBUG_AI_GENERATION) {
      log.debug('🚀 開始AI生成流程:', config);
    }
    
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
    progressManager.initProgress(config.generationCount, '準備智能多維度上下文建構...');

    try {
      // 3. 準備上下文階段
      progressManager.updateStep('分析編輯器狀態...');
      const editorContext = contextPreparationService.prepareEditorContext(config.editor);
      
      // 檢查是否啟用智能上下文優化
      const isIntelligentOptimizationEnabled =
        settings.features?.intelligentContextOptimization &&
        settings.ai?.intelligentContext?.enabled;

      if (isIntelligentOptimizationEnabled) {
        progressManager.updateStep('🧠 執行智能跨章節上下文分析...');
      } else {
        progressManager.updateStep('準備傳統上下文...');
      }

      const promptContext = await contextPreparationService.preparePromptContext(
        editorContext,
        config.chapterId,
        config.projectId,
        {
          // 基礎配置
          maxTokens: config.baseParams.maxTokens,
          enableOptimization: config.enableContextOptimization || false,

          // 智能優化配置（從設定讀取）
          enableIntelligentOptimization: isIntelligentOptimizationEnabled,
          preserveDialogue: settings.ai?.intelligentContext?.preserveDialogue ?? true,
          contextOptimizationLevel: settings.ai?.intelligentContext?.optimizationLevel ?? 'advanced',

          // 多維度權重配置（從設定讀取）
          plotAnalysisWeight: settings.ai?.intelligentContext?.plotAnalysisWeight ?? 0.4,
          statusWeight: settings.ai?.intelligentContext?.statusWeight ?? 0.3,
          proximityWeight: settings.ai?.intelligentContext?.proximityWeight ?? 0.3,

          // Token預算管理（從設定讀取，回退到基礎maxTokens）
          maxTokenBudget: settings.ai?.intelligentContext?.maxTokenBudget ?? config.baseParams.maxTokens
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

        if (DEBUG_AI_GENERATION) {
          log.debug(`📋 版本${i + 1}參數:`, optimizedParams);
        }
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
          : `🧠 智能上下文續寫成功生成 ${batchResult.successCount} 個版本`;
          
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
      log.error('❌ AI生成流程失敗:', error);

      // 🎯 智能錯誤分類
      let userFriendlyMessage = '生成文本時發生錯誤';
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('not found') || errorMsg.includes('找不到')) {
          userFriendlyMessage = '章節資料不存在，請檢查專案設定';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
          userFriendlyMessage = '網路連線失敗，請檢查網路狀態後重試';
        } else if (errorMsg.includes('api key') || errorMsg.includes('unauthorized')) {
          userFriendlyMessage = 'API 金鑰無效，請檢查 AI Provider 設定';
        } else if (errorMsg.includes('智能上下文') || errorMsg.includes('intelligent context')) {
          userFriendlyMessage = `智能上下文建構失敗: ${error.message}`;
        } else {
          userFriendlyMessage = error.message;
        }
      }

      // 更新進度為失敗狀態
      progressManager.addError(error instanceof Error ? error.message : '未知錯誤');
      progressManager.completeProgress('生成失敗');

      dispatch(addNotification({
        type: 'error',
        title: 'AI 續寫失敗',
        message: userFriendlyMessage,
        duration: 5000,
      }));
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
    // settings 必須列進依賴：函式體讀了 features.intelligentContextOptimization
    // 與 ai.intelligentContext 的七個欄位。少了它，閉包會停在 mount 當下那份，
    // 使用者改完智慧上下文設定得重開 app 才生效。
    //
    // 重建成本為零 —— 本 hook 回傳的是物件字面量，呼叫端的依賴每次 render
    // 本來就是新引用；且 generate 沒有被任何 useEffect 依賴，不會觸發迴圈。
  }, [dispatch, settings]);

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