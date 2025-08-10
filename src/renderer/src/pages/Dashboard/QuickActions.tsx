import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';
import { useNavigate } from 'react-router-dom';

const QuickActions: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { modals: _modals } = useAppSelector(state => state.ui);

  const actions = [
    {
      id: 'create-project',
      title: '🌟 創世神模式',
      description: '創建新的異世界創作專案',
      icon: '📝',
      color: 'from-gold-500 to-gold-600',
      action: () => {
        dispatch(openModal('createProject'));
      },
    },
    {
      id: 'character-manager',
      title: '⚔️ 英靈召喚',
      description: 'AI 輔助角色創造與管理',
      icon: '👥',
      color: 'from-purple-500 to-purple-600',
      action: () => {
        dispatch(openModal('selectProjectForCharacters'));
      },
    },
    {
      id: 'template-manager',
      title: '🎭 輕小說模板',
      description: '異世界、校園、科幻、奇幻模板',
      icon: '📚',
      color: 'from-mystic-500 to-mystic-600',
      action: () => {
        dispatch(openModal('templateManager'));
      },
    },
    {
      id: 'ai-writing',
      title: '🔮 預言書寫',
      description: '智能續寫與劇情建議',
      icon: '🤖',
      color: 'from-cyan-500 to-cyan-600',
      action: () => {
        dispatch(openModal('aiSettings'));
      },
    },
    {
      id: 'data-management',
      title: '💾 資料管理',
      description: '備份、還原、匯入專案與資料庫維護',
      icon: '🛠️',
      color: 'from-green-500 to-green-600',
      action: () => {
        dispatch(openModal('backupManager'));
      },
    },
    {
      id: 'settings',
      title: '⚙️ 系統設定',
      description: '配置 AI 引擎和應用程式設定',
      icon: '⚙️',
      color: 'from-gray-500 to-gray-600',
      action: () => {
        navigate('/settings');
      },
    },
    {
      id: 'help',
      title: '❓ 使用說明',
      description: '查看使用教學和常見問題',
      icon: '❓',
      color: 'from-indigo-500 to-indigo-600',
      action: () => {
        dispatch(openModal('helpCenter'));
      },
    },

    {
      id: 'writing-stats',
      title: '📊 創作統計',
      description: '查看寫作進度和統計數據',
      icon: '📊',
      color: 'from-violet-500 to-violet-600',
      action: () => {
        navigate('/statistics');
      },
    },

    // 規劃中功能 - 來自 README.md
    {
      id: 'ai-illustration',
      title: '🎨 幻想具現',
      description: 'AI 插畫生成 - 角色插畫、場景插畫、封面設計',
      icon: '🖼️',
      color: 'from-pink-500 to-rose-600',
      isPlanned: true, // 標記為規劃中功能
      action: () => {
        // TODO: 實現 AI 插畫生成功能
        alert(`功能開發中：AI 插畫生成系統即將推出！

✨ 計劃功能：
• 角色插畫生成
• 場景插畫創作
• 專業封面設計`);
      },
    },
    {
      id: 'ebook-generation',
      title: '📚 傳說編纂',
      description: '一鍵生成專業電子書 - EPUB 生成、排版優化、封面設計（建議優先）',
      icon: '📖',
      color: 'from-emerald-500 to-teal-600',
      isPlanned: false, // 功能已實現，移除規劃中標記
      action: () => {
        dispatch(openModal('epubGeneration'));
      },
    },
    {
      id: 'pdf-generation',
      title: '📄 文檔轉換', 
      description: '專業 PDF 文檔生成 - 自定義排版、字體選擇、頁面設計（檔案較大）',
      icon: '📄',
      color: 'from-orange-500 to-red-600',
      isPlanned: false, // 功能已實現
      action: () => {
        dispatch(openModal('pdfGeneration'));
      },
    },
    {
      id: 'advanced-ai',
      title: '🧠 進階 AI 功能',
      description: '高級創作輔助 - 劇情分析、角色一致性檢查、創意建議',
      icon: '🔬',
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
      <h2 className="text-xl font-cosmic text-gold-500 mb-6">✨ 創世紀元功能大全 ✨</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`card card-hover group text-left p-4 transition-all duration-200 hover:scale-105 active:scale-95 relative overflow-hidden ${action.isPlanned ? 'opacity-75 hover:opacity-90' : ''}`}
            data-tutorial={action.id === 'create-project' ? 'create-project-btn' : undefined}
          >
            {/* 背景魔法效果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-cosmic-800/50 via-cosmic-700/30 to-cosmic-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 規劃中功能標記 */}
            {action.isPlanned && (
              <div className="absolute top-2 right-2 z-20">
                <div className="bg-orange-500/90 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                  開發中
                </div>
              </div>
            )}
            
            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg ${action.isPlanned ? 'grayscale hover:grayscale-0' : ''}`}>
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