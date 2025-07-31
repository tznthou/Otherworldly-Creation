import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store/store';
import { useAppDispatch } from './hooks/redux';
import { checkOllamaService, fetchModelsInfo } from './store/slices/aiSlice';
import { fetchProjects } from './store/slices/projectsSlice';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import CharacterManager from './pages/CharacterManager/CharacterManager';
import Settings from './pages/Settings/Settings';
import DatabaseMaintenanceSimple from './pages/DatabaseMaintenance/DatabaseMaintenanceSimple';
import SimpleProjectEditor from './pages/ProjectEditor/SimpleProjectEditor';
import Statistics from './pages/Statistics/Statistics';
import ModalContainer from './components/UI/ModalContainer';
import { NotificationContainer } from './components/UI/NotificationSystem';
import SimpleErrorBoundary from './components/UI/SimpleErrorBoundary';
import { i18n } from './i18n';
import './index.css';

// 🛡️ 超早期錯誤攔截器 - 在任何其他代碼運行之前設置
(() => {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // 重寫 console.error 來過濾 Tauri 錯誤
  console.error = (...args: any[]) => {
    const errorString = args.join(' ');
    if (errorString.includes('callbackId') || 
        errorString.includes('undefined is not an object') ||
        errorString.includes('evaluating')) {
      console.warn('🛡️  [已攔截] Tauri 錯誤:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args: any[]) => {
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
      console.warn('🛡️  [超早期攔截] Tauri 錯誤已被攔截');
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
      console.warn('🛡️  [超早期攔截] Tauri Promise 拒絕已被攔截');
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  };
  
  window.addEventListener('error', earlyErrorHandler, true);
  window.addEventListener('unhandledrejection', earlyPromiseHandler, true);
  
  console.log('🛡️  超早期錯誤攔截器已啟用');
})();


// 簡化的應用程式組件
const SimpleApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 開始應用程式初始化...');
        
        // 初始化 i18n 系統
        console.log('🌐 初始化國際化系統...');
        try {
          await i18n.initialize();
          console.log('✅ 國際化系統初始化完成');
        } catch (error) {
          console.warn('⚠️  國際化系統初始化失敗，使用預設語言:', error);
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
            console.log('📂 載入專案資料...');
            await dispatch(fetchProjects()).unwrap();
            console.log('✅ 專案資料載入完成');
          } catch (error) {
            console.warn('⚠️  專案資料載入失敗:', error);
          }
        }, 100);
        
        // 背景初始化 AI 服務（不阻塞 UI）
        setTimeout(async () => {
          try {
            console.log('🤖 檢查 AI 服務...');
            const isConnected = await dispatch(checkOllamaService()).unwrap();
            if (isConnected) {
              console.log('✅ AI 服務可用，載入模型資訊...');
              await dispatch(fetchModelsInfo()).unwrap();
              console.log('✅ AI 模型資訊載入完成');
            } else {
              console.log('ℹ️  AI 服務暫不可用');
            }
          } catch (error) {
            console.warn('⚠️  AI 服務初始化失敗:', error);
          }
        }, 1000);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ 應用程式初始化失敗:', error);
        setInitError(errorMessage);
        setIsLoading(false);
      }
    };

    initApp();
  }, [dispatch]);

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
                      <SimpleProjectEditor />
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
    console.warn('🛡️  攔截 Tauri 相關錯誤，防止顯示到控制台');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.warn('全域錯誤處理器-已攔截:', event.error);
    return false;
  }
  
  console.error('🚨 全域錯誤:', event.error);
  
  // 記錄錯誤
  if (event.error) {
    console.error('全域錯誤處理器:', event.error);
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
    console.warn('🛡️  攔截 Tauri 相關 Promise 拒絕，防止顯示到控制台');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.warn('Promise拒絕處理器-已攔截:', errorMessage);
    return false;
  }
  
  console.error('🚨 未處理的 Promise 拒絕:', event.reason);
  
  // 記錄錯誤
  const safeErrorMessage = event.reason instanceof Error ? event.reason.message : 
                          typeof event.reason === 'string' ? event.reason : 
                          'Unknown promise rejection';
  console.error('Promise拒絕處理器:', safeErrorMessage);
  
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