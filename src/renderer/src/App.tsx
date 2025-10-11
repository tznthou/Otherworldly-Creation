import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAppDispatch } from './hooks/redux';
import { useSettings } from './hooks/useSettings';
import { fetchModelsInfo, fetchAIProviders, setActiveProvider } from './store/slices/aiSlice';
import { fetchProjects } from './store/slices/projectsSlice';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import CharacterManager from './pages/CharacterManager/CharacterManager';
import Settings from './pages/Settings/Settings';
import DatabaseMaintenanceSimple from './pages/DatabaseMaintenance/DatabaseMaintenanceSimple';
import ProjectEditor from './pages/ProjectEditor/ProjectEditor';
import Statistics from './pages/Statistics/Statistics';
import { ChapterStatusPage } from './pages/ChapterStatus';
import ModalContainer from './components/UI/ModalContainer';
import { NotificationContainer } from './components/UI/NotificationSystem';
import SimpleErrorBoundary from './components/UI/SimpleErrorBoundary';
import ProgressContainer from './components/Progress/ProgressContainer';
import { i18n } from './i18n';
import { initReactScan } from './utils/reactScan';
import { createLogger } from './utils/logger';

// 創建模組專用 logger
const log = createLogger('App');

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  // 🔐 載入加密設定（觸發 localStorage → Tauri Store 遷移）
  useSettings();

  useEffect(() => {
    const initApp = async () => {
      try {
        log.debug('🚀 開始應用程式初始化...');

        // 🔐 強制測試加密設定遷移
        log.debug('🔐 [FORCE TEST] 開始測試加密設定遷移...');
        const { SettingsService } = await import('./services/settingsService');
        log.debug('🔐 [FORCE TEST] SettingsService imported');
        const testSettings = await SettingsService.loadSettings();
        log.debug('🔐 [FORCE TEST] 設定載入完成:', testSettings);
        const lcCheck = localStorage.getItem('genesis-chronicle-settings');
        console.log('🔐 [FORCE TEST] localStorage check:', lcCheck ? `❌ 仍存在 (${lcCheck.length} chars)` : '✅ 已清除'); // TODO: 複雜模式，需人工轉換

        // 初始化 React Scan 性能監控（僅開發環境）
        initReactScan();

        // 初始化 i18n 系統
        log.debug('🌐 初始化國際化系統...');
        try {
          await i18n.initialize();
          log.debug('✅ 國際化系統初始化完成');
        } catch (error) {
          log.warn('⚠️  國際化系統初始化失敗，使用預設語言:', error);
        }
        
        // 最小延遲確保所有系統就緒
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 隱藏載入畫面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
        
        setIsLoading(false);
        
        // 背景載入資料（不阻塞 UI）
        setTimeout(async () => {
          try {
            log.debug('📂 載入專案資料...');
            await dispatch(fetchProjects()).unwrap();
            log.debug('✅ 專案資料載入完成');
          } catch (error) {
            log.warn('⚠️  專案資料載入失敗:', error);
          }
        }, 100);
        
        // 背景初始化 AI 服務
        setTimeout(async () => {
          try {
            log.debug('🤖 初始化 AI 提供者系統...');
            
            const providers = await dispatch(fetchAIProviders()).unwrap();
            log.debug('✅ AI 提供者列表載入完成，數量:', providers.length);
            
            const savedProvider = localStorage.getItem('ai_default_provider');
            const currentProvider = savedProvider || (providers.find(p => p.is_enabled)?.id);
            
            log.debug('🎯 當前提供者:', currentProvider);
            
            if (currentProvider) {
              log.debug('📡 載入提供者模型:', currentProvider);
              
              try {
                await dispatch(fetchModelsInfo()).unwrap();
                await dispatch(setActiveProvider(currentProvider)).unwrap();
                log.debug('✅ AI 提供者系統初始化完成');
              } catch (error) {
                log.warn('⚠️  AI 提供者系統初始化部分失敗:', error);
              }
            }
          } catch (error) {
            log.warn('⚠️  AI 提供者系統初始化失敗:', error);
          }
        }, 500);
        
      } catch (error) {
        log.error('❌ 應用程式初始化失敗:', error);
        setInitError(error instanceof Error ? error.message : '未知錯誤');
      }
    };

    initApp();
  }, []); // 🔥 修復無限循環：移除 dispatch 依賴，只在組件掛載時執行一次

  // 載入中狀態
  if (isLoading) {
    return null; // 載入畫面由 HTML 處理
  }

  // 如果有嚴重的初始化錯誤，顯示錯誤畫面
  if (initError) {
    return (
      <div className="min-h-screen bg-cosmic-950 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-6">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-4">應用程式初始化失敗</h1>
          <p className="text-gray-300 mb-6">{initError}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gold-500 text-black rounded-lg hover:bg-gold-600 transition-colors font-medium"
            >
              重新載入應用程式
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SimpleErrorBoundary context="主應用程式">
      <div className="relative">
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div className="min-h-screen bg-cosmic-950 text-white">
            <SimpleErrorBoundary context="路由系統">
              <Routes>
                <Route path="/" element={
                  <SimpleErrorBoundary context="儀表板">
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </SimpleErrorBoundary>
                } />
                <Route path="/settings" element={
                  <SimpleErrorBoundary context="設定頁面">
                    <Layout>
                      <Settings />
                    </Layout>
                  </SimpleErrorBoundary>
                } />
                <Route path="/database-maintenance" element={
                  <SimpleErrorBoundary context="資料庫維護">
                    <Layout>
                      <DatabaseMaintenanceSimple />
                    </Layout>
                  </SimpleErrorBoundary>
                } />
                <Route path="/characters/:projectId" element={
                  <SimpleErrorBoundary context="角色管理">
                    <Layout>
                      <CharacterManager />
                    </Layout>
                  </SimpleErrorBoundary>
                } />
                <Route path="/project/:id" element={
                  <SimpleErrorBoundary context="專案編輯器">
                    <Layout>
                      <ProjectEditor />
                    </Layout>
                  </SimpleErrorBoundary>
                } />
                <Route path="/statistics" element={
                  <SimpleErrorBoundary context="統計資訊">
                    <Layout>
                      <Statistics />
                    </Layout>
                  </SimpleErrorBoundary>
                } />
                <Route path="/chapter-status/:projectId" element={
                  <SimpleErrorBoundary context="章節管理">
                    <Layout>
                      <ChapterStatusPage />
                    </Layout>
                  </SimpleErrorBoundary>
                } />
                <Route path="*" element={
                  <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                      <h2 className="text-xl text-gold-400 mb-4">頁面不存在</h2>
                      <p className="text-gray-300">路徑：{window.location.pathname}</p>
                      <button 
                        onClick={() => window.history.back()} 
                        className="mt-4 px-4 py-2 bg-gold-500 text-black rounded hover:bg-gold-600"
                      >
                        返回
                      </button>
                    </div>
                  </div>
                } />
              </Routes>
            </SimpleErrorBoundary>
          </div>
          
          {/* 模態框容器 - 關鍵！*/}
          <SimpleErrorBoundary context="模態框系統">
            <ModalContainer />
          </SimpleErrorBoundary>
          
          {/* 通知系統 */}
          <SimpleErrorBoundary context="通知系統">
            <NotificationContainer />
          </SimpleErrorBoundary>
          
          {/* 進度指示器容器 */}
          <SimpleErrorBoundary context="進度指示器系統">
            <ProgressContainer />
          </SimpleErrorBoundary>
        </Router>
      </div>
    </SimpleErrorBoundary>
  );
};

export default App;