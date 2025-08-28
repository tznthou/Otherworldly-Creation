// 教學管理 Hook
import { useState, useEffect, useCallback } from 'react';

const TUTORIAL_STORAGE_KEY = 'visualCreation_tutorialCompleted';

interface Project {
  id: string;
  name: string;
}

export const useTutorialManager = (currentProject: Project | null) => {
  const [showTutorial, setShowTutorial] = useState(false);

  // 檢查是否首次使用
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!hasSeenTutorial && currentProject) {
      setShowTutorial(true);
    }
  }, [currentProject]);

  // 完成教學
  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setShowTutorial(false);
  }, []);

  // 跳過教學
  const handleTutorialSkip = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setShowTutorial(false);
  }, []);

  // 重置教學（供開發或用戶重新查看）
  const resetTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setShowTutorial(true);
  }, []);

  return {
    showTutorial,
    handleTutorialComplete,
    handleTutorialSkip,
    resetTutorial,
  };
};