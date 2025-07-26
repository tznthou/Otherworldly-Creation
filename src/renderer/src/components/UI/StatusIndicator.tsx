import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

export type StatusType = 'online' | 'offline' | 'connecting' | 'error' | 'warning' | 'success';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  description?: string;
  showPulse?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  description,
  showPulse = true,
  size = 'medium',
  className = ''
}) => {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'online':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-400',
          icon: '●',
          defaultLabel: '線上'
        };
      case 'offline':
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-400',
          icon: '●',
          defaultLabel: '離線'
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-400',
          icon: '●',
          defaultLabel: '連接中'
        };
      case 'error':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-400',
          icon: '●',
          defaultLabel: '錯誤'
        };
      case 'warning':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-400',
          icon: '●',
          defaultLabel: '警告'
        };
      case 'success':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-400',
          icon: '●',
          defaultLabel: '成功'
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-400',
          icon: '●',
          defaultLabel: '未知'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'small':
        return {
          dot: 'w-2 h-2',
          text: 'text-xs',
          icon: 'text-xs'
        };
      case 'large':
        return {
          dot: 'w-4 h-4',
          text: 'text-base',
          icon: 'text-base'
        };
      default:
        return {
          dot: 'w-3 h-3',
          text: 'text-sm',
          icon: 'text-sm'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);
  const displayLabel = label || config.defaultLabel;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <div className={`
          ${config.color} ${sizeClasses.dot} rounded-full
          ${showPulse && (status === 'connecting' || status === 'online') ? 'animate-pulse' : ''}
        `} />
        {showPulse && status === 'connecting' && (
          <div className={`
            absolute inset-0 ${config.color} rounded-full animate-ping opacity-75
          `} />
        )}
      </div>
      
      {displayLabel && (
        <div>
          <span className={`${config.textColor} ${sizeClasses.text} font-medium`}>
            {displayLabel}
          </span>
          {description && (
            <p className={`text-gray-500 ${sizeClasses.text === 'text-xs' ? 'text-xs' : 'text-xs'} mt-0.5`}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// 系統狀態面板
export const SystemStatusPanel: React.FC = () => {
  const [aiStatus, setAiStatus] = useState<StatusType>('offline');
  const [dbStatus, setDbStatus] = useState<StatusType>('offline');
  const [networkStatus, setNetworkStatus] = useState<StatusType>('offline');

  useEffect(() => {
    // 檢查各種服務狀態
    const checkStatuses = async () => {
      try {
        // 檢查 AI 服務狀態
        const aiResponse = await window.electron?.ipcRenderer.invoke('check-ai-status');
        setAiStatus(aiResponse?.available ? 'online' : 'offline');
      } catch {
        setAiStatus('error');
      }

      try {
        // 檢查資料庫狀態
        const dbResponse = await window.electron?.ipcRenderer.invoke('check-db-status');
        setDbStatus(dbResponse?.connected ? 'online' : 'offline');
      } catch {
        setDbStatus('error');
      }

      // 檢查網路狀態
      setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    };

    checkStatuses();

    // 監聽網路狀態變化
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 定期檢查狀態
    const interval = setInterval(checkStatuses, 30000); // 每30秒檢查一次

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-cosmic-900/50 backdrop-blur-sm rounded-lg p-4 border border-cosmic-700">
      <h3 className="text-white font-semibold mb-3 text-sm">系統狀態</h3>
      
      <div className="space-y-3">
        <StatusIndicator
          status={aiStatus}
          label="AI 服務"
          description={aiStatus === 'online' ? 'Ollama 服務正常' : 'AI 服務不可用'}
          size="small"
        />
        
        <StatusIndicator
          status={dbStatus}
          label="資料庫"
          description={dbStatus === 'online' ? '資料庫連接正常' : '資料庫連接失敗'}
          size="small"
        />
        
        <StatusIndicator
          status={networkStatus}
          label="網路連接"
          description={networkStatus === 'online' ? '網路連接正常' : '網路連接中斷'}
          size="small"
        />
      </div>
    </div>
  );
};

// 連接狀態指示器（用於特定服務）
interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
  serviceName: string;
  onRetry?: () => void;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting = false,
  serviceName,
  onRetry,
  className = ''
}) => {
  const getStatus = (): StatusType => {
    if (isConnecting) return 'connecting';
    return isConnected ? 'online' : 'offline';
  };

  const getDescription = () => {
    if (isConnecting) return `正在連接到 ${serviceName}...`;
    if (isConnected) return `${serviceName} 連接正常`;
    return `${serviceName} 連接失敗`;
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <StatusIndicator
        status={getStatus()}
        label={serviceName}
        description={getDescription()}
        size="small"
      />
      
      {!isConnected && !isConnecting && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-gold-400 hover:text-gold-300 transition-colors ml-2"
        >
          重試
        </button>
      )}
    </div>
  );
};

// 操作狀態指示器
interface OperationStatusProps {
  isLoading: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  className?: string;
}

export const OperationStatus: React.FC<OperationStatusProps> = ({
  isLoading,
  isSuccess = false,
  isError = false,
  loadingText = '處理中...',
  successText = '完成',
  errorText = '失敗',
  className = ''
}) => {
  const getStatus = (): StatusType => {
    if (isLoading) return 'connecting';
    if (isError) return 'error';
    if (isSuccess) return 'success';
    return 'offline';
  };

  const getText = () => {
    if (isLoading) return loadingText;
    if (isError) return errorText;
    if (isSuccess) return successText;
    return '';
  };

  if (!isLoading && !isSuccess && !isError) {
    return null;
  }

  return (
    <StatusIndicator
      status={getStatus()}
      label={getText()}
      size="small"
      className={className}
    />
  );
};

export default StatusIndicator;