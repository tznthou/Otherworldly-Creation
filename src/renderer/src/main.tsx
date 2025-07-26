import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import './index.css';

// 隱藏載入畫面
const hideLoadingScreen = () => {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    setTimeout(() => {
      loadingElement.remove();
    }, 500);
  }
};

// 立即初始化 React 應用程式
const initApp = () => {
  console.log('正在初始化 React 應用程式...');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('找不到 root 元素!');
    return;
  }
  
  console.log('找到 root 元素，開始渲染...');
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
  
  console.log('React 應用程式渲染完成');
  
  // 延遲隱藏載入畫面，讓用戶看到品牌
  setTimeout(() => {
    console.log('隱藏載入畫面');
    hideLoadingScreen();
  }, 1500);
};

// 等待 DOM 載入完成或立即執行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}