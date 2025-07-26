import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  selectActiveProgress, 
  selectRunningProgress, 
  cleanupCompletedProgress 
} from '../../store/slices/errorSlice';
import ProgressIndicator from './ProgressIndicator';

interface ProgressManagerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  autoHide?: boolean;
  className?: string;
}

const ProgressManager: React.FC<ProgressManagerProps> = ({
  position = 'bottom-right',
  maxVisible = 3,
  autoHide = true,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const activeProgress = useAppSelector(selectActiveProgress);
  const runningProgress = useAppSelector(selectRunningProgress);
  const [isExpanded, setIsExpanded] = useState(false);

  // 定期清理完成的進度指示器
  useEffect(() => {
    const cleanup = setInterval(() => {
      // 清理 30 秒前完成的進度指示器
      dispatch(cleanupCompletedProgress(30 * 1000));
    }, 10 * 1000); // 每 10 秒檢查一次

    return () => clearInterval(cleanup);
  }, [dispatch]);

  // 自動隱藏邏輯
  useEffect(() => {
    if (autoHide && runningProgress.length === 0) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 3000); // 3秒後自動收起

      return () => clearTimeout(timer);
    }
  }, [autoHide, runningProgress.length]);

  const getPositionClasses = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4'
    };
    return positions[position];
  };

  const visibleProgress = isExpanded ? activeProgress : activeProgress.slice(0, maxVisible);
  const hiddenCount = activeProgress.length - visibleProgress.length;

  if (activeProgress.length === 0) {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-40 max-w-sm w-full ${className}`}>
      <div className="space-y-2">
        {/* 進度指示器列表 */}
        {visibleProgress.map((progress) => (
          <ProgressIndicator
            key={progress.id}
            progress={progress}
            compact={!isExpanded}
            className="animate-slide-in-up"
          />
        ))}

        {/* 展開/收起控制 */}
        {activeProgress.length > maxVisible && (
          <div className="flex items-center justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="bg-cosmic-800/80 backdrop-blur-sm border border-cosmic-600 rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? (
                <>
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  收起
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  顯示全部 ({hiddenCount} 個隱藏)
                </>
              )}
            </button>
          </div>
        )}

        {/* 整體進度摘要 */}
        {runningProgress.length > 1 && (
          <div className="bg-cosmic-800/80 backdrop-blur-sm border border-cosmic-600 rounded-lg p-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>總進度</span>
              <span>
                {runningProgress.length} 個任務進行中
              </span>
            </div>
            <div className="w-full bg-cosmic-700 rounded-full h-1 mt-1">
              <div
                className="h-1 rounded-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${
                    runningProgress.reduce((sum, p) => sum + p.progress, 0) / runningProgress.length
                  }%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressManager;