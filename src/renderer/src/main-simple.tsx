import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';

console.log('簡化版本 main.tsx 開始執行');

// 簡化的 App 組件，只包含基本結構
const SimpleApp: React.FC = () => {
  console.log('SimpleApp 組件渲染');
  
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ marginBottom: '20px' }}>創世紀元：異世界創作神器</h1>
      <div style={{ 
        background: 'rgba(255, 215, 0, 0.1)',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid #FFD700',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h2>應用程式已成功啟動！</h2>
        <p>✅ React 渲染正常</p>
        <p>✅ Redux Store 連接正常</p>
        <p>✅ 基本界面顯示正常</p>
        <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
          時間: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

// 隱藏載入畫面
const hideLoadingScreen = () => {
  console.log('嘗試隱藏載入畫面');
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    console.log('找到載入畫面元素，開始隱藏');
    loadingElement.style.opacity = '0';
    setTimeout(() => {
      loadingElement.remove();
      console.log('載入畫面已移除');
    }, 500);
  }
};

// 初始化應用程式
const initApp = () => {
  console.log('開始初始化簡化版應用程式');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('找不到 root 元素!');
    return;
  }
  
  console.log('找到 root 元素，開始渲染');
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <SimpleApp />
      </Provider>
    </React.StrictMode>
  );
  
  console.log('SimpleApp 渲染完成');
  
  // 延遲隱藏載入畫面
  setTimeout(hideLoadingScreen, 1500);
};

// 執行初始化
console.log('document.readyState:', document.readyState);
if (document.readyState === 'loading') {
  console.log('等待 DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log('DOM 已準備好，立即初始化');
  initApp();
}