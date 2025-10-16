import React, { ReactNode } from 'react';

interface GuidanceCardProps {
  title?: string;
  description?: string;
  tips?: string[];
  examples?: string[];
  children?: ReactNode;
  variant?: 'info' | 'warning' | 'success' | 'primary';
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const GuidanceCard: React.FC<GuidanceCardProps> = ({
  title,
  description,
  tips = [],
  examples = [],
  children,
  variant = 'info',
  className = '',
  collapsible = false,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const getVariantClasses = () => {
    const variants = {
      info: 'bg-warm-gold/10 border-warm-gold/20 text-warm-gold/60',
      warning: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-100',
      success: 'bg-green-900/20 border-green-500/30 text-green-100',
      primary: 'bg-gold-900/20 border-gold-500/30 text-gold-100'
    };
    return variants[variant];
  };

  const getIconForVariant = () => {
    const icons = {
      info: '💡',
      warning: '⚠️',
      success: '✅',
      primary: '✨'
    };
    return icons[variant];
  };

  return (
    <div className={`rounded-lg border p-4 ${getVariantClasses()} ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium flex items-center">
            <span className="mr-2">{getIconForVariant()}</span>
            {title}
          </h4>
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </div>
      )}

      {(!collapsible || isExpanded) && (
        <>
          {description && (
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">
              {description}
            </p>
          )}

          {children && (
            <div className="mb-3">
              {children}
            </div>
          )}

          {tips.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-400 mb-2">💡 創作技巧：</h5>
              <ul className="text-xs text-gray-300 space-y-1">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-gold-400 mr-2">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {examples.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-400 mb-2">📝 範例：</h5>
              <div className="space-y-1">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className="text-xs text-gray-300 p-2 bg-cosmic-800/50 rounded border-l-2 border-gold-500/30"
                  >
                    "{example}"
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GuidanceCard;