import React from 'react';

export interface EditorStats {
  wordCount: number;
  characterCount: number;
  lineCount: number;
  cursorPosition: {
    line: number;
    column: number;
  };
  selectedText?: string;
}

interface StatusBarProps {
  stats?: EditorStats;
  currentChapterTitle?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ stats, currentChapterTitle }) => {
  if (!stats) {
    return null;
  }

  const { wordCount, characterCount, lineCount, cursorPosition, selectedText } = stats;

  return (
    <div className="flex items-center space-x-6 text-xs text-gray-400">
      {/* 章節資訊 */}
      {currentChapterTitle && (
        <div className="flex items-center space-x-1">
          <span className="text-gold-400">📖</span>
          <span>{currentChapterTitle}</span>
        </div>
      )}
      
      {/* 字數統計 */}
      <div className="flex items-center space-x-1">
        <span className="text-blue-400">字</span>
        <span>{wordCount.toLocaleString()}</span>
      </div>
      
      {/* 字符數統計 */}
      <div className="flex items-center space-x-1">
        <span className="text-green-400">符</span>
        <span>{characterCount.toLocaleString()}</span>
      </div>
      
      {/* 行數統計 */}
      <div className="flex items-center space-x-1">
        <span className="text-purple-400">行</span>
        <span>{lineCount}</span>
      </div>
      
      {/* 光標位置 */}
      <div className="flex items-center space-x-1">
        <span className="text-orange-400">位置</span>
        <span>{cursorPosition.line}:{cursorPosition.column}</span>
      </div>
      
      {/* 選中文本長度 */}
      {selectedText && selectedText.length > 0 && (
        <div className="flex items-center space-x-1">
          <span className="text-pink-400">選中</span>
          <span>{selectedText.length} 字符</span>
        </div>
      )}
    </div>
  );
};

export default StatusBar;