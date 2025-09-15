import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DebugPanel } from './DebugPanel';

/**
 * 原生事件監聽測試組件
 *
 * 目的：
 * 1. 繞過React合成事件系統，直接使用原生DOM事件
 * 2. 在document層級使用事件捕獲來攔截所有拖曳事件
 * 3. 對比React事件系統和原生事件的行為差異
 * 4. 為Tauri環境下的拖曳問題提供替代解決方案
 *
 * 原理：
 * - 使用addEventListener而非React onDrag*屬性
 * - 在捕獲階段(capture: true)處理事件
 * - 通過Element.contains()判斷事件目標
 */

interface NativeTestState {
  isDragging: boolean;
  draggedData: string | null;
  currentTarget: string | null;
  eventCounts: {
    dragstart: number;
    dragover: number;
    dragenter: number;
    dragleave: number;
    drop: number;
    dragend: number;
  };
  lastNativeEvent: string | null;
  reactEventsFired: string[];
}

export const NativeEventTest: React.FC = () => {
  const [testState, setTestState] = useState<NativeTestState>({
    isDragging: false,
    draggedData: null,
    currentTarget: null,
    eventCounts: {
      dragstart: 0,
      dragover: 0,
      dragenter: 0,
      dragleave: 0,
      drop: 0,
      dragend: 0
    },
    lastNativeEvent: null,
    reactEventsFired: []
  });

  const draggableRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const eventListenersRef = useRef<{ [key: string]: EventListener }>({});

  // 重置測試
  const resetTest = useCallback(() => {
    setTestState({
      isDragging: false,
      draggedData: null,
      currentTarget: null,
      eventCounts: {
        dragstart: 0,
        dragover: 0,
        dragenter: 0,
        dragleave: 0,
        drop: 0,
        dragend: 0
      },
      lastNativeEvent: null,
      reactEventsFired: []
    });
    console.log('🔄 [NativeTest] 測試重置');
  }, []);

  // 檢查元素是否在放置區域內
  const isInDropZone = useCallback((target: EventTarget | null): boolean => {
    if (!target || !dropZoneRef.current) return false;
    return dropZoneRef.current.contains(target as Node);
  }, []);

  // 更新事件計數
  const updateEventCount = useCallback((eventType: keyof NativeTestState['eventCounts']) => {
    setTestState(prev => ({
      ...prev,
      eventCounts: {
        ...prev.eventCounts,
        [eventType]: prev.eventCounts[eventType] + 1
      },
      lastNativeEvent: eventType
    }));
  }, []);

  // 原生事件處理器
  useEffect(() => {
    // DragStart Handler
    const handleNativeDragStart = (e: DragEvent) => {
      if (!draggableRef.current?.contains(e.target as Node)) return;

      const testData = 'native-test-' + Date.now();
      console.log('🟢 [NativeTest] Native dragstart', { testData, target: e.target });

      if (e.dataTransfer) {
        e.dataTransfer.clearData();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', testData);
      }

      setTestState(prev => ({
        ...prev,
        isDragging: true,
        draggedData: testData
      }));
      updateEventCount('dragstart');
    };

    // DragOver Handler
    const handleNativeDragOver = (e: DragEvent) => {
      if (!isInDropZone(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }

      console.log('🟡 [NativeTest] Native dragover', {
        target: e.target,
        clientX: e.clientX,
        clientY: e.clientY
      });

      setTestState(prev => ({
        ...prev,
        currentTarget: 'dropzone'
      }));
      updateEventCount('dragover');
    };

    // DragEnter Handler
    const handleNativeDragEnter = (e: DragEvent) => {
      if (!isInDropZone(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      console.log('🔵 [NativeTest] Native dragenter', { target: e.target });
      updateEventCount('dragenter');
    };

    // DragLeave Handler
    const handleNativeDragLeave = (e: DragEvent) => {
      // 需要檢查是否真的離開了dropZone
      if (!dropZoneRef.current?.contains(e.target as Node)) return;

      console.log('🟣 [NativeTest] Native dragleave', { target: e.target });

      setTestState(prev => ({
        ...prev,
        currentTarget: null
      }));
      updateEventCount('dragleave');
    };

    // Drop Handler
    const handleNativeDrop = (e: DragEvent) => {
      if (!isInDropZone(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      const receivedData = e.dataTransfer?.getData('text/plain') || '';
      console.log('✅ [NativeTest] Native drop', {
        target: e.target,
        data: receivedData
      });

      setTestState(prev => ({
        ...prev,
        currentTarget: null
      }));
      updateEventCount('drop');
    };

    // DragEnd Handler
    const handleNativeDragEnd = (e: DragEvent) => {
      if (!draggableRef.current?.contains(e.target as Node)) return;

      console.log('🔴 [NativeTest] Native dragend', { target: e.target });

      setTestState(prev => ({
        ...prev,
        isDragging: false,
        draggedData: null,
        currentTarget: null
      }));
      updateEventCount('dragend');
    };

    // 註冊原生事件監聽器（使用捕獲階段）
    const eventOptions = { capture: true, passive: false };

    eventListenersRef.current = {
      dragstart: handleNativeDragStart,
      dragover: handleNativeDragOver,
      dragenter: handleNativeDragEnter,
      dragleave: handleNativeDragLeave,
      drop: handleNativeDrop,
      dragend: handleNativeDragEnd
    };

    // 添加監聽器
    Object.entries(eventListenersRef.current).forEach(([eventType, handler]) => {
      document.addEventListener(eventType, handler, eventOptions);
    });

    console.log('🎯 [NativeTest] 原生事件監聽器已註冊');

    // 清理函數
    return () => {
      Object.entries(eventListenersRef.current).forEach(([eventType, handler]) => {
        document.removeEventListener(eventType, handler, eventOptions);
      });
      console.log('🗑️ [NativeTest] 原生事件監聽器已清理');
    };
  }, [isInDropZone, updateEventCount]);

  // React事件處理器（用於對比）
  const handleReactDragStart = useCallback((e: React.DragEvent) => {
    console.log('⚛️ [NativeTest] React dragstart triggered');
    setTestState(prev => ({
      ...prev,
      reactEventsFired: [...prev.reactEventsFired, 'React dragstart']
    }));
  }, []);

  const handleReactDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('⚛️ [NativeTest] React dragover triggered');
    setTestState(prev => ({
      ...prev,
      reactEventsFired: [...prev.reactEventsFired, 'React dragover']
    }));
  }, []);

  const handleReactDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('⚛️ [NativeTest] React drop triggered');
    setTestState(prev => ({
      ...prev,
      reactEventsFired: [...prev.reactEventsFired, 'React drop']
    }));
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 標題和控制 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">⚡ 原生事件監聽測試</h2>
            <button
              onClick={resetTest}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              重置測試
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-700">原生事件狀態</div>
              <div>拖曳中: {testState.isDragging ? '🟢 是' : '🔴 否'}</div>
              <div>當前目標: {testState.currentTarget || '無'}</div>
              <div>最後事件: {testState.lastNativeEvent || '無'}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">React事件記錄</div>
              <div className="max-h-20 overflow-y-auto">
                {testState.reactEventsFired.length === 0 ? (
                  <div className="text-gray-500">無React事件觸發</div>
                ) : (
                  testState.reactEventsFired.slice(-3).map((event, index) => (
                    <div key={index} className="text-xs text-blue-600">{event}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 測試區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 拖曳源 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">🎯 拖曳源 (原生+React)</h3>
            <div
              ref={draggableRef}
              draggable
              onDragStart={handleReactDragStart}
              className={`
                w-40 h-40 mx-auto rounded-lg cursor-move flex items-center justify-center text-white font-bold text-lg
                ${testState.isDragging
                  ? 'bg-green-500 border-4 border-green-300 shadow-lg transform scale-105'
                  : 'bg-indigo-500 border-4 border-indigo-300 hover:bg-indigo-600'
                }
                transition-all duration-200
              `}
              style={{
                outline: testState.isDragging ? '3px solid #10B981' : '2px solid #6366F1',
                outlineOffset: '4px'
              }}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-sm">原生事件</div>
                <div className="text-xs">拖曳測試</div>
              </div>
            </div>

            <div className="mt-4 text-sm space-y-1">
              <div>數據: {testState.draggedData || '無'}</div>
              <div>DragStart: {testState.eventCounts.dragstart}</div>
              <div>DragEnd: {testState.eventCounts.dragend}</div>
            </div>
          </div>

          {/* 放置區域 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">📥 放置區域 (原生+React)</h3>
            <div
              ref={dropZoneRef}
              onDragOver={handleReactDragOver}
              onDrop={handleReactDrop}
              className={`
                w-full h-40 rounded-lg border-4 border-dashed flex items-center justify-center
                ${testState.currentTarget === 'dropzone'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-blue-300 bg-blue-50'
                }
                transition-all duration-200
              `}
              style={{
                outline: testState.currentTarget === 'dropzone' ? '3px solid #F59E0B' : '2px dashed #3B82F6',
                outlineOffset: '4px'
              }}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">
                  {testState.currentTarget === 'dropzone' ? '🎯' : '📥'}
                </div>
                <div className="font-semibold text-gray-700">
                  {testState.currentTarget === 'dropzone' ? '準備接收' : '拖曳到這裡'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  原生 + React事件
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm grid grid-cols-2 gap-2">
              <div>DragOver: {testState.eventCounts.dragover}</div>
              <div>DragEnter: {testState.eventCounts.dragenter}</div>
              <div>DragLeave: {testState.eventCounts.dragleave}</div>
              <div>Drop: {testState.eventCounts.drop}</div>
            </div>
          </div>
        </div>

        {/* 事件統計對比 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">📊 事件統計對比</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Object.entries(testState.eventCounts).map(([eventType, count]) => (
              <div key={eventType} className={`p-3 rounded text-center ${count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <div className="font-semibold capitalize">{eventType}</div>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs">原生事件</div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded">
            <div className="font-semibold text-blue-700 mb-2">React事件記錄 ({testState.reactEventsFired.length})</div>
            <div className="text-sm text-blue-600">
              {testState.reactEventsFired.length === 0 ? (
                '無React事件觸發'
              ) : (
                testState.reactEventsFired.slice(-5).join(' → ')
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

export default NativeEventTest;