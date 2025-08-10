import React, { useCallback, useMemo, useEffect } from 'react';
import { createEditor, Descendant, Editor, Transforms, Range, Element } from 'slate';
import { Slate, Editable, withReact, ReactEditor, RenderLeafProps as SlateRenderLeafProps, useSlate } from 'slate-react';
import { withHistory } from 'slate-history';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { selectEditorSettings, toggleSettings, toggleReadingMode, selectIsReadingMode } from '../../store/slices/editorSlice';
import SaveStatusIndicator from '../UI/SaveStatusIndicator';

// 定義編輯器節點類型
type CustomElement = {
  type: 'paragraph' | 'heading' | 'quote' | 'list-item' | 'bulleted-list';
  children: CustomText[];
  level?: number; // 用於標題級別
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

declare module 'slate' {
  interface CustomTypes {
    Editor: ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface SlateEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSave?: () => void;
  onAIWrite?: () => void;
  onEditorReady?: (editor: Editor) => void; // 新增：編輯器就緒回調
  isSaving?: boolean;
  isGenerating?: boolean;
  showToolbar?: boolean;
}

const SlateEditor: React.FC<SlateEditorProps> = ({
  value,
  onChange,
  placeholder = '開始寫作...',
  autoFocus = false,
  onSave,
  onAIWrite,
  onEditorReady, // 新增參數
  isSaving = false,
  isGenerating = false,
  showToolbar = true,
}) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const settings = useAppSelector(selectEditorSettings);

  // 通知父組件編輯器已準備好
  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // 處理鍵盤快捷鍵
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          toggleMark(editor, 'bold');
          break;
        case 'i':
          event.preventDefault();
          toggleMark(editor, 'italic');
          break;
        case 'u':
          event.preventDefault();
          toggleMark(editor, 'underline');
          break;
        case '`':
          event.preventDefault();
          toggleMark(editor, 'code');
          break;
        case 's':
          event.preventDefault();
          if (onSave) {
            onSave();
          }
          break;
      }
    }

    // 處理 Enter 鍵
    if (event.key === 'Enter') {
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const [match] = Editor.nodes(editor, {
          match: (n): n is CustomElement => Element.isElement(n) && Editor.isBlock(editor, n),
        });

        if (match) {
          const [block] = match as [CustomElement, number[]];
          if ('type' in block && block.type === 'quote') {
            event.preventDefault();
            Transforms.insertNodes(editor, {
              type: 'paragraph',
              children: [{ text: '' }],
            });
          }
        }
      }
    }
  }, [editor, onSave]);

  // 渲染元素
  interface RenderElementProps {
    attributes: React.HTMLAttributes<HTMLElement>;
    children: React.ReactNode;
    element: CustomElement;
  }
  const renderElement = useCallback((props: RenderElementProps) => {
    switch (props.element.type) {
      case 'heading': {
        const level = props.element.level || 1;
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        return React.createElement(
          HeadingTag,
          {
            ...props.attributes,
            className: `text-${4 - Math.min(level, 3)}xl font-bold text-gold-400 mb-4`,
          },
          props.children
        );
      }
      case 'quote':
        return (
          <blockquote
            {...props.attributes}
            className="border-l-4 border-gold-500 pl-4 italic text-gray-300 my-4"
          >
            {props.children}
          </blockquote>
        );
      case 'bulleted-list':
      case 'list-item':
        // 完全避免任何列表標籤，統一渲染為段落
        return (
          <div {...props.attributes} className="mb-2 ml-4 flex">
            <span className="text-gold-400 mr-2">•</span>
            <span className="flex-1">{props.children}</span>
          </div>
        );
      default:
        return (
          <p {...props.attributes} className="mb-4 leading-relaxed">
            {props.children}
          </p>
        );
    }
  }, []);

  // 渲染葉子節點
  const renderLeaf = useCallback((props: SlateRenderLeafProps) => {
    const leaf = props.leaf as CustomText;
    let children = props.children;

    if (leaf.bold) {
      children = <strong className="font-bold">{children}</strong>;
    }

    if (leaf.italic) {
      children = <em className="italic">{children}</em>;
    }

    if (leaf.underline) {
      children = <u className="underline">{children}</u>;
    }

    if (leaf.code) {
      children = (
        <code className="bg-cosmic-800 px-2 py-1 rounded text-sm font-mono text-gold-400">
          {children}
        </code>
      );
    }

    return <span {...props.attributes}>{children}</span>;
  }, []);

  // 計算編輯器樣式
  const editorStyle = {
    minHeight: '100vh', // 確保編輯器有足夠高度產生滾動
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}px`,
    textAlign: settings.textAlign,
    color: settings.textColor,
    backgroundColor: settings.backgroundColor,
    whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
  };


  return (
    <div 
      className="w-full transition-all duration-300"
      style={{ 
        backgroundColor: settings.backgroundColor
      }}
    >
      <Slate editor={editor} initialValue={value} onChange={onChange}>
        <div className="w-full">
          {/* 內聯工具欄 */}
          {showToolbar && (
            <InlineToolbar 
              onSave={onSave}
              onAIWrite={onAIWrite}
              isSaving={isSaving}
              isGenerating={isGenerating}
            />
          )}
          
          {/* 行號顯示 */}
          {settings.showLineNumbers && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-cosmic-800/50 border-r border-cosmic-700 text-xs text-gray-500 p-2">
              {/* 行號實現可以在後續版本中添加 */}
            </div>
          )}
          
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder={placeholder}
            spellCheck={settings.spellCheck}
            autoFocus={autoFocus}
            onKeyDown={handleKeyDown}
            className={`p-6 focus:outline-none transition-all duration-300 ${
              settings.showLineNumbers ? 'pl-16' : ''
            }`}
            style={editorStyle}
          />
        </div>
      </Slate>
    </div>
  );
};

// 輔助函數：切換文本標記
const toggleMark = (editor: Editor, format: keyof CustomText) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

// 輔助函數：檢查標記是否激活
const isMarkActive = (editor: Editor, format: keyof CustomText) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof typeof marks] === true : false;
};

// 輔助函數：切換塊級元素（簡化版，避免嵌套問題）
const toggleBlock = (editor: Editor, format: CustomElement['type']) => {
  const isActive = isBlockActive(editor, format);
  
  // 對於列表項目，正確實現切換邏輯
  if (format === 'list-item') {
    const newProperties: Partial<CustomElement> = {
      type: isActive ? 'paragraph' : 'list-item', // 修復：正確切換到列表項目
    };
    Transforms.setNodes(editor, newProperties);
    return;
  }

  const newProperties: Partial<CustomElement> = {
    type: isActive ? 'paragraph' : format,
  };

  Transforms.setNodes(editor, newProperties);
};

// 輔助函數：檢查塊級元素是否激活
const isBlockActive = (editor: Editor, format: CustomElement['type']) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n): n is CustomElement => Element.isElement(n) && Editor.isBlock(editor, n) && 'type' in (n as CustomElement) && (n as CustomElement).type === format,
    })
  );

  return !!match;
};

// 內聯工具欄組件（在 Slate 上下文內部）
interface InlineToolbarProps {
  onSave?: () => void;
  onAIWrite?: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
}

interface ToolbarButtonProps {
  active: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
  children: React.ReactNode;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  active, 
  onMouseDown, 
  children, 
  title 
}) => (
  <button
    type="button"
    title={title}
    className={`px-3 py-2 rounded-lg transition-colors ${
      active 
        ? 'bg-gold-500 text-cosmic-900' 
        : 'bg-cosmic-800 text-gray-300 hover:bg-cosmic-700 hover:text-white'
    }`}
    onMouseDown={onMouseDown}
  >
    {children}
  </button>
);

const InlineToolbar: React.FC<InlineToolbarProps> = ({
  onSave,
  onAIWrite,
  isSaving = false,
  isGenerating = false,
}) => {
  const editor = useSlate(); // 現在可以安全使用，因為在 Slate 組件內部
  const dispatch = useAppDispatch();
  const isReadingMode = useAppSelector(selectIsReadingMode);

  return (
    <div className="border-b border-cosmic-700 p-4 flex items-center justify-between bg-cosmic-900">
      {/* 格式化工具 */}
      <div className="flex items-center space-x-2">
        {/* 文本格式 */}
        <div className="flex items-center space-x-1">
          <ToolbarButton
            active={isMarkActive(editor, 'bold')}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleMark(editor, 'bold');
            }}
            title="粗體 (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          
          <ToolbarButton
            active={isMarkActive(editor, 'italic')}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleMark(editor, 'italic');
            }}
            title="斜體 (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>
          
          <ToolbarButton
            active={isMarkActive(editor, 'underline')}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleMark(editor, 'underline');
            }}
            title="底線 (Ctrl+U)"
          >
            <u>U</u>
          </ToolbarButton>
          
          <ToolbarButton
            active={isMarkActive(editor, 'code')}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleMark(editor, 'code');
            }}
            title="程式碼 (Ctrl+`)"
          >
            {'</>'}
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-cosmic-700 mx-2"></div>

        {/* 塊級元素 */}
        <div className="flex items-center space-x-1">
          <ToolbarButton
            active={isBlockActive(editor, 'heading')}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleBlock(editor, 'heading');
            }}
            title="標題"
          >
            H1
          </ToolbarButton>
          
          <ToolbarButton
            active={isBlockActive(editor, 'quote')}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleBlock(editor, 'quote');
            }}
            title="引用"
          >
            "
          </ToolbarButton>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex items-center space-x-2">
        {/* 閱讀模式按鈕 */}
        <button
          onClick={() => dispatch(toggleReadingMode())}
          className={`p-2 rounded-lg transition-colors ${
            isReadingMode 
              ? 'bg-gold-500 text-cosmic-900' 
              : 'bg-cosmic-800 text-gray-300 hover:bg-cosmic-700 hover:text-white'
          }`}
          title="閱讀模式"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* 設定按鈕 */}
        <button
          onClick={() => dispatch(toggleSettings())}
          className="p-2 bg-cosmic-800 text-gray-300 hover:bg-cosmic-700 hover:text-white rounded-lg transition-colors"
          title="編輯器設定"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="w-px h-6 bg-cosmic-700 mx-2"></div>

        {/* 儲存狀態指示器 */}
        <div className="flex items-center">
          <SaveStatusIndicator size="small" />
        </div>

        <div className="w-px h-6 bg-cosmic-700 mx-2"></div>

        {onAIWrite && (
          <button
            onClick={onAIWrite}
            disabled={isGenerating}
            className="btn-secondary flex items-center space-x-2"
            title="AI 續寫"
          >
            <span>🤖</span>
            <span>{isGenerating ? 'AI 生成中...' : 'AI 續寫'}</span>
          </button>
        )}
        
        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn-primary flex items-center space-x-2"
            title="儲存 (Ctrl+S)"
          >
            <span>💾</span>
            <span>{isSaving ? '儲存中...' : '儲存'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SlateEditor;
export { toggleMark, toggleBlock, isMarkActive, isBlockActive };