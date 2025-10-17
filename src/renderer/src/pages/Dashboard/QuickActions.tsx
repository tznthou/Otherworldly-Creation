import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/UI/Icon';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('QuickActions');

const QuickActions: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { modals: _modals } = useAppSelector(state => state.ui);

  const actions = [
    {
      id: 'create-project',
      title: '創世神模式',
      description: '創建新的異世界創作專案',
      iconName: 'Sparkles',
      iconVariant: 'solid' as const,
      color: 'from-gold-500 to-gold-600',
      action: () => {
        dispatch(openModal('createProject'));
      },
    },
    {
      id: 'character-manager',
      title: '英靈召喚',
      description: 'AI 輔助角色創造與管理',
      iconName: 'UserGroup',
      iconVariant: 'outline' as const,
      color: 'from-purple-500 to-purple-600',
      action: () => {
        dispatch(openModal('selectProjectForCharacters'));
      },
    },
    {
      id: 'template-manager',
      title: '輕小說模板',
      description: '異世界、校園、科幻、奇幻模板',
      iconName: 'BookOpen',
      iconVariant: 'solid' as const,
      color: 'from-mystic-500 to-mystic-600',
      action: () => {
        dispatch(openModal('templateManager'));
      },
    },
    {
      id: 'ai-writing',
      title: '預言書寫',
      description: '智能續寫與劇情建議',
      iconName: 'CpuChip',
      iconVariant: 'solid' as const,
      color: 'from-cyan-500 to-cyan-600',
      action: () => {
        dispatch(openModal('aiSettings'));
      },
    },
    {
      id: 'data-management',
      title: '資料管理',
      description: '備份、還原、匯入專案與資料庫維護',
      iconName: 'CircleStack',
      iconVariant: 'outline' as const,
      color: 'from-green-500 to-green-600',
      action: () => {
        dispatch(openModal('backupManager'));
      },
    },
    {
      id: 'settings',
      title: '系統設定',
      description: '配置 AI 引擎和應用程式設定',
      iconName: 'Cog6Tooth',
      iconVariant: 'outline' as const,
      color: 'from-gray-500 to-gray-600',
      action: () => {
        navigate('/settings');
      },
    },
    {
      id: 'help',
      title: '使用說明',
      description: '查看使用教學和常見問題',
      iconName: 'QuestionMarkCircle',
      iconVariant: 'outline' as const,
      color: 'from-indigo-500 to-indigo-600',
      action: () => {
        dispatch(openModal('helpCenter'));
      },
    },

    {
      id: 'writing-stats',
      title: '創作統計',
      description: '查看寫作進度和統計數據',
      iconName: 'ChartBar',
      iconVariant: 'solid' as const,
      color: 'from-violet-500 to-violet-600',
      action: () => {
        navigate('/statistics');
      },
    },

    {
      id: 'ai-illustration',
      title: '幻想具現',
      description: 'AI 插畫生成 - 角色插畫、場景插畫、封面設計',
      iconName: 'Photo',
      iconVariant: 'solid' as const,
      color: 'from-pink-500 to-rose-600',
      action: () => {
        log.debug('🎨 [QuickActions] 幻想具現卡片被點擊');
        dispatch(openModal('aiIllustration'));
        log.debug('🎨 [QuickActions] openModal action 已派發完成');
      },
    },
    {
      id: 'ebook-generation',
      title: '次元物語・零式記錄',
      description: '虛數空間展開・輕量化傳送陣（建議優先）',
      iconName: 'BookOpen',
      iconVariant: 'outline' as const,
      color: 'from-emerald-500 to-teal-600',
      isPlanned: false, // 功能已實現，移除規劃中標記
      action: () => {
        dispatch(openModal('epubGeneration'));
      },
    },
    {
      id: 'pdf-generation',
      title: '絕對文書・完全具現化',
      description: '真理銘刻・最終形態解放（模組化架構重構完成！）',
      iconName: 'DocumentArrowDown',
      iconVariant: 'solid' as const,
      color: 'from-orange-500 to-red-600',
      isPlanned: false, // 功能已重構完成！
      action: () => {
        dispatch(openModal('pdfGeneration'));
      },
    },
    {
      id: 'advanced-ai',
      title: '進階 AI 功能',
      description: '高級創作輔助 - 劇情分析、角色一致性檢查、創意建議',
      iconName: 'Beaker',
      iconVariant: 'outline' as const,
      color: 'from-blue-500 to-indigo-600',
      isPlanned: false, // 功能已實現！
      action: () => {
        // 導航到專案編輯器來使用劇情分析功能
        dispatch(openModal('selectProjectForPlotAnalysis'));
      },
    },
  ];

  return (
    <div>
      <h2 className="font-serif-tc text-2xl font-bold text-text-primary mb-6">功能導航</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`bg-bg-light/50 backdrop-blur-sm rounded-3xl p-6 border border-warm-gold/10 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 text-left group relative ${action.isPlanned ? 'opacity-75 hover:opacity-90' : ''}`}
            data-tutorial={action.id === 'create-project' ? 'create-project-btn' : undefined}
          >
            
            {/* 規劃中功能標記 */}
            {action.isPlanned && (
              <div className="absolute top-2 right-2 z-20">
                <div className="bg-orange-500/90 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                  開發中
                </div>
              </div>
            )}
            
            <div className="relative z-10">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md ${action.isPlanned ? 'grayscale hover:grayscale-0' : ''}`}>
                <Icon name={action.iconName} variant={action.iconVariant} className="w-8 h-8 text-white" />
              </div>

              <h3 className="font-serif-tc font-bold text-text-primary mb-2 group-hover:text-warm-gold transition-colors">
                {action.title}
              </h3>

              <p className="font-sans-tc text-sm text-text-secondary leading-relaxed">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      

      {/* 底部說明文字 */}
      <div className="mt-6 text-center">
        <p className="font-sans-tc text-sm text-text-secondary/60">
          選擇功能開始您的創作之旅
        </p>
      </div>
    </div>
  );
};

export default QuickActions;