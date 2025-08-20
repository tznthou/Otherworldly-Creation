import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { selectEditorSettings, selectIsFocusWritingMode, toggleFocusWritingMode } from '../../store/slices/editorSlice';
import { Descendant } from 'slate';
import { ReactEditor } from 'slate-react';
import SlateEditor from './SlateEditor';

interface FocusWritingModeOverlayProps {
  children: React.ReactNode;
  currentChapter?: {
    id: string;
    title: string;
    content: Descendant[];
    chapterNumber?: number;
    order?: number;
    wordCount?: number;
  } | null;
  onSave?: () => void;
  onEditorReady?: (editor: ReactEditor) => void;
  onEditorChange?: (value: Descendant[]) => void;
  isSaving?: boolean;
}

const FocusWritingModeOverlay: React.FC<FocusWritingModeOverlayProps> = ({ 
  children, 
  currentChapter,
  onSave,
  onEditorReady,
  onEditorChange,
  isSaving = false
}) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectEditorSettings);
  const isFocusWritingMode = useAppSelector(selectIsFocusWritingMode);
  const [showControls, setShowControls] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showStats, setShowStats] = useState(false);

  // 處理滑鼠移動，顯示控制項
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    
    setHideTimeout(timeout);
  };

  // 處理鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFocusWritingMode) {
        switch (event.key) {
          case 'Escape':
            dispatch(toggleFocusWritingMode());
            break;
          case 'F11':
            event.preventDefault();
            // 切換全螢幕（如果支援）
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
            break;
          case 's':
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              onSave?.();
            }
            break;
          case 'Tab':
            if (event.ctrlKey) {
              event.preventDefault();
              setShowStats(!showStats);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocusWritingMode, dispatch, onSave, showStats]);

  // 清理定時器
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  if (!isFocusWritingMode) {
    return <>{children}</>;
  }

  // 計算字數
  const getWordCount = () => {
    if (!currentChapter?.content || !Array.isArray(currentChapter.content)) {
      return 0;
    }
    
    let totalChars = 0;
    currentChapter.content.forEach((node: Descendant) => {
      if ('type' in node && node.type === 'paragraph' && 'children' in node) {
        node.children.forEach((child: Descendant) => {
          if ('text' in child && typeof child.text === 'string') {
            totalChars += child.text.length;
          }
        });
      }
    });
    return totalChars;
  };

  const wordCount = getWordCount();

  return (
    <div 
      className="fixed inset-0 z-50 transition-all duration-300"
      style={{ 
        backgroundColor: settings.backgroundColor || '#0A1128'
      }}
      onMouseMove={handleMouseMove}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
      
      {/* 主要編輯區域 */}
      <div className="relative h-full flex flex-col">
        {/* 頂部標題欄 */}
        <div 
          className={`transition-all duration-300 border-b ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
          }`}
          style={{ 
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="px-8 py-4">
            {currentChapter && (
              <div className="flex items-center justify-between">
                <div>
                  <h1 
                    className="text-xl font-bold"
                    style={{ 
                      color: settings.textColor || '#FFD700',
                      fontFamily: settings.fontFamily 
                    }}
                  >
                    第 {currentChapter.chapterNumber || currentChapter.order || '1'} 章 - {currentChapter.title}
                  </h1>
                </div>
                <div className="flex items-center space-x-4 text-sm" style={{ color: settings.textColor }}>
                  <span>{wordCount} 字</span>
                  {isSaving && <span className="text-blue-400">儲存中...</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 編輯器容器 */}
        <div className="flex-1 overflow-hidden">
          <div 
            className="h-full mx-auto px-8 py-6 overflow-y-auto"
            style={{
              maxWidth: `${Math.max(settings.readingModeWidth || 800, 800)}px`
            }}
          >
            {currentChapter && onEditorChange ? (
              <SlateEditor
                key={`focus-editor-${currentChapter.id}`}
                value={currentChapter.content || [{ type: 'paragraph', children: [{ text: '' }] }]}
                onChange={onEditorChange}
                placeholder="專注寫作模式 - 沉浸在你的創作世界中..."
                onSave={onSave}
                onEditorReady={onEditorReady}
                isSaving={isSaving}
                showToolbar={false} // 專注模式隱藏工具欄
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center" style={{ color: settings.textColor }}>
                  <div className="text-6xl mb-6">✍️</div>
                  <h2 className="text-2xl font-bold mb-4">
                    專注寫作模式
                  </h2>
                  <p className="text-gray-400">
                    選擇一個章節開始專注寫作
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部統計欄 */}
        {showStats && currentChapter && (
          <div 
            className="border-t px-8 py-3"
            style={{ 
              borderColor: 'rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: settings.textColor
            }}
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <span>字數：{wordCount}</span>
                <span>段落：{currentChapter.content?.length || 0}</span>
                <span>章節：第 {currentChapter.chapterNumber || currentChapter.order || '1'} 章</span>
              </div>
              <div className="text-xs text-gray-400">
                按 Ctrl+Tab 隱藏統計資訊
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 控制欄 */}
      <div 
        className={`fixed top-16 right-4 flex flex-col space-y-2 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* 儲存按鈕 */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors disabled:opacity-50"
          title="儲存 (Ctrl+S)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>

        {/* 統計切換按鈕 */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors"
          title="顯示/隱藏統計 (Ctrl+Tab)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>

        {/* 全螢幕按鈕 */}
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors"
          title="全螢幕 (F11)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        {/* 退出專注模式 */}
        <button
          onClick={() => dispatch(toggleFocusWritingMode())}
          className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors"
          title="退出專注模式 (Esc)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 底部提示 */}
      <div 
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
          <div className="flex items-center space-x-4">
            <kbd className="px-2 py-1 bg-white/20 rounded">Esc</kbd>
            <span>退出專注模式</span>
            <kbd className="px-2 py-1 bg-white/20 rounded">Ctrl+S</kbd>
            <span>儲存</span>
            <kbd className="px-2 py-1 bg-white/20 rounded">Ctrl+Tab</kbd>
            <span>統計</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusWritingModeOverlay;