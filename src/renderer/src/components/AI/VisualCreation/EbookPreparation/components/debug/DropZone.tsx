import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DropZoneProps {
  zoneId: string;
  onDragOver?: (e: React.DragEvent, zoneId: string) => void;
  onDragEnter?: (e: React.DragEvent, zoneId: string) => void;
  onDragLeave?: (e: React.DragEvent, zoneId: string) => void;
  onDrop?: (e: React.DragEvent, zoneId: string) => void;
  children?: React.ReactNode;
  className?: string;
  title?: string;
}

interface DebugState {
  isHovered: boolean;
  dragOverCount: number;
  dragEnterCount: number;
  dragLeaveCount: number;
  dropCount: number;
  lastEvent: string;
  lastTimestamp: number;
  zIndex: number;
  elementDepth: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  zoneId,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  children,
  className = '',
  title = ''
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
  const [debugState, setDebugState] = useState<DebugState>({
    isHovered: false,
    dragOverCount: 0,
    dragEnterCount: 0,
    dragLeaveCount: 0,
    dropCount: 0,
    lastEvent: '',
    lastTimestamp: 0,
    zIndex: 0,
    elementDepth: 0
  });

  // 計算z-index和元素深度
  useEffect(() => {
    if (dropRef.current) {
      const computedStyle = window.getComputedStyle(dropRef.current);
      const zIndex = parseInt(computedStyle.zIndex) || 0;

      // 計算DOM深度
      let depth = 0;
      let element = dropRef.current.parentElement;
      while (element) {
        depth++;
        element = element.parentElement;
      }

      setDebugState(prev => ({
        ...prev,
        zIndex,
        elementDepth: depth
      }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const timestamp = Date.now();
    setDebugState(prev => ({
      ...prev,
      isHovered: true,
      dragOverCount: prev.dragOverCount + 1,
      lastEvent: 'dragover',
      lastTimestamp: timestamp
    }));

    console.log(`🟡 [DropZone-${zoneId}] dragover triggered`, {
      timestamp,
      clientX: e.clientX,
      clientY: e.clientY,
      dataTransferTypes: e.dataTransfer.types
    });

    if (onDragOver) {
      onDragOver(e, zoneId);
    }
  }, [zoneId, onDragOver]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const timestamp = Date.now();
    setDebugState(prev => ({
      ...prev,
      isHovered: true,
      dragEnterCount: prev.dragEnterCount + 1,
      lastEvent: 'dragenter',
      lastTimestamp: timestamp
    }));

    console.log(`🟢 [DropZone-${zoneId}] dragenter triggered`, {
      timestamp,
      target: e.target,
      currentTarget: e.currentTarget
    });

    if (onDragEnter) {
      onDragEnter(e, zoneId);
    }
  }, [zoneId, onDragEnter]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const timestamp = Date.now();
    setDebugState(prev => ({
      ...prev,
      isHovered: false,
      dragLeaveCount: prev.dragLeaveCount + 1,
      lastEvent: 'dragleave',
      lastTimestamp: timestamp
    }));

    console.log(`🔵 [DropZone-${zoneId}] dragleave triggered`, {
      timestamp,
      relatedTarget: e.relatedTarget
    });

    if (onDragLeave) {
      onDragLeave(e, zoneId);
    }
  }, [zoneId, onDragLeave]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const timestamp = Date.now();
    setDebugState(prev => ({
      ...prev,
      isHovered: false,
      dropCount: prev.dropCount + 1,
      lastEvent: 'drop',
      lastTimestamp: timestamp
    }));

    console.log(`✅ [DropZone-${zoneId}] drop triggered`, {
      timestamp,
      dataTransfer: e.dataTransfer.getData('text/plain'),
      effect: e.dataTransfer.dropEffect
    });

    if (onDrop) {
      onDrop(e, zoneId);
    }
  }, [zoneId, onDrop]);

  // 動態樣式：hover時黃色實線，正常時藍色虛線
  const debugOutlineStyle = {
    outline: debugState.isHovered
      ? '3px solid #F59E0B' // 黃色 - dragover時
      : '2px dashed #3B82F6', // 藍色虛線 - 正常
    outlineOffset: '4px',
    position: 'relative' as const,
    minHeight: '100px'
  };

  return (
    <div
      ref={dropRef}
      style={debugOutlineStyle}
      className={`relative ${className}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Debug 標籤 */}
      <div className="absolute -top-12 -left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded z-50 font-mono">
        <div>Zone: {zoneId}</div>
        <div>Over: {debugState.dragOverCount} | Enter: {debugState.dragEnterCount}</div>
        <div>Leave: {debugState.dragLeaveCount} | Drop: {debugState.dropCount}</div>
        <div>Z-Index: {debugState.zIndex} | Depth: {debugState.elementDepth}</div>
        <div>Status: {debugState.isHovered ? '🟡 HOVER' : '🔵 IDLE'}</div>
      </div>

      {/* 區域標題 */}
      {title && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold z-40">
          {title}
        </div>
      )}

      {/* Hover 狀態指示器 */}
      {debugState.isHovered && (
        <div className="absolute inset-0 bg-yellow-400 bg-opacity-20 border-2 border-yellow-400 rounded flex items-center justify-center z-30">
          <div className="bg-yellow-600 text-white px-3 py-1 rounded-full font-bold text-sm">
            🎯 DROP ZONE ACTIVE
          </div>
        </div>
      )}

      {/* 半透明overlay顯示可放置區域 */}
      <div className="absolute inset-0 bg-blue-500 bg-opacity-5 border border-blue-300 border-dashed rounded z-10" />

      {/* 事件計數器 */}
      <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold z-50">
        <div className="text-center">
          <div>{debugState.dragOverCount}</div>
          <div className="text-xs">over</div>
        </div>
      </div>

      <div className="absolute bottom-2 right-2 bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold z-50">
        <div className="text-center">
          <div>{debugState.dropCount}</div>
          <div className="text-xs">drop</div>
        </div>
      </div>

      {/* 內容區域 */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
};

export default DropZone;