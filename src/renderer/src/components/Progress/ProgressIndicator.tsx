import React, { useEffect, useState } from 'react';
import { ProgressIndicator as ProgressIndicatorType } from '../../types/error';
import { useAppDispatch } from '../../hooks/redux';
import { cancelProgress, removeProgress } from '../../store/slices/errorSlice';

interface ProgressIndicatorProps {
  progress: ProgressIndicatorType;
  compact?: boolean;
  showCancel?: boolean;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  compact = false,
  showCancel = true,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const [elapsedTime, setElapsedTime] = useState(0);

  // 計算經過時間
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = progress.startTime.getTime();
      setElapsedTime(now - start);
    }, 1000);

    return () => clearInterval(interval);
  }, [progress.startTime]);

  const getStatusConfig = (status: ProgressIndicatorType['status']) => {
    const configs = {
      pending: {
        color: 'text-gray-400',
        bgColor: 'bg-gray-600',
        icon: '⏳'
      },
      running: {
        color: 'text-blue-400',
        bgColor: 'bg-blue-600',
        icon: '⚡'
      },
      completed: {
        color: 'text-green-400',
        bgColor: 'bg-green-600',
        icon: '✅'
      },
      failed: {
        color: 'text-red-400',
        bgColor: 'bg-red-600',
        icon: '❌'
      },
      cancelled: {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-600',
        icon: '⏹️'
      }
    };
    return configs[status];
  };

  const config = getStatusConfig(progress.status);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  const getEstimatedTimeRemaining = () => {
    if (progress.status !== 'running' || progress.progress === 0) return null;
    
    const progressRate = progress.progress / elapsedTime; // 進度/毫秒
    const remainingProgress = 100 - progress.progress;
    const estimatedRemaining = remainingProgress / progressRate;
    
    return estimatedRemaining;
  };

  const handleCancel = () => {
    dispatch(cancelProgress(progress.id));
  };

  const handleRemove = () => {
    dispatch(removeProgress(progress.id));
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 p-2 bg-cosmic-800/50 rounded-lg ${className}`}>
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white truncate">
              {progress.title}
            </span>
            <span className={`text-xs ${config.color}`}>
              {progress.progress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-cosmic-700 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${config.bgColor}`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
        {showCancel && progress.status === 'running' && (
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
            title="取消"
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
    <div className={`bg-cosmic-800/50 border border-cosmic-700 rounded-lg p-4 ${className}`}>
      {/* 標題和狀態 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <h3 className="font-medium text-white">
              {progress.title}
            </h3>
            {progress.description && (
              <p className="text-sm text-gray-400 mt-1">
                {progress.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${config.color}`}>
            {progress.status === 'running' ? `${progress.progress.toFixed(0)}%` : progress.status}
          </span>
          
          {progress.status === 'running' && showCancel && (
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-white transition-colors"
              title="取消操作"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {(progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') && (
            <button
              onClick={handleRemove}
              className="text-gray-400 hover:text-white transition-colors"
              title="移除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 進度條 */}
      <div className="mb-3">
        <div className="w-full bg-cosmic-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${config.bgColor} ${
              progress.status === 'running' ? 'animate-pulse' : ''
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* 詳細資訊 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          {progress.currentStep && (
            <span>當前步驟: {progress.currentStep}</span>
          )}
          
          {progress.totalSteps && progress.completedSteps !== undefined && (
            <span>
              步驟: {progress.completedSteps}/{progress.totalSteps}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>經過時間: {formatTime(elapsedTime)}</span>
          
          {progress.status === 'running' && (() => {
            const estimatedRemaining = getEstimatedTimeRemaining();
            return estimatedRemaining ? (
              <span>預計剩餘: {formatTime(estimatedRemaining)}</span>
            ) : null;
          })()}
          
          {progress.endTime && (
            <span>
              完成時間: {new Intl.DateTimeFormat('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }).format(progress.endTime)}
            </span>
          )}
        </div>
      </div>

      {/* 錯誤資訊 */}
      {progress.status === 'failed' && progress.error && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-sm">
          <span className="text-red-400 font-medium">錯誤: </span>
          <span className="text-gray-300">{progress.error.message}</span>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;