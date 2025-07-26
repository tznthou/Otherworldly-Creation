import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';
import { useNavigate } from 'react-router-dom';

const QuickActions: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const actions = [
    {
      id: 'create-project',
      title: '🌟 創世神模式',
      description: '創建新的異世界創作專案',
      icon: '📝',
      color: 'from-gold-500 to-gold-600',
      action: () => dispatch(openModal('createProject')),
    },
    {
      id: 'character-manager',
      title: '⚔️ 英靈召喚',
      description: 'AI 輔助角色創造與管理',
      icon: '👥',
      color: 'from-purple-500 to-purple-600',
      action: () => {
        // 需要先選擇專案才能進入角色管理
        dispatch(openModal('selectProjectForCharacters'));
      },
    },
    {
      id: 'template-manager',
      title: '🎭 輕小說模板',
      description: '異世界、校園、科幻、奇幻模板',
      icon: '📚',
      color: 'from-mystic-500 to-mystic-600',
      action: () => dispatch(openModal('templateManager')),
    },
    {
      id: 'ai-writing',
      title: '🔮 預言書寫',
      description: '智能續寫與劇情建議',
      icon: '🤖',
      color: 'from-cyan-500 to-cyan-600',
      action: () => dispatch(openModal('aiSettings')),
    },
    {
      id: 'database-maintenance',
      title: '💾 資料管理',
      description: '資料庫維護、備份還原',
      icon: '🛠️',
      color: 'from-green-500 to-green-600',
      action: () => navigate('/database-maintenance'),
    },
    {
      id: 'import-project',
      title: '📥 匯入專案',
      description: '從備份檔案匯入現有專案',
      icon: '📥',
      color: 'from-blue-500 to-blue-600',
      action: () => dispatch(openModal('importProject')),
    },
    {
      id: 'backup-restore',
      title: '💿 備份還原',
      description: '專案資料備份與還原管理',
      icon: '💿',
      color: 'from-orange-500 to-orange-600',
      action: () => dispatch(openModal('backupManager')),
    },
    {
      id: 'settings',
      title: '⚙️ 系統設定',
      description: '配置 AI 引擎和應用程式設定',
      icon: '⚙️',
      color: 'from-gray-500 to-gray-600',
      action: () => navigate('/settings'),
    },
    {
      id: 'help',
      title: '❓ 使用說明',
      description: '查看使用教學和常見問題',
      icon: '❓',
      color: 'from-indigo-500 to-indigo-600',
      action: () => dispatch(openModal('helpCenter')),
    },
    {
      id: 'update-check',
      title: '🔄 檢查更新',
      description: '檢查並安裝應用程式更新',
      icon: '🔄',
      color: 'from-teal-500 to-teal-600',
      action: () => dispatch(openModal('updateManager')),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-cosmic text-gold-500 mb-6">✨ 創世紀元功能大全 ✨</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className="card card-hover group text-left p-4 transition-all duration-200 hover:scale-105 active:scale-95 relative overflow-hidden"
            data-tutorial={action.id === 'create-project' ? 'create-project-btn' : undefined}
          >
            {/* 背景魔法效果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-cosmic-800/50 via-cosmic-700/30 to-cosmic-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                {action.icon}
              </div>
              
              <h3 className="font-cosmic font-medium text-white mb-2 group-hover:text-gold-400 transition-colors text-lg">
                {action.title}
              </h3>
              
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                {action.description}
              </p>
              
              {/* 魔法光效 */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-gold-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity"></div>
            </div>
          </button>
        ))}
      </div>
      
      {/* 底部說明文字 */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 italic">
          🌟 選擇功能卡片開始您的異世界創作之旅 🌟
        </p>
      </div>
    </div>
  );
};

export default QuickActions;