import React, { useState } from 'react';
import { AppError, ErrorSeverity } from '../../types/error';
import { useAppDispatch } from '../../hooks/redux';
import { dismissError, resolveError } from '../../store/slices/errorSlice';
import CosmicButton from '../UI/CosmicButton';

interface ErrorDisplayProps {
  error: AppError;
  compact?: boolean;
  showDismiss?: boolean;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  compact = false,
  showDismiss = true,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);
  const [executingSuggestion, setExecutingSuggestion] = useState<string | null>(null);

  const getSeverityConfig = (severity: ErrorSeverity) => {
    const configs = {
      low: {
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-500/30',
        textColor: 'text-blue-400',
        icon: 'ℹ️'
      },
      medium: {
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-400',
        icon: '⚠️'
      },
      high: {
        bgColor: 'bg-orange-900/20',
        borderColor: 'border-orange-500/30',
        textColor: 'text-orange-400',
        icon: '🔥'
      },
      critical: {
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-400',
        icon: '💥'
      }
    };
    return configs[severity];
  };

  const config = getSeverityConfig(error.severity);

  const handleDismiss = () => {
    dispatch(dismissError(error.id));
  };

  const handleSuggestionAction = async (suggestionId: string, handler?: () => void | Promise<void>) => {
    if (!handler) return;
    
    setExecutingSuggestion(suggestionId);
    try {
      await handler();
      dispatch(resolveError(error.id));
    } catch (err) {
      console.error('執行建議失敗:', err);
    } finally {
      setExecutingSuggestion(null);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 p-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.textColor} truncate`}>
            {error.message}
          </p>
        </div>
        {showDismiss && (
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      {/* 錯誤標題 */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <h3 className={`font-medium ${config.textColor} mb-1`}>
                {error.message}
              </h3>
              {error.description && (
                <p className="text-sm text-gray-400 mb-2">
                  {error.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>錯誤代碼: {error.code}</span>
                <span>時間: {formatTimestamp(error.timestamp)}</span>
                <span className="capitalize">嚴重程度: {error.severity}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {error.suggestions && error.suggestions.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-400 hover:text-white transition-colors"
                title={expanded ? '收起建議' : '顯示建議'}
              >
                <svg 
                  className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            
            {showDismiss && (
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-white transition-colors"
                title="關閉錯誤"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 建議解決方案 */}
      {expanded && error.suggestions && error.suggestions.length > 0 && (
        <div className="border-t border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">建議解決方案：</h4>
          <div className="space-y-3">
            {error.suggestions
              .sort((a, b) => a.priority - b.priority)
              .map((suggestion) => (
                <div key={suggestion.id} className="bg-cosmic-800/50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-white mb-1">
                        {suggestion.title}
                      </h5>
                      <p className="text-sm text-gray-400 mb-2">
                        {suggestion.description}
                      </p>
                    </div>
                    
                    {suggestion.action && (
                      <div className="ml-3">
                        {suggestion.action.type === 'button' && suggestion.action.handler && (
                          <CosmicButton
                            size="small"
                            variant="secondary"
                            loading={executingSuggestion === suggestion.id}
                            onClick={() => handleSuggestionAction(suggestion.id, suggestion.action?.handler)}
                          >
                            {suggestion.action.label}
                          </CosmicButton>
                        )}
                        
                        {suggestion.action.type === 'link' && suggestion.action.url && (
                          <CosmicButton
                            size="small"
                            variant="secondary"
                            onClick={() => window.open(suggestion.action?.url, '_blank')}
                          >
                            {suggestion.action.label}
                          </CosmicButton>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 技術詳情（僅在開發模式顯示） */}
      {process.env.NODE_ENV === 'development' && error.stack && (
        <div className="border-t border-gray-700 p-4">
          <details className="text-xs">
            <summary className="text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
              技術詳情
            </summary>
            <pre className="bg-cosmic-900 p-2 rounded text-gray-500 overflow-x-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
            {error.context && (
              <div className="mt-2">
                <p className="text-gray-400 mb-1">上下文資訊：</p>
                <pre className="bg-cosmic-900 p-2 rounded text-gray-500 overflow-x-auto">
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              </div>
            )}
          </details>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;