/**
 * AI 插畫面板懶加載版本
 * 使用 React.lazy 實現代碼分割，提高初始加載性能
 */

import React, { Suspense } from 'react';
import LoadingSpinner from '../UI/LoadingSpinner';

// 懶加載 BatchIllustrationPanel 組件
const BatchIllustrationPanel = React.lazy(() => 
  import('./BatchIllustrationPanel').then(module => ({
    default: module.default
  }))
);

interface LazyBatchIllustrationPanelProps {
  className?: string;
}

const LazyBatchIllustrationPanel: React.FC<LazyBatchIllustrationPanelProps> = (props) => {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-2 text-gray-400">載入 AI 插畫面板中...</span>
        </div>
      }
    >
      <BatchIllustrationPanel {...props} />
    </Suspense>
  );
};

export default LazyBatchIllustrationPanel;