import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { fetchProjects } from '../../store/slices/projectsSlice';
import { fetchAIProviders, setDefaultProvider, setDefaultModel } from '../../store/slices/aiSlice';
import { Card, CardContent } from '../../components/UI/Card';
import CosmicBackground from '../../components/UI/CosmicBackground';
// import { initStatusManager } from '../../modules/chapterStatus';
// import { useStatusStatistics } from '../../modules/chapterStatus/hooks';
import QuickActions from './QuickActions';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { projects, loading } = useAppSelector(state => state.projects);
  const { isOllamaConnected, availableModels, modelsInfo, currentProviderId, providers } = useAppSelector(state => state.ai);
  
  // 章節統計狀態
  const [chapterStats, setChapterStats] = useState({
    totalChapters: 0,
    completedCount: 0,
    completionRate: 0,
    statusDistribution: { draft: 0, writing: 0, reviewing: 0, completed: 0 }
  });
  
  // 將 useRef 移到組件頂層
  const hasLoadedRef = useRef(false);
  
  // 🔧 修復：計算當前提供者的連接狀態和名稱
  const currentProvider = providers.find(p => p.id === currentProviderId);
  const currentProviderName = currentProvider?.name || '未選擇';
  
  // 🐛 調試：記錄關鍵數據
  console.log('Dashboard: AI狀態調試 -', {
    currentProviderId,
    currentProviderName,
    availableModelsLength: availableModels.length,
    availableModels,
    isOllamaConnected,
    providersCount: providers.length
  });
  
  // 修復連接狀態判斷邏輯
  const isCurrentProviderConnected = currentProviderId 
    ? (currentProviderId === 'ollama' ? isOllamaConnected : availableModels.length > 0)
    : false;
  
  // 計算章節統計
  const calculateChapterStats = useCallback(async () => {
    try {
      console.log('Dashboard: 開始計算章節統計...');
      const { api } = await import('../../api');
      const { chapterStatusService } = await import('../../services/chapterStatusService');
      
      // 獲取所有專案的章節
      let allChapters: any[] = [];
      for (const project of projects) {
        try {
          const chapters = await api.chapters.getByProjectId(project.id);
          allChapters = [...allChapters, ...chapters];
        } catch (error) {
          console.warn(`無法載入專案 ${project.name} 的章節:`, error);
        }
      }
      
      // 計算統計數據
      const totalChapters = allChapters.length;
      const completedCount = chapterStatusService.calculateCompletedCount(allChapters);
      const completionRate = chapterStatusService.calculateCompletionRate(allChapters);
      const statusDistribution = chapterStatusService.getStatusDistribution(allChapters);
      
      setChapterStats({
        totalChapters,
        completedCount,
        completionRate,
        statusDistribution: {
          draft: statusDistribution.draft,
          writing: statusDistribution.writing,
          reviewing: statusDistribution.reviewing,
          completed: statusDistribution.completed
        }
      });
      
      console.log('Dashboard: 章節統計計算完成', {
        totalChapters,
        completedCount,
        completionRate
      });
    } catch (error) {
      console.error('Dashboard: 章節統計計算失敗:', error);
    }
  }, [projects]);

  useEffect(() => {
    // 初始化狀態管理系統
    const initStatusSystem = async () => {
      try {
        console.log('Dashboard: 初始化狀態管理系統...');
        console.log('Dashboard: 狀態管理系統初始化完成');
      } catch (error) {
        console.error('Dashboard: 狀態管理系統初始化失敗:', error);
      }
    };
    
    // 載入專案列表，添加錯誤處理
    const loadProjects = async () => {
      try {
        console.log('Dashboard: 開始載入專案...');
        const result = await dispatch(fetchProjects()).unwrap();
        console.log('Dashboard: 專案載入成功，數量:', result.length);
      } catch (error) {
        console.error('Dashboard: 專案載入失敗:', error);
      }
    };
    
    initStatusSystem();
    loadProjects();
    
    // 載入 AI 提供者列表
    const loadAIProviders = async () => {
      try {
        console.log('Dashboard: 載入 AI 提供者列表...');
        await dispatch(fetchAIProviders());
      } catch (error) {
        console.error('Dashboard: 載入 AI 提供者失敗:', error);
      }
    };
    
    loadAIProviders();
    
    // 從 localStorage 載入保存的 AI 設定
    const loadSavedAISettings = () => {
      console.log('Dashboard: 開始載入保存的 AI 設定...');
      try {
        const savedProvider = localStorage.getItem('ai_default_provider');
        const savedModel = localStorage.getItem('ai_default_model');
        
        console.log('Dashboard: localStorage 值:', { savedProvider, savedModel });
        
        if (savedProvider) {
          console.log('Dashboard: 載入保存的預設提供者:', savedProvider);
          dispatch(setDefaultProvider(savedProvider));
        }
        
        if (savedModel) {
          console.log('Dashboard: 載入保存的預設模型:', savedModel);
          dispatch(setDefaultModel(savedModel));
        }
      } catch (error) {
        console.error('Dashboard: 載入保存的 AI 設定失敗:', error);
      }
      console.log('Dashboard: AI 設定載入完成');
    };
    
    // 只在首次載入時執行，避免重複載入
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setTimeout(loadSavedAISettings, 100);
    }
    
    // AI 服務狀態完全由 App.tsx 處理，這裡不再重複調用
    console.log('Dashboard: AI 服務由 App.tsx 統一管理');
    console.log('Dashboard: AI 狀態 -', {
      isOllamaConnected,
      availableModels: availableModels.length,
      modelsInfo: modelsInfo?.success,
      currentProviderId,
      currentProviderName
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]); // 移除會頻繁變化的依賴項，避免無窮重繪

  // 當專案列表變化時，重新計算章節統計
  useEffect(() => {
    if (projects.length > 0) {
      calculateChapterStats();
    }
  }, [projects, calculateChapterStats]);

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
    <div className="h-screen overflow-y-auto force-scrollbar p-6 pb-16 relative">
      {/* 動畫星雲背景 */}
      <CosmicBackground 
        intensity="medium"
        showMagicCircles={true}
        showStars={true}
        className="z-0"
      />
      
      {/* 主要內容區域 */}
      <div className="relative z-10">
        {/* 標題區域 */}
        <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent mb-2">
          📚 創作工作台
        </h1>
        <p className="text-gray-400 text-lg">
          開始您的文學創作之旅
        </p>
      </div>

      {/* 統計卡片區域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 專案統計卡片 */}
        <Card className="bg-midnight-800 border-gray-700 hover:border-gold-500 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">📊</div>
              <div>
                <p className="text-sm text-gray-400">總專案數</p>
                <p className="text-2xl font-bold text-gold-400">{projects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 章節統計卡片 */}
        <Card className="bg-midnight-800 border-gray-700 hover:border-green-500 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">📝</div>
              <div>
                <p className="text-sm text-gray-400">總章節數</p>
                <p className="text-2xl font-bold text-green-400">{chapterStats.totalChapters}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 完成章節卡片 */}
        <Card className="bg-midnight-800 border-gray-700 hover:border-blue-500 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">✅</div>
              <div>
                <p className="text-sm text-gray-400">完成章節</p>
                <p className="text-2xl font-bold text-blue-400">{chapterStats.completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 完成率卡片 */}
        <Card className="bg-midnight-800 border-gray-700 hover:border-purple-500 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🎯</div>
              <div>
                <p className="text-sm text-gray-400">完成率</p>
                <p className="text-2xl font-bold text-purple-400">
                  {(chapterStats.completionRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI 狀態指示器 */}
      <div className="mb-8">
        <Card className="bg-midnight-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isCurrentProviderConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-300">
                  AI 服務狀態: {isCurrentProviderConnected ? '已連接' : '未連接'}
                </span>
                <span className="text-xs text-gray-500">
                  ({currentProviderName})
                </span>
              </div>
              <div className="text-sm text-gray-400">
                可用模型: {availableModels.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 完整功能卡片區域 */}
      <QuickActions />

      {/* 專案列表 */}
      {projects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">最近專案</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="cursor-pointer group"
              >
                <Card className="bg-midnight-800 border-gray-700 hover:border-gold-500 hover:shadow-xl hover:shadow-gold-500/20 transition-all duration-300 transform group-hover:scale-105 group-active:scale-95 relative overflow-hidden">
                  {/* 魔法光暈效果 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* 邊框發光效果 */}
                  <div className="absolute inset-0 rounded-lg ring-1 ring-gold-500/0 group-hover:ring-gold-500/30 transition-all duration-300"></div>
                  
                  <CardContent className="p-4 relative z-10">
                    <h3 className="font-semibold text-gray-200 mb-2 line-clamp-1 group-hover:text-gold-300 transition-colors duration-300">{project.name}</h3>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2 group-hover:text-gray-300 transition-colors duration-300">
                      {project.description || '暫無描述'}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-300">
                      <span>
                        更新: {new Date(project.updatedAt).toLocaleDateString('zh-TW')}
                      </span>
                      {/* 小箭頭指示器 */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gold-400">
                        →
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* 頂部魔法光點 */}
                  <div className="absolute top-2 right-2 w-2 h-2 bg-gold-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer 區域 */}
      <div className="mt-24 pt-16 border-t border-gray-700/50 mb-12">
        <div className="text-center text-gray-500 text-sm">
          <p className="mb-3">
            🌟 創世紀元 - 異世界創作神器 🌟
          </p>
          <p className="text-xs mb-4">
            用 AI 之力編織你的異世界傳說
          </p>
        </div>
      </div>
      {/* 關閉主要內容區域 */}
      </div>
    </div>
  );
};

export default Dashboard;