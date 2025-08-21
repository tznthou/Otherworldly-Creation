import React, { useState, useEffect, useCallback } from 'react';
import { usePromptIntelligence, type PromptSuggestionRequest, type PromptSuggestion } from '../../../../hooks/illustration/usePromptIntelligence';
import type { Character } from '../../../../types/character';
import type { StyleTemplate } from '../../../../types/styleTemplate';

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
  styleTemplate,
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
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 生成智能建議
  const generateSuggestions = useCallback(async () => {
    if (selectedCharacters.length === 0) return;

    setIsLoading(true);
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
      const suggestionCards: SuggestionCard[] = suggestions.map((suggestion) => ({
        id: suggestion.id,
        prompt: suggestion.text,
        confidence: suggestion.confidence,
        category: suggestion.category as any,
        reasoning: suggestion.description || '智能分析建議'
      }));

      setSuggestions(suggestionCards);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCharacters, sceneType, styleTemplate]);

  // 分析當前提示詞
  const analyzeCurrentPrompt = useCallback(async () => {
    if (!currentPrompt.trim()) return;

    try {
      const analysis = await promptIntelligence.analyzePrompt(currentPrompt);
      setAnalysisResult(analysis);
    } catch (error) {
      console.error('Failed to analyze prompt:', error);
    }
  }, [currentPrompt]);

  // 優化提示詞
  const optimizePrompt = useCallback(async (prompt: string) => {
    try {
      const optimized = promptIntelligence.optimizePrompt(prompt);
      onPromptOptimize(optimized);
      
      // 添加到歷史記錄
      promptIntelligence.addToHistory(optimized, { user_rating: 5 });
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
    }
  }, [onPromptOptimize]);

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
  }, []);

  // 初始化建議
  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

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
        <div className="w-16 h-2 bg-cosmic-600 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor()} transition-all duration-300`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
        <span className="text-xs text-cosmic-300">{Math.round(confidence * 100)}%</span>
      </div>
    );
  };

  // 渲染建議卡片
  const renderSuggestionCard = (suggestion: SuggestionCard) => {
    const isFavorite = promptIntelligence.state.favoritePrompts.some(fav => fav.text === suggestion.prompt);
    
    return (
      <div key={suggestion.id} className="bg-cosmic-700/50 border border-cosmic-600 rounded-lg p-4 hover:border-gold-500/50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-1 bg-cosmic-600 rounded text-cosmic-200">
              {suggestion.category}
            </span>
            {renderConfidenceIndicator(suggestion.confidence)}
          </div>
          <button
            onClick={() => toggleFavorite(suggestion.prompt)}
            className={`p-1 rounded hover:bg-cosmic-600 transition-colors ${
              isFavorite ? 'text-yellow-400' : 'text-cosmic-400'
            }`}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
        
        <p className="text-sm text-cosmic-200 mb-3 leading-relaxed">
          {suggestion.prompt}
        </p>
        
        <p className="text-xs text-cosmic-400 mb-3 italic">
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
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
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
        <div className="text-center text-cosmic-400 py-8">
          <p>請輸入提示詞以進行分析</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-cosmic-700/50 border border-cosmic-600 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gold-500 mb-2">📊 分析結果</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-cosmic-400">複雜度:</span>
              <span className="ml-2 text-cosmic-200">{analysisResult.complexity}/10</span>
            </div>
            <div>
              <span className="text-cosmic-400">清晰度:</span>
              <span className="ml-2 text-cosmic-200">{analysisResult.clarity}/10</span>
            </div>
            <div>
              <span className="text-cosmic-400">創意性:</span>
              <span className="ml-2 text-cosmic-200">{analysisResult.creativity}/10</span>
            </div>
            <div>
              <span className="text-cosmic-400">可執行性:</span>
              <span className="ml-2 text-cosmic-200">{analysisResult.feasibility}/10</span>
            </div>
          </div>
        </div>

        {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
          <div className="bg-cosmic-700/50 border border-cosmic-600 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gold-500 mb-2">💡 改進建議</h4>
            <ul className="space-y-2">
              {analysisResult.suggestions.map((suggestion: string, index: number) => (
                <li key={index} className="text-xs text-cosmic-200 flex items-start">
                  <span className="text-gold-400 mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

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
        <div className="text-center text-cosmic-400 py-8">
          <p>尚無歷史記錄</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {history.map((entry) => (
          <div key={entry.id} className="bg-cosmic-700/50 border border-cosmic-600 rounded-lg p-3">
            <div className="text-xs text-cosmic-400 mb-2">
              {new Date(entry.timestamp).toLocaleString()}
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-cosmic-400">提示詞:</span>
                <p className="text-sm text-cosmic-200 mt-1">{entry.prompt}</p>
              </div>
              <div className="flex items-center space-x-4 text-xs text-cosmic-400">
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
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
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
        <div className="text-center text-cosmic-400 py-8">
          <p>尚無最愛提示詞</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {favorites.map((favorite) => (
          <div key={favorite.id} className="bg-cosmic-700/50 border border-cosmic-600 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-1 bg-cosmic-600 rounded text-cosmic-200">
                  {favorite.category}
                </span>
                {favorite.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-gold-600/20 text-gold-400 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => toggleFavorite(favorite.text)}
                className="p-1 rounded hover:bg-cosmic-600 transition-colors text-yellow-400"
              >
                ★
              </button>
            </div>
            
            <p className="text-sm text-cosmic-200 mb-3 leading-relaxed">
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
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
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
    <div className={`prompt-suggestion-panel bg-cosmic-800/30 rounded-lg border border-cosmic-700 ${className}`}>
      {/* 標題列 */}
      <div className="p-4 border-b border-cosmic-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gold-500">🧠 智能提示詞助手</h3>
          <button
            onClick={generateSuggestions}
            disabled={isLoading || selectedCharacters.length === 0}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-cosmic-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
          >
            {isLoading ? '生成中...' : '重新生成建議'}
          </button>
        </div>
      </div>

      {/* 標籤導航 */}
      <div className="flex border-b border-cosmic-700">
        {(['suggestions', 'analysis', 'history', 'favorites'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-gold-500 text-gold-500 bg-cosmic-700/50'
                : 'border-transparent text-cosmic-300 hover:text-cosmic-200 hover:bg-cosmic-700/30'
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
              <div className="text-center text-cosmic-400 py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>正在生成智能建議...</p>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map(renderSuggestionCard)
            ) : (
              <div className="text-center text-cosmic-400 py-8">
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