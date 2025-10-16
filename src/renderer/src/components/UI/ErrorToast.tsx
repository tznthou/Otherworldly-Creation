import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { removeError, resolveError } from '../../store/slices/errorSlice';
import { AppError, ErrorSeverity } from '../../types/error';
import CosmicButton from './CosmicButton';

interface ErrorToastProps {
  error: AppError;
  onClose: () => void;
  onResolve?: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ error, onClose, onResolve }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // 根據錯誤嚴重程度設定樣式
  const getSeverityStyles = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-900/90',
          border: 'border-red-500',
          icon: '🚨',
          iconColor: 'text-red-400'
        };
      case 'high':
        return {
          bg: 'bg-orange-900/90',
          border: 'border-orange-500',
          icon: '⚠️',
          iconColor: 'text-orange-400'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-900/90',
          border: 'border-yellow-500',
          icon: '⚡',
          iconColor: 'text-yellow-400'
        };
      case 'low':
        return {
          bg: 'bg-warm-gold/20',
          border: 'border-warm-gold',
          icon: 'ℹ️',
          iconColor: 'text-warm-gold'
        };
      default:
        return {
          bg: 'bg-gray-900/90',
          border: 'border-gray-500',
          icon: '❓',
          iconColor: 'text-gray-400'
        };
    }
  };

  const styles = getSeverityStyles(error.severity);

  // 獲取解決建議
  const getResolutionSuggestions = (error: AppError): string[] => {
    const suggestions: string[] = [];

    switch (error.category) {
      case 'network':
        suggestions.push('檢查網路連接是否正常');
        suggestions.push('確認服務器是否可用');
        suggestions.push('稍後重試');
        break;
      case 'ai':
        suggestions.push('檢查 Ollama 服務是否運行');
        suggestions.push('確認 AI 模型是否已安裝');
        suggestions.push('嘗試使用其他模型');
        break;
      case 'database':
        suggestions.push('檢查資料庫文件權限');
        suggestions.push('嘗試重新啟動應用程式');
        suggestions.push('考慮備份和修復資料庫');
        break;
      case 'file':
        suggestions.push('檢查檔案路徑是否正確');
        suggestions.push('確認檔案權限');
        suggestions.push('檢查磁碟空間');
        break;
      case 'validation':
        suggestions.push('檢查輸入格式');
        suggestions.push('確認必填欄位已填寫');
        break;
      default:
        suggestions.push('重新載入頁面');
        suggestions.push('重新啟動應用程式');
        suggestions.push('聯繫技術支援');
    }

    return suggestions;
  };

  const suggestions = getResolutionSuggestions(error);

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      if (onResolve) {
        await onResolve();
      }
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className={`
      ${styles.bg} ${styles.border} border-l-4 
      backdrop-blur-sm rounded-lg p-4 mb-3 
      shadow-lg transform transition-all duration-300
      hover:scale-[1.02] hover:shadow-xl
    `}>
      {/* 錯誤標題 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span className={`text-2xl ${styles.iconColor}`}>
            {styles.icon}
          </span>
          <div>
            <h4 className="font-semibold text-white">
              {error.message}
            </h4>
            <p className="text-sm text-gray-300 mt-1">
              {error.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 展開/收起按鈕 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title={isExpanded ? '收起詳情' : '展開詳情'}
          >
            <svg 
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="關閉"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 展開的詳細資訊 */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-gray-600 pt-4">
          {/* 錯誤詳情 */}
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">錯誤詳情</h5>
            <div className="text-xs text-gray-400 space-y-1">
              <p><span className="font-medium">錯誤代碼:</span> {error.code}</p>
              <p><span className="font-medium">類別:</span> {error.category}</p>
              <p><span className="font-medium">嚴重程度:</span> {error.severity}</p>
              <p><span className="font-medium">時間:</span> {new Date(error.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {/* 解決建議 */}
          {suggestions.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-300 mb-2">解決建議</h5>
              <ul className="text-xs text-gray-400 space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-warm-gold mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 上下文資訊 */}
          {error.context && Object.keys(error.context).length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-300 mb-2">上下文資訊</h5>
              <div className="text-xs text-gray-400 bg-black/30 rounded p-2 max-h-32 overflow-y-auto">
                <pre>{JSON.stringify(error.context, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex space-x-2 pt-2">
            <CosmicButton
              size="small"
              variant="secondary"
              onClick={handleResolve}
              disabled={isResolving}
              loading={isResolving}
            >
              {isResolving ? '處理中...' : '標記為已解決'}
            </CosmicButton>
            
            <CosmicButton
              size="small"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(error, null, 2));
              }}
            >
              複製錯誤資訊
            </CosmicButton>
          </div>
        </div>
      )}
    </div>
  );
};

// 錯誤提示容器組件
export const ErrorToastContainer: React.FC = () => {
  const dispatch = useDispatch();
  const errors = useSelector((state: RootState) => state.error.errors);
  const [visibleErrors, setVisibleErrors] = useState<AppError[]>([]);

  useEffect(() => {
    // 只顯示未解決的錯誤，按時間排序
    const unresolved = errors
      .filter(error => !error.resolved)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5); // 最多顯示5個錯誤

    setVisibleErrors(unresolved);
  }, [errors]);

  const handleCloseError = (errorId: string) => {
    dispatch(removeError(errorId));
  };

  const handleResolveError = (errorId: string) => {
    dispatch(resolveError(errorId));
  };

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[100000] w-96 max-w-full">
      <div className="space-y-2">
        {visibleErrors.map((error) => (
          <ErrorToast
            key={error.id}
            error={error}
            onClose={() => handleCloseError(error.id)}
            onResolve={() => handleResolveError(error.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ErrorToast;