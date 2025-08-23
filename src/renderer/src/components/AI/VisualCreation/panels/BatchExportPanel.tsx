import React, { memo, useCallback, useState } from 'react';
import { useBatchExportProcessor } from '../../../../hooks/illustration/useBatchExportProcessor';
import type { ExportFormat, ExportTaskStatus } from '../../../../hooks/illustration/useExportManager';

interface BatchExportPanelProps {
  className?: string;
  selectedImageIds?: string[];
  availableImages?: Array<{ id: string; url: string; name?: string }>;
}

/**
 * 批次導出面板組件
 * 提供完整的批次導出功能界面
 */
export const BatchExportPanel = memo<BatchExportPanelProps>(({
  className = '',
  selectedImageIds = [],
  availableImages = []
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [_selectedFormat, _setSelectedFormat] = useState<ExportFormat>('png');

  const {
    state,
    addMultipleImages,
    removeTask,
    processCurrentQueue,
    pauseCurrentProcessing,
    resumeCurrentProcessing,
    updateConfig,
    clearCompletedTasks,
    clearError,
    getTotalProgress,
    getEstimatedTime,
    isProcessorActive
  } = useBatchExportProcessor({
    autoStart: false,
    enableBackgroundProcessing: true,
    onTaskComplete: (task) => {
      console.log(`✅ 導出完成: ${task.fileName}`);
    },
    onTaskFailed: (task, error) => {
      console.error(`❌ 導出失敗: ${task.fileName} - ${error}`);
    },
    onBatchComplete: (total, completed, failed) => {
      console.log(`🎉 批次導出完成: ${completed}/${total} 成功, ${failed} 失敗`);
    }
  });

  // 添加選中的圖片到導出佇列
  const handleAddSelectedImages = useCallback(() => {
    const imagesToAdd = availableImages.filter(img => selectedImageIds.includes(img.id));
    addMultipleImages(imagesToAdd.map(img => ({
      id: img.id,
      url: img.url,
      fileName: img.name
    })));
  }, [availableImages, selectedImageIds, addMultipleImages]);

  // 添加所有可用圖片
  const handleAddAllImages = useCallback(() => {
    addMultipleImages(availableImages.map(img => ({
      id: img.id,
      url: img.url,
      fileName: img.name
    })));
  }, [availableImages, addMultipleImages]);

  // 格式化檔案大小
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // 獲取狀態圖標
  const getStatusIcon = useCallback((status: ExportTaskStatus): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '⏹️';
      default: return '❓';
    }
  }, []);

  // 獲取狀態顏色
  const getStatusColor = useCallback((status: ExportTaskStatus): string => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  // 總進度計算
  const totalProgress = getTotalProgress();
  const hasActiveTasks = state.tasks.length > 0;
  const hasPendingTasks = state.stats.pending > 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 標題欄 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">批次導出</h3>
          {hasActiveTasks && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {state.tasks.length} 個任務
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="導出設定"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 導出設定面板 */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 檔案格式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                導出格式
              </label>
              <select
                value={state.config.defaultFormat}
                onChange={(e) => updateConfig({ defaultFormat: e.target.value as ExportFormat })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="png">PNG (無損)</option>
                <option value="jpg">JPEG (小檔案)</option>
                <option value="webp">WebP (最佳品質)</option>
              </select>
            </div>

            {/* 品質設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                品質 ({state.config.defaultQuality.quality}%)
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={state.config.defaultQuality.quality}
                onChange={(e) => updateConfig({
                  defaultQuality: {
                    ...state.config.defaultQuality,
                    quality: parseInt(e.target.value)
                  }
                })}
                className="w-full"
              />
            </div>

            {/* 並行數 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大並行數
              </label>
              <select
                value={state.config.maxConcurrent}
                onChange={(e) => updateConfig({ maxConcurrent: parseInt(e.target.value) })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="1">1 (慢速)</option>
                <option value="2">2 (平衡)</option>
                <option value="3">3 (推薦)</option>
                <option value="4">4 (快速)</option>
                <option value="5">5 (極速)</option>
              </select>
            </div>

            {/* 檔案命名 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                檔案命名模板
              </label>
              <input
                type="text"
                value={state.config.nameTemplate}
                onChange={(e) => updateConfig({ nameTemplate: e.target.value })}
                placeholder="{project}_{character}_{date}_{index}"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                可用變數: {'{project}'}, {'{character}'}, {'{date}'}, {'{time}'}, {'{index}'}, {'{format}'}
              </p>
            </div>

            {/* 組織方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目錄組織
              </label>
              <select
                value={state.config.organizationMethod}
                onChange={(e) => updateConfig({ organizationMethod: e.target.value as any })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="flat">平級 (所有檔案在同一目錄)</option>
                <option value="by_character">按角色分類</option>
                <option value="by_date">按日期分類</option>
                <option value="by_project">按專案分類</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 操作區域 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          {/* 添加圖片按鈕 */}
          <button
            onClick={handleAddSelectedImages}
            disabled={selectedImageIds.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            添加選中圖片 ({selectedImageIds.length})
          </button>

          <button
            onClick={handleAddAllImages}
            disabled={availableImages.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            添加全部圖片 ({availableImages.length})
          </button>

          {/* 處理控制 */}
          <div className="flex items-center space-x-2 ml-auto">
            {!isProcessorActive ? (
              <button
                onClick={processCurrentQueue}
                disabled={!hasPendingTasks}
                className="px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
              >
                開始導出
              </button>
            ) : (
              <>
                {state.isPaused ? (
                  <button
                    onClick={resumeCurrentProcessing}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    恢復
                  </button>
                ) : (
                  <button
                    onClick={pauseCurrentProcessing}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
                  >
                    暫停
                  </button>
                )}
              </>
            )}

            <button
              onClick={clearCompletedTasks}
              disabled={state.stats.completed === 0}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              清除已完成
            </button>
          </div>
        </div>
      </div>

      {/* 統計信息 */}
      {hasActiveTasks && (
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{state.stats.total}</div>
              <div className="text-sm text-gray-600">總任務</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{state.stats.completed}</div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{state.stats.pending}</div>
              <div className="text-sm text-gray-600">待處理</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{state.stats.failed}</div>
              <div className="text-sm text-gray-600">失敗</div>
            </div>
          </div>

          {/* 總進度條 */}
          {hasActiveTasks && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">總體進度</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{totalProgress}%</span>
                  {isProcessorActive && (
                    <span className="text-sm text-gray-500">
                      預估剩餘: {getEstimatedTime()}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gold-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 任務列表 */}
      <div className="max-h-64 overflow-y-auto">
        {state.tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <p>暫無導出任務</p>
              <p className="text-sm">選擇圖片後點擊添加按鈕開始</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {state.tasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(task.status)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.fileName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {task.format.toUpperCase()}
                          </span>
                          {task.fileSizeBytes && (
                            <span className="text-xs text-gray-500">
                              {formatFileSize(task.fileSizeBytes)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 任務進度條 */}
                    {(task.status === 'processing' || task.status === 'completed') && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">進度</span>
                          <span className="text-xs text-gray-700">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all duration-300 ${
                              task.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* 錯誤信息 */}
                    {task.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                        {task.error}
                      </div>
                    )}
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center space-x-2 ml-4">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => removeTask(task.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="移除任務"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 錯誤顯示 */}
      {state.lastError && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-800">{state.lastError}</span>
            </div>
            <button
              onClick={() => clearError()}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

BatchExportPanel.displayName = 'BatchExportPanel';

export default BatchExportPanel;