import React from 'react';
import { useSlate } from 'slate-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleSettings, toggleReadingMode, selectIsReadingMode, toggleFocusWritingMode, selectIsFocusWritingMode } from '../../store/slices/editorSlice';
import { toggleMark, toggleBlock, isMarkActive, isBlockActive } from './SlateEditor';
import SaveStatusIndicator from '../UI/SaveStatusIndicator';

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

interface EditorToolbarProps {
  onSave?: () => void;
  onAIWrite?: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onSave,
  onAIWrite,
  isSaving = false,
  isGenerating = false,
}) => {
  const editor = useSlate();
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
              ? 'bg-clay-orange/30 text-white' 
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

export default EditorToolbar;