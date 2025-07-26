import React from 'react';
import { PageType } from '../types';
import { pageStyles, baseStyles, componentStyles } from '../styles';
import { storage } from '../utils';

interface EditorPageProps {
  onPageChange: (page: PageType) => void;
  editorContent: string;
  onContentChange: (content: string) => void;
  isSaved: boolean;
  onSave: () => void;
  writingStartTime: Date | null;
  onWritingStart: () => void;
  onWritingEnd: () => void;
}

const EditorPage: React.FC<EditorPageProps> = ({
  onPageChange,
  editorContent,
  onContentChange,
  isSaved,
  onSave,
  writingStartTime,
  onWritingStart,
  onWritingEnd
}) => {
  const handleSave = () => {
    try {
      storage.saveContent(editorContent);
      onSave();
      alert(`✅ 儲存成功！\n\n內容已保存到本地儲存\n時間：${new Date().toLocaleString()}\n字數：${editorContent.length} 字`);
    } catch (error) {
      alert('❌ 儲存失敗：' + (error as Error).message);
    }
  };

  return (
    <div style={pageStyles.container}>
      <h2 style={pageStyles.title}>✍️ 編輯器</h2>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        border: baseStyles.primaryBorder,
        borderRadius: baseStyles.borderRadiusXLarge,
        padding: baseStyles.paddingXLarge,
        marginTop: baseStyles.marginXLarge
      }}>
        <textarea
          style={{
            width: '100%',
            height: '300px',
            background: 'transparent',
            border: 'none',
            color: baseStyles.primaryColor,
            fontSize: baseStyles.fontSizeLarge,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'monospace'
          }}
          placeholder="在這裡開始你的異世界冒險故事..."
          value={editorContent}
          onChange={(e) => {
            onContentChange(e.target.value);
            if (!writingStartTime) {
              onWritingStart();
            }
          }}
          onFocus={() => {
            if (!writingStartTime) {
              onWritingStart();
            }
          }}
          onBlur={onWritingEnd}
        />
      </div>
      
      <div style={{ marginTop: baseStyles.marginXLarge, textAlign: 'center' }}>
        <button
          style={{
            background: isSaved ? '#28a745' : baseStyles.primaryColor,
            color: baseStyles.backgroundColor,
            border: 'none',
            padding: '10px 20px',
            borderRadius: baseStyles.borderRadiusMedium,
            cursor: 'pointer',
            margin: '0 10px',
            opacity: isSaved ? 0.7 : 1
          }}
          onClick={handleSave}
          disabled={isSaved}
        >
          {isSaved ? '✅ 已儲存' : '💾 儲存'}
        </button>
        
        <button
          style={{
            ...componentStyles.secondaryButton,
            margin: '0 10px'
          }}
          onClick={() => onPageChange('dashboard')}
        >
          🏠 返回儀表板
        </button>
      </div>
    </div>
  );
};

export default EditorPage;