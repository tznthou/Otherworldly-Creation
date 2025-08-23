import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { toggleSidebar, openModal } from '../../store/slices/uiSlice';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { sidebarCollapsed } = useAppSelector(state => state.ui);
  const { currentProject } = useAppSelector(state => state.projects);

  interface MenuItem {
    id: string;
    label: string;
    icon: string;
    path?: string | null;
    disabled?: boolean;
    isModal?: boolean;
  }

  // 安全地獲取專案 ID
  const getProjectId = () => {
    if (!currentProject) return null;
    
    const projectId = currentProject.id;
    console.log('Sidebar: 原始專案 ID:', projectId);
    
    // 如果 projectId 是路徑格式，提取真正的 UUID
    if (typeof projectId === 'string') {
      // 處理路徑格式的 ID (如: /chapter-status/uuid)
      if (projectId.includes('/')) {
        const parts = projectId.split('/').filter(part => part.length > 0);
        // 尋找看起來像 UUID 的部分 (格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        for (const part of parts) {
          if (uuidPattern.test(part)) {
            console.log('Sidebar: 找到 UUID 格式的專案 ID:', part);
            return part;
          }
        }
        
        // 如果沒找到 UUID，使用最後一部分
        const lastPart = parts[parts.length - 1];
        console.log('Sidebar: 使用最後一部分作為專案 ID:', lastPart);
        return lastPart;
      }
      
      // 直接檢查是否為 UUID 格式
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(projectId)) {
        console.log('Sidebar: 專案 ID 已是標準 UUID 格式:', projectId);
        return projectId;
      }
    }
    
    console.log('Sidebar: 無法解析專案 ID，返回原值:', projectId);
    return projectId;
  };

  const safeProjectId = getProjectId();

  const menuItems: MenuItem[] = [
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
      path: safeProjectId ? `/project/${safeProjectId}` : null,
      disabled: !currentProject,
    },
    {
      id: 'characters',
      label: '角色管理',
      icon: '👥',
      path: safeProjectId ? `/characters/${safeProjectId}` : null,
      disabled: !currentProject,
    },
    {
      id: 'illustrations',
      label: 'AI 插畫',
      icon: '🎨',
      isModal: true,
      disabled: !currentProject,
    },
    {
      id: 'chapterStatus',
      label: '章節管理',
      icon: '📋',
      path: safeProjectId ? `/chapter-status/${safeProjectId}` : null,
      disabled: !currentProject,
    },
    {
      id: 'statistics',
      label: '創作統計',
      icon: '📊',
      path: '/statistics',
    },
    {
      id: 'settings',
      label: '設定',
      icon: '⚙️',
      path: '/settings',
    },
  ];

  const handleNavigation = (path: string | null) => {
    console.log('Sidebar: 嘗試導航到:', path);
    console.log('Sidebar: 當前專案:', currentProject);
    
    if (path) {
      try {
        // 確保路徑格式正確
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        console.log('Sidebar: 清理後的路徑:', cleanPath);
        
        // 使用 setTimeout 確保事件處理完成
        setTimeout(() => {
          navigate(cleanPath);
          console.log('Sidebar: 導航成功到:', cleanPath);
        }, 0);
      } catch (error) {
        console.error('Sidebar: 導航失敗:', error);
      }
    } else {
      console.warn('Sidebar: 路徑為空，無法導航');
    }
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-full bg-cosmic-900/80 backdrop-blur-sm border-r border-cosmic-700 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
      style={{ 
        zIndex: 1000, 
        pointerEvents: 'auto',
        position: 'fixed',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
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
            const isActive = !item.isModal && (
              item.path === location.pathname || 
              (item.id === 'editor' && location.pathname.startsWith('/project/')) ||
              (item.id === 'characters' && location.pathname.startsWith('/characters/')) ||
              (item.id === 'chapterStatus' && location.pathname.startsWith('/chapter-status/'))
            );
            
            return (
              <li key={item.id}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Sidebar: 點擊了 ${item.label}，路徑:`, item.path, '禁用狀態:', item.disabled);
                    console.log('Sidebar: 當前專案詳情:', {
                      currentProject,
                      safeProjectId,
                      originalId: currentProject?.id
                    });
                    
                    if (!item.disabled) {
                      if (item.isModal && item.id === 'illustrations') {
                        // 打開 AI 插畫 modal
                        dispatch(openModal('aiIllustration'));
                      } else if (item.path) {
                        // 額外驗證路徑格式
                        if (item.path.includes('undefined') || item.path.includes('null')) {
                          console.error('Sidebar: 路徑包含無效值:', item.path);
                          alert('路徑錯誤：專案 ID 無效，請先選擇一個有效的專案');
                          return;
                        }
                        handleNavigation(item.path);
                      } else {
                        console.warn('Sidebar: 路徑為空');
                      }
                    } else {
                      console.log(`Sidebar: ${item.label} 被禁用，無法導航`);
                    }
                  }}
                  disabled={item.disabled}
                  className={`w-full nav-item ${isActive ? 'active' : ''} ${
                    item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cosmic-800 cursor-pointer'
                  } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                  style={{ 
                    pointerEvents: item.disabled ? 'none' : 'auto',
                    position: 'relative',
                    zIndex: 100
                  }}
                >
                  <span className={`text-xl flex-shrink-0 ${!sidebarCollapsed ? 'mr-3' : ''}`}>{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="font-medium truncate">{item.label}</span>
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
  const { isOllamaConnected, availableModels, currentProviderId, providers, currentModel } = useAppSelector(state => state.ai);

  // 🔧 修復：使用統一的當前提供者狀態邏輯（與Dashboard一致）
  const currentProvider = providers.find(p => p.id === currentProviderId);
  const currentProviderName = currentProvider?.name || '未選擇';
  const isCurrentProviderConnected = currentProviderId 
    ? (currentProviderId === 'ollama' ? isOllamaConnected : availableModels.length > 0)
    : false;

  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
      <div className={`w-3 h-3 rounded-full ${
        isCurrentProviderConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">AI 引擎</p>
          <p className={`text-sm font-medium truncate ${
            isCurrentProviderConnected ? 'text-green-400' : 'text-red-400'
          }`}>
            {isCurrentProviderConnected 
              ? (currentModel || `${currentProviderName} 已連接`) 
              : `${currentProviderName} 未連接`}
          </p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;