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

// 功能卡片組件
interface FeatureCardProps {
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, onClick, highlight = false }) => {
  return (
    <button
      style={{
        background: highlight ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)',
        border: `2px solid ${highlight ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}`,
        color: '#FFD700',
        padding: '20px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left',
        transition: 'all 0.3s ease',
        width: '100%',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = highlight ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 215, 0, 0.2)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = highlight ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>
        {description}
      </div>
    </button>
  );
};

// 超級簡單穩定的應用程式
const StableApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState(() => {
    // 嘗試從本地儲存載入內容
    const savedContent = localStorage.getItem('novel_content');
    return savedContent || "第一章：穿越的開始\n\n我叫李明，原本是一個普通的大學生。直到那個雷雨交加的夜晚，一道奇異的光芒將我包圍...\n\n（繼續你的創作吧！）";
  });
  const [isSaved, setIsSaved] = useState(true);
  const [writingStartTime, setWritingStartTime] = useState<Date | null>(null);
  const [totalWritingTime, setTotalWritingTime] = useState(() => {
    const saved = localStorage.getItem('total_writing_time');
    return saved ? parseInt(saved) : 0;
  });

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
            <h2>🏠 歡迎來到創世紀元</h2>
            <p style={{ fontSize: '18px', marginBottom: '40px' }}>用 AI 之力編織你的異世界傳說</p>
            
            {/* 功能卡片網格 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              <FeatureCard
                title="🌟 創世神模式"
                description="創建新的異世界創作專案"
                onClick={() => alert('專案創建功能開發中！')}
              />
              <FeatureCard
                title="⚔️ 英靈召喚"
                description="AI 輔助角色創造與管理"
                onClick={() => alert('角色管理功能開發中！')}
              />
              <FeatureCard
                title="🎭 輕小說模板"
                description="異世界、校園、科幻、奇幻模板"
                onClick={() => alert('模板系統開發中！')}
              />
              <FeatureCard
                title="🔮 預言書寫"
                description="智能續寫與劇情建議"
                onClick={() => alert('AI 寫作功能開發中！')}
              />
              <FeatureCard
                title="📝 開始創作"
                description="進入編輯器開始寫作"
                onClick={() => setCurrentPage('editor')}
                highlight={true}
              />
              <FeatureCard
                title="💾 資料管理"
                description="資料庫維護、備份還原"
                onClick={() => alert('資料庫維護功能開發中！')}
              />
              <FeatureCard
                title="📥 匯入專案"
                description="從備份檔案匯入現有專案"
                onClick={() => alert('專案匯入功能開發中！')}
              />
              <FeatureCard
                title="⚙️ 系統設定"
                description="配置 AI 引擎和應用程式設定"
                onClick={() => alert('系統設定功能開發中！')}
              />
              <FeatureCard
                title="📊 創作統計"
                description="字數統計、寫作時間和進度追蹤"
                onClick={() => setCurrentPage('stats')}
              />
              <FeatureCard
                title="❓ 使用說明"
                description="查看使用教學和常見問題"
                onClick={() => alert('使用說明功能開發中！')}
              />
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
                value={editorContent}
                onChange={(e) => {
                  setEditorContent(e.target.value);
                  setIsSaved(false);
                  // 開始寫作計時
                  if (!writingStartTime) {
                    setWritingStartTime(new Date());
                  }
                }}
                onFocus={() => {
                  // 進入編輯器時開始計時
                  if (!writingStartTime) {
                    setWritingStartTime(new Date());
                  }
                }}
                onBlur={() => {
                  // 離開編輯器時停止計時並累計
                  if (writingStartTime) {
                    const sessionTime = Math.floor((new Date().getTime() - writingStartTime.getTime()) / 1000 / 60);
                    if (sessionTime > 0) {
                      const newTotal = totalWritingTime + sessionTime;
                      setTotalWritingTime(newTotal);
                      localStorage.setItem('total_writing_time', newTotal.toString());
                    }
                    setWritingStartTime(null);
                  }
                }}
              />
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                style={{
                  background: isSaved ? '#28a745' : '#FFD700',
                  color: '#0A1128',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px',
                  opacity: isSaved ? 0.7 : 1
                }}
                onClick={() => {
                  try {
                    // 模擬儲存到本地儲存
                    localStorage.setItem('novel_content', editorContent);
                    localStorage.setItem('novel_saved_time', new Date().toLocaleString());
                    setIsSaved(true);
                    alert(`✅ 儲存成功！\n\n內容已保存到本地儲存\n時間：${new Date().toLocaleString()}\n字數：${editorContent.length} 字`);
                  } catch (error) {
                    alert('❌ 儲存失敗：' + (error as Error).message);
                  }
                }}
                disabled={isSaved}
              >
                {isSaved ? '✅ 已儲存' : '💾 儲存'}
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

      case 'stats':
        return safePage(() => {
          const wordCount = editorContent.length;
          const paragraphCount = editorContent.split('\n\n').filter(p => p.trim().length > 0).length;
          const currentSessionTime = writingStartTime ? 
            Math.floor((new Date().getTime() - writingStartTime.getTime()) / 1000 / 60) : 0;
          const dailyGoal = 1000; // 每日目標字數
          const progress = Math.min((wordCount / dailyGoal) * 100, 100);
          
          return (
            <div style={{ padding: '20px' }}>
              <h2>📊 創作統計</h2>
              
              {/* 統計卡片網格 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginTop: '20px'
              }}>
                {/* 字數統計 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>📝 字數統計</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {wordCount}
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>總字數</div>
                  <div style={{ marginTop: '15px', fontSize: '14px', color: '#ccc' }}>
                    段落數：{paragraphCount}
                  </div>
                </div>

                {/* 寫作時間 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>⏰ 寫作時間</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {totalWritingTime}
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>總計時間（分鐘）</div>
                  {currentSessionTime > 0 && (
                    <div style={{ marginTop: '15px', fontSize: '14px', color: '#90EE90' }}>
                      本次寫作：{currentSessionTime} 分鐘
                    </div>
                  )}
                </div>

                {/* 每日進度 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>🎯 每日目標</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {progress.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>完成度</div>
                  <div style={{
                    marginTop: '15px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: progress >= 100 ? '#90EE90' : '#FFD700',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#ccc' }}>
                    目標：{dailyGoal} 字
                  </div>
                </div>

                {/* 寫作效率 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>⚡ 寫作效率</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {totalWritingTime > 0 ? Math.round(wordCount / totalWritingTime) : 0}
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>字/分鐘</div>
                  <div style={{ marginTop: '15px', fontSize: '14px', color: '#ccc' }}>
                    平均效率
                  </div>
                </div>
              </div>

                             {/* 操作按鈕 */}
               <div style={{ marginTop: '30px', textAlign: 'center' }}>
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
                   onClick={() => setCurrentPage('editor')}
                 >
                   ✍️ 繼續寫作
                 </button>
                 <button
                   style={{
                     background: 'transparent',
                     color: '#FF6B6B',
                     border: '1px solid #FF6B6B',
                     padding: '10px 20px',
                     borderRadius: '5px',
                     cursor: 'pointer',
                     margin: '0 10px'
                   }}
                   onClick={() => {
                     if (confirm('確定要重置所有統計數據嗎？此操作無法復原。')) {
                       localStorage.removeItem('total_writing_time');
                       setTotalWritingTime(0);
                       setWritingStartTime(null);
                       alert('統計數據已重置！');
                     }
                   }}
                 >
                   🔄 重置統計
                 </button>
               </div>
            </div>
          );
        });

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
          {['dashboard', 'editor', 'stats'].map(page => (
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
              {page === 'dashboard' ? '儀表板' : page === 'editor' ? '編輯器' : '統計'}
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

// 移除了測試組件，改為創作統計功能

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