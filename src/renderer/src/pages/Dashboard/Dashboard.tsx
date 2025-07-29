import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { fetchModelsInfo } from '../../store/slices/aiSlice'; // 只更新模型列表
import ProjectGrid from './ProjectGrid';
import QuickActions from './QuickActions';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects, loading } = useAppSelector(state => state.projects);
  const { isOllamaConnected, availableModels, modelsInfo } = useAppSelector(state => state.ai); // 重新啟用 AI state

  useEffect(() => {
    // 載入專案列表
    dispatch(fetchProjects());
    
    // AI 服務狀態完全由 App.tsx 處理，這裡不再重複調用
    console.log('Dashboard: AI 服務由 App.tsx 統一管理');
    console.log('Dashboard: AI 狀態 -', {
      isOllamaConnected,
      availableModels: availableModels.length,
      modelsInfo: modelsInfo?.success
    });
  }, [dispatch, isOllamaConnected, availableModels, modelsInfo]);

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

        {/* AI 狀態卡片 */}
        <div className="card">
          <h2 className="text-xl font-cosmic text-gold-500 mb-4">AI 引擎狀態</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 連接狀態 */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl ${
                isOllamaConnected 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {isOllamaConnected ? '✅' : '🔧'}
              </div>
              <h3 className="font-medium mb-1">Ollama 服務</h3>
              <p className={`text-sm ${
                isOllamaConnected ? 'text-green-400' : 'text-gray-400'
              }`}>
                {isOllamaConnected ? '已連接' : '檢查中...'}
              </p>
            </div>

            {/* 可用模型 */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl ${
                availableModels.length > 0 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                🤖
              </div>
              <h3 className="font-medium mb-1">可用模型</h3>
              <p className={`text-sm ${
                availableModels.length > 0 ? 'text-blue-400' : 'text-gray-400'
              }`}>
                {availableModels.length > 0 ? `${availableModels.length} 個模型` : '檢查中...'}
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
            {isOllamaConnected && availableModels.length > 0 ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-medium mb-2">🤖 AI 創作助手已就緒</h4>
                <p className="text-sm text-gray-300 mb-2">
                  檢測到 {availableModels.length} 個可用模型，AI 創作功能已可使用。
                </p>
                <p className="text-sm text-green-400">
                  可用模型：{availableModels.slice(0, 3).join(', ')}{availableModels.length > 3 ? '...' : ''}
                </p>
              </div>
            ) : isOllamaConnected === false ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h4 className="text-red-400 font-medium mb-2">⚠️ AI 服務未連接</h4>
                <p className="text-sm text-gray-300 mb-2">
                  Ollama 服務未啟動或無法連接。
                </p>
                <p className="text-sm text-red-400">
                  請啟動 Ollama 服務以使用 AI 功能
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">🔄 正在檢查 AI 服務</h4>
                <p className="text-sm text-gray-300 mb-2">
                  創世紀元整合 Ollama 本地 AI 引擎，為您的創作提供智能輔助。
                </p>
                <p className="text-sm text-gray-400">
                  正在檢查 AI 服務狀態和可用模型...
                </p>
              </div>
            )}
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