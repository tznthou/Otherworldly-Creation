import React, { useState } from 'react';
import ParticleEffect from './ParticleEffect';

interface CosmicButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'magic';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  glowEffect?: boolean;
  particleEffect?: boolean;
}

const CosmicButton: React.FC<CosmicButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  glowEffect = false,
  particleEffect = false,
}) => {
  const [showParticles, setShowParticles] = useState(false);

  const baseClasses = 'relative font-medium rounded-lg transition-all duration-200 active:scale-95 overflow-hidden';
  
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-2 text-base',
    large: 'px-8 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-cosmic-950 shadow-lg hover:shadow-gold-500/25',
    secondary: 'bg-cosmic-800 hover:bg-cosmic-700 text-white border border-cosmic-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    magic: 'bg-gradient-to-r from-mystic-600 to-mystic-700 hover:from-mystic-700 hover:to-mystic-800 text-white shadow-lg hover:shadow-mystic-500/25',
  };

  const glowClasses = glowEffect ? {
    primary: 'glow-effect hover:shadow-gold-500/50',
    secondary: 'hover:shadow-cosmic-500/30',
    danger: 'hover:shadow-red-500/30',
    magic: 'hover:shadow-mystic-500/50',
  } : {};

  const handleClick = () => {
    if (disabled || loading) return;
    
    if (particleEffect) {
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 1000);
    }
    
    onClick?.();
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${glowClasses[variant] || ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {/* 背景光效 */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      
      {/* 粒子效果 */}
      {particleEffect && showParticles && (
        <ParticleEffect
          particleCount={20}
          color={variant === 'primary' ? '#FFD700' : variant === 'magic' ? '#A855F7' : '#6366F1'}
          trigger={showParticles}
        />
      )}
      
      {/* 按鈕內容 */}
      <span className="relative z-10 flex items-center justify-center space-x-2">
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        <span>{children}</span>
      </span>
      
      {/* 魔法邊框效果 */}
      {variant === 'magic' && (
        <div className="absolute inset-0 rounded-lg border border-mystic-400/50 animate-pulse" />
      )}
    </button>
  );
};

export default CosmicButton;