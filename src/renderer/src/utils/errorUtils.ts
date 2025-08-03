import React from 'react';
import { AppError, ErrorCategory, ErrorSeverity, ERROR_CODES } from '../types/error';
import { store } from '../store/store';
import { addError } from '../store/slices/errorSlice';

// 錯誤處理工具類
export class ErrorHandler {
  /**
   * 創建並分發錯誤
   */
  static createError(
    code: string,
    message: string,
    options: {
      description?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Record<string, unknown>;
      stack?: string;
    } = {}
  ): void {
    const error: Omit<AppError, 'id' | 'timestamp'> = {
      code,
      message,
      description: options.description,
      severity: options.severity || 'medium',
      category: options.category || 'system',
      context: options.context,
      stack: options.stack || new Error().stack,
      resolved: false
    };

    store.dispatch(addError(error));
  }

  /**
   * 處理 API 錯誤
   */
  static handleApiError(error: unknown, context?: Record<string, unknown>): void {
    if (error.code === 'NETWORK_ERROR') {
      this.createError(
        ERROR_CODES.NETWORK_CONNECTION_FAILED,
        '網路連接失敗',
        {
          description: '無法連接到服務器，請檢查網路連接',
          severity: 'high',
          category: 'network',
          context
        }
      );
    } else if (error.code === 'TIMEOUT') {
      this.createError(
        ERROR_CODES.NETWORK_TIMEOUT,
        '請求超時',
        {
          description: '服務器響應時間過長，請稍後再試',
          severity: 'medium',
          category: 'network',
          context
        }
      );
    } else {
      this.createError(
        ERROR_CODES.SYSTEM_UNKNOWN_ERROR,
        'API 請求失敗',
        {
          description: error.message || '未知的 API 錯誤',
          severity: 'medium',
          category: 'network',
          context: { ...context, originalError: error }
        }
      );
    }
  }

  /**
   * 處理 AI 相關錯誤
   */
  static handleAIError(error: unknown, context?: Record<string, unknown>): void {
    if (error.message?.includes('connection refused')) {
      this.createError(
        ERROR_CODES.AI_SERVICE_UNAVAILABLE,
        'AI 服務無法使用',
        {
          description: 'Ollama AI 服務目前無法連接，請檢查服務是否正在運行',
          severity: 'high',
          category: 'ai',
          context
        }
      );
    } else if (error.message?.includes('model not found')) {
      this.createError(
        ERROR_CODES.AI_MODEL_NOT_FOUND,
        'AI 模型不存在',
        {
          description: '指定的 AI 模型未找到，請檢查模型是否已安裝',
          severity: 'medium',
          category: 'ai',
          context
        }
      );
    } else if (error.message?.includes('context too long')) {
      this.createError(
        ERROR_CODES.AI_CONTEXT_TOO_LONG,
        '上下文過長',
        {
          description: '輸入的文本過長，請縮短內容後重試',
          severity: 'medium',
          category: 'ai',
          context
        }
      );
    } else {
      this.createError(
        ERROR_CODES.AI_GENERATION_FAILED,
        'AI 生成失敗',
        {
          description: error.message || 'AI 文本生成過程中發生錯誤',
          severity: 'medium',
          category: 'ai',
          context: { ...context, originalError: error }
        }
      );
    }
  }

  /**
   * 處理資料庫錯誤
   */
  static handleDatabaseError(error: unknown, context?: Record<string, unknown>): void {
    if (error.code === 'SQLITE_CANTOPEN') {
      this.createError(
        ERROR_CODES.DATABASE_CONNECTION_FAILED,
        '資料庫連接失敗',
        {
          description: '無法打開資料庫文件，請檢查文件權限',
          severity: 'critical',
          category: 'database',
          context
        }
      );
    } else if (error.code === 'SQLITE_CORRUPT') {
      this.createError(
        ERROR_CODES.DATABASE_CORRUPTION,
        '資料庫損壞',
        {
          description: '資料庫文件已損壞，可能需要修復或重建',
          severity: 'critical',
          category: 'database',
          context
        }
      );
    } else {
      this.createError(
        ERROR_CODES.DATABASE_QUERY_FAILED,
        '資料庫操作失敗',
        {
          description: error.message || '資料庫查詢執行失敗',
          severity: 'high',
          category: 'database',
          context: { ...context, originalError: error }
        }
      );
    }
  }

  /**
   * 處理檔案系統錯誤
   */
  static handleFileSystemError(error: unknown, context?: Record<string, unknown>): void {
    if (error.code === 'ENOENT') {
      this.createError(
        ERROR_CODES.FILE_NOT_FOUND,
        '檔案不存在',
        {
          description: '指定的檔案或資料夾不存在',
          severity: 'medium',
          category: 'file',
          context
        }
      );
    } else if (error.code === 'EACCES') {
      this.createError(
        ERROR_CODES.FILE_PERMISSION_DENIED,
        '檔案權限不足',
        {
          description: '沒有足夠的權限存取檔案',
          severity: 'high',
          category: 'file',
          context
        }
      );
    } else if (error.code === 'ENOSPC') {
      this.createError(
        ERROR_CODES.DISK_SPACE_INSUFFICIENT,
        '磁碟空間不足',
        {
          description: '磁碟空間不足，無法完成操作',
          severity: 'high',
          category: 'file',
          context
        }
      );
    } else {
      this.createError(
        ERROR_CODES.SYSTEM_UNKNOWN_ERROR,
        '檔案系統錯誤',
        {
          description: error.message || '檔案系統操作失敗',
          severity: 'medium',
          category: 'file',
          context: { ...context, originalError: error }
        }
      );
    }
  }

  /**
   * 處理驗證錯誤
   */
  static handleValidationError(
    field: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.createError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      `驗證失敗: ${field}`,
      {
        description: message,
        severity: 'low',
        category: 'validation',
        context: { field, ...context }
      }
    );
  }
}

// 錯誤邊界 HOC
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  // React 已在頂部導入，不需要 require
  
  return class ErrorBoundary extends React.Component<
    P,
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      ErrorHandler.createError(
        ERROR_CODES.SYSTEM_UNKNOWN_ERROR,
        '組件渲染錯誤',
        {
          description: error.message,
          severity: 'high',
          category: 'system',
          context: {
            componentStack: errorInfo.componentStack,
            errorBoundary: true
          },
          stack: error.stack
        }
      );
    }

    resetError = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (this.state.hasError && this.state.error) {
        if (fallback) {
          const FallbackComponent = fallback;
          return React.createElement(FallbackComponent, { 
            error: this.state.error, 
            resetError: this.resetError 
          });
        }

        return React.createElement('div', {
          className: 'flex items-center justify-center min-h-screen bg-cosmic-950'
        }, React.createElement('div', {
          className: 'text-center p-8'
        }, [
          React.createElement('div', {
            key: 'icon',
            className: 'text-6xl mb-4'
          }, '💥'),
          React.createElement('h2', {
            key: 'title',
            className: 'text-2xl font-cosmic text-red-500 mb-4'
          }, '組件發生錯誤'),
          React.createElement('p', {
            key: 'message',
            className: 'text-gray-400 mb-6'
          }, this.state.error.message),
          React.createElement('button', {
            key: 'button',
            onClick: this.resetError,
            className: 'btn-primary'
          }, '重新載入')
        ]));
      }

      return React.createElement(Component, this.props);
    }
  };
}

// 異步錯誤處理裝飾器
export function handleAsyncErrors<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  errorHandler?: (error: unknown) => void
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else {
        ErrorHandler.createError(
          ERROR_CODES.SYSTEM_UNKNOWN_ERROR,
          '異步操作失敗',
          {
            description: error instanceof Error ? error.message : String(error),
            severity: 'medium',
            category: 'system',
            context: { functionName: fn.name, args },
            stack: error instanceof Error ? error.stack : undefined
          }
        );
      }
      throw error;
    }
  }) as T;
}

// 重試機制
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}