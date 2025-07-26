import React from 'react';

interface MagicCircleProps {
  size?: 'small' | 'medium' | 'large';
  position?: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
  opacity?: number;
  rotationSpeed?: 'slow' | 'normal' | 'fast';
  color?: 'gold' | 'mystic' | 'cosmic';
  className?: string;
}

const MagicCircle: React.FC<MagicCircleProps> = ({
  size = 'medium',
  position = { top: '20%', left: '20%' },
  opacity = 0.1,
  rotationSpeed = 'normal',
  color = 'gold',
  className = '',
}) => {
  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-64 h-64',
    large: 'w-96 h-96',
  };

  const speedClasses = {
    slow: 'animate-[magic-circle_30s_linear_infinite]',
    normal: 'animate-[magic-circle_20s_linear_infinite]',
    fast: 'animate-[magic-circle_10s_linear_infinite]',
  };

  const colorClasses = {
    gold: 'border-gold-500',
    mystic: 'border-mystic-500',
    cosmic: 'border-cosmic-500',
  };

  const positionStyle = {
    top: position.top,
    left: position.left,
    right: position.right,
    bottom: position.bottom,
  };

  return (
    <div
      className={`absolute pointer-events-none ${sizeClasses[size]} ${speedClasses[rotationSpeed]} ${className}`}
      style={{ ...positionStyle, opacity }}
    >
      {/* 外圈 */}
      <div className={`w-full h-full border-2 ${colorClasses[color]} rounded-full relative`}>
        {/* 內圈 */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border ${colorClasses[color]} rounded-full`}>
          {/* 中心圈 */}
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 border ${colorClasses[color]} rounded-full`}>
            {/* 核心點 */}
            <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-${color}-500 rounded-full`} />
          </div>
        </div>

        {/* 魔法符文 */}
        <div className="absolute inset-0">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className={`absolute w-1 h-4 bg-${color}-500 rounded-full`}
              style={{
                top: '10%',
                left: '50%',
                transformOrigin: '50% 200%',
                transform: `translateX(-50%) rotate(${index * 45}deg)`,
              }}
            />
          ))}
        </div>

        {/* 外圍符文 */}
        <div className="absolute inset-0">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className={`absolute w-0.5 h-2 bg-${color}-500 rounded-full`}
              style={{
                top: '5%',
                left: '50%',
                transformOrigin: '50% 400%',
                transform: `translateX(-50%) rotate(${index * 30}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MagicCircle;