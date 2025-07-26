import React, { useState } from 'react';
import { HelpCircle, Book, Zap, MessageCircle } from 'lucide-react';
import HelpCenter from './HelpCenter';
import UserManual from './UserManual';
import QuickStartGuide from './QuickStartGuide';
import { useTutorial } from '../Tutorial/TutorialOverlay';

interface HelpSystemProps {
  className?: string;
}

const HelpSystem: React.FC<HelpSystemProps> = ({ className }) => {
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showUserManual, setShowUserManual] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { startTutorial } = useTutorial();

  const helpOptions = [
    {
      id: 'quickstart',
      label: '快速入門',
      icon: <Zap className="w-4 h-4" />,
      description: '5 分鐘快速上手',
      onClick: () => setShowQuickStart(true)
    },
    {
      id: 'manual',
      label: '使用手冊',
      icon: <Book className="w-4 h-4" />,
      description: '詳細功能說明',
      onClick: () => setShowUserManual(true)
    },
    {
      id: 'tutorials',
      label: '教學指南',
      icon: <HelpCircle className="w-4 h-4" />,
      description: '互動式教學',
      onClick: () => setShowHelpCenter(true)
    },
    {
      id: 'faq',
      label: '常見問題',
      icon: <MessageCircle className="w-4 h-4" />,
      description: '問題解答',
      onClick: () => {
        setShowHelpCenter(true);
        // 這裡可以設置 HelpCenter 的默認標籤頁為 FAQ
      }
    }
  ];

  const handleOptionClick = (option: typeof helpOptions[0]) => {
    option.onClick();
    setShowDropdown(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 幫助按鈕 */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-2 bg-cosmic-800 hover:bg-cosmic-700 border border-cosmic-600 rounded-lg text-white transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
        <span>幫助</span>
      </button>

      {/* 下拉選單 */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-cosmic-900 border border-cosmic-600 rounded-lg shadow-xl z-50">
          <div className="p-2">
            <div className="text-xs text-gray-400 px-2 py-1 border-b border-cosmic-700 mb-2">
              選擇幫助類型
            </div>
            {helpOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-cosmic-800 rounded-lg text-white transition-colors"
              >
                <div className="text-gold-400">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 點擊外部關閉下拉選單 */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* 各種幫助組件 */}
      <HelpCenter
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
      />

      <UserManual
        isOpen={showUserManual}
        onClose={() => setShowUserManual(false)}
      />

      <QuickStartGuide
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        onStartTutorial={(tutorialId) => {
          setShowQuickStart(false);
          startTutorial(tutorialId);
        }}
      />
    </div>
  );
};

// 簡化版本的幫助按鈕，只顯示幫助中心
export const SimpleHelpButton: React.FC<{ className?: string }> = ({ className }) => {
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  return (
    <div className={className}>
      <button
        onClick={() => setShowHelpCenter(true)}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        title="打開幫助中心"
      >
        <HelpCircle className="w-4 h-4" />
        <span>幫助</span>
      </button>

      <HelpCenter
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
      />
    </div>
  );
};

// 只有圖標的幫助按鈕
export const IconHelpButton: React.FC<{ className?: string }> = ({ className }) => {
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  return (
    <div className={className}>
      <button
        onClick={() => setShowHelpCenter(true)}
        className="p-2 bg-cosmic-800 hover:bg-cosmic-700 border border-cosmic-600 rounded-lg text-gold-400 hover:text-gold-300 transition-colors"
        title="打開幫助中心"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      <HelpCenter
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
      />
    </div>
  );
};

export default HelpSystem;