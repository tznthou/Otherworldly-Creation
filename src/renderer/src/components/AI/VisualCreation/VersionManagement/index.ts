// 版本管理組件統一導出
// 提供完整的版本管理 UI 組件集合

// 核心版本管理組件
export { default as VersionCard } from './VersionCard';
export { default as VersionTimeline } from './VersionTimeline';
export { default as VersionComparisonView } from './VersionComparisonView';
export { default as VersionDetailsPanel } from './VersionDetailsPanel';
export { default as VersionBranchView } from './VersionBranchView';

// 版本管理相關類型定義
export type {
  VersionCardProps,
  VersionCardMode,
} from './VersionCard';

export type {
  VersionTimelineProps,
  TimelineLayout,
  TimelineNode,
} from './VersionTimeline';

export type {
  VersionComparisonViewProps,
  ComparisonMode,
  ComparisonLayout,
} from './VersionComparisonView';

export type {
  VersionDetailsPanelProps,
  DetailTab,
  DetailSection,
} from './VersionDetailsPanel';

export type {
  VersionBranchViewProps,
  BranchViewMode,
  BranchLayout,
} from './VersionBranchView';

// 版本管理組件常量
export const VERSION_MANAGEMENT_CONSTANTS = {
  // 卡片尺寸
  CARD_SIZES: {
    small: { width: 120, height: 90 },
    medium: { width: 200, height: 150 },
    large: { width: 280, height: 210 },
  },
  
  // 時間線配置
  TIMELINE_CONFIG: {
    nodeSize: 12,
    lineWidth: 2,
    spacing: 40,
    labelOffset: 20,
  },
  
  // 比較視圖配置
  COMPARISON_CONFIG: {
    splitRatio: 0.5,
    minPanelWidth: 300,
    diffHighlightColor: '#fbbf24',
  },
  
  // 分支視圖配置
  BRANCH_CONFIG: {
    branchHeight: 60,
    nodeRadius: 8,
    curveRadius: 20,
    levelSpacing: 80,
  },
  
  // 動畫配置
  ANIMATION_CONFIG: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // 顏色主題
  COLORS: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    
    // 版本狀態顏色
    status: {
      active: '#10B981',
      archived: '#6B7280',
      deleted: '#EF4444',
      draft: '#F59E0B',
    },
    
    // 版本類型顏色
    type: {
      original: '#3B82F6',
      revision: '#8B5CF6',
      branch: '#10B981',
      merge: '#F59E0B',
    },
  },
} as const;