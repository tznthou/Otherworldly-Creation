import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';

const QuickActions: React.FC = () => {
  const dispatch = useAppDispatch();

  const actions = [
    {
      id: 'create-project',
      title: '創建新專案',
      description: '開始一個全新的創作專案',
      icon: '📝',
      color: 'from-gold-500 to-gold-600',
      action: () => dispatch(openModal('createProject')),
    },
    {
      id: 'import-project',
      title: '匯入專案',
      description: '從備份檔案匯入現有專案',
      icon: '📥',
      color: 'from-blue-500 to-blue-600',
      action: () => dispatch(openModal('importProject')),
    },
    {
      id: 'settings',
      title: '系統設定',
      description: '配置 AI 引擎和應用程式設定',
      icon: '⚙️',
      color: 'from-purple-500 to-purple-600',
      action: () => dispatch(openModal('settings')),
    },
    {
      id: 'help',
      title: '使用說明',
      description: '查看使用教學和常見問題',
      icon: '❓',
      color: 'from-green-500 to-green-600',
      action: () => {
        // TODO: 實現幫助功能
        console.log('顯示幫助');
      },
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-cosmic text-gold-500 mb-4">快速操作</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className="card card-hover group text-left p-4 transition-all duration-200 hover:scale-105 active:scale-95"
            data-tutorial={action.id === 'create-project' ? 'create-project-btn' : undefined}
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
              {action.icon}
            </div>
            
            <h3 className="font-medium text-white mb-2 group-hover:text-gold-400 transition-colors">
              {action.title}
            </h3>
            
            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
              {action.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;