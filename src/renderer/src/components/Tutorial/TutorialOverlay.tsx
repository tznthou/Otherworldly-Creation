import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CosmicButton from '../UI/CosmicButton';
import { useNotification } from '../UI/NotificationSystem';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS 選擇器
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
  skipable?: boolean;
  highlight?: boolean;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentStepIndex?: number;
  onStepChange?: (index: number) => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  isActive,
  onComplete,
  onSkip,
  currentStepIndex = 0,
  onStepChange
}) => {
  const [currentStep, setCurrentStep] = useState(currentStepIndex);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const notification = useNotification();

  const currentStepData = steps[currentStep];

  // 更新提示框位置
  const updateTooltipPosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    
    let x = 0;
    let y = 0;

    switch (currentStepData.position) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top - (tooltipRect?.height || 0) - 20;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom + 20;
        break;
      case 'left':
        x = rect.left - (tooltipRect?.width || 0) - 20;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + 20;
        y = rect.top + rect.height / 2;
        break;
      default:
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
    }

    // 確保提示框在視窗範圍內
    x = Math.max(20, Math.min(x, window.innerWidth - (tooltipRect?.width || 0) - 20));
    y = Math.max(20, Math.min(y, window.innerHeight - (tooltipRect?.height || 0) - 20));

    setTooltipPosition({ x, y });
  }, [currentStepData.position]);

  // 更新目標元素和位置
  useEffect(() => {
    if (!isActive || !currentStepData?.target) {
      setTargetElement(null);
      return;
    }

    const element = document.querySelector(currentStepData.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      updateTooltipPosition(element);
      
      // 滾動到目標元素
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }
  }, [currentStep, isActive, currentStepData, updateTooltipPosition]);

  // 處理下一步
  const handleNext = () => {
    if (currentStepData.action) {
      currentStepData.action();
    }

    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
    } else {
      handleComplete();
    }
  };

  // 處理上一步
  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep);
    }
  };

  // 完成教學
  const handleComplete = () => {
    notification.success('教學完成', '恭喜您完成了新手引導！');
    onComplete();
  };

  // 跳過教學
  const handleSkip = () => {
    notification.info('已跳過教學', '您可以隨時在設定中重新開啟教學');
    onSkip();
  };

  if (!isActive || !currentStepData) {
    return null;
  }

  const overlayContent = (
    <>
      {/* 遮罩層 */}
      <div className="fixed inset-0 bg-black/70 z-50 transition-opacity duration-300">
        {/* 高亮區域 */}
        {targetElement && currentStepData.highlight && (
          <div
            className="absolute border-4 border-gold-400 rounded-lg shadow-lg shadow-gold-400/50 animate-pulse-glow"
            style={{
              left: targetElement.getBoundingClientRect().left - 8,
              top: targetElement.getBoundingClientRect().top - 8,
              width: targetElement.getBoundingClientRect().width + 16,
              height: targetElement.getBoundingClientRect().height + 16,
              pointerEvents: 'none'
            }}
          />
        )}
      </div>

      {/* 教學提示框 */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-cosmic-900/95 backdrop-blur-sm border border-gold-500/30 rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300"
        style={{
          left: currentStepData.position === 'center' ? '50%' : tooltipPosition.x,
          top: currentStepData.position === 'center' ? '50%' : tooltipPosition.y,
          transform: currentStepData.position === 'center' ? 'translate(-50%, -50%)' : 
                    currentStepData.position === 'top' || currentStepData.position === 'bottom' ? 'translateX(-50%)' :
                    currentStepData.position === 'left' || currentStepData.position === 'right' ? 'translateY(-50%)' : 'none'
        }}
      >
        {/* 箭頭指示器 */}
        {targetElement && currentStepData.position !== 'center' && (
          <div
            className={`absolute w-0 h-0 border-8 ${
              currentStepData.position === 'top' ? 'border-t-cosmic-900 border-x-transparent border-b-transparent top-full left-1/2 -translate-x-1/2' :
              currentStepData.position === 'bottom' ? 'border-b-cosmic-900 border-x-transparent border-t-transparent bottom-full left-1/2 -translate-x-1/2' :
              currentStepData.position === 'left' ? 'border-l-cosmic-900 border-y-transparent border-r-transparent left-full top-1/2 -translate-y-1/2' :
              'border-r-cosmic-900 border-y-transparent border-l-transparent right-full top-1/2 -translate-y-1/2'
            }`}
          />
        )}

        <div className="p-6">
          {/* 標題和進度 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-cosmic text-gold-400">
              {currentStepData.title}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>{currentStep + 1}</span>
              <span>/</span>
              <span>{steps.length}</span>
            </div>
          </div>

          {/* 進度條 */}
          <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
            <div 
              className="bg-gradient-to-r from-gold-500 to-gold-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* 內容 */}
          <div className="text-gray-300 text-sm leading-relaxed mb-6">
            {currentStepData.content}
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <CosmicButton
                  variant="secondary"
                  size="small"
                  onClick={handlePrevious}
                >
                  上一步
                </CosmicButton>
              )}
            </div>

            <div className="flex space-x-2">
              {currentStepData.skipable !== false && (
                <CosmicButton
                  variant="secondary"
                  size="small"
                  onClick={handleSkip}
                >
                  跳過教學
                </CosmicButton>
              )}
              
              <CosmicButton
                variant="primary"
                size="small"
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? '完成' : '下一步'}
              </CosmicButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(overlayContent, document.body);
};

// 教學管理 Hook
export const useTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTutorialId, setCurrentTutorialId] = useState<string | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  useEffect(() => {
    // 從 localStorage 載入已完成的教學
    const completed = localStorage.getItem('completed-tutorials');
    if (completed) {
      setCompletedTutorials(JSON.parse(completed));
    }
  }, []);

  const startTutorial = (tutorialId: string) => {
    setCurrentTutorialId(tutorialId);
    setCurrentStep(0);
    setIsActive(true);
  };

  const completeTutorial = (tutorialId: string) => {
    const updated = [...completedTutorials, tutorialId];
    setCompletedTutorials(updated);
    localStorage.setItem('completed-tutorials', JSON.stringify(updated));
    setIsActive(false);
    setCurrentTutorialId(null);
  };

  const skipTutorial = (tutorialId: string) => {
    const updated = [...completedTutorials, tutorialId];
    setCompletedTutorials(updated);
    localStorage.setItem('completed-tutorials', JSON.stringify(updated));
    setIsActive(false);
    setCurrentTutorialId(null);
  };

  const resetTutorials = () => {
    setCompletedTutorials([]);
    localStorage.removeItem('completed-tutorials');
  };

  const isTutorialCompleted = (tutorialId: string) => {
    return completedTutorials.includes(tutorialId);
  };

  return {
    isActive,
    currentStep,
    currentTutorialId,
    setCurrentStep,
    startTutorial,
    completeTutorial,
    skipTutorial,
    resetTutorials,
    isTutorialCompleted
  };
};

export default TutorialOverlay;