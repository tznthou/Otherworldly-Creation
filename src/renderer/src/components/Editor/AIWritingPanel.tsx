import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor, Transforms, Range } from 'slate';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel, fetchAvailableModels, checkOllamaService, fetchAIProviders, setActiveProvider, generateTextWithProvider } from '../../store/slices/aiSlice';
import { createAIHistory } from '../../store/slices/aiHistorySlice';
import { startProgress, updateProgress, completeProgress, failProgress } from '../../store/slices/errorSlice';
import { store } from '../../store/store';
import { api } from '../../api';
import { ErrorSeverity } from '../../types/error';
import AIHistoryPanel from '../AI/AIHistoryPanel';
import { analyzeWritingContext, generateSmartParams } from '../../services/aiWritingAssistant';
import { isValidModelId, getModelInfo, recommendModelForTokens } from '../../config/modelWhitelist';
import { useAppSelector as useAppSelectorTyped } from '../../hooks/redux';
// 🧠 Phase 4: 導入章節筆記分析器
import { analyzeChapterNotes } from '../../utils/chapterNotesAnalyzer';

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
    
    // 處理未閉合的標籤
    /<think[^>]*>[\s\S]*/gi,
    /<thinking[^>]*>[\s\S]*/gi,
    
    // Claude 特有的格式
    /\[thinking\][\s\S]*?\[\/thinking\]/gi,
    /\*thinking\*[\s\S]*?\*\/thinking\*/gi,
    
    // 其他常見的思考格式
    /\(thinking:[\s\S]*?\)/gi,
    /思考：[\s\S]*?(?=\n|$)/gi,
    /\*\*思考[\s\S]*?\*\*/gi,
    
    // 清理多餘的換行
    /\n\s*\n\s*\n/g
  ];
  
  let cleaned = text;
  patterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // 清理首尾空白和多餘換行
  cleaned = cleaned.trim().replace(/\n{3,}/g, '\n\n');
  
  return cleaned;
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
  // 🔥 根據模型類型自動調整生成數量（免費版 API 使用較少的數量）
  const defaultGenCount = currentModel?.includes('gemini') ? 1 : 2; // Gemini 免費版只生成 1 個
  const [generationCount, setGenerationCount] = useState(defaultGenCount);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [topP, setTopP] = useState(0.9);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerModels, setProviderModels] = useState<string[]>([]);
  const [hasChapterNotes, setHasChapterNotes] = useState(false);
  
  // 獲取當前章節以檢查筆記
  const currentChapter = useAppSelectorTyped(state => 
    state.chapters.chapters.find(ch => ch.id === chapterId)
  );
  
  // 檢查章節是否有筆記
  useEffect(() => {
    if (currentChapter && currentChapter.metadata) {
      try {
        const metadata = JSON.parse(currentChapter.metadata);
        const notes = metadata.notes?.trim() || '';
        setHasChapterNotes(notes.length > 0);
        if (notes.length > 0) {
          console.log('✅ 檢測到章節筆記，長度:', notes.length);
        }
      } catch (_e) {
        console.warn('無法解析章節 metadata');
        setHasChapterNotes(false);
      }
    } else {
      setHasChapterNotes(false);
    }
  }, [currentChapter]);
  
  // 🔥 當模型改變時，自動調整生成數量
  useEffect(() => {
    if (currentModel?.includes('gemini')) {
      setGenerationCount(1); // Gemini 免費版只生成 1 個
      dispatch(addNotification({
        type: 'info',
        title: '💡 Gemini 免費版優化',
        message: '已自動調整為生成 1 個版本，降低 API 配額消耗。建議使用本地 Ollama 模型以獲得無限制體驗！',
        duration: 8000, // 延長顯示時間
      }));
    } else if (currentModel) {
      setGenerationCount(2); // 其他模型生成 2 個
    }
  }, [currentModel, dispatch]);
  
  // 載入 AI 提供商列表
  useEffect(() => {
    const loadProviders = async () => {
      try {
        console.log('[AIWritingPanel] 載入 AI 提供商...');
        await dispatch(fetchAIProviders());
        
        // 🔥 修復：只在初始化時自動設置提供者，避免覆蓋用戶的「重新選擇」操作
        if (currentProviderId && selectedProviderId === null) {
          // 使用當前已設定的提供者
          setSelectedProviderId(currentProviderId);
          console.log('[AIWritingPanel] 使用當前提供者:', currentProviderId);
        } else if (autoUseDefault && defaultProviderId && !currentProviderId && selectedProviderId === null) {
          // 如果沒有當前提供者但有預設提供者，使用預設
          setSelectedProviderId(defaultProviderId);
          console.log('[AIWritingPanel] 使用預設提供者:', defaultProviderId);
        }
      } catch (error) {
        console.error('[AIWritingPanel] 載入提供商失敗:', error);
      }
    };
    loadProviders();
  }, [dispatch, currentProviderId, defaultProviderId, autoUseDefault, selectedProviderId]); // 添加 selectedProviderId 依賴

  // 當選擇提供商時，載入該提供商的模型
  useEffect(() => {
    const loadProviderModels = async () => {
      if (selectedProviderId) {
        try {
          console.log('[AIWritingPanel] 載入提供商模型:', selectedProviderId);
          
          // 🔥 關鍵修復：如果選擇的提供者就是當前提供者，重新載入模型列表確保UI正確
          if (selectedProviderId === currentProviderId && currentModel) {
            console.log('[AIWritingPanel] 提供者已是當前設定，但仍需載入模型列表以確保UI正確');
            // 即使是相同提供者，也要重新載入模型列表確保UI顯示正確
          }
          
          // 保存當前模型，防止被 setActiveProvider 覆蓋
          const originalCurrentModel = currentModel;
          console.log('[AIWritingPanel] 保存當前模型:', originalCurrentModel);
          
          const result = await dispatch(setActiveProvider(selectedProviderId)).unwrap();
          console.log('[AIWritingPanel] setActiveProvider 結果:', result);
          
          if (result.models && result.models.length > 0) {
            console.log('[AIWritingPanel] 設定提供商模型列表:', result.models);
            setProviderModels(result.models);
            
            // 智能模型選擇：保持原本設定的模型
            const modelList = result.models as string[]; // 明確類型轉換
            
            // 🔧 修復：只在原模型仍然可用時恢復，其他情況讓用戶手動選擇
            if (originalCurrentModel && modelList.includes(originalCurrentModel)) {
              console.log('[AIWritingPanel] 恢復原本設定的模型:', originalCurrentModel);
              dispatch(setCurrentModel(originalCurrentModel));
            } else {
              // 🎯 關鍵修復：不自動選擇模型，讓用戶手動選擇
              console.log('[AIWritingPanel] 清空模型選擇，讓用戶手動選擇');
              dispatch(setCurrentModel(null));
            }
          } else {
            console.warn('[AIWritingPanel] 提供商沒有可用模型或模型列表為空:', result);
            setProviderModels([]);
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
    }
    loadProviderModels();
  }, [selectedProviderId, dispatch, currentModel, availableModels.length, currentProviderId]);

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

    // 🔥 新增：驗證模型 ID 是否有效
    const currentProvider = providers.find(p => p.id === currentProviderId || p.id === selectedProviderId);
    if (currentProvider && !isValidModelId(currentProvider.provider_type, currentModel)) {
      console.error('❌ 無效的模型 ID:', { 
        provider: currentProvider.provider_type, 
        model: currentModel,
        isValid: false
      });
      
      // 嘗試推薦替代模型
      const recommendedModel = recommendModelForTokens(currentProvider.provider_type, maxTokens);
      const message = recommendedModel 
        ? `模型 "${currentModel}" 無效。建議使用 "${recommendedModel.name}"`
        : `模型 "${currentModel}" 無效。請在 AI 設定中選擇有效的模型`;
      
      dispatch(addNotification({
        type: 'error',
        title: '模型 ID 無效',
        message,
        duration: 5000,
      }));
      
      // 如果有推薦模型，自動設置
      if (recommendedModel) {
        console.log('🔄 自動切換到推薦模型:', recommendedModel);
        dispatch(setCurrentModel(recommendedModel.id));
      }
      return;
    }

    // 顯示模型資訊（如果可用）
    if (currentProvider) {
      const modelInfo = getModelInfo(currentProvider.provider_type, currentModel);
      if (modelInfo) {
        console.log('✅ 使用有效模型:', {
          provider: currentProvider.provider_type,
          model: modelInfo.name,
          maxTokens: modelInfo.maxTokens,
          contextWindow: modelInfo.contextWindow
        });
      }
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
      
      // 🧠 Phase 4: 智慧續寫策略系統
      console.log('🧠 開始智慧續寫策略分析...');
      let chapterNotesAnalysis = null;
      
      // 分析章節筆記以制定寫作策略
      if (hasChapterNotes && currentChapter?.metadata) {
        console.log('📝 分析章節筆記以制定寫作策略...');
        
        dispatch(updateProgress({
          id: newProgressId,
          progress: 12,
          currentStep: '分析章節筆記制定寫作策略...'
        }));
        
        try {
          const metadata = JSON.parse(currentChapter.metadata);
          const notes = metadata.notes?.trim() || '';
          if (notes) {
            chapterNotesAnalysis = analyzeChapterNotes(notes);
          }
        } catch (_e) {
          console.warn('無法解析章節 metadata 進行筆記分析');
        }
        
        console.log('📊 章節筆記分析結果:', chapterNotesAnalysis);
        
        // 根據筆記分析調整生成參數
        if (chapterNotesAnalysis.style.dialogue > 0.6) {
          console.log('💬 檢測到對話重點，調整參數支持對話生成');
          setTemperature(prev => Math.min(1.0, prev + 0.1)); // 稍微增加創意性
        }
        
        if (chapterNotesAnalysis.style.action > 0.6) {
          console.log('⚡ 檢測到動作場景，調整參數支持動作描述');
          setMaxTokens(prev => Math.min(800, prev + 100)); // 增加輸出長度
        }
        
        if (chapterNotesAnalysis.style.emotion > 0.7) {
          console.log('💝 檢測到情感重點，調整參數支持情感表達');
          setPresencePenalty(prev => Math.max(0, prev - 0.2)); // 降低重複懲罰
        }
      }
      
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
          // 🔥 更新：根據官方文檔調整各模型的 token 限制
          let adjustedMaxTokens = maxTokens;
          if (currentModel && currentModel.includes('gemini-2.5-flash')) {
            // Gemini 2.5 Flash 提高到實用範圍
            adjustedMaxTokens = Math.min(650, maxTokens + (i * 50)); // 🚀 基礎 650，符合 Gemini 2.5 Flash 官方規範
            console.log(`🎯 Gemini 2.5 Flash 優化參數，使用 ${adjustedMaxTokens} tokens`);
          } else if (currentModel && currentModel.includes('gemini-2.5-pro')) {
            // Gemini 2.5 Pro 提高到更高範圍
            adjustedMaxTokens = Math.min(1000, maxTokens + (i * 80)); // 🚀 基礎 1000，符合 Gemini 2.5 Pro 官方規範
            console.log(`🧠 Gemini 2.5 Pro 優化參數，使用 ${adjustedMaxTokens} tokens`);
          } else {
            adjustedMaxTokens = maxTokens + (i * 30); // 其他模型保持原有變化
          }
          
          // 🧠 Phase 4: 根據章節筆記分析調整參數
          if (chapterNotesAnalysis) {
            // 基於筆記分析微調參數
            const styleModifier = chapterNotesAnalysis.style;
            const toneModifier = chapterNotesAnalysis.tone;
            
            // 根據寫作風格調整溫度
            let tempAdjustment = 0;
            if (styleModifier.dialogue > 0.6) tempAdjustment += 0.1; // 對話需要更多變化
            if (styleModifier.action > 0.6) tempAdjustment += 0.05; // 動作場景需要適度變化
            if (styleModifier.emotion > 0.7) tempAdjustment += 0.15; // 情感場景需要更多創意
            
            // 根據情感基調調整參數
            if (toneModifier.dramatic > 0.6) {
              adjustedMaxTokens = Math.min(adjustedMaxTokens + 100, 900); // 戲劇性場景需要更多描述
            }
            
            console.log(`📝 章節筆記調整: 溫度+${tempAdjustment}, Token+${adjustedMaxTokens - maxTokens}`);
          }
          
          const variation = {
            temperature: Math.max(0.2, Math.min(1.2, temperature + (i - 1) * 0.2)), // 更大變化
            maxTokens: adjustedMaxTokens, // 🔥 使用調整後的值
            topP: Math.max(0.5, Math.min(1.0, topP + (i - 1) * 0.2)),
            presencePenalty: Math.max(0, Math.min(1.5, presencePenalty + (i * 0.3))),
            frequencyPenalty: Math.max(0, Math.min(1.5, frequencyPenalty + (i * 0.25))),
            maxContextTokens: 2000,
            // 🧠 Phase 4: 添加章節筆記提示
            chapterNotes: chapterNotesAnalysis
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
            
            // 為每個版本創建不同的變化 - 🔥 更新：使用更合理的 token 限制
            let adjustedMaxTokens = smartParams.maxTokens;
            if (currentModel && currentModel.includes('gemini-2.5-flash')) {
              // Gemini 2.5 Flash 現在可以使用更高的 token 數
              adjustedMaxTokens = smartParams.maxTokens + (i * 30); // 允許適度變化
            } else if (currentModel && currentModel.includes('gemini-2.5-pro')) {
              // Gemini 2.5 Pro 可以有更大的變化範圍
              adjustedMaxTokens = smartParams.maxTokens + (i * 50); // 更大的變化幅度
            } else {
              // 其他模型保持原有的變化策略
              adjustedMaxTokens = smartParams.maxTokens + (i * 20);
            }
            
            // 🧠 Phase 4: 結合章節筆記分析
            if (chapterNotesAnalysis) {
              // 根據筆記情感調整參數
              const emotionLevel = chapterNotesAnalysis.tone.emotional;
              if (emotionLevel > 0.7) {
                adjustedMaxTokens += 50; // 情感豐富的場景需要更多描述
              }
              
              // 根據情節重要性調整創意度
              const plotImportance = chapterNotesAnalysis.content.plot;
              if (plotImportance > 0.8) {
                smartParams.temperature = Math.min(1.0, smartParams.temperature + 0.1); // 重要情節需要更多創意
              }
            }
            
            const variation = {
              temperature: smartParams.temperature + (i - 1) * 0.15, // 更大的變化範圍
              maxTokens: adjustedMaxTokens, // 使用調整後的 token 數量
              topP: Math.max(0.3, Math.min(1.0, topP + (i - 1) * 0.15)), // topP變化
              presencePenalty: Math.max(0, Math.min(2.0, presencePenalty + (i * 0.2))), // 存在懲罰變化
              frequencyPenalty: Math.max(0, Math.min(2.0, frequencyPenalty + (i * 0.15))), // 頻率懲罰變化
              maxContextTokens: 2000,
              style: smartParams.style, // 使用NLP分析的風格
              contextHints: smartParams.contextHints, // 使用NLP提取的上下文提示
              // 🧠 Phase 4: 添加章節筆記分析結果
              chapterNotes: chapterNotesAnalysis
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
      
      // 🔥 改為串行生成以避免觸發 API 頻率限制（特別是免費版）
      const results: (GenerationOption | null)[] = [];
      
      // 檢測是否使用 Gemini 免費版（需要更謹慎的請求策略）
      const isGeminiFreeAPI = currentModel?.includes('gemini');
      const delayBetweenRequests = isGeminiFreeAPI ? 3000 : 500; // Gemini 免費版延遲 3 秒
      
      for (let index = 0; index < paramVariations.length; index++) {
        const params = paramVariations[index];
        
        // 如果不是第一個請求，添加延遲
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
        try {
          dispatch(updateProgress({
            id: newProgressId,
            progress: 20 + (index * 60 / generationCount),
            currentStep: `生成第 ${index + 1} 個版本...`,
            completedSteps: index
          }));
          
          const startTime = Date.now();
          const position = selection?.anchor.offset || 0;
          
          // 🧠 Phase 4: 構建智能系統提示
          let systemPrompt = '你是一個專業的小說續寫助手。請直接輸出繁體中文的故事內容，不要包含任何英文說明、思考過程或指導語句。只輸出純粹的故事續寫內容。';
          
          // 根據章節筆記分析添加特定指導
          if (chapterNotesAnalysis) {
            const { style, tone, content } = chapterNotesAnalysis;
            
            let styleGuidance = '';
            if (style.dialogue > 0.6) {
              styleGuidance += '注重角色對話的自然性和個性表現。';
            }
            if (style.action > 0.6) {
              styleGuidance += '描述動作場景時要生動有力，節奏明快。';
            }
            if (style.emotion > 0.7) {
              styleGuidance += '深入刻畫角色內心情感和心理變化。';
            }
            
            let toneGuidance = '';
            if (tone.dramatic > 0.6) {
              toneGuidance += '營造戲劇張力，突出情節轉折。';
            }
            if (tone.romantic > 0.6) {
              toneGuidance += '注重浪漫氛圍的營造和情感細節。';
            }
            if (tone.humorous > 0.5) {
              toneGuidance += '適當加入幽默元素，保持輕鬆愉快的氣氛。';
            }
            
            if (styleGuidance || toneGuidance) {
              systemPrompt += `\n\n根據當前章節筆記分析，請注意：${styleGuidance}${toneGuidance}`;
            }
            
            // 添加內容焦點提示
            if (content.plot > 0.7) {
              systemPrompt += '重點推進主要情節發展。';
            }
            if (content.character > 0.7) {
              systemPrompt += '著重角色發展和性格展現。';
            }
          }
          
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
              systemPrompt // 🧠 Phase 4: 使用智能系統提示
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
          
          results.push({
            id: `${Date.now()}-${index}`,
            text: filteredText,
            temperature: params.temperature,
            timestamp: new Date()
          });
        } catch (error) {
          console.error(`生成第 ${index + 1} 個版本失敗:`, error);
          
          // 🔥 智能檢測配額錯誤並提供詳細建議
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('429') || errorMessage.includes('quota') || 
              errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('免費版') ||
              errorMessage.includes('配額已達上限') || errorMessage.includes('Too Many Requests')) {
            console.warn('檢測到 API 配額限制，停止後續生成');
            
            // 檢查是否有詳細的錯誤信息（來自我們優化的後端）
            const hasDetailedInfo = errorMessage.includes('建議等待時間') || errorMessage.includes('解決方案');
            
            let notificationMessage;
            if (hasDetailedInfo) {
              // 使用後端提供的詳細錯誤信息
              notificationMessage = errorMessage;
            } else {
              // 提供通用的增強建議
              notificationMessage = `🚫 API 配額已達上限\n\n🔧 建議解決方案：\n• 等待幾分鐘後再試（免費配額通常每分鐘重置）\n• 使用付費版 OpenRouter (google/gemini-2.5-flash)\n• 切換到本地 Ollama 模型\n• 或嘗試其他 AI 提供者`;
            }
            
            dispatch(addNotification({
              type: 'warning',
              title: '⚠️ API 配額限制',
              message: notificationMessage,
              duration: 15000, // 延長顯示時間讓用戶閱讀建議
            }));
            break; // 停止後續請求
          }
          
          results.push(null);
        }
      }
      
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
      
      // 🧠 Phase 4: 根據章節筆記提供智能建議
      let successMessage = `成功生成 ${validResults.length} 個版本，請選擇您喜歡的版本`;
      if (chapterNotesAnalysis) {
        const dominantStyle = Object.entries(chapterNotesAnalysis.style)
          .sort(([,a], [,b]) => b - a)[0][0];
        successMessage += `（已根據${dominantStyle}風格優化）`;
      }
      
      dispatch(addNotification({
        type: 'success',
        title: 'AI 續寫完成',
        message: successMessage,
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
  }, [generationOptions, currentModel, editor, projectId, chapterId, maxTokens, topP, presencePenalty, frequencyPenalty, dispatch, selectedProviderId]);

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
        
        {/* 🔥 新增：章節筆記狀態指示器 */}
        {hasChapterNotes && (
          <div className="flex items-center text-xs text-green-400 bg-green-900/20 border border-green-500/30 rounded-md px-2 py-1 mt-2">
            <span className="mr-1">📝</span>
            <span>已包含章節筆記 - AI 將參考您的創作筆記進行續寫</span>
          </div>
        )}
      </div>
      
      {/* 模型選擇和基本參數設置 */}
      <div className="space-y-4 mb-4">
        {/* 簡化的AI提供者顯示 */}
        {selectedProviderId ? (
          // 已選擇提供者：顯示當前使用的提供者
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
                  // 🔥 修復：切換到手動選擇模式，同時清空模型選擇
                  console.log('[AIWritingPanel] 用戶點擊重新選擇，清空提供者和模型選擇');
                  setSelectedProviderId(null);
                  setProviderModels([]); // 清空模型列表
                  dispatch(setCurrentModel(null)); // 清空當前模型選擇
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                title="重新選擇提供者"
              >
                重新選擇
              </button>
            </div>
          </div>
        ) : (
          // 手動選擇模式：顯示完整選擇器
          <>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                AI 提供商
                {currentProviderId && (
                  <button
                    onClick={() => {
                      setSelectedProviderId(currentProviderId);
                    }}
                    className="ml-2 text-xs text-gold-400 hover:text-gold-300"
                  >
                    (使用當前設定)
                  </button>
                )}
              </label>
              <select
                value={selectedProviderId || ''}
                onChange={(e) => {
                  const providerId = e.target.value;
                  console.log('[AIWritingPanel] 用戶選擇提供商:', providerId);
                  setSelectedProviderId(providerId);
                  dispatch(setCurrentModel(null)); // 重置模型選擇
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