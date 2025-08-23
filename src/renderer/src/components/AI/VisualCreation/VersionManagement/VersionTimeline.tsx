import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ImageVersion, VersionTree, VersionTreeNode } from '../../../../types/versionManagement';
import VersionCard from './VersionCard';
import { VERSION_MANAGEMENT_CONSTANTS } from './index';

// 靜態常量，避免每次渲染創建新引用
const EMPTY_EXPANDED_NODES: string[] = [];
const EMPTY_VERSIONS: ImageVersion[] = [];

// 時間線布局模式
export type TimelineLayout = 'vertical' | 'horizontal';

// 時間線節點資料
export interface TimelineNode {
  id: string;
  version: ImageVersion;
  x: number;
  y: number;
  children: TimelineNode[];
  depth: number;
  isExpanded: boolean;
  branchName?: string;
  branchColor?: string;
}

// 版本時間線屬性
export interface VersionTimelineProps {
  // 核心資料
  versionTree?: VersionTree;
  versions?: ImageVersion[];
  
  // 顯示配置
  layout?: TimelineLayout;
  showBranches?: boolean;
  showLabels?: boolean;
  showMiniCards?: boolean;
  maxDepth?: number;
  
  // 尺寸配置
  nodeSize?: number;
  levelSpacing?: number;
  nodeSpacing?: number;
  
  // 狀態
  selectedVersionId?: string;
  expandedNodeIds?: string[];
  
  // 事件回調
  onVersionSelect?: (version: ImageVersion) => void;
  onVersionCompare?: (version: ImageVersion) => void;
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
  onBranchCreate?: (sourceVersionId: string) => void;
  
  // 樣式
  className?: string;
  style?: React.CSSProperties;
}

const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versionTree,
  versions = EMPTY_VERSIONS,
  layout = 'vertical',
  showBranches = true,
  showLabels = true,
  showMiniCards = true,
  maxDepth = 10,
  nodeSize = VERSION_MANAGEMENT_CONSTANTS.TIMELINE_CONFIG.nodeSize,
  levelSpacing = VERSION_MANAGEMENT_CONSTANTS.TIMELINE_CONFIG.spacing,
  nodeSpacing = VERSION_MANAGEMENT_CONSTANTS.TIMELINE_CONFIG.spacing,
  selectedVersionId,
  expandedNodeIds = EMPTY_EXPANDED_NODES,
  onVersionSelect,
  onVersionCompare,
  onNodeExpand,
  _onBranchCreate,
  className = '',
  style,
}) => {
  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 本地狀態
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // 建構時間線節點
  const timelineNodes = useMemo(() => {
    // 從版本樹建構時間線的內聯函數
    const buildFromTree = (
      tree: VersionTree,
      layout: TimelineLayout,
      levelSpacing: number,
      nodeSpacing: number,
      expandedIds: string[],
      maxDepth: number
    ): TimelineNode[] => {
      const nodes: TimelineNode[] = [];
      
      const buildNode = (treeNode: VersionTreeNode, depth: number, x: number, y: number): TimelineNode => {
        const isExpanded = expandedIds.includes(treeNode.version.id);
        
        const timelineNode: TimelineNode = {
          id: treeNode.version.id,
          version: treeNode.version,
          x,
          y,
          children: [],
          depth,
          isExpanded,
          branchName: treeNode.branchInfo?.name,
          branchColor: treeNode.branchInfo?.color,
        };
        
        nodes.push(timelineNode);
        
        // 處理子節點
        if (isExpanded && depth < maxDepth && treeNode.children.length > 0) {
          treeNode.children.forEach((child, index) => {
            const childX = layout === 'horizontal' ? x + levelSpacing : x + (index - (treeNode.children.length - 1) / 2) * nodeSpacing;
            const childY = layout === 'horizontal' ? y + (index - (treeNode.children.length - 1) / 2) * nodeSpacing : y + levelSpacing;
            
            const childNode = buildNode(child, depth + 1, childX, childY);
            timelineNode.children.push(childNode);
          });
        }
        
        return timelineNode;
      };
      
      if (tree.tree) {
        buildNode(tree.tree, 0, 0, 0);
      }
      return nodes;
    };

    // 從版本列表建構簡單時間線的內聯函數
    const buildFromVersions = (
      versions: ImageVersion[],
      layout: TimelineLayout,
      levelSpacing: number,
      _nodeSpacing: number
    ): TimelineNode[] => {
      // 按創建時間排序
      const sortedVersions = [...versions].sort((a, b) => {
        const aTime = a.metadata?.createdAt || '1970-01-01T00:00:00.000Z';
        const bTime = b.metadata?.createdAt || '1970-01-01T00:00:00.000Z';
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });
      
      return sortedVersions.map((version, index) => ({
        id: version.id,
        version,
        x: layout === 'horizontal' ? index * levelSpacing : 0,
        y: layout === 'horizontal' ? 0 : index * levelSpacing,
        children: [],
        depth: 0,
        isExpanded: true,
      }));
    };

    // 主邏輯
    if (versionTree) {
      return buildFromTree(versionTree, layout, levelSpacing, nodeSpacing, expandedNodeIds, maxDepth);
    } else if (versions.length > 0) {
      return buildFromVersions(versions, layout, levelSpacing, nodeSpacing);
    }
    return [];
  }, [versionTree, versions, layout, levelSpacing, nodeSpacing, expandedNodeIds, maxDepth]);

  // 計算邊界框
  const bounds = useMemo(() => {
    if (timelineNodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    
    const xs = timelineNodes.map(node => node.x);
    const ys = timelineNodes.map(node => node.y);
    
    return {
      minX: Math.min(...xs) - 100,
      minY: Math.min(...ys) - 100,
      maxX: Math.max(...xs) + 100,
      maxY: Math.max(...ys) + 100,
    };
  }, [timelineNodes]);

  // 更新視圖框
  useEffect(() => {
    setViewBox({
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
    });
  }, [bounds]);


  // 處理節點點擊
  const handleNodeClick = useCallback((node: TimelineNode) => {
    if (onVersionSelect) {
      onVersionSelect(node.version);
    }
  }, [onVersionSelect]);

  // 處理節點展開/摺疊
  const handleNodeToggle = useCallback((node: TimelineNode) => {
    if (onNodeExpand) {
      onNodeExpand(node.id, !node.isExpanded);
    }
  }, [onNodeExpand]);

  // 處理滾輪縮放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, scale * factor));
    setScale(newScale);
  }, [scale]);

  // 處理拖拽開始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // 處理拖拽
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx / scale,
      y: prev.y - dy / scale,
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastMousePos, scale]);

  // 處理拖拽結束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 渲染連接線
  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    timelineNodes.forEach(node => {
      node.children.forEach(child => {
        const pathId = `connection-${node.id}-${child.id}`;
        
        if (layout === 'horizontal') {
          // 水平布局：使用貝塞爾曲線
          const midX = (node.x + child.x) / 2;
          const path = `M ${node.x + nodeSize} ${node.y} C ${midX} ${node.y} ${midX} ${child.y} ${child.x - nodeSize} ${child.y}`;
          
          connections.push(
            <path
              key={pathId}
              d={path}
              stroke={child.branchColor || VERSION_MANAGEMENT_CONSTANTS.COLORS.secondary}
              strokeWidth={VERSION_MANAGEMENT_CONSTANTS.TIMELINE_CONFIG.lineWidth}
              fill="none"
              className="transition-colors duration-200"
            />
          );
        } else {
          // 垂直布局：直線或曲線
          const midY = (node.y + child.y) / 2;
          const path = node.x === child.x 
            ? `M ${node.x} ${node.y + nodeSize} L ${child.x} ${child.y - nodeSize}`
            : `M ${node.x} ${node.y + nodeSize} C ${node.x} ${midY} ${child.x} ${midY} ${child.x} ${child.y - nodeSize}`;
          
          connections.push(
            <path
              key={pathId}
              d={path}
              stroke={child.branchColor || VERSION_MANAGEMENT_CONSTANTS.COLORS.secondary}
              strokeWidth={VERSION_MANAGEMENT_CONSTANTS.TIMELINE_CONFIG.lineWidth}
              fill="none"
              className="transition-colors duration-200"
            />
          );
        }
      });
    });
    
    return connections;
  };

  // 渲染節點
  const renderNodes = () => {
    return timelineNodes.map(node => {
      const isSelected = selectedVersionId === node.id;
      const hasChildren = node.children.length > 0;
      
      return (
        <g key={node.id} className="timeline-node">
          {/* 節點圓圈 */}
          <circle
            cx={node.x}
            cy={node.y}
            r={nodeSize}
            fill={isSelected ? VERSION_MANAGEMENT_CONSTANTS.COLORS.primary : 'white'}
            stroke={node.branchColor || VERSION_MANAGEMENT_CONSTANTS.COLORS.secondary}
            strokeWidth={2}
            className="cursor-pointer hover:stroke-blue-500 transition-colors duration-200"
            onClick={() => handleNodeClick(node)}
          />
          
          {/* 版本號 */}
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs font-medium fill-current pointer-events-none"
            fill={isSelected ? 'white' : VERSION_MANAGEMENT_CONSTANTS.COLORS.secondary}
          >
            {node.version.versionNumber}
          </text>
          
          {/* 展開/摺疊按鈕 */}
          {hasChildren && (
            <circle
              cx={node.x + nodeSize + 8}
              cy={node.y}
              r={6}
              fill={VERSION_MANAGEMENT_CONSTANTS.COLORS.primary}
              className="cursor-pointer hover:fill-blue-600 transition-colors duration-200"
              onClick={() => handleNodeToggle(node)}
            />
          )}
          
          {hasChildren && (
            <text
              x={node.x + nodeSize + 8}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-xs font-medium fill-white pointer-events-none"
            >
              {node.isExpanded ? '−' : '+'}
            </text>
          )}
          
          {/* 標籤 */}
          {showLabels && (
            <text
              x={node.x}
              y={node.y + nodeSize + VERSION_MANAGEMENT_CONSTANTS.TIMELINE_CONFIG.labelOffset}
              textAnchor="middle"
              className="text-xs fill-gray-600 pointer-events-none"
            >
              {node.version.metadata.title || `版本 ${node.version.versionNumber}`}
            </text>
          )}
          
          {/* 分支標籤 */}
          {showBranches && node.branchName && (
            <text
              x={node.x}
              y={node.y - nodeSize - 8}
              textAnchor="middle"
              className="text-xs fill-current pointer-events-none"
              fill={node.branchColor}
            >
              {node.branchName}
            </text>
          )}
        </g>
      );
    });
  };

  // 渲染迷你卡片
  const renderMiniCards = () => {
    if (!showMiniCards) return null;
    
    return timelineNodes.map(node => {
      if (!selectedVersionId || selectedVersionId !== node.id) return null;
      
      return (
        <foreignObject
          key={`card-${node.id}`}
          x={node.x + nodeSize + 20}
          y={node.y - 75}
          width="200"
          height="150"
        >
          <VersionCard
            version={node.version}
            mode="compact"
            size="small"
            showActions={false}
            onSelect={onVersionSelect}
            onCompare={onVersionCompare}
          />
        </foreignObject>
      );
    });
  };

  return (
    <div 
      ref={containerRef}
      className={`version-timeline relative w-full h-full overflow-hidden bg-gray-50 ${className}`}
      style={style}
    >
      {/* 工具列 */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
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
        <button
          onClick={() => setScale(1)}
          className="px-3 py-1 bg-white shadow-sm border border-gray-200 rounded text-sm hover:bg-gray-50"
        >
          重置
        </button>
      </div>
      
      {/* 時間線 SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {/* 背景網格 */}
        <defs>
          <pattern
            id="grid"
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
          fill="url(#grid)"
        />
        
        {/* 連接線 */}
        {renderConnections()}
        
        {/* 節點 */}
        {renderNodes()}
        
        {/* 迷你卡片 */}
        {renderMiniCards()}
      </svg>
      
      {/* 空狀態 */}
      {timelineNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">沒有版本資料</p>
            <p className="text-sm text-gray-400">創建第一個版本來開始使用時間線功能</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionTimeline;