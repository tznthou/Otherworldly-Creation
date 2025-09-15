import React, { useState, useCallback } from 'react';

interface DraggableImageProps {
  imageId: string;
  imagePath: string;
  onDragStart?: (e: React.DragEvent, imageId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
  alt?: string;
}

interface DebugState {
  isDragging: boolean;
  dragStartCount: number;
  dragEndCount: number;
  lastEvent: string;
  lastTimestamp: number;
}

export const DraggableImage: React.FC<DraggableImageProps> = ({
  imageId,
  imagePath,
  onDragStart,
  onDragEnd,
  className = '',
  alt = ''
}) => {
  const [debugState, setDebugState] = useState<DebugState>({
    isDragging: false,
    dragStartCount: 0,
    dragEndCount: 0,
    lastEvent: '',
    lastTimestamp: 0
  });

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const timestamp = Date.now();
    setDebugState(prev => ({
      ...prev,
      isDragging: true,
      dragStartCount: prev.dragStartCount + 1,
      lastEvent: 'dragstart',
      lastTimestamp: timestamp
    }));

    console.log(`🟢 [DraggableImage-${imageId}] dragstart triggered`, {
      timestamp,
      dataTransferTypes: e.dataTransfer.types
    });

    if (onDragStart) {
      onDragStart(e, imageId);
    }
  }, [imageId, onDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const timestamp = Date.now();
    setDebugState(prev => ({
      ...prev,
      isDragging: false,
      dragEndCount: prev.dragEndCount + 1,
      lastEvent: 'dragend',
      lastTimestamp: timestamp
    }));

    console.log(`🔴 [DraggableImage-${imageId}] dragend triggered`, {
      timestamp,
      dropEffect: e.dataTransfer.dropEffect
    });

    if (onDragEnd) {
      onDragEnd(e);
    }
  }, [imageId, onDragEnd]);

  // 動態樣式：拖曳時綠色邊框，正常時紅色邊框
  const debugOutlineStyle = {
    outline: debugState.isDragging
      ? '3px solid #10B981' // 綠色 - 拖曳中
      : '2px solid #EF4444', // 紅色 - 正常
    outlineOffset: '2px',
    position: 'relative' as const
  };

  return (
    <div
      style={debugOutlineStyle}
      className={`relative ${className}`}
    >
      {/* Debug 標籤 */}
      <div className="absolute -top-6 -left-2 bg-black text-white text-xs px-2 py-1 rounded z-50 font-mono">
        <div>ID: {imageId.slice(-8)}</div>
        <div>Start: {debugState.dragStartCount} | End: {debugState.dragEndCount}</div>
        <div>Status: {debugState.isDragging ? '🟢 DRAGGING' : '🔴 IDLE'}</div>
        <div>Last: {debugState.lastEvent}</div>
      </div>

      {/* 拖曳狀態指示器 */}
      {debugState.isDragging && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 border-2 border-green-500 rounded flex items-center justify-center z-40">
          <div className="bg-green-600 text-white px-3 py-1 rounded-full font-bold text-sm">
            🚀 DRAGGING
          </div>
        </div>
      )}

      {/* 實際圖片 */}
      <img
        draggable
        src={imagePath}
        alt={alt || `Image ${imageId}`}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="w-full h-full object-cover cursor-move"
        style={{ pointerEvents: 'auto' }}
      />

      {/* 事件計數器氣泡 */}
      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold z-50">
        {debugState.dragStartCount}
      </div>
    </div>
  );
};

export default DraggableImage;