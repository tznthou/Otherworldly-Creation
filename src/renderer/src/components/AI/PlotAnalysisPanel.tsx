// 劇情分析面板組件 - Phase 2: 進階 AI 功能
import React, { useState } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Badge } from '../UI/Badge';
import { plotAnalysisService, PlotSuggestion, ChapterTrendAnalysis } from '../../services/plotAnalysisService';
import { PlotAnalysis } from '../../utils/nlpUtils';

interface PlotAnalysisPanelProps {
  _projectId?: string;
  chapters?: Array<{ id: string; title: string; content: unknown[] }>;
  currentChapter?: { id: string; title: string; content: unknown[] };
  _onSuggestionApply?: (suggestion: PlotSuggestion) => void;
}

type AnalysisTab = 'overview' | 'conflicts' | 'pace' | 'foreshadowing' | 'suggestions' | 'trends';

export const PlotAnalysisPanel: React.FC<PlotAnalysisPanelProps> = ({
  _projectId,
  chapters = [],
  currentChapter,
  _onSuggestionApply
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PlotAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<PlotSuggestion[]>([]);
  const [chapterTrends, setChapterTrends] = useState<ChapterTrendAnalysis[]>([]);
  const [analysisScope, setAnalysisScope] = useState<'current' | 'project'>('current');

  // 執行劇情分析
  const performAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      console.log('🎭 開始執行劇情分析...', { analysisScope, currentChapter: !!currentChapter, chapters: chapters.length });
      
      let analysisResult: PlotAnalysis;
      
      if (analysisScope === 'current' && currentChapter) {
        // 分析當前章節
        analysisResult = plotAnalysisService.analyzeChapterPlot(currentChapter.content);
      } else if (analysisScope === 'project' && chapters.length > 0) {
        // 分析整個專案
        analysisResult = plotAnalysisService.analyzeProjectPlot(chapters);
        
        // 同時分析章節趨勢
        const trends = plotAnalysisService.analyzeChapterTrends(chapters);
        setChapterTrends(trends);
      } else {
        throw new Error('沒有可用的內容進行分析');
      }
      
      setAnalysis(analysisResult);
      
      // 生成改善建議
      const improvementSuggestions = plotAnalysisService.generatePlotImprovementSuggestions(analysisResult);
      setSuggestions(improvementSuggestions);
      
      console.log('✅ 劇情分析完成', analysisResult);
    } catch (error) {
      console.error('❌ 劇情分析失敗:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 獲取衝突強度顏色
  const getConflictIntensityColor = (intensity: number) => {
    if (intensity >= 8) return 'bg-red-600';
    if (intensity >= 6) return 'bg-orange-500';
    if (intensity >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 獲取節奏顏色
  const getPaceColor = (pace: string) => {
    switch (pace) {
      case 'fast': return 'text-red-400';
      case 'slow': return 'text-blue-400';
      default: return 'text-green-400';
    }
  };

  // 獲取分數顏色
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

  return (
    <div className="bg-cosmic-800 rounded-lg border border-gold-600/30 p-4">
      {/* 頭部控制區 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-bold text-gold-400 flex items-center">
            🎭 劇情分析引擎
          </h3>
          
          {/* 分析範圍選擇 */}
          <div className="flex space-x-2">
            <Button
              variant={analysisScope === 'current' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAnalysisScope('current')}
              disabled={!currentChapter || isAnalyzing}
            >
              當前章節
            </Button>
            <Button
              variant={analysisScope === 'project' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAnalysisScope('project')}
              disabled={chapters.length === 0 || isAnalyzing}
            >
              整個專案
            </Button>
          </div>
        </div>
        
        <Button
          onClick={performAnalysis}
          disabled={isAnalyzing || (analysisScope === 'current' && !currentChapter) || (analysisScope === 'project' && chapters.length === 0)}
          className="bg-gold-600 hover:bg-gold-700 text-cosmic-900"
        >
          {isAnalyzing ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">分析中...</span>
            </>
          ) : (
            '🔍 開始分析'
          )}
        </Button>
      </div>

      {/* 標籤導航 */}
      {analysis && (
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gold-600/20 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              disabled={tab.key === 'trends' && analysisScope !== 'project'}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-gold-600 text-cosmic-900'
                  : 'bg-cosmic-700 text-gold-200 hover:bg-cosmic-600'
              } ${tab.key === 'trends' && analysisScope !== 'project' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 分析結果展示 */}
      {analysis && (
        <div className="space-y-4">
          {/* 總覽標籤 */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-cosmic-900 border-gold-600/20">
                <div className="text-center p-4">
                  <div className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}/10
                  </div>
                  <div className="text-gold-300 text-sm">整體劇情評分</div>
                </div>
              </Card>
              
              <Card className="bg-cosmic-900 border-gold-600/20">
                <div className="p-4">
                  <div className="text-gold-300 text-sm mb-2">核心指標</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">衝突點</span>
                      <Badge variant="secondary">{analysis.conflicts.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">節奏評分</span>
                      <Badge variant="secondary" className={getPaceColor(analysis.pace.overallPace)}>
                        {analysis.pace.paceScore}/10
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">伏筆設置</span>
                      <Badge variant="secondary">{analysis.foreshadowing.setups.length}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 衝突分析標籤 */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gold-300">
                檢測到 {analysis.conflicts.length} 個衝突點
              </div>
              
              {analysis.conflicts.length === 0 ? (
                <Card className="bg-cosmic-900 border-gold-600/20 p-4">
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">🕊️</div>
                    <div>未檢測到明顯的戲劇衝突</div>
                    <div className="text-sm mt-2">建議增加角色對立或情節緊張感</div>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {analysis.conflicts.map((conflict, index) => (
                    <Card key={index} className="bg-cosmic-900 border-gold-600/20 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${getConflictIntensityColor(conflict.intensity)}`} />
                            <span className="font-medium text-gold-300">{conflict.description}</span>
                            <Badge variant="secondary" className="text-xs">強度 {conflict.intensity}/10</Badge>
                          </div>
                          <div className="text-gray-300 text-sm mb-2">"{conflict.context}"</div>
                          <div className="flex flex-wrap gap-1">
                            {conflict.keywords.map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
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
            <div className="space-y-4">
              <Card className="bg-cosmic-900 border-gold-600/20 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className={`text-2xl font-bold ${getPaceColor(analysis.pace.overallPace)}`}>
                      {analysis.pace.overallPace === 'fast' ? '快速' : analysis.pace.overallPace === 'slow' ? '緩慢' : '適中'}
                    </div>
                    <div className="text-gold-300 text-sm">整體節奏</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${getScoreColor(analysis.pace.paceScore)}`}>
                      {analysis.pace.paceScore}/10
                    </div>
                    <div className="text-gold-300 text-sm">節奏評分</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {analysis.pace.segments.length}
                    </div>
                    <div className="text-gold-300 text-sm">分析片段</div>
                  </div>
                </div>
              </Card>

              {/* 節奏片段分析 */}
              {analysis.pace.segments.length > 0 && (
                <Card className="bg-cosmic-900 border-gold-600/20 p-4">
                  <div className="text-gold-300 font-medium mb-3">節奏片段分析</div>
                  <div className="space-y-2">
                    {analysis.pace.segments.map((segment, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 rounded bg-cosmic-800">
                        <div className="text-sm text-gray-400">片段 {index + 1}</div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          segment.pace === 'fast' ? 'bg-red-600/20 text-red-300' :
                          segment.pace === 'slow' ? 'bg-blue-600/20 text-blue-300' :
                          'bg-green-600/20 text-green-300'
                        }`}>
                          {segment.pace === 'fast' ? '快' : segment.pace === 'slow' ? '慢' : '中'}
                        </div>
                        <div className="text-xs text-gray-400">
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
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-cosmic-900 border-gold-600/20 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{analysis.foreshadowing.setups.length}</div>
                  <div className="text-gold-300 text-sm">伏筆設置</div>
                </Card>
                <Card className="bg-cosmic-900 border-gold-600/20 p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{analysis.foreshadowing.connections.length}</div>
                  <div className="text-gold-300 text-sm">成功回收</div>
                </Card>
                <Card className="bg-cosmic-900 border-gold-600/20 p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">{analysis.foreshadowing.orphanedSetups.length}</div>
                  <div className="text-gold-300 text-sm">未回收</div>
                </Card>
              </div>

              {/* 未回收的伏筆警告 */}
              {analysis.foreshadowing.orphanedSetups.length > 0 && (
                <Card className="bg-orange-900/20 border-orange-600/30 p-4">
                  <div className="text-orange-300 font-medium mb-2">⚠️ 發現未回收的伏筆</div>
                  <div className="space-y-2">
                    {analysis.foreshadowing.orphanedSetups.slice(0, 3).map((setup, index) => (
                      <div key={index} className="text-sm text-orange-200">
                        "{setup.text.substring(0, 100)}..."
                      </div>
                    ))}
                  </div>
                  {analysis.foreshadowing.orphanedSetups.length > 3 && (
                    <div className="text-xs text-orange-400 mt-2">
                      還有 {analysis.foreshadowing.orphanedSetups.length - 3} 個未回收的伏筆...
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* 改善建議標籤 */}
          {activeTab === 'suggestions' && (
            <div className="space-y-3">
              <div className="text-lg font-semibold text-gold-300">
                📋 改善建議 ({suggestions.length})
              </div>
              
              {suggestions.length === 0 ? (
                <Card className="bg-cosmic-900 border-gold-600/20 p-4">
                  <div className="text-center text-green-400">
                    <div className="text-4xl mb-2">🎉</div>
                    <div>劇情品質良好，暫無改善建議</div>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="bg-cosmic-900 border-gold-600/20 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge 
                              variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'secondary' : 'secondary'}
                              className="text-xs"
                            >
                              {suggestion.priority === 'high' ? '高優先級' : suggestion.priority === 'medium' ? '中優先級' : '低優先級'}
                            </Badge>
                            <span className="font-medium text-gold-300">{suggestion.title}</span>
                          </div>
                          <div className="text-gray-300 text-sm mb-2">{suggestion.description}</div>
                          <div className="text-blue-300 text-sm mb-2">💡 建議: {suggestion.suggestion}</div>
                          <div className="text-green-300 text-xs">📈 預期效果: {suggestion.impact}</div>
                        </div>
                        {_onSuggestionApply && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => _onSuggestionApply(suggestion)}
                            className="ml-4"
                          >
                            應用建議
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 章節趨勢標籤 */}
          {activeTab === 'trends' && analysisScope === 'project' && (
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gold-300">
                📈 章節劇情趨勢
              </div>
              
              {chapterTrends.length === 0 ? (
                <Card className="bg-cosmic-900 border-gold-600/20 p-4">
                  <div className="text-center text-gray-400">暫無章節趨勢數據</div>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {chapterTrends.map((trend) => (
                    <Card key={trend.chapterId} className="bg-cosmic-900 border-gold-600/20 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-gold-300 font-medium">
                            第{trend.chapterIndex}章
                          </div>
                          <div className="text-gray-300 text-sm truncate max-w-48">
                            {trend.chapterTitle}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`text-sm ${getScoreColor(trend.analysis.overallScore)}`}>
                            {trend.analysis.overallScore}/10
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            trend.trend === 'rising' ? 'bg-green-600/20 text-green-300' :
                            trend.trend === 'declining' ? 'bg-red-600/20 text-red-300' :
                            'bg-gray-600/20 text-gray-300'
                          }`}>
                            {trend.trend === 'rising' ? '📈 上升' : trend.trend === 'declining' ? '📉 下降' : '📊 平穩'}
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
      )}

      {/* 無分析結果時的提示 */}
      {!analysis && !isAnalyzing && (
        <Card className="bg-cosmic-900 border-gold-600/20 p-8">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🎭</div>
            <div className="text-lg font-medium mb-2">劇情分析引擎</div>
            <div className="text-sm mb-4">
              點擊「開始分析」來深度分析您的故事劇情
            </div>
            <div className="text-xs text-gold-400">
              • 衝突點檢測 • 節奏分析 • 伏筆追蹤 • 改善建議
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlotAnalysisPanel;