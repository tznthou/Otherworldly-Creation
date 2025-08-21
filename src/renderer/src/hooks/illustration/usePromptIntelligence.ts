import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// 提示詞類型
export type PromptCategory = 'character' | 'scene' | 'style' | 'mood' | 'lighting' | 'composition' | 'quality';

// 提示詞建議項目
export interface PromptSuggestion {
  id: string;
  text: string;
  category: PromptCategory;
  confidence: number; // 0-1, 建議信心度
  source: 'ai' | 'template' | 'history' | 'manual';
  weight: number; // 在提示詞中的重要性權重
  tags: string[];
  description?: string;
  usage_count?: number;
  last_used?: string;
}

// 角色特徵類型
export interface CharacterTraits {
  id: string;
  name: string;
  appearance: {
    hair_color?: string;
    hair_style?: string;
    eye_color?: string;
    skin_tone?: string;
    height?: string;
    build?: string;
  };
  personality: {
    traits: string[];
    mood?: string;
    archetype?: string;
  };
  clothing: {
    style?: string;
    colors?: string[];
    accessories?: string[];
  };
  setting?: string;
  occupation?: string;
  age?: string;
}

// 場景上下文
export interface SceneContext {
  type: 'portrait' | 'scene' | 'interaction' | 'action';
  setting: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
  mood?: 'peaceful' | 'tense' | 'romantic' | 'dramatic' | 'mysterious';
  characters: string[]; // 角色ID列表
  description?: string;
}

// 提示詞建議請求
export interface PromptSuggestionRequest {
  basePrompt?: string;
  characters?: CharacterTraits[];
  scene?: SceneContext;
  stylePreferences?: {
    artStyle?: string;
    quality?: string;
    composition?: string;
  };
  maxSuggestions?: number;
  categories?: PromptCategory[];
}

// 提示詞分析結果
export interface PromptAnalysis {
  originalPrompt: string;
  extractedElements: {
    characters: string[];
    settings: string[];
    styles: string[];
    moods: string[];
    qualities: string[];
  };
  suggestions: PromptSuggestion[];
  improvedPrompt: string;
  confidence: number;
}

// 提示詞歷史記錄
export interface PromptHistory {
  id: string;
  prompt: string;
  timestamp: string;
  success_rate: number; // 生成成功率
  user_rating?: number; // 1-5 用戶評分
  generated_images: number;
  tags: string[];
}

// Hook 狀態
export interface PromptIntelligenceState {
  // 建議相關
  suggestions: PromptSuggestion[];
  isGeneratingSuggestions: boolean;
  lastSuggestionRequest: PromptSuggestionRequest | null;
  
  // 分析相關
  currentAnalysis: PromptAnalysis | null;
  isAnalyzing: boolean;
  
  // 歷史記錄
  promptHistory: PromptHistory[];
  favoritePrompts: PromptSuggestion[];
  
  // 個性化設定
  userPreferences: {
    preferredCategories: PromptCategory[];
    commonTags: string[];
    stylePreferences: string[];
  };
  
  // 錯誤處理
  lastError: string | null;
}

// Hook 選項
export interface UsePromptIntelligenceOptions {
  enableAutoSuggestions?: boolean;
  enablePromptHistory?: boolean;
  maxHistorySize?: number;
  debounceDelay?: number;
  apiEndpoint?: string;
}

// Hook 返回值
export interface UsePromptIntelligenceReturn {
  // 狀態
  state: PromptIntelligenceState;
  
  // 建議功能
  generateSuggestions: (request: PromptSuggestionRequest) => Promise<PromptSuggestion[]>;
  applySuggestion: (suggestion: PromptSuggestion) => void;
  clearSuggestions: () => void;
  
  // 分析功能
  analyzePrompt: (prompt: string, context?: Partial<PromptSuggestionRequest>) => Promise<PromptAnalysis>;
  
  // 提示詞操作
  optimizePrompt: (prompt: string, options?: { maxLength?: number; removeRedundant?: boolean }) => string;
  combinePrompts: (prompts: string[], weights?: number[]) => string;
  
  // 歷史管理
  addToHistory: (prompt: string, metadata?: Partial<PromptHistory>) => void;
  removeFromHistory: (historyId: string) => void;
  getPopularPrompts: (limit?: number) => PromptHistory[];
  
  // 收藏管理
  addToFavorites: (suggestion: PromptSuggestion) => void;
  removeFromFavorites: (suggestionId: string) => void;
  
  // 個性化設定
  updatePreferences: (preferences: Partial<PromptIntelligenceState['userPreferences']>) => void;
  
  // 實用功能
  extractKeywords: (text: string) => string[];
  suggestNegativePrompts: (positivePrompts: string[]) => string[];
  validatePrompt: (prompt: string) => { isValid: boolean; issues: string[] };
  
  // 錯誤處理
  clearError: () => void;
}

// 預設建議庫
const DEFAULT_SUGGESTIONS: PromptSuggestion[] = [
  // 品質相關
  {
    id: 'quality_high',
    text: 'high quality, detailed, masterpiece',
    category: 'quality',
    confidence: 0.9,
    source: 'template',
    weight: 1.0,
    tags: ['quality', 'detail']
  },
  {
    id: 'quality_professional',
    text: 'professional artwork, 8k resolution',
    category: 'quality',
    confidence: 0.85,
    source: 'template',
    weight: 0.8,
    tags: ['quality', 'resolution']
  },
  
  // 風格相關
  {
    id: 'style_anime',
    text: 'anime style, manga art',
    category: 'style',
    confidence: 0.9,
    source: 'template',
    weight: 1.0,
    tags: ['anime', 'manga']
  },
  {
    id: 'style_realistic',
    text: 'photorealistic, realistic',
    category: 'style',
    confidence: 0.85,
    source: 'template',
    weight: 1.0,
    tags: ['realistic', 'photo']
  },
  
  // 光照相關
  {
    id: 'lighting_soft',
    text: 'soft lighting, natural light',
    category: 'lighting',
    confidence: 0.8,
    source: 'template',
    weight: 0.7,
    tags: ['lighting', 'soft', 'natural']
  },
  {
    id: 'lighting_dramatic',
    text: 'dramatic lighting, cinematic',
    category: 'lighting',
    confidence: 0.75,
    source: 'template',
    weight: 0.8,
    tags: ['lighting', 'dramatic', 'cinematic']
  },
  
  // 構圖相關
  {
    id: 'composition_portrait',
    text: 'portrait, centered composition',
    category: 'composition',
    confidence: 0.85,
    source: 'template',
    weight: 0.9,
    tags: ['portrait', 'composition']
  },
  {
    id: 'composition_fullbody',
    text: 'full body, dynamic pose',
    category: 'composition',
    confidence: 0.8,
    source: 'template',
    weight: 0.8,
    tags: ['fullbody', 'pose', 'dynamic']
  }
];

// 常見負面提示詞
const COMMON_NEGATIVE_PROMPTS = [
  'blurry', 'low quality', 'distorted', 'deformed',
  'extra limbs', 'bad anatomy', 'worst quality',
  'jpeg artifacts', 'signature', 'watermark',
  'username', 'out of frame', 'ugly', 'duplicate'
];

// 初始狀態
const initialState: PromptIntelligenceState = {
  suggestions: [],
  isGeneratingSuggestions: false,
  lastSuggestionRequest: null,
  currentAnalysis: null,
  isAnalyzing: false,
  promptHistory: [],
  favoritePrompts: [],
  userPreferences: {
    preferredCategories: ['character', 'style', 'quality'],
    commonTags: [],
    stylePreferences: ['anime', 'high quality']
  },
  lastError: null
};

/**
 * 智能提示詞建議 Hook
 * 提供基於 AI 的提示詞生成、分析和優化功能
 */
export function usePromptIntelligence(
  options: UsePromptIntelligenceOptions = {}
): UsePromptIntelligenceReturn {
  const {
    enableAutoSuggestions = true,
    enablePromptHistory = true,
    maxHistorySize = 100,
    debounceDelay = 500,
    apiEndpoint = '/api/prompt-intelligence'
  } = options;

  const [state, setState] = useState<PromptIntelligenceState>(initialState);
  const debounceRef = useRef<NodeJS.Timeout>();
  const requestCounterRef = useRef<number>(0);

  // 生成建議
  const generateSuggestions = useCallback(async (
    request: PromptSuggestionRequest
  ): Promise<PromptSuggestion[]> => {
    try {
      setState(prev => ({ 
        ...prev, 
        isGeneratingSuggestions: true,
        lastSuggestionRequest: request,
        lastError: null
      }));

      // 這裡是模擬 AI API 調用，實際應該調用後端服務
      const suggestions = await mockGenerateSuggestions(request);

      setState(prev => ({ 
        ...prev, 
        suggestions,
        isGeneratingSuggestions: false
      }));

      console.log(`🤖 [PromptIntelligence] 生成 ${suggestions.length} 個建議`);
      return suggestions;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
      setState(prev => ({ 
        ...prev, 
        isGeneratingSuggestions: false,
        lastError: errorMessage
      }));
      throw error;
    }
  }, []);

  // 分析提示詞
  const analyzePrompt = useCallback(async (
    prompt: string,
    context?: Partial<PromptSuggestionRequest>
  ): Promise<PromptAnalysis> => {
    try {
      setState(prev => ({ ...prev, isAnalyzing: true, lastError: null }));

      // 這裡是模擬分析，實際應該調用 AI 服務
      const analysis = await mockAnalyzePrompt(prompt, context);

      setState(prev => ({ 
        ...prev, 
        currentAnalysis: analysis,
        isAnalyzing: false
      }));

      console.log(`🔍 [PromptIntelligence] 分析完成: ${analysis.confidence * 100}% 信心度`);
      return analysis;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze prompt';
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false,
        lastError: errorMessage
      }));
      throw error;
    }
  }, []);

  // 應用建議
  const applySuggestion = useCallback((suggestion: PromptSuggestion) => {
    console.log(`✨ [PromptIntelligence] 應用建議: ${suggestion.text}`);
    
    // 更新使用統計
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.map(s =>
        s.id === suggestion.id
          ? { ...s, usage_count: (s.usage_count || 0) + 1, last_used: new Date().toISOString() }
          : s
      )
    }));
  }, []);

  // 優化提示詞
  const optimizePrompt = useCallback((
    prompt: string, 
    options: { maxLength?: number; removeRedundant?: boolean } = {}
  ): string => {
    const { maxLength = 200, removeRedundant = true } = options;
    
    let optimized = prompt.trim();
    
    if (removeRedundant) {
      // 移除重複的詞彙
      const words = optimized.split(/[,\s]+/).filter(Boolean);
      const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
      optimized = uniqueWords.join(', ');
    }
    
    // 限制長度
    if (optimized.length > maxLength) {
      optimized = optimized.substring(0, maxLength).replace(/,\s*[^,]*$/, '');
    }
    
    return optimized;
  }, []);

  // 組合提示詞
  const combinePrompts = useCallback((prompts: string[], weights: number[] = []): string => {
    const normalizedWeights = weights.length === prompts.length 
      ? weights 
      : prompts.map(() => 1);
    
    const combined = prompts
      .map((prompt, index) => {
        const weight = normalizedWeights[index];
        return weight > 1 ? `(${prompt}:${weight.toFixed(1)})` : prompt;
      })
      .filter(Boolean)
      .join(', ');
    
    return combined;
  }, []);

  // 添加到歷史
  const addToHistory = useCallback((prompt: string, metadata: Partial<PromptHistory> = {}) => {
    if (!enablePromptHistory) return;
    
    const historyItem: PromptHistory = {
      id: `history_${Date.now()}`,
      prompt,
      timestamp: new Date().toISOString(),
      success_rate: 1.0,
      generated_images: 1,
      tags: extractKeywords(prompt),
      ...metadata
    };
    
    setState(prev => ({
      ...prev,
      promptHistory: [historyItem, ...prev.promptHistory.slice(0, maxHistorySize - 1)]
    }));
  }, [enablePromptHistory, maxHistorySize]);

  // 提取關鍵詞
  const extractKeywords = useCallback((text: string): string[] => {
    // 簡單的關鍵詞提取邏輯
    const words = text.toLowerCase()
      .split(/[,\s]+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));
    
    return [...new Set(words)];
  }, []);

  // 建議負面提示詞
  const suggestNegativePrompts = useCallback((positivePrompts: string[]): string[] => {
    // 基於正面提示詞智能建議負面提示詞
    const suggested = [...COMMON_NEGATIVE_PROMPTS];
    
    // 根據正面提示詞添加特定的負面提示詞
    const positiveText = positivePrompts.join(' ').toLowerCase();
    
    if (positiveText.includes('anime') || positiveText.includes('manga')) {
      suggested.push('realistic', 'photorealistic', '3d');
    }
    
    if (positiveText.includes('realistic') || positiveText.includes('photo')) {
      suggested.push('anime', 'manga', 'cartoon', 'drawing');
    }
    
    return suggested.slice(0, 10); // 限制數量
  }, []);

  // 驗證提示詞
  const validatePrompt = useCallback((prompt: string): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!prompt.trim()) {
      issues.push('提示詞不能為空');
    }
    
    if (prompt.length > 500) {
      issues.push('提示詞過長，建議控制在500字符以內');
    }
    
    if (prompt.split(',').length > 50) {
      issues.push('提示詞項目過多，建議控制在50個以內');
    }
    
    // 檢查是否包含不當內容
    const inappropriateWords = ['nsfw', 'explicit', 'nude'];
    if (inappropriateWords.some(word => prompt.toLowerCase().includes(word))) {
      issues.push('包含不適當內容');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }, []);

  // 其他 Hook 方法的實現...
  const clearSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, suggestions: [] }));
  }, []);

  const removeFromHistory = useCallback((historyId: string) => {
    setState(prev => ({
      ...prev,
      promptHistory: prev.promptHistory.filter(h => h.id !== historyId)
    }));
  }, []);

  const getPopularPrompts = useCallback((limit: number = 10): PromptHistory[] => {
    return state.promptHistory
      .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
      .slice(0, limit);
  }, [state.promptHistory]);

  const addToFavorites = useCallback((suggestion: PromptSuggestion) => {
    setState(prev => ({
      ...prev,
      favoritePrompts: [...prev.favoritePrompts.filter(f => f.id !== suggestion.id), suggestion]
    }));
  }, []);

  const removeFromFavorites = useCallback((suggestionId: string) => {
    setState(prev => ({
      ...prev,
      favoritePrompts: prev.favoritePrompts.filter(f => f.id !== suggestionId)
    }));
  }, []);

  const updatePreferences = useCallback((preferences: Partial<PromptIntelligenceState['userPreferences']>) => {
    setState(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, ...preferences }
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }));
  }, []);

  return {
    state,
    generateSuggestions,
    applySuggestion,
    clearSuggestions,
    analyzePrompt,
    optimizePrompt,
    combinePrompts,
    addToHistory,
    removeFromHistory,
    getPopularPrompts,
    addToFavorites,
    removeFromFavorites,
    updatePreferences,
    extractKeywords,
    suggestNegativePrompts,
    validatePrompt,
    clearError
  };
}

// 模擬 AI 建議生成（實際應該調用後端 API）
async function mockGenerateSuggestions(request: PromptSuggestionRequest): Promise<PromptSuggestion[]> {
  // 模擬 API 延遲
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  const suggestions: PromptSuggestion[] = [...DEFAULT_SUGGESTIONS];
  
  // 根據角色特徵生成建議
  if (request.characters) {
    request.characters.forEach(character => {
      if (character.appearance.hair_color) {
        suggestions.push({
          id: `char_hair_${character.id}`,
          text: `${character.appearance.hair_color} hair`,
          category: 'character',
          confidence: 0.85,
          source: 'ai',
          weight: 0.8,
          tags: ['hair', 'character', character.appearance.hair_color]
        });
      }
      
      if (character.appearance.eye_color) {
        suggestions.push({
          id: `char_eyes_${character.id}`,
          text: `${character.appearance.eye_color} eyes`,
          category: 'character',
          confidence: 0.8,
          source: 'ai',
          weight: 0.7,
          tags: ['eyes', 'character', character.appearance.eye_color]
        });
      }
    });
  }
  
  // 根據場景生成建議
  if (request.scene) {
    suggestions.push({
      id: `scene_${request.scene.type}`,
      text: `${request.scene.type} shot, ${request.scene.setting}`,
      category: 'scene',
      confidence: 0.9,
      source: 'ai',
      weight: 1.0,
      tags: [request.scene.type, 'scene', request.scene.setting]
    });
  }
  
  return suggestions.slice(0, request.maxSuggestions || 10);
}

// 模擬提示詞分析（實際應該調用後端 API）
async function mockAnalyzePrompt(
  prompt: string, 
  context?: Partial<PromptSuggestionRequest>
): Promise<PromptAnalysis> {
  // 模擬 API 延遲
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
  
  const words = prompt.toLowerCase().split(/[,\s]+/).filter(Boolean);
  
  return {
    originalPrompt: prompt,
    extractedElements: {
      characters: words.filter(w => ['girl', 'boy', 'woman', 'man', 'character'].some(c => w.includes(c))),
      settings: words.filter(w => ['forest', 'city', 'room', 'outdoor', 'indoor'].some(s => w.includes(s))),
      styles: words.filter(w => ['anime', 'realistic', 'fantasy', 'manga'].includes(w)),
      moods: words.filter(w => ['happy', 'sad', 'angry', 'peaceful', 'dramatic'].includes(w)),
      qualities: words.filter(w => ['high quality', 'detailed', 'masterpiece', '8k'].some(q => w.includes(q)))
    },
    suggestions: await mockGenerateSuggestions({ basePrompt: prompt, ...context }),
    improvedPrompt: `${prompt}, high quality, detailed`,
    confidence: 0.75 + Math.random() * 0.2
  };
}

export default usePromptIntelligence;