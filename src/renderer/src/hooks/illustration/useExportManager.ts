import { useReducer, useCallback, useMemo } from 'react';

// 導出格式類型
export type ExportFormat = 'png' | 'jpg' | 'webp';

// 導出品質設定
export interface ExportQuality {
  format: ExportFormat;
  quality: number; // 1-100, 只對 jpg 和 webp 有效
  compression: number; // 0-9, 主要用於 PNG
}

// 導出任務狀態
export type ExportTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// 單個導出任務
export interface ExportTask {
  id: string;
  sourceImageId: string;
  sourceImageUrl: string;
  fileName: string;
  format: ExportFormat;
  quality: ExportQuality;
  outputPath: string;
  status: ExportTaskStatus;
  progress: number; // 0-100
  error?: string;
  startTime?: Date;
  endTime?: Date;
  fileSizeBytes?: number;
}

// 批次導出配置
export interface BatchExportConfig {
  // 檔案命名規則
  nameTemplate: string; // 例如: "{project}_{character}_{date}_{index}"
  outputDirectory: string;
  organizationMethod: 'flat' | 'by_character' | 'by_date' | 'by_project';
  
  // 導出設定
  defaultFormat: ExportFormat;
  defaultQuality: ExportQuality;
  overwriteExisting: boolean;
  
  // 批次處理設定
  maxConcurrent: number; // 最大並行處理數
  autoStart: boolean; // 自動開始處理
}

// 導出統計
export interface ExportStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalSizeBytes: number;
  estimatedTimeRemaining: number; // 秒
}

// 導出管理器狀態
export interface ExportManagerState {
  // 任務管理
  tasks: ExportTask[];
  currentTask: ExportTask | null;
  
  // 配置
  config: BatchExportConfig;
  
  // 狀態
  isProcessing: boolean;
  isPaused: boolean;
  processingStartTime: Date | null;
  
  // 統計
  stats: ExportStats;
  
  // 錯誤處理
  lastError: string | null;
}

// Action 類型
export type ExportManagerAction =
  | { type: 'ADD_TASK'; payload: Omit<ExportTask, 'id' | 'status' | 'progress'> }
  | { type: 'REMOVE_TASK'; payload: { taskId: string } }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<ExportTask> } }
  | { type: 'START_PROCESSING' }
  | { type: 'PAUSE_PROCESSING' }
  | { type: 'RESUME_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_CURRENT_TASK'; payload: { task: ExportTask | null } }
  | { type: 'UPDATE_CONFIG'; payload: Partial<BatchExportConfig> }
  | { type: 'UPDATE_STATS' }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_COMPLETED_TASKS' }
  | { type: 'RESET_ALL' };

// 預設配置
const DEFAULT_CONFIG: BatchExportConfig = {
  nameTemplate: '{project}_{character}_{date}_{index}',
  outputDirectory: '~/Downloads/AI_Illustrations',
  organizationMethod: 'by_character',
  defaultFormat: 'png',
  defaultQuality: {
    format: 'png',
    quality: 95,
    compression: 6
  },
  overwriteExisting: false,
  maxConcurrent: 3,
  autoStart: false
};

// 初始狀態
const initialState: ExportManagerState = {
  tasks: [],
  currentTask: null,
  config: DEFAULT_CONFIG,
  isProcessing: false,
  isPaused: false,
  processingStartTime: null,
  stats: {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    totalSizeBytes: 0,
    estimatedTimeRemaining: 0
  },
  lastError: null
};

// Reducer 函數
function exportManagerReducer(state: ExportManagerState, action: ExportManagerAction): ExportManagerState {
  switch (action.type) {
    case 'ADD_TASK': {
      const newTask: ExportTask = {
        ...action.payload,
        id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        progress: 0
      };
      
      return {
        ...state,
        tasks: [...state.tasks, newTask]
      };
    }
    
    case 'REMOVE_TASK': {
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload.taskId),
        currentTask: state.currentTask?.id === action.payload.taskId ? null : state.currentTask
      };
    }
    
    case 'UPDATE_TASK': {
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.taskId
            ? { ...task, ...action.payload.updates }
            : task
        ),
        currentTask: state.currentTask?.id === action.payload.taskId
          ? { ...state.currentTask, ...action.payload.updates }
          : state.currentTask
      };
    }
    
    case 'START_PROCESSING': {
      return {
        ...state,
        isProcessing: true,
        isPaused: false,
        processingStartTime: new Date(),
        lastError: null
      };
    }
    
    case 'PAUSE_PROCESSING': {
      return {
        ...state,
        isPaused: true
      };
    }
    
    case 'RESUME_PROCESSING': {
      return {
        ...state,
        isPaused: false
      };
    }
    
    case 'STOP_PROCESSING': {
      return {
        ...state,
        isProcessing: false,
        isPaused: false,
        currentTask: null,
        processingStartTime: null
      };
    }
    
    case 'SET_CURRENT_TASK': {
      return {
        ...state,
        currentTask: action.payload.task
      };
    }
    
    case 'UPDATE_CONFIG': {
      return {
        ...state,
        config: { ...state.config, ...action.payload }
      };
    }
    
    case 'UPDATE_STATS': {
      const tasks = state.tasks;
      const stats: ExportStats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        processing: tasks.filter(t => t.status === 'processing').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        totalSizeBytes: tasks
          .filter(t => t.status === 'completed' && t.fileSizeBytes)
          .reduce((sum, t) => sum + (t.fileSizeBytes || 0), 0),
        estimatedTimeRemaining: calculateEstimatedTime(tasks)
      };
      
      return {
        ...state,
        stats
      };
    }
    
    case 'SET_ERROR': {
      return {
        ...state,
        lastError: action.payload.error
      };
    }
    
    case 'CLEAR_ERROR': {
      return {
        ...state,
        lastError: null
      };
    }
    
    case 'CLEAR_COMPLETED_TASKS': {
      return {
        ...state,
        tasks: state.tasks.filter(task => task.status !== 'completed')
      };
    }
    
    case 'RESET_ALL': {
      return {
        ...initialState,
        config: state.config // 保留配置
      };
    }
    
    default:
      return state;
  }
}

// 計算預估剩餘時間
function calculateEstimatedTime(tasks: ExportTask[]): number {
  const processingTasks = tasks.filter(t => t.status === 'processing' && t.startTime);
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  
  if (processingTasks.length === 0) {
    return 0;
  }
  
  // 計算平均處理時間
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.startTime && t.endTime);
  if (completedTasks.length === 0) {
    return pendingTasks.length * 30; // 預設每個任務30秒
  }
  
  const avgTime = completedTasks.reduce((sum, task) => {
    const duration = (task.endTime!.getTime() - task.startTime!.getTime()) / 1000;
    return sum + duration;
  }, 0) / completedTasks.length;
  
  return pendingTasks.length * avgTime;
}

// Hook 選項
export interface UseExportManagerOptions {
  config?: Partial<BatchExportConfig>;
  autoUpdateStats?: boolean;
}

// Hook 返回值
export interface UseExportManagerReturn {
  // 狀態
  state: ExportManagerState;
  
  // 任務管理
  addTask: (task: Omit<ExportTask, 'id' | 'status' | 'progress'>) => void;
  removeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<ExportTask>) => void;
  clearCompletedTasks: () => void;
  
  // 批次操作
  addBatchTasks: (tasks: Omit<ExportTask, 'id' | 'status' | 'progress'>[]) => void;
  
  // 處理控制
  startProcessing: () => void;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  stopProcessing: () => void;
  
  // 配置管理
  updateConfig: (updates: Partial<BatchExportConfig>) => void;
  resetConfig: () => void;
  
  // 錯誤處理
  clearError: () => void;
  
  // 實用功能
  getTasksByStatus: (status: ExportTaskStatus) => ExportTask[];
  getTotalProgress: () => number;
  getEstimatedTime: () => string;
  resetAll: () => void;
}

/**
 * 批次導出管理 Hook
 * 提供完整的批次導出功能，包括任務管理、進度追蹤、錯誤處理等
 */
export function useExportManager(options: UseExportManagerOptions = {}): UseExportManagerReturn {
  const { config: initialConfig, autoUpdateStats = true } = options;
  
  // 初始化狀態，合併自定義配置
  const [state, dispatch] = useReducer(exportManagerReducer, {
    ...initialState,
    config: { ...DEFAULT_CONFIG, ...initialConfig }
  });
  
  // 任務管理
  const addTask = useCallback((task: Omit<ExportTask, 'id' | 'status' | 'progress'>) => {
    dispatch({ type: 'ADD_TASK', payload: task });
    if (autoUpdateStats) {
      setTimeout(() => dispatch({ type: 'UPDATE_STATS' }), 0);
    }
  }, [autoUpdateStats]);
  
  const removeTask = useCallback((taskId: string) => {
    dispatch({ type: 'REMOVE_TASK', payload: { taskId } });
    if (autoUpdateStats) {
      setTimeout(() => dispatch({ type: 'UPDATE_STATS' }), 0);
    }
  }, [autoUpdateStats]);
  
  const updateTask = useCallback((taskId: string, updates: Partial<ExportTask>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { taskId, updates } });
    if (autoUpdateStats) {
      setTimeout(() => dispatch({ type: 'UPDATE_STATS' }), 0);
    }
  }, [autoUpdateStats]);
  
  const clearCompletedTasks = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED_TASKS' });
    if (autoUpdateStats) {
      setTimeout(() => dispatch({ type: 'UPDATE_STATS' }), 0);
    }
  }, [autoUpdateStats]);
  
  // 批次操作
  const addBatchTasks = useCallback((tasks: Omit<ExportTask, 'id' | 'status' | 'progress'>[]) => {
    tasks.forEach(task => {
      dispatch({ type: 'ADD_TASK', payload: task });
    });
    if (autoUpdateStats) {
      setTimeout(() => dispatch({ type: 'UPDATE_STATS' }), 0);
    }
  }, [autoUpdateStats]);
  
  // 處理控制
  const startProcessing = useCallback(() => {
    dispatch({ type: 'START_PROCESSING' });
  }, []);
  
  const pauseProcessing = useCallback(() => {
    dispatch({ type: 'PAUSE_PROCESSING' });
  }, []);
  
  const resumeProcessing = useCallback(() => {
    dispatch({ type: 'RESUME_PROCESSING' });
  }, []);
  
  const stopProcessing = useCallback(() => {
    dispatch({ type: 'STOP_PROCESSING' });
  }, []);
  
  // 配置管理
  const updateConfig = useCallback((updates: Partial<BatchExportConfig>) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: updates });
  }, []);
  
  const resetConfig = useCallback(() => {
    dispatch({ type: 'UPDATE_CONFIG', payload: DEFAULT_CONFIG });
  }, []);
  
  // 錯誤處理
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);
  
  // 實用功能
  const getTasksByStatus = useCallback((status: ExportTaskStatus) => {
    return state.tasks.filter(task => task.status === status);
  }, [state.tasks]);
  
  const getTotalProgress = useCallback((): number => {
    if (state.stats.total === 0) return 0;
    return Math.round((state.stats.completed / state.stats.total) * 100);
  }, [state.stats]);
  
  const getEstimatedTime = useCallback((): string => {
    const seconds = state.stats.estimatedTimeRemaining;
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分鐘`;
    return `${Math.round(seconds / 3600)}小時`;
  }, [state.stats.estimatedTimeRemaining]);
  
  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);
  
  return {
    state,
    addTask,
    removeTask,
    updateTask,
    clearCompletedTasks,
    addBatchTasks,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    stopProcessing,
    updateConfig,
    resetConfig,
    clearError,
    getTasksByStatus,
    getTotalProgress,
    getEstimatedTime,
    resetAll
  };
}

export default useExportManager;