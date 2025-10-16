import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { Descendant } from 'slate';
import { closeModal } from '../../store/slices/uiSlice';
import { withSmartMemo } from '../../utils/componentOptimization';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Badge } from '../UI/Badge';
import { plotAnalysisService, PlotSuggestion, ChapterTrendAnalysis } from '../../services/plotAnalysisService';
import { PlotAnalysis } from '../../utils/nlpUtils';
import { addNotification } from '../../store/slices/notificationSlice';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('PlotAnalysisModal');

interface PlotAnalysisModalProps {
  projectId?: string;
  chapters?: Array<{ id: string; title: string; content: unknown[] }>;
  currentChapter?: { id: string; title: string; content: unknown[] };
  _onSuggestionApply?: (suggestion: PlotSuggestion) => void;
}

type AnalysisTab = 'overview' | 'conflicts' | 'pace' | 'foreshadowing' | 'suggestions' | 'trends';

/**
 * 劇情分析模態框 - 提供全屏的劇情分析專屬視圖
 */
const PlotAnalysisModal: React.FC<PlotAnalysisModalProps> = ({
  projectId: _projectId,
  chapters = [],
  currentChapter,
  _onSuggestionApply
}) => {
  const dispatch = useDispatch<AppDispatch>();

  // 狀態管理
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PlotAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<PlotSuggestion[]>([]);
  const [chapterTrends, setChapterTrends] = useState<ChapterTrendAnalysis[]>([]);
  const [analysisScope, setAnalysisScope] = useState<'current' | 'project'>('current');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 執行劇情分析
  const performAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      log.debug('🎭 開始執行劇情分析...', {
        analysisScope,
        currentChapter: !!currentChapter,
        chapters: chapters.length
      });

      let analysisResult: PlotAnalysis;

      if (analysisScope === 'current' && currentChapter) {
        // 分析當前章節
        analysisResult = plotAnalysisService.analyzeChapterPlot(currentChapter.content as Descendant[]);
      } else if (analysisScope === 'project' && chapters.length > 0) {
        // 分析整個專案
        analysisResult = plotAnalysisService.analyzeProjectPlot(chapters.map(ch => ({ content: ch.content as Descendant[] })));

        // 同時分析章節趨勢
        const trends = plotAnalysisService.analyzeChapterTrends(chapters.map(ch => ({ id: ch.id, title: ch.title, content: ch.content as Descendant[] })));
        setChapterTrends(trends);
      } else {
        throw new Error('沒有可用的內容進行分析');
      }

      setAnalysis(analysisResult);

      // 生成改善建議
      const improvementSuggestions = plotAnalysisService.generatePlotImprovementSuggestions(analysisResult);
      setSuggestions(improvementSuggestions);

      log.debug('✅ 劇情分析完成', analysisResult);

      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: '分析完成',
        message: '劇情分析已成功完成',
        timestamp: Date.now()
      }));

    } catch (error) {
      log.error('❌ 劇情分析失敗:', error);
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: '分析失敗',
        message: `劇情分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        timestamp: Date.now()
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 關閉模態框
  const handleClose = () => {
    dispatch(closeModal());
  };

  // 切換全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 顏色輔助函數
  const getConflictIntensityColor = (intensity: number) => {
    if (intensity >= 8) return 'bg-red-600';
    if (intensity >= 6) return 'bg-orange-500';
    if (intensity >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPaceColor = (pace: string) => {
    switch (pace) {
      case 'fast': return 'text-red-400';
      case 'slow': return 'text-warm-gold';
      default: return 'text-green-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  // 標籤按鈕配置
  const tabs: { key: AnalysisTab; label: string; icon: string }[] = [
    { key: 'overview', label: '總覽', icon: '📊' },
    { key: 'conflicts', label: '衝突分析', icon: '⚔️' },
    { key: 'pace', label: '節奏分析', icon: '🎵' },
    { key: 'foreshadowing', label: '伏筆追蹤', icon: '🔮' },
    { key: 'suggestions', label: '改善建議', icon: '💡' },
    { key: 'trends', label: '章節趨勢', icon: '📈' }
  ];

  // 應用建議
  const handleApplySuggestion = (suggestion: PlotSuggestion) => {
    if (_onSuggestionApply) {
      _onSuggestionApply(suggestion);
    }
    dispatch(addNotification({
      id: Date.now().toString(),
      type: 'success',
      title: '建議已應用',
      message: `已應用建議: ${suggestion.title}`,
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
              <h2 className="text-2xl font-bold text-warm-gold">劇情分析引擎</h2>
              <p className="text-sm text-gray-400">深度分析故事結構與劇情發展</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-bg-dark/80 hover:bg-cosmic-600 text-gray-300 hover:text-white transition-colors"
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
              {/* 分析範圍選擇 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <span className="mr-2">📊</span>分析範圍
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={analysisScope === 'current' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setAnalysisScope('current')}
                    disabled={!currentChapter || isAnalyzing}
                    className="text-sm"
                  >
                    當前章節
                  </Button>
                  <Button
                    variant={analysisScope === 'project' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setAnalysisScope('project')}
                    disabled={chapters.length === 0 || isAnalyzing}
                    className="text-sm"
                  >
                    整個專案
                  </Button>
                </div>
              </div>

              {/* 分析按鈕 */}
              <Button
                onClick={performAnalysis}
                disabled={isAnalyzing || (analysisScope === 'current' && !currentChapter) || (analysisScope === 'project' && chapters.length === 0)}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 disabled:from-gray-600 disabled:to-gray-700 text-cosmic-900 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2 shadow-lg"
              >
                {isAnalyzing ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span className="ml-2">分析中...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🔍</span>
                    <span>開始分析</span>
                  </>
                )}
              </Button>

              {/* 分析狀態 */}
              {isAnalyzing && (
                <div className="p-3 bg-bg-dark/80/30 rounded-lg">
                  <div className="text-white text-sm font-medium mb-2">
                    正在分析劇情結構...
                  </div>
                  <div className="text-xs text-gray-400">
                    {analysisScope === 'current' ? '分析當前章節' : '分析整個專案'}
                  </div>
                </div>
              )}
            </div>

            {/* 標籤導航 */}
            <div className="flex-1 p-6 space-y-2">
              <h3 className="text-sm font-medium text-gray-400 mb-4">分析類型</h3>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  disabled={tab.key === 'trends' && analysisScope !== 'project'}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-cosmic-900 shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-bg-dark/80/50'
                  } ${tab.key === 'trends' && analysisScope !== 'project' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 右側內容區域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 主要內容區 */}
            <div className="flex-1 overflow-y-auto p-8">
              {!analysis && !isAnalyzing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className="text-8xl animate-pulse">🎭</div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 bg-gold-600/20 rounded-full blur-3xl animate-ping"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-2xl font-bold text-gray-300">劇情分析引擎</p>
                      <p className="text-gray-500 max-w-md mx-auto">
                        點擊「開始分析」來深度分析您的故事劇情結構與發展趨勢
                      </p>
                    </div>
                    <div className="flex justify-center space-x-8 pt-4">
                      <div className="text-center">
                        <div className="text-4xl mb-2">⚔️</div>
                        <p className="text-sm text-gray-500">衝突點檢測</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎵</div>
                        <p className="text-sm text-gray-500">節奏分析</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl mb-2">🔮</div>
                        <p className="text-sm text-gray-500">伏筆追蹤</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl mb-2">💡</div>
                        <p className="text-sm text-gray-500">改善建議</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : analysis ? (
                <div className="space-y-8">
                  {/* 總覽標籤 */}
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        <Card className="bg-bg-dark/80/30 border-gold-600/20 rounded-xl">
                          <div className="text-center p-6">
                            <div className={`text-4xl font-bold mb-2 ${getScoreColor(analysis.overallScore)}`}>
                              {analysis.overallScore}/10
                            </div>
                            <div className="text-gold-300">整體劇情評分</div>
                          </div>
                        </Card>

                        <Card className="bg-bg-dark/80/30 border-gold-600/20 rounded-xl">
                          <div className="p-6">
                            <div className="text-gold-300 font-medium mb-4">核心指標</div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300">衝突點</span>
                                <Badge variant="secondary" className="bg-cosmic-600">
                                  {analysis.conflicts.length}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300">節奏評分</span>
                                <Badge variant="secondary" className={`${getPaceColor(analysis.pace.overallPace)} bg-cosmic-600`}>
                                  {analysis.pace.paceScore}/10
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300">伏筆設置</span>
                                <Badge variant="secondary" className="bg-cosmic-600">
                                  {analysis.foreshadowing.setups.length}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>

                        <Card className="bg-bg-dark/80/30 border-gold-600/20 rounded-xl">
                          <div className="p-6">
                            <div className="text-gold-300 font-medium mb-4">分析摘要</div>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">總體評價：</span>
                                <span className={getScoreColor(analysis.overallScore)}>
                                  {analysis.overallScore >= 8 ? '優秀' :
                                   analysis.overallScore >= 6 ? '良好' :
                                   analysis.overallScore >= 4 ? '普通' : '需改進'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">改進建議：</span>
                                <span className="text-white">{suggestions.length}項</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">分析範圍：</span>
                                <span className="text-white">
                                  {analysisScope === 'current' ? '當前章節' : '全專案'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* 衝突分析標籤 */}
                  {activeTab === 'conflicts' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gold-300">
                          檢測到 {analysis.conflicts.length} 個衝突點
                        </h3>
                        {analysis.conflicts.length > 0 && (
                          <Badge variant="secondary" className="bg-bg-dark/80">
                            平均強度 {(analysis.conflicts.reduce((sum, c) => sum + c.intensity, 0) / analysis.conflicts.length).toFixed(1)}/10
                          </Badge>
                        )}
                      </div>

                      {analysis.conflicts.length === 0 ? (
                        <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-8">
                          <div className="text-center text-gray-400">
                            <div className="text-6xl mb-4">🕊️</div>
                            <div className="text-lg font-medium mb-2">未檢測到明顯的戲劇衝突</div>
                            <div className="text-sm">建議增加角色對立或情節緊張感來推動故事發展</div>
                          </div>
                        </Card>
                      ) : (
                        <div className="grid gap-6">
                          {analysis.conflicts.map((conflict, index) => (
                            <Card key={index} className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className={`w-4 h-4 rounded-full ${getConflictIntensityColor(conflict.intensity)}`} />
                                    <span className="font-medium text-gold-300 text-lg">{conflict.description}</span>
                                    <Badge variant="secondary" className="bg-cosmic-600">
                                      強度 {conflict.intensity}/10
                                    </Badge>
                                  </div>
                                  <div className="text-gray-300 mb-4 p-3 bg-bg-light/50 backdrop-blur-sm/50 rounded-lg italic">
                                    "{conflict.context}"
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {conflict.keywords.map((keyword, i) => (
                                      <Badge key={i} variant="secondary" className="bg-cosmic-600 text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 節奏分析標籤 */}
                  {activeTab === 'pace' && (
                    <div className="space-y-8">
                      <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                          <div>
                            <div className={`text-3xl font-bold mb-2 ${getPaceColor(analysis.pace.overallPace)}`}>
                              {analysis.pace.overallPace === 'fast' ? '快速' :
                               analysis.pace.overallPace === 'slow' ? '緩慢' : '適中'}
                            </div>
                            <div className="text-gold-300">整體節奏</div>
                          </div>
                          <div>
                            <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysis.pace.paceScore)}`}>
                              {analysis.pace.paceScore}/10
                            </div>
                            <div className="text-gold-300">節奏評分</div>
                          </div>
                          <div>
                            <div className="text-3xl font-bold mb-2 text-warm-gold">
                              {analysis.pace.segments.length}
                            </div>
                            <div className="text-gold-300">分析片段</div>
                          </div>
                        </div>
                      </Card>

                      {/* 節奏片段分析 */}
                      {analysis.pace.segments.length > 0 && (
                        <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-8">
                          <div className="text-gold-300 font-medium text-lg mb-6">節奏片段分析</div>
                          <div className="grid gap-4">
                            {analysis.pace.segments.map((segment, index) => (
                              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-bg-light/50 backdrop-blur-sm/50">
                                <div className="flex items-center space-x-4">
                                  <div className="text-gray-400 font-medium">片段 {index + 1}</div>
                                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    segment.pace === 'fast' ? 'bg-red-600/20 text-red-300' :
                                    segment.pace === 'slow' ? 'bg-warm-gold/20 text-warm-gold' :
                                    'bg-green-600/20 text-green-300'
                                  }`}>
                                    {segment.pace === 'fast' ? '快節奏' :
                                     segment.pace === 'slow' ? '慢節奏' : '中等節奏'}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-400">
                                  事件密度: {segment.eventDensity.toFixed(1)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* 伏筆追蹤標籤 */}
                  {activeTab === 'foreshadowing' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-6 text-center">
                          <div className="text-3xl font-bold text-clay-orange mb-2">
                            {analysis.foreshadowing.setups.length}
                          </div>
                          <div className="text-gold-300">伏筆設置</div>
                        </Card>
                        <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-6 text-center">
                          <div className="text-3xl font-bold text-green-400 mb-2">
                            {analysis.foreshadowing.connections.length}
                          </div>
                          <div className="text-gold-300">成功回收</div>
                        </Card>
                        <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-6 text-center">
                          <div className="text-3xl font-bold text-orange-400 mb-2">
                            {analysis.foreshadowing.orphanedSetups.length}
                          </div>
                          <div className="text-gold-300">未回收</div>
                        </Card>
                      </div>

                      {/* 未回收的伏筆警告 */}
                      {analysis.foreshadowing.orphanedSetups.length > 0 && (
                        <Card className="bg-orange-900/20 border-orange-600/30 rounded-xl p-6">
                          <div className="text-orange-300 font-medium text-lg mb-4 flex items-center">
                            <span className="mr-2">⚠️</span>發現未回收的伏筆
                          </div>
                          <div className="space-y-4">
                            {analysis.foreshadowing.orphanedSetups.slice(0, 3).map((setup, index) => (
                              <div key={index} className="p-3 bg-orange-900/10 rounded-lg border border-orange-600/20">
                                <div className="text-orange-200 italic">
                                  "{setup.text.substring(0, 150)}..."
                                </div>
                              </div>
                            ))}
                          </div>
                          {analysis.foreshadowing.orphanedSetups.length > 3 && (
                            <div className="text-orange-400 mt-4 text-center">
                              還有 {analysis.foreshadowing.orphanedSetups.length - 3} 個未回收的伏筆...
                            </div>
                          )}
                        </Card>
                      )}
                    </div>
                  )}

                  {/* 改善建議標籤 */}
                  {activeTab === 'suggestions' && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gold-300">
                          📋 改善建議 ({suggestions.length})
                        </h3>
                      </div>

                      {suggestions.length === 0 ? (
                        <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-8">
                          <div className="text-center text-green-400">
                            <div className="text-6xl mb-4">🎉</div>
                            <div className="text-lg font-medium">劇情品質良好，暫無改善建議</div>
                          </div>
                        </Card>
                      ) : (
                        <div className="grid gap-6">
                          {suggestions.map((suggestion, index) => (
                            <Card key={index} className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-4">
                                    <Badge
                                      variant={suggestion.priority === 'high' ? 'destructive' :
                                              suggestion.priority === 'medium' ? 'secondary' : 'secondary'}
                                      className={`${
                                        suggestion.priority === 'high' ? 'bg-red-600 text-white' :
                                        suggestion.priority === 'medium' ? 'bg-yellow-600 text-white' :
                                        'bg-warm-gold text-white'
                                      }`}
                                    >
                                      {suggestion.priority === 'high' ? '高優先級' :
                                       suggestion.priority === 'medium' ? '中優先級' : '低優先級'}
                                    </Badge>
                                    <span className="font-medium text-gold-300 text-lg">{suggestion.title}</span>
                                  </div>
                                  <div className="text-gray-300 mb-3 leading-relaxed">{suggestion.description}</div>
                                  <div className="text-warm-gold mb-3 p-3 bg-warm-gold/5 rounded-lg border border-warm-gold/20">
                                    💡 <strong>建議:</strong> {suggestion.suggestion}
                                  </div>
                                  <div className="text-green-300 p-3 bg-green-900/10 rounded-lg border border-green-600/20">
                                    📈 <strong>預期效果:</strong> {suggestion.impact}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleApplySuggestion(suggestion)}
                                  className="ml-6 bg-gold-600 hover:bg-gold-500 text-cosmic-900"
                                >
                                  應用建議
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 章節趨勢標籤 */}
                  {activeTab === 'trends' && analysisScope === 'project' && (
                    <div className="space-y-8">
                      <h3 className="text-xl font-bold text-gold-300">
                        📈 章節劇情趨勢
                      </h3>

                      {chapterTrends.length === 0 ? (
                        <Card className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-8">
                          <div className="text-center text-gray-400">
                            <div className="text-6xl mb-4">📈</div>
                            <div className="text-lg">暫無章節趨勢數據</div>
                          </div>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {chapterTrends.map((trend) => (
                            <Card key={trend.chapterId} className="bg-bg-dark/80/20 border-gold-600/20 rounded-xl p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-gold-300 font-medium text-lg">
                                    第{trend.chapterIndex}章
                                  </div>
                                  <div className="text-gray-300 truncate max-w-64">
                                    {trend.chapterTitle}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className={`text-lg font-medium ${getScoreColor(trend.analysis.overallScore)}`}>
                                    {trend.analysis.overallScore}/10
                                  </div>
                                  <div className={`px-3 py-2 rounded-lg font-medium ${
                                    trend.trend === 'rising' ? 'bg-green-600/20 text-green-300' :
                                    trend.trend === 'declining' ? 'bg-red-600/20 text-red-300' :
                                    'bg-gray-600/20 text-gray-300'
                                  }`}>
                                    {trend.trend === 'rising' ? '📈 上升' :
                                     trend.trend === 'declining' ? '📉 下降' : '📊 平穩'}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withSmartMemo(PlotAnalysisModal as unknown as React.ComponentType<Record<string, unknown>>);