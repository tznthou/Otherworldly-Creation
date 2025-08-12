import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor, Transforms, Range } from 'slate';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel, fetchAvailableModels, checkOllamaService, fetchAIProviders, setActiveProvider, generateTextWithProvider, toggleAutoUseDefault } from '../../store/slices/aiSlice';
import { createAIHistory } from '../../store/slices/aiHistorySlice';
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

const AIWritingPanel: React.FC<AIWritingPanelProps> = ({ projectId, chapterId, editor }) => {
  const dispatch = useAppDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 從 Redux store 獲取 AI 相關狀態
  const { 
    currentModel, 
    availableModels, 
    isOllamaConnected,
    providers,
    currentProviderId,
    defaultProviderId,    // 新增：預設提供者
    autoUseDefault       // 新增：是否自動使用預設
  } = useAppSelector(state => state.ai);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOption[]>([]);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [showAIHistory, setShowAIHistory] = useState(false);
  
  // 從 Redux store 獲取進度狀態
  const progressState = useAppSelector(state => state.progress);
  const currentProgress = progressId ? progressState.indicators.find(p => p.id === progressId) : null;
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(600); // 🔥 增加到 600 tokens，適合中文小說段落
  const [generationCount, setGenerationCount] = useState(3);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [topP, setTopP] = useState(0.9);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerModels, setProviderModels] = useState<string[]>([]);
  
  // 載入 AI 提供商列表
  useEffect(() => {
    const loadProviders = async () => {
      try {
        console.log('[AIWritingPanel] 載入 AI 提供商...');
        await dispatch(fetchAIProviders());
        
        // 智能選擇提供者
        if (autoUseDefault && defaultProviderId) {
          // 如果啟用自動使用預設，使用預設提供者
          setSelectedProviderId(defaultProviderId);
        } else if (currentProviderId && !selectedProviderId) {
          // 否則使用當前提供者
          setSelectedProviderId(currentProviderId);
        }
      } catch (error) {
        console.error('[AIWritingPanel] 載入提供商失敗:', error);
      }
    };
    loadProviders();
  }, [dispatch, currentProviderId, defaultProviderId, autoUseDefault]);

  // 當選擇提供商時，載入該提供商的模型
  useEffect(() => {
    const loadProviderModels = async () => {
      if (selectedProviderId) {
        try {
          console.log('[AIWritingPanel] 載入提供商模型:', selectedProviderId);
          const result = await dispatch(setActiveProvider(selectedProviderId)).unwrap();
          if (result.models) {
            setProviderModels(result.models);
            // 智能模型選擇：只在真正需要時才自動選擇
            if (result.models.length > 0) {
              const modelList = result.models as string[]; // 明確類型轉換
              // 如果當前模型在新列表中，保持不變
              if (currentModel && modelList.includes(currentModel)) {
                console.log('[AIWritingPanel] 保持用戶選擇的模型:', currentModel);
                // 不做任何操作，保持用戶選擇
              } else if (!currentModel) {
                // 只在完全沒有模型時才自動選擇第一個
                console.log('[AIWritingPanel] 自動選擇第一個模型:', modelList[0]);
                dispatch(setCurrentModel(modelList[0]));
              }
            }
          }
        } catch (error) {
          console.error('[AIWritingPanel] 載入模型失敗:', error);
          setProviderModels([]);
        }
      } else {
        // 如果沒有選擇提供商，嘗試使用 Ollama（向後兼容）
        const checkOllama = async () => {
          try {
            console.log('[AIWritingPanel] 檢查 Ollama 服務狀態...');
            const result = await dispatch(checkOllamaService()).unwrap();
            console.log('[AIWritingPanel] Ollama 服務檢查結果:', result);
            
            if (result && availableModels.length === 0) {
              console.log('[AIWritingPanel] 載入可用模型...');
              await dispatch(fetchAvailableModels());
            }
          } catch (error) {
            console.error('[AIWritingPanel] Ollama 服務檢查失敗:', error);
          }
        };
        checkOllama();
      }
    };
    loadProviderModels();
  }, [selectedProviderId, dispatch, currentModel, availableModels.length]);

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
      
      // 使用改進的傳統參數生成
      const generateTraditionalParams = () => {
        const variations = [];
        for (let i = 0; i < generationCount; i++) {
          // 🔥 針對 Gemini 2.5 Flash 的特殊處理
          let adjustedMaxTokens = maxTokens;
          if (currentModel && currentModel.includes('gemini-2.5-flash')) {
            // 對於 Gemini 2.5 Flash，使用固定的極保守值，不增加變化
            adjustedMaxTokens = Math.min(80, maxTokens); // 極保守：最大80 tokens
            console.log(`🔥 Gemini 2.5 Flash 傳統參數模式，固定使用 ${adjustedMaxTokens} tokens`);
          } else if (currentModel && currentModel.includes('gemini-2.5-pro')) {
            // 對於 Gemini 2.5 Pro，使用中等保守值，不增加變化
            adjustedMaxTokens = Math.min(250, maxTokens); // 中等保守：最大250 tokens
            console.log(`🧠 Gemini 2.5 Pro 傳統參數模式，固定使用 ${adjustedMaxTokens} tokens`);
          } else {
            adjustedMaxTokens = maxTokens + (i * 30); // 其他模型可以增加變化
          }
          
          const variation = {
            temperature: Math.max(0.2, Math.min(1.2, temperature + (i - 1) * 0.2)), // 更大變化
            maxTokens: adjustedMaxTokens, // 🔥 使用調整後的值
            topP: Math.max(0.5, Math.min(1.0, topP + (i - 1) * 0.2)),
            presencePenalty: Math.max(0, Math.min(1.5, presencePenalty + (i * 0.3))),
            frequencyPenalty: Math.max(0, Math.min(1.5, frequencyPenalty + (i * 0.25))),
            maxContextTokens: 2000
          };
          variations.push(variation);
        }
        return variations;
      };
      
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
            const smartParams = generateSmartParams(context, temperature, maxTokens, currentModel || '');
            
            // 為每個版本創建不同的變化 - 🔥 針對 Gemini 2.5 Flash 的特殊處理
            let adjustedMaxTokens = smartParams.maxTokens;
            if (currentModel && currentModel.includes('gemini-2.5-flash')) {
              // 對於 Gemini 2.5 Flash，不增加 token 變化，保持在安全範圍
              adjustedMaxTokens = smartParams.maxTokens; // 使用智能參數的保守值，不再增加
            } else if (currentModel && currentModel.includes('gemini-2.5-pro')) {
              // 對於 Gemini 2.5 Pro，允許輕微變化但保持謹慎
              adjustedMaxTokens = smartParams.maxTokens + (i * 10); // 較小的變化幅度
            } else {
              // 其他模型可以有較大 token 變化
              adjustedMaxTokens = smartParams.maxTokens + (i * 20);
            }
            
            const variation = {
              temperature: smartParams.temperature + (i - 1) * 0.15, // 更大的變化範圍
              maxTokens: adjustedMaxTokens, // 使用調整後的 token 數量
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
          
          const startTime = Date.now();
          const position = selection?.anchor.offset || 0;
          // 使用多提供商 API 生成文本
          let result: string;
          if (selectedProviderId) {
            // 使用選擇的提供商
            const genResult = await dispatch(generateTextWithProvider({
              prompt: `續寫位置: ${position}`,
              providerId: selectedProviderId,
              model: currentModel,
              projectId: projectId,
              chapterId: chapterId,
              position: position,  // 🔥 新增：傳遞位置參數給後端
              aiParams: {
                temperature: params.temperature,
                maxTokens: params.maxTokens,
                topP: params.topP,
                presencePenalty: params.presencePenalty,
                frequencyPenalty: params.frequencyPenalty,
              },
              systemPrompt: '你是一個專業的小說續寫助手。請直接輸出繁體中文的故事內容，不要包含任何英文說明、思考過程或指導語句。只輸出純粹的故事續寫內容。'
            })).unwrap();
            result = genResult.result;
          } else {
            // 使用舊版 Ollama API（向後兼容）
            result = await api.ai.generateWithContext(
              projectId, 
              chapterId, 
              position, 
              currentModel, 
              params
            );
          }
          const generationTime = Date.now() - startTime;
          
          // 過濾思考標籤
          const filteredText = filterThinkingTags(result);
          
          // 保存到 AI 歷史記錄
          try {
            await dispatch(createAIHistory({
              projectId,
              chapterId,
              model: currentModel,
              prompt: `在位置 ${position} 進行 AI 續寫`,
              generatedText: filteredText,
              parameters: params,
              languagePurity: undefined, // 稍後可以整合語言純度分析
              tokenCount: undefined, // 稍後可以添加 token 計數
              generationTimeMs: generationTime,
              position: position,
            })).unwrap();
          } catch (historyError) {
            console.error('保存 AI 歷史記錄失敗:', historyError);
            // 不中斷主流程
          }
          
          return {
            id: `${Date.now()}-${index}`,
            text: filteredText,
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
        // 在當前位置插入文本（再次過濾確保安全）
        Transforms.insertText(editor, filterThinkingTags(option.text));
        
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

      const startTime = Date.now();
      // 使用多提供商 API 重新生成文本
      let result: string;
      if (selectedProviderId) {
        // 使用選擇的提供商
        const genResult = await dispatch(generateTextWithProvider({
          prompt: `續寫位置: ${selection.anchor.offset}`,
          providerId: selectedProviderId,
          model: currentModel,
          projectId: projectId,
          chapterId: chapterId,
          position: selection.anchor.offset,  // 🔥 新增：傳遞位置參數給後端
          aiParams: {
            temperature: params.temperature,
            maxTokens: params.maxTokens,
            topP: params.topP,
            presencePenalty: params.presencePenalty,
            frequencyPenalty: params.frequencyPenalty,
          },
          systemPrompt: '你是一個專業的小說續寫助手。請直接輸出繁體中文的故事內容，不要包含任何英文說明、思考過程或指導語句。只輸出純粹的故事續寫內容。'
        })).unwrap();
        result = genResult.result;
      } else {
        // 使用舊版 Ollama API（向後兼容）
        result = await api.ai.generateWithContext(
          projectId, 
          chapterId, 
          selection.anchor.offset, 
          currentModel, 
          params
        );
      }
      const generationTime = Date.now() - startTime;
      
      // 過濾思考標籤
      const filteredText = filterThinkingTags(result);
      
      // 保存到 AI 歷史記錄
      try {
        await dispatch(createAIHistory({
          projectId,
          chapterId,
          model: currentModel,
          prompt: `重新生成版本 - 在位置 ${selection.anchor.offset} 進行 AI 續寫`,
          generatedText: filteredText,
          parameters: params,
          languagePurity: undefined,
          tokenCount: undefined,
          generationTimeMs: generationTime,
          position: selection.anchor.offset,
        })).unwrap();
      } catch (historyError) {
        console.error('保存 AI 歷史記錄失敗:', historyError);
        // 不中斷主流程
      }

      // 更新該選項
      setGenerationOptions(prev => 
        prev.map(opt => 
          opt.id === optionId 
            ? { ...opt, text: filteredText, timestamp: new Date() }
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
        {/* 簡化的AI提供者顯示 */}
        {autoUseDefault && defaultProviderId ? (
          // 自動模式：顯示當前使用的提供者
          <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">使用中：</span>
                <span className="text-sm text-white font-medium">
                  {(() => {
                    const provider = providers.find(p => p.id === selectedProviderId);
                    if (!provider) return '載入中...';
                    const icon = {
                      'ollama': '🦙',
                      'openai': '🤖',
                      'gemini': '✨',
                      'claude': '🧠',
                      'openrouter': '🔄'
                    }[provider.provider_type] || '';
                    return `${icon} ${provider.name}`;
                  })()}
                </span>
                {currentModel && (
                  <span className="text-xs text-gold-400">• {currentModel}</span>
                )}
              </div>
              <button
                onClick={() => {
                  // 臨時切換到手動選擇模式
                  dispatch(toggleAutoUseDefault());
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                title="切換到手動選擇模式"
              >
                切換提供者
              </button>
            </div>
          </div>
        ) : (
          // 手動模式：顯示完整選擇器
          <>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                AI 提供商
                {!autoUseDefault && (
                  <button
                    onClick={() => dispatch(toggleAutoUseDefault())}
                    className="ml-2 text-xs text-gold-400 hover:text-gold-300"
                  >
                    (使用預設)
                  </button>
                )}
              </label>
              <select
                value={selectedProviderId || ''}
                onChange={(e) => {
                  setSelectedProviderId(e.target.value);
                  dispatch(setCurrentModel('')); // 重置模型選擇
                }}
                className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                disabled={isGenerating}
              >
                <option value="">選擇 AI 提供商...</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.provider_type === 'ollama' && '🦙 '}
                    {provider.provider_type === 'openai' && '🤖 '}
                    {provider.provider_type === 'gemini' && '✨ '}
                    {provider.provider_type === 'claude' && '🧠 '}
                    {provider.provider_type === 'openrouter' && '🔄 '}
                    {provider.name}
                    {provider.id === defaultProviderId && ' (預設)'}
                  </option>
                ))}
              </select>
            </div>

            {/* AI 模型選擇 */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">AI 模型</label>
              <select
                value={currentModel || ''}
                onChange={(e) => dispatch(setCurrentModel(e.target.value))}
                className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                disabled={isGenerating || (!selectedProviderId && availableModels.length === 0)}
              >
                <option value="">請選擇模型...</option>
                {/* 如果有選擇提供商，顯示該提供商的模型 */}
                {selectedProviderId && providerModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
                {/* 如果沒有選擇提供商，顯示 Ollama 模型（向後兼容） */}
                {!selectedProviderId && availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              {!selectedProviderId && !isOllamaConnected && (
                <p className="text-xs text-red-400 mt-1">
                  請選擇 AI 提供商或在 AI 設定中配置 Ollama 服務
                </p>
              )}
              {selectedProviderId && providerModels.length === 0 && (
                <p className="text-xs text-yellow-400 mt-1">
                  正在載入模型列表或該提供商無可用模型
                </p>
              )}
            </div>
          </>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">生成數量 ({generationCount})</label>
            <p className="text-xs text-gray-400 mb-2">同時生成多個版本供您選擇，建議設置 3-5 個</p>
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
            <p className="text-xs text-gray-400 mb-2">約 {Math.round(maxTokens * 0.7)}-{Math.round(maxTokens * 1.2)} 字（思考式模型會扣除思考部分，實際內容更短）</p>
            <input
              type="range"
              min="50"
              max="1800"
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
          <p className="text-xs text-gray-400 mb-2">控制AI的創新程度：低值產生保守穩定的文本，高值產生更有創意但可能不穩定的內容</p>
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
                <p className="text-xs text-gray-400 mb-2">限制詞彙選擇範圍：低值選擇更安全的詞彙，高值允許更多樣的詞彙選擇</p>
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
                  <p className="text-xs text-gray-400 mb-2">避免重複話題：數值越高越避免重複已出現的內容主題</p>
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
                  <p className="text-xs text-gray-400 mb-2">避免重複用詞：數值越高越避免重複使用相同的詞語</p>
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
          disabled={isGenerating || !currentModel || (!selectedProviderId && !isOllamaConnected)}
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