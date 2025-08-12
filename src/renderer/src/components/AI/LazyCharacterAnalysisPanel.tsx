/**
 * 角色分析面板懶加載版本
 * 使用 React.lazy 實現代碼分割，提高初始加載性能
 */

import React, { Suspense } from 'react';
import LoadingSpinner from '../UI/LoadingSpinner';

// 懶加載 CharacterAnalysisPanel 組件
const CharacterAnalysisPanel = React.lazy(() => 
  import('./CharacterAnalysisPanel').then(module => ({
    default: module.default
  }))
);

interface LazyCharacterAnalysisPanelProps {
  projectId: string;
  chapters: Array<{
    id: string;
    title: string;
    content?: string;
  }>;
  currentChapter: {
    id: string;
    title: string;
    content?: string;
  } | null;
  _onSuggestionApply?: (suggestion: string) => void;
}

const LazyCharacterAnalysisPanel: React.FC<LazyCharacterAnalysisPanelProps> = (props) => {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-2 text-gray-400">載入角色分析面板中...</span>
        </div>
      }
    >
      <CharacterAnalysisPanel {...props} />
    </Suspense>
  );
};

export default LazyCharacterAnalysisPanel;