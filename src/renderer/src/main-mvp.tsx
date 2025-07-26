import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';

console.log('MVP 版本開始執行');

// 最小可行版本的主應用程式
const MVPApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>專案儀表板</h2>
            <p>歡迎使用創世紀元：異世界創作神器</p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginTop: '30px'
            }}>
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #FFD700',
                cursor: 'pointer'
              }} onClick={() => setCurrentPage('editor')}>
                <h3>📝 開始創作</h3>
                <p>建立新專案或繼續現有創作</p>
              </div>
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #FFD700',
                cursor: 'pointer'
              }} onClick={() => setCurrentPage('characters')}>
                <h3>👥 角色管理</h3>
                <p>管理你的故事角色</p>
              </div>
            </div>
          </div>
        );
      case 'editor':
        return (
          <div style={{ padding: '40px' }}>
            <h2>編輯器</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '20px',
              borderRadius: '10px',
              minHeight: '300px',
              marginTop: '20px'
            }}>
              <textarea
                style={{
                  width: '100%',
                  height: '200px',
                  background: 'transparent',
                  border: 'none',
                  color: '#FFD700',
                  fontSize: '16px',
                  resize: 'none',
                  outline: 'none'
                }}
                placeholder="在這裡開始你的創作..."
              />
            </div>
          </div>
        );
      case 'characters':
        return (
          <div style={{ padding: '40px' }}>
            <h2>角色管理</h2>
            <div style={{
              background: 'rgba(255, 215, 0, 0.1)',
              padding: '20px',
              borderRadius: '10px',
              marginTop: '20px'
            }}>
              <h3>範例角色</h3>
              <ul style={{ textAlign: 'left' }}>
                <li>主角 - 勇敢的冒險者</li>
                <li>導師 - 智慧的魔法師</li>
                <li>夥伴 - 忠實的戰士</li>
              </ul>
            </div>
          </div>
        );
      default:
        return <div>頁面載入中...</div>;
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#FFD700',
      fontFamily: '"Noto Sans TC", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 頂部導航 */}
      <header style={{
        background: 'rgba(255, 215, 0, 0.1)',
        padding: '10px 20px',
        borderBottom: '1px solid #FFD700',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>創世紀元</h1>
        <nav style={{ display: 'flex', gap: '20px' }}>
          <button 
            style={{
              background: currentPage === 'dashboard' ? '#FFD700' : 'transparent',
              color: currentPage === 'dashboard' ? '#0A1128' : '#FFD700',
              border: '1px solid #FFD700',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
            onClick={() => setCurrentPage('dashboard')}
          >
            儀表板
          </button>
          <button 
            style={{
              background: currentPage === 'editor' ? '#FFD700' : 'transparent',
              color: currentPage === 'editor' ? '#0A1128' : '#FFD700',
              border: '1px solid #FFD700',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
            onClick={() => setCurrentPage('editor')}
          >
            編輯器
          </button>
          <button 
            style={{
              background: currentPage === 'characters' ? '#FFD700' : 'transparent',
              color: currentPage === 'characters' ? '#0A1128' : '#FFD700',
              border: '1px solid #FFD700',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
            onClick={() => setCurrentPage('characters')}
          >
            角色
          </button>
        </nav>
      </header>

      {/* 主要內容區域 */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {renderPage()}
      </main>

      {/* 底部狀態欄 */}
      <footer style={{
        background: 'rgba(255, 215, 0, 0.1)',
        padding: '10px 20px',
        borderTop: '1px solid #FFD700',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>狀態：就緒</span>
        <span>版本：MVP 1.0</span>
      </footer>
    </div>
  );
};

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

// 初始化應用程式
const initApp = () => {
  console.log('初始化 MVP 應用程式');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('找不到 root 元素!');
    return;
  }
  
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <MVPApp />
      </Provider>
    </React.StrictMode>
  );
  
  console.log('MVP 應用程式渲染完成');
  
  // 延遲隱藏載入畫面
  setTimeout(hideLoadingScreen, 1500);
};

// 執行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}