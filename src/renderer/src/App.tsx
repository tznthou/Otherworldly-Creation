import React, { useEffect, useState } from 'react';
import { integratePerformanceMonitoring } from './utils/performanceLogger';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectEditor from './pages/ProjectEditor/ProjectEditor';
import CharacterManager from './pages/CharacterManager/CharacterManager';
import IllustrationManager from './pages/IllustrationManager/IllustrationManager';
import Settings from './pages/Settings/Settings';
import AITest from './pages/AITest';
import ModalContainer from './components/UI/ModalContainer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import CosmicBackground from './components/UI/CosmicBackground';
import { ErrorToastContainer } from './components/UI/ErrorToast';
import NotificationContainer from './components/UI/NotificationContainer';
import ErrorFallback from './components/UI/ErrorFallback';
import { SystemStatusPanel } from './components/UI/StatusIndicator';
import TutorialOverlay, { useTutorial } from './components/Tutorial/TutorialOverlay';
import HelpButton from './components/Help/HelpButton';

import QuickHelp from './components/Help/QuickHelp';
import { firstTimeTutorial } from './data/tutorialSteps';
import { useAppDispatch } from './hooks/redux';
import { checkOllamaService, fetchModelsInfo } from './store/slices/aiSlice';
import { ErrorHandler, withErrorBoundary } from './utils/errorUtils';
import { NotificationService } from './components/UI/NotificationSystem';
import { useShortcuts } from './hooks/useShortcuts';
import { useI18n } from './hooks/useI18n';
import AutoBackupService from './services/autoBackupService';
import UpdateManager from './components/Update/UpdateManager';
import { isElectron, isTauri } from './api';

// 未知頁面組件
const UnknownPageComponent: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="h-full flex items-center justify-center bg-cosmic-950">
      <div className="text-center">
        <h1 className="text-2xl font-cosmic text-gold-500 mb-4">🔍 路由調試頁面</h1>
        <div className="text-left bg-cosmic-800 p-4 rounded mb-4 max-w-md">
          <p className="text-sm text-gray-300 mb-2">React Router Location: {location.pathname}</p>
          <p className="text-sm text-gray-300 mb-2">Window Location: {window.location.pathname}</p>
          <p className="text-sm text-gray-300 mb-2">Full URL: {window.location.href}</p>
          <p className="text-sm text-gray-300">Hash: {window.location.hash || '無'}</p>
        </div>
        {/* 路由調試輸出 */}
        <button 
          onClick={() => window.history.back()} 
          className="btn-primary"
        >
          返回
        </button>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  
  
  // 全域快捷鍵
  useShortcuts();
  
  // 國際化系統
  const { t } = useI18n();
  
  const {
    isActive: isTutorialActive,
    currentStep,
    currentTutorialId,
    setCurrentStep,
    completeTutorial,
    skipTutorial
  } = useTutorial();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 初始化性能監控系統
        integratePerformanceMonitoring();
        
        // 檢查運行環境
        console.log('=== App 初始化調試信息 ===');
        console.log('運行環境:', isElectron() ? 'Electron' : isTauri() ? 'Tauri' : 'Unknown');
        console.log('API 層已載入: Tauri API ready');
        
        // 顯示初始化通知
        NotificationService.info(t('common.info'), t('app.initializing'));
        
        // 初始化自動備份服務
        await AutoBackupService.initialize();
        
        // 將 Ollama 服務檢查移到背景執行（不阻塞初始化）
        setTimeout(async () => {
          console.log('App: 背景檢查 Ollama 服務...');
          console.log('App: 當前環境:', isElectron() ? 'Electron' : isTauri() ? 'Tauri' : 'Unknown');
          
          try {
            console.log('App: 開始調用 checkOllamaService...');
            const result = await dispatch(checkOllamaService()).unwrap();
            console.log('App: checkOllamaService 結果:', result);
            
            console.log('App: 開始載入模型列表...');
            const models = await dispatch(fetchModelsInfo()).unwrap();
            console.log('App: fetchModelsInfo 結果:', models);
            
            console.log('App: AI 服務初始化完成');
          } catch (error) {
            console.error('App: AI 服務初始化失敗:', error);
          }
        }, 500); // 0.5 秒後開始背景檢查
        
        // 模擬初始化時間，讓用戶看到載入動畫
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setIsInitialized(true);
        
        // 顯示成功通知
        NotificationService.success(t('common.success'), t('app.initSuccess'));
        
        // 移除自動顯示的首次教學提示，用戶可以透過幫助中心主動選擇教學
      } catch (error) {
        console.error('應用程式初始化失敗:', error);
        
        ErrorHandler.createError(
          'APP_INITIALIZATION_FAILED',
          '應用程式初始化失敗',
          {
            description: error instanceof Error ? error.message : '未知錯誤',
            severity: 'high',
            category: 'system',
            context: { phase: 'initialization' }
          }
        );
        
        NotificationService.error(
          t('common.error'), 
          t('app.initFailed')
        );
        
        setIsInitialized(true); // 即使失敗也要顯示界面
      }
    };

    initializeApp();
  }, [dispatch, t]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cosmic-950 relative">
        <CosmicBackground intensity="high" />
        <div className="relative z-10 text-center">
          <div className="mb-8">
            <h1 className="font-cosmic text-4xl font-bold text-gold-500 mb-2 animate-pulse-glow">
              {t('app.title')}
            </h1>
            <p className="text-lg text-gray-300 font-chinese">{t('app.subtitle')}</p>
          </div>
          <LoadingSpinner 
            size="large" 
            color="gold" 
            text={t('app.initializing')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/ai-test" element={<AITest />} />
            <Route path="/database-maintenance" element={
              <div className="h-full flex items-center justify-center bg-cosmic-950">
                <div className="text-center">
                  <h1 className="text-2xl font-cosmic text-gold-500 mb-4">💾 資料管理</h1>
                  <p className="text-gray-300 mb-4">資料管理頁面正常工作！</p>
                  {/* Database Maintenance 路由 */}
                </div>
              </div>
            } />
            <Route path="/project/:id" element={<ProjectEditor />} />
            <Route path="/characters/:projectId" element={<CharacterManager />} />
            <Route path="/illustrations/:projectId" element={<IllustrationManager />} />
            {/* 捕捉所有未匹配的路由 */}
            <Route path="*" element={<UnknownPageComponent />} />
          </Routes>
        </Layout>
        <ModalContainer />
        
        {/* 系統狀態面板 */}
        <div className="fixed bottom-4 left-4 z-40">
          <SystemStatusPanel />
        </div>
        
        {/* 幫助按鈕 */}
        <HelpButton />
        
        {/* 快速幫助提示 */}
        <QuickHelp />
      </Router>
      
      {/* 移除自動彈出的新手教學提示，用戶可透過幫助中心主動開始教學 */}
      
      {/* 教學覆蓋層 */}
      <TutorialOverlay
        steps={firstTimeTutorial}
        isActive={isTutorialActive && currentTutorialId === 'first-time'}
        currentStepIndex={currentStep}
        onStepChange={setCurrentStep}
        onComplete={() => completeTutorial('first-time')}
        onSkip={() => skipTutorial('first-time')}
      />
      
      {/* 全域通知和錯誤提示 */}
      <ErrorToastContainer />
      <NotificationContainer />
      
      {/* 自動更新管理器 */}
      <UpdateManager />
      
    </div>
  );
};

// 使用錯誤邊界包裝的主應用程式組件
const App = withErrorBoundary(AppContent, ErrorFallback);

export default App;