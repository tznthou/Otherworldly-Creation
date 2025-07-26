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

// 等待 DOM 載入完成
document.addEventListener('DOMContentLoaded', () => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
  
  // 延遲隱藏載入畫面，讓用戶看到品牌
  setTimeout(hideLoadingScreen, 1500);
});