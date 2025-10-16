import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CosmicButton from '../UI/CosmicButton';

interface QuickTip {
  id: string;
  title: string;
  content: string;
  route?: string;
  element?: string;
  showOnce?: boolean;
}

const quickTips: QuickTip[] = [
  {
    id: 'dashboard-welcome',
    title: '歡迎使用創世紀元！',
    content: '這裡是您的專案儀表板。點擊「創建新專案」開始您的創作之旅，或選擇現有專案繼續寫作。',
    route: '/',
    showOnce: true
  },
  {
    id: 'editor-autosave',
    title: '自動儲存功能',
    content: '您的作品會每 3 秒自動儲存一次，無需擔心資料遺失。右下角會顯示儲存狀態。',
    route: '/project',
    showOnce: true
  },
  {
    id: 'ai-first-use',
    title: 'AI 續寫功能',
    content: '點擊工具欄的 AI 按鈕可以獲得續寫建議。AI 會根據您的故事內容和角色設定提供個性化建議。',
    route: '/project',
    element: '[data-tutorial="ai-panel-btn"]',
    showOnce: true
  },
  {
    id: 'character-importance',
    title: '角色設定很重要',
    content: '詳細的角色設定能讓 AI 生成更符合角色性格的對話和行為。建議為主要角色添加完整的背景資訊。',
    route: '/characters',
    showOnce: true
  }
];

interface QuickHelpProps {
  className?: string;
}

export const QuickHelp: React.FC<QuickHelpProps> = ({ className = '' }) => {
  const [currentTip, setCurrentTip] = useState<QuickTip | null>(null);
  const [shownTips, setShownTips] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // 載入已顯示的提示記錄
    const shown = localStorage.getItem('shown-quick-tips');
    if (shown) {
      setShownTips(JSON.parse(shown));
    }
  }, []);

  useEffect(() => {
    // 根據當前路由顯示相應的提示
    const relevantTips = quickTips.filter(tip => {
      if (tip.showOnce && shownTips.includes(tip.id)) {
        return false;
      }
      
      if (tip.route) {
        return location.pathname.startsWith(tip.route);
      }
      
      return true;
    });

    if (relevantTips.length > 0) {
      // 隨機選擇一個提示，或選擇第一個
      const tip = relevantTips[0];
      
      // 如果有指定元素，檢查元素是否存在
      if (tip.element) {
        const element = document.querySelector(tip.element);
        if (!element) return;
      }
      
      setCurrentTip(tip);
      setIsVisible(true);
    }
  }, [location.pathname, shownTips]);

  const handleClose = () => {
    setIsVisible(false);
    
    if (currentTip) {
      // 記錄已顯示的提示
      const updated = [...shownTips, currentTip.id];
      setShownTips(updated);
      localStorage.setItem('shown-quick-tips', JSON.stringify(updated));
    }
    
    setTimeout(() => setCurrentTip(null), 300);
  };

  const handleDismissAll = () => {
    const allTipIds = quickTips.map(tip => tip.id);
    setShownTips(allTipIds);
    localStorage.setItem('shown-quick-tips', JSON.stringify(allTipIds));
    handleClose();
  };


  if (!currentTip || !isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-40 max-w-sm ${className}`}>
      <div className={`
        bg-bg-dark/95 backdrop-blur-sm border border-warm-gold/30 rounded-lg shadow-2xl p-4
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
      `}>
        {/* 標題 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="text-lg">💡</div>
            <h4 className="font-semibold text-warm-gold text-sm">
              {currentTip.title}
            </h4>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 -mt-1 -mr-1"
            title="關閉提示"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容 */}
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          {currentTip.content}
        </p>

        {/* 操作按鈕 */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleDismissAll}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            不再顯示提示
          </button>
          
          <div className="flex space-x-2">
            <CosmicButton
              size="small"
              variant="secondary"
              onClick={handleClose}
            >
              知道了
            </CosmicButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// 管理快速幫助的 Hook
export const useQuickHelp = () => {
  const resetAllTips = () => {
    localStorage.removeItem('shown-quick-tips');
    window.location.reload(); // 重新載入頁面以重新顯示提示
  };

  const addCustomTip = (tip: QuickTip) => {
    // 可以用來動態添加自定義提示
    quickTips.push(tip);
  };

  return {
    resetAllTips,
    addCustomTip
  };
};

export default QuickHelp;