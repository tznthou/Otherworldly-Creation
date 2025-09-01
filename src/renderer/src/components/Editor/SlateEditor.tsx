import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { createEditor, Descendant, Editor, Transforms, Range, Element } from 'slate';
import { Slate, Editable, withReact, ReactEditor, RenderLeafProps as SlateRenderLeafProps, useSlate } from 'slate-react';
import { withHistory } from 'slate-history';
// import { useVirtualization } from '../../utils/componentOptimization';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { selectEditorSettings, toggleSettings, toggleReadingMode, selectIsReadingMode, toggleFocusWritingMode, selectIsFocusWritingMode } from '../../store/slices/editorSlice';
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

// 性能優化插件：限制渲染節點數量
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const withPerformance = (editor: Editor) => {
  const { insertData, insertText } = editor;

  // 批量處理文本插入
  editor.insertText = (text: string) => {
    const { selection } = editor;
    if (selection) {
      const textLength = text.length;
      if (textLength > 1000) {
        // 對於大量文本，使用批量插入
        Editor.withoutNormalizing(editor, () => {
          insertText(text);
        });
        return;
      }
    }
    insertText(text);
  };

  // 優化數據插入
  editor.insertData = (data: DataTransfer) => {
    const text = data.getData('text/plain');
    if (text && text.length > 5000) {
      // 對於大量數據，分批處理
      Editor.withoutNormalizing(editor, () => {
        insertData(data);
      });
      return;
    }
    insertData(data);
  };

  return editor;
};

// 自定義Hook：Selection狀態持久化管理
const useSelectionPersist = (editor: Editor) => {
  const selectionRef = useRef<Range | null>(null);
  const isRestoring = useRef(false);
  const lastSaveTime = useRef<number>(0);

  // 監聽selection變化並保存（但避免在恢復過程中重複保存）
  useEffect(() => {
    if (!isRestoring.current && editor.selection) {
      selectionRef.current = editor.selection;
    }
  }, [editor.selection]);

  // 恢復selection的方法
  const restoreSelection = useCallback(() => {
    if (selectionRef.current && !isRestoring.current) {
      isRestoring.current = true;
      try {
        // 使用setTimeout確保在DOM更新後執行
        setTimeout(() => {
          if (selectionRef.current) {
            Transforms.select(editor, selectionRef.current);
          }
          isRestoring.current = false;
        }, 0);
      } catch (error) {
        console.warn('[SelectionPersist] Failed to restore selection:', error);
        isRestoring.current = false;
      }
    }
  }, [editor]);

  // 保存當前selection（在自動保存前調用）
  const saveCurrentSelection = useCallback(() => {
    if (editor.selection && !isRestoring.current) {
      selectionRef.current = editor.selection;
      lastSaveTime.current = Date.now();
    }
  }, [editor]);

  return {
    restoreSelection,
    saveCurrentSelection,
    hasStoredSelection: () => selectionRef.current !== null
  };
};

interface SlateEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSave?: () => void;
  onAIWrite?: () => void;
  onEditorReady?: (editor: Editor, selectionMethods?: {
    saveCurrentSelection: () => void;
    restoreSelection: () => void;
    hasStoredSelection: () => boolean;
  }) => void; // 更新：編輯器就緒回調支援selection管理
  isSaving?: boolean;
  isGenerating?: boolean;
  showToolbar?: boolean;
}

// 更安全的編輯器組件包裝
const SafeSlateEditor: React.FC<SlateEditorProps> = (props) => {
  try {
    // 立即記錄和驗證 props
    console.log('[SafeSlateEditor] Props received:', {
      hasValue: 'value' in props,
      valueType: typeof props.value,
      isArray: Array.isArray(props.value),
      length: Array.isArray(props.value) ? props.value.length : 'N/A'
    });

    // 確保 value 是有效的
    const safeProps = {
      ...props,
      value: Array.isArray(props.value) && props.value.length > 0 
        ? props.value 
        : [{ type: 'paragraph' as const, children: [{ text: '' }] } as CustomElement]
    };

    return <SlateEditorCore {...safeProps} />;
  } catch (error) {
    console.error('[SafeSlateEditor] Props validation error:', error);
    return (
      <div className="w-full p-6 bg-red-900/20 border border-red-500 rounded-lg">
        <h3 className="text-red-400 text-lg font-bold mb-2">編輯器初始化錯誤</h3>
        <p className="text-red-300 text-sm">無法初始化編輯器組件</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
          重新整理
        </button>
      </div>
    );
  }
};

const SlateEditorCore: React.FC<SlateEditorProps> = ({
  value,
  onChange,
  placeholder = '開始寫作...',
  autoFocus = false,
  onSave,
  onAIWrite,
  onEditorReady, // 新增參數
  isSaving = false,
  isGenerating = false,
  showToolbar = true
}) => {
  console.log('[SlateEditorCore] Initializing with value:', {
    type: typeof value,
    isArray: Array.isArray(value),
    length: Array.isArray(value) ? value.length : 'N/A'
  });
  // 防禦性檢查：確保 value 是有效的 Slate 編輯器內容
  const safeValue = useMemo(() => {
    try {
      // 先檢查 value 是否存在且為陣列
      if (!value || !Array.isArray(value) || value.length === 0) {
        console.log('[SlateEditor] Value is invalid, using default:', value);
        return [{ type: 'paragraph' as const, children: [{ text: '' }] } as CustomElement];
      }
      
      // 檢查每個節點是否有效，使用更安全的方式
      const validatedValue = [];
      for (let i = 0; i < value.length; i++) {
        const node = value[i];
        
        if (!node || typeof node !== 'object') {
          console.warn('[SlateEditor] Invalid node at index', i, ':', node);
          validatedValue.push({ type: 'paragraph' as const, children: [{ text: '' }] } as CustomElement);
          continue;
        }
        
        // 檢查節點是否是 CustomElement（有 children 屬性）
        const isElement = 'children' in node && Array.isArray((node as CustomElement).children);
        if (!isElement) {
          // 如果不是 Element，跳過（可能是文本節點）
          if ('text' in node) {
            validatedValue.push(node as CustomText);
          } else {
            console.warn('[SlateEditor] Unknown node type at index', i, ':', node);
            validatedValue.push({ type: 'paragraph' as const, children: [{ text: '' }] } as CustomElement);
          }
          continue;
        }

        const elementNode = node as CustomElement;
        
        // 確保至少有一個子節點
        if (elementNode.children.length === 0) {
          console.warn('[SlateEditor] Node has empty children at index', i);
          validatedValue.push({ ...elementNode, children: [{ text: '' }] } as CustomElement);
          continue;
        }
        
        validatedValue.push(node);
      }
      
      return validatedValue;
    } catch (error) {
      console.error('[SlateEditor] Error validating value:', error, 'Value:', value);
      return [{ type: 'paragraph' as const, children: [{ text: '' }] } as CustomElement];
    }
  }, [value]);
  
  // 優化編輯器實例化，暫時移除性能插件進行測試
  const editor = useMemo(() => {
    const baseEditor = createEditor();
    // 暫時移除 withPerformance 來測試
    return withHistory(withReact(baseEditor));
  }, []);

  const settings = useAppSelector(selectEditorSettings);
  
  // Selection持久化管理
  const { restoreSelection, saveCurrentSelection, hasStoredSelection } = useSelectionPersist(editor);
  const lastChangeRef = useRef<string>('');
  
  // 直接處理 onChange 事件（移除防抖避免錯誤）
  const lastValueRef = useRef<Descendant[]>(safeValue);

  // 通知父組件編輯器已準備好（傳遞selection管理方法）
  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor, {
        saveCurrentSelection,
        restoreSelection,
        hasStoredSelection
      });
    }
  }, [editor, onEditorReady]); // 移除可能導致無限循環的函數依賴

  // 優化的 onChange 處理（添加selection保存邏輯）
  const handleChange = useCallback((newValue: Descendant[]) => {
    // 只在內容實際變化時才觸發回調
    const newValueStr = JSON.stringify(newValue);
    const lastValueStr = JSON.stringify(lastValueRef.current);
    
    if (newValueStr !== lastValueStr) {
      // 在內容變化時保存當前selection
      saveCurrentSelection();
      lastValueRef.current = newValue;
      lastChangeRef.current = newValueStr;
      onChange(newValue);
    }
  }, [onChange, saveCurrentSelection]);

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
            // 在手動保存前保存selection
            saveCurrentSelection();
            onSave();
            // 保存後稍後恢復selection
            setTimeout(() => {
              if (hasStoredSelection()) {
                restoreSelection();
              }
            }, 100);
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
              type: 'paragraph' as const,
              children: [{ text: '' }],
            } as CustomElement);
          }
        }
      }
    }
  }, [editor, onSave, saveCurrentSelection, hasStoredSelection, restoreSelection]);

  // 優化的渲染元素組件
  interface RenderElementProps {
    attributes: React.HTMLAttributes<HTMLElement>;
    children: React.ReactNode;
    element: CustomElement;
  }
  
  const ElementComponent = React.memo<RenderElementProps>(({ element, attributes, children }) => {
    switch (element.type) {
      case 'heading': {
        const level = element.level || 1;
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        return React.createElement(
          HeadingTag,
          {
            ...attributes,
            className: `text-${4 - Math.min(level, 3)}xl font-bold text-gold-400 mb-4`,
          },
          children
        );
      }
      case 'quote':
        return (
          <blockquote
            {...attributes}
            className="border-l-4 border-gold-500 pl-4 italic text-gray-300 my-4"
          >
            {children}
          </blockquote>
        );
      case 'bulleted-list':
      case 'list-item':
        return (
          <div {...attributes} className="mb-2 ml-4 flex">
            <span className="text-gold-400 mr-2">•</span>
            <span className="flex-1">{children}</span>
          </div>
        );
      default:
        return (
          <p {...attributes} className="mb-4 leading-relaxed">
            {children}
          </p>
        );
    }
  });
  
  const renderElement = useCallback((props: RenderElementProps) => (
    <ElementComponent {...props} />
  ), [ElementComponent]);

  // 優化的葉子節點組件
  const LeafComponent = React.memo<SlateRenderLeafProps>(({ leaf, attributes, children }) => {
    const typedLeaf = leaf as CustomText;
    let content = children;

    if (typedLeaf.bold) {
      content = <strong className="font-bold">{content}</strong>;
    }
    if (typedLeaf.italic) {
      content = <em className="italic">{content}</em>;
    }
    if (typedLeaf.underline) {
      content = <u className="underline">{content}</u>;
    }
    if (typedLeaf.code) {
      content = (
        <code className="bg-cosmic-800 px-2 py-1 rounded text-sm font-mono text-gold-400">
          {content}
        </code>
      );
    }

    return <span {...attributes}>{content}</span>;
  });

  const renderLeaf = useCallback((props: SlateRenderLeafProps) => (
    <LeafComponent {...props} />
  ), [LeafComponent]);

  // 優化的編輯器樣式計算
  const editorStyle = useMemo(() => ({
    minHeight: '100vh',
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}px`,
    textAlign: settings.textAlign as 'left' | 'center' | 'right' | 'justify',
    color: settings.textColor,
    backgroundColor: settings.backgroundColor,
    whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre' as 'pre-wrap' | 'pre',
  }), [settings]);


  // 錯誤邊界包裝
  try {
    return (
      <div 
        className="w-full transition-all duration-300"
        style={{ 
          backgroundColor: settings.backgroundColor
        }}
      >
        <Slate editor={editor} initialValue={safeValue} onChange={handleChange}>
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
  } catch (error) {
    console.error('[SlateEditor] Render error:', error);
    console.error('[SlateEditor] Error details:', {
      value,
      safeValue,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // 返回錯誤狀態的編輯器
    return (
      <div className="w-full p-6 bg-red-900/20 border border-red-500 rounded-lg">
        <div className="text-red-400 mb-4">
          <h3 className="text-lg font-bold mb-2">編輯器載入錯誤</h3>
          <p className="text-sm">無法載入章節內容，請重新整理頁面或聯繫支援。</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs">錯誤詳情</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {error instanceof Error ? error.stack : String(error)}
            </pre>
          </details>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary"
        >
          重新整理頁面
        </button>
      </div>
    );
  }
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
  const isFocusWritingMode = useAppSelector(selectIsFocusWritingMode);

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

        {/* 專注寫作模式按鈕 */}
        <button
          onClick={() => dispatch(toggleFocusWritingMode())}
          className={`p-2 rounded-lg transition-colors ${
            isFocusWritingMode 
              ? 'bg-purple-500 text-white' 
              : 'bg-cosmic-800 text-gray-300 hover:bg-cosmic-700 hover:text-white'
          }`}
          title="專注寫作模式"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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

export default SafeSlateEditor;
export { toggleMark, toggleBlock, isMarkActive, isBlockActive };

// 開發環境性能監控（暫時註解避免模組載入錯誤）
// if (process.env.NODE_ENV === 'development') {
//   import('../../utils/reactScan').then(({ monitorComponent }) => {
//     monitorComponent(SafeSlateEditor, 'SafeSlateEditor');
//   });
// }