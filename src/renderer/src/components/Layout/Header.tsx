import React from 'react';
import { useAppSelector } from '../../hooks/redux';

const Header: React.FC = () => {
  const { currentProject } = useAppSelector(state => state.projects);
  const { autoSaving } = useAppSelector(state => state.chapters);

  const getPageTitle = () => {
    const path = window.location.pathname;
    
    if (path === '/') return '專案總覽';
    if (path.startsWith('/project/')) return '寫作編輯器';
    if (path.startsWith('/characters/')) return '角色管理';
    if (path === '/settings') return '設定';
    
    return '創世紀元';
  };

  return (
    <header className="h-16 bg-cosmic-900/50 backdrop-blur-sm border-b border-cosmic-700 flex items-center justify-between px-6">
      {/* 左側：頁面標題 */}
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-cosmic text-gold-500">{getPageTitle()}</h2>
        
        {currentProject && (
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>•</span>
            <span>{currentProject.name}</span>
          </div>
        )}
      </div>

      {/* 右側：狀態指示器 */}
      <div className="flex items-center space-x-4">
        {/* 自動儲存指示器 */}
        {autoSaving && (
          <div className="flex items-center space-x-2 text-sm text-gold-400">
            <div className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
            <span>自動儲存中...</span>
          </div>
        )}

        {/* 時間顯示 */}
        <CurrentTime />
      </div>
    </header>
  );
};

// 當前時間組件
const CurrentTime: React.FC = () => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-sm text-gray-400 font-mono">
      {time.toLocaleTimeString('zh-TW', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      })}
    </div>
  );
};

export default Header;