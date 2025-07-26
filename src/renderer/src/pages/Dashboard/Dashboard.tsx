import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { fetchProjects } from '../../store/slices/projectsSlice';
// import { checkOllamaService } from '../../store/slices/aiSlice'; // 暫時禁用
import ProjectGrid from './ProjectGrid';
import QuickActions from './QuickActions';
// import AIStatus from './AIStatus'; // 暫時禁用 AIStatus 組件

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects, loading } = useAppSelector(state => state.projects);
  // const { isOllamaConnected, availableModels } = useAppSelector(state => state.ai); // 暫時禁用 AI state
  const isOllamaConnected = false; // 臨時值
  const availableModels: string[] = []; // 臨時值

  useEffect(() => {
    // 載入專案列表
    dispatch(fetchProjects());
    
    // 暫時完全禁用 AI 檢查
    // setTimeout(() => {
    //   console.log('背景檢查 AI 服務...');
    //   dispatch(checkOllamaService()).catch(error => {
    //     console.error('AI 服務檢查失敗:', error);
    //   });
    // }, 3000);
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

        {/* AI 狀態卡片 - 簡化版 */}
        <div className="card">
          <h2 className="text-xl font-cosmic text-gold-500 mb-4">AI 引擎狀態</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 連接狀態 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl bg-gray-500/20 text-gray-400">
                🔧
              </div>
              <h3 className="font-medium mb-1">Ollama 服務</h3>
              <p className="text-sm text-gray-400">
                待檢查
              </p>
            </div>

            {/* 可用模型 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 mx-auto mb-3 flex items-center justify-center text-2xl">
                🤖
              </div>
              <h3 className="font-medium mb-1">可用模型</h3>
              <p className="text-sm text-gray-400">
                等待檢查
              </p>
            </div>

            {/* 狀態指示 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 mx-auto mb-3 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h3 className="font-medium mb-1">系統狀態</h3>
              <p className="text-sm text-green-400">
                正常運行
              </p>
            </div>
          </div>
          
          {/* AI 功能說明 */}
          <div className="mt-6 pt-6 border-t border-cosmic-700">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">🤖 AI 創作助手</h4>
              <p className="text-sm text-gray-300 mb-2">
                創世紀元整合 Ollama 本地 AI 引擎，為您的創作提供智能輔助。
              </p>
              <p className="text-sm text-gray-400">
                AI 功能將在後續版本中啟用，敬請期待！
              </p>
            </div>
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