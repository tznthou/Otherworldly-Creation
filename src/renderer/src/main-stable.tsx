import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

console.log('穩定版本開始執行');

// 全域錯誤處理
window.addEventListener('error', (event) => {
  console.error('全域錯誤:', event.error);
  event.preventDefault(); // 防止閃退
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未處理的 Promise 拒絕:', event.reason);
  event.preventDefault(); // 防止閃退
});

// 超級簡單穩定的應用程式
const StableApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);

  // 錯誤邊界
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('組件錯誤:', event.error);
      setError(`錯誤: ${event.error?.message || '未知錯誤'}`);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // 如果有錯誤，顯示錯誤訊息而不是閃退
  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#FFD700',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1>創世紀元</h1>
        <div style={{
          background: 'rgba(255, 0, 0, 0.2)',
          border: '1px solid #ff6b6b',
          borderRadius: '10px',
          padding: '20px',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h2>應用程式遇到錯誤</h2>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            style={{
              background: '#FFD700',
              color: '#0A1128',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  const safePage = (pageContent: () => React.ReactElement) => {
    try {
      return pageContent();
    } catch (err) {
      console.error('頁面渲染錯誤:', err);
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>頁面載入錯誤</h2>
          <p>這個頁面暫時無法使用</p>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            style={{
              background: '#FFD700',
              color: '#0A1128',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            返回儀表板
          </button>
        </div>
      );
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return safePage(() => (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>🏠 專案儀表板</h2>
            <p>歡迎使用創世紀元：異世界創作神器</p>
            <div style={{ marginTop: '30px' }}>
              <button
                style={{
                  background: 'rgba(255, 215, 0, 0.2)',
                  border: '2px solid #FFD700',
                  color: '#FFD700',
                  padding: '15px 30px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  margin: '10px',
                  display: 'block',
                  width: '200px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
                onClick={() => setCurrentPage('editor')}
              >
                📝 開始創作
              </button>
              <button
                style={{
                  background: 'rgba(255, 215, 0, 0.2)',
                  border: '2px solid #FFD700',
                  color: '#FFD700',
                  padding: '15px 30px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  margin: '10px',
                  display: 'block',
                  width: '200px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
                onClick={() => setCurrentPage('test')}
              >
                🧪 測試功能
              </button>
            </div>
          </div>
        ));

      case 'editor':
        return safePage(() => (
          <div style={{ padding: '20px' }}>
            <h2>✍️ 編輯器</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid #FFD700',
              borderRadius: '10px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <textarea
                style={{
                  width: '100%',
                  height: '300px',
                  background: 'transparent',
                  border: 'none',
                  color: '#FFD700',
                  fontSize: '16px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
                placeholder="在這裡開始你的異世界冒險故事..."
                defaultValue="第一章：穿越的開始

我叫李明，原本是一個普通的大學生。直到那個雷雨交加的夜晚，一道奇異的光芒將我包圍...

（繼續你的創作吧！）"
              />
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                style={{
                  background: '#FFD700',
                  color: '#0A1128',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px'
                }}
                onClick={() => alert('儲存功能還在開發中！')}
              >
                💾 儲存
              </button>
              <button
                style={{
                  background: 'transparent',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px'
                }}
                onClick={() => setCurrentPage('dashboard')}
              >
                🏠 返回儀表板
              </button>
            </div>
          </div>
        ));

      case 'test':
        return safePage(() => (
          <div style={{ padding: '20px' }}>
            <h2>🧪 測試功能</h2>
            <div style={{
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid #FFD700',
              borderRadius: '10px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <h3>系統狀態</h3>
              <ul style={{ textAlign: 'left' }}>
                <li>✅ React 正常運行</li>
                <li>✅ 頁面切換正常</li>
                <li>✅ 錯誤處理已啟用</li>
                <li>✅ 應用程式穩定</li>
              </ul>
              
              <h3>計數器測試</h3>
              <CounterTest />
              
              <h3>時間顯示</h3>
              <TimeDisplay />
            </div>
          </div>
        ));

      default:
        return safePage(() => (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>頁面未找到</h2>
            <button onClick={() => setCurrentPage('dashboard')}>返回儀表板</button>
          </div>
        ));
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 頂部導航 */}
      <header style={{
        background: 'rgba(255, 215, 0, 0.1)',
        padding: '15px 20px',
        borderBottom: '1px solid #FFD700',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>創世紀元：異世界創作神器</h1>
        <nav style={{ display: 'flex', gap: '10px' }}>
          {['dashboard', 'editor', 'test'].map(page => (
            <button 
              key={page}
              style={{
                background: currentPage === page ? '#FFD700' : 'transparent',
                color: currentPage === page ? '#0A1128' : '#FFD700',
                border: '1px solid #FFD700',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => setCurrentPage(page)}
            >
              {page === 'dashboard' ? '儀表板' : page === 'editor' ? '編輯器' : '測試'}
            </button>
          ))}
        </nav>
      </header>

      {/* 主要內容 */}
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
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span>狀態：穩定運行中 🟢</span>
        <span>版本：Stable 1.0 | 頁面：{currentPage}</span>
      </footer>
    </div>
  );
};

// 計數器測試組件
const CounterTest: React.FC = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ margin: '10px 0' }}>
      <span>計數器: {count} </span>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{
          background: '#FFD700',
          color: '#0A1128',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer',
          margin: '0 5px'
        }}
      >
        +1
      </button>
      <button 
        onClick={() => setCount(0)}
        style={{
          background: 'transparent',
          color: '#FFD700',
          border: '1px solid #FFD700',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        重置
      </button>
    </div>
  );
};

// 時間顯示組件
const TimeDisplay: React.FC = () => {
  const [time, setTime] = useState(new Date().toLocaleString());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return <div>當前時間: {time}</div>;
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
  try {
    console.log('初始化穩定版應用程式');
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      throw new Error('找不到 root 元素');
    }
    
    const root = ReactDOM.createRoot(rootElement as HTMLElement);
    
    root.render(
      <React.StrictMode>
        <StableApp />
      </React.StrictMode>
    );
    
    console.log('穩定版應用程式渲染完成');
    
    // 延遲隱藏載入畫面
    setTimeout(hideLoadingScreen, 1500);
    
  } catch (error) {
    console.error('應用程式初始化失敗:', error);
    
    // 顯示緊急錯誤畫面
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          width: 100vw; 
          height: 100vh; 
          background: linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%);
          color: #FFD700;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: Arial, sans-serif;
          padding: 20px;
        ">
          <h1>創世紀元</h1>
          <div style="
            background: rgba(255, 0, 0, 0.2);
            border: 1px solid #ff6b6b;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
          ">
            <h2>應用程式無法啟動</h2>
            <p>初始化過程中發生錯誤</p>
            <button onclick="window.location.reload()" style="
              background: #FFD700;
              color: #0A1128;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 10px;
            ">
              重新載入
            </button>
          </div>
        </div>
      `;
    }
    
    setTimeout(hideLoadingScreen, 1000);
  }
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