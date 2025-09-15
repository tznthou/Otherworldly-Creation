import React, { useState, useCallback } from 'react';
import { DebugPanel, DropZone } from './index';

/**
 * 最小化拖曳測試組件
 *
 * 目的：
 * 1. 確認HTML5拖曳API在Tauri環境中是否正常工作
 * 2. 排除複雜狀態管理和嵌套結構的干擾
 * 3. 使用最簡單的DOM結構進行測試
 *
 * 測試範圍：
 * - 基本的dragstart/dragend事件
 * - dragover/dragenter/drop事件
 * - 數據傳遞機制
 */

interface TestResult {
  dragStartTriggered: boolean;
  dragOverTriggered: boolean;
  dropTriggered: boolean;
  dragEndTriggered: boolean;
  dataReceived: string | null;
  lastError: string | null;
}

export const MinimalDragTest: React.FC = () => {
  const [testResult, setTestResult] = useState<TestResult>({
    dragStartTriggered: false,
    dragOverTriggered: false,
    dropTriggered: false,
    dragEndTriggered: false,
    dataReceived: null,
    lastError: null
  });

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedData: string | null;
  }>({
    isDragging: false,
    draggedData: null
  });

  // 重置測試結果
  const resetTest = useCallback(() => {
    setTestResult({
      dragStartTriggered: false,
      dragOverTriggered: false,
      dropTriggered: false,
      dragEndTriggered: false,
      dataReceived: null,
      lastError: null
    });
    setDragState({
      isDragging: false,
      draggedData: null
    });
    console.log('🔄 測試重置');
  }, []);

  // 拖曳開始處理
  const handleDragStart = useCallback((e: React.DragEvent) => {
    try {
      const testData = 'test-data-' + Date.now();

      console.log('🟢 [MinimalTest] dragstart triggered', { testData });

      // 清除默認數據
      e.dataTransfer.clearData();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', testData);

      setTestResult(prev => ({ ...prev, dragStartTriggered: true, lastError: null }));
      setDragState({ isDragging: true, draggedData: testData });

    } catch (error) {
      console.error('❌ dragstart error:', error);
      setTestResult(prev => ({ ...prev, lastError: String(error) }));
    }
  }, []);

  // 拖曳結束處理
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    console.log('🔴 [MinimalTest] dragend triggered');
    setTestResult(prev => ({ ...prev, dragEndTriggered: true }));
    setDragState({ isDragging: false, draggedData: null });
  }, []);

  // 拖曳懸停處理
  const handleDragOver = useCallback((e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    console.log('🟡 [MinimalTest] dragover triggered', { zoneId });
    setTestResult(prev => ({ ...prev, dragOverTriggered: true }));
  }, []);

  // 放置處理
  const handleDrop = useCallback((e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const receivedData = e.dataTransfer.getData('text/plain');
      console.log('✅ [MinimalTest] drop triggered', { zoneId, receivedData });

      setTestResult(prev => ({
        ...prev,
        dropTriggered: true,
        dataReceived: receivedData
      }));

    } catch (error) {
      console.error('❌ drop error:', error);
      setTestResult(prev => ({ ...prev, lastError: String(error) }));
    }
  }, []);

  // 測試結果分析
  const getTestStatus = () => {
    if (testResult.lastError) {
      return { status: 'error', message: '測試出現錯誤', color: 'text-red-500' };
    }

    if (testResult.dropTriggered && testResult.dataReceived) {
      return { status: 'success', message: '✅ 拖曳功能正常', color: 'text-green-500' };
    }

    if (testResult.dragStartTriggered && !testResult.dragOverTriggered) {
      return { status: 'partial', message: '⚠️ 事件無法到達目標區域', color: 'text-yellow-500' };
    }

    if (!testResult.dragStartTriggered) {
      return { status: 'idle', message: '等待測試...', color: 'text-gray-500' };
    }

    return { status: 'testing', message: '測試進行中...', color: 'text-blue-500' };
  };

  const testStatus = getTestStatus();

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 標題和控制 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🧪 最小化拖曳測試</h2>
            <button
              onClick={resetTest}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              重置測試
            </button>
          </div>

          <div className={`text-lg font-semibold ${testStatus.color}`}>
            {testStatus.message}
          </div>

          {testResult.lastError && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              錯誤: {testResult.lastError}
            </div>
          )}
        </div>

        {/* 測試區域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 拖曳源 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">拖曳源</h3>
            <div
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className={`
                w-32 h-32 mx-auto rounded-lg cursor-move flex items-center justify-center text-white font-bold text-lg
                ${dragState.isDragging
                  ? 'bg-green-500 border-4 border-green-300 shadow-lg transform scale-105'
                  : 'bg-red-500 border-4 border-red-300 hover:bg-red-600'
                }
                transition-all duration-200
              `}
              style={{
                outline: dragState.isDragging ? '3px solid #10B981' : '2px solid #EF4444',
                outlineOffset: '4px'
              }}
            >
              <div className="text-center">
                <div>🎯</div>
                <div className="text-sm">拖曳我</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div>狀態: {dragState.isDragging ? '🟢 拖曳中' : '🔴 待機'}</div>
              <div>數據: {dragState.draggedData || '無'}</div>
            </div>
          </div>

          {/* 放置區域 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">放置區域</h3>
            <DropZone
              zoneId="minimal-test-zone"
              title="放置區域"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="w-full h-32 rounded-lg bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center"
            >
              <div className="text-center text-blue-600">
                <div className="text-2xl mb-2">📥</div>
                <div className="font-semibold">放置到這裡</div>
              </div>
            </DropZone>
          </div>
        </div>

        {/* 測試結果面板 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">📊 測試結果</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded ${testResult.dragStartTriggered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-semibold">DragStart</div>
              <div className="text-sm">{testResult.dragStartTriggered ? '✅ 觸發' : '❌ 未觸發'}</div>
            </div>

            <div className={`p-3 rounded ${testResult.dragOverTriggered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-semibold">DragOver</div>
              <div className="text-sm">{testResult.dragOverTriggered ? '✅ 觸發' : '❌ 未觸發'}</div>
            </div>

            <div className={`p-3 rounded ${testResult.dropTriggered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-semibold">Drop</div>
              <div className="text-sm">{testResult.dropTriggered ? '✅ 觸發' : '❌ 未觸發'}</div>
            </div>

            <div className={`p-3 rounded ${testResult.dragEndTriggered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className="font-semibold">DragEnd</div>
              <div className="text-sm">{testResult.dragEndTriggered ? '✅ 觸發' : '❌ 未觸發'}</div>
            </div>
          </div>

          {testResult.dataReceived && (
            <div className="mt-4 p-3 bg-blue-100 rounded">
              <div className="font-semibold text-blue-700">接收到的數據:</div>
              <div className="text-blue-600 font-mono text-sm">{testResult.dataReceived}</div>
            </div>
          )}
        </div>
      </div>

      {/* Debug面板 */}
      <DebugPanel />
    </div>
  );
};

export default MinimalDragTest;