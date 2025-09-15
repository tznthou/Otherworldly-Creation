import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragCancelEvent,
} from '@dnd-kit/core';
import { DebugPanel } from './DebugPanel';

/**
 * @dnd-kit 拖曳測試組件
 *
 * 目的：
 * 1. 測試@dnd-kit在Tauri環境中的兼容性
 * 2. 對比@dnd-kit與原生HTML5拖曳的行為差異
 * 3. 驗證@dnd-kit是否已解決跨平台兼容性問題
 * 4. 為最終解決方案提供參考實現
 *
 * @dnd-kit優勢：
 * - 跨平台兼容性
 * - 現代Hook API
 * - 內建accessibility支持
 * - 豐富的傳感器選項
 * - 高度可定制
 */

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
}

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
}

interface DndKitTestState {
  activeDragId: string | null;
  droppedItems: Record<string, string[]>;
  eventCounts: {
    dragStart: number;
    dragOver: number;
    dragEnd: number;
    dragCancel: number;
  };
  lastEvent: string | null;
  debugInfo: Record<string, any>;
}

// 可拖曳項目組件
const DraggableItem: React.FC<DraggableItemProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        relative cursor-move transition-all duration-200
        ${isDragging
          ? 'opacity-50 scale-110 ring-4 ring-green-400 ring-opacity-50'
          : 'hover:scale-105'
        }
      `}
    >
      {/* Debug Outline */}
      <div
        className="absolute inset-0 -m-1 rounded"
        style={{
          outline: isDragging ? '3px solid #10B981' : '2px solid #6366F1',
          outlineOffset: '2px'
        }}
      />

      {/* Debug Badge */}
      <div className="absolute -top-6 -left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded z-50 font-mono">
        DnD-Kit: {id}
      </div>

      {/* Dragging Indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 border-2 border-green-500 rounded flex items-center justify-center z-40">
          <div className="bg-green-600 text-white px-2 py-1 rounded text-sm font-bold">
            🚀 DRAGGING
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

// 放置區域組件
const DroppableArea: React.FC<DroppableAreaProps> = ({ id, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative min-h-32 p-4 rounded-lg border-2 border-dashed transition-all duration-200
        ${isOver
          ? 'border-yellow-400 bg-yellow-50 scale-105'
          : 'border-blue-300 bg-blue-50'
        }
      `}
      style={{
        outline: isOver ? '3px solid #F59E0B' : '2px dashed #3B82F6',
        outlineOffset: '4px'
      }}
    >
      {/* Debug Badge */}
      <div className="absolute -top-6 -left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded z-50 font-mono">
        Zone: {id} {isOver && '(HOVER)'}
      </div>

      {/* Hover Indicator */}
      {isOver && (
        <div className="absolute inset-0 bg-yellow-400 bg-opacity-20 border-2 border-yellow-400 rounded flex items-center justify-center z-30">
          <div className="bg-yellow-600 text-white px-3 py-1 rounded-full font-bold text-sm">
            🎯 READY TO DROP
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export const DndKitTest: React.FC = () => {
  const [testState, setTestState] = useState<DndKitTestState>({
    activeDragId: null,
    droppedItems: {
      'zone-1': [],
      'zone-2': [],
      'zone-3': []
    },
    eventCounts: {
      dragStart: 0,
      dragOver: 0,
      dragEnd: 0,
      dragCancel: 0
    },
    lastEvent: null,
    debugInfo: {}
  });

  // 配置傳感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動距離後才開始拖曳
      },
    })
  );

  // 重置測試
  const resetTest = useCallback(() => {
    setTestState({
      activeDragId: null,
      droppedItems: {
        'zone-1': [],
        'zone-2': [],
        'zone-3': []
      },
      eventCounts: {
        dragStart: 0,
        dragOver: 0,
        dragEnd: 0,
        dragCancel: 0
      },
      lastEvent: null,
      debugInfo: {}
    });
    console.log('🔄 [DndKitTest] 測試重置');
  }, []);

  // 拖曳開始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('🟢 [DndKitTest] DragStart', {
      activeId: event.active.id,
      activatorEvent: event.activatorEvent,
      active: event.active
    });

    setTestState(prev => ({
      ...prev,
      activeDragId: String(event.active.id),
      eventCounts: {
        ...prev.eventCounts,
        dragStart: prev.eventCounts.dragStart + 1
      },
      lastEvent: 'dragStart',
      debugInfo: {
        activeId: event.active.id,
        activatorEvent: event.activatorEvent?.type,
        timestamp: Date.now()
      }
    }));
  }, []);

  // 拖曳懸停
  const handleDragOver = useCallback((event: DragOverEvent) => {
    console.log('🟡 [DndKitTest] DragOver', {
      activeId: event.active.id,
      overId: event.over?.id,
      delta: event.delta
    });

    setTestState(prev => ({
      ...prev,
      eventCounts: {
        ...prev.eventCounts,
        dragOver: prev.eventCounts.dragOver + 1
      },
      lastEvent: 'dragOver',
      debugInfo: {
        ...prev.debugInfo,
        overId: event.over?.id,
        delta: event.delta
      }
    }));
  }, []);

  // 拖曳結束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    console.log('✅ [DndKitTest] DragEnd', {
      activeId: event.active.id,
      overId: event.over?.id,
      activatorEvent: event.activatorEvent
    });

    const { active, over } = event;

    if (over && active.id !== over.id) {
      // 成功放置到目標區域
      setTestState(prev => ({
        ...prev,
        activeDragId: null,
        droppedItems: {
          ...prev.droppedItems,
          [over.id]: [...prev.droppedItems[over.id as keyof typeof prev.droppedItems], String(active.id)]
        },
        eventCounts: {
          ...prev.eventCounts,
          dragEnd: prev.eventCounts.dragEnd + 1
        },
        lastEvent: 'dragEnd (success)',
        debugInfo: {
          ...prev.debugInfo,
          result: 'success',
          droppedTo: over.id
        }
      }));
    } else {
      // 拖曳取消或放置到原位置
      setTestState(prev => ({
        ...prev,
        activeDragId: null,
        eventCounts: {
          ...prev.eventCounts,
          dragEnd: prev.eventCounts.dragEnd + 1
        },
        lastEvent: 'dragEnd (cancelled)',
        debugInfo: {
          ...prev.debugInfo,
          result: 'cancelled'
        }
      }));
    }
  }, []);

  // 拖曳取消
  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    console.log('🔴 [DndKitTest] DragCancel', event);

    setTestState(prev => ({
      ...prev,
      activeDragId: null,
      eventCounts: {
        ...prev.eventCounts,
        dragCancel: prev.eventCounts.dragCancel + 1
      },
      lastEvent: 'dragCancel'
    }));
  }, []);

  // 清除特定區域的項目
  const clearZone = useCallback((zoneId: string) => {
    setTestState(prev => ({
      ...prev,
      droppedItems: {
        ...prev.droppedItems,
        [zoneId]: []
      }
    }));
  }, []);

  const totalDropped = Object.values(testState.droppedItems).flat().length;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 標題和控制 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🚀 @dnd-kit 拖曳測試</h2>
            <button
              onClick={resetTest}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
            >
              重置測試
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-700">當前狀態</div>
              <div>拖曳中: {testState.activeDragId ? `🟢 ${testState.activeDragId}` : '🔴 無'}</div>
              <div>最後事件: {testState.lastEvent || '無'}</div>
              <div>總放置: {totalDropped} 項目</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">事件統計</div>
              <div>開始: {testState.eventCounts.dragStart}</div>
              <div>懸停: {testState.eventCounts.dragOver}</div>
              <div>結束: {testState.eventCounts.dragEnd}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">Debug資訊</div>
              <div className="text-xs space-y-1">
                {Object.entries(testState.debugInfo).slice(0, 3).map(([key, value]) => (
                  <div key={key}>{key}: {String(value).slice(0, 20)}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* 拖曳源區域 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">🎯 拖曳源 (@dnd-kit)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['item-1', 'item-2', 'item-3', 'item-4'].map(itemId => (
                <DraggableItem key={itemId} id={itemId}>
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                    <div className="text-center">
                      <div className="text-lg">📦</div>
                      <div className="text-xs">{itemId}</div>
                    </div>
                  </div>
                </DraggableItem>
              ))}
            </div>
          </div>

          {/* 放置區域 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['zone-1', 'zone-2', 'zone-3'].map((zoneId, index) => (
              <div key={zoneId} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">
                    📥 放置區域 {index + 1}
                  </h3>
                  <button
                    onClick={() => clearZone(zoneId)}
                    className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                  >
                    清除
                  </button>
                </div>

                <DroppableArea id={zoneId}>
                  <div className="min-h-32 flex flex-col items-center justify-center">
                    {testState.droppedItems[zoneId as keyof typeof testState.droppedItems].length === 0 ? (
                      <div className="text-center text-gray-500">
                        <div className="text-2xl mb-2">📥</div>
                        <div className="text-sm">拖曳項目到這裡</div>
                      </div>
                    ) : (
                      <div className="space-y-2 w-full">
                        {testState.droppedItems[zoneId as keyof typeof testState.droppedItems].map((itemId, idx) => (
                          <div
                            key={`${itemId}-${idx}`}
                            className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm text-center"
                          >
                            ✅ {itemId}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DroppableArea>

                <div className="mt-2 text-xs text-gray-500 text-center">
                  已放置: {testState.droppedItems[zoneId as keyof typeof testState.droppedItems].length} 項目
                </div>
              </div>
            ))}
          </div>

          {/* DragOverlay 用於拖曳時的視覺反饋 */}
          <DragOverlay>
            {testState.activeDragId ? (
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-2xl transform rotate-3 scale-110">
                <div className="text-center">
                  <div className="text-lg">🚀</div>
                  <div className="text-xs">{testState.activeDragId}</div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* 測試結果 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">📊 @dnd-kit 測試結果</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {Object.entries(testState.eventCounts).map(([eventType, count]) => (
              <div key={eventType} className={`p-3 rounded text-center ${count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <div className="font-semibold capitalize">{eventType}</div>
                <div className="text-lg font-bold">{count}</div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 rounded">
            <div className="font-semibold text-blue-700 mb-2">測試狀態</div>
            <div className="text-sm text-blue-600">
              {testState.eventCounts.dragStart > 0 && testState.eventCounts.dragEnd > 0 && totalDropped > 0 ? (
                <span className="text-green-600">✅ @dnd-kit 拖曳功能正常工作</span>
              ) : testState.eventCounts.dragStart > 0 ? (
                <span className="text-yellow-600">⚠️ 拖曳已開始，等待放置結果...</span>
              ) : (
                <span className="text-gray-600">等待開始測試...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Debug面板 */}
      <DebugPanel />
    </div>
  );
};

export default DndKitTest;