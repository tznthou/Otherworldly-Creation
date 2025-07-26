import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store/store';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectEditor from './pages/ProjectEditor/ProjectEditor';
import CharacterManager from './pages/CharacterManager/CharacterManager';
import Settings from './pages/Settings/Settings';
import ModalContainer from './components/UI/ModalContainer';
import { ErrorToastContainer } from './components/UI/ErrorToast';
import { NotificationContainer } from './components/UI/NotificationSystem';
import './index.css';

console.log('簡化版應用程式開始執行');

// 簡化的應用程式組件
const SimpleApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('開始初始化應用程式...');
        
        // 最小延遲後直接隱藏載入畫面
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 隱藏載入畫面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.style.display = 'none';
          console.log('載入畫面已隱藏');
        }
        
        setIsLoading(false);
        console.log('應用程式初始化完成');
        
        // 暫時禁用 AI 檢查，避免阻塞載入
        console.log('AI 檢查已暫時禁用');
        
      } catch (error) {
        console.error('初始化失敗:', error);
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  if (isLoading) {
    return null; // 讓 HTML 載入畫面繼續顯示
  }

  return (
    <div className="relative">
      <Router>
        <div className="min-h-screen bg-cosmic-950 text-white">
          <Routes>
            <Route path="/" element={
              <Layout>
                <Dashboard />
              </Layout>
            } />
            <Route path="*" element={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <h2 className="text-xl text-gold-400 mb-4">測試頁面</h2>
                  <p className="text-gray-300">路由工作正常</p>
                </div>
              </div>
            } />
          </Routes>
        </div>
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