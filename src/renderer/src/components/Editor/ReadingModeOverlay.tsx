import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { selectEditorSettings, selectIsReadingMode, toggleReadingMode } from '../../store/slices/editorSlice';
import { Descendant } from 'slate';
import { ReactEditor } from 'slate-react';
import SlateEditor from './SlateEditor';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ReadingModeOverlay');

interface ReadingModeOverlayProps {
  children: React.ReactNode;
  currentChapter?: {
    id: string;
    title: string;
    content: Descendant[];
    chapterNumber?: number;
    order?: number;
    wordCount?: number;
  } | null;
  onEditorReady?: (editor: ReactEditor) => void;
}

const ReadingModeOverlay: React.FC<ReadingModeOverlayProps> = ({ 
  children, 
  currentChapter,
  onEditorReady
}) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectEditorSettings);
  const isReadingMode = useAppSelector(selectIsReadingMode);
  const [showControls, setShowControls] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

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
      if (isReadingMode) {
        switch (event.key) {
          case 'Escape':
            dispatch(toggleReadingMode());
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
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isReadingMode, dispatch]);

  // 清理定時器
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  if (!isReadingMode) {
    log.debug('ReadingModeOverlay: Not in reading mode, rendering children normally');
    return <>{children}</>;
  }
  
  log.debug('ReadingModeOverlay: In reading mode, applying overlay');

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
                  <span className="text-warm-gold">閱讀模式</span>
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
            {currentChapter ? (
              <SlateEditor
                key={`reading-editor-${currentChapter.id}`}
                value={currentChapter.content || [{ type: 'paragraph', children: [{ text: '' }] }]}
                onChange={() => {}} // 閱讀模式不允許編輯
                placeholder="閱讀模式 - 享受沉浸式閱讀體驗..."
                onEditorReady={onEditorReady}
                isSaving={false}
                showToolbar={false} // 閱讀模式隱藏工具欄
                autoFocus={false} // 閱讀模式不自動聚焦
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center" style={{ color: settings.textColor }}>
                  <div className="text-6xl mb-6">📖</div>
                  <h2 className="text-2xl font-bold mb-4">
                    閱讀模式
                  </h2>
                  <p className="text-gray-400">
                    選擇一個章節開始閱讀
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 控制欄 */}
      <div 
        className={`fixed top-16 right-4 flex flex-col space-y-2 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* 設定按鈕 */}
        <button
          className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors"
          title="設定"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

        {/* 退出閱讀模式 */}
        <button
          onClick={() => dispatch(toggleReadingMode())}
          className="p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors"
          title="退出閱讀模式 (Esc)"
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
            <span>退出閱讀模式</span>
            <kbd className="px-2 py-1 bg-white/20 rounded">F11</kbd>
            <span>全螢幕</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingModeOverlay;