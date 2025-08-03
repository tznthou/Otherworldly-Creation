import React, { useState, useEffect } from 'react';
import { PageType } from './types';
import { errorPageStyles, baseStyles } from './styles';
import { storage } from './utils';
import { DEFAULTS } from './constants';

// 組件引入
import Layout from '../Layout/Layout';
import CreateProjectModal from './modals/CreateProjectModal';
import CharacterManagerModal from './modals/CharacterManagerModal';
import TemplateManagerModal from './modals/TemplateManagerModal';
import { DashboardPage, EditorPage } from './pages';

const StableApp: React.FC = () => {
  // 頁面狀態
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 模態框狀態
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCharacterManagerOpen, setIsCharacterManagerOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  // 編輯器狀態
  const [editorContent, setEditorContent] = useState(() => {
    return storage.getContent() || DEFAULTS.DEFAULT_CONTENT;
  });
  const [isSaved, setIsSaved] = useState(true);
  const [writingStartTime, setWritingStartTime] = useState<Date | null>(null);
  const [totalWritingTime, setTotalWritingTime] = useState(() => storage.getWritingTime());

  // 應用程式初始化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('開始初始化 React 應用程式...');
        
        // 模擬初始化過程（檢查 IPC 連接等）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 隱藏載入畫面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.style.display = 'none';
          console.log('載入畫面已隱藏');
        }
        
        setIsLoading(false);
        console.log('React 應用程式初始化完成');
        
      } catch (error) {
        console.error('應用程式初始化失敗:', error);
        setError(`初始化失敗: ${error}`);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // 錯誤處理
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('組件錯誤:', event.error);
      setError(`錯誤: ${event.error?.message || '未知錯誤'}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('未處理的 Promise 拒絕:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // 編輯器處理函數
  const handleContentChange = (content: string) => {
    setEditorContent(content);
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
  };

  const handleWritingStart = () => {
    if (!writingStartTime) {
      setWritingStartTime(new Date());
    }
  };

  const handleWritingEnd = () => {
    if (writingStartTime) {
      const sessionTime = Math.floor((new Date().getTime() - writingStartTime.getTime()) / 1000 / 60);
      if (sessionTime > 0) {
        const newTotal = totalWritingTime + sessionTime;
        setTotalWritingTime(newTotal);
        storage.saveWritingTime(newTotal);
      }
      setWritingStartTime(null);
    }
  };

  // 錯誤頁面渲染
  if (error) {
    return (
      <div style={errorPageStyles.container}>
        <h1>創世紀元</h1>
        <div style={errorPageStyles.errorBox}>
          <h2>應用程式遇到錯誤</h2>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            style={{
              background: baseStyles.primaryColor,
              color: baseStyles.backgroundColor,
              border: 'none',
              padding: '10px 20px',
              borderRadius: baseStyles.borderRadiusMedium,
              cursor: 'pointer',
              marginTop: baseStyles.marginMedium
            }}
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // 安全頁面渲染
  const safePage = (pageContent: () => React.ReactElement) => {
    try {
      return pageContent();
    } catch (err) {
      console.error('頁面渲染錯誤:', err);
      return (
        <div style={{ padding: baseStyles.paddingXLarge, textAlign: 'center' }}>
          <h2>頁面載入錯誤</h2>
          <p>這個頁面暫時無法使用</p>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            style={{
              background: baseStyles.primaryColor,
              color: baseStyles.backgroundColor,
              border: 'none',
              padding: '8px 16px',
              borderRadius: baseStyles.borderRadiusMedium,
              cursor: 'pointer'
            }}
          >
            返回儀表板
          </button>
        </div>
      );
    }
  };

  // 頁面渲染
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return safePage(() => (
          <DashboardPage
            onPageChange={setCurrentPage}
            onOpenCreateProject={() => setIsCreateProjectModalOpen(true)}
            onOpenCharacterManager={() => setIsCharacterManagerOpen(true)}
            onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
          />
        ));

      case 'editor':
        return safePage(() => (
          <EditorPage
            onPageChange={setCurrentPage}
            editorContent={editorContent}
            onContentChange={handleContentChange}
            isSaved={isSaved}
            onSave={handleSave}
            writingStartTime={writingStartTime}
            onWritingStart={handleWritingStart}
            onWritingEnd={handleWritingEnd}
          />
        ));

      default:
        return safePage(() => (
          <div style={{ padding: baseStyles.paddingXLarge, textAlign: 'center' }}>
            <h2>頁面建構中</h2>
            <p>這個頁面正在開發中，敬請期待！</p>
            <button 
              onClick={() => setCurrentPage('dashboard')}
              style={{
                background: baseStyles.primaryColor,
                color: baseStyles.backgroundColor,
                border: 'none',
                padding: '8px 16px',
                borderRadius: baseStyles.borderRadiusMedium,
                cursor: 'pointer'
              }}
            >
              返回儀表板
            </button>
          </div>
        ));
    }
  };

  // 如果還在載入中，不渲染任何內容（讓 HTML 載入畫面繼續顯示）
  if (isLoading) {
    return null;
  }

  return (
    <Layout>
      {renderPage()}

      {/* 模態框 */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
      />
      
      <CharacterManagerModal
        isOpen={isCharacterManagerOpen}
        onClose={() => setIsCharacterManagerOpen(false)}
      />
      
      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
      />
    </Layout>
  );
};

export default StableApp;