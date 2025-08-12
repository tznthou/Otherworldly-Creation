import React, { useCallback, useMemo } from 'react';
import { createEditor, Descendant } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';

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

interface SimpleSlateEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
  placeholder?: string;
  onSave?: () => void;
  onAIWrite?: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
  showToolbar?: boolean;
}

const SimpleSlateEditor: React.FC<SimpleSlateEditorProps> = ({
  value,
  onChange,
  placeholder = '開始寫作...',
  // onSave,
  // onAIWrite,
  // isSaving = false,
  // isGenerating = false,
  // showToolbar = true
}) => {
  console.log('[SimpleSlateEditor] Received value:', {
    type: typeof value,
    isArray: Array.isArray(value),
    length: Array.isArray(value) ? value.length : 'N/A',
    value
  });

  // 確保 value 是有效的
  const safeValue = useMemo(() => {
    if (!Array.isArray(value) || value.length === 0) {
      console.log('[SimpleSlateEditor] Using default value');
      return [{ type: 'paragraph' as const, children: [{ text: '' }] } as CustomElement];
    }
    return value;
  }, [value]);

  // 創建編輯器
  const editor = useMemo(() => {
    return withHistory(withReact(createEditor()));
  }, []);

  const handleChange = useCallback((newValue: Descendant[]) => {
    console.log('[SimpleSlateEditor] Content changed:', newValue);
    onChange(newValue);
  }, [onChange]);

  const renderElement = useCallback((props: RenderElementProps) => {
    return <p {...props.attributes}>{props.children}</p>;
  }, []);

  const renderLeaf = useCallback((props: RenderLeafProps) => {
    return <span {...props.attributes}>{props.children}</span>;
  }, []);

  try {
    return (
      <div className="w-full p-6 bg-cosmic-900 rounded-lg">
        <Slate editor={editor} initialValue={safeValue} onChange={handleChange}>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder={placeholder}
            className="min-h-[200px] text-white focus:outline-none"
          />
        </Slate>
      </div>
    );
  } catch (error) {
    console.error('[SimpleSlateEditor] Render error:', error);
    return (
      <div className="w-full p-6 bg-red-900/20 border border-red-500 rounded-lg">
        <h3 className="text-red-400 text-lg font-bold mb-2">編輯器錯誤</h3>
        <p className="text-red-300 text-sm">無法渲染編輯器: {String(error)}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        >
          重新整理
        </button>
      </div>
    );
  }
};

export default SimpleSlateEditor;