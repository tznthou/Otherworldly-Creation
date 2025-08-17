import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import StatusBar, { EditorStats } from './StatusBar';

interface FooterProps {
  editorStats?: EditorStats;
  currentChapterTitle?: string;
}

const Footer: React.FC<FooterProps> = ({ editorStats, currentChapterTitle }) => {
  const { currentProject } = useAppSelector(state => state.projects);
  const { isOllamaConnected } = useAppSelector(state => state.ai);
  const { showStatusBar } = useAppSelector(state => state.settings.settings.ui);
  const location = useLocation();
  
  // 檢查是否在編輯器頁面
  const isEditorPage = location.pathname.includes('/project/');
  
  return (
    <footer className="h-8 bg-cosmic-900/30 backdrop-blur-sm border-t border-cosmic-700 flex items-center justify-between px-6 text-xs text-gray-400">
      {/* 左側：專案資訊或編輯器統計 */}
      <div className="flex items-center space-x-4">
        {isEditorPage && showStatusBar && editorStats ? (
          <StatusBar stats={editorStats} currentChapterTitle={currentChapterTitle} />
        ) : currentProject ? (
          <span>專案: {currentProject.name}</span>
        ) : (
          <span>創世紀元：異世界創作神器</span>
        )}
      </div>

      {/* 中間：狀態資訊 */}
      <div className="flex items-center space-x-4">
        {/* AI 服務狀態 */}
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            isOllamaConnected ? 'bg-green-400' : 'bg-red-400'
          }`} />
          <span>AI: {isOllamaConnected ? '已連接' : '未連接'}</span>
        </div>
      </div>

      {/* 右側：版本資訊 */}
      <div className="flex items-center space-x-4">
        <span>v0.4.11</span>
        <span>© 2025 創世紀元</span>
      </div>
    </footer>
  );
};

export default Footer;