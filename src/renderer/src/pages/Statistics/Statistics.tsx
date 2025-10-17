import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatisticsService, {
  ProjectStatistics,
  OverallStatistics,
  MonthlyStats
} from '../../services/statisticsService';
import WritingTrendChart from '../../components/Charts/WritingTrendChart';
import MonthlyStatsChart from '../../components/Charts/MonthlyStatsChart';
import { Icon } from '../../components/UI/Icon';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('Statistics');

const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<OverallStatistics | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStatistics[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const [overall, projects, monthly] = await Promise.all([
        StatisticsService.getOverallStatistics(),
        StatisticsService.getProjectStatistics(),
        StatisticsService.getMonthlyStatistics()
      ]);

      setOverallStats(overall);
      setProjectStats(projects);
      setMonthlyStats(monthly);
    } catch (error) {
      log.error('載入統計數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-gold"></div>
          <span className="ml-2 text-text-secondary">載入統計數據中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-screen overflow-y-scroll force-scrollbar pb-16">
        {/* 標題和導航 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif-tc text-warm-gold mb-2 flex items-center gap-3">
            <Icon name="ChartBar" variant="solid" className="w-8 h-8" />
            創作統計
          </h1>
          <p className="text-text-secondary">追蹤您的創作進度和成就</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-bg-light hover:bg-bg-light/80 rounded-lg transition-colors text-text-primary"
        >
          返回首頁
        </button>
      </div>

      {/* 標籤導航 */}
      <div className="mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '總覽', iconName: 'ArrowTrendingUp', iconVariant: 'solid' as const },
            { id: 'projects', label: '專案統計', iconName: 'BookOpen', iconVariant: 'solid' as const },
            { id: 'trends', label: '趨勢分析', iconName: 'ChartBar', iconVariant: 'solid' as const }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'projects' | 'trends')}
              className={`flex items-center space-x-2 pb-4 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-warm-gold text-warm-gold'
                  : 'border-transparent text-text-secondary/60 hover:text-text-secondary'
              }`}
            >
              <Icon name={tab.iconName} variant={tab.iconVariant} className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 總覽標籤 */}
      {activeTab === 'overview' && overallStats && (
        <div className="space-y-8">
          {/* 核心統計卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6 hover:bg-bg-light/80 transition-colors text-center">
              <div className="text-3xl font-bold text-warm-gold mb-2">
                {overallStats.totalProjects}
              </div>
              <div className="text-text-secondary/70">創作專案</div>
            </div>

            <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6 hover:bg-bg-light/80 transition-colors text-center">
              <div className="text-3xl font-bold text-warm-gold-light mb-2">
                {overallStats.totalChapters}
              </div>
              <div className="text-text-secondary/70">完成章節</div>
            </div>

            <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6 hover:bg-bg-light/80 transition-colors text-center">
              <div className="text-3xl font-bold text-clay-orange mb-2">
                {StatisticsService.formatNumber(overallStats.totalWords)}
              </div>
              <div className="text-text-secondary/70">總字數</div>
            </div>

            <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6 hover:bg-bg-light/80 transition-colors text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {overallStats.totalCharacters}
              </div>
              <div className="text-text-secondary/70">創建角色</div>
            </div>
          </div>

          {/* 創作亮點 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6 hover:bg-bg-light/80 transition-colors">
              <h3 className="text-xl font-serif-tc text-warm-gold mb-4 flex items-center gap-2">
                <Icon name="Trophy" variant="solid" className="w-6 h-6" />
                創作亮點
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">平均每日字數</span>
                  <span className="text-warm-gold font-bold">
                    {StatisticsService.formatNumber(overallStats.averageWordsPerDay)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">總寫作時間</span>
                  <span className="text-warm-gold-light font-bold">
                    {StatisticsService.formatTime(overallStats.totalWritingTime)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">最高產的一天</span>
                  <span className="text-clay-orange font-bold">
                    {overallStats.mostProductiveDay || '尚無數據'}
                  </span>
                </div>

                {overallStats.longestChapter.wordCount > 0 && (
                  <div className="pt-4 border-t border-warm-gold/20">
                    <div className="text-text-secondary mb-2 flex items-center gap-2">
                      <Icon name="BookOpen" variant="outline" className="w-4 h-4" />
                      最長章節
                    </div>
                    <div className="text-sm">
                      <div className="text-text-primary font-medium">
                        {overallStats.longestChapter.title}
                      </div>
                      <div className="text-text-tertiary">
                        《{overallStats.longestChapter.projectName}》 · {StatisticsService.formatNumber(overallStats.longestChapter.wordCount)} 字
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 最近活動 */}
            <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6 hover:bg-bg-light/80 transition-colors">
              <h3 className="text-xl font-serif-tc text-warm-gold mb-4 flex items-center gap-2">
                <Icon name="Bolt" variant="solid" className="w-6 h-6" />
                最近活動
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {overallStats.recentActivity.length > 0 ? (
                  overallStats.recentActivity.map((session, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-warm-gold/20 last:border-b-0">
                      <div>
                        <div className="text-text-primary text-sm">{session.date}</div>
                        <div className="text-text-tertiary text-xs">
                          {session.chaptersWorked} 章節 · {StatisticsService.formatTime(session.timeSpent)}
                        </div>
                      </div>
                      <div className="text-warm-gold font-bold">
                        +{StatisticsService.formatNumber(session.wordsWritten)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-text-disabled py-8">
                    <Icon name="PencilSquare" variant="outline" className="w-12 h-12 mx-auto mb-2 text-text-tertiary" />
                    <div>還沒有寫作記錄</div>
                    <div className="text-sm">開始創作來記錄您的進度！</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 專案統計標籤 */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {projectStats.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projectStats.map((project) => (
                <div key={project.id} className="bg-bg-light border border-warm-gold/20 rounded-lg p-6 hover:bg-bg-light/80 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-serif-tc text-text-primary mb-1">
                        {project.name}
                      </h3>
                      <div className="text-sm text-text-tertiary">
                        建立於 {project.createdAt.toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-text-tertiary">完成度</div>
                      <div className="text-lg font-bold text-warm-gold">
                        {project.completionPercentage}%
                      </div>
                    </div>
                  </div>

                  {/* 進度條 */}
                  <div className="w-full bg-bg-dark rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-accent-gold to-accent-secondary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.completionPercentage}%` }}
                    ></div>
                  </div>

                  {/* 統計數據 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warm-gold-light">
                        {project.totalChapters}
                      </div>
                      <div className="text-xs text-text-tertiary">章節</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-clay-orange">
                        {StatisticsService.formatNumber(project.totalWords)}
                      </div>
                      <div className="text-xs text-text-tertiary">字數</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-state-success">
                        {project.charactersCount}
                      </div>
                      <div className="text-xs text-text-tertiary">角色</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-warm-gold">
                        {StatisticsService.formatNumber(project.averageWordsPerChapter)}
                      </div>
                      <div className="text-xs text-text-tertiary">平均字數</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-warm-gold/20 text-xs text-text-disabled">
                    最後更新：{project.lastUpdated.toLocaleDateString('zh-TW')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Icon name="BookOpen" variant="solid" className="w-16 h-16 mx-auto mb-4 text-warm-gold" />
              <h3 className="text-xl text-text-secondary mb-2">還沒有專案</h3>
              <p className="text-text-tertiary mb-6">建立您的第一個創作專案來查看統計數據</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-accent-gold hover:bg-accent-gold/80 text-surface-base rounded-lg font-medium transition-colors"
              >
                開始創作
              </button>
            </div>
          )}
        </div>
      )}

      {/* 趨勢分析標籤 */}
      {activeTab === 'trends' && (
        <div className="space-y-8">
          {/* 寫作趨勢圖表 */}
          {overallStats && overallStats.recentActivity.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 每日字數趨勢 */}
              <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6">
                <h3 className="text-xl font-serif-tc text-warm-gold mb-6 flex items-center gap-2">
                  <Icon name="PencilSquare" variant="solid" className="w-6 h-6" />
                  每日字數趨勢
                </h3>
                <div className="h-64">
                  <WritingTrendChart
                    data={overallStats.recentActivity}
                    type="words"
                    className="h-full"
                  />
                </div>
              </div>

              {/* 每日寫作時間趨勢 */}
              <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6">
                <h3 className="text-xl font-serif-tc text-warm-gold mb-6 flex items-center gap-2">
                  <Icon name="Clock" variant="outline" className="w-6 h-6" />
                  每日時間趨勢
                </h3>
                <div className="h-64">
                  <WritingTrendChart
                    data={overallStats.recentActivity}
                    type="time"
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* 月度統計圖表 */}
          {monthlyStats.length > 0 && (
            <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6">
              <h3 className="text-xl font-serif-tc text-warm-gold mb-6 flex items-center gap-2">
                <Icon name="ArrowTrendingUp" variant="solid" className="w-6 h-6" />
                月度創作統計
              </h3>
              <div className="h-80">
                <MonthlyStatsChart
                  data={monthlyStats}
                  className="h-full"
                />
              </div>
            </div>
          )}
          
          {/* 月度詳細數據 */}
          <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6">
            <h3 className="text-xl font-serif-tc text-warm-gold mb-6 flex items-center gap-2">
              <Icon name="ChartBar" variant="solid" className="w-6 h-6" />
              月度詳細數據
            </h3>
            <div className="space-y-4">
              {monthlyStats.map((month, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-warm-gold/20 last:border-b-0">
                  <div className="flex-1">
                    <div className="text-text-primary font-medium">{month.month}</div>
                    <div className="text-sm text-text-tertiary">
                      {month.chaptersCompleted} 章節 · {StatisticsService.formatTime(month.timeSpent)}
                    </div>
                  </div>

                  <div className="flex-1 mx-4">
                    <div className="w-full bg-bg-dark rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-accent-secondary to-accent-gold h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((month.wordsWritten / 20000) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-warm-gold-light">
                      {StatisticsService.formatNumber(month.wordsWritten)}
                    </div>
                    <div className="text-xs text-text-tertiary">字</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 創作建議 */}
          <div className="bg-bg-light border border-warm-gold/20 rounded-lg p-6">
            <h3 className="text-xl font-serif-tc text-warm-gold mb-4 flex items-center gap-2">
              <Icon name="LightBulb" variant="solid" className="w-6 h-6" />
              創作建議
            </h3>
            <div className="space-y-4">
              <div className="bg-accent-gold/10 border border-accent-gold/20 rounded-lg p-4">
                <div className="flex items-center mb-2 gap-2">
                  <Icon name="Target" variant="solid" className="w-5 h-5 text-warm-gold" />
                  <span className="font-medium text-warm-gold">每日目標</span>
                </div>
                <p className="text-sm text-text-secondary">
                  建議每天寫作 500-1000 字，保持創作習慣。持續的小進步比偶爾的大突破更有效。
                </p>
              </div>

              <div className="bg-state-success/10 border border-state-success/30 rounded-lg p-4">
                <div className="flex items-center mb-2 gap-2">
                  <Icon name="BookOpen" variant="solid" className="w-5 h-5 text-state-success" />
                  <span className="font-medium text-state-success">章節規劃</span>
                </div>
                <p className="text-sm text-text-secondary">
                  每章保持 2000-4000 字的長度，有助於讀者閱讀和情節發展的節奏控制。
                </p>
              </div>

              <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-lg p-4">
                <div className="flex items-center mb-2 gap-2">
                  <Icon name="Bolt" variant="solid" className="w-5 h-5 text-clay-orange" />
                  <span className="font-medium text-clay-orange">效率提升</span>
                </div>
                <p className="text-sm text-text-secondary">
                  使用 AI 續寫功能來克服寫作瓶頸，但記得保持您的獨特風格和創意。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;