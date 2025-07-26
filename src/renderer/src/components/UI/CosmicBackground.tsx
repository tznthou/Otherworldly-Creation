import React from 'react';
import StarField from './StarField';
import MagicCircle from './MagicCircle';

interface CosmicBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
  showMagicCircles?: boolean;
  showStars?: boolean;
  className?: string;
}

const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  intensity = 'medium',
  showMagicCircles = true,
  showStars = true,
  className = '',
}) => {
  const getStarCount = () => {
    switch (intensity) {
      case 'low': return 50;
      case 'medium': return 100;
      case 'high': return 200;
      default: return 100;
    }
  };

  const getMagicCircleOpacity = () => {
    switch (intensity) {
      case 'low': return 0.05;
      case 'medium': return 0.1;
      case 'high': return 0.15;
      default: return 0.1;
    }
  };

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* 漸層背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-cosmic-950 via-cosmic-900 to-cosmic-950" />
      
      {/* 星空背景 */}
      {showStars && <StarField starCount={getStarCount()} />}
      
      {/* 魔法陣效果 */}
      {showMagicCircles && (
        <>
          {/* 主要魔法陣 */}
          <MagicCircle
            size="large"
            position={{ top: '10%', left: '15%' }}
            opacity={getMagicCircleOpacity()}
            rotationSpeed="slow"
            color="gold"
          />
          
          <MagicCircle
            size="medium"
            position={{ top: '60%', right: '20%' }}
            opacity={getMagicCircleOpacity() * 0.8}
            rotationSpeed="normal"
            color="mystic"
          />
          
          <MagicCircle
            size="small"
            position={{ bottom: '20%', left: '60%' }}
            opacity={getMagicCircleOpacity() * 0.6}
            rotationSpeed="fast"
            color="cosmic"
          />
          
          {/* 額外的小魔法陣 */}
          {intensity === 'high' && (
            <>
              <MagicCircle
                size="small"
                position={{ top: '30%', right: '10%' }}
                opacity={getMagicCircleOpacity() * 0.4}
                rotationSpeed="slow"
                color="gold"
              />
              
              <MagicCircle
                size="small"
                position={{ bottom: '40%', right: '50%' }}
                opacity={getMagicCircleOpacity() * 0.5}
                rotationSpeed="normal"
                color="mystic"
              />
            </>
          )}
        </>
      )}
      
      {/* 光暈效果 */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-mystic-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-cosmic-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
};

export default CosmicBackground;