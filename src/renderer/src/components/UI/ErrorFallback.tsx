import React, { useState } from 'react';
import CosmicButton from './CosmicButton';
import { useNotification } from './NotificationSystem';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  context?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError, 
  context = '應用程式' 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const notification = useNotification();

  const handleReportError = async () => {
    setIsReporting(true);
    try {
      // 這裡可以實現錯誤報告功能
      // 例如發送到錯誤追蹤服務
      const _errorReport = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // 模擬發送錯誤報告
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      notification.success('錯誤報告已發送', '感謝您的回饋，我們會盡快修復此問題');
    } catch (_reportError) {
      notification.error('發送失敗', '無法發送錯誤報告，請稍後再試');
    } finally {
      setIsReporting(false);
    }
  };

  const handleCopyError = () => {
    const errorInfo = `
錯誤訊息: ${error.message}
發生時間: ${new Date().toLocaleString()}
上下文: ${context}
瀏覽器: ${navigator.userAgent}
URL: ${window.location.href}

堆疊追蹤:
${error.stack}
    `.trim();

    navigator.clipboard.writeText(errorInfo).then(() => {
      notification.success('已複製', '錯誤資訊已複製到剪貼簿');
    }).catch(() => {
      notification.error('複製失敗', '無法複製錯誤資訊到剪貼簿');
    });
  };

  const getErrorSuggestions = (error: Error): string[] => {
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('檢查網路連接是否正常');
      suggestions.push('確認服務器是否可用');
    }

    if (message.includes('permission') || message.includes('access')) {
      suggestions.push('檢查檔案或資料夾權限');
      suggestions.push('以管理員身份運行應用程式');
    }

    if (message.includes('memory') || message.includes('heap')) {
      suggestions.push('關閉其他應用程式釋放記憶體');
      suggestions.push('重新啟動應用程式');
    }

    if (message.includes('database') || message.includes('sqlite')) {
      suggestions.push('檢查資料庫檔案是否存在');
      suggestions.push('嘗試修復資料庫');
    }

    // 通用建議
    if (suggestions.length === 0) {
      suggestions.push('重新載入頁面');
      suggestions.push('重新啟動應用程式');
      suggestions.push('檢查是否有可用的更新');
    }

    return suggestions;
  };

  const suggestions = getErrorSuggestions(error);

  return (
    <div className="min-h-screen bg-cosmic-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 主要錯誤卡片 */}
        <div className="bg-cosmic-900/90 backdrop-blur-sm rounded-lg border border-red-500/30 p-8 shadow-2xl">
          {/* 錯誤圖標和標題 */}
          <div className="text-center mb-8">
            <div className="text-8xl mb-4 animate-bounce">💥</div>
            <h1 className="text-3xl font-cosmic text-red-400 mb-2">
              糟糕！出現了錯誤
            </h1>
            <p className="text-gray-400 text-lg">
              {context}遇到了意外問題
            </p>
          </div>

          {/* 錯誤訊息 */}
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">錯誤詳情</h3>
            <p className="text-gray-300 text-sm font-mono">
              {error.message}
            </p>
          </div>

          {/* 解決建議 */}
          <div className="mb-6">
            <h3 className="text-gold-400 font-semibold mb-3">建議的解決方案</h3>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2 text-gray-300">
                  <span className="text-gold-400 mt-1">•</span>
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 操作按鈕 */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <CosmicButton
              variant="primary"
              onClick={resetError}
              className="min-w-[120px]"
            >
              重新載入
            </CosmicButton>
            
            <CosmicButton
              variant="secondary"
              onClick={() => window.location.reload()}
              className="min-w-[120px]"
            >
              刷新頁面
            </CosmicButton>
            
            <CosmicButton
              variant="secondary"
              onClick={handleCopyError}
              className="min-w-[120px]"
            >
              複製錯誤
            </CosmicButton>
            
            <CosmicButton
              variant="magic"
              onClick={handleReportError}
              loading={isReporting}
              disabled={isReporting}
              className="min-w-[120px]"
            >
              {isReporting ? '發送中...' : '回報錯誤'}
            </CosmicButton>
          </div>

          {/* 詳細資訊切換 */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-white transition-colors text-sm flex items-center space-x-2 mx-auto"
            >
              <span>{showDetails ? '隱藏' : '顯示'}技術詳情</span>
              <svg 
                className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDetails && (
              <div className="mt-4 bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="text-gray-300 font-semibold mb-2">堆疊追蹤</h4>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 額外幫助資訊 */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            如果問題持續發生，請聯繫技術支援或查看
            <a 
              href="#" 
              className="text-gold-400 hover:text-gold-300 ml-1"
              onClick={(e) => {
                e.preventDefault();
                // 這裡可以打開幫助文檔
                notification.info('幫助文檔', '幫助文檔功能即將推出');
              }}
            >
              幫助文檔
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

// 簡化版錯誤組件（用於小區域）
interface MiniErrorFallbackProps {
  error: Error;
  resetError: () => void;
  title?: string;
}

export const MiniErrorFallback: React.FC<MiniErrorFallbackProps> = ({ 
  error, 
  resetError, 
  title = '載入失敗' 
}) => {
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center">
      <div className="text-red-400 text-2xl mb-2">⚠️</div>
      <h3 className="text-red-400 font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-3">{error.message}</p>
      <CosmicButton
        size="small"
        variant="secondary"
        onClick={resetError}
      >
        重試
      </CosmicButton>
    </div>
  );
};

export default ErrorFallback;