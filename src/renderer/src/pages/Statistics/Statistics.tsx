import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatisticsService, { 
  ProjectStatistics, 
  OverallStatistics, 
  MonthlyStats 
} from '../../services/statisticsService';

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
      console.error('載入統計數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
          <span className="ml-2 text-gray-300">載入統計數據中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 標題和導航 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-cosmic text-gold-400 mb-2">📊 創作統計</h1>
          <p className="text-gray-300">追蹤您的創作進度和成就</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
        >
          返回首頁
        </button>
      </div>

      {/* 標籤導航 */}
      <div className="mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '總覽', icon: '📈' },
            { id: 'projects', label: '專案統計', icon: '📚' },
            { id: 'trends', label: '趨勢分析', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'projects' | 'trends')}
              className={`flex items-center space-x-2 pb-4 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-gold-500 text-gold-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
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
            <div className="card text-center">
              <div className="text-3xl font-bold text-gold-500 mb-2">
                {overallStats.totalProjects}
              </div>
              <div className="text-gray-400">創作專案</div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">
                {overallStats.totalChapters}
              </div>
              <div className="text-gray-400">完成章節</div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {StatisticsService.formatNumber(overallStats.totalWords)}
              </div>
              <div className="text-gray-400">總字數</div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {overallStats.totalCharacters}
              </div>
              <div className="text-gray-400">創建角色</div>
            </div>
          </div>

          {/* 創作亮點 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-xl font-cosmic text-gold-400 mb-4">🏆 創作亮點</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">平均每日字數</span>
                  <span className="text-gold-400 font-bold">
                    {StatisticsService.formatNumber(overallStats.averageWordsPerDay)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">總寫作時間</span>
                  <span className="text-cyan-400 font-bold">
                    {StatisticsService.formatTime(overallStats.totalWritingTime)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">最高產的一天</span>
                  <span className="text-purple-400 font-bold">
                    {overallStats.mostProductiveDay || '尚無數據'}
                  </span>
                </div>
                
                {overallStats.longestChapter.wordCount > 0 && (
                  <div className="pt-4 border-t border-cosmic-700">
                    <div className="text-gray-300 mb-2">📖 最長章節</div>
                    <div className="text-sm">
                      <div className="text-white font-medium">
                        {overallStats.longestChapter.title}
                      </div>
                      <div className="text-gray-400">
                        《{overallStats.longestChapter.projectName}》 · {StatisticsService.formatNumber(overallStats.longestChapter.wordCount)} 字
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 最近活動 */}
            <div className="card">
              <h3 className="text-xl font-cosmic text-gold-400 mb-4">⚡ 最近活動</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {overallStats.recentActivity.length > 0 ? (
                  overallStats.recentActivity.map((session, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-cosmic-800 last:border-b-0">
                      <div>
                        <div className="text-white text-sm">{session.date}</div>
                        <div className="text-gray-400 text-xs">
                          {session.chaptersWorked} 章節 · {StatisticsService.formatTime(session.timeSpent)}
                        </div>
                      </div>
                      <div className="text-gold-400 font-bold">
                        +{StatisticsService.formatNumber(session.wordsWritten)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📝</div>
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
                <div key={project.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-cosmic text-white mb-1">
                        {project.name}
                      </h3>
                      <div className="text-sm text-gray-400">
                        建立於 {project.createdAt.toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">完成度</div>
                      <div className="text-lg font-bold text-gold-400">
                        {project.completionPercentage}%
                      </div>
                    </div>
                  </div>
                  
                  {/* 進度條 */}
                  <div className="w-full bg-cosmic-900 rounded-full h-2 mb-4">
                    <div 
                      className="bg-gradient-to-r from-gold-500 to-gold-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.completionPercentage}%` }}
                    ></div>
                  </div>
                  
                  {/* 統計數據 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-400">
                        {project.totalChapters}
                      </div>
                      <div className="text-xs text-gray-400">章節</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {StatisticsService.formatNumber(project.totalWords)}
                      </div>
                      <div className="text-xs text-gray-400">字數</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {project.charactersCount}
                      </div>
                      <div className="text-xs text-gray-400">角色</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">
                        {StatisticsService.formatNumber(project.averageWordsPerChapter)}
                      </div>
                      <div className="text-xs text-gray-400">平均字數</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-cosmic-700 text-xs text-gray-500">
                    最後更新：{project.lastUpdated.toLocaleDateString('zh-TW')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl text-gray-300 mb-2">還沒有專案</h3>
              <p className="text-gray-500 mb-6">建立您的第一個創作專案來查看統計數據</p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary"
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
          {/* 月度趨勢 */}
          <div className="card">
            <h3 className="text-xl font-cosmic text-gold-400 mb-6">📈 月度創作趨勢</h3>
            <div className="space-y-4">
              {monthlyStats.map((month, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-cosmic-800 last:border-b-0">
                  <div className="flex-1">
                    <div className="text-white font-medium">{month.month}</div>
                    <div className="text-sm text-gray-400">
                      {month.chaptersCompleted} 章節 · {StatisticsService.formatTime(month.timeSpent)}
                    </div>
                  </div>
                  
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-cosmic-900 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min((month.wordsWritten / 20000) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-cyan-400">
                      {StatisticsService.formatNumber(month.wordsWritten)}
                    </div>
                    <div className="text-xs text-gray-400">字</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 創作建議 */}
          <div className="card">
            <h3 className="text-xl font-cosmic text-gold-400 mb-4">💡 創作建議</h3>
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className="text-blue-400 mr-2">🎯</span>
                  <span className="font-medium text-blue-400">每日目標</span>
                </div>
                <p className="text-sm text-gray-300">
                  建議每天寫作 500-1000 字，保持創作習慣。持續的小進步比偶爾的大突破更有效。
                </p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className="text-green-400 mr-2">📚</span>
                  <span className="font-medium text-green-400">章節規劃</span>
                </div>
                <p className="text-sm text-gray-300">
                  每章保持 2000-4000 字的長度，有助於讀者閱讀和情節發展的節奏控制。
                </p>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className="text-purple-400 mr-2">⚡</span>
                  <span className="font-medium text-purple-400">效率提升</span>
                </div>
                <p className="text-sm text-gray-300">
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