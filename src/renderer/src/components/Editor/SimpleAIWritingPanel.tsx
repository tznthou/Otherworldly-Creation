import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel, fetchAvailableModels } from '../../store/slices/aiSlice';
import { startProgress, updateProgress, completeProgress, failProgress, removeProgress, selectProgressById } from '../../store/slices/errorSlice';
import { createAIHistory, AIGenerationHistory } from '../../store/slices/aiHistorySlice';
import { store } from '../../store/store';
import { api } from '../../api';
import { AIGenerationProgress } from '../AI';
import AIHistoryPanel from '../AI/AIHistoryPanel';
import { ErrorSeverity } from '../../types/error';

interface SimpleAIWritingPanelProps {
  projectId: string;
  chapterId: string;
  currentPosition: number;
  onInsertText: (text: string) => void;
}

interface GenerationOption {
  id: string;
  text: string;
  temperature: number;
  timestamp: Date;
  selected?: boolean;
}


// 過濾掉 AI 思考標籤的函數
const filterThinkingTags = (text: string): string => {
  // 移除常見的思考標籤及其內容
  const patterns = [
    // 標準 XML 格式的思考標籤
    /<think[^>]*>[\s\S]*?<\/think>/gi,
    /<thinking[^>]*>[\s\S]*?<\/thinking>/gi,
    /<thought[^>]*>[\s\S]*?<\/thought>/gi,
    /<reflection[^>]*>[\s\S]*?<\/reflection>/gi,
    /<thinking[^>]*>[\s\S]*?<\/antml:thinking>/gi,
    
    // 可能的單行或不完整標籤
    /<think[^>]*>/gi,
    /<\/think>/gi,
    /<thinking[^>]*>/gi,
    /<\/thinking>/gi,
    
    // Markdown 風格的思考標記
    /```thinking[\s\S]*?```/gi,
    /```think[\s\S]*?```/gi,
    
    // 其他可能的思考標記
    /\[THINKING\][\s\S]*?\[\/THINKING\]/gi,
    /\[THINK\][\s\S]*?\[\/THINK\]/gi,
    /\{\{thinking\}\}[\s\S]*?\{\{\/thinking\}\}/gi,
    /\{\{think\}\}[\s\S]*?\{\{\/think\}\}/gi,
  ];
  
  let filteredText = text;
  patterns.forEach(pattern => {
    filteredText = filteredText.replace(pattern, '');
  });
  
  // 清理多餘的空行
  filteredText = filteredText.replace(/\n{3,}/g, '\n\n').trim();
  
  return filteredText;
};

const SimpleAIWritingPanel: React.FC<SimpleAIWritingPanelProps> = ({ 
  projectId, 
  chapterId, 
  currentPosition,
  onInsertText 
}) => {
  
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 狀態宣告
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOption[]>([]);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // 從 Redux store 獲取 AI 相關狀態
  const { currentModel, availableModels, isOllamaConnected } = useAppSelector(state => state.ai);
  const currentLanguage = 'zh-TW'; // 固定使用繁體中文
  
  // 獲取當前進度信息
  const currentProgress = useAppSelector(state => 
    progressId ? selectProgressById(progressId)(state) : null
  );
  
  
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(200);
  const [generationCount, setGenerationCount] = useState(3);
  
  // 獲取可用的 AI 模型（如果尚未載入）
  useEffect(() => {
    if (isOllamaConnected && availableModels.length === 0) {
      dispatch(fetchAvailableModels());
    }
  }, [dispatch, isOllamaConnected, availableModels.length]);

  // 清理效果：組件卸載時取消正在進行的請求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  

  // 生成文本
  const handleGenerate = async () => {
    // 設置超時計時器
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      if (!currentModel) {
        dispatch(addNotification({
          type: 'warning',
          title: '未選擇模型',
          message: '請先選擇一個 AI 模型',
          duration: 3000,
        }));
        return;
      }
      
    
    setIsGenerating(true);
    
    // 設置超時（6分鐘），給 AI 充足的生成時間
    timeoutId = setTimeout(() => {
      console.error('AI 生成超時');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsGenerating(false);
      dispatch(addNotification({
        type: 'error',
        title: 'AI 生成超時',
        message: '生成時間過長，請重試或考慮減少生成長度',
        duration: 5000,
      }));
    }, 360000);
    // 不要在生成過程中清空選項，讓用戶可以看到之前的結果
    // setGenerationOptions([]);
    
    // 創建 AbortController 用於取消請求
    abortControllerRef.current = new AbortController();
    
    // 開始進度追蹤
    dispatch(startProgress({
      title: 'AI 續寫',
      description: `正在使用 ${currentModel} 模型生成文本`,
      totalSteps: generationCount,
      completedSteps: 0,
      progress: 0
    }));
    
    // 從 store 獲取最新的進度 ID
    const state = store.getState();
    const latestProgress = state.progress.indicators[state.progress.indicators.length - 1];
    const newProgressId = latestProgress?.id || '';
    setProgressId(newProgressId);
    
    try {
      // 立即更新進度到 10%
      if (newProgressId) {
        dispatch(updateProgress({
          id: newProgressId,
          progress: 10,
          currentStep: '準備生成上下文...'
        }));
      }
      
      // 生成多個選項的參數配置
      const baseParams = {
        temperature,
        maxTokens,
        topP: 0.9,
        presencePenalty: 0,
        frequencyPenalty: 0,
        maxContextTokens: 2000,
      };
      
      // 根據生成數量創建不同的參數組合
      const paramVariations = [];
      for (let i = 0; i < generationCount; i++) {
        const tempVariation = temperature + (i - Math.floor(generationCount / 2)) * 0.1;
        paramVariations.push({
          ...baseParams,
          temperature: Math.max(0.1, Math.min(1.5, tempVariation))
        });
      }
      
      if (newProgressId) {
        dispatch(updateProgress({
          id: newProgressId,
          progress: 20,
          currentStep: `開始生成 ${generationCount} 個版本...`
        }));
      }
      
      // 串行生成多個選項，避免資料庫鎖衝突
      // TODO: 未來可以改進後端資料庫連接管理（如使用連接池），以支援並行生成
      const results: (GenerationOption | null)[] = [];
      
      for (let index = 0; index < paramVariations.length; index++) {
        const params = paramVariations[index];
        try {
          if (newProgressId) {
            const currentProgress = 20 + (index * 60 / generationCount);
            dispatch(updateProgress({
              id: newProgressId,
              progress: currentProgress,
              currentStep: `生成第 ${index + 1} 個版本...`,
              completedSteps: index
            }));
          }
          
          const startTime = Date.now();
          const result = await api.ai.generateWithContext(
            projectId, 
            chapterId, 
            currentPosition, 
            currentModel, 
            params,
            currentLanguage
          );
          const generationTime = Date.now() - startTime;
          
          const filteredText = filterThinkingTags(result);
          
          // 保存到 AI 歷史記錄
          try {
            await dispatch(createAIHistory({
              projectId,
              chapterId,
              model: currentModel,
              prompt: `在位置 ${currentPosition} 進行 AI 續寫`,
              generatedText: filteredText,
              parameters: params,
              languagePurity: undefined, // 稍後可以整合語言純度分析
              tokenCount: undefined, // 稍後可以添加 token 計數
              generationTimeMs: generationTime,
              position: currentPosition,
            })).unwrap();
          } catch (historyError) {
            console.error('保存 AI 歷史記錄失敗:', historyError);
            // 不中斷主流程
          }
          
          results.push({
            id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            text: filteredText,
            temperature: params.temperature,
            timestamp: new Date()
          });
          
          // 在每次生成之間添加小延遲，確保資料庫操作完成
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`生成第 ${index + 1} 個版本失敗:`, error);
          results.push(null);
        }
      }
      
      if (newProgressId) {
        dispatch(updateProgress({
          id: newProgressId,
          progress: 90,
          currentStep: '處理生成結果...',
          completedSteps: generationCount
        }));
      }
      
      // 過濾掉失敗的結果
      const validResults = results.filter((result): result is GenerationOption => result !== null);
      
      if (validResults.length === 0) {
        throw new Error('所有生成嘗試都失敗了');
      }
      
      // 完成進度
      dispatch(completeProgress(newProgressId));
      
      // 3秒後移除進度指示器
      setTimeout(() => {
        dispatch(removeProgress(newProgressId));
      }, 3000);
      
      // 使用 functional update 確保狀態正確更新
      setGenerationOptions(() => {
        
        // 自動滾動到結果區域
        setTimeout(() => {
          const resultsElement = document.querySelector('[data-results-container]');
          if (resultsElement) {
            resultsElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
        
        return validResults;
      });
      
      
      dispatch(addNotification({
        type: 'success',
        title: 'AI 續寫完成',
        message: `成功生成 ${validResults.length} 個版本，請選擇您喜歡的版本`,
        duration: 3000,
      }));
      
    } catch (error) {
      console.error('AI 續寫失敗:', error);
      
      // 標記進度失敗
      if (newProgressId) {
        dispatch(failProgress({
          id: newProgressId,
          error: {
            id: Date.now().toString(),
            code: 'AI_GENERATION_ERROR',
            message: error instanceof Error ? error.message : '生成文本時發生錯誤',
            severity: 'high' as ErrorSeverity,
            category: 'ai',
            timestamp: new Date(),
            stack: error instanceof Error ? error.stack : undefined
          }
        }));
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'AI 續寫失敗',
        message: error instanceof Error ? error.message : '生成文本時發生錯誤',
        duration: 5000,
      }));
    } finally {
      // 清理超時計時器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsGenerating(false);
      setProgressId(null);
      abortControllerRef.current = null;
    }
    } catch (outerError) {
      // 清理超時計時器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsGenerating(false);
      dispatch(addNotification({
        type: 'error',
        title: '發生未預期的錯誤',
        message: outerError instanceof Error ? outerError.message : '未知錯誤',
        duration: 5000,
      }));
    }
  };
  
  // 應用生成的文本
  const handleApplyOption = useCallback((option: GenerationOption) => {
    // 調用父組件的插入文本函數，再次過濾以確保安全
    onInsertText(filterThinkingTags(option.text));
    
    // 立即清除選項
    setGenerationOptions([]);
    
    // 如果有進度 ID，立即移除進度指示器
    if (progressId) {
      dispatch(removeProgress(progressId));
      setProgressId(null);
    }
    
    dispatch(addNotification({
      type: 'success',
      title: '已插入文本',
      message: `已成功插入 AI 生成的文本（溫度: ${option.temperature.toFixed(1)}）`,
      duration: 3000,
    }));
  }, [onInsertText, dispatch, progressId]);
  
  // 取消生成
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setGenerationOptions([]);
    setIsGenerating(false);
  }, []);

  // 處理從歷史記錄選擇文本
  const handleSelectFromHistory = useCallback((history: AIGenerationHistory) => {
    // 直接插入歷史記錄中的文本
    onInsertText(filterThinkingTags(history.generatedText));
    
    dispatch(addNotification({
      type: 'success',
      title: '已插入歷史記錄',
      message: `已成功插入來自 ${history.model} 的生成文本`,
      duration: 3000,
    }));
    
    // 關閉歷史記錄面板
    setShowHistory(false);
  }, [onInsertText, dispatch]);

  
  return (
    <div className="bg-cosmic-900 border-t border-cosmic-700 p-4 rounded-lg">
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gold-400">AI 續寫</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              showHistory 
                ? 'bg-gold-600 text-white' 
                : 'bg-cosmic-800 text-gold-400 hover:bg-cosmic-700'
            }`}
            title="AI 生成歷史記錄"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            歷史記錄
          </button>
        </div>
        <p className="text-sm text-gray-400">
          AI 將根據當前位置的上下文生成續寫內容
        </p>
      </div>
      
      {/* 模型選擇和基本參數設置 */}
      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">AI 模型</label>
          <select
            value={currentModel || ''}
            onChange={(e) => dispatch(setCurrentModel(e.target.value))}
            className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            disabled={isGenerating || availableModels.length === 0}
          >
            <option value="">請選擇模型...</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          {!isOllamaConnected && (
            <p className="text-xs text-red-400 mt-1">
              Ollama 服務未連接，請檢查服務是否正在運行
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">生成數量 ({generationCount})</label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={generationCount}
              onChange={(e) => setGenerationCount(parseInt(e.target.value))}
              className="w-full"
              disabled={isGenerating}
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">生成長度 ({maxTokens})</label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full"
              disabled={isGenerating}
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">創意度 ({temperature.toFixed(1)})</label>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
              disabled={isGenerating}
            />
          </div>
        </div>
      </div>
      

      {/* AI 生成進度顯示 */}
      {currentProgress && isGenerating && (
        <div className="mb-6">
          <AIGenerationProgress
            progress={currentProgress}
            generationCount={generationCount}
            currentGenerationIndex={currentProgress.completedSteps || 0}
            showDetailedStats={true}
            className="shadow-lg"
          />
        </div>
      )}

      {/* 生成按鈕 */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !currentModel || !isOllamaConnected}
          className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center min-w-[140px] ${
            isGenerating 
              ? 'bg-gold-600 text-white cursor-not-allowed animate-pulse' 
              : 'btn-primary hover:bg-gold-500 active:scale-95'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              生成中...
            </>
          ) : (
            '開始 AI 續寫'
          )}
        </button>
        
        {isGenerating && (
          <button
            onClick={handleCancel}
            className="btn-secondary ml-2 px-4 py-2 hover:bg-red-600 transition-colors"
          >
            取消
          </button>
        )}
      </div>
      
      
      {/* 生成結果 */}
      {generationOptions.length > 0 && (
        <div 
          className="mt-4 bg-cosmic-800 border border-cosmic-700 rounded-lg p-4" 
          data-results-container
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gold-400">
              🎯 生成結果 ({generationOptions.length} 個版本) 🎯
            </h4>
            <button
              onClick={() => setGenerationOptions([])}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors px-2 py-1"
              title="關閉結果"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {generationOptions.map((option, index) => (
              <div 
                key={option.id}
                className={`bg-cosmic-800 border rounded-lg p-4 transition-all duration-200 ${
                  option.selected 
                    ? 'border-green-500 bg-green-900/20' 
                    : 'border-cosmic-700 hover:border-gold-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gold-400">
                    版本 {index + 1} (溫度: {option.temperature.toFixed(1)})
                  </span>
                  {option.selected && (
                    <span className="text-xs text-green-400">✓ 已使用</span>
                  )}
                </div>
                
                <div className="mb-3 text-white text-sm leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {option.text}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(option.text)}
                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors px-2 py-1"
                  >
                    複製
                  </button>
                  
                  <button
                    onClick={() => handleApplyOption(option)}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      option.selected
                        ? 'bg-green-600 text-white cursor-not-allowed'
                        : 'bg-gold-600 hover:bg-gold-500 text-white'
                    }`}
                    disabled={option.selected}
                  >
                    {option.selected ? '已使用' : '使用此版本'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 生成歷史記錄面板 */}
      {showHistory && (
        <div className="mt-6">
          <AIHistoryPanel
            projectId={projectId}
            chapterId={chapterId}
            onSelectHistory={handleSelectFromHistory}
          />
        </div>
      )}
    </div>
  );
};

export default SimpleAIWritingPanel;