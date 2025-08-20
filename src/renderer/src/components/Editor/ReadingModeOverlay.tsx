import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { selectEditorSettings, selectIsReadingMode, toggleReadingMode } from '../../store/slices/editorSlice';
import { Descendant } from 'slate';

interface ReadingModeOverlayProps {
  children: React.ReactNode;
  currentChapter?: {
    id: string;
    title: string;
    content: Descendant[];
    chapterNumber?: number;
    order?: number;
  } | null;
}

const ReadingModeOverlay: React.FC<ReadingModeOverlayProps> = ({ children, currentChapter }) => {
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
    console.log('ReadingModeOverlay: Not in reading mode, rendering children normally');
    return <>{children}</>;
  }
  
  console.log('ReadingModeOverlay: In reading mode, applying overlay');

  // 渲染章節內容為純文字
  const renderChapterContent = () => {
    if (!currentChapter?.content || !Array.isArray(currentChapter.content)) {
      return <p className="text-gray-400 italic">沒有內容可顯示</p>;
    }

    return currentChapter.content.map((node: Descendant, index) => {
      if ('type' in node && node.type === 'paragraph' && 'children' in node) {
        const text = node.children.map((child: Descendant) => {
          if ('text' in child && typeof child.text === 'string') {
            return child.text;
          }
          return '';
        }).join('') || '';
        
        return text.trim() ? (
          <p key={index} className="mb-4" style={{ textIndent: '2em' }}>
            {text}
          </p>
        ) : <br key={index} />;
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black transition-all duration-300"
      style={{ 
        backgroundColor: settings.backgroundColor,
        opacity: settings.readingModeOpacity 
      }}
      onMouseMove={handleMouseMove}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
      
      {/* 主要內容區域 */}
      <div 
        className="relative h-full overflow-y-auto"
        style={{
          maxWidth: `${settings.readingModeWidth}px`,
          margin: '0 auto',
          padding: '2rem'
        }}
      >
        {/* 章節標題 */}
        {currentChapter && (
          <div className="mb-8 text-center border-b border-gray-600 pb-6">
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ 
                color: settings.textColor,
                fontFamily: settings.fontFamily 
              }}
            >
              第 {currentChapter.chapterNumber || currentChapter.order || '1'} 章
            </h1>
            <h2 
              className="text-xl"
              style={{ 
                color: settings.textColor,
                fontFamily: settings.fontFamily 
              }}
            >
              {currentChapter.title}
            </h2>
          </div>
        )}
        
        {/* 內容 */}
        <div 
          className="prose prose-lg max-w-none"
          style={{
            fontFamily: settings.fontFamily,
            fontSize: `${settings.fontSize}px`,
            fontWeight: settings.fontWeight,
            lineHeight: settings.lineHeight,
            letterSpacing: `${settings.letterSpacing}px`,
            textAlign: settings.textAlign,
            color: settings.textColor
          }}
        >
          {renderChapterContent()}
        </div>
      </div>

      {/* 控制欄 */}
      <div 
        className={`fixed top-4 right-4 flex items-center space-x-2 transition-all duration-300 ${
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
          按 <kbd className="px-2 py-1 bg-white/20 rounded">Esc</kbd> 退出閱讀模式
        </div>
      </div>
    </div>
  );
};

export default ReadingModeOverlay;