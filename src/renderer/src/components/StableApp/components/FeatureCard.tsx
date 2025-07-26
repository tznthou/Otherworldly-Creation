import React from 'react';
import { featureCardStyles } from '../styles';

interface FeatureCardProps {
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, onClick, highlight = false }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  const getStyle = () => {
    const baseStyle = { ...featureCardStyles.base };
    
    if (highlight) {
      Object.assign(baseStyle, featureCardStyles.highlight);
    }
    
    if (isHovered) {
      Object.assign(baseStyle, highlight ? featureCardStyles.highlightHover : featureCardStyles.hover);
    }
    
    return baseStyle;
  };
  
  return (
    <button
      style={getStyle()}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>
        {description}
      </div>
    </button>
  );
};

export default FeatureCard;