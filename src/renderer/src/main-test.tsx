import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('測試版本 main.tsx 開始執行');

// 簡單的測試組件
const TestApp: React.FC = () => {
  console.log('TestApp 組件渲染');
  
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
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>測試成功！</h1>
      <p>React 應用程式正在運行</p>
      <p>時間: {new Date().toLocaleString()}</p>
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
  } else {
    console.log('未找到載入畫面元素');
  }
};

// 初始化應用程式
const initApp = () => {
  console.log('開始初始化測試應用程式');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('找不到 root 元素!');
    return;
  }
  
  console.log('找到 root 元素，開始渲染');
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  
  root.render(<TestApp />);
  console.log('TestApp 渲染完成');
  
  // 立即隱藏載入畫面
  setTimeout(hideLoadingScreen, 1000);
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