import React from 'react';

interface HumanBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

const HumanBackground: React.FC<HumanBackgroundProps> = ({
  intensity = 'medium',
  className = '',
}) => {
  const getGlowOpacity = () => {
    switch (intensity) {
      case 'low': return 0.03;
      case 'medium': return 0.05;
      case 'high': return 0.08;
      default: return 0.05;
    }
  };

  const glowOpacity = getGlowOpacity();

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* 深色背景 */}
      <div className="absolute inset-0 bg-bg-dark" />

      {/* 溫和光暈裝飾（極淡，營造深夜書房氛圍） */}
      <div
        className="absolute top-20 left-10 w-96 h-96 bg-warm-gold rounded-full blur-3xl animate-float-slow"
        style={{ opacity: glowOpacity }}
      />

      <div
        className="absolute bottom-20 right-10 w-80 h-80 bg-clay-orange rounded-full blur-3xl animate-float-slow"
        style={{
          opacity: glowOpacity * 0.8,
          animationDelay: '3s'
        }}
      />

      {/* 高強度時添加額外光暈 */}
      {intensity === 'high' && (
        <>
          <div
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-wood-brown rounded-full blur-3xl animate-float-slow"
            style={{
              opacity: glowOpacity * 0.6,
              animationDelay: '6s',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </>
      )}

      {/* 紙張質感（極微弱的漸層） */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(212, 165, 116, ${glowOpacity * 0.5}) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(193, 125, 90, ${glowOpacity * 0.3}) 0%, transparent 50%)
          `
        }}
      />
    </div>
  );
};

export default HumanBackground;
