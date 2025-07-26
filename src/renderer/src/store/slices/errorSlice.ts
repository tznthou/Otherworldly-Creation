import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  AppError, 
  ErrorState, 
  ProgressIndicator, 
  ProgressState,
  ERROR_MESSAGES,
  ErrorSuggestion
} from '../../types/error';

// 初始狀態
const initialErrorState: ErrorState = {
  errors: [],
  activeErrors: [],
  dismissedErrors: [],
  globalErrorHandler: true
};

const initialProgressState: ProgressState = {
  indicators: [],
  activeIndicators: []
};

// 錯誤處理 slice
const errorSlice = createSlice({
  name: 'error',
  initialState: initialErrorState,
  reducers: {
    addError: (state, action: PayloadAction<Omit<AppError, 'id' | 'timestamp'>>) => {
      const error: AppError = {
        ...action.payload,
        id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        suggestions: action.payload.suggestions || generateSuggestions(action.payload.code)
      };
      
      state.errors.push(error);
      state.activeErrors.push(error.id);
    },
    
    removeError: (state, action: PayloadAction<string>) => {
      const errorId = action.payload;
      state.errors = state.errors.filter(error => error.id !== errorId);
      state.activeErrors = state.activeErrors.filter(id => id !== errorId);
      state.dismissedErrors = state.dismissedErrors.filter(id => id !== errorId);
    },
    
    dismissError: (state, action: PayloadAction<string>) => {
      const errorId = action.payload;
      state.activeErrors = state.activeErrors.filter(id => id !== errorId);
      if (!state.dismissedErrors.includes(errorId)) {
        state.dismissedErrors.push(errorId);
      }
    },
    
    resolveError: (state, action: PayloadAction<string>) => {
      const errorId = action.payload;
      const error = state.errors.find(e => e.id === errorId);
      if (error) {
        error.resolved = true;
      }
      state.activeErrors = state.activeErrors.filter(id => id !== errorId);
    },
    
    clearErrors: (state) => {
      state.errors = [];
      state.activeErrors = [];
      state.dismissedErrors = [];
    },
    
    toggleGlobalErrorHandler: (state, action: PayloadAction<boolean>) => {
      state.globalErrorHandler = action.payload;
    },
    
    // 批量處理錯誤
    addMultipleErrors: (state, action: PayloadAction<Omit<AppError, 'id' | 'timestamp'>[]>) => {
      action.payload.forEach(errorData => {
        const error: AppError = {
          ...errorData,
          id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date(),
          suggestions: errorData.suggestions || generateSuggestions(errorData.code)
        };
        
        state.errors.push(error);
        state.activeErrors.push(error.id);
      });
    },
    
    // 清理舊錯誤
    cleanupOldErrors: (state, action: PayloadAction<number>) => {
      const maxAge = action.payload; // 毫秒
      const now = new Date().getTime();
      
      const oldErrorIds = state.errors
        .filter(error => now - error.timestamp.getTime() > maxAge)
        .map(error => error.id);
      
      state.errors = state.errors.filter(error => !oldErrorIds.includes(error.id));
      state.activeErrors = state.activeErrors.filter(id => !oldErrorIds.includes(id));
      state.dismissedErrors = state.dismissedErrors.filter(id => !oldErrorIds.includes(id));
    }
  }
});

// 進度指示器 slice
const progressSlice = createSlice({
  name: 'progress',
  initialState: initialProgressState,
  reducers: {
    startProgress: (state, action: PayloadAction<Omit<ProgressIndicator, 'id' | 'startTime' | 'status'>>) => {
      const indicator: ProgressIndicator = {
        ...action.payload,
        id: `progress-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        startTime: new Date(),
        status: 'running',
        progress: 0
      };
      
      state.indicators.push(indicator);
      state.activeIndicators.push(indicator.id);
    },
    
    updateProgress: (state, action: PayloadAction<{ id: string; progress: number; currentStep?: string; completedSteps?: number }>) => {
      const { id, progress, currentStep, completedSteps } = action.payload;
      const indicator = state.indicators.find(i => i.id === id);
      
      if (indicator) {
        indicator.progress = Math.max(0, Math.min(100, progress));
        if (currentStep) indicator.currentStep = currentStep;
        if (completedSteps !== undefined) indicator.completedSteps = completedSteps;
        
        // 自動完成
        if (indicator.progress >= 100 && indicator.status === 'running') {
          indicator.status = 'completed';
          indicator.endTime = new Date();
        }
      }
    },
    
    completeProgress: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const indicator = state.indicators.find(i => i.id === id);
      
      if (indicator) {
        indicator.status = 'completed';
        indicator.progress = 100;
        indicator.endTime = new Date();
      }
      
      state.activeIndicators = state.activeIndicators.filter(activeId => activeId !== id);
    },
    
    failProgress: (state, action: PayloadAction<{ id: string; error: AppError }>) => {
      const { id, error } = action.payload;
      const indicator = state.indicators.find(i => i.id === id);
      
      if (indicator) {
        indicator.status = 'failed';
        indicator.error = error;
        indicator.endTime = new Date();
      }
      
      state.activeIndicators = state.activeIndicators.filter(activeId => activeId !== id);
    },
    
    cancelProgress: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const indicator = state.indicators.find(i => i.id === id);
      
      if (indicator) {
        indicator.status = 'cancelled';
        indicator.endTime = new Date();
      }
      
      state.activeIndicators = state.activeIndicators.filter(activeId => activeId !== id);
    },
    
    removeProgress: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.indicators = state.indicators.filter(i => i.id !== id);
      state.activeIndicators = state.activeIndicators.filter(activeId => activeId !== id);
    },
    
    // 清理完成的進度指示器
    cleanupCompletedProgress: (state, action: PayloadAction<number>) => {
      const maxAge = action.payload; // 毫秒
      const now = new Date().getTime();
      
      const completedIds = state.indicators
        .filter(indicator => 
          (indicator.status === 'completed' || indicator.status === 'failed' || indicator.status === 'cancelled') &&
          indicator.endTime &&
          now - indicator.endTime.getTime() > maxAge
        )
        .map(indicator => indicator.id);
      
      state.indicators = state.indicators.filter(indicator => !completedIds.includes(indicator.id));
    }
  }
});

// 輔助函數：根據錯誤代碼生成建議
function generateSuggestions(errorCode: string): ErrorSuggestion[] {
  const errorTemplate = ERROR_MESSAGES[errorCode];
  if (!errorTemplate) return [];
  
  return errorTemplate.suggestions.map((suggestion, index) => ({
    ...suggestion,
    id: `suggestion-${errorCode}-${index}`
  }));
}

// 導出 actions
export const {
  addError,
  removeError,
  dismissError,
  resolveError,
  clearErrors,
  toggleGlobalErrorHandler,
  addMultipleErrors,
  cleanupOldErrors
} = errorSlice.actions;

export const {
  startProgress,
  updateProgress,
  completeProgress,
  failProgress,
  cancelProgress,
  removeProgress,
  cleanupCompletedProgress
} = progressSlice.actions;

// 導出 reducers
export const errorReducer = errorSlice.reducer;
export const progressReducer = progressSlice.reducer;

// Selectors
export const selectAllErrors = (state: { error: ErrorState }) => state.error.errors;
export const selectActiveErrors = (state: { error: ErrorState }) => 
  state.error.errors.filter(error => state.error.activeErrors.includes(error.id));
export const selectErrorById = (id: string) => (state: { error: ErrorState }) =>
  state.error.errors.find(error => error.id === id);
export const selectErrorsByCategory = (category: string) => (state: { error: ErrorState }) =>
  state.error.errors.filter(error => error.category === category);
export const selectCriticalErrors = (state: { error: ErrorState }) =>
  state.error.errors.filter(error => error.severity === 'critical' && state.error.activeErrors.includes(error.id));

export const selectAllProgress = (state: { progress: ProgressState }) => state.progress.indicators;
export const selectActiveProgress = (state: { progress: ProgressState }) =>
  state.progress.indicators.filter(indicator => state.progress.activeIndicators.includes(indicator.id));
export const selectProgressById = (id: string) => (state: { progress: ProgressState }) =>
  state.progress.indicators.find(indicator => indicator.id === id);
export const selectRunningProgress = (state: { progress: ProgressState }) =>
  state.progress.indicators.filter(indicator => indicator.status === 'running');