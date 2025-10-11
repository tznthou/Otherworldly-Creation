import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store/store';
import { useAppDispatch } from './hooks/redux';
import { useSettings } from './hooks/useSettings';
import { checkOllamaService, fetchModelsInfo, fetchAIProviders, setActiveProvider } from './store/slices/aiSlice';
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
// import { performanceMonitor } from './utils/performanceMonitor';
// import { performanceBenchmark } from './utils/performanceBenchmark';
import './index.css';
import { createLogger } from './utils/logger';

// 創建模組專用 logger
const log = createLogger('main-stable');

// 🔐 最早期設定遷移 - 在任何組件渲染之前執行
(async () => {
  try {
    log.debug('🔐 [EARLY INIT] 開始早期設定遷移檢查...');
    const { SettingsService } = await import('./services/settingsService');
    await SettingsService.loadSettings();
    log.debug('🔐 [EARLY INIT] 設定載入完成');

    const lcCheck = localStorage.getItem('genesis-chronicle-settings');
    if (lcCheck) {
      log.debug('⚠️ [EARLY INIT] localStorage 仍有設定，遷移可能失敗');
    } else {
      log.debug('✅ [EARLY INIT] localStorage 已清除，遷移成功！');
    }
  } catch (error) {
    log.error('❌ [EARLY INIT] 早期設定遷移失敗:', error);
  }
})();

// 🛡️ 超早期錯誤攔截器 - 在任何其他代碼運行之前設置
(() => {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // 重寫 console.error 來過濾 Tauri 錯誤
  console.error = (...args: unknown[]) => {
    const errorString = args.join(' ');
    if (errorString.includes('callbackId') || 
        errorString.includes('undefined is not an object') ||
        errorString.includes('evaluating')) {
      log.warn('🛡️  [已攔截] Tauri 錯誤:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args: unknown[]) => {
    const warnString = args.join(' ');
    if (warnString.includes('callbackId') || 
        warnString.includes('undefined is not an object')) {
      return; // 完全靜默這些警告
    }
    originalConsoleWarn.apply(console, args);
  };
  
  // 設置最早期的錯誤攔截
  const earlyErrorHandler = (event: ErrorEvent) => {
    const errorMessage = event.error?.message || event.message || '';
    if (errorMessage.includes('callbackId') || 
        errorMessage.includes('undefined is not an object') ||
        errorMessage.includes('evaluating')) {
      log.warn('🛡️  [超早期攔截] Tauri 錯誤已被攔截');
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  };
  
  const earlyPromiseHandler = (event: PromiseRejectionEvent) => {
    const errorMessage = event.reason instanceof Error ? event.reason.message : 
                        typeof event.reason === 'string' ? event.reason : '';
    if (errorMessage.includes('callbackId') || 
        errorMessage.includes('undefined is not an object') ||
        errorMessage.includes('evaluating')) {
      log.warn('🛡️  [超早期攔截] Tauri Promise 拒絕已被攔截');
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  };
  
  window.addEventListener('error', earlyErrorHandler, true);
  window.addEventListener('unhandledrejection', earlyPromiseHandler, true);
  
  log.debug('🛡️  超早期錯誤攔截器已啟用');
})();


// 🛡️ 全局初始化標誌 - 確保整個應用程式生命週期內只初始化一次
let GLOBAL_INIT_FLAG = false;

// 簡化的應用程式組件
const SimpleApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  // 🔐 載入加密設定（觸發 localStorage → Tauri Store 遷移）
  useSettings();

  // 🔧 修復無限循環：使用 useRef 確保初始化只執行一次
  const hasInitialized = useRef(false);

  useEffect(() => {
    // 🛡️ 雙重保護：檢查全局標誌和組件標誌
    if (GLOBAL_INIT_FLAG || hasInitialized.current) {
      log.debug('🛡️ 初始化已完成，跳過重複調用');
      return;
    }

    // 🔒 立即設置標誌，防止並發調用
    GLOBAL_INIT_FLAG = true;
    hasInitialized.current = true;

    const initApp = async () => {
      try {
        log.debug('🚀 開始應用程式初始化...');

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

        // 背景初始化 AI 服務（多提供者支援）
        setTimeout(async () => {
          try {
            log.debug('🤖 初始化 AI 提供者系統...');

            // 1. 載入 AI 提供者列表
            const providers = await dispatch(fetchAIProviders()).unwrap();
            log.debug('✅ AI 提供者列表載入完成，數量:', providers.length);

            // 2. 從 localStorage 獲取當前選中的提供者
            const savedProvider = localStorage.getItem('ai_default_provider');
            const currentProvider = savedProvider || (providers.find(p => p.is_enabled)?.id);

            log.debug('🎯 當前提供者:', currentProvider);

            if (currentProvider) {
              // 3. 載入當前提供者的模型列表 - 關鍵修復！
              log.debug('📡 載入提供者模型:', currentProvider);
              await dispatch(setActiveProvider(currentProvider)).unwrap();
              log.debug('✅ 提供者模型載入完成');
            }

            // 4. 向後兼容：也檢查 Ollama 服務（如果是 Ollama 提供者）
            if (currentProvider === 'ollama') {
              try {
                const isOllamaConnected = await dispatch(checkOllamaService()).unwrap();
                if (isOllamaConnected) {
                  log.debug('✅ Ollama 服務額外驗證通過');
                  await dispatch(fetchModelsInfo()).unwrap();
                  log.debug('✅ Ollama 詳細模型資訊載入完成');
                }
              } catch (error) {
                log.warn('⚠️  Ollama 服務額外檢查失敗:', error);
              }
            }

          } catch (error) {
            log.warn('⚠️  AI 系統初始化失敗:', error);
            // 降級處理：如果多提供者初始化失敗，回退到 Ollama 單一檢查
            try {
              log.debug('🔄 降級到 Ollama 單一檢查...');
              const isConnected = await dispatch(checkOllamaService()).unwrap();
              if (isConnected) {
                await dispatch(fetchModelsInfo()).unwrap();
                log.debug('✅ Ollama 降級初始化完成');
              }
            } catch (fallbackError) {
              log.warn('⚠️  Ollama 降級初始化也失敗:', fallbackError);
            }
          }
        }, 1000);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error('❌ 應用程式初始化失敗:', error);
        setInitError(errorMessage);
        setIsLoading(false);
      }
    };

    initApp();
  }, []); // 🔥 關鍵修復：移除 dispatch 依賴，改為空陣列

  if (isLoading) {
    return null; // 讓 HTML 載入畫面繼續顯示
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
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              強制重新載入
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
          
          {/* 模態框容器 */}
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

// 增強的全域錯誤處理 - 與安全系統整合
window.addEventListener('error', (event) => {
  // 檢查是否是 Tauri 相關錯誤 - 立即攔截
  const errorMessage = event.error?.message || '';
  const isTauriError = errorMessage.includes('callbackId') || 
                      errorMessage.includes('undefined is not an object') ||
                      errorMessage.includes('__TAURI') ||
                      errorMessage.includes('Tauri') ||
                      errorMessage.includes('evaluating');
  
  if (isTauriError) {
    log.warn('🛡️  攔截 Tauri 相關錯誤，防止顯示到控制台');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    log.warn('全域錯誤處理器-已攔截:', event.error);
    return false;
  }
  
  // 安全地記錄錯誤
  const safeErrorLog = event.error ? event.error : 'Unknown error event';
  log.error('🚨 全域錯誤:', safeErrorLog);
  
  // 記錄錯誤詳情
  if (event.error) {
    log.error('全域錯誤處理器:', event.error);
  } else {
    log.warn('全域錯誤處理器: 接收到未定義的錯誤事件');
  }
  
  event.preventDefault();
}, true); // 使用捕獲階段

window.addEventListener('unhandledrejection', (event) => {
  // 檢查是否是 Tauri 相關錯誤 - 立即攔截
  const errorMessage = event.reason instanceof Error ? event.reason.message : 
                      typeof event.reason === 'string' ? event.reason : '';
  
  const isTauriError = errorMessage.includes('callbackId') || 
                      errorMessage.includes('undefined is not an object') ||
                      errorMessage.includes('Tauri') ||
                      errorMessage.includes('__TAURI') ||
                      errorMessage.includes('evaluating');
  
  if (isTauriError) {
    log.warn('🛡️  攔截 Tauri 相關 Promise 拒絕，防止顯示到控制台');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    log.warn('Promise拒絕處理器-已攔截:', errorMessage);
    return false;
  }
  
  log.error('🚨 未處理的 Promise 拒絕:', event.reason);
  
  // 記錄錯誤
  const safeErrorMessage = event.reason instanceof Error ? event.reason.message : 
                          typeof event.reason === 'string' ? event.reason : 
                          'Unknown promise rejection';
  log.error('Promise拒絕處理器:', safeErrorMessage);
  
  event.preventDefault();
}, true); // 使用捕獲階段

// 渲染應用程式
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <Provider store={store}>
    <SimpleApp />
  </Provider>
);

export default SimpleApp;