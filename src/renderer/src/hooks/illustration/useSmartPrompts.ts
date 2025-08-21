import { useState, useCallback, useMemo } from 'react';
import type { Character } from '../../api/models';

// 提示詞建議類型
export interface PromptSuggestion {
  id: string;
  text: string;
  category: PromptCategory;
  weight: number; // 重要性權重 1-10
  description?: string;
  tags: string[];
}

// 提示詞類別
export type PromptCategory = 
  | 'character'     // 角色描述
  | 'appearance'    // 外觀特徵
  | 'clothing'      // 服裝配飾
  | 'environment'   // 環境背景
  | 'mood'          // 情緒氛圍
  | 'composition'   // 構圖技巧
  | 'style'         // 藝術風格
  | 'quality'       // 品質增強
  | 'lighting'      // 光影效果
  | 'camera';       // 鏡頭視角

// 智慧提示詞分析結果
export interface SmartPromptAnalysis {
  originalPrompt: string;
  suggestions: PromptSuggestion[];
  optimizedPrompt: string;
  removedElements: string[];
  analysis: {
    clarity: number;         // 清晰度評分 1-10
    specificity: number;     // 具體性評分 1-10
    creativity: number;      // 創意性評分 1-10
    feasibility: number;     // 可實現性評分 1-10
    overall: number;         // 總體評分 1-10
  };
  warnings: string[];       // 警告訊息
  recommendations: string[]; // 建議改進
}

// Hook 選項
export interface UseSmartPromptsOptions {
  /** 是否啟用自動分析 */
  enableAutoAnalysis?: boolean;
  /** 分析延遲時間 (毫秒) */
  analysisDelay?: number;
  /** 最大建議數量 */
  maxSuggestions?: number;
  /** 偏好的藝術風格 */
  preferredStyle?: string;
}

// Hook 返回值
export interface UseSmartPromptsReturn {
  // === 當前狀態 ===
  /** 當前提示詞 */
  currentPrompt: string;
  /** 分析結果 */
  analysis: SmartPromptAnalysis | null;
  /** 是否正在分析 */
  analyzing: boolean;
  /** 錯誤訊息 */
  error: string | null;
  
  // === 建議管理 ===
  /** 可用建議列表 */
  availableSuggestions: PromptSuggestion[];
  /** 已應用的建議 */
  appliedSuggestions: PromptSuggestion[];
  /** 被拒絕的建議 */
  rejectedSuggestions: PromptSuggestion[];
  
  // === 操作函數 ===
  /** 設置提示詞並分析 */
  setPrompt: (prompt: string) => void;
  /** 手動觸發分析 */
  analyzePrompt: (prompt?: string) => Promise<SmartPromptAnalysis>;
  /** 應用建議 */
  applySuggestion: (suggestionId: string) => void;
  /** 拒絕建議 */
  rejectSuggestion: (suggestionId: string) => void;
  /** 撤銷應用的建議 */
  undoSuggestion: (suggestionId: string) => void;
  /** 清除所有建議 */
  clearSuggestions: () => void;
  /** 重置分析 */
  resetAnalysis: () => void;
  
  // === 實用功能 ===
  /** 基於角色生成建議 */
  generateCharacterSuggestions: (characters: Character[]) => PromptSuggestion[];
  /** 基於場景生成建議 */
  generateSceneSuggestions: (sceneType: string) => PromptSuggestion[];
  /** 生成品質增強建議 */
  generateQualitySuggestions: () => PromptSuggestion[];
  /** 檢測並移除有害內容 */
  detectHarmfulContent: (prompt: string) => { hasHarmful: boolean; issues: string[] };
  /** 優化提示詞長度 */
  optimizePromptLength: (prompt: string, maxLength: number) => string;
}

// 預設建議庫
const DEFAULT_SUGGESTIONS: Record<PromptCategory, PromptSuggestion[]> = {
  character: [
    { id: 'char-1', text: 'detailed character design', category: 'character', weight: 8, tags: ['character', 'detail'], description: '詳細的角色設計' },
    { id: 'char-2', text: 'expressive facial features', category: 'character', weight: 7, tags: ['face', 'expression'], description: '富有表情的面部特徵' },
    { id: 'char-3', text: 'dynamic pose', category: 'character', weight: 6, tags: ['pose', 'dynamic'], description: '動感姿勢' },
  ],
  appearance: [
    { id: 'app-1', text: 'beautiful eyes', category: 'appearance', weight: 8, tags: ['eyes', 'beauty'], description: '美麗的眼睛' },
    { id: 'app-2', text: 'flowing hair', category: 'appearance', weight: 6, tags: ['hair', 'flowing'], description: '飄逸的頭髮' },
    { id: 'app-3', text: 'elegant facial structure', category: 'appearance', weight: 7, tags: ['face', 'elegant'], description: '優雅的面部輪廓' },
  ],
  clothing: [
    { id: 'cloth-1', text: 'intricate costume design', category: 'clothing', weight: 7, tags: ['costume', 'intricate'], description: '精緻的服裝設計' },
    { id: 'cloth-2', text: 'flowing fabric', category: 'clothing', weight: 5, tags: ['fabric', 'flowing'], description: '飄逸的布料' },
    { id: 'cloth-3', text: 'detailed accessories', category: 'clothing', weight: 6, tags: ['accessories', 'detail'], description: '精細的配件' },
  ],
  environment: [
    { id: 'env-1', text: 'detailed background', category: 'environment', weight: 6, tags: ['background', 'detail'], description: '詳細的背景' },
    { id: 'env-2', text: 'atmospheric setting', category: 'environment', weight: 7, tags: ['atmosphere', 'setting'], description: '富有氛圍的場景' },
    { id: 'env-3', text: 'fantasy landscape', category: 'environment', weight: 5, tags: ['fantasy', 'landscape'], description: '奇幻風景' },
  ],
  mood: [
    { id: 'mood-1', text: 'dramatic atmosphere', category: 'mood', weight: 7, tags: ['dramatic', 'atmosphere'], description: '戲劇性氛圍' },
    { id: 'mood-2', text: 'mysterious ambiance', category: 'mood', weight: 6, tags: ['mysterious', 'ambiance'], description: '神秘氛圍' },
    { id: 'mood-3', text: 'serene peaceful', category: 'mood', weight: 5, tags: ['serene', 'peaceful'], description: '寧靜祥和' },
  ],
  composition: [
    { id: 'comp-1', text: 'rule of thirds', category: 'composition', weight: 6, tags: ['composition', 'rule'], description: '三分法則' },
    { id: 'comp-2', text: 'centered composition', category: 'composition', weight: 5, tags: ['centered', 'composition'], description: '居中構圖' },
    { id: 'comp-3', text: 'dynamic composition', category: 'composition', weight: 7, tags: ['dynamic', 'composition'], description: '動感構圖' },
  ],
  style: [
    { id: 'style-1', text: 'anime art style', category: 'style', weight: 8, tags: ['anime', 'style'], description: '動漫藝術風格' },
    { id: 'style-2', text: 'digital painting', category: 'style', weight: 7, tags: ['digital', 'painting'], description: '數位繪畫' },
    { id: 'style-3', text: 'watercolor effect', category: 'style', weight: 5, tags: ['watercolor', 'effect'], description: '水彩效果' },
  ],
  quality: [
    { id: 'qual-1', text: 'masterpiece', category: 'quality', weight: 9, tags: ['masterpiece', 'quality'], description: '傑作品質' },
    { id: 'qual-2', text: 'high quality', category: 'quality', weight: 8, tags: ['high', 'quality'], description: '高品質' },
    { id: 'qual-3', text: 'detailed', category: 'quality', weight: 7, tags: ['detailed', 'quality'], description: '細緻入微' },
    { id: 'qual-4', text: 'sharp focus', category: 'quality', weight: 6, tags: ['sharp', 'focus'], description: '清晰對焦' },
  ],
  lighting: [
    { id: 'light-1', text: 'soft natural lighting', category: 'lighting', weight: 7, tags: ['soft', 'natural', 'lighting'], description: '柔和自然光' },
    { id: 'light-2', text: 'dramatic lighting', category: 'lighting', weight: 6, tags: ['dramatic', 'lighting'], description: '戲劇性光照' },
    { id: 'light-3', text: 'golden hour', category: 'lighting', weight: 5, tags: ['golden', 'hour'], description: '黃金時刻' },
  ],
  camera: [
    { id: 'cam-1', text: 'portrait shot', category: 'camera', weight: 6, tags: ['portrait', 'camera'], description: '肖像鏡頭' },
    { id: 'cam-2', text: 'full body shot', category: 'camera', weight: 5, tags: ['full', 'body'], description: '全身鏡頭' },
    { id: 'cam-3', text: 'close-up detail', category: 'camera', weight: 7, tags: ['close-up', 'detail'], description: '特寫細節' },
  ]
};

// 有害內容關鍵字
const HARMFUL_KEYWORDS = [
  'nsfw', 'nude', 'naked', 'sexual', 'explicit',
  'violence', 'blood', 'gore', 'death', 'weapon',
  'hate', 'discrimination', 'offensive'
];

/**
 * 智慧提示詞建議 Hook
 */
export const useSmartPrompts = (
  options: UseSmartPromptsOptions = {}
): UseSmartPromptsReturn => {
  const {
    enableAutoAnalysis = true,
    analysisDelay = 1000,
    maxSuggestions = 10,
    preferredStyle = 'anime'
  } = options;
  
  // 狀態管理
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<SmartPromptAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<PromptSuggestion[]>([]);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<PromptSuggestion[]>([]);
  
  // 獲取所有可用建議
  const availableSuggestions = useMemo(() => {
    const allSuggestions = Object.values(DEFAULT_SUGGESTIONS).flat();
    return allSuggestions
      .filter(s => !rejectedSuggestions.some(r => r.id === s.id))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxSuggestions);
  }, [rejectedSuggestions, maxSuggestions]);
  
  // 分析提示詞
  const analyzePrompt = useCallback(async (prompt: string = currentPrompt): Promise<SmartPromptAnalysis> => {
    if (!prompt.trim()) {
      throw new Error('提示詞不能為空');
    }
    
    setAnalyzing(true);
    setError(null);
    
    try {
      // 模擬 AI 分析延遲
      await new Promise(resolve => setTimeout(resolve, analysisDelay));
      
      // 檢測有害內容
      const harmfulCheck = detectHarmfulContent(prompt);
      
      // 生成建議
      const suggestions: PromptSuggestion[] = [];
      
      // 基於當前內容生成建議
      if (!prompt.includes('masterpiece')) {
        suggestions.push(...DEFAULT_SUGGESTIONS.quality);
      }
      
      if (!prompt.includes('detailed')) {
        suggestions.push(DEFAULT_SUGGESTIONS.quality.find(s => s.text === 'detailed')!);
      }
      
      // 風格建議
      if (preferredStyle === 'anime' && !prompt.includes('anime')) {
        suggestions.push(DEFAULT_SUGGESTIONS.style.find(s => s.text === 'anime art style')!);
      }
      
      // 評分分析
      const analysis: SmartPromptAnalysis = {
        originalPrompt: prompt,
        suggestions: suggestions.slice(0, 5), // 限制建議數量
        optimizedPrompt: prompt, // 在實際應用中會進行優化
        removedElements: [],
        analysis: {
          clarity: Math.floor(Math.random() * 3) + 7,      // 7-10
          specificity: Math.floor(Math.random() * 4) + 6,  // 6-10
          creativity: Math.floor(Math.random() * 5) + 5,   // 5-10
          feasibility: Math.floor(Math.random() * 2) + 8,  // 8-10
          overall: Math.floor(Math.random() * 3) + 7,      // 7-10
        },
        warnings: harmfulCheck.hasHarmful ? harmfulCheck.issues : [],
        recommendations: [
          '考慮添加更多具體的細節描述',
          '可以增加光照和氛圍描述',
          '建議指定更明確的構圖方式'
        ]
      };
      
      setAnalysis(analysis);
      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '分析失敗';
      setError(errorMessage);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  }, [currentPrompt, analysisDelay, preferredStyle]);
  
  // 設置提示詞
  const setPrompt = useCallback((prompt: string) => {
    setCurrentPrompt(prompt);
    if (enableAutoAnalysis && prompt.trim()) {
      const timeoutId = setTimeout(() => {
        analyzePrompt(prompt).catch(console.error);
      }, analysisDelay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [enableAutoAnalysis, analysisDelay, analyzePrompt]);
  
  // 應用建議
  const applySuggestion = useCallback((suggestionId: string) => {
    const suggestion = availableSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    setAppliedSuggestions(prev => [...prev, suggestion]);
    
    // 將建議添加到提示詞中
    const newPrompt = currentPrompt.trim() 
      ? `${currentPrompt}, ${suggestion.text}`
      : suggestion.text;
    setCurrentPrompt(newPrompt);
  }, [availableSuggestions, currentPrompt]);
  
  // 拒絕建議
  const rejectSuggestion = useCallback((suggestionId: string) => {
    const suggestion = availableSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    setRejectedSuggestions(prev => [...prev, suggestion]);
  }, [availableSuggestions]);
  
  // 撤銷建議
  const undoSuggestion = useCallback((suggestionId: string) => {
    const suggestion = appliedSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    setAppliedSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    
    // 從提示詞中移除建議文本
    const newPrompt = currentPrompt.replace(new RegExp(`,?\\s*${suggestion.text}`, 'g'), '');
    setCurrentPrompt(newPrompt.trim());
  }, [appliedSuggestions, currentPrompt]);
  
  // 清除建議
  const clearSuggestions = useCallback(() => {
    setAppliedSuggestions([]);
    setRejectedSuggestions([]);
  }, []);
  
  // 重置分析
  const resetAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setAppliedSuggestions([]);
    setRejectedSuggestions([]);
  }, []);
  
  // 基於角色生成建議
  const generateCharacterSuggestions = useCallback((characters: Character[]): PromptSuggestion[] => {
    const suggestions: PromptSuggestion[] = [];
    
    characters.forEach((character, index) => {
      if (character.name) {
        suggestions.push({
          id: `char-gen-${index}`,
          text: character.name,
          category: 'character',
          weight: 8,
          tags: ['character', 'name'],
          description: `角色：${character.name}`
        });
      }
      
      if (character.appearance) {
        const traits = character.appearance.split(/[，,。.]/).slice(0, 3);
        traits.forEach((trait: string, traitIndex: number) => {
          if (trait.trim()) {
            suggestions.push({
              id: `trait-${index}-${traitIndex}`,
              text: trait.trim(),
              category: 'appearance',
              weight: 6,
              tags: ['character', 'trait'],
              description: `${character.name}的特徵：${trait.trim()}`
            });
          }
        });
      }
    });
    
    return suggestions;
  }, []);
  
  // 基於場景生成建議
  const generateSceneSuggestions = useCallback((sceneType: string): PromptSuggestion[] => {
    const sceneMap: Record<string, PromptSuggestion[]> = {
      'portrait': DEFAULT_SUGGESTIONS.camera.filter(s => s.text.includes('portrait')),
      'landscape': DEFAULT_SUGGESTIONS.environment.filter(s => s.text.includes('landscape')),
      'action': DEFAULT_SUGGESTIONS.character.filter(s => s.text.includes('dynamic')),
    };
    
    return sceneMap[sceneType] || [];
  }, []);
  
  // 生成品質增強建議
  const generateQualitySuggestions = useCallback((): PromptSuggestion[] => {
    return DEFAULT_SUGGESTIONS.quality;
  }, []);
  
  // 檢測有害內容
  const detectHarmfulContent = useCallback((prompt: string): { hasHarmful: boolean; issues: string[] } => {
    const issues: string[] = [];
    const lowercasePrompt = prompt.toLowerCase();
    
    HARMFUL_KEYWORDS.forEach(keyword => {
      if (lowercasePrompt.includes(keyword)) {
        issues.push(`包含可能不適當的內容：${keyword}`);
      }
    });
    
    return {
      hasHarmful: issues.length > 0,
      issues
    };
  }, []);
  
  // 優化提示詞長度
  const optimizePromptLength = useCallback((prompt: string, maxLength: number): string => {
    if (prompt.length <= maxLength) return prompt;
    
    // 簡單的截斷優化，實際應用中可以更智能
    const words = prompt.split(/[，,]\s*/);
    let optimized = '';
    
    for (const word of words) {
      if ((optimized + word).length <= maxLength - 10) {
        optimized = optimized ? `${optimized}, ${word}` : word;
      } else {
        break;
      }
    }
    
    return optimized || prompt.substring(0, maxLength - 3) + '...';
  }, []);
  
  return {
    // 狀態
    currentPrompt,
    analysis,
    analyzing,
    error,
    
    // 建議
    availableSuggestions,
    appliedSuggestions,
    rejectedSuggestions,
    
    // 操作
    setPrompt,
    analyzePrompt,
    applySuggestion,
    rejectSuggestion,
    undoSuggestion,
    clearSuggestions,
    resetAnalysis,
    
    // 實用功能
    generateCharacterSuggestions,
    generateSceneSuggestions,
    generateQualitySuggestions,
    detectHarmfulContent,
    optimizePromptLength
  };
};