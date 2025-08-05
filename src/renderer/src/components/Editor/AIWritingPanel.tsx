import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor, Transforms, Range } from 'slate';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel, fetchAvailableModels } from '../../store/slices/aiSlice';
import { startProgress, updateProgress, completeProgress, failProgress } from '../../store/slices/errorSlice';
import { store } from '../../store/store';
import { api } from '../../api';
import { ErrorSeverity } from '../../types/error';
import AIHistoryPanel from '../AI/AIHistoryPanel';
import { analyzeWritingContext, generateSmartParams } from '../../services/aiWritingAssistant';

interface AIWritingPanelProps {
  projectId: string;
  chapterId: string;
  editor?: Editor; // 可選的編輯器實例
}

interface GenerationOption {
  id: string;
  text: string;
  temperature: number;
  timestamp: Date;
  selected?: boolean;
}

const AIWritingPanel: React.FC<AIWritingPanelProps> = ({ projectId, chapterId, editor }) => {
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 從 Redux store 獲取 AI 相關狀態
  const { currentModel, availableModels, isOllamaConnected } = useAppSelector(state => state.ai);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOption[]>([]);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [showAIHistory, setShowAIHistory] = useState(false);
  
  // 從 Redux store 獲取進度狀態
  const progressState = useAppSelector(state => state.progress);
  const currentProgress = progressId ? progressState.indicators.find(p => p.id === progressId) : null;
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(200);
  const [generationCount, setGenerationCount] = useState(3);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [topP, setTopP] = useState(0.9);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  
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
    console.log('🚀 handleGenerate 被調用了！');
    console.log('📊 當前狀態:', { currentModel, editor, isOllamaConnected, isGenerating });
    
    if (!currentModel) {
      dispatch(addNotification({
        type: 'warning',
        title: '未選擇模型',
        message: '請先在 AI 設定中選擇一個模型',
        duration: 3000,
      }));
      return;
    }
    
    // 檢查是否有選擇位置
    if (!editor) {
      console.log('❌ editor 實例不存在！');
      dispatch(addNotification({
        type: 'error',
        title: '編輯器未準備好',
        message: '請稍後再試',
        duration: 3000,
      }));
      return;
    }
    
    console.log('✅ editor 實例存在:', editor);
    let { selection } = editor;
    console.log('📍 selection 狀態:', selection);
    
    // 如果沒有選擇，自動設置到文檔末尾
    if (!selection) {
      console.log('🎯 沒有選擇位置，自動移到文檔末尾');
      const end = Editor.end(editor, []);
      Transforms.select(editor, end);
      selection = editor.selection;
      console.log('📍 新的 selection 狀態:', selection);
    }
    
    // 確保選擇是折疊的（游標位置）
    if (selection && !Range.isCollapsed(selection)) {
      console.log('🎯 選擇不是游標位置，折疊到末尾');
      Transforms.collapse(editor, { edge: 'end' });
      selection = editor.selection;
      console.log('📍 折疊後的 selection 狀態:', selection);
    }
    
    setIsGenerating(true);
    setGenerationOptions([]);
    
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
    
    // 等待一小段時間以確保進度已創建
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 從 store 獲取最新的進度 ID
    const progressState = store.getState().progress;
    const latestProgress = progressState.indicators[progressState.indicators.length - 1];
    const newProgressId = latestProgress?.id;
    
    if (!newProgressId) {
      console.error('無法創建進度指示器');
      return;
    }
    
    setProgressId(newProgressId);
    
    try {
      dispatch(updateProgress({
        id: newProgressId,
        progress: 10,
        currentStep: '準備生成上下文...'
      }));
      
      // 🧠 NLP 智能分析當前文本
      console.log('🧠 開始 NLP 文本分析...');
      const editorText = Editor.string(editor, []);
      console.log('📝 當前文本長度:', editorText.length);
      
      dispatch(updateProgress({
        id: newProgressId,
        progress: 15,
        currentStep: '分析寫作風格...'
      }));
      
      let paramVariations = [];
      
      if (editorText.length > 50) {
        // 有足夠文本進行NLP分析
        try {
          const context = analyzeWritingContext(editorText);
          console.log('📊 NLP 分析結果:', context);
          
          dispatch(updateProgress({
            id: newProgressId,
            progress: 18,
            currentStep: `檢測到${context.emotionalTone}風格，生成智能參數...`
          }));
          
          // 使用智能參數生成
          for (let i = 0; i < generationCount; i++) {
            const smartParams = generateSmartParams(context, temperature);
            
            // 為每個版本創建不同的變化
            const variation = {
              temperature: smartParams.temperature + (i - 1) * 0.15, // 更大的變化範圍
              maxTokens: smartParams.maxTokens + (i * 20), // 長度變化
              topP: Math.max(0.3, Math.min(1.0, topP + (i - 1) * 0.15)), // topP變化
              presencePenalty: Math.max(0, Math.min(2.0, presencePenalty + (i * 0.2))), // 存在懲罰變化
              frequencyPenalty: Math.max(0, Math.min(2.0, frequencyPenalty + (i * 0.15))), // 頻率懲罰變化
              maxContextTokens: 2000,
              style: smartParams.style, // 使用NLP分析的風格
              contextHints: smartParams.contextHints // 使用NLP提取的上下文提示
            };
            
            paramVariations.push(variation);
            console.log(`🎯 版本${i + 1}參數:`, variation);
          }
          
        } catch (error) {
          console.warn('⚠️ NLP分析失敗，使用傳統參數生成:', error);
          // 回退到改進的傳統方法
          paramVariations = generateTraditionalParams();
        }
      } else {
        // 文本太短，使用改進的傳統參數生成
        console.log('📝 文本較短，使用改進的傳統參數生成');
        paramVariations = generateTraditionalParams();
      }
      
      // 改進的傳統參數生成函數
      function generateTraditionalParams() {
        const variations = [];
        for (let i = 0; i < generationCount; i++) {
          const variation = {
            temperature: Math.max(0.2, Math.min(1.2, temperature + (i - 1) * 0.2)), // 更大變化
            maxTokens: maxTokens + (i * 30),
            topP: Math.max(0.5, Math.min(1.0, topP + (i - 1) * 0.2)),
            presencePenalty: Math.max(0, Math.min(1.5, presencePenalty + (i * 0.3))),
            frequencyPenalty: Math.max(0, Math.min(1.5, frequencyPenalty + (i * 0.25))),
            maxContextTokens: 2000
          };
          variations.push(variation);
        }
        return variations;
      }
      
      dispatch(updateProgress({
        id: newProgressId,
        progress: 20,
        currentStep: `開始生成 ${generationCount} 個版本...`
      }));
      
      // 並行生成多個選項
      const generationPromises = paramVariations.map(async (params, index) => {
        try {
          dispatch(updateProgress({
            id: newProgressId,
            progress: 20 + (index * 60 / generationCount),
            currentStep: `生成第 ${index + 1} 個版本...`,
            completedSteps: index
          }));
          
          const result = await api.ai.generateWithContext(
            projectId, 
            chapterId, 
            selection.anchor.offset, 
            currentModel, 
            params
          );
          
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
      
      dispatch(updateProgress({
        id: newProgressId,
        progress: 90,
        currentStep: '處理生成結果...',
        completedSteps: generationCount
      }));
      
      // 過濾掉失敗的結果
      const validResults = results.filter((result): result is GenerationOption => result !== null);
      
      if (validResults.length === 0) {
        throw new Error('所有生成嘗試都失敗了');
      }
      
      // 完成進度
      dispatch(completeProgress(newProgressId));
      
      setGenerationOptions(validResults);
      
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
      setIsGenerating(false);
      setProgressId(null);
      abortControllerRef.current = null;
    }
  };
  
  // 應用生成的文本
  const handleApplyOption = useCallback((option: GenerationOption) => {
    try {
      if (!editor) {
        dispatch(addNotification({
          type: 'error',
          title: '編輯器未準備好',
          message: '無法插入文本',
          duration: 3000,
        }));
        return;
      }
      
      // 獲取當前選擇位置
      const { selection } = editor;
      if (selection) {
        // 在當前位置插入文本
        Transforms.insertText(editor, option.text);
        
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
      }
    } catch (error) {
      console.error('插入文本失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '插入失敗',
        message: '無法插入生成的文本',
        duration: 3000,
      }));
    }
  }, [editor, dispatch]);
  
  // 取消生成
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setGenerationOptions([]);
    setIsGenerating(false);
    // 取消操作，暫時不更新進度
  }, []);

  // 重新生成特定選項
  const handleRegenerateOption = useCallback(async (optionId: string) => {
    const option = generationOptions.find(opt => opt.id === optionId);
    if (!option || !currentModel) return;

    try {
      if (!editor) return;
      
      const { selection } = editor;
      if (!selection) return;

      const params = {
        temperature: option.temperature,
        maxTokens,
        topP,
        presencePenalty,
        frequencyPenalty,
        maxContextTokens: 2000,
      };

      const result = await api.ai.generateWithContext(
        projectId, 
        chapterId, 
        selection.anchor.offset, 
        currentModel, 
        params
      );

      // 更新該選項
      setGenerationOptions(prev => 
        prev.map(opt => 
          opt.id === optionId 
            ? { ...opt, text: result, timestamp: new Date() }
            : opt
        )
      );

      dispatch(addNotification({
        type: 'success',
        title: '重新生成完成',
        message: '已更新該版本的內容',
        duration: 2000,
      }));

    } catch (error) {
      console.error('重新生成失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '重新生成失敗',
        message: error instanceof Error ? error.message : '重新生成時發生錯誤',
        duration: 3000,
      }));
    }
  }, [generationOptions, currentModel, editor, projectId, chapterId, maxTokens, topP, presencePenalty, frequencyPenalty, dispatch]);

  // 清除所有選項
  const handleClearOptions = useCallback(() => {
    setGenerationOptions([]);
    // 清除選項，暫時不更新進度
  }, []);
  
  return (
    <div className="bg-cosmic-900 border-t border-cosmic-700 p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gold-400">AI 續寫</h3>
          <button
            onClick={() => setShowAIHistory(!showAIHistory)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 border border-blue-500/30 rounded-md hover:border-blue-400/50"
            title="查看 AI 生成歷程"
          >
            📝 {showAIHistory ? '隱藏歷程' : '查看歷程'}
          </button>
        </div>
        <p className="text-sm text-gray-400">
          使用 AI 協助您繼續寫作。請先將游標放在您希望 AI 續寫的位置。
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
              Ollama 服務未連接，請在 AI 設定中檢查連接狀態
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
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
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>保守</span>
            <span>平衡</span>
            <span>創意</span>
          </div>
        </div>
        
        {/* 進階設定 */}
        <div>
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-sm text-gold-400 hover:text-gold-300 transition-colors"
            disabled={isGenerating}
          >
            {showAdvancedSettings ? '隱藏' : '顯示'}進階設定
          </button>
          
          {showAdvancedSettings && (
            <div className="mt-3 space-y-3 p-3 bg-cosmic-800 rounded-lg border border-cosmic-700">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Top-P ({topP.toFixed(1)})</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full"
                  disabled={isGenerating}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">存在懲罰 ({presencePenalty.toFixed(1)})</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={presencePenalty}
                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                    className="w-full"
                    disabled={isGenerating}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-1">頻率懲罰 ({frequencyPenalty.toFixed(1)})</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={frequencyPenalty}
                    onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                    className="w-full"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 生成按鈕 */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !currentModel || !isOllamaConnected}
          className="btn-primary px-6 py-2"
        >
          {isGenerating ? '生成中...' : '開始 AI 續寫'}
        </button>
        
        {isGenerating && (
          <button
            onClick={handleCancel}
            className="btn-secondary ml-2"
          >
            取消
          </button>
        )}
      </div>
      
      {/* 進度指示器 */}
      {isGenerating && currentProgress && (
        <div className="mb-4 p-3 bg-cosmic-800 rounded-lg border border-cosmic-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">{currentProgress.currentStep || currentProgress.description || currentProgress.title}</span>
            <span className="text-sm text-gold-400">{currentProgress.progress}%</span>
          </div>
          
          <div className="h-2 bg-cosmic-900 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full transition-all duration-500 ${
                currentProgress.status === 'completed' ? 'bg-green-500' : 
                currentProgress.status === 'running' ? 'bg-gold-500' : 
                'bg-blue-500'
              }`}
              style={{ width: `${currentProgress.progress}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span className={`flex items-center ${currentProgress.status === 'pending' ? 'text-blue-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full mr-1 ${currentProgress.status === 'pending' ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`}></div>
                準備
              </span>
              <span className={`flex items-center ${currentProgress.status === 'running' ? 'text-gold-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full mr-1 ${currentProgress.status === 'running' ? 'bg-gold-400 animate-pulse' : 'bg-gray-500'}`}></div>
                生成
              </span>
              <span className={`flex items-center ${currentProgress.status === 'running' && currentProgress.progress > 50 ? 'text-purple-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full mr-1 ${currentProgress.status === 'running' && currentProgress.progress > 50 ? 'bg-purple-400 animate-pulse' : 'bg-gray-500'}`}></div>
                處理
              </span>
              <span className={`flex items-center ${currentProgress.status === 'completed' ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-2 h-2 rounded-full mr-1 ${currentProgress.status === 'completed' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                完成
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 生成結果 */}
      {generationOptions.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gold-400">
              生成結果 ({generationOptions.length} 個版本)
            </h4>
            <button
              onClick={handleClearOptions}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              清除全部
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
                {/* 選項標題 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gold-400">版本 {index + 1}</span>
                    <span className="text-xs text-gray-400">
                      溫度: {option.temperature.toFixed(1)}
                    </span>
                    {option.selected && (
                      <span className="text-xs text-green-400 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        已使用
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleRegenerateOption(option.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors p-1"
                      title="重新生成此版本"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    
                    <span className="text-xs text-gray-500">
                      {option.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                {/* 生成的文本 */}
                <div className="mb-3 text-white text-sm leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {option.text}
                </div>
                
                {/* 操作按鈕 */}
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
          
          {/* 批量操作 */}
          <div className="mt-3 pt-3 border-t border-cosmic-700">
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>提示：您可以重新生成任何版本或複製文本</span>
              <button
                onClick={handleGenerate}
                className="text-gold-400 hover:text-gold-300 transition-colors"
                disabled={isGenerating}
              >
                重新生成全部
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 歷程記錄面板 */}
      {showAIHistory && (
        <div className="mt-6 border-t border-cosmic-700 pt-4">
          <AIHistoryPanel projectId={projectId} />
        </div>
      )}
    </div>
  );
};

export default AIWritingPanel;