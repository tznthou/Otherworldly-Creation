import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// import { GUIDANCE_TEXTS } from './guidanceTexts';

interface TutorialStep {
  id: number;
  title: string;
  content: string;
  targetSelector?: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

interface TutorialOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: '歡迎使用視覺創作中心！',
    content: '讓我們快速了解如何為您的角色創作精美插畫。這個教學只需要 2 分鐘。',
    position: 'center'
  },
  {
    id: 2,
    title: '步驟 1：選擇角色',
    content: '首先選擇要繪製的角色。您可以選擇 1-3 個角色進行批次生成。點擊角色卡片即可選擇，藍色邊框表示已選中。',
    position: 'center',
    action: '選擇您想要繪製的角色'
  },
  {
    id: 3,
    title: '步驟 2：設定場景',
    content: '選擇場景類型並描述具體情境。描述越詳細，生成效果越好！包含環境、動作、表情等細節。',
    position: 'center',
    action: '描述角色的場景和動作'
  },
  {
    id: 4,
    title: '步驟 3：生成圖片',
    content: '點擊「添加請求」將設定加入批次，然後點擊「生成」開始創作。您可以添加多個不同的場景設定。',
    position: 'center',
    action: '開始 AI 插畫生成'
  },
  {
    id: 5,
    title: '步驟 4：預覽和保存',
    content: '生成完成後，預覽結果並選擇滿意的圖片。您可以創建變體、繼續生成其他組合，或保存到圖庫。',
    position: 'center',
    action: '管理和保存您的作品'
  },
  {
    id: 6,
    title: '開始創作！',
    content: '教學完成！現在您已經了解基本流程。記住：角色和場景設定會在生成後保留，方便您繼續創作。',
    position: 'center'
  }
];

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isVisible,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible && currentStep < tutorialSteps.length) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const currentTutorial = tutorialSteps[currentStep];

  if (!isVisible || !currentTutorial) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* 教學內容 */}
      <div className={`
        relative bg-gradient-to-br from-cosmic-800 to-cosmic-900 
        border border-gold-500/30 rounded-2xl shadow-2xl
        max-w-lg mx-4 transform transition-all duration-300
        ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
      `}>
        {/* 頭部 */}
        <div className="p-6 border-b border-cosmic-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-cosmic text-gold-400 mb-1">
                {currentTutorial.title}
              </h2>
              <p className="text-sm text-cosmic-400">
                步驟 {currentStep + 1} / {tutorialSteps.length}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-cosmic-400 hover:text-white transition-colors text-sm"
            >
              跳過
            </button>
          </div>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <p className="text-white leading-relaxed mb-4">
            {currentTutorial.content}
          </p>

          {currentTutorial.action && (
            <div className="p-3 bg-gold-900/20 border border-gold-700/50 rounded-lg mb-4">
              <p className="text-gold-300 text-sm font-medium flex items-center">
                <span className="mr-2">💡</span>
                {currentTutorial.action}
              </p>
            </div>
          )}

          {/* 進度條 */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-cosmic-400 mb-2">
              <span>進度</span>
              <span>{Math.round(((currentStep + 1) / tutorialSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-cosmic-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-gold-500 to-gold-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 pt-0">
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 bg-cosmic-700 hover:bg-cosmic-600 disabled:bg-cosmic-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              上一步
            </button>
            
            <div className="flex gap-2">
              {currentStep < tutorialSteps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors font-medium"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={onComplete}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  開始創作！
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 裝飾性元素 */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-gold-500 rounded-full animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
    </div>,
    document.body
  );
};

export default TutorialOverlay;