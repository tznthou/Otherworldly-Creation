import React, { useCallback, useMemo } from 'react';
import { createEditor, Descendant, Editor, Transforms, Range, Element } from 'slate';
import { Slate, Editable, withReact, ReactEditor, RenderLeafProps as SlateRenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import { useAppSelector } from '../../hooks/redux';
import { selectEditorSettings } from '../../store/slices/editorSlice';

// 定義編輯器節點類型
type CustomElement = {
  type: 'paragraph' | 'heading' | 'quote' | 'list-item';
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
}

const SlateEditor: React.FC<SlateEditorProps> = ({
  value,
  onChange,
  placeholder = '開始寫作...',
  autoFocus = false,
  onSave,
}) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const settings = useAppSelector(selectEditorSettings);

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
      case 'list-item':
        return (
          <li {...props.attributes} className="ml-4 mb-2">
            {props.children}
          </li>
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

// 輔助函數：切換塊級元素
const toggleBlock = (editor: Editor, format: CustomElement['type']) => {
  const isActive = isBlockActive(editor, format);
  const isList = format === 'list-item';

  Transforms.unwrapNodes(editor, {
    match: (n): n is CustomElement => Element.isElement(n) && Editor.isBlock(editor, n) && 'type' in (n as CustomElement) && (n as CustomElement).type === 'list-item',
    split: true,
  });

  const newProperties: Partial<CustomElement> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  };

  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block: CustomElement = { type: 'list-item', children: [] };
    Transforms.wrapNodes(editor, block);
  }
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

export default SlateEditor;
export { toggleMark, toggleBlock, isMarkActive, isBlockActive };