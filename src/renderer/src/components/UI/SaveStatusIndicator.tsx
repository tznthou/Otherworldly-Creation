import React from 'react';
import { useAutoSave } from '../../hooks/useAutoSave';

interface SaveStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  className = '',
  showText = true,
  size = 'medium'
}) => {
  const { autoSaveStatus, isSaving, hasUnsavedChanges, lastSaved, autoSaveEnabled } = useAutoSave();

  if (!autoSaveEnabled) {
    return null;
  }

  const getStatusIcon = () => {
    switch (autoSaveStatus.status) {
      case 'saving':
        return (
          <div className="animate-spin">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        );
      case 'saved':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'pending':
        return (
          <div className="relative">
            <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {autoSaveStatus.nextSaveIn > 0 && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {autoSaveStatus.nextSaveIn}
              </div>
            )}
          </div>
        );
      default:
        if (hasUnsavedChanges) {
          return (
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          );
        }
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusText = () => {
    switch (autoSaveStatus.status) {
      case 'saving':
        return '儲存中...';
      case 'saved':
        return lastSaved ? `已儲存 ${formatTime(lastSaved)}` : '已儲存';
      case 'error':
        return `儲存失敗: ${autoSaveStatus.error}`;
      case 'pending':
        return autoSaveStatus.nextSaveIn > 0 
          ? `${autoSaveStatus.nextSaveIn}秒後自動儲存`
          : '準備儲存...';
      default:
        if (hasUnsavedChanges) {
          return '有未儲存的變更';
        }
        return lastSaved ? `上次儲存: ${formatTime(lastSaved)}` : '已同步';
    }
  };

  const getStatusColor = () => {
    switch (autoSaveStatus.status) {
      case 'saving':
        return 'text-blue-500';
      case 'saved':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return hasUnsavedChanges ? 'text-orange-500' : 'text-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // 小於1分鐘
      return '剛剛';
    } else if (diff < 3600000) { // 小於1小時
      return `${Math.floor(diff / 60000)}分鐘前`;
    } else if (diff < 86400000) { // 小於1天
      return `${Math.floor(diff / 3600000)}小時前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`flex items-center space-x-2 ${sizeClasses[size]} ${getStatusColor()} ${className}`}>
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      {showText && (
        <span className="truncate">
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default SaveStatusIndicator;