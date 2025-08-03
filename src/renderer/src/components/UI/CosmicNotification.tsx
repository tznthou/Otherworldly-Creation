import React, { useEffect, useState, useCallback } from 'react';

interface CosmicNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'magic';
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
  className?: string;
}

const CosmicNotification: React.FC<CosmicNotificationProps> = ({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 進入動畫
    setTimeout(() => setIsVisible(true), 100);

    // 自動關閉
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const typeConfig = {
    success: {
      icon: '✨',
      bgColor: 'bg-green-900/80',
      borderColor: 'border-green-500',
      textColor: 'text-green-400',
      glowColor: 'shadow-green-500/20',
    },
    error: {
      icon: '⚠️',
      bgColor: 'bg-red-900/80',
      borderColor: 'border-red-500',
      textColor: 'text-red-400',
      glowColor: 'shadow-red-500/20',
    },
    warning: {
      icon: '🔔',
      bgColor: 'bg-yellow-900/80',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-400',
      glowColor: 'shadow-yellow-500/20',
    },
    info: {
      icon: 'ℹ️',
      bgColor: 'bg-blue-900/80',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-400',
      glowColor: 'shadow-blue-500/20',
    },
    magic: {
      icon: '🔮',
      bgColor: 'bg-mystic-900/80',
      borderColor: 'border-mystic-500',
      textColor: 'text-mystic-400',
      glowColor: 'shadow-mystic-500/20',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        ${config.bgColor} ${config.borderColor} ${config.glowColor}
        backdrop-blur-sm border rounded-lg shadow-xl
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${className}
      `}
    >
      {/* 背景光效 */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      
      <div className="relative p-4">
        <div className="flex items-start space-x-3">
          {/* 圖標 */}
          <div className="flex-shrink-0">
            <span className="text-xl animate-bounce">{config.icon}</span>
          </div>
          
          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium ${config.textColor} font-cosmic`}>
              {title}
            </h4>
            {message && (
              <p className="mt-1 text-sm text-gray-300">
                {message}
              </p>
            )}
          </div>
          
          {/* 關閉按鈕 */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <span className="sr-only">關閉</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 進度條 */}
        <div className="mt-3 w-full bg-cosmic-700 rounded-full h-1">
          <div 
            className={`h-1 rounded-full bg-gradient-to-r ${
              type === 'success' ? 'from-green-500 to-green-600' :
              type === 'error' ? 'from-red-500 to-red-600' :
              type === 'warning' ? 'from-yellow-500 to-yellow-600' :
              type === 'info' ? 'from-blue-500 to-blue-600' :
              'from-mystic-500 to-mystic-600'
            }`}
            style={{
              animation: `shrink ${duration}ms linear`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CosmicNotification;