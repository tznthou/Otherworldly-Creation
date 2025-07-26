import React, { useState, useEffect } from 'react';
import SaveManager, { SaveOperation } from '../../services/saveManager';
import { useAutoSave } from '../../hooks/useAutoSave';

interface SaveStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SaveStatusPanel: React.FC<SaveStatusPanelProps> = ({ isOpen, onClose }) => {
  const [operations, setOperations] = useState<SaveOperation[]>([]);
  const [statistics, setStatistics] = useState(SaveManager.getStatistics());
  const { autoSaveEnabled, autoSaveStatus } = useAutoSave();

  useEffect(() => {
    const updateOperations = (ops: SaveOperation[]) => {
      setOperations(ops);
      setStatistics(SaveManager.getStatistics());
    };

    SaveManager.addListener(updateOperations);
    
    // 初始載入
    updateOperations(SaveManager.getOperations());

    return () => {
      SaveManager.removeListener(updateOperations);
    };
  }, []);

  const handleRetryFailed = () => {
    SaveManager.retryFailedOperations();
  };

  const handleClearCompleted = () => {
    SaveManager.clearCompletedOperations();
  };

  const handleForceSaveAll = async () => {
    try {
      await SaveManager.forceSaveAll();
    } catch (error) {
      console.error('強制儲存失敗:', error);
    }
  };

  const getStatusIcon = (status: SaveOperation['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'saving':
        return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>;
      case 'saved':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  const getStatusText = (status: SaveOperation['status']) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'saving':
        return '儲存中';
      case 'saved':
        return '已儲存';
      case 'error':
        return '失敗';
      default:
        return '未知';
    }
  };

  const getTypeText = (type: SaveOperation['type']) => {
    switch (type) {
      case 'chapter':
        return '章節';
      case 'character':
        return '角色';
      case 'project':
        return '專案';
      case 'settings':
        return '設定';
      default:
        return type;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* 標題欄 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">儲存狀態管理</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 統計資訊 */}
        <div className="p-6 border-b border-cosmic-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-cosmic-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-500">{statistics.saved}</div>
              <div className="text-sm text-gray-400">已儲存</div>
            </div>
            <div className="bg-cosmic-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-500">{statistics.pending}</div>
              <div className="text-sm text-gray-400">等待中</div>
            </div>
            <div className="bg-cosmic-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-500">{statistics.saving}</div>
              <div className="text-sm text-gray-400">儲存中</div>
            </div>
            <div className="bg-cosmic-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-500">{statistics.error}</div>
              <div className="text-sm text-gray-400">失敗</div>
            </div>
          </div>

          {/* 自動儲存狀態 */}
          <div className="mt-4 p-4 bg-cosmic-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gold-400">自動儲存狀態</div>
                <div className="text-xs text-gray-400 mt-1">
                  {autoSaveEnabled ? '已啟用' : '已停用'}
                  {autoSaveStatus.nextSaveIn > 0 && ` • ${autoSaveStatus.nextSaveIn}秒後儲存`}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  autoSaveEnabled ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
                <span className="text-sm text-gray-300">
                  {autoSaveStatus.status === 'saving' ? '儲存中' : 
                   autoSaveStatus.status === 'saved' ? '已同步' :
                   autoSaveStatus.status === 'error' ? '錯誤' : '待機'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="p-4 border-b border-cosmic-700 flex space-x-2">
          <button
            onClick={handleForceSaveAll}
            disabled={statistics.pending === 0}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            強制儲存全部
          </button>
          <button
            onClick={handleRetryFailed}
            disabled={statistics.error === 0}
            className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重試失敗項目
          </button>
          <button
            onClick={handleClearCompleted}
            disabled={statistics.saved === 0}
            className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            清除已完成
          </button>
        </div>

        {/* 操作列表 */}
        <div className="flex-1 overflow-y-auto">
          {operations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-4">📝</div>
              <p>目前沒有儲存操作</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-2">
                {operations.slice().reverse().map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-center justify-between p-3 bg-cosmic-800 rounded-lg hover:bg-cosmic-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(operation.status)}
                      <div>
                        <div className="text-sm font-medium text-white">
                          {getTypeText(operation.type)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatTime(operation.timestamp)}
                          {operation.retryCount > 0 && ` • 重試 ${operation.retryCount} 次`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        operation.status === 'saved' ? 'bg-green-500/20 text-green-400' :
                        operation.status === 'saving' ? 'bg-blue-500/20 text-blue-400' :
                        operation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        operation.status === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {getStatusText(operation.status)}
                      </span>
                      
                      {operation.status === 'error' && operation.error && (
                        <div className="text-xs text-red-400 max-w-xs truncate" title={operation.error}>
                          {operation.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部資訊 */}
        <div className="p-4 border-t border-cosmic-700 bg-cosmic-800">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div>
              佇列長度: {statistics.queueLength} | 
              處理中: {statistics.isProcessing ? '是' : '否'}
            </div>
            <div>
              總操作數: {statistics.total}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveStatusPanel;