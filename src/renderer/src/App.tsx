import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectEditor from './pages/ProjectEditor/ProjectEditor';
import CharacterManager from './pages/CharacterManager/CharacterManager';
import Settings from './pages/Settings/Settings';
import ModalContainer from './components/UI/ModalContainer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import CosmicBackground from './components/UI/CosmicBackground';
import { ErrorToastContainer } from './components/UI/ErrorToast';
import { NotificationContainer } from './components/UI/NotificationSystem';
import ErrorFallback from './components/UI/ErrorFallback';
import { SystemStatusPanel } from './components/UI/StatusIndicator';
import TutorialOverlay, { useTutorial } from './components/Tutorial/TutorialOverlay';
import HelpButton from './components/Help/HelpButton';
import QuickHelp from './components/Help/QuickHelp';
import { firstTimeTutorial } from './data/tutorialSteps';
import { useAppDispatch } from './hooks/redux';
import { checkOllamaService } from './store/slices/aiSlice';
import { ErrorHandler, withErrorBoundary } from './utils/errorUtils';
import { NotificationService } from './components/UI/NotificationSystem';
import { useSettingsApplication, useShortcuts } from './hooks/useSettings';
import AutoBackupService from './services/autoBackupService';
import UpdateManager from './components/Update/UpdateManager';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFirstTimeTutorial, setShowFirstTimeTutorial] = useState(false);
  
  // 應用設定
  const settings = useSettingsApplication();
  
  // 全域快捷鍵
  useShortcuts();
  
  const {
    isActive: isTutorialActive,
    currentStep,
    setCurrentStep,
    startTutorial,
    completeTutorial,
    skipTutorial,
    isTutorialCompleted
  } = useTutorial();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 顯示初始化通知
        NotificationService.info('正在初始化', '創世紀元正在啟動中...');
        
        // 檢查 Ollama 服務狀態
        await dispatch(checkOllamaService());
        
        // 初始化自動備份服務
        await AutoBackupService.initialize();
        
        // 模擬初始化時間，讓用戶看到載入動畫
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setIsInitialized(true);
        
        // 顯示成功通知
        NotificationService.success('初始化完成', '創世紀元已準備就緒！');
        
        // 檢查是否需要顯示首次使用教學
        const hasSeenTutorial = isTutorialCompleted('first-time');
        if (!hasSeenTutorial) {
          setTimeout(() => {
            setShowFirstTimeTutorial(true);
          }, 2000); // 2秒後顯示教學提示
        }
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
          '初始化失敗', 
          '應用程式初始化時遇到問題，某些功能可能無法正常使用'
        );
        
        setIsInitialized(true); // 即使失敗也要顯示界面
      }
    };

    initializeApp();
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cosmic-950 relative">
        <CosmicBackground intensity="high" />
        <div className="relative z-10 text-center">
          <div className="mb-8">
            <h1 className="font-cosmic text-4xl font-bold text-gold-500 mb-2 animate-pulse-glow">
              創世紀元
            </h1>
            <p className="text-lg text-gray-300 font-chinese">異世界創作神器</p>
          </div>
          <LoadingSpinner 
            size="large" 
            color="gold" 
            text="正在初始化創世紀元..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectEditor />} />
            <Route path="/characters/:projectId" element={<CharacterManager />} />
            <Route path="/settings" element={<Settings />} />
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
      
      {/* 新手教學覆蓋層 */}
      {showFirstTimeTutorial && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-cosmic-900/95 backdrop-blur-sm border border-gold-500/30 rounded-lg shadow-2xl max-w-md w-full p-6 text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-xl font-cosmic text-gold-400 mb-4">歡迎使用創世紀元！</h3>
            <p className="text-gray-300 mb-6">
              這是您第一次使用創世紀元嗎？我們準備了簡單的教學指南，幫助您快速上手。
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => {
                  setShowFirstTimeTutorial(false);
                  startTutorial('first-time');
                }}
                className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-lg hover:from-gold-600 hover:to-gold-700 transition-colors"
              >
                開始教學
              </button>
              <button
                onClick={() => {
                  setShowFirstTimeTutorial(false);
                  skipTutorial('first-time');
                }}
                className="px-4 py-2 bg-cosmic-800 text-gray-300 rounded-lg hover:bg-cosmic-700 transition-colors"
              >
                跳過
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 教學覆蓋層 */}
      <TutorialOverlay
        steps={firstTimeTutorial}
        isActive={isTutorialActive}
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