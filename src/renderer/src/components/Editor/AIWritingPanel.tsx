import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor, Transforms, Range } from 'slate';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel, fetchAvailableModels, checkOllamaService, fetchAIProviders, generateTextWithProvider } from '../../store/slices/aiSlice';
import { api } from '../../api';
import AIHistoryPanel from '../AI/AIHistoryPanel';
import { useAppSelector as useAppSelectorTyped } from '../../hooks/redux';

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

// 簡化的進度狀態管理
interface GenerationProgress {
  isActive: boolean;
  currentStep: string;
  totalVersions: number;
  completedVersions: number;
  failedVersions: number;
  progress: number; // 0-100
  errors: string[];
}

// 📚 參數說明配置
interface ParameterConfig {
  title: string;
  description: string;
  tips: string | { low: string; medium: string; high: string };
  warning: string;
  range: string;
  safeRange: [number, number];
  optimalRange: [number, number];
}

const parameterExplanations: Record<string, ParameterConfig> = {
  generationCount: {
    title: "生成數量",
    description: "同時生成多個不同風格的版本供您選擇",
    tips: "💡 初學者建議選 1 個，想要更多選擇可選 2-3 個",
    warning: "⚠️ 數量越多等待時間越長，消耗 API 配額更多",
    range: "1-3 個",
    safeRange: [1, 3],
    optimalRange: [1, 2]
  },
  maxTokens: {
    title: "生成長度",
    description: "控制每次生成文本的長度（以字符數計算）",
    tips: "📝 短段落: 300-500 / 標準段落: 600-800 / 長段落: 800+",
    warning: "⚠️ 太長可能超出模型限制導致生成中斷，太短可能內容不完整",
    range: "300-1500 字符",
    safeRange: [300, 1200],
    optimalRange: [500, 800]
  },
  temperature: {
    title: "創意度",
    description: "控制文字的創新程度與隨機性",
    tips: {
      low: "🎯 保守穩重 (0.3-0.5)：適合正式文體、商業小說",
      medium: "⚖️ 平衡創意 (0.6-0.8)：適合一般小說創作 ✨推薦",
      high: "🌟 創意奔放 (0.9-1.2)：適合奇幻、科幻題材"
    },
    warning: "⚠️ 太高(>1.0)可能產生無意義或前後矛盾的內容，太低(<0.4)可能內容單調重複",
    range: "0.3-1.2",
    safeRange: [0.4, 1.0],
    optimalRange: [0.6, 0.8]
  },
  topP: {
    title: "多樣性控制",
    description: "控制用詞的豐富程度和表達多樣性（核採樣參數）",
    tips: "🎨 建議值: 0.8-0.9，在用詞豐富和準確性之間取得平衡",
    warning: "⚠️ 太低(<0.6)用詞單調重複，太高(>0.95)可能選擇不當詞語",
    range: "0.1-1.0",
    safeRange: [0.6, 0.95],
    optimalRange: [0.8, 0.9]
  },
  presencePenalty: {
    title: "重複懲罰",
    description: "防止內容和主題的重複出現，鼓勵談論新話題",
    tips: "🔄 輕微懲罰 (0.2-0.4)：推薦值，避免重複又保持自然表達",
    warning: "⚠️ 太高(>0.6)可能過度避免必要重複（如人名、地名、重要概念）",
    range: "0.0-1.5",
    safeRange: [0.0, 0.6],
    optimalRange: [0.2, 0.4]
  }
};

// 📊 快速預設配置
interface PresetConfig {
  name: string;
  description: string;
  emoji: string;
  values: {
    temperature: number;
    topP: number;
    presencePenalty: number;
    maxTokens: number;
    generationCount: number;
  };
}

const quickPresets: Record<string, PresetConfig> = {
  conservative: {
    name: "保守穩重",
    description: "適合正式文體、商業小說、歷史題材",
    emoji: "🎯",
    values: { temperature: 0.4, topP: 0.7, presencePenalty: 0.2, maxTokens: 600, generationCount: 1 }
  },
  balanced: {
    name: "平衡創作",
    description: "適合一般小說創作、日常題材",
    emoji: "⚖️",
    values: { temperature: 0.7, topP: 0.9, presencePenalty: 0.3, maxTokens: 650, generationCount: 2 }
  },
  creative: {
    name: "創意奔放",
    description: "適合奇幻、科幻、實驗性題材",
    emoji: "🌟",
    values: { temperature: 0.95, topP: 0.92, presencePenalty: 0.4, maxTokens: 700, generationCount: 2 }
  }
};

// 📊 參數幫助組件
const ParameterHelp: React.FC<{
  parameterKey: keyof typeof parameterExplanations;
  currentValue: number;
  className?: string;
}> = ({ parameterKey, currentValue, className = "" }) => {
  const config = parameterExplanations[parameterKey];
  
  // 根據當前值顯示對應的建議
  const getCurrentTip = () => {
    if (parameterKey === 'temperature' && typeof config.tips === 'object') {
      if (currentValue <= 0.5) return config.tips.low;
      if (currentValue <= 0.8) return config.tips.medium;
      return config.tips.high;
    }
    return typeof config.tips === 'string' ? config.tips : config.tips.medium;
  };
  
  // 警告等級檢查
  const getWarningLevel = (): 'safe' | 'warning' | 'danger' => {
    const [safeMin, safeMax] = config.safeRange;
    if (currentValue < safeMin || currentValue > safeMax) return 'danger';
    
    const [optimalMin, optimalMax] = config.optimalRange;
    if (currentValue < optimalMin || currentValue > optimalMax) return 'warning';
    
    return 'safe';
  };

  const warningLevel = getWarningLevel();
  
  return (
    <div className={`mt-1 text-xs ${className}`}>
      {/* 描述 */}
      <div className="text-gray-400 mb-1">{config.description}</div>
      
      {/* 當前建議 */}
      <div className="text-blue-300 mb-1">{getCurrentTip()}</div>
      
      {/* 警告訊息 */}
      {warningLevel !== 'safe' && (
        <div className={`flex items-start ${warningLevel === 'danger' ? 'text-red-400' : 'text-orange-400'} mt-1`}>
          <span className="mr-1 mt-0.5">⚠️</span>
          <span className="flex-1">{config.warning}</span>
        </div>
      )}
      
      {/* 範圍提示 */}
      <div className="text-gray-500 mt-1">
        建議範圍: {config.range}
      </div>
    </div>
  );
};

// 🚀 快速預設按鈕組件
const QuickPresets: React.FC<{
  onApplyPreset: (values: PresetConfig['values']) => void;
  className?: string;
}> = ({ onApplyPreset, className = "" }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="text-sm text-gray-300 mb-2 flex items-center">
        <span className="mr-2">🚀</span>
        快速預設
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(quickPresets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => onApplyPreset(preset.values)}
            className="p-2 bg-cosmic-700 hover:bg-cosmic-600 rounded-lg text-xs transition-colors border border-cosmic-600 hover:border-cosmic-500"
            title={preset.description}
          >
            <div className="text-center">
              <div className="text-base mb-1">{preset.emoji}</div>
              <div className="text-white font-medium">{preset.name}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        💡 點擊預設會自動調整所有參數到推薦值
      </div>
    </div>
  );
};

// 📈 參數風險指示器
const ParameterRiskIndicator: React.FC<{
  temperature: number;
  topP: number;
  presencePenalty: number;
  maxTokens: number;
  generationCount: number;
}> = ({ temperature, topP, presencePenalty, maxTokens, generationCount }) => {
  const risks: string[] = [];
  const warnings: string[] = [];
  
  // 檢查各項參數
  if (temperature > 1.0) risks.push("創意度過高可能導致內容不連貫");
  else if (temperature < 0.4) risks.push("創意度過低可能導致內容單調");
  else if (temperature > 0.8) warnings.push("創意度較高，注意內容一致性");
  
  if (topP > 0.95) risks.push("多樣性過高可能產生不當用詞");
  else if (topP < 0.6) warnings.push("多樣性較低，用詞可能單調");
  
  if (presencePenalty > 0.6) risks.push("重複懲罰過強可能影響正常表達");
  
  if (maxTokens > 1000) warnings.push("生成長度較長，可能增加等待時間");
  else if (maxTokens < 400) warnings.push("生成長度較短，內容可能不完整");
  
  if (generationCount > 2) warnings.push("生成數量較多，將消耗更多 API 配額");
  
  if (risks.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center text-green-400 text-sm bg-green-900/30 border border-green-700 rounded-lg p-3 mb-3">
        <span className="mr-2">✅</span>
        參數設定合理，可以開始生成
      </div>
    );
  }
  
  return (
    <div className="mb-3">
      {/* 高風險警告 */}
      {risks.length > 0 && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 mb-2">
          <div className="text-red-400 text-sm font-medium mb-2 flex items-center">
            <span className="mr-2">🚨</span>
            參數風險警告
          </div>
          <ul className="text-red-300 text-xs space-y-1">
            {risks.map((risk, index) => (
              <li key={index}>• {risk}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* 一般提醒 */}
      {warnings.length > 0 && (
        <div className="bg-orange-900/40 border border-orange-700 rounded-lg p-3">
          <div className="text-orange-400 text-sm font-medium mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            參數調整建議
          </div>
          <ul className="text-orange-300 text-xs space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

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
    providers,
    currentProviderId,
    defaultProviderId: _defaultProviderId,    // 新增：預設提供者（保留供未來使用）
    autoUseDefault: _autoUseDefault       // 新增：是否自動使用預設（保留供未來使用）
  } = useAppSelector(state => state.ai);
  
  // 🔧 恢復提供者特定的模型列表管理（必須在使用前聲明）
  const [providerModels, setProviderModels] = useState<string[]>([]);
  const [hasChapterNotes, setHasChapterNotes] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOption[]>([]);
  const [showAIHistory, setShowAIHistory] = useState(false);
  
  // 📊 進度狀態管理
  const [progress, setProgress] = useState<GenerationProgress>({
    isActive: false,
    currentStep: '',
    totalVersions: 0,
    completedVersions: 0,
    failedVersions: 0,
    progress: 0,
    errors: []
  });
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(600); // 🔥 增加到 600 tokens，適合中文小說段落
  // 🔥 根據模型類型自動調整生成數量（免費版 API 使用較少的數量）
  const defaultGenCount = currentModel?.includes('gemini') ? 1 : 2; // Gemini 免費版只生成 1 個
  const [generationCount, setGenerationCount] = useState(defaultGenCount);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [topP, setTopP] = useState(0.9);
  const [presencePenalty, setPresencePenalty] = useState(0);
  
  // 🚀 快速預設應用函數
  const handleApplyPreset = useCallback((presetValues: PresetConfig['values']) => {
    setTemperature(presetValues.temperature);
    setTopP(presetValues.topP);
    setPresencePenalty(presetValues.presencePenalty);
    setMaxTokens(presetValues.maxTokens);
    setGenerationCount(presetValues.generationCount);
    
    dispatch(addNotification({
      type: 'info',
      title: '預設已應用',
      message: '參數已調整到推薦設定',
      duration: 2000,
    }));
  }, [dispatch]);
  
  // 獲取當前提供者的模型列表（現在 providerModels 已經聲明）
  const getCurrentProviderModels = () => {
    if (!currentProviderId) return availableModels; // 回退到 Ollama 模型
    
    const provider = providers.find(p => p.id === currentProviderId);
    if (!provider) return [];
    
    switch (provider.provider_type) {
      case 'ollama':
        return availableModels;
      case 'openrouter':
      case 'openai':
      case 'gemini':
      case 'claude':
        return providerModels;
      default:
        return [];
    }
  };
  
  const currentProviderModels = getCurrentProviderModels();
  
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
      } catch (error) {
        console.error('[AIWritingPanel] 載入提供商失敗:', error);
      }
    };
    loadProviders();
  }, [dispatch]);

  // 🔧 修復：簡化 Ollama 兼容性檢查
  useEffect(() => {
    // 如果沒有當前提供者但有可用的 Ollama 模型，檢查 Ollama 服務
    if (!currentProviderId && availableModels.length === 0) {
      const checkOllama = async () => {
        try {
          console.log('[AIWritingPanel] 檢查 Ollama 服務狀態...');
          const result = await dispatch(checkOllamaService()).unwrap();
          console.log('[AIWritingPanel] Ollama 服務檢查結果:', result);
          
          if (result) {
            console.log('[AIWritingPanel] 載入可用模型...');
            await dispatch(fetchAvailableModels());
          }
        } catch (error) {
          console.error('[AIWritingPanel] Ollama 服務檢查失敗:', error);
        }
      };
      checkOllama();
    }
  }, [currentProviderId, availableModels.length, dispatch]);

  // 🔧 新增：當提供者改變時，獲取對應的模型列表
  useEffect(() => {
    const fetchProviderModels = async () => {
      if (!currentProviderId) {
        setProviderModels([]);
        return;
      }

      const provider = providers.find(p => p.id === currentProviderId);
      if (!provider) {
        setProviderModels([]);
        return;
      }

      try {
        switch (provider.provider_type) {
          case 'ollama':
            // Ollama 使用 availableModels，不需要額外獲取
            setProviderModels(availableModels);
            break;
          case 'openrouter':
          case 'openai':
          case 'gemini':
          case 'claude': {
            // 🔥 修復：動態獲取各提供者的模型列表，而非硬編碼
            console.log(`[AIWritingPanel] 動態獲取 ${provider.provider_type} 提供者的模型列表...`);
            const result = await api.aiProviders.getAvailableModels(provider.id);
            console.log(`[AIWritingPanel] ${provider.provider_type} 模型列表結果:`, result);
            
            if (result.success && result.models) {
              // 🔥 修復：處理模型對象格式，提取模型名稱
              const modelList = result.models.map((model: unknown) => {
                // 如果是字符串，直接返回
                if (typeof model === 'string') {
                  return model;
                }
                // 如果是對象，提取 id 或 name 字段
                if (typeof model === 'object' && model !== null) {
                  const modelObj = model as { id?: string; name?: string };
                  return modelObj.id || modelObj.name || String(model);
                }
                // 其他情況轉換為字符串
                return String(model);
              });
              
              setProviderModels(modelList);
              console.log(`[AIWritingPanel] 成功設置 ${modelList.length} 個模型:`, modelList.slice(0, 5)); // 只顯示前5個避免日誌過長
            } else {
              console.warn(`[AIWritingPanel] 獲取模型失敗:`, result.error);
              setProviderModels([]);
            }
            break;
          }
          default:
            setProviderModels([]);
        }
      } catch (error) {
        console.error(`[AIWritingPanel] 獲取提供者 ${provider.provider_type} 的模型列表失敗:`, error);
        // 發生錯誤時回退到空列表
        setProviderModels([]);
        
        // 顯示友好的錯誤提示
        dispatch(addNotification({
          type: 'warning',
          title: '模型列表獲取失敗',
          message: `無法獲取 ${provider.name} 的模型列表，請檢查網路連接或 API 設定`,
          duration: 5000,
        }));
      }
    };

    fetchProviderModels();
  }, [currentProviderId, providers, availableModels, dispatch]);

  // 清理效果：組件卸載時取消正在進行的請求
  useEffect(() => {
    const abortController = abortControllerRef.current;
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);
  

  // 📊 多版本生成文本 with 進度追蹤
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

    if (!editor) {
      dispatch(addNotification({
        type: 'error',
        title: '編輯器未準備好',
        message: '請稍後再試',
        duration: 3000,
      }));
      return;
    }

    let { selection } = editor;
    
    // 如果沒有選擇，自動設置到文檔末尾
    if (!selection) {
      const end = Editor.end(editor, []);
      Transforms.select(editor, end);
      selection = editor.selection;
    }
    
    // 確保選擇是折疊的（游標位置）
    if (selection && !Range.isCollapsed(selection)) {
      Transforms.collapse(editor, { edge: 'end' });
      selection = editor.selection;
    }
    
    // 🚀 初始化多版本生成狀態
    setIsGenerating(true);
    setGenerationOptions([]);
    
    // 📊 初始化進度狀態
    setProgress({
      isActive: true,
      currentStep: '準備生成...',
      totalVersions: generationCount,
      completedVersions: 0,
      failedVersions: 0,
      progress: 0,
      errors: []
    });
    
    const position = selection?.anchor.offset || 0;
    const activeProviderId = currentProviderId;
    
    if (!activeProviderId) {
      setProgress(prev => ({ ...prev, isActive: false }));
      setIsGenerating(false);
      dispatch(addNotification({
        type: 'error',
        title: '設定錯誤',
        message: '請先在設定中選擇 AI 提供商和模型',
        duration: 5000,
      }));
      return;
    }

    // 🎯 多版本生成邏輯
    const results: GenerationOption[] = [];
    const errors: string[] = [];
    
    // 創建 AbortController 用於取消請求
    abortControllerRef.current = new AbortController();
    
    try {
      for (let i = 0; i < generationCount; i++) {
        // 📊 更新進度
        setProgress(prev => ({
          ...prev,
          currentStep: `正在生成第 ${i + 1} 個版本...`,
          progress: (i / generationCount) * 100
        }));
        
        // 🎨 為每個版本創建略微不同的參數
        const versionParams = {
          temperature: Math.max(0.3, Math.min(1.2, temperature + (i - 1) * 0.15)),
          maxTokens: maxTokens + (i * 50), // 每個版本稍微不同的長度
          topP: Math.max(0.5, Math.min(1.0, topP + (i - 1) * 0.1)),
          presencePenalty: Math.max(0, Math.min(1.5, presencePenalty + (i * 0.2))),
        };
        
        try {
          // 🔄 如果不是第一個請求，添加延遲避免 API 限制
          if (i > 0) {
            const isGeminiAPI = currentModel?.includes('gemini');
            const delay = isGeminiAPI ? 2000 : 500; // Gemini 需要更長延遲
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          const genResult = await dispatch(generateTextWithProvider({
            prompt: `續寫位置: ${position}`,
            providerId: activeProviderId,
            model: currentModel,
            projectId: projectId,
            chapterId: chapterId,
            position: position,
            aiParams: versionParams,
            systemPrompt: '你是一個專業的小說續寫助手。請直接輸出繁體中文的故事內容，不要包含任何英文說明、思考過程或指導語句。只輸出純粹的故事續寫內容。'
          })).unwrap();
          
          // 過濾思考標籤
          const filteredText = filterThinkingTags(genResult.result);
          
          // ✅ 成功生成版本
          results.push({
            id: `${Date.now()}-${i}`,
            text: filteredText,
            temperature: versionParams.temperature,
            timestamp: new Date()
          });
          
          // 📊 更新成功計數
          setProgress(prev => ({
            ...prev,
            completedVersions: prev.completedVersions + 1,
            progress: ((i + 1) / generationCount) * 100
          }));
          
        } catch (versionError) {
          // ❌ 版本生成失敗
          const errorMessage = versionError instanceof Error ? versionError.message : `第 ${i + 1} 版本生成失敗`;
          errors.push(errorMessage);
          
          // 📊 更新失敗計數
          setProgress(prev => ({
            ...prev,
            failedVersions: prev.failedVersions + 1,
            errors: [...prev.errors, errorMessage]
          }));
          
          console.error(`版本 ${i + 1} 生成失敗:`, versionError);
          
          // 🚫 如果是配額錯誤，停止後續生成
          if (errorMessage.includes('429') || errorMessage.includes('quota') || 
              errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('配額')) {
            console.warn('檢測到 API 配額限制，停止後續生成');
            break;
          }
        }
      }
      
      // 🎉 設置生成結果
      setGenerationOptions(results);
      
      // 📊 最終進度更新
      setProgress(prev => ({
        ...prev,
        isActive: false,
        currentStep: `生成完成`,
        progress: 100
      }));
      
      // 📢 生成完成通知
      if (results.length > 0) {
        const successMessage = errors.length > 0 
          ? `成功生成 ${results.length} 個版本，${errors.length} 個失敗`
          : `成功生成 ${results.length} 個版本`;
          
        dispatch(addNotification({
          type: results.length === generationCount ? 'success' : 'warning',
          title: 'AI 續寫完成',
          message: successMessage,
          duration: 4000,
        }));
      } else {
        throw new Error('所有版本生成都失敗了');
      }

    } catch (error) {
      console.error('AI 續寫完全失敗:', error);
      
      // 📊 進度失敗狀態
      setProgress(prev => ({
        ...prev,
        isActive: false,
        currentStep: '生成失敗'
      }));
      
      dispatch(addNotification({
        type: 'error',
        title: 'AI 續寫失敗',
        message: error instanceof Error ? error.message : '生成文本時發生錯誤',
        duration: 5000,
      }));
    } finally {
      setIsGenerating(false);
      // 清理 AbortController
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
          message: `已成功插入 AI 生成的文本`,
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
      };

      const activeProviderId = currentProviderId;
      if (!activeProviderId) {
        throw new Error('請先在設定中選擇 AI 提供商和模型');
      }

      const genResult = await dispatch(generateTextWithProvider({
        prompt: `續寫位置: ${selection.anchor.offset}`,
        providerId: activeProviderId,
        model: currentModel,
        projectId: projectId,
        chapterId: chapterId,
        position: selection.anchor.offset,
        aiParams: params,
        systemPrompt: '你是一個專業的小說續寫助手。請直接輸出繁體中文的故事內容，不要包含任何英文說明、思考過程或指導語句。只輸出純粹的故事續寫內容。'
      })).unwrap();
      
      // 過濾思考標籤
      const filteredText = filterThinkingTags(genResult.result);

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
  }, [generationOptions, currentModel, editor, projectId, chapterId, maxTokens, topP, presencePenalty, dispatch, currentProviderId]);

  // 清除所有選項（省略，保持原有代碼）
  const handleClearOptions = useCallback(() => {
    setGenerationOptions([]);
  }, []);
  
  return (
    <div className="bg-cosmic-900 border-t border-cosmic-700 p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gold-400">AI 續寫</h3>
          <button
            onClick={() => setShowAIHistory(!showAIHistory)}
            className="text-sm text-gray-400 hover:text-gold-400 transition-colors"
          >
            {showAIHistory ? '隱藏歷史' : '查看歷史'}
          </button>
        </div>
        
        <div className="text-sm text-gray-400 mb-3">
          使用 AI 協助您繼續寫作。請先將游標放置在想要 AI 續寫的位置。
        </div>

        {/* 🔧 提供者和模型顯示 */}
        <div className="mb-3 p-3 bg-cosmic-800 rounded-lg border border-cosmic-700 space-y-3">
          {/* 提供者狀態 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">使用</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gold-400">
                {currentProviderId ? 
                  providers.find(p => p.id === currentProviderId)?.name || 'OpenRouter' : 
                  'Ollama'
                }
              </span>
            </div>
            {currentProviderId && (
              <span className="text-xs text-gray-500">已連線</span>
            )}
          </div>
          
          {/* 模型選擇 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300 min-w-fit">AI 模型</span>
            <select
              value={currentModel || ''}
              onChange={(e) => dispatch(setCurrentModel(e.target.value))}
              className="flex-1 px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">選擇模型</option>
              {currentProviderModels.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 🚀 快速預設 */}
        <div className="mb-3 p-3 bg-cosmic-800 rounded-lg border border-cosmic-700">
          <QuickPresets onApplyPreset={handleApplyPreset} />
        </div>

        {/* 📊 參數風險指示器 */}
        <ParameterRiskIndicator 
          temperature={temperature}
          topP={topP}
          presencePenalty={presencePenalty}
          maxTokens={maxTokens}
          generationCount={generationCount}
        />

        {/* 📈 智能參數控制 */}
        <div className="mb-3 p-3 bg-cosmic-800 rounded-lg border border-cosmic-700">
          <div className="grid grid-cols-1 gap-4">
            {/* 生成數量 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                生成數量 ({generationCount})
              </label>
              <input
                type="range"
                min="1"
                max="3"
                value={generationCount}
                onChange={(e) => setGenerationCount(Number(e.target.value))}
                className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none cursor-pointer"
              />
              <ParameterHelp parameterKey="generationCount" currentValue={generationCount} />
            </div>
            
            {/* 生成長度 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                生成長度 ({maxTokens})
              </label>
              <input
                type="range"
                min="300"
                max="1200"
                step="50"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none cursor-pointer"
              />
              <ParameterHelp parameterKey="maxTokens" currentValue={maxTokens} />
            </div>
            
            {/* 創意度 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                創意度 ({temperature.toFixed(1)})
              </label>
              <input
                type="range"
                min="0.3"
                max="1.2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none cursor-pointer"
              />
              <ParameterHelp parameterKey="temperature" currentValue={temperature} />
            </div>
            
            {/* 控制按鈕區域 */}
            <div className="flex items-center justify-between pt-2 border-t border-cosmic-700">
              <div>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                >
                  <span className="mr-1">{showAdvancedSettings ? '🔽' : '▶️'}</span>
                  {showAdvancedSettings ? '隱藏' : '顯示'}高級設置
                </button>
              </div>
              
              {hasChapterNotes && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-purple-400">筆記優化</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 🔧 高級設置 */}
          {showAdvancedSettings && (
            <div className="mt-3 pt-3 border-t border-cosmic-700 space-y-4">
              {/* 多樣性控制 (TopP) */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  多樣性控制 - TopP ({topP.toFixed(1)})
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none cursor-pointer"
                />
                <ParameterHelp parameterKey="topP" currentValue={topP} />
              </div>
              
              {/* 重複懲罰 */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  重複懲罰 ({presencePenalty.toFixed(1)})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={presencePenalty}
                  onChange={(e) => setPresencePenalty(Number(e.target.value))}
                  className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none cursor-pointer"
                />
                <ParameterHelp parameterKey="presencePenalty" currentValue={presencePenalty} />
              </div>
              
              {/* 高級設置說明 */}
              <div className="bg-cosmic-900 border border-cosmic-600 rounded-lg p-3 mt-3">
                <div className="text-xs text-gray-300 font-medium mb-2 flex items-center">
                  <span className="mr-2">💡</span>
                  高級參數說明
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>• <strong>多樣性控制 (TopP)</strong>：核採樣參數，控制詞彙選擇範圍</div>
                  <div>• <strong>重複懲罰</strong>：防止內容重複，鼓勵探討新話題</div>
                  <div>• 建議新手使用快速預設，熟悉後再調整高級參數</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 生成按鈕 */}
        {!isGenerating ? (
          <button
            onClick={handleGenerate}
            disabled={!currentModel}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
              !currentModel 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-white shadow-lg'
            }`}
          >
            {!currentModel ? '請先選擇模型' : `開始 AI 續寫 (${generationCount})`}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleCancel}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              取消生成
            </button>
            
            {/* 📊 進度顯示組件 */}
            {progress.isActive && (
              <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300">{progress.currentStep}</span>
                  <span className="text-sm text-gold-400">{Math.round(progress.progress)}%</span>
                </div>
                
                <div className="w-full bg-cosmic-900 rounded-full h-2 mb-3">
                  <div 
                    className="bg-gradient-to-r from-gold-500 to-gold-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-400">
                  <span>
                    完成: {progress.completedVersions}/{progress.totalVersions}
                  </span>
                  {progress.failedVersions > 0 && (
                    <span className="text-red-400">
                      失敗: {progress.failedVersions}
                    </span>
                  )}
                </div>
                
                {/* 錯誤列表 */}
                {progress.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-400">
                    <div className="font-medium mb-1">錯誤詳情:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {progress.errors.slice(-3).map((error, index) => (
                        <li key={index} className="truncate">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
        </div>
      )}

      {/* AI 歷史面板 */}
      {showAIHistory && (
        <div className="mt-4 border-t border-cosmic-700 pt-4">
          <AIHistoryPanel 
            projectId={projectId} 
            chapterId={chapterId}
          />
        </div>
      )}
    </div>
  );
};

export default AIWritingPanel;