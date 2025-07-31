import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel, fetchAvailableModels } from '../../store/slices/aiSlice';
import { api } from '../../api';

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

interface GenerationProgress {
  current: number;
  total: number;
  stage: 'preparing' | 'generating' | 'processing' | 'complete';
  message: string;
}

const SimpleAIWritingPanel: React.FC<SimpleAIWritingPanelProps> = ({ 
  projectId, 
  chapterId, 
  currentPosition,
  onInsertText 
}) => {
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 從 Redux store 獲取 AI 相關狀態
  const { currentModel, availableModels, isOllamaConnected } = useAppSelector(state => state.ai);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOption[]>([]);
  const [progress, setProgress] = useState<GenerationProgress>({
    current: 0,
    total: 100,
    stage: 'preparing',
    message: '準備中...'
  });
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
  
  // 更新進度的輔助函數
  const updateProgress = useCallback((stage: GenerationProgress['stage'], current: number, message: string) => {
    setProgress({
      current,
      total: 100,
      stage,
      message
    });
  }, []);

  // 生成文本
  const handleGenerate = async () => {
    if (!currentModel) {
      dispatch(addNotification({
        type: 'warning',
        title: '未選擇模型',
        message: '請先選擇一個 AI 模型',
        duration: 3000,
      }));
      return;
    }
    
    console.log('開始 AI 生成 - 專案ID:', projectId, '章節ID:', chapterId, '位置:', currentPosition);
    
    setIsGenerating(true);
    setGenerationOptions([]);
    
    // 創建 AbortController 用於取消請求
    abortControllerRef.current = new AbortController();
    
    try {
      updateProgress('preparing', 10, '準備生成上下文...');
      
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
      
      updateProgress('generating', 20, `開始生成 ${generationCount} 個版本...`);
      
      // 並行生成多個選項
      const generationPromises = paramVariations.map(async (params, index) => {
        try {
          updateProgress('generating', 20 + (index * 60 / generationCount), `生成第 ${index + 1} 個版本...`);
          
          console.log('調用 API - 參數:', { projectId, chapterId, currentPosition, currentModel, params });
          
          const result = await api.ai.generateWithContext(
            projectId, 
            chapterId, 
            currentPosition, 
            currentModel, 
            params
          );
          
          console.log('API 回應結果:', result);
          
          return {
            id: `${Date.now()}-${index}`,
            text: result,
            temperature: params.temperature,
            timestamp: new Date()
          };
        } catch (error) {
          console.error(`生成第 ${index + 1} 個版本失敗:`, error);
          return null;
        }
      });
      
      // 等待所有生成完成
      const results = await Promise.all(generationPromises);
      
      updateProgress('processing', 90, '處理生成結果...');
      
      // 過濾掉失敗的結果
      const validResults = results.filter((result): result is GenerationOption => result !== null);
      
      if (validResults.length === 0) {
        throw new Error('所有生成嘗試都失敗了');
      }
      
      updateProgress('complete', 100, `成功生成 ${validResults.length} 個版本`);
      setGenerationOptions(validResults);
      
      dispatch(addNotification({
        type: 'success',
        title: 'AI 續寫完成',
        message: `成功生成 ${validResults.length} 個版本，請選擇您喜歡的版本`,
        duration: 3000,
      }));
      
    } catch (error) {
      console.error('AI 續寫失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'AI 續寫失敗',
        message: error instanceof Error ? error.message : '生成文本時發生錯誤',
        duration: 5000,
      }));
      updateProgress('preparing', 0, '生成失敗');
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };
  
  // 應用生成的文本
  const handleApplyOption = useCallback((option: GenerationOption) => {
    // 調用父組件的插入文本函數
    onInsertText(option.text);
    
    // 標記選項為已選擇
    setGenerationOptions(prev => 
      prev.map(opt => ({
        ...opt,
        selected: opt.id === option.id
      }))
    );
    
    dispatch(addNotification({
      type: 'success',
      title: '已插入文本',
      message: `已成功插入 AI 生成的文本（溫度: ${option.temperature.toFixed(1)}）`,
      duration: 3000,
    }));
    
    // 3秒後清除選項
    setTimeout(() => {
      setGenerationOptions([]);
    }, 3000);
  }, [onInsertText, dispatch]);
  
  // 取消生成
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setGenerationOptions([]);
    setIsGenerating(false);
    updateProgress('preparing', 0, '已取消');
  }, [updateProgress]);

  return (
    <div className="relative bg-cosmic-900 border-t border-cosmic-700 p-4 rounded-lg">
      {/* 生成中的覆蓋層 */}
      {isGenerating && (
        <div className="absolute inset-0 bg-cosmic-900/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-8 w-8 text-gold-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-lg font-medium text-gold-400">AI 正在創作中...</span>
            </div>
            <div className="text-sm text-gray-300 max-w-md">
              {progress.message}
            </div>
            <div className="w-48 mx-auto">
              <div className="h-2 bg-cosmic-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-500 animate-pulse"
                  style={{ width: `${progress.current}%` }}
                ></div>
              </div>
              <div className="text-xs text-gold-400 mt-1 text-center">{progress.current}%</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gold-400 mb-2">AI 續寫</h3>
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
      
      {/* 進度指示器 */}
      {isGenerating && (
        <div className="mb-4 p-4 bg-cosmic-800 rounded-lg border border-gold-500/30 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-200">{progress.message}</span>
            </div>
            <span className="text-sm font-bold text-gold-400">{progress.current}%</span>
          </div>
          
          <div className="relative h-3 bg-cosmic-900 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-700 ease-out relative ${
                progress.stage === 'complete' ? 'bg-gradient-to-r from-green-500 to-green-400' : 
                progress.stage === 'generating' ? 'bg-gradient-to-r from-gold-600 to-gold-400' : 
                'bg-gradient-to-r from-blue-600 to-blue-400'
              }`}
              style={{ width: `${progress.current}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              {progress.current > 0 && (
                <div className="absolute right-0 top-0 w-4 h-full bg-white/30 blur-sm animate-pulse"></div>
              )}
            </div>
          </div>
          
          {/* 階段指示器 */}
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span className={progress.stage === 'preparing' ? 'text-blue-400 font-medium' : ''}>準備中</span>
            <span className={progress.stage === 'generating' ? 'text-gold-400 font-medium' : ''}>生成中</span>
            <span className={progress.stage === 'processing' ? 'text-purple-400 font-medium' : ''}>處理中</span>
            <span className={progress.stage === 'complete' ? 'text-green-400 font-medium' : ''}>完成</span>
          </div>
        </div>
      )}
      
      {/* 生成結果 */}
      {generationOptions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gold-400 mb-3">
            生成結果 ({generationOptions.length} 個版本)
          </h4>
          
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
    </div>
  );
};

export default SimpleAIWritingPanel;