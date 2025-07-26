import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { fetchAvailableModels } from '../../store/slices/aiSlice';
import ProjectGrid from './ProjectGrid';
import QuickActions from './QuickActions';
import AIStatus from './AIStatus';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects, loading } = useAppSelector(state => state.projects);
  const { isOllamaConnected } = useAppSelector(state => state.ai);

  useEffect(() => {
    // 載入專案列表
    dispatch(fetchProjects());
    
    // 暫時禁用 AI 模型檢查
    // if (isOllamaConnected) {
    //   dispatch(fetchAvailableModels());
    // }
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gold-500">載入專案中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6" data-tutorial="dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 歡迎區域 */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-cosmic text-gold-500 mb-4">
            歡迎來到創世紀元
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            用 AI 之力編織你的異世界傳說
          </p>
          
          {/* 統計資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="card text-center">
              <div className="text-3xl font-bold text-gold-500 mb-2">
                {projects.length}
              </div>
              <div className="text-gray-400">創作專案</div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-mystic-400 mb-2">
                {projects.reduce((total, project) => {
                  // 這裡之後會從章節數據計算
                  return total + 0;
                }, 0)}
              </div>
              <div className="text-gray-400">完成章節</div>
            </div>
            
            <div className="card text-center">
              <div className={`text-3xl font-bold mb-2 ${
                isOllamaConnected ? 'text-green-400' : 'text-red-400'
              }`} data-tutorial="ai-status">
                {isOllamaConnected ? '已連接' : '未連接'}
              </div>
              <div className="text-gray-400">AI 引擎</div>
            </div>
          </div>
        </div>

        {/* AI 狀態卡片 - 暫時禁用 */}
        <div className="card">
          <h2 className="text-xl font-cosmic text-gold-500 mb-4">AI 引擎狀態</h2>
          <div className="text-center py-8">
            <p className="text-yellow-400 mb-2">🔧 AI 功能暫時禁用</p>
            <p className="text-sm text-gray-400">正在修復 Ollama 連接問題</p>
          </div>
        </div>

        {/* 快速操作 */}
        <QuickActions />

        {/* 專案網格 */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-cosmic text-gold-500">我的專案</h2>
            {projects.length > 0 && (
              <div className="text-sm text-gray-400">
                共 {projects.length} 個專案
              </div>
            )}
          </div>
          
          <ProjectGrid />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;