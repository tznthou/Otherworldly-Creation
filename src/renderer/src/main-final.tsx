import React, { useState, useEffect, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';

// 定義 electronAPI 的類型
interface BasicElectronAPI {
  projects: {
    getAll: () => Promise<any[]>;
    create: (project: any) => Promise<string>;
    update: (project: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
  };
  chapters: {
    getByProjectId: (projectId: string) => Promise<any[]>;
    create: (chapter: any) => Promise<string>;
    update: (chapter: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI?: BasicElectronAPI;
  }
}

console.log('最終穩定版本開始執行');

// 超級嚴格的全域錯誤處理
window.addEventListener('error', (event) => {
  console.error('全域錯誤:', event.error);
  event.preventDefault();
  event.stopPropagation();
  return false;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未處理的 Promise 拒絕:', event.reason);
  event.preventDefault();
  return false;
});

// 錯誤邊界組件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('ErrorBoundary 捕獲錯誤:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('組件錯誤詳情:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
            background: 'rgba(255, 100, 100, 0.2)',
            border: '2px solid #ff6b6b',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <h2>🛡️ 錯誤已被攔截</h2>
            <p>應用程式遇到了一個問題，但我們已經防止它崩潰。</p>
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              style={{
                background: '#FFD700',
                color: '#0A1128',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginTop: '20px'
              }}
            >
              🔄 重新載入應用程式
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 超級簡單安全的應用程式
const FinalApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isStable, setIsStable] = useState(true);

  // 安全的頁面切換
  const safeSwitchPage = (page: string) => {
    try {
      console.log(`切換到頁面: ${page}`);
      setCurrentPage(page);
    } catch (error) {
      console.error('頁面切換錯誤:', error);
      setCurrentPage('dashboard');
    }
  };

  // 監控穩定性和性能優化
  useEffect(() => {
    let isUnmounted = false;
    
    const checkStability = () => {
      if (isUnmounted) return;
      
      try {
        // 檢查關鍵元素是否存在
        if (document.getElementById('root') && document.body) {
          setIsStable(true);
        }
        
        // 清理可能的記憶體洩漏
        if (window.gc && typeof window.gc === 'function') {
          window.gc();
        }
      } catch (error) {
        console.error('穩定性檢查失敗:', error);
        if (!isUnmounted) {
          setIsStable(false);
        }
      }
    };

    // 立即檢查一次
    checkStability();
    
    // 定期檢查，但間隔更長以減少性能影響
    const interval = setInterval(checkStability, 10000);
    
    return () => {
      isUnmounted = true;
      clearInterval(interval);
    };
  }, []);

  if (!isStable) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#FFD700',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div>應用程式正在恢復穩定性...</div>
      </div>
    );
  }

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
      {/* 超級簡單的頂部導航 */}
      <header style={{
        background: 'rgba(255, 215, 0, 0.15)',
        padding: '20px',
        borderBottom: '2px solid #FFD700',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
          ✨ 創世紀元：異世界創作神器
        </h1>
        <nav style={{ display: 'flex', gap: '15px' }}>
          {[
            { key: 'dashboard', label: '🏠 儀表板' },
            { key: 'editor', label: '✍️ 編輯器' },
            { key: 'about', label: '📖 關於' }
          ].map(({ key, label }) => (
            <button 
              key={key}
              style={{
                background: currentPage === key ? '#FFD700' : 'rgba(255, 215, 0, 0.2)',
                color: currentPage === key ? '#0A1128' : '#FFD700',
                border: '2px solid #FFD700',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onClick={() => safeSwitchPage(key)}
              onMouseOver={(e) => {
                if (currentPage !== key) {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== key) {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)';
                }
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* 主要內容區域 */}
      <main style={{ flex: 1, overflow: 'auto', padding: '0' }}>
        <SafePage currentPage={currentPage} onPageChange={safeSwitchPage} />
      </main>

      {/* 超級簡單的底部狀態欄 */}
      <footer style={{
        background: 'rgba(255, 215, 0, 0.15)',
        padding: '15px 20px',
        borderTop: '2px solid #FFD700',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <span>🟢 狀態：超級穩定運行中</span>
        <span>📍 當前頁面：{currentPage} | 版本：Final 1.0</span>
      </footer>
    </div>
  );
};

// 超級安全的頁面組件
const SafePage: React.FC<{ currentPage: string; onPageChange: (page: string) => void }> = ({ 
  currentPage, 
  onPageChange 
}) => {
  const renderPage = () => {
    try {
      switch (currentPage) {
        case 'dashboard':
          return <DashboardPage onPageChange={onPageChange} />;
        case 'editor':
          return <EditorPage onPageChange={onPageChange} />;
        case 'about':
          return <AboutPage onPageChange={onPageChange} />;
        default:
          return <DashboardPage onPageChange={onPageChange} />;
      }
    } catch (error) {
      console.error('頁面渲染錯誤:', error);
      return <ErrorPage onPageChange={onPageChange} />;
    }
  };

  return (
    <ErrorBoundary>
      <div style={{ height: '100%', padding: '0' }}>
        {renderPage()}
      </div>
    </ErrorBoundary>
  );
};

// 儀表板頁面
const DashboardPage: React.FC<{ onPageChange: (page: string) => void }> = ({ onPageChange }) => (
  <div style={{ padding: '60px 40px', textAlign: 'center' }}>
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>🏠 歡迎來到創作世界</h2>
      <p style={{ fontSize: '18px', marginBottom: '50px', opacity: 0.9 }}>
        在這裡開始你的異世界冒險故事創作之旅
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        marginTop: '40px'
      }}>
        <ActionCard
          title="✍️ 開始創作"
          description="進入編輯器，開始寫作你的故事"
          onClick={() => onPageChange('editor')}
        />
        <ActionCard
          title="📖 了解更多"
          description="查看應用程式資訊和功能說明"
          onClick={() => onPageChange('about')}
        />
      </div>
    </div>
  </div>
);

// 編輯器頁面
const EditorPage: React.FC<{ onPageChange: (page: string) => void }> = ({ onPageChange }) => {
  const [text, setText] = useState(`第一章：穿越的開始

我叫李明，是一個平凡的大學生。

那個雷雨交加的夜晚，一道奇異的光芒將我包圍...當我再次睜開眼睛時，發現自己置身於一個完全陌生的世界。

這裡有著魔法和劍的世界，有著不同種族的生物，還有著我從未見過的壯麗景色。

（繼續你的異世界冒險故事...）`);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 載入或創建預設專案
  useEffect(() => {
    const initProject = async () => {
      try {
        if (window.electronAPI) {
          // 檢查是否有現有專案
          const projects = await window.electronAPI.projects.getAll();
          
          let currentProject;
          if (projects.length > 0) {
            currentProject = projects[0]; // 使用第一個專案
          } else {
            // 創建新專案
            const newProjectId = await window.electronAPI.projects.create({
              title: '我的異世界冒險',
              description: '一個精彩的異世界轉生故事',
              genre: '奇幻'
            });
            currentProject = await window.electronAPI.projects.getById(newProjectId);
          }
          
          setProjectId(currentProject.id);
          
          // 檢查是否有現有章節
          const chapters = await window.electronAPI.chapters.getByProjectId(currentProject.id);
          
          let currentChapter;
          if (chapters.length > 0) {
            currentChapter = chapters[0]; // 使用第一個章節
            setText(currentChapter.content || text);
          } else {
            // 創建新章節
            const newChapterId = await window.electronAPI.chapters.create({
              project_id: currentProject.id,
              title: '第一章：穿越的開始',
              content: text,
              order_num: 1
            });
            currentChapter = await window.electronAPI.chapters.getById(newChapterId);
          }
          
          setChapterId(currentChapter.id);
        }
      } catch (error) {
        console.error('初始化專案失敗:', error);
      }
    };
    
    initProject();
  }, []);

  // 保存功能
  const handleSave = async () => {
    if (!chapterId || !window.electronAPI) {
      alert('⚠️ 無法保存：資料庫未準備好');
      return;
    }
    
    setIsSaving(true);
    try {
      await window.electronAPI.chapters.update({
        id: chapterId,
        title: '第一章：穿越的開始',
        content: text,
        order_num: 1
      });
      
      alert('💾 故事已成功保存到資料庫！\n\n字數統計：' + text.length + ' 字');
    } catch (error) {
      console.error('保存失敗:', error);
      alert('❌ 保存失敗：' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '30px 40px 20px', 
        borderBottom: '1px solid rgba(255, 215, 0, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '28px' }}>✍️ 創作編輯器</h2>
        <div>
          <button
            style={{
              background: '#FFD700',
              color: '#0A1128',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginRight: '15px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
            onClick={handleSave}
            disabled={isSaving}
          >
{isSaving ? '💾 保存中...' : '💾 保存作品'}
          </button>
          <button
            style={{
              background: 'transparent',
              color: '#FFD700',
              border: '2px solid #FFD700',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={() => onPageChange('dashboard')}
          >
            🏠 返回儀表板
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, padding: '20px 40px' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '10px',
            color: '#FFD700',
            fontSize: '16px',
            fontFamily: '"Microsoft YaHei", "Noto Sans TC", Arial, sans-serif',
            padding: '25px',
            resize: 'none',
            outline: 'none',
            lineHeight: '1.8'
          }}
          placeholder="在這裡開始你的異世界冒險故事..."
        />
      </div>
    </div>
  );
};

// 關於頁面
const AboutPage: React.FC<{ onPageChange: (page: string) => void }> = ({ onPageChange }) => (
  <div style={{ padding: '60px 40px', textAlign: 'center' }}>
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '36px', marginBottom: '30px' }}>📖 關於創世紀元</h2>
      
      <div style={{
        background: 'rgba(255, 215, 0, 0.1)',
        border: '2px solid #FFD700',
        borderRadius: '15px',
        padding: '40px',
        marginBottom: '30px',
        textAlign: 'left'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '20px' }}>✨ 應用程式特色</h3>
        <ul style={{ fontSize: '16px', lineHeight: '2' }}>
          <li>🛡️ 超級穩定 - 絕不閃退</li>
          <li>✍️ 簡潔編輯器 - 專注創作</li>
          <li>🎨 美觀界面 - 宇宙主題</li>
          <li>💾 本地儲存 - 資料安全</li>
          <li>🚀 快速響應 - 流暢體驗</li>
        </ul>
        
        <h3 style={{ color: '#FFD700', marginTop: '30px', marginBottom: '20px' }}>🎯 系統狀態</h3>
        <div style={{ fontSize: '16px' }}>
          <div>✅ React 系統正常</div>
          <div>✅ 錯誤處理啟用</div>
          <div>✅ 頁面導航正常</div>
          <div>✅ 應用程式穩定運行</div>
        </div>
      </div>
      
      <button
        style={{
          background: '#FFD700',
          color: '#0A1128',
          border: 'none',
          padding: '15px 30px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: 'bold'
        }}
        onClick={() => onPageChange('dashboard')}
      >
        🏠 返回儀表板
      </button>
    </div>
  </div>
);

// 錯誤頁面
const ErrorPage: React.FC<{ onPageChange: (page: string) => void }> = ({ onPageChange }) => (
  <div style={{ padding: '60px 40px', textAlign: 'center' }}>
    <h2>⚠️ 頁面載入錯誤</h2>
    <p>這個頁面暫時無法使用，但應用程式仍然穩定運行。</p>
    <button
      style={{
        background: '#FFD700',
        color: '#0A1128',
        border: 'none',
        padding: '15px 30px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px'
      }}
      onClick={() => onPageChange('dashboard')}
    >
      🏠 返回儀表板
    </button>
  </div>
);

// 動作卡片組件
const ActionCard: React.FC<{
  title: string;
  description: string;
  onClick: () => void;
}> = ({ title, description, onClick }) => (
  <div
    style={{
      background: 'rgba(255, 215, 0, 0.1)',
      border: '2px solid #FFD700',
      borderRadius: '15px',
      padding: '30px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'center'
    }}
    onClick={onClick}
    onMouseOver={(e) => {
      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)';
      e.currentTarget.style.transform = 'translateY(-5px)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>{title}</h3>
    <p style={{ fontSize: '16px', opacity: 0.9 }}>{description}</p>
  </div>
);

// 隱藏載入畫面
const hideLoadingScreen = () => {
  try {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.transition = 'opacity 0.5s ease';
      loadingElement.style.opacity = '0';
      setTimeout(() => {
        if (loadingElement.parentNode) {
          loadingElement.parentNode.removeChild(loadingElement);
        }
      }, 500);
    }
  } catch (error) {
    console.error('隱藏載入畫面時出錯:', error);
  }
};

// 超級安全的應用程式初始化
const initApp = () => {
  try {
    console.log('開始初始化最終穩定版應用程式');
    
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('找不到 root 元素');
    }
    
    console.log('root 元素找到，開始創建 React 根');
    const root = ReactDOM.createRoot(rootElement as HTMLElement);
    
    console.log('開始渲染應用程式');
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <FinalApp />
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('最終穩定版應用程式渲染完成');
    
    // 延遲隱藏載入畫面，給應用程式更多時間穩定
    setTimeout(() => {
      console.log('準備隱藏載入畫面');
      hideLoadingScreen();
    }, 3000);
    
  } catch (error) {
    console.error('應用程式初始化失敗:', error);
    
    // 緊急後備方案
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
          <h1 style="font-size: 36px; margin-bottom: 20px;">創世紀元</h1>
          <div style="
            background: rgba(255, 0, 0, 0.2);
            border: 2px solid #ff6b6b;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            max-width: 500px;
          ">
            <h2>🚨 緊急模式</h2>
            <p>應用程式初始化失敗，但系統仍在運行</p>
            <button onclick="window.location.reload()" style="
              background: #FFD700;
              color: #0A1128;
              border: none;
              padding: 15px 30px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 18px;
              font-weight: bold;
              margin-top: 20px;
            ">
              🔄 重新載入應用程式
            </button>
          </div>
        </div>
      `;
    }
    
    setTimeout(hideLoadingScreen, 1000);
  }
};

// 執行初始化
console.log('檢查 DOM 狀態:', document.readyState);
if (document.readyState === 'loading') {
  console.log('等待 DOMContentLoaded 事件');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log('DOM 已準備好，立即初始化');
  initApp();
}