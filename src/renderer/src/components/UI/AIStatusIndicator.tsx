import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';

interface AIStatusIndicatorProps {
  className?: string;
}

const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const { isOllamaConnected, availableModels } = useAppSelector(state => state.ai);
  
  // 初始載入狀態：如果 Redux 中沒有檢查過，顯示載入狀態
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // 簡單的初始化標記，避免永遠顯示載入中
    const timer = setTimeout(() => {
      setHasInitialized(true);
    }, 3000); // 3 秒後認為已初始化
    
    return () => clearTimeout(timer);
  }, []);

  const isLoading = !hasInitialized && !isOllamaConnected && availableModels.length === 0;

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
        <span className="text-xs text-gray-400">檢查中...</span>
      </div>
    );
  }

  const handleClick = () => {
    dispatch(openModal('aiSettings'));
  };

  return (
    <div 
      className={`flex items-center cursor-pointer hover:bg-cosmic-700 rounded px-2 py-1 transition-colors ${className}`}
      onClick={handleClick}
      title="點擊打開 AI 設定"
    >
      <div 
        className={`w-2 h-2 rounded-full mr-2 ${
          isOllamaConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      ></div>
      <span className="text-xs text-gray-400">
        {isOllamaConnected 
          ? `AI 可用 (${availableModels.length} 個模型)`
          : 'AI 不可用'
        }
      </span>
    </div>
  );
};

export default AIStatusIndicator;