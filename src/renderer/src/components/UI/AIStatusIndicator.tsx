import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';

interface AIStatusIndicatorProps {
  className?: string;
}

const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<{
    available: boolean;
    modelCount: number;
    loading: boolean;
  }>({
    available: false,
    modelCount: 0,
    loading: true,
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setStatus(prev => ({ ...prev, loading: true }));
        
        const [serviceAvailable, models] = await Promise.all([
          window.electronAPI.ai.checkOllamaService(),
          window.electronAPI.ai.listModels(),
        ]);

        setStatus({
          available: serviceAvailable,
          modelCount: models.length,
          loading: false,
        });
      } catch (error) {
        console.error('檢查 AI 狀態失敗:', error);
        setStatus({
          available: false,
          modelCount: 0,
          loading: false,
        });
      }
    };

    checkStatus();
    
    // 每 30 秒檢查一次狀態
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (status.loading) {
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
          status.available ? 'bg-green-500' : 'bg-red-500'
        }`}
      ></div>
      <span className="text-xs text-gray-400">
        {status.available 
          ? `AI 可用 (${status.modelCount} 個模型)`
          : 'AI 不可用'
        }
      </span>
    </div>
  );
};

export default AIStatusIndicator;