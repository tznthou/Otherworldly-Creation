import React, { useState, useEffect, useCallback } from 'react';
import { usePromptIntelligence, type PromptSuggestionRequest, type PromptSuggestion } from '../../../../hooks/illustration/usePromptIntelligence';
import type { Character } from '../../../../types/character';
import type { StyleTemplate } from '../../../../types/styleTemplate';
import { createLogger } from '../../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('PromptSuggestionPanel');

interface PromptSuggestionPanelProps {
  selectedCharacters: Character[];
  sceneType: 'portrait' | 'scene' | 'interaction';
  currentPrompt: string;
  styleTemplate?: StyleTemplate;
  onPromptSelect: (prompt: string) => void;
  onPromptOptimize: (optimizedPrompt: string) => void;
  className?: string;
}

interface SuggestionCard {
  id: string;
  prompt: string;
  confidence: number;
  category: 'character' | 'scene' | 'style' | 'composition';
  reasoning: string;
}

const PromptSuggestionPanel: React.FC<PromptSuggestionPanelProps> = ({
  selectedCharacters,
  sceneType,
  currentPrompt,
  styleTemplate: _styleTemplate,
  onPromptSelect,
  onPromptOptimize,
  className = ''
}) => {
  const promptIntelligence = usePromptIntelligence({
    enablePromptHistory: true,
    maxHistorySize: 50
  });

  const [activeTab, setActiveTab] = useState<'suggestions' | 'analysis' | 'history' | 'favorites'>('suggestions');
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null); // 新增錯誤狀態

  // 🔥 修復：添加超時保護的智能建議生成
  const generateSuggestions = useCallback(async () => {
    if (selectedCharacters.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // 超時保護：10秒後自動取消
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setError('⏱️ 智能建議生成超時，請重試或聯繫技術支援');
    }, 10000);

    try {
      const request: PromptSuggestionRequest = {
        characters: selectedCharacters.map(char => ({
          id: char.id,
          name: char.name,
          appearance: {
            hair_color: char.appearance || undefined,
            eye_color: undefined,
            skin_tone: undefined
          },
          personality: {
            traits: char.personality ? [char.personality] : [],
            mood: undefined
          },
          clothing: {
            style: undefined,
            colors: [],
            accessories: []
          }
        })),
        scene: {
          type: sceneType === 'scene' ? 'scene' : sceneType === 'portrait' ? 'portrait' : 'interaction',
          setting: sceneType === 'scene' ? '幻想世界' : '室內場景',
          characters: selectedCharacters.map(char => char.id)
        },
        stylePreferences: {
          artStyle: 'anime'
        },
        maxSuggestions: 8
      };

      const suggestions = await promptIntelligence.generateSuggestions(request);
      
      // 轉換為 SuggestionCard 格式
      const suggestionCards: SuggestionCard[] = suggestions.map((suggestion) => {
        // 將原始類別映射到 SuggestionCard 的類別
        let mappedCategory: SuggestionCard['category'] = 'character';
        const categoryStr = String(suggestion.category);
        if (categoryStr === 'portrait') mappedCategory = 'character';
        else if (categoryStr === 'scene') mappedCategory = 'scene';
        else if (categoryStr === 'interaction') mappedCategory = 'composition';
        else if (categoryStr === 'character' || categoryStr === 'style' || categoryStr === 'composition') {
          mappedCategory = categoryStr as SuggestionCard['category'];
        }

        return {
          id: suggestion.id,
          prompt: suggestion.text,
          confidence: suggestion.confidence,
          category: mappedCategory,
          reasoning: suggestion.description || '智能分析建議'
        };
      });

      clearTimeout(timeoutId); // 成功時清除超時
      setSuggestions(suggestionCards);
      log.debug('✅ 智能建議生成成功:', { count: suggestionCards.length });
    } catch (error) {
      clearTimeout(timeoutId); // 錯誤時清除超時
      log.error('❌ 智能建議生成失敗:', error);
      setError(error instanceof Error ? error.message : '智能建議生成失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCharacters, sceneType, promptIntelligence]);

  // 分析當前提示詞
  const analyzeCurrentPrompt = useCallback(async () => {
    if (!currentPrompt.trim()) return;

    try {
      const analysis = await promptIntelligence.analyzePrompt(currentPrompt);
      setAnalysisResult(analysis as unknown as Record<string, unknown>);
    } catch (error) {
      log.error('Failed to analyze prompt:', error);
    }
  }, [currentPrompt, promptIntelligence]);

  // 優化提示詞
  const optimizePrompt = useCallback(async (prompt: string) => {
    try {
      const optimized = promptIntelligence.optimizePrompt(prompt);
      onPromptOptimize(optimized);
      
      // 添加到歷史記錄
      promptIntelligence.addToHistory(optimized, { user_rating: 5 });
    } catch (error) {
      log.error('Failed to optimize prompt:', error);
    }
  }, [onPromptOptimize, promptIntelligence]);

  // 切換最愛狀態
  const toggleFavorite = useCallback((prompt: string) => {
    const isFavorite = promptIntelligence.state.favoritePrompts.some(fav => fav.text === prompt);
    if (isFavorite) {
      const favoriteToRemove = promptIntelligence.state.favoritePrompts.find(fav => fav.text === prompt);
      if (favoriteToRemove) {
        promptIntelligence.removeFromFavorites(favoriteToRemove.id);
      }
    } else {
      const newFavorite: PromptSuggestion = {
        id: `favorite-${Date.now()}`,
        text: prompt,
        category: 'style',
        confidence: 1.0,
        source: 'manual',
        weight: 1.0,
        tags: []
      };
      promptIntelligence.addToFavorites(newFavorite);
    }
  }, [promptIntelligence]);

  // 🔥 修復：優化 useEffect 依賴，避免無限循環
  useEffect(() => {
    if (selectedCharacters.length > 0) {
      generateSuggestions();
    } else {
      setSuggestions([]);
      setError(null);
    }
  }, [selectedCharacters.length, sceneType]); // 只監聽關鍵變化

  // 分析當前提示詞
  useEffect(() => {
    if (currentPrompt && activeTab === 'analysis') {
      analyzeCurrentPrompt();
    }
  }, [currentPrompt, activeTab, analyzeCurrentPrompt]);

  // 渲染信心度指示器
  const renderConfidenceIndicator = (confidence: number) => {
    const getColor = () => {
      if (confidence >= 0.8) return 'bg-green-500';
      if (confidence >= 0.6) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 h-2 bg-bg-light rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor()} transition-all duration-300`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
        <span className="text-xs text-text-secondary">{Math.round(confidence * 100)}%</span>
      </div>
    );
  };

  // 渲染建議卡片
  const renderSuggestionCard = (suggestion: SuggestionCard) => {
    const isFavorite = promptIntelligence.state.favoritePrompts.some(fav => fav.text === suggestion.prompt);
    
    return (
      <div key={suggestion.id} className="bg-bg-dark/80/50 border border-warm-gold/10 rounded-lg p-4 hover:border-warm-gold/50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-1 bg-bg-light rounded text-text-secondary/40">
              {suggestion.category}
            </span>
            {renderConfidenceIndicator(suggestion.confidence)}
          </div>
          <button
            onClick={() => toggleFavorite(suggestion.prompt)}
            className={`p-1 rounded hover:bg-bg-light transition-colors ${
              isFavorite ? 'text-yellow-400' : 'text-text-secondary/80'
            }`}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
        
        <p className="text-sm text-text-secondary/40 mb-3 leading-relaxed">
          {suggestion.prompt}
        </p>
        
        <p className="text-xs text-text-secondary/80 mb-3 italic">
          {suggestion.reasoning}
        </p>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onPromptSelect(suggestion.prompt)}
            className="flex-1 px-3 py-1 bg-gold-600 hover:bg-gold-700 text-white text-xs rounded transition-colors"
          >
            使用此提示詞
          </button>
          <button
            onClick={() => optimizePrompt(suggestion.prompt)}
            className="px-3 py-1 bg-warm-gold hover:bg-warm-gold text-white text-xs rounded transition-colors"
          >
            優化
          </button>
        </div>
      </div>
    );
  };

  // 渲染分析結果
  const renderAnalysisResult = () => {
    if (!analysisResult) {
      return (
        <div className="text-center text-text-secondary/80 py-8">
          <p>請輸入提示詞以進行分析</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-bg-dark/80/50 border border-warm-gold/10 rounded-lg p-4">
          <h4 className="text-sm font-medium text-warm-gold mb-2">📊 分析結果</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-text-secondary/80">複雜度:</span>
              <span className="ml-2 text-text-secondary/40">{String(analysisResult.complexity)}/10</span>
            </div>
            <div>
              <span className="text-text-secondary/80">清晰度:</span>
              <span className="ml-2 text-text-secondary/40">{String(analysisResult.clarity)}/10</span>
            </div>
            <div>
              <span className="text-text-secondary/80">創意性:</span>
              <span className="ml-2 text-text-secondary/40">{String(analysisResult.creativity)}/10</span>
            </div>
            <div>
              <span className="text-text-secondary/80">可執行性:</span>
              <span className="ml-2 text-text-secondary/40">{String(analysisResult.feasibility)}/10</span>
            </div>
          </div>
        </div>

        {analysisResult.suggestions && Array.isArray(analysisResult.suggestions) && analysisResult.suggestions.length > 0 ? (
          <div className="bg-bg-dark/80/50 border border-warm-gold/10 rounded-lg p-4">
            <h4 className="text-sm font-medium text-warm-gold mb-2">💡 改進建議</h4>
            <ul className="space-y-2">
              {(analysisResult.suggestions as string[]).map((suggestion: string, index: number) => (
                <li key={index} className="text-xs text-text-secondary/40 flex items-start">
                  <span className="text-warm-gold mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          onClick={() => optimizePrompt(currentPrompt)}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
        >
          自動優化此提示詞
        </button>
      </div>
    );
  };

  // 渲染歷史記錄
  const renderHistory = () => {
    const history = promptIntelligence.state.promptHistory;
    
    if (history.length === 0) {
      return (
        <div className="text-center text-text-secondary/80 py-8">
          <p>尚無歷史記錄</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {history.map((entry) => (
          <div key={entry.id} className="bg-bg-dark/80/50 border border-warm-gold/10 rounded-lg p-3">
            <div className="text-xs text-text-secondary/80 mb-2">
              {new Date(entry.timestamp).toLocaleString()}
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-text-secondary/80">提示詞:</span>
                <p className="text-sm text-text-secondary/40 mt-1">{entry.prompt}</p>
              </div>
              <div className="flex items-center space-x-4 text-xs text-text-secondary/80">
                <span>成功率: {Math.round(entry.success_rate * 100)}%</span>
                {entry.user_rating && (
                  <span>評分: {'★'.repeat(entry.user_rating)}</span>
                )}
                <span>使用: {entry.generated_images} 次</span>
              </div>
            </div>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => onPromptSelect(entry.prompt)}
                className="px-3 py-1 bg-gold-600 hover:bg-gold-700 text-white text-xs rounded transition-colors"
              >
                重新使用
              </button>
              <button
                onClick={() => toggleFavorite(entry.prompt)}
                className="px-3 py-1 bg-warm-gold hover:bg-warm-gold text-white text-xs rounded transition-colors"
              >
                加入最愛
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染最愛
  const renderFavorites = () => {
    const favorites = promptIntelligence.state.favoritePrompts;
    
    if (favorites.length === 0) {
      return (
        <div className="text-center text-text-secondary/80 py-8">
          <p>尚無最愛提示詞</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {favorites.map((favorite) => (
          <div key={favorite.id} className="bg-bg-dark/80/50 border border-warm-gold/10 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-1 bg-bg-light rounded text-text-secondary/40">
                  {favorite.category}
                </span>
                {favorite.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-warm-gold/20 text-warm-gold rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => toggleFavorite(favorite.text)}
                className="p-1 rounded hover:bg-bg-light transition-colors text-yellow-400"
              >
                ★
              </button>
            </div>
            
            <p className="text-sm text-text-secondary/40 mb-3 leading-relaxed">
              {favorite.text}
            </p>
            
            <div className="flex space-x-2">
              <button
                onClick={() => onPromptSelect(favorite.text)}
                className="flex-1 px-3 py-1 bg-gold-600 hover:bg-gold-700 text-white text-xs rounded transition-colors"
              >
                使用此提示詞
              </button>
              <button
                onClick={() => optimizePrompt(favorite.text)}
                className="px-3 py-1 bg-warm-gold hover:bg-warm-gold text-white text-xs rounded transition-colors"
              >
                優化
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`prompt-suggestion-panel bg-bg-light/50 backdrop-blur-sm/30 rounded-lg border border-warm-gold/10 ${className}`}>
      {/* 標題列 */}
      <div className="p-4 border-b border-warm-gold/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-warm-gold">🧠 智能提示詞助手</h3>
          <button
            onClick={generateSuggestions}
            disabled={isLoading || selectedCharacters.length === 0}
            className="px-3 py-1 bg-warm-gold hover:bg-warm-gold disabled:bg-bg-light disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          >
            {isLoading ? '生成中...' : '重新生成建議'}
          </button>
        </div>
      </div>

      {/* 標籤導航 */}
      <div className="flex border-b border-warm-gold/10">
        {(['suggestions', 'analysis', 'history', 'favorites'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-warm-gold text-warm-gold bg-bg-dark/80/50'
                : 'border-transparent text-text-secondary hover:text-text-secondary/40 hover:bg-bg-dark/80/30'
            }`}
          >
            {tab === 'suggestions' && '💡 建議'}
            {tab === 'analysis' && '📊 分析'}
            {tab === 'history' && '📜 歷史'}
            {tab === 'favorites' && '⭐ 最愛'}
          </button>
        ))}
      </div>

      {/* 內容區域 */}
      <div className="p-4">
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center text-text-secondary/80 py-8">
                <div className="animate-spin w-6 h-6 border-2 border-warm-gold border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>正在生成智能建議...</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-400 py-8">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <p className="mb-3">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      generateSuggestions();
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    重試
                  </button>
                </div>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map(renderSuggestionCard)
            ) : (
              <div className="text-center text-text-secondary/80 py-8">
                <p>請選擇角色以獲得智能建議</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && renderAnalysisResult()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'favorites' && renderFavorites()}
      </div>
    </div>
  );
};

export default PromptSuggestionPanel;