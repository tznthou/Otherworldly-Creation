import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addError, selectActiveErrors, selectCriticalErrors, cleanupOldErrors } from '../../store/slices/errorSlice';
import { ERROR_CODES } from '../../types/error';
import ErrorDisplay from './ErrorDisplay';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const activeErrors = useAppSelector(selectActiveErrors);
  const criticalErrors = useAppSelector(selectCriticalErrors);

  // 設置全域錯誤處理
  useEffect(() => {
    // 處理未捕獲的 JavaScript 錯誤
    const handleError = (event: ErrorEvent) => {
      dispatch(addError({
        code: ERROR_CODES.SYSTEM_UNKNOWN_ERROR,
        message: '應用程式發生未預期的錯誤',
        description: event.message,
        severity: 'high',
        category: 'system',
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      }));
    };

    // 處理未捕獲的 Promise 拒絕
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      dispatch(addError({
        code: ERROR_CODES.SYSTEM_UNKNOWN_ERROR,
        message: '應用程式發生未處理的異步錯誤',
        description: event.reason?.message || String(event.reason),
        severity: 'high',
        category: 'system',
        stack: event.reason?.stack,
        context: {
          reason: event.reason
        }
      }));
    };

    // 監聽網路狀態變化
    const handleOnline = () => {
      // 網路恢復時可以清除相關錯誤
    };

    const handleOffline = () => {
      dispatch(addError({
        code: ERROR_CODES.NETWORK_OFFLINE,
        message: '網路連線中斷',
        description: '偵測到網路連線中斷，部分功能可能無法正常使用',
        severity: 'medium',
        category: 'network'
      }));
    };

    // 註冊事件監聽器
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 清理函數
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // 定期清理舊錯誤
  useEffect(() => {
    const cleanup = setInterval(() => {
      // 清理 5 分鐘前的錯誤
      dispatch(cleanupOldErrors(5 * 60 * 1000));
    }, 60 * 1000); // 每分鐘檢查一次

    return () => clearInterval(cleanup);
  }, [dispatch]);

  // 監聽 Electron 主進程錯誤
  useEffect(() => {
    const handleMainProcessError = (error: any) => {
      dispatch(addError({
        code: ERROR_CODES.SYSTEM_UNKNOWN_ERROR,
        message: '主進程發生錯誤',
        description: error.message,
        severity: 'critical',
        category: 'system',
        context: error
      }));
    };

    // 如果有 electronAPI，監聽主進程錯誤
    if (window.electronAPI?.onError) {
      window.electronAPI.onError(handleMainProcessError);
    }
  }, [dispatch]);

  return (
    <>
      {children}
      
      {/* 錯誤顯示容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {/* 顯示關鍵錯誤 */}
        {criticalErrors.map((error) => (
          <ErrorDisplay
            key={error.id}
            error={error}
            className="animate-slide-in-right"
          />
        ))}
        
        {/* 顯示其他活躍錯誤（最多3個） */}
        {activeErrors
          .filter(error => error.severity !== 'critical')
          .slice(0, 3)
          .map((error) => (
            <ErrorDisplay
              key={error.id}
              error={error}
              compact={true}
              className="animate-slide-in-right"
            />
          ))}
        
        {/* 如果有更多錯誤，顯示摺疊指示 */}
        {activeErrors.filter(error => error.severity !== 'critical').length > 3 && (
          <div className="bg-cosmic-800/80 backdrop-blur-sm border border-cosmic-600 rounded-lg p-2 text-center">
            <span className="text-sm text-gray-400">
              還有 {activeErrors.filter(error => error.severity !== 'critical').length - 3} 個錯誤...
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default GlobalErrorHandler;