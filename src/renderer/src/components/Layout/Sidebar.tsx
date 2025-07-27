import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { toggleSidebar } from '../../store/slices/uiSlice';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { sidebarCollapsed } = useAppSelector(state => state.ui);
  const { currentProject } = useAppSelector(state => state.projects);

  const menuItems = [
    {
      id: 'dashboard',
      label: '專案總覽',
      icon: '🏠',
      path: '/',
    },
    {
      id: 'editor',
      label: '寫作編輯器',
      icon: '✍️',
      path: currentProject ? `/project/${currentProject.id}` : null,
      disabled: !currentProject,
    },
    {
      id: 'characters',
      label: '角色管理',
      icon: '👥',
      path: currentProject ? `/characters/${currentProject.id}` : null,
      disabled: !currentProject,
    },
    {
      id: 'settings',
      label: '設定',
      icon: '⚙️',
      path: '/settings',
    },
  ];

  const handleNavigation = (path: string | null) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-cosmic-900/80 backdrop-blur-sm border-r border-cosmic-700 transition-all duration-300 z-40 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo 區域 */}
      <div className="flex items-center justify-between p-4 border-b border-cosmic-700">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gold-500 to-gold-600 rounded-lg flex items-center justify-center glow-effect animate-pulse-glow">
              <span className="text-cosmic-950 font-bold text-sm">創</span>
            </div>
            <div>
              <h1 className="font-cosmic text-gold-500 text-lg font-bold title-cosmic">創世紀元</h1>
              <p className="text-xs text-gray-400">異世界創作神器</p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded-lg hover:bg-cosmic-800 transition-colors"
        >
          <span className="text-gold-500">
            {sidebarCollapsed ? '→' : '←'}
          </span>
        </button>
      </div>

      {/* 當前專案資訊 */}
      {!sidebarCollapsed && currentProject && (
        <div className="p-4 border-b border-cosmic-700">
          <div className="bg-cosmic-800/50 rounded-lg p-3 card-hover animate-fade-in">
            <p className="text-xs text-gray-400 mb-1">當前專案</p>
            <p className="text-gold-400 font-medium truncate">{currentProject.name}</p>
            <p className="text-xs text-gray-500 capitalize">{currentProject.type}</p>
            <div className="w-full bg-cosmic-700 rounded-full h-1 mt-2">
              <div className="bg-gradient-to-r from-gold-500 to-gold-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      )}

      {/* 導航選單 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = item.path === location.pathname || 
              (item.id === 'editor' && location.pathname.startsWith('/project/')) ||
              (item.id === 'characters' && location.pathname.startsWith('/characters/'));
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  disabled={item.disabled}
                  className={`w-full nav-item ${isActive ? 'active' : ''} ${
                    item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* AI 狀態指示 */}
      <div className="p-4 border-t border-cosmic-700">
        <AIStatusIndicator collapsed={sidebarCollapsed} />
      </div>
    </div>
  );
};

// AI 狀態指示組件
const AIStatusIndicator: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const { isOllamaConnected, currentModel } = useAppSelector(state => state.ai); // 重新啟用 AI state

  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
      <div className={`w-3 h-3 rounded-full ${
        isOllamaConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">AI 引擎</p>
          <p className={`text-sm font-medium truncate ${
            isOllamaConnected ? 'text-green-400' : 'text-red-400'
          }`}>
            {isOllamaConnected ? (currentModel || 'Ollama 已連接') : 'Ollama 未連接'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;