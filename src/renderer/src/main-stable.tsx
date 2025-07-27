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
import SettingsSimple from './pages/Settings/SettingsSimple';
import DatabaseMaintenanceSimple from './pages/DatabaseMaintenance/DatabaseMaintenanceSimple';
import SimpleProjectEditor from './pages/ProjectEditor/SimpleProjectEditor';
import Statistics from './pages/Statistics/Statistics';
import ModalContainer from './components/UI/ModalContainer';
import { NotificationContainer } from './components/UI/NotificationSystem';
import './index.css';


// 簡化的應用程式組件
const SimpleApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initApp = async () => {
      try {
        // 最小延遲後直接隱藏載入畫面
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 隱藏載入畫面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
        
        setIsLoading(false);
        
        // 載入專案資料
        try {
          await dispatch(fetchProjects()).unwrap();
        } catch (error) {
          console.error('載入專案資料失敗:', error);
        }
        
        // 初始化 AI 服務（背景執行）
        setTimeout(async () => {
          if (window.electronAPI?.ai) {
            try {
              await dispatch(checkOllamaService()).unwrap();
              await dispatch(fetchModelsInfo()).unwrap();
            } catch (error) {
              console.error('AI 服務初始化失敗:', error);
            }
          }
        }, 2000);
        
      } catch (error) {
        console.error('初始化失敗:', error);
        setIsLoading(false);
      }
    };

    initApp();
  }, [dispatch]);

  if (isLoading) {
    return null; // 讓 HTML 載入畫面繼續顯示
  }

  return (
    <div className="relative">
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="min-h-screen bg-cosmic-950 text-white">
          <Routes>
            <Route path="/" element={
              <Layout>
                <Dashboard />
              </Layout>
            } />
            <Route path="/settings" element={
              <Layout>
                <SettingsSimple />
              </Layout>
            } />
            <Route path="/database-maintenance" element={
              <Layout>
                <DatabaseMaintenanceSimple />
              </Layout>
            } />
            <Route path="/characters/:projectId" element={
              <Layout>
                <CharacterManager />
              </Layout>
            } />
            <Route path="/project/:id" element={
              <Layout>
                <SimpleProjectEditor />
              </Layout>
            } />
            <Route path="/statistics" element={
              <Layout>
                <Statistics />
              </Layout>
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
        </div>
        
        {/* 模態框容器 */}
        <ModalContainer />
        
        {/* 通知系統 */}
        <NotificationContainer />
      </Router>
    </div>
  );
};

// 全域錯誤處理
window.addEventListener('error', (event) => {
  console.error('全域錯誤:', event.error);
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未處理的 Promise 拒絕:', event.reason);
  event.preventDefault();
});

// 渲染應用程式
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <Provider store={store}>
    <SimpleApp />
  </Provider>
);

export default SimpleApp;