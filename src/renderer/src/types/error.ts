// 錯誤處理相關類型定義

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'database' | 'ai' | 'file' | 'validation' | 'system' | 'user';

export interface AppError {
  id: string;
  code: string;
  message: string;
  description?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
  resolved?: boolean;
  suggestions?: ErrorSuggestion[];
}

export interface ErrorSuggestion {
  id: string;
  title: string;
  description: string;
  action?: {
    type: 'button' | 'link' | 'auto';
    label: string;
    handler?: () => void | Promise<void>;
    url?: string;
  };
  priority: number;
}

export interface ProgressIndicator {
  id: string;
  title: string;
  description?: string;
  progress: number; // 0-100
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  estimatedDuration?: number;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  error?: AppError;
}

// 預定義錯誤類型
export const ERROR_CODES = {
  // 網路錯誤
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  
  // AI 相關錯誤
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_MODEL_NOT_FOUND: 'AI_MODEL_NOT_FOUND',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  AI_CONTEXT_TOO_LONG: 'AI_CONTEXT_TOO_LONG',
  
  // 資料庫錯誤
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_CORRUPTION: 'DATABASE_CORRUPTION',
  
  // 檔案系統錯誤
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED: 'FILE_PERMISSION_DENIED',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  DISK_SPACE_INSUFFICIENT: 'DISK_SPACE_INSUFFICIENT',
  
  // 驗證錯誤
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_LENGTH_EXCEEDED: 'VALIDATION_LENGTH_EXCEEDED',
  
  // 系統錯誤
  SYSTEM_OUT_OF_MEMORY: 'SYSTEM_OUT_OF_MEMORY',
  SYSTEM_PERMISSION_DENIED: 'SYSTEM_PERMISSION_DENIED',
  SYSTEM_UNKNOWN_ERROR: 'SYSTEM_UNKNOWN_ERROR',
  
  // 使用者錯誤
  USER_OPERATION_CANCELLED: 'USER_OPERATION_CANCELLED',
  USER_INVALID_INPUT: 'USER_INVALID_INPUT',
  USER_UNAUTHORIZED: 'USER_UNAUTHORIZED'
} as const;

// 錯誤訊息模板
export const ERROR_MESSAGES: Record<string, {
  title: string;
  message: string;
  suggestions: Omit<ErrorSuggestion, 'id'>[];
}> = {
  [ERROR_CODES.AI_SERVICE_UNAVAILABLE]: {
    title: 'AI 服務無法使用',
    message: 'Ollama AI 服務目前無法連接，請檢查服務是否正在運行。',
    suggestions: [
      {
        title: '檢查 Ollama 服務',
        description: '確認 Ollama 服務是否已安裝並正在運行',
        action: {
          type: 'button',
          label: '重新連接',
          handler: async () => {
            // 重新檢查 Ollama 服務
            window.location.reload();
          }
        },
        priority: 1
      },
      {
        title: '安裝 Ollama',
        description: '如果尚未安裝 Ollama，請前往官網下載安裝',
        action: {
          type: 'link',
          label: '前往下載',
          url: 'https://ollama.ai'
        },
        priority: 2
      }
    ]
  },
  
  [ERROR_CODES.AI_GENERATION_FAILED]: {
    title: 'AI 生成失敗',
    message: 'AI 文本生成過程中發生錯誤，請稍後再試。',
    suggestions: [
      {
        title: '重新生成',
        description: '嘗試重新生成內容',
        action: {
          type: 'button',
          label: '重試',
        },
        priority: 1
      },
      {
        title: '調整生成參數',
        description: '降低生成長度或調整其他參數可能有助於成功生成',
        priority: 2
      }
    ]
  },
  
  [ERROR_CODES.DATABASE_CONNECTION_FAILED]: {
    title: '資料庫連接失敗',
    message: '無法連接到本地資料庫，您的資料可能暫時無法存取。',
    suggestions: [
      {
        title: '重新啟動應用程式',
        description: '重新啟動可能解決資料庫連接問題',
        action: {
          type: 'button',
          label: '重新啟動',
          handler: async () => {
            try {
              const { api } = await import('../api');
              await api.system.reloadApp();
            } catch (error) {
              window.location.reload();
            }
          }
        },
        priority: 1
      },
      {
        title: '檢查磁碟空間',
        description: '確保有足夠的磁碟空間用於資料庫操作',
        priority: 2
      }
    ]
  },
  
  [ERROR_CODES.FILE_PERMISSION_DENIED]: {
    title: '檔案權限不足',
    message: '應用程式沒有足夠的權限存取所需的檔案或資料夾。',
    suggestions: [
      {
        title: '以管理員身分執行',
        description: '嘗試以管理員權限重新啟動應用程式',
        priority: 1
      },
      {
        title: '檢查檔案權限',
        description: '確認應用程式資料夾的讀寫權限設定',
        priority: 2
      }
    ]
  },
  
  [ERROR_CODES.NETWORK_OFFLINE]: {
    title: '網路連線中斷',
    message: '偵測到網路連線中斷，部分功能可能無法正常使用。',
    suggestions: [
      {
        title: '檢查網路連線',
        description: '確認您的網路連線是否正常',
        priority: 1
      },
      {
        title: '離線模式',
        description: '您仍可以使用本地功能進行創作',
        priority: 2
      }
    ]
  }
};

// 進度指示器狀態
export interface ProgressState {
  indicators: ProgressIndicator[];
  activeIndicators: string[];
}

// 錯誤狀態
export interface ErrorState {
  errors: AppError[];
  activeErrors: string[];
  dismissedErrors: string[];
  globalErrorHandler: boolean;
}

// 錯誤處理動作類型
export type ErrorAction = 
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'DISMISS_ERROR'; payload: string }
  | { type: 'RESOLVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'TOGGLE_GLOBAL_HANDLER'; payload: boolean };

// 進度指示器動作類型
export type ProgressAction = 
  | { type: 'START_PROGRESS'; payload: Omit<ProgressIndicator, 'id' | 'startTime' | 'status'> }
  | { type: 'UPDATE_PROGRESS'; payload: { id: string; progress: number; currentStep?: string } }
  | { type: 'COMPLETE_PROGRESS'; payload: string }
  | { type: 'FAIL_PROGRESS'; payload: { id: string; error: AppError } }
  | { type: 'CANCEL_PROGRESS'; payload: string }
  | { type: 'REMOVE_PROGRESS'; payload: string };