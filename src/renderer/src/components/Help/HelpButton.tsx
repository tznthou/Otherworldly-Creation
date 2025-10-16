import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import HelpCenter from './HelpCenter';
import FeatureShowcase from './FeatureShowcase';
import { useTutorial } from '../Tutorial/TutorialOverlay';
import { tutorialIndex } from '../../data/tutorialSteps';
import { useNotification } from '../UI/NotificationSystem';

interface HelpButtonProps {
  variant?: 'floating' | 'inline';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  variant = 'floating',
  size = 'medium',
  className = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showFeatureShowcase, setShowFeatureShowcase] = useState(false);
  
  const { startTutorial } = useTutorial();
  const notification = useNotification();
  const location = useLocation();

  const sizeClasses = {
    small: 'w-10 h-10 text-sm',
    medium: 'w-12 h-12 text-base',
    large: 'w-14 h-14 text-lg'
  };

  // 根據當前頁面決定可用的教學
  const getAvailableTutorials = () => {
    const allTutorials = Object.entries(tutorialIndex);
    
    // 根據路由過濾可用的教學
    if (location.pathname.includes('/project/')) {
      // 在專案編輯器頁面，顯示編輯器教學
      return allTutorials.filter(([id]) => id === 'editor' || id === 'ai');
    } else if (location.pathname.includes('/characters/')) {
      // 在角色管理頁面，顯示角色管理教學
      return allTutorials.filter(([id]) => id === 'character');
    } else {
      // 在首頁顯示所有教學
      return allTutorials;
    }
  };

  const handleQuickStart = () => {
    startTutorial('first-time');
    setShowMenu(false);
    notification.info('快速入門', '正在開始新手教學');
  };

  const menuItems = [
    {
      id: 'quick-start',
      label: '快速入門',
      icon: '🚀',
      description: '新手教學指南',
      action: handleQuickStart
    },
    {
      id: 'features',
      label: '功能介紹',
      icon: '🌟',
      description: '了解所有功能',
      action: () => {
        setShowFeatureShowcase(true);
        setShowMenu(false);
      }
    },
    {
      id: 'help-center',
      label: '幫助中心',
      icon: '📚',
      description: '教學和常見問題',
      action: () => {
        setShowHelpCenter(true);
        setShowMenu(false);
      }
    },
    {
      id: 'tutorials',
      label: '互動教學',
      icon: '🎓',
      description: '分步驟學習指南',
      submenu: getAvailableTutorials().map(([id, tutorial]) => ({
        id,
        label: tutorial.title,
        action: () => {
          startTutorial(id);
          setShowMenu(false);
          notification.info('教學開始', `正在開始「${tutorial.title}」教學`);
        }
      }))
    }
  ];

  if (variant === 'floating') {
    return (
      <>
        {/* 浮動幫助按鈕 */}
        <div className={`fixed bottom-20 right-4 z-30 ${className}`}>
          <div className="relative">
            {/* 主按鈕 */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`
                ${sizeClasses[size]}
                bg-gradient-to-r from-gold-500 to-gold-600 
                hover:from-gold-600 hover:to-gold-700
                text-white rounded-full shadow-lg hover:shadow-xl
                transition-all duration-300 transform hover:scale-110
                flex items-center justify-center
                animate-pulse-glow
              `}
              title="幫助"
            >
              <span className="text-xl">❓</span>
            </button>

            {/* 選單 */}
            {showMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-bg-dark/95 backdrop-blur-sm border border-warm-gold/30 rounded-lg shadow-2xl overflow-hidden">
                <div className="p-3 border-b border-warm-gold/10">
                  <h3 className="text-warm-gold font-semibold text-sm">需要幫助嗎？</h3>
                </div>
                
                <div className="py-2">
                  {menuItems.map((item) => (
                    <div key={item.id}>
                      {item.submenu ? (
                        <div className="group relative">
                          <div className="px-4 py-2 text-white hover:bg-bg-light/50 backdrop-blur-sm/50 cursor-pointer flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span>{item.icon}</span>
                              <div>
                                <div className="text-sm font-medium">{item.label}</div>
                                <div className="text-xs text-gray-400">{item.description}</div>
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          
                          {/* 子選單 */}
                          <div className="absolute left-full top-0 ml-1 w-48 bg-bg-dark/95 backdrop-blur-sm border border-warm-gold/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="py-2">
                              {item.submenu.map((subItem) => (
                                <button
                                  key={subItem.id}
                                  onClick={subItem.action}
                                  className="w-full px-4 py-2 text-left text-white hover:bg-bg-light/50 backdrop-blur-sm/50 transition-colors"
                                >
                                  <div className="text-sm">{subItem.label}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={item.action}
                          className="w-full px-4 py-2 text-left text-white hover:bg-bg-light/50 backdrop-blur-sm/50 transition-colors flex items-center space-x-3"
                        >
                          <span>{item.icon}</span>
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-xs text-gray-400">{item.description}</div>
                          </div>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 點擊外部關閉選單 */}
        {showMenu && (
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
        )}

        {/* 幫助中心模態框 */}
        <HelpCenter
          isOpen={showHelpCenter}
          onClose={() => setShowHelpCenter(false)}
        />

        {/* 功能介紹模態框 */}
        <FeatureShowcase
          isOpen={showFeatureShowcase}
          onClose={() => setShowFeatureShowcase(false)}
        />
      </>
    );
  }

  // 內聯版本
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`
          ${sizeClasses[size]}
          bg-bg-light/50 backdrop-blur-sm hover:bg-bg-dark/80 
          text-warm-gold hover:text-warm-gold
          border border-warm-gold/10 hover:border-warm-gold
          rounded-lg transition-all duration-200
          flex items-center justify-center
        `}
        title="幫助"
      >
        <span>❓</span>
      </button>

      {showMenu && (
        <>
          <div className="absolute top-full left-0 mt-2 w-64 bg-bg-dark/95 backdrop-blur-sm border border-warm-gold/30 rounded-lg shadow-2xl z-50">
            <div className="p-3 border-b border-warm-gold/10">
              <h3 className="text-warm-gold font-semibold text-sm">幫助選項</h3>
            </div>
            
            <div className="py-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full px-4 py-2 text-left text-white hover:bg-bg-light/50 backdrop-blur-sm/50 transition-colors flex items-center space-x-3"
                >
                  <span>{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
        </>
      )}

      <HelpCenter
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
      />

      <FeatureShowcase
        isOpen={showFeatureShowcase}
        onClose={() => setShowFeatureShowcase(false)}
      />
    </div>
  );
};

export default HelpButton;