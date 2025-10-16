import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { fetchProjects, setCurrentProject } from '../../store/slices/projectsSlice';
import { setDefaultProvider, setDefaultModel } from '../../store/slices/aiSlice';
import { openModal } from '../../store/slices/uiSlice';
import HumanBackground from '../../components/UI/HumanBackground';
import type { Chapter } from '../../api/models';
// import { initStatusManager } from '../../modules/chapterStatus';
// import { useStatusStatistics } from '../../modules/chapterStatus/hooks';
import QuickActions from './QuickActions';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('Dashboard');

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
  log.debug('Dashboard: AI狀態調試 -', {
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
      log.debug('Dashboard: 開始計算章節統計...');
      const { api } = await import('../../api');
      const { chapterStatusService } = await import('../../services/chapterStatusService');
      
      // 獲取所有專案的章節並統一狀態解析
      let allChapters: Array<{ id: string; title: string; status: string; content?: unknown; projectId: string; order: number; createdAt: string; updatedAt: string }> = [];
      for (const project of projects) {
        try {
          const chapters = await api.chapters.getByProjectId(project.id);
          
          // 🔄 統一狀態解析：確保與 ChapterStatusPage 一致
          const chaptersWithStatus = chapters.map(chapter => {
            let status = 'draft'; // 預設狀態
            try {
              if (chapter.metadata) {
                const metadata = JSON.parse(chapter.metadata);
                status = metadata.status || chapter.status || 'draft';
              } else if (chapter.status) {
                status = chapter.status;
              }
            } catch (error) {
              log.warn(`Dashboard: 章節 ${chapter.title} metadata 解析失敗:`, error);
              status = chapter.status || 'draft';
            }
            
            return {
              ...chapter,
              status // 確保狀態正確設定
            };
          });
          
          allChapters = [...allChapters, ...chaptersWithStatus];
        } catch (error) {
          log.warn(`無法載入專案 ${project.name} 的章節:`, error);
        }
      }
      
      // 計算統計數據
      const totalChapters = allChapters.length;
      // 確保章節數據符合 Chapter 類型
      const chaptersForService = allChapters as Chapter[];
      const completedCount = chapterStatusService.calculateCompletedCount(chaptersForService);
      const completionRate = chapterStatusService.calculateCompletionRate(chaptersForService);
      const statusDistribution = chapterStatusService.getStatusDistribution(chaptersForService);
      
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
      
      // 🔍 調試：顯示章節狀態解析結果
      const statusBreakdown = allChapters.reduce((acc, chapter) => {
        acc[chapter.status] = (acc[chapter.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      log.debug('Dashboard: 章節統計計算完成', {
        totalChapters,
        completedCount,
        completionRate,
        statusBreakdown, // 顯示各狀態的章節數量
        sampleChapters: allChapters.slice(0, 3).map(c => ({ 
          title: c.title, 
          status: c.status,
          hasMetadata: !!(c as Record<string, unknown>).metadata 
        })) // 顯示前3個章節的狀態信息
      });
    } catch (error) {
      log.error('Dashboard: 章節統計計算失敗:', error);
    }
  }, [projects]);

  useEffect(() => {
    // 初始化狀態管理系統
    const initStatusSystem = async () => {
      try {
        log.debug('Dashboard: 初始化狀態管理系統...');
        log.debug('Dashboard: 狀態管理系統初始化完成');
      } catch (error) {
        log.error('Dashboard: 狀態管理系統初始化失敗:', error);
      }
    };
    
    // 載入專案列表，添加錯誤處理
    const loadProjects = async () => {
      try {
        log.debug('Dashboard: 開始載入專案...');
        const result = await dispatch(fetchProjects()).unwrap();
        log.debug('Dashboard: 專案載入成功，數量:', result.length);
      } catch (error) {
        log.error('Dashboard: 專案載入失敗:', error);
      }
    };
    
    initStatusSystem();
    loadProjects();
    
    // ✅ AI 提供者列表由 App.tsx 統一載入，這裡不需要重複載入
    log.debug('Dashboard: AI 提供者列表由 App.tsx 統一管理');
    
    // 從 localStorage 載入保存的 AI 設定
    const loadSavedAISettings = () => {
      log.debug('Dashboard: 開始載入保存的 AI 設定...');
      try {
        const savedProvider = localStorage.getItem('ai_default_provider');
        const savedModel = localStorage.getItem('ai_default_model');
        
        log.debug('Dashboard: localStorage 值:', { savedProvider, savedModel });
        
        if (savedProvider) {
          log.debug('Dashboard: 載入保存的預設提供者:', savedProvider);
          dispatch(setDefaultProvider(savedProvider));
        }
        
        if (savedModel) {
          log.debug('Dashboard: 載入保存的預設模型:', savedModel);
          dispatch(setDefaultModel(savedModel));
        }
      } catch (error) {
        log.error('Dashboard: 載入保存的 AI 設定失敗:', error);
      }
      log.debug('Dashboard: AI 設定載入完成');
    };
    
    // 只在首次載入時執行，避免重複載入
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setTimeout(loadSavedAISettings, 100);
    }
    
    // AI 服務狀態完全由 App.tsx 處理，這裡不再重複調用
    log.debug('Dashboard: AI 服務由 App.tsx 統一管理');
    log.debug('Dashboard: AI 狀態 -', {
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

  // 🔄 監聽全局統計更新通知
  useEffect(() => {
    const handleStatsRefresh = () => {
      log.debug('📊 [Dashboard] 收到全局統計更新通知，重新計算統計...');
      if (projects.length > 0) {
        calculateChapterStats();
      }
    };

    // 使用自定義事件來實現跨組件通信
    window.addEventListener('refreshGlobalStats', handleStatsRefresh);

    return () => {
      window.removeEventListener('refreshGlobalStats', handleStatsRefresh);
    };
  }, [projects, calculateChapterStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-warm-gold">載入專案中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto force-scrollbar p-6 pb-16 relative">
      {/* 人文背景 - 深夜書房氛圍 */}
      <HumanBackground
        intensity="medium"
        className="z-0"
      />
      
      {/* 主要內容區域 */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-16">
          <h1 className="font-serif-tc font-black text-6xl lg:text-7xl text-text-primary mb-4 leading-tight">
            創作是孤獨的旅程
          </h1>
          <p className="font-sans-tc text-xl text-text-secondary">
            但你並不孤單
          </p>
        </div>

      {/* 統計卡片區域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* 專案統計卡片 */}
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-3xl p-8 border border-warm-gold/10 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="text-3xl mb-3">📊</div>
          <p className="font-sans-tc text-sm text-text-secondary mb-2">總專案數</p>
          <p className="font-serif-tc text-4xl font-bold text-warm-gold">{projects.length}</p>
        </div>

        {/* 章節統計卡片 */}
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-3xl p-8 border border-warm-gold/10 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="text-3xl mb-3">📝</div>
          <p className="font-sans-tc text-sm text-text-secondary mb-2">總章節數</p>
          <p className="font-serif-tc text-4xl font-bold text-warm-gold">{chapterStats.totalChapters}</p>
        </div>

        {/* 完成章節卡片 */}
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-3xl p-8 border border-warm-gold/10 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="text-3xl mb-3">✅</div>
          <p className="font-sans-tc text-sm text-text-secondary mb-2">完成章節</p>
          <p className="font-serif-tc text-4xl font-bold text-warm-gold">{chapterStats.completedCount}</p>
        </div>

        {/* 完成率卡片 */}
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-3xl p-8 border border-warm-gold/10 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="text-3xl mb-3">🎯</div>
          <p className="font-sans-tc text-sm text-text-secondary mb-2">完成率</p>
          <p className="font-serif-tc text-4xl font-bold text-warm-gold">
            {(chapterStats.completionRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* AI 狀態指示器 */}
      <div className="mb-8">
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-3xl p-6 border border-warm-gold/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isCurrentProviderConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-sans-tc text-text-primary">
                AI 服務狀態: {isCurrentProviderConnected ? '已連接' : '未連接'}
              </span>
              <span className="font-sans-tc text-xs text-text-secondary">
                ({currentProviderName})
              </span>
            </div>
            <div className="font-sans-tc text-sm text-text-secondary">
              可用模型: {availableModels.length}
            </div>
          </div>
        </div>
      </div>

      {/* 完整功能卡片區域 */}
      <QuickActions />

      {/* 專案列表 */}
      {projects.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif-tc text-3xl font-bold text-text-primary mb-6">最近專案</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="bg-bg-light/50 backdrop-blur-sm rounded-3xl p-6 border border-warm-gold/10 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer group relative"
              >
                  <div className="relative z-10">
                    {/* 操作按鈕群組 - 放在內容區域內，使用絕對定位 */}
                    <div className="absolute -top-1 -right-1 z-50 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setCurrentProject(project));
                          dispatch(openModal('projectManage'));
                        }}
                        className="w-7 h-7 rounded-full bg-clay-orange/95 hover:bg-warm-gold flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 backdrop-blur-sm border border-warm-gold/30"
                        title="編輯專案"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setCurrentProject(project));
                          dispatch(openModal('deleteProject'));
                        }}
                        className="w-7 h-7 rounded-full bg-red-900/40 hover:bg-red-900/60 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 backdrop-blur-sm border border-red-500/40"
                        title="刪除專案"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* 可點擊區域包裹內容 */}
                    <div
                      onClick={() => navigate(`/project/${project.id}`)}
                      className="cursor-pointer"
                    >
                      {/* 添加右邊距避免標題被按鈕遮擋 */}
                      <h3 className="font-serif-tc text-xl font-bold text-text-primary mb-3 line-clamp-1 group-hover:text-warm-gold transition-colors duration-300 pr-20">{project.name}</h3>
                      <p className="font-sans-tc text-sm text-text-secondary mb-4 line-clamp-2 leading-relaxed">
                        {project.description || '暫無描述'}
                      </p>
                      <div className="flex justify-between items-center font-sans-tc text-xs text-text-secondary border-t border-warm-gold/10 pt-4">
                        <span>
                          更新: {new Date(project.updatedAt).toLocaleDateString('zh-TW')}
                        </span>
                        {/* 小箭頭指示器 */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-warm-gold">
                          →
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer 區域 */}
      <div className="mt-24 pt-16 border-t border-warm-gold/10 mb-12">
        <div className="text-center">
          <p className="font-serif-tc text-text-secondary text-sm mb-3">
            創世紀元 - 異世界創作神器
          </p>
          <p className="font-sans-tc text-text-secondary/60 text-xs mb-4">
            動筆，才是思考的開始
          </p>
        </div>
      </div>
      {/* 關閉主要內容區域 */}
      </div>
    </div>
  );
};

export default Dashboard;