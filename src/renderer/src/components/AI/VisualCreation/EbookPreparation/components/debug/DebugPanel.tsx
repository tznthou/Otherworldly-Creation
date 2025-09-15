import React, { useState, useEffect, useRef } from 'react';

interface DebugLog {
  id: number;
  timestamp: number;
  type: 'dragstart' | 'dragover' | 'dragenter' | 'dragleave' | 'drop' | 'dragend';
  source: string;
  details: Record<string, any>;
}

interface MousePosition {
  x: number;
  y: number;
}

interface DebugPanelProps {
  isVisible?: boolean;
  maxLogs?: number;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  isVisible = true,
  maxLogs = 20
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [currentDragInfo, setCurrentDragInfo] = useState<{
    isDragging: boolean;
    draggedId: string | null;
    targetZone: string | null;
  }>({
    isDragging: false,
    draggedId: null,
    targetZone: null
  });

  const logIdRef = useRef(0);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // 監聽滑鼠位置
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 監聽控制台日誌並解析拖曳事件
  useEffect(() => {
    const originalConsoleLog = console.log;

    console.log = (...args) => {
      // 調用原始console.log
      originalConsoleLog(...args);

      // 檢查是否為拖曳相關日誌
      const message = args[0];
      if (typeof message === 'string' && (
        message.includes('[DraggableImage-') ||
        message.includes('[DropZone-')
      )) {
        const timestamp = Date.now();

        // 解析日誌內容
        let type: DebugLog['type'] = 'dragstart';
        let source = 'unknown';

        if (message.includes('dragstart')) type = 'dragstart';
        else if (message.includes('dragover')) type = 'dragover';
        else if (message.includes('dragenter')) type = 'dragenter';
        else if (message.includes('dragleave')) type = 'dragleave';
        else if (message.includes('drop')) type = 'drop';
        else if (message.includes('dragend')) type = 'dragend';

        // 提取source
        if (message.includes('[DraggableImage-')) {
          const match = message.match(/\[DraggableImage-([^\]]+)\]/);
          source = match ? `Image-${match[1]}` : 'Image-unknown';
        } else if (message.includes('[DropZone-')) {
          const match = message.match(/\[DropZone-([^\]]+)\]/);
          source = match ? `Zone-${match[1]}` : 'Zone-unknown';
        }

        const newLog: DebugLog = {
          id: ++logIdRef.current,
          timestamp,
          type,
          source,
          details: args[1] || {}
        };

        setLogs(prev => {
          const updated = [newLog, ...prev].slice(0, maxLogs);
          return updated;
        });

        // 更新當前拖曳狀態
        if (type === 'dragstart') {
          setCurrentDragInfo(prev => ({
            ...prev,
            isDragging: true,
            draggedId: source
          }));
        } else if (type === 'dragend') {
          setCurrentDragInfo(prev => ({
            ...prev,
            isDragging: false,
            draggedId: null,
            targetZone: null
          }));
        } else if (type === 'dragover' || type === 'dragenter') {
          setCurrentDragInfo(prev => ({
            ...prev,
            targetZone: source
          }));
        } else if (type === 'dragleave') {
          setCurrentDragInfo(prev => ({
            ...prev,
            targetZone: null
          }));
        }
      }
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, [maxLogs]);

  // 自動滾動到最新日誌
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  };

  const getTypeColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'dragstart': return 'text-green-400';
      case 'dragover': return 'text-yellow-400';
      case 'dragenter': return 'text-blue-400';
      case 'dragleave': return 'text-purple-400';
      case 'drop': return 'text-emerald-400';
      case 'dragend': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="font-semibold text-sm">拖曳調試面板</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 bg-gray-700 rounded"
          >
            清除
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white"
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3 w-80 max-h-96 overflow-hidden">
          {/* 當前狀態 */}
          <div className="bg-gray-800 p-2 rounded text-xs space-y-1">
            <div className="text-gray-300 font-semibold">🎯 當前狀態</div>
            <div>拖曳中: {currentDragInfo.isDragging ?
              <span className="text-green-400">✅ {currentDragInfo.draggedId}</span> :
              <span className="text-gray-400">❌</span>
            }</div>
            <div>目標區域: {currentDragInfo.targetZone ?
              <span className="text-yellow-400">{currentDragInfo.targetZone}</span> :
              <span className="text-gray-400">無</span>
            }</div>
            <div>滑鼠位置: <span className="text-blue-400">({mousePos.x}, {mousePos.y})</span></div>
          </div>

          {/* 事件日誌 */}
          <div className="bg-gray-800 p-2 rounded">
            <div className="text-gray-300 font-semibold text-xs mb-2 flex items-center justify-between">
              <span>📋 事件日誌 ({logs.length}/{maxLogs})</span>
            </div>
            <div
              ref={logsContainerRef}
              className="space-y-1 max-h-48 overflow-y-auto text-xs"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-2">無事件記錄</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="border-l-2 border-gray-600 pl-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-mono font-semibold ${getTypeColor(log.type)}`}>
                        {log.type.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-gray-300">{log.source}</div>
                    {Object.keys(log.details).length > 0 && (
                      <div className="text-gray-500 text-xs mt-1">
                        {Object.entries(log.details).slice(0, 2).map(([key, value]) => (
                          <div key={key}>{key}: {String(value).slice(0, 30)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 統計 */}
          <div className="bg-gray-800 p-2 rounded text-xs">
            <div className="text-gray-300 font-semibold mb-1">📊 事件統計</div>
            <div className="grid grid-cols-3 gap-2">
              {['dragstart', 'dragover', 'drop'].map(type => {
                const count = logs.filter(log => log.type === type).length;
                return (
                  <div key={type} className="text-center">
                    <div className={getTypeColor(type as DebugLog['type'])}>{count}</div>
                    <div className="text-gray-500 text-xs">{type}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;