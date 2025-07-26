import { useCallback } from 'react';
import { useAppDispatch } from './redux';
import { startProgress, updateProgress, completeProgress, failProgress } from '../store/slices/errorSlice';
import { ErrorHandler } from '../utils/errorUtils';
import { AppError } from '../types/error';

// 錯誤處理 hook
export const useErrorHandler = () => {
  const dispatch = useAppDispatch();

  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    if (error.code?.startsWith('AI_')) {
      ErrorHandler.handleAIError(error, context);
    } else if (error.code?.startsWith('DATABASE_')) {
      ErrorHandler.handleDatabaseError(error, context);
    } else if (error.code?.startsWith('NETWORK_')) {
      ErrorHandler.handleApiError(error, context);
    } else if (error.code?.startsWith('FILE_')) {
      ErrorHandler.handleFileSystemError(error, context);
    } else {
      ErrorHandler.createError(
        'UNKNOWN_ERROR',
        '發生未知錯誤',
        {
          description: error.message || String(error),
          severity: 'medium',
          category: 'system',
          context,
          stack: error.stack
        }
      );
    }
  }, []);

  const createError = useCallback((
    code: string,
    message: string,
    options?: {
      description?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'network' | 'database' | 'ai' | 'file' | 'validation' | 'system' | 'user';
      context?: Record<string, any>;
    }
  ) => {
    ErrorHandler.createError(code, message, options);
  }, []);

  return {
    handleError,
    createError
  };
};

// 進度處理 hook
export const useProgressHandler = () => {
  const dispatch = useAppDispatch();

  const startProgressIndicator = useCallback((
    title: string,
    options?: {
      description?: string;
      estimatedDuration?: number;
      totalSteps?: number;
    }
  ) => {
    const progressId = `progress-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    dispatch(startProgress({
      title,
      description: options?.description,
      estimatedDuration: options?.estimatedDuration,
      totalSteps: options?.totalSteps,
      progress: 0
    }));

    return progressId;
  }, [dispatch]);

  const updateProgressIndicator = useCallback((
    id: string,
    progress: number,
    currentStep?: string,
    completedSteps?: number
  ) => {
    dispatch(updateProgress({
      id,
      progress: Math.max(0, Math.min(100, progress)),
      currentStep,
      completedSteps
    }));
  }, [dispatch]);

  const completeProgressIndicator = useCallback((id: string) => {
    dispatch(completeProgress(id));
  }, [dispatch]);

  const failProgressIndicator = useCallback((id: string, error: AppError) => {
    dispatch(failProgress({ id, error }));
  }, [dispatch]);

  return {
    startProgressIndicator,
    updateProgressIndicator,
    completeProgressIndicator,
    failProgressIndicator
  };
};

// 異步操作 hook（結合錯誤處理和進度指示）
export const useAsyncOperation = () => {
  const { handleError } = useErrorHandler();
  const { 
    startProgressIndicator, 
    updateProgressIndicator, 
    completeProgressIndicator, 
    failProgressIndicator 
  } = useProgressHandler();

  const executeWithProgress = useCallback(async <T>(
    operation: (updateProgress: (progress: number, step?: string) => void) => Promise<T>,
    options: {
      title: string;
      description?: string;
      estimatedDuration?: number;
      totalSteps?: number;
      onError?: (error: any) => void;
    }
  ): Promise<T> => {
    const progressId = startProgressIndicator(options.title, {
      description: options.description,
      estimatedDuration: options.estimatedDuration,
      totalSteps: options.totalSteps
    });

    try {
      const updateProgress = (progress: number, step?: string) => {
        updateProgressIndicator(progressId, progress, step);
      };

      const result = await operation(updateProgress);
      completeProgressIndicator(progressId);
      return result;
    } catch (error) {
      const appError: AppError = {
        id: `error-${Date.now()}`,
        code: 'ASYNC_OPERATION_FAILED',
        message: '異步操作失敗',
        description: error instanceof Error ? error.message : String(error),
        severity: 'medium',
        category: 'system',
        timestamp: new Date(),
        context: { operationTitle: options.title },
        stack: error instanceof Error ? error.stack : undefined
      };

      failProgressIndicator(progressId, appError);
      
      if (options.onError) {
        options.onError(error);
      } else {
        handleError(error, { operationTitle: options.title });
      }
      
      throw error;
    }
  }, [
    handleError,
    startProgressIndicator,
    updateProgressIndicator,
    completeProgressIndicator,
    failProgressIndicator
  ]);

  return {
    executeWithProgress
  };
};

// 重試操作 hook
export const useRetryOperation = () => {
  const { handleError } = useErrorHandler();

  const retryWithBackoff = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      backoffFactor?: number;
      onRetry?: (attempt: number, error: any) => void;
    } = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      backoffFactor = 2,
      onRetry
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        const delay = baseDelay * Math.pow(backoffFactor, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    handleError(lastError, { 
      maxRetries, 
      finalAttempt: true,
      operationType: 'retry'
    });
    throw lastError;
  }, [handleError]);

  return {
    retryWithBackoff
  };
};