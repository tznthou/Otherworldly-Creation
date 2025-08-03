import React, { useState, useEffect } from 'react';
import AutoBackupService, { AutoBackupStatus } from '../../services/autoBackupService';

interface AutoBackupIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const AutoBackupIndicator: React.FC<AutoBackupIndicatorProps> = ({
  className = '',
  showText = true,
  size = 'medium'
}) => {
  const [status, setStatus] = useState(AutoBackupService.getStatus());
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // 監聽狀態變更
    const handleStatusChange = (newStatus: AutoBackupStatus) => {
      setStatus(newStatus);
    };

    AutoBackupService.addStatusListener(handleStatusChange);

    // 倒數計時器
    const countdownInterval = setInterval(() => {
      setCountdown(AutoBackupService.getNextBackupCountdown());
    }, 1000);

    return () => {
      AutoBackupService.removeStatusListener(handleStatusChange);
      clearInterval(countdownInterval);
    };
  }, []);

  const getStatusIcon = () => {
    if (status.error) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }

    if (!status.enabled) {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
    }

    if (status.enabled && countdown > 0) {
      return (
        <div className="relative">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {countdown < 3600 && ( // 小於1小時時顯示倒數
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      );
    }

    return (
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (status.error) {
      return `備份錯誤: ${status.error}`;
    }

    if (!status.enabled) {
      return '自動備份已停用';
    }

    if (countdown > 0) {
      return `下次備份: ${AutoBackupService.formatTimeInterval(countdown)}`;
    }

    if (status.lastBackup) {
      const timeSince = Date.now() - status.lastBackup.getTime();
      const timeString = AutoBackupService.formatTimeInterval(Math.floor(timeSince / 1000));
      return `上次備份: ${timeString}前`;
    }

    return '等待首次備份';
  };

  const getStatusColor = () => {
    if (status.error) return 'text-red-500';
    if (!status.enabled) return 'text-gray-500';
    if (countdown > 0) return 'text-blue-500';
    return 'text-green-500';
  };

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  const health = AutoBackupService.checkBackupHealth();

  return (
    <div 
      className={`flex items-center space-x-2 ${sizeClasses[size]} ${getStatusColor()} ${className}`}
      title={`備份狀態: ${health.message}`}
    >
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      {showText && (
        <span className="truncate">
          {getStatusText()}
        </span>
      )}
      {status.backupCount > 0 && (
        <span className="text-xs text-gray-400">
          ({status.backupCount})
        </span>
      )}
    </div>
  );
};

export default AutoBackupIndicator;