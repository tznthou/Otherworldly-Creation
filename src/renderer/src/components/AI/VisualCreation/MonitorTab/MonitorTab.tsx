import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../store/store';

// Redux actions (如果需要的話)
// import { ... } from '../../../../store/slices/visualCreationSlice';

interface MonitorTabProps {
  className?: string;
}

const MonitorTab: React.FC<MonitorTabProps> = ({ className = '' }) => {
  
  // Redux 狀態
  const {
    currentProvider,
    generationQueue,
    isGenerating,
    generationProgress,
    currentGenerationId,
  } = useSelector((state: RootState) => state.visualCreation);
  
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);

  // 獲取任務狀態統計
  const getTaskStats = () => {
    const total = generationQueue.length;
    const pending = generationQueue.filter(task => task.status === 'pending').length;
    const running = generationQueue.filter(task => task.status === 'running').length;
    const completed = generationQueue.filter(task => task.status === 'completed').length;
    const failed = generationQueue.filter(task => task.status === 'failed').length;
    
    return { total, pending, running, completed, failed };
  };

  const stats = getTaskStats();

  // 任務狀態圖標
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  // 任務狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`monitor-tab flex flex-col h-full ${className}`}>
      {/* 頂部統計卡片 */}
      <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* 總任務數 */}
        <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📊</div>
            <div>
              <p className="text-sm text-cosmic-400">總任務</p>
              <p className="text-xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        {/* 進行中 */}
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
          <div className="flex items-center space-x-3">
            <div className="text-2xl animate-spin">🔄</div>
            <div>
              <p className="text-sm text-blue-400">進行中</p>
              <p className="text-xl font-bold text-blue-300">{stats.running}</p>
            </div>
          </div>
        </div>

        {/* 已完成 */}
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">✅</div>
            <div>
              <p className="text-sm text-green-400">已完成</p>
              <p className="text-xl font-bold text-green-300">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* 失敗 */}
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/50">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">❌</div>
            <div>
              <p className="text-sm text-red-400">失敗</p>
              <p className="text-xl font-bold text-red-300">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 當前生成狀態 */}
      {isGenerating && currentGenerationId && (
        <div className="flex-shrink-0 bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-cosmic text-blue-400">🚀 正在生成插畫</h3>
            <div className="text-sm text-blue-300">{generationProgress}%</div>
          </div>
          
          {/* 進度條 */}
          <div className="w-full bg-cosmic-700 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-blue-300">
            <span>服務: {currentProvider === 'pollinations' ? 'Pollinations.AI (免費)' : 'Google Imagen (付費)'}</span>
            <span>專案: {currentProject?.name}</span>
          </div>
        </div>
      )}

      {/* 任務列表 */}
      <div className="flex-1 bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden">
        <div className="p-4 border-b border-cosmic-700">
          <h3 className="text-lg font-cosmic text-gold-500">📋 任務列表</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {generationQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="text-lg font-cosmic text-cosmic-300 mb-2">目前沒有任務</h4>
              <p className="text-sm text-cosmic-400">
                前往「創建」頁面開始生成插畫
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {generationQueue.map((task, index) => (
                <div
                  key={task.id}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${task.status === 'running' 
                      ? 'bg-blue-900/20 border-blue-700/50' 
                      : task.status === 'completed'
                      ? 'bg-green-900/20 border-green-700/50'
                      : task.status === 'failed'
                      ? 'bg-red-900/20 border-red-700/50'
                      : 'bg-cosmic-700/50 border-cosmic-600'
                    }
                  `}
                >
                  {/* 任務頭部 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(task.status)}</span>
                      <span className="font-medium text-white">
                        任務 #{index + 1}
                      </span>
                      <span className={`text-sm ${getStatusColor(task.status)}`}>
                        {task.status === 'pending' ? '等待中' :
                         task.status === 'running' ? '生成中' :
                         task.status === 'completed' ? '已完成' :
                         task.status === 'failed' ? '失敗' : '未知'}
                      </span>
                    </div>
                    
                    {/* 場景類型標籤 */}
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-cosmic-600 text-cosmic-200 rounded text-xs">
                        {task.sceneType === 'portrait' ? '👤 肖像' :
                         task.sceneType === 'interaction' ? '👥 互動' : '🏞️ 場景'}
                      </span>
                      <span className="text-xs text-cosmic-400">
                        {task.provider === 'pollinations' ? '🆓 免費' : '💳 付費'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 任務詳情 */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-cosmic-400 mb-1">提示詞：</p>
                      <p className="text-sm text-cosmic-200 bg-cosmic-800/50 p-2 rounded max-h-16 overflow-y-auto">
                        {task.prompt}
                      </p>
                    </div>
                    
                    {/* 角色信息 */}
                    {task.selectedCharacterIds.length > 0 && (
                      <div>
                        <p className="text-xs text-cosmic-400 mb-1">相關角色：</p>
                        <p className="text-sm text-cosmic-200">
                          {task.selectedCharacterIds.length} 個角色
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* 進度條（僅運行中的任務顯示） */}
                  {task.status === 'running' && (
                    <div className="mt-3">
                      <div className="w-full bg-cosmic-700 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-blue-300 mt-1">
                        <span>{task.progress}%</span>
                        <span>預估剩餘: {Math.max(0, 100 - task.progress) * 0.1}s</span>
                      </div>
                    </div>
                  )}
                  
                  {/* 錯誤信息 */}
                  {task.status === 'failed' && task.error && (
                    <div className="mt-3 p-2 bg-red-900/30 border border-red-700/50 rounded text-sm text-red-300">
                      <span className="font-medium">錯誤：</span> {task.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部操作區域 */}
      <div className="flex-shrink-0 mt-4 p-4 bg-cosmic-800/30 rounded-lg border border-cosmic-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-cosmic-400">
            <span>自動刷新: 每3秒</span>
            <span>•</span>
            <span>服務狀態: 
              <span className="ml-1 text-green-400">正常</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 bg-cosmic-700 hover:bg-cosmic-600 text-cosmic-200 rounded text-sm transition-colors"
              disabled={generationQueue.length === 0}
            >
              📊 導出報告
            </button>
            <button
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              disabled={generationQueue.filter(t => t.status === 'pending').length === 0}
            >
              🛑 停止所有
            </button>
          </div>
        </div>
      </div>

      {/* 使用說明 */}
      <div className="flex-shrink-0 mt-3 text-xs text-cosmic-500">
        <p>💡 <strong>監控說明：</strong></p>
        <p>• 此面板顯示所有插畫生成任務的實時狀態</p>
        <p>• 任務會自動排隊執行，避免同時佔用過多資源</p>
        <p>• 失敗的任務可以重新執行，或查看詳細錯誤信息</p>
      </div>
    </div>
  );
};

export default MonitorTab;