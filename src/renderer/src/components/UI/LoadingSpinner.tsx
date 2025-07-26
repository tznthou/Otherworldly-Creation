import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'gold' | 'mystic' | 'cosmic';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'gold',
  text,
  className = '',
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  const colorClasses = {
    gold: 'border-gold-500',
    mystic: 'border-mystic-500',
    cosmic: 'border-cosmic-500',
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* 魔法陣載入動畫 */}
      <div className="relative">
        {/* 外圈 */}
        <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`} />
        
        {/* 內圈 */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
          size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-8 h-8' : 'w-12 h-12'
        } border ${colorClasses[color]} border-b-transparent rounded-full animate-spin`} 
        style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        
        {/* 中心點 */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
          size === 'small' ? 'w-1 h-1' : size === 'medium' ? 'w-2 h-2' : 'w-3 h-3'
        } bg-${color}-500 rounded-full animate-pulse`} />
      </div>

      {/* 載入文字 */}
      {text && (
        <div className={`text-${color}-500 font-cosmic ${textSizeClasses[size]} animate-pulse`}>
          {text}
        </div>
      )}

      {/* 載入點動畫 */}
      <div className="flex space-x-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 bg-${color}-500 rounded-full animate-bounce`}
            style={{ animationDelay: `${index * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingSpinner;