import React, { useState, useCallback, useMemo } from 'react';
import { ImageVersion, VersionTree } from '../../../../types/versionManagement';
import { VERSION_MANAGEMENT_CONSTANTS } from './index';

// 分支視圖模式
export type BranchViewMode = 'tree' | 'linear' | 'compact';

// 分支布局
export type BranchLayout = 'horizontal' | 'vertical';

// 分支視圖屬性
export interface VersionBranchViewProps {
  // 核心資料
  versionTree?: VersionTree;
  versions?: ImageVersion[];
  
  // 顯示配置
  mode?: BranchViewMode;
  layout?: BranchLayout;
  showLabels?: boolean;
  showBranchColors?: boolean;
  showMergeLines?: boolean;
  
  // 尺寸配置
  branchHeight?: number;
  nodeRadius?: number;
  levelSpacing?: number;
  
  // 狀態
  selectedVersionId?: string;
  selectedBranchId?: string;
  
  // 事件回調
  onVersionSelect?: (version: ImageVersion) => void;
  onBranchSelect?: (branchId: string) => void;
  onBranchCreate?: (sourceVersionId: string) => void;
  onBranchMerge?: (sourceBranchId: string, targetBranchId: string) => void;
  
  // 樣式
  className?: string;
  style?: React.CSSProperties;
}

const VersionBranchView: React.FC<VersionBranchViewProps> = ({
  versionTree,
  versions = [],
  mode = 'tree',
  layout = 'horizontal',
  showLabels = true,
  showBranchColors = true,
  showMergeLines = true,
  branchHeight = VERSION_MANAGEMENT_CONSTANTS.BRANCH_CONFIG.branchHeight,
  nodeRadius = VERSION_MANAGEMENT_CONSTANTS.BRANCH_CONFIG.nodeRadius,
  levelSpacing = VERSION_MANAGEMENT_CONSTANTS.BRANCH_CONFIG.levelSpacing,
  selectedVersionId,
  selectedBranchId,
  onVersionSelect,
  onBranchSelect,
  onBranchCreate,
  onBranchMerge,
  className = '',
  style,
}) => {
  // 本地狀態
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [scale, setScale] = useState(1);

  // 處理版本選擇
  const handleVersionSelect = useCallback((version: ImageVersion) => {
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  }, [onVersionSelect]);

  // 處理分支選擇
  const handleBranchSelect = useCallback((branchId: string) => {
    if (onBranchSelect) {
      onBranchSelect(branchId);
    }
  }, [onBranchSelect]);

  // 渲染分支圖表
  const renderBranchChart = () => {
    if (!versionTree && versions.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-4">🌳</div>
            <p className="text-lg font-medium">沒有分支資料</p>
            <p className="text-sm text-gray-400">創建第一個版本來開始使用分支功能</p>
          </div>
        </div>
      );
    }

    // 簡單的分支視圖實現
    return (
      <div className="h-full overflow-auto">
        <svg className="w-full h-full" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
          {/* 背景網格 */}
          <defs>
            <pattern
              id="branch-grid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            fill="url(#branch-grid)"
          />

          {/* 主分支線 */}
          <line
            x1="50"
            y1={viewBox.height / 2}
            x2={viewBox.width - 50}
            y2={viewBox.height / 2}
            stroke={VERSION_MANAGEMENT_CONSTANTS.COLORS.primary}
            strokeWidth="3"
          />

          {/* 版本節點 */}
          {versions.slice(0, 5).map((version, index) => {
            const x = 100 + index * 150;
            const y = viewBox.height / 2;
            const isSelected = selectedVersionId === version.id;

            return (
              <g key={version.id}>
                {/* 節點圓圈 */}
                <circle
                  cx={x}
                  cy={y}
                  r={nodeRadius}
                  fill={isSelected ? VERSION_MANAGEMENT_CONSTANTS.COLORS.primary : 'white'}
                  stroke={VERSION_MANAGEMENT_CONSTANTS.COLORS.primary}
                  strokeWidth="2"
                  className="cursor-pointer hover:stroke-blue-600 transition-colors"
                  onClick={() => handleVersionSelect(version)}
                />

                {/* 版本號 */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-xs font-medium pointer-events-none"
                  fill={isSelected ? 'white' : VERSION_MANAGEMENT_CONSTANTS.COLORS.primary}
                >
                  v{version.versionNumber}
                </text>

                {/* 標籤 */}
                {showLabels && (
                  <text
                    x={x}
                    y={y + nodeRadius + 15}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 pointer-events-none"
                  >
                    {version.metadata.title || `版本 ${version.versionNumber}`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div
      className={`version-branch-view relative w-full h-full bg-gray-50 ${className}`}
      style={style}
    >
      {/* 工具列 */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <select
          value={mode}
          onChange={(e) => {/* TODO: 處理模式切換 */}}
          className="px-3 py-1 bg-white shadow-sm border border-gray-200 rounded text-sm"
        >
          <option value="tree">樹狀視圖</option>
          <option value="linear">線性視圖</option>
          <option value="compact">緊湊視圖</option>
        </select>
        
        <button
          onClick={() => setScale(prev => Math.min(3, prev * 1.2))}
          className="px-3 py-1 bg-white shadow-sm border border-gray-200 rounded text-sm hover:bg-gray-50"
        >
          放大
        </button>
        
        <button
          onClick={() => setScale(prev => Math.max(0.1, prev / 1.2))}
          className="px-3 py-1 bg-white shadow-sm border border-gray-200 rounded text-sm hover:bg-gray-50"
        >
          縮小
        </button>
      </div>

      {/* 分支圖表內容 */}
      <div className="w-full h-full" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        {renderBranchChart()}
      </div>
    </div>
  );
};

export default VersionBranchView;