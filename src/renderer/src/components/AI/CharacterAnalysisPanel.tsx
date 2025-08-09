import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import LoadingSpinner from '../UI/LoadingSpinner';
import { api } from '../../api';
import { characterAnalysisService, CharacterAnalysisResult, ProjectCharacterAnalysis } from '../../services/characterAnalysisService';
import { addNotification } from '../../store/slices/notificationSlice';
import { fetchCharactersByProjectId } from '../../store/slices/charactersSlice';

// 分析標籤類型
type AnalysisTab = 'overview' | 'personality' | 'language' | 'emotion' | 'consistency' | 'suggestions';

interface CharacterAnalysisPanelProps {
  projectId: string;
  chapters: any[];
  currentChapter: any;
  onSuggestionApply?: (suggestion: string) => void;
}

/**
 * 角色分析面板 - 提供全面的角色分析功能
 */
const CharacterAnalysisPanel: React.FC<CharacterAnalysisPanelProps> = ({
  projectId,
  chapters = [],
  currentChapter,
  onSuggestionApply
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { characters } = useSelector((state: RootState) => state.characters);
  
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
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectCharacterAnalysis | null>(null);

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

  // 執行角色分析
  const performAnalysis = async () => {
    if (!selectedCharacterId) {
      dispatch(addNotification({
        type: 'warning',
        message: '請先選擇要分析的角色'
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
            type: 'warning',
            message: '該角色在此章節中沒有足夠的對話內容進行分析'
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
        type: 'error',
        message: `分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 獲取人格特徵顏色
  const getPersonalityColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    if (score >= 0.3) return 'text-orange-400';
    return 'text-red-400';
  };

  // 獲取一致性顏色
  const getConsistencyColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

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
    <div className="bg-cosmic-800 rounded-lg border border-gold-600/30 p-4">
      {/* 頭部控制區 */}
      <div className="space-y-4 mb-6">
        {/* 標題 */}
        <h3 className="text-lg font-bold text-gold-400 flex items-center">
          <span className="mr-2">👥</span>
          角色分析
        </h3>
        
        {/* 控制選項 */}
        <div className="flex flex-wrap items-end gap-4">
          {/* 角色選擇器 */}
          <div className="flex flex-col space-y-1 min-w-[120px]">
            <label className="text-sm text-gray-300">角色:</label>
            <select
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="bg-cosmic-700 border border-gold-600/30 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
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
          <div className="flex flex-col space-y-1 min-w-[100px]">
            <label className="text-sm text-gray-300">範圍:</label>
            <select
              value={analysisScope}
              onChange={(e) => setAnalysisScope(e.target.value as 'current' | 'project')}
              className="bg-cosmic-700 border border-gold-600/30 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="current">當前章節</option>
              <option value="project">整個專案</option>
            </select>
          </div>

          {/* 分析按鈕 */}
          <button
            onClick={performAnalysis}
            disabled={isAnalyzing || !selectedCharacterId}
            className="bg-gold-600 hover:bg-gold-500 disabled:bg-gray-600 text-cosmic-900 px-4 py-2 rounded font-medium transition-colors flex items-center space-x-2"
          >
            <span>🔍</span>
            <span>{isAnalyzing ? '分析中...' : '開始分析'}</span>
          </button>
        </div>
      </div>

      {/* 分析進度指示器 */}
      {isAnalyzing && (
        <div className="mb-4 p-4 bg-cosmic-700/50 rounded-lg border border-gold-600/20">
          <div className="flex items-center space-x-3">
            <LoadingSpinner size="sm" />
            <div className="text-white">
              <p className="font-medium">正在分析 "{selectedCharacter?.name}" 的角色特徵...</p>
              <p className="text-sm text-gray-400">
                {analysisScope === 'current' ? '分析當前章節內容' : '分析整個專案內容'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 標籤導航 */}
      <div className="flex space-x-1 mb-4 bg-cosmic-700/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gold-600 text-cosmic-900'
                : 'text-gray-400 hover:text-white hover:bg-cosmic-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 分析結果內容 */}
      <div className="min-h-[400px]">
        {!analysisResult ? (
          <div className="flex items-center justify-center h-[400px] text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">👤</div>
              <p className="text-lg mb-2">尚未進行角色分析</p>
              <p className="text-sm">
                請選擇角色和分析範圍，然後點擊「開始分析」按鈕
              </p>
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

            {/* 其他標籤內容將在後續實現 */}
            {activeTab !== 'overview' && (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">🚧</div>
                  <p className="text-lg mb-2">功能開發中</p>
                  <p className="text-sm">
                    {tabs.find(t => t.key === activeTab)?.label} 標籤功能即將推出
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CharacterAnalysisPanel;