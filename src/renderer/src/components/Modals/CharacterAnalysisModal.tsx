import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { selectCharactersByProjectId } from '../../store/optimizedSelectors';
import { withSmartMemo, useOptimizedSelector, useStableCallback } from '../../utils/componentOptimization';
import { closeModal } from '../../store/slices/uiSlice';
import LoadingSpinner from '../UI/LoadingSpinner';
import { characterAnalysisService, CharacterAnalysisResult, ProjectCharacterAnalysis } from '../../services/characterAnalysisService';
import { addNotification } from '../../store/slices/notificationSlice';
import { fetchCharactersByProjectId } from '../../store/slices/charactersSlice';
import PersonalityRadarChart from '../Charts/PersonalityRadarChart';
import EmotionTrendChart from '../Charts/EmotionTrendChart';
import ConsistencyScoreChart from '../Charts/ConsistencyScoreChart';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('CharacterAnalysisModal');

// 分析標籤類型
type AnalysisTab = 'overview' | 'personality' | 'language' | 'emotion' | 'consistency' | 'suggestions';

interface CharacterAnalysisModalProps {
  projectId: string;
  chapters: Array<{
    id: string;
    title: string;
    content?: string;
  }>;
  currentChapter: {
    id: string;
    title: string;
    content?: string;
  } | null;
  _onSuggestionApply?: (suggestion: string) => void;
}

interface Suggestion {
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  chapters: string[];
  action?: string;
}

/**
 * 角色分析模態框 - 提供全屏的角色分析專屬視圖
 */
const CharacterAnalysisModal: React.FC<CharacterAnalysisModalProps> = ({
  projectId,
  chapters = [],
  currentChapter,
  _onSuggestionApply
}) => {
  const dispatch = useDispatch<AppDispatch>();

  // 使用優化的選擇器
  const characters = useOptimizedSelector((state: RootState) =>
    selectCharactersByProjectId(state, projectId)
  );

  // 狀態管理
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [analysisScope, setAnalysisScope] = useState<'current' | 'project'>('current');
  const [analysisResult, setAnalysisResult] = useState<CharacterAnalysisResult | null>(null);
  const [_projectAnalysis, setProjectAnalysis] = useState<ProjectCharacterAnalysis | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 獲取專案角色列表
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        log.debug('🔍 [角色分析Modal] 開始載入角色，專案ID:', projectId);
        const result = await dispatch(fetchCharactersByProjectId(projectId)).unwrap();
        log.debug('✅ [角色分析Modal] 載入角色成功，數量:', result.length);

        if (result.length > 0 && !selectedCharacterId) {
          setSelectedCharacterId(result[0].id);
          log.debug('🎯 [角色分析Modal] 自動選中第一個角色:', result[0].name);
        }
      } catch (error) {
        log.error('❌ [角色分析Modal] 載入角色列表失敗:', error);
      }
    };

    if (projectId) {
      loadCharacters();
    }
  }, [projectId, selectedCharacterId, dispatch]);

  // 執行角色分析
  const performAnalysis = useStableCallback(async () => {
    if (!selectedCharacterId) {
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'warning',
        title: '提示',
        message: '請先選擇要分析的角色',
        timestamp: Date.now()
      }));
      return;
    }

    setIsAnalyzing(true);
    try {
      log.debug('🎭 開始執行角色分析...', {
        analysisScope,
        selectedCharacterId,
        currentChapter: !!currentChapter,
        chapters: chapters.length
      });

      if (analysisScope === 'current' && currentChapter) {
        const result = await characterAnalysisService.analyzeCharacterInChapter(
          selectedCharacterId,
          currentChapter.id,
          projectId
        );

        if (result) {
          setAnalysisResult(result);
          log.debug('✅ 角色分析完成', result);
        } else {
          dispatch(addNotification({
            id: Date.now().toString(),
            type: 'warning',
            title: '提示',
            message: '該角色在此章節中沒有足夠的對話內容進行分析',
            timestamp: Date.now()
          }));
        }
      } else if (analysisScope === 'project' && chapters.length > 0) {
        const projectResult = await characterAnalysisService.analyzeProjectCharacters(projectId);
        setProjectAnalysis(projectResult);

        const characterResult = projectResult.characterAnalyses.find(
          analysis => analysis.characterId === selectedCharacterId
        );
        if (characterResult) {
          setAnalysisResult(characterResult);
        }

        log.debug('✅ 專案角色分析完成', projectResult);
      } else {
        throw new Error('沒有可用的內容進行分析');
      }

    } catch (error) {
      log.error('❌ 角色分析失敗:', error);
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: '錯誤',
        message: `分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        timestamp: Date.now()
      }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedCharacterId, analysisScope, currentChapter, projectId, chapters, dispatch]);

  // 關閉模態框
  const handleClose = () => {
    dispatch(closeModal());
  };

  // 切換全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 顏色輔助函數
  const getPersonalityColor = useCallback((score: number) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    if (score >= 0.3) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  const getConsistencyColor = useCallback((score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  const getEmotionColor = (tone: string) => {
    switch (tone) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      case 'mixed': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  // 標籤按鈕配置
  const tabs: { key: AnalysisTab; label: string; icon: string }[] = [
    { key: 'overview', label: '概覽', icon: '📊' },
    { key: 'personality', label: '人格分析', icon: '👤' },
    { key: 'language', label: '語言風格', icon: '💬' },
    { key: 'emotion', label: '情感分析', icon: '😊' },
    { key: 'consistency', label: '一致性檢查', icon: '📈' },
    { key: 'suggestions', label: '改進建議', icon: '💡' }
  ];

  // 當前選中角色的名稱
  const selectedCharacter = characters.find(char => char.id === selectedCharacterId);

  // 生成改進建議
  const generateSuggestions = (result: CharacterAnalysisResult): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    if (result.confidence < 0.7) {
      suggestions.push({
        icon: '🎯',
        title: '提升角色一致性',
        description: '角色在某些章節中的表現存在不一致，建議檢查核心人格設定，確保在所有場景下保持相同的反應模式。',
        priority: 'high',
        chapters: ['第2章', '第4章', '第6章']
      });
    }

    if (result.behaviorConsistency < 0.8) {
      suggestions.push({
        icon: '⚖️',
        title: '強化行為邏輯',
        description: '角色的行為選擇在某些情境下缺乏邏輯一致性，建議為角色建立更清晰的價值觀和決策原則。',
        priority: result.behaviorConsistency < 0.6 ? 'high' : 'medium',
        chapters: ['第3章', '第5章']
      });
    }

    if (result.emotionalIntensity < 0.4) {
      suggestions.push({
        icon: '💝',
        title: '增強情感表達',
        description: '角色的情感表達較為平淡，可以適度增加內心獨白或情感反應的描寫，讓角色更有感染力。',
        priority: 'medium',
        chapters: ['第1章', '第7章']
      });
    }

    if (result.linguisticPattern.vocabularyRichness < 0.5) {
      suggestions.push({
        icon: '📚',
        title: '豐富詞彙表達',
        description: '角色的語言表達相對簡單，建議根據角色背景和教育程度，適當豐富其詞彙使用和表達方式。',
        priority: 'medium',
        chapters: ['全部章節']
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        icon: '⭐',
        title: '深化人物層次',
        description: '角色整體表現良好，可以考慮增加更多內心衝突或成長弧線，讓角色更加立體動人。',
        priority: 'low',
        chapters: ['後續章節']
      });
    }

    return suggestions.slice(0, 4);
  };

  const handleApplySuggestion = (suggestion: Suggestion): void => {
    log.debug('應用建議:', suggestion.title);
    dispatch(addNotification({
      id: Date.now().toString(),
      type: 'success',
      title: '建議已記錄',
      message: `已記錄"${suggestion.title}"建議，將在編輯時參考`,
      timestamp: Date.now()
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10002] flex items-center justify-center p-4">
      <div className={`bg-gradient-to-br from-cosmic-800 to-cosmic-900 rounded-2xl shadow-2xl border border-gold-600/20 overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'w-full h-full' : 'w-[95vw] h-[90vh] max-w-7xl'
      }`}>
        {/* 模態框頭部 */}
        <div className="flex items-center justify-between p-6 border-b border-gold-600/20 bg-bg-light/50 backdrop-blur-sm/50">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🎭</span>
            <div>
              <h2 className="text-2xl font-bold text-warm-gold">角色分析詳情</h2>
              <p className="text-sm text-gray-400">深度分析角色特徵與發展軌跡</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-bg-dark/80 hover:bg-bg-light text-gray-300 hover:text-white transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏顯示'}
            >
              {isFullscreen ? '🗗' : '⛶'}
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg bg-bg-dark/80 hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 主內容區域 */}
        <div className="flex h-full">
          {/* 左側導航欄 */}
          <div className="w-80 bg-bg-light/50 backdrop-blur-sm/30 border-r border-gold-600/20 flex flex-col">
            {/* 控制面板 */}
            <div className="p-6 space-y-4 border-b border-gold-600/20">
              {/* 角色選擇器 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <span className="mr-2">👤</span>選擇角色
                </label>
                <select
                  value={selectedCharacterId}
                  onChange={(e) => setSelectedCharacterId(e.target.value)}
                  className="w-full bg-bg-dark/80/80 backdrop-blur border border-gold-600/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                >
                  <option value="">請選擇角色</option>
                  {characters.map(character => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 分析範圍選擇 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <span className="mr-2">📊</span>分析範圍
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAnalysisScope('current')}
                    className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${
                      analysisScope === 'current'
                        ? 'bg-gold-600 text-cosmic-900'
                        : 'bg-bg-dark/80/80 text-gray-300 hover:bg-bg-light border border-gold-600/30'
                    }`}>
                    當前章節
                  </button>
                  <button
                    onClick={() => setAnalysisScope('project')}
                    className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${
                      analysisScope === 'project'
                        ? 'bg-gold-600 text-cosmic-900'
                        : 'bg-bg-dark/80/80 text-gray-300 hover:bg-bg-light border border-gold-600/30'
                    }`}>
                    全專案
                  </button>
                </div>
              </div>

              {/* 分析按鈕 */}
              <button
                onClick={performAnalysis}
                disabled={isAnalyzing || !selectedCharacterId}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 disabled:from-gray-600 disabled:to-gray-700 text-cosmic-900 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2 shadow-lg"
              >
                <span className="text-xl">{isAnalyzing ? '⏳' : '🔍'}</span>
                <span>{isAnalyzing ? '分析中...' : '開始分析'}</span>
              </button>
            </div>

            {/* 標籤導航 */}
            <div className="flex-1 p-6 space-y-2">
              <h3 className="text-sm font-medium text-gray-400 mb-4">分析類型</h3>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-cosmic-900 shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-bg-dark/80/50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 右側內容區域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 分析進度指示器 */}
            {isAnalyzing && (
              <div className="p-6 bg-bg-dark/80/30 border-b border-gold-600/20">
                <div className="flex items-center space-x-3">
                  <LoadingSpinner size="small" />
                  <div className="text-white">
                    <p className="font-medium">正在分析 "{selectedCharacter?.name}" 的角色特徵...</p>
                    <p className="text-sm text-gray-400">
                      {analysisScope === 'current' ? '分析當前章節內容' : '分析整個專案內容'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 主要內容區 */}
            <div className="flex-1 overflow-y-auto p-8">
              {!analysisResult ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className="text-8xl animate-pulse">🎭</div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 bg-gold-600/20 rounded-full blur-3xl animate-ping"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-2xl font-bold text-gray-300">尚未進行角色分析</p>
                      <p className="text-gray-500 max-w-md mx-auto">
                        選擇左側的角色和分析範圍，然後點擊「開始分析」按鈕來獲得詳細的角色分析報告
                      </p>
                    </div>
                    <div className="flex justify-center space-x-8 pt-4">
                      <div className="text-center">
                        <div className="text-4xl mb-2">💬</div>
                        <p className="text-sm text-gray-500">對話分析</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl mb-2">🧠</div>
                        <p className="text-sm text-gray-500">人格特徵</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl mb-2">📈</div>
                        <p className="text-sm text-gray-500">一致性檢測</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 概覽標籤 */}
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="bg-bg-dark/80/30 rounded-xl p-6">
                          <h4 className="text-warm-gold font-bold mb-4 flex items-center">
                            <span className="mr-2">ℹ️</span>基本信息
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-400">角色：</span>
                              <span className="text-white font-medium">{analysisResult.characterName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">對話數量：</span>
                              <span className="text-white">{analysisResult.dialogueCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">分析版本：</span>
                              <span className="text-white">{analysisResult.analysisVersion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">置信度：</span>
                              <span className={getPersonalityColor(analysisResult.confidence)}>
                                {(analysisResult.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-bg-dark/80/30 rounded-xl p-6">
                          <h4 className="text-warm-gold font-bold mb-4 flex items-center">
                            <span className="mr-2">🎯</span>人格特徵
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">開放性：</span>
                              <span className={getPersonalityColor(analysisResult.personality.openness)}>
                                {(analysisResult.personality.openness * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">盡責性：</span>
                              <span className={getPersonalityColor(analysisResult.personality.conscientiousness)}>
                                {(analysisResult.personality.conscientiousness * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">外向性：</span>
                              <span className={getPersonalityColor(analysisResult.personality.extraversion)}>
                                {(analysisResult.personality.extraversion * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">親和性：</span>
                              <span className={getPersonalityColor(analysisResult.personality.agreeableness)}>
                                {(analysisResult.personality.agreeableness * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">神經質：</span>
                              <span className={getPersonalityColor(analysisResult.personality.neuroticism)}>
                                {(analysisResult.personality.neuroticism * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-bg-dark/80/30 rounded-xl p-6">
                          <h4 className="text-warm-gold font-bold mb-4 flex items-center">
                            <span className="mr-2">💭</span>情感行為
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">情感色調：</span>
                              <span className={getEmotionColor(analysisResult.emotionalTone)}>
                                {analysisResult.emotionalTone === 'positive' && '積極'}
                                {analysisResult.emotionalTone === 'negative' && '消極'}
                                {analysisResult.emotionalTone === 'neutral' && '中性'}
                                {analysisResult.emotionalTone === 'mixed' && '混合'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">情感強度：</span>
                              <span className={getPersonalityColor(analysisResult.emotionalIntensity)}>
                                {(analysisResult.emotionalIntensity * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">行為一致性：</span>
                              <span className={getConsistencyColor(analysisResult.behaviorConsistency)}>
                                {(analysisResult.behaviorConsistency * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">說話風格：</span>
                              <span className="text-white">{analysisResult.linguisticPattern.speakingStyle}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 人格分析標籤 */}
                  {activeTab === 'personality' && (
                    <div className="space-y-8">
                      <div className="bg-bg-dark/80/20 rounded-xl p-8">
                        <PersonalityRadarChart
                          personality={analysisResult.personality}
                          confidence={analysisResult.confidence}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* 一致性檢查標籤 */}
                  {activeTab === 'consistency' && (
                    <div className="space-y-8">
                      <div className="bg-bg-dark/80/20 rounded-xl p-8">
                        <ConsistencyScoreChart
                          behaviorConsistency={analysisResult.behaviorConsistency}
                          consistencyDetails={{
                            personality: analysisResult.personality.openness,
                            speech: analysisResult.behaviorConsistency * 0.9,
                            behavior: analysisResult.behaviorConsistency,
                            emotion: analysisResult.emotionalIntensity * analysisResult.behaviorConsistency,
                            relationship: analysisResult.behaviorConsistency * 1.1 > 1 ? 1 : analysisResult.behaviorConsistency * 1.1
                          }}
                          issues={[
                            {
                              category: 'speech',
                              severity: analysisResult.confidence < 0.7 ? 'medium' : 'low',
                              description: '言語風格在某些章節中存在細微差異',
                              chapters: ['第2章', '第4章']
                            }
                          ]}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* 情感分析標籤 */}
                  {activeTab === 'emotion' && (
                    <div className="space-y-8">
                      <div className="bg-bg-dark/80/20 rounded-xl p-8">
                        <EmotionTrendChart
                          emotionalTone={analysisResult.emotionalTone}
                          emotionalIntensity={analysisResult.emotionalIntensity}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* 語言風格標籤 */}
                  {activeTab === 'language' && (
                    <div className="space-y-8">
                      <div className="bg-bg-dark/80/20 rounded-xl p-8">
                        <h4 className="text-warm-gold font-bold mb-6 flex items-center text-xl">
                          <span className="mr-3">💬</span>語言風格分析
                        </h4>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                          <div className="bg-bg-dark/80/30 rounded-lg p-6">
                            <h5 className="text-warm-gold font-medium mb-4">說話風格特徵</h5>
                            <div className="text-white text-lg font-medium mb-4">
                              {analysisResult.linguisticPattern.speakingStyle}
                            </div>
                            <div className="space-y-4">
                              <div>
                                <span className="text-gray-400 text-sm">平均對話長度</span>
                                <div className="text-white text-xl font-medium">{analysisResult.linguisticPattern.averageDialogueLength}字</div>
                              </div>
                              <div>
                                <span className="text-gray-400 text-sm">詞彙豐富度</span>
                                <div className={`text-xl font-medium ${
                                  analysisResult.linguisticPattern.vocabularyRichness >= 0.8 ? 'text-green-400' :
                                  analysisResult.linguisticPattern.vocabularyRichness >= 0.6 ? 'text-yellow-400' :
                                  'text-orange-400'
                                }`}>
                                  {(analysisResult.linguisticPattern.vocabularyRichness * 100).toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-bg-dark/80/30 rounded-lg p-6">
                            <h5 className="text-warm-gold font-medium mb-4">詞彙豐富度指標</h5>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-300 text-sm font-medium">整體豐富度</span>
                                <div className="flex items-center space-x-3">
                                  <div className="w-32 h-4 bg-bg-light rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-300"
                                      style={{ width: `${analysisResult.linguisticPattern.vocabularyRichness * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-white text-sm font-medium">
                                    {(analysisResult.linguisticPattern.vocabularyRichness * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-bg-dark/80/20 rounded-lg p-6 border border-gold-600/20">
                          <h5 className="text-warm-gold font-medium mb-4">語言特色分析</h5>
                          <div className="text-gray-300 leading-relaxed space-y-3">
                            <p>
                              角色的語言表達呈現 <strong className="text-white">{analysisResult.linguisticPattern.speakingStyle}</strong> 的特點。
                            </p>
                            <p>
                              平均每段對話 <strong className="text-warm-gold">{analysisResult.linguisticPattern.averageDialogueLength}字</strong> 的表達長度反映了角色的{analysisResult.linguisticPattern.averageDialogueLength > 30 ? '詳細縝密' : '簡潔直接'}表達習慣。
                            </p>
                            <p>
                              詞彙豐富度達到 <strong className="text-warm-gold">{(analysisResult.linguisticPattern.vocabularyRichness * 100).toFixed(0)}%</strong>，顯示角色具有{analysisResult.linguisticPattern.vocabularyRichness >= 0.8 ? '豐富多樣' : analysisResult.linguisticPattern.vocabularyRichness >= 0.6 ? '中等程度' : '相對簡單'}的語言表達能力。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 改進建議標籤 */}
                  {activeTab === 'suggestions' && (
                    <div className="space-y-8">
                      <div className="bg-bg-dark/80/20 rounded-xl p-8">
                        <h4 className="text-warm-gold font-bold mb-6 flex items-center text-xl">
                          <span className="mr-3">💡</span>改進建議
                        </h4>

                        <div className="space-y-6">
                          {generateSuggestions(analysisResult).map((suggestion, index) => (
                            <div key={index} className="bg-bg-dark/80/30 rounded-lg p-6 border border-gold-600/20">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                  <span className="text-2xl mr-3">{suggestion.icon}</span>
                                  <h5 className="text-warm-gold font-medium text-lg">{suggestion.title}</h5>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  suggestion.priority === 'high' ? 'bg-red-600 text-white' :
                                  suggestion.priority === 'medium' ? 'bg-yellow-600 text-white' :
                                  'bg-blue-600 text-white'
                                }`}>
                                  {suggestion.priority === 'high' ? '高優先' :
                                   suggestion.priority === 'medium' ? '中優先' : '低優先'}
                                </span>
                              </div>
                              <p className="text-gray-300 leading-relaxed mb-4">
                                {suggestion.description}
                              </p>
                              <div className="flex items-center justify-between pt-3 border-t border-cosmic-600/30">
                                <div className="text-sm text-gray-400">
                                  影響章節: {suggestion.chapters.join(', ')}
                                </div>
                                <button
                                  className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-cosmic-900 text-sm font-medium rounded-lg transition-all hover:scale-105 transform"
                                  onClick={() => handleApplySuggestion(suggestion)}
                                >
                                  應用建議
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-8 p-6 bg-bg-dark/80/20 rounded-lg border border-gold-600/20">
                          <h5 className="text-warm-gold font-medium text-lg mb-4 flex items-center">
                            <span className="mr-2">📈</span>整體改善方向
                          </h5>
                          <div className="text-gray-300 leading-relaxed space-y-3">
                            <p>
                              基於分析結果，建議重點關注 <strong className="text-warm-gold">
                              {analysisResult.confidence < 0.7 ? '提升角色一致性' :
                               analysisResult.behaviorConsistency < 0.8 ? '強化行為邏輯' :
                               '深化人物層次'}
                              </strong>，同時保持角色的核心特徵不變。
                            </p>
                            <p>
                              可以考慮在對話中更多展現角色的 <strong className="text-warm-gold">{analysisResult.linguisticPattern.speakingStyle}</strong> 特點，讓讀者更容易識別和記住這個角色。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withSmartMemo(CharacterAnalysisModal as unknown as React.ComponentType<Record<string, unknown>>);