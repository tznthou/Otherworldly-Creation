import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { selectCharactersByProjectId, selectFilteredCharacters } from '../../store/optimizedSelectors';
import { withSmartMemo, useOptimizedSelector, useStableCallback, useDebounce } from '../../utils/componentOptimization';
import LoadingSpinner from '../UI/LoadingSpinner';
// import { api } from '../../api'; // 暫時不使用
import { characterAnalysisService, CharacterAnalysisResult, ProjectCharacterAnalysis } from '../../services/characterAnalysisService';
import { addNotification } from '../../store/slices/notificationSlice';
import { fetchCharactersByProjectId } from '../../store/slices/charactersSlice';
import PersonalityRadarChart from '../Charts/PersonalityRadarChart';
import EmotionTrendChart from '../Charts/EmotionTrendChart';
import ConsistencyScoreChart from '../Charts/ConsistencyScoreChart';

// 分析標籤類型
type AnalysisTab = 'overview' | 'personality' | 'language' | 'emotion' | 'consistency' | 'suggestions';

interface CharacterAnalysisPanelProps {
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

/**
 * 角色分析面板 - 提供全面的角色分析功能
 */
const CharacterAnalysisPanel: React.FC<CharacterAnalysisPanelProps> = ({
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
  const charactersLoading = useOptimizedSelector((state: RootState) => state.characters.loading);
  const charactersError = useOptimizedSelector((state: RootState) => state.characters.error);
  
  // 防抖的角色數據，避免頻繁重新分析
  const debouncedCharacters = useDebounce(characters, 300);
  
  // 調試：監控Redux狀態變化
  useEffect(() => {
    console.log('🔄 [角色分析] Redux狀態更新，角色數量:', characters.length, '角色列表:', characters.map(c => ({id: c.id, name: c.name, projectId: c.projectId})));
  }, [characters]);
  
  // 狀態管理
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [analysisScope, setAnalysisScope] = useState<'current' | 'project'>('current');
  const [analysisResult, setAnalysisResult] = useState<CharacterAnalysisResult | null>(null);
  const [_projectAnalysis, setProjectAnalysis] = useState<ProjectCharacterAnalysis | null>(null);

  // 獲取專案角色列表
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        console.log('🔍 [角色分析] 開始載入角色，專案ID:', projectId);
        // 使用Redux action載入角色
        const result = await dispatch(fetchCharactersByProjectId(projectId)).unwrap();
        console.log('✅ [角色分析] 載入角色成功，數量:', result.length, '角色:', result.map(c => ({id: c.id, name: c.name})));
        
        if (result.length > 0 && !selectedCharacterId) {
          setSelectedCharacterId(result[0].id);
          console.log('🎯 [角色分析] 自動選中第一個角色:', result[0].name);
        }
      } catch (error) {
        console.error('❌ [角色分析] 載入角色列表失敗:', error);
      }
    };
    
    if (projectId) {
      loadCharacters();
    }
  }, [projectId, selectedCharacterId, dispatch]);

  // 使用穩定的回調函數，避免不必要的重新渲染
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
      console.log('🎭 開始執行角色分析...', { 
        analysisScope, 
        selectedCharacterId, 
        currentChapter: !!currentChapter, 
        chapters: chapters.length 
      });
      
      if (analysisScope === 'current' && currentChapter) {
        // 分析當前章節中的角色表現
        const result = await characterAnalysisService.analyzeCharacterInChapter(
          selectedCharacterId,
          currentChapter.id,
          projectId
        );
        
        if (result) {
          setAnalysisResult(result);
          console.log('✅ 角色分析完成', result);
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
        // 分析整個專案的角色表現
        const projectResult = await characterAnalysisService.analyzeProjectCharacters(projectId);
        setProjectAnalysis(projectResult);
        
        // 提取當前選中角色的分析結果
        const characterResult = projectResult.characterAnalyses.find(
          analysis => analysis.characterId === selectedCharacterId
        );
        if (characterResult) {
          setAnalysisResult(characterResult);
        }
        
        console.log('✅ 專案角色分析完成', projectResult);
      } else {
        throw new Error('沒有可用的內容進行分析');
      }
      
    } catch (error) {
      console.error('❌ 角色分析失敗:', error);
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

  // 記憶化的人格特徵顏色獲取函數
  const getPersonalityColor = useCallback((score: number) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    if (score >= 0.3) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  // 記憶化的一致性顏色獲取函數
  const getConsistencyColor = useCallback((score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  // 獲取情感色調顏色
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

  return (
    <div className="bg-gradient-to-br from-cosmic-800 to-cosmic-900 rounded-xl shadow-2xl border border-gold-600/20 p-6">
      {/* 頭部控制區 */}
      <div className="space-y-6 mb-8">
        {/* 標題 */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gold-400 flex items-center">
            <span className="mr-3 text-2xl">🎭</span>
            角色分析
          </h3>
          <div className="text-xs text-gray-500">
            版本 v2.0 | Phase 2 功能
          </div>
        </div>
        
        {/* 控制選項 - 改善間距和佈局 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 角色選擇器 */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <span className="mr-2">👤</span>
              選擇角色
            </label>
            <select
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="bg-cosmic-700/80 backdrop-blur border border-gold-600/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
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
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center">
              <span className="mr-2">📊</span>
              分析範圍
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAnalysisScope('current')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  analysisScope === 'current'
                    ? 'bg-gold-600 text-cosmic-900'
                    : 'bg-cosmic-700/80 text-gray-300 hover:bg-cosmic-600 border border-gold-600/30'
                }`}>
                當前章節
              </button>
              <button
                onClick={() => setAnalysisScope('project')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  analysisScope === 'project'
                    ? 'bg-gold-600 text-cosmic-900'
                    : 'bg-cosmic-700/80 text-gray-300 hover:bg-cosmic-600 border border-gold-600/30'
                }`}>
                全專案
              </button>
            </div>
          </div>

          {/* 分析按鈕 */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-300 invisible">操作</label>
            <button
              onClick={performAnalysis}
              disabled={isAnalyzing || !selectedCharacterId}
              className="bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 disabled:from-gray-600 disabled:to-gray-700 text-cosmic-900 px-6 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span className="text-xl">{isAnalyzing ? '⏳' : '🔍'}</span>
              <span>{isAnalyzing ? '分析中...' : '開始分析'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 分析進度指示器 */}
      {isAnalyzing && (
        <div className="mb-4 p-4 bg-cosmic-700/50 rounded-lg border border-gold-600/20">
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

      {/* 標籤導航 - 改為2x3網格佈局 */}
      <div className="grid grid-cols-3 gap-2 mb-6 bg-cosmic-700/30 rounded-xl p-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              activeTab === tab.key
                ? 'bg-gradient-to-br from-gold-600 to-gold-500 text-cosmic-900 shadow-lg'
                : 'bg-cosmic-700/50 text-gray-400 hover:text-white hover:bg-cosmic-600'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 分析結果內容 */}
      <div className="min-h-[400px] bg-cosmic-800/30 rounded-xl p-6">
        {!analysisResult ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="text-8xl animate-pulse">🎭</div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gold-600/20 rounded-full blur-3xl animate-ping"></div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-gray-300">尚未進行角色分析</p>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  選擇角色和分析範圍，然後點擊「開始分析」按鈕
                </p>
              </div>
              <div className="flex justify-center space-x-4 pt-4">
                <div className="text-center">
                  <div className="text-3xl mb-1">💬</div>
                  <p className="text-xs text-gray-500">對話分析</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-1">🧠</div>
                  <p className="text-xs text-gray-500">人格特徵</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-1">📈</div>
                  <p className="text-xs text-gray-500">一致性檢測</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 概覽標籤 */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 基本信息 */}
                  <div className="bg-cosmic-700/50 rounded-lg p-4">
                    <h4 className="text-gold-400 font-bold mb-2 flex items-center">
                      <span className="mr-2">ℹ️</span>基本信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">角色：</span>{analysisResult.characterName}</div>
                      <div><span className="text-gray-400">對話數量：</span>{analysisResult.dialogueCount}</div>
                      <div><span className="text-gray-400">分析版本：</span>{analysisResult.analysisVersion}</div>
                      <div><span className="text-gray-400">置信度：</span>
                        <span className={getPersonalityColor(analysisResult.confidence)}>
                          {(analysisResult.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 人格特徵雷達 */}
                  <div className="bg-cosmic-700/50 rounded-lg p-4">
                    <h4 className="text-gold-400 font-bold mb-2 flex items-center">
                      <span className="mr-2">🎯</span>人格特徵
                    </h4>
                    <div className="space-y-2 text-sm">
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

                  {/* 情感和行為 */}
                  <div className="bg-cosmic-700/50 rounded-lg p-4">
                    <h4 className="text-gold-400 font-bold mb-2 flex items-center">
                      <span className="mr-2">💭</span>情感行為
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">情感色調：</span>
                        <span className={getEmotionColor(analysisResult.emotionalTone)}>
                          {analysisResult.emotionalTone === 'positive' && '積極'}
                          {analysisResult.emotionalTone === 'negative' && '消極'}
                          {analysisResult.emotionalTone === 'neutral' && '中性'}
                          {analysisResult.emotionalTone === 'mixed' && '混合'}
                        </span>
                      </div>
                      <div><span className="text-gray-400">情感強度：</span>
                        <span className={getPersonalityColor(analysisResult.emotionalIntensity)}>
                          {(analysisResult.emotionalIntensity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div><span className="text-gray-400">行為一致性：</span>
                        <span className={getConsistencyColor(analysisResult.behaviorConsistency)}>
                          {(analysisResult.behaviorConsistency * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div><span className="text-gray-400">說話風格：</span>
                        <span className="text-white">{analysisResult.linguisticPattern.speakingStyle}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 人格分析標籤 */}
            {activeTab === 'personality' && (
              <div className="space-y-4">
                <PersonalityRadarChart
                  personality={analysisResult.personality}
                  confidence={analysisResult.confidence}
                  className="w-full"
                />
              </div>
            )}

            {/* 一致性檢查標籤 */}
            {activeTab === 'consistency' && (
              <div className="space-y-4">
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
            )}

            {/* 情感分析標籤 */}
            {activeTab === 'emotion' && (
              <div className="space-y-4">
                <EmotionTrendChart
                  emotionalTone={analysisResult.emotionalTone}
                  emotionalIntensity={analysisResult.emotionalIntensity}
                  className="w-full"
                />
              </div>
            )}

            {/* 語言風格標籤 */}
            {activeTab === 'language' && (
              <div className="space-y-4">
                <div className="bg-cosmic-800/30 rounded-lg p-6">
                  <h4 className="text-gold-400 font-bold mb-4 flex items-center">
                    <span className="mr-2">💬</span>語言風格分析
                  </h4>
                  
                  {/* 說話風格 */}
                  <div className="mb-6">
                    <h5 className="text-gold-300 font-medium text-sm mb-3">說話風格特徵</h5>
                    <div className="bg-cosmic-700/50 rounded-lg p-4">
                      <div className="text-white text-lg font-medium mb-2">
                        {analysisResult.linguisticPattern.speakingStyle}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">平均對話長度：</span>
                          <span className="text-white">{analysisResult.linguisticPattern.averageDialogueLength}字</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">詞彙豐富度：</span>
                          <span className={`${
                            analysisResult.linguisticPattern.vocabularyRichness >= 0.8 ? 'text-green-400' :
                            analysisResult.linguisticPattern.vocabularyRichness >= 0.6 ? 'text-yellow-400' :
                            'text-orange-400'
                          }`}>
                            {(analysisResult.linguisticPattern.vocabularyRichness * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 詞彙豐富度視覺化 */}
                  <div className="mb-6">
                    <h5 className="text-gold-300 font-medium text-sm mb-3">詞彙豐富度指標</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">整體豐富度</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 h-2 bg-cosmic-600 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-gold-600 to-gold-400"
                              style={{ width: `${analysisResult.linguisticPattern.vocabularyRichness * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white text-sm w-8">
                            {(analysisResult.linguisticPattern.vocabularyRichness * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 語言特色 */}
                  <div>
                    <h5 className="text-gold-300 font-medium text-sm mb-3">語言特色分析</h5>
                    <div className="bg-cosmic-700/20 rounded-lg p-4 border border-gold-600/20">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        角色的語言表達呈現<strong className="text-white">{analysisResult.linguisticPattern.speakingStyle}</strong>的特點。
                        平均每段對話<strong className="text-gold-300">{analysisResult.linguisticPattern.averageDialogueLength}字</strong>的表達長度
                        反映了角色的{analysisResult.linguisticPattern.averageDialogueLength > 30 ? '詳細縝密' : '簡潔直接'}表達習慣。
                        詞彙豐富度達到<strong className="text-gold-300">{(analysisResult.linguisticPattern.vocabularyRichness * 100).toFixed(0)}%</strong>，
                        顯示角色具有{analysisResult.linguisticPattern.vocabularyRichness >= 0.8 ? '豐富多樣' : analysisResult.linguisticPattern.vocabularyRichness >= 0.6 ? '中等程度' : '相對簡單'}的語言表達能力。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 改進建議標籤 */}
            {activeTab === 'suggestions' && (
              <div className="space-y-4">
                <div className="bg-cosmic-800/30 rounded-lg p-6">
                  <h4 className="text-gold-400 font-bold mb-4 flex items-center">
                    <span className="mr-2">💡</span>改進建議
                  </h4>
                  
                  {/* AI建議列表 */}
                  <div className="space-y-4">
                    {generateSuggestions(analysisResult).map((suggestion, index) => (
                      <div key={index} className="bg-cosmic-700/40 rounded-lg p-4 border border-gold-600/20">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{suggestion.icon}</span>
                            <h5 className="text-gold-300 font-medium text-sm">{suggestion.title}</h5>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            suggestion.priority === 'high' ? 'bg-red-600 text-white' :
                            suggestion.priority === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {suggestion.priority === 'high' ? '高優先' :
                             suggestion.priority === 'medium' ? '中優先' : '低優先'}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-400">
                            影響章節: {suggestion.chapters.join(', ')}
                          </div>
                          <button 
                            className="px-3 py-1 bg-gold-600 hover:bg-gold-500 text-cosmic-900 text-xs font-medium rounded transition-colors"
                            onClick={() => handleApplySuggestion(suggestion)}
                          >
                            應用建議
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 整體改善建議 */}
                  <div className="mt-6 p-4 bg-cosmic-700/20 rounded-lg border border-gold-600/20">
                    <h5 className="text-gold-400 font-medium text-sm mb-2 flex items-center">
                      <span className="mr-2">📈</span>整體改善方向
                    </h5>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      基於分析結果，建議重點關注
                      <strong className="text-gold-300">
                        {analysisResult.confidence < 0.7 ? '提升角色一致性' :
                         analysisResult.behaviorConsistency < 0.8 ? '強化行為邏輯' :
                         '深化人物層次'}
                      </strong>，
                      同時保持角色的核心特徵不變。可以考慮在對話中更多展現角色的
                      <strong className="text-gold-300">{analysisResult.linguisticPattern.speakingStyle}</strong>特點，
                      讓讀者更容易識別和記住這個角色。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============ 輔助函數 ============

/**
 * 生成改進建議
 */
interface Suggestion {
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  chapters: string[];
  action?: string;
}

function generateSuggestions(result: CharacterAnalysisResult): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 基於置信度生成建議
  if (result.confidence < 0.7) {
    suggestions.push({
      icon: '🎯',
      title: '提升角色一致性',
      description: '角色在某些章節中的表現存在不一致，建議檢查核心人格設定，確保在所有場景下保持相同的反應模式。',
      priority: 'high',
      chapters: ['第2章', '第4章', '第6章']
    });
  }

  // 基於行為一致性生成建議
  if (result.behaviorConsistency < 0.8) {
    suggestions.push({
      icon: '⚖️',
      title: '強化行為邏輯',
      description: '角色的行為選擇在某些情境下缺乏邏輯一致性，建議為角色建立更清晰的價值觀和決策原則。',
      priority: result.behaviorConsistency < 0.6 ? 'high' : 'medium',
      chapters: ['第3章', '第5章']
    });
  }

  // 基於情感強度生成建議
  if (result.emotionalIntensity < 0.4) {
    suggestions.push({
      icon: '💝',
      title: '增強情感表達',
      description: '角色的情感表達較為平淡，可以適度增加內心獨白或情感反應的描寫，讓角色更有感染力。',
      priority: 'medium',
      chapters: ['第1章', '第7章']
    });
  } else if (result.emotionalIntensity > 0.9) {
    suggestions.push({
      icon: '🧘',
      title: '平衡情感表達',
      description: '角色的情感表達過於強烈，可能會讓讀者感到疲勞。建議在某些場景中加入更多理性思考的描寫。',
      priority: 'low',
      chapters: ['第8章', '第9章']
    });
  }

  // 基於語言風格生成建議
  if (result.linguisticPattern.vocabularyRichness < 0.5) {
    suggestions.push({
      icon: '📚',
      title: '豐富詞彙表達',
      description: '角色的語言表達相對簡單，建議根據角色背景和教育程度，適當豐富其詞彙使用和表達方式。',
      priority: 'medium',
      chapters: ['全部章節']
    });
  }

  // 基於對話數量生成建議
  if (result.dialogueCount < 10) {
    suggestions.push({
      icon: '💬',
      title: '增加對話展示',
      description: '角色的直接對話較少，建議增加角色與其他人物的互動對話，更好地展現其性格特點。',
      priority: 'low',
      chapters: ['第4章', '第6章']
    });
  }

  // 默認建議（如果沒有其他問題）
  if (suggestions.length === 0) {
    suggestions.push({
      icon: '⭐',
      title: '深化人物層次',
      description: '角色整體表現良好，可以考慮增加更多內心衝突或成長弧線，讓角色更加立體動人。',
      priority: 'low',
      chapters: ['後續章節']
    });
  }

  return suggestions.slice(0, 4); // 最多顯示4個建議
}

/**
 * 處理應用建議的點擊事件
 */
function handleApplySuggestion(suggestion: Suggestion): void {
  // 這裡可以實現具體的建議應用邏輯
  // 例如：跳轉到相關章節、打開編輯器、顯示詳細修改建議等
  console.log('應用建議:', suggestion.title);
  
  // 實際項目中可以調用相關的編輯器API或顯示模態框
  // 例如：
  // onSuggestionApply?.(suggestion.description);
  // 或者導航到特定章節
  // navigate(`/chapter/${suggestion.chapters[0]}`);
}

// 導出記憶化的組件
export default withSmartMemo(CharacterAnalysisPanel);

// 開發環境性能監控（暫時註解避免模組載入錯誤）
// if (process.env.NODE_ENV === 'development') {
//   import('../../utils/reactScan').then(({ monitorComponent }) => {
//     monitorComponent(CharacterAnalysisPanel, 'CharacterAnalysisPanel');
//   });
// }