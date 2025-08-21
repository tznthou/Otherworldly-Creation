import { useEffect, useCallback, useRef } from 'react';
import { useExportManager, type UseExportManagerReturn, type ExportTask } from './useExportManager';
import { getExportService, type ExportService } from '../../services/exportService';

/**
 * 批次導出處理器選項
 */
export interface UseBatchExportProcessorOptions {
  autoStart?: boolean;
  enableBackgroundProcessing?: boolean;
  onTaskComplete?: (task: ExportTask) => void;
  onTaskFailed?: (task: ExportTask, error: string) => void;
  onBatchComplete?: (totalTasks: number, completedTasks: number, failedTasks: number) => void;
}

/**
 * 批次導出處理器返回值
 */
export interface UseBatchExportProcessorReturn extends UseExportManagerReturn {
  // 額外的處理功能
  addImageToExport: (imageId: string, imageUrl: string, fileName?: string) => void;
  addMultipleImages: (images: Array<{ id: string; url: string; fileName?: string }>) => void;
  processCurrentQueue: () => Promise<void>;
  pauseCurrentProcessing: () => void;
  resumeCurrentProcessing: () => void;
  isProcessorActive: boolean;
}

/**
 * 批次導出處理器 Hook
 * 整合 useExportManager 和 ExportService，提供完整的批次導出功能
 */
export function useBatchExportProcessor(
  options: UseBatchExportProcessorOptions = {}
): UseBatchExportProcessorReturn {
  const {
    autoStart = false,
    enableBackgroundProcessing = true,
    onTaskComplete,
    onTaskFailed,
    onBatchComplete
  } = options;

  // 導出管理器
  const exportManager = useExportManager({
    autoUpdateStats: true
  });

  // 導出服務
  const exportServiceRef = useRef<ExportService>(getExportService());
  const processingRef = useRef<boolean>(false);
  const shouldStopRef = useRef<boolean>(false);

  // 進度更新回調
  const handleProgress = useCallback((taskId: string, progress: number) => {
    exportManager.updateTask(taskId, { progress });
  }, [exportManager]);

  // 狀態變更回調
  const handleStatusChange = useCallback((taskId: string, status: ExportTask['status'], error?: string) => {
    const updates: Partial<ExportTask> = { status };
    
    if (status === 'processing') {
      updates.startTime = new Date();
    } else if (status === 'completed' || status === 'failed') {
      updates.endTime = new Date();
      if (error) {
        updates.error = error;
      }
    }

    exportManager.updateTask(taskId, updates);

    // 觸發回調
    const task = exportManager.state.tasks.find(t => t.id === taskId);
    if (task) {
      if (status === 'completed' && onTaskComplete) {
        onTaskComplete({ ...task, ...updates });
      } else if (status === 'failed' && onTaskFailed) {
        onTaskFailed({ ...task, ...updates }, error || 'Unknown error');
      }
    }
  }, [exportManager, onTaskComplete, onTaskFailed]);

  // 添加圖片到導出佇列
  const addImageToExport = useCallback((imageId: string, imageUrl: string, fileName?: string) => {
    const task: Omit<ExportTask, 'id' | 'status' | 'progress'> = {
      sourceImageId: imageId,
      sourceImageUrl: imageUrl,
      fileName: fileName || `image_${imageId}`,
      format: exportManager.state.config.defaultFormat,
      quality: exportManager.state.config.defaultQuality,
      outputPath: '', // 將在處理時生成
    };

    exportManager.addTask(task);
    console.log(`📥 [BatchExportProcessor] 添加圖片到導出佇列: ${imageId}`);
  }, [exportManager]);

  // 批次添加多張圖片
  const addMultipleImages = useCallback((images: Array<{ id: string; url: string; fileName?: string }>) => {
    const tasks = images.map(img => ({
      sourceImageId: img.id,
      sourceImageUrl: img.url,
      fileName: img.fileName || `image_${img.id}`,
      format: exportManager.state.config.defaultFormat,
      quality: exportManager.state.config.defaultQuality,
      outputPath: '', // 將在處理時生成
    }));

    exportManager.addBatchTasks(tasks);
    console.log(`📥 [BatchExportProcessor] 批次添加 ${images.length} 張圖片到導出佇列`);
  }, [exportManager]);

  // 處理當前佇列
  const processCurrentQueue = useCallback(async () => {
    if (processingRef.current) {
      console.warn('⚠️ [BatchExportProcessor] 已有處理程序在運行');
      return;
    }

    const pendingTasks = exportManager.getTasksByStatus('pending');
    if (pendingTasks.length === 0) {
      console.log('ℹ️ [BatchExportProcessor] 沒有待處理的任務');
      return;
    }

    try {
      processingRef.current = true;
      shouldStopRef.current = false;
      exportManager.startProcessing();

      console.log(`🚀 [BatchExportProcessor] 開始處理 ${pendingTasks.length} 個任務`);

      // 並行處理任務
      const maxConcurrent = exportManager.state.config.maxConcurrent;
      const service = exportServiceRef.current;

      await service.processBatchTasks(
        pendingTasks,
        exportManager.state.config,
        handleProgress,
        handleStatusChange,
        maxConcurrent
      );

      // 統計結果
      const completedCount = exportManager.getTasksByStatus('completed').length;
      const failedCount = exportManager.getTasksByStatus('failed').length;

      console.log(`✅ [BatchExportProcessor] 批次處理完成: ${completedCount} 成功, ${failedCount} 失敗`);

      // 觸發完成回調
      if (onBatchComplete) {
        onBatchComplete(pendingTasks.length, completedCount, failedCount);
      }

    } catch (error) {
      console.error('❌ [BatchExportProcessor] 批次處理失敗:', error);
      exportManager.clearError();
    } finally {
      processingRef.current = false;
      exportManager.stopProcessing();
    }
  }, [exportManager, handleProgress, handleStatusChange, onBatchComplete]);

  // 暫停當前處理
  const pauseCurrentProcessing = useCallback(() => {
    if (processingRef.current) {
      shouldStopRef.current = true;
      exportManager.pauseProcessing();
      console.log('⏸️ [BatchExportProcessor] 暫停處理');
    }
  }, [exportManager]);

  // 恢復處理
  const resumeCurrentProcessing = useCallback(() => {
    if (exportManager.state.isPaused) {
      shouldStopRef.current = false;
      exportManager.resumeProcessing();
      console.log('▶️ [BatchExportProcessor] 恢復處理');
    }
  }, [exportManager]);

  // 自動開始處理
  useEffect(() => {
    if (autoStart && enableBackgroundProcessing) {
      const pendingTasks = exportManager.getTasksByStatus('pending');
      if (pendingTasks.length > 0 && !processingRef.current) {
        processCurrentQueue();
      }
    }
  }, [autoStart, enableBackgroundProcessing, exportManager.state.tasks, processCurrentQueue]);

  // 背景處理監聽
  useEffect(() => {
    if (!enableBackgroundProcessing) return;

    const intervalId = setInterval(() => {
      // 檢查是否有新的待處理任務且當前沒有在處理
      const pendingTasks = exportManager.getTasksByStatus('pending');
      if (pendingTasks.length > 0 && !processingRef.current && !exportManager.state.isPaused) {
        processCurrentQueue();
      }
    }, 2000); // 每2秒檢查一次

    return () => clearInterval(intervalId);
  }, [enableBackgroundProcessing, exportManager.state.isPaused, processCurrentQueue]);

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      shouldStopRef.current = true;
    };
  }, []);

  return {
    ...exportManager,
    addImageToExport,
    addMultipleImages,
    processCurrentQueue,
    pauseCurrentProcessing,
    resumeCurrentProcessing,
    isProcessorActive: processingRef.current
  };
}

export default useBatchExportProcessor;