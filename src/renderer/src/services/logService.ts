import { debug, info, warn, error as logError, trace, attachConsole } from '@tauri-apps/plugin-log';

/**
 * 敏感資訊過濾器
 * 自動檢測並遮蔽疑似 API key/token 的字串
 */
class SensitiveDataFilter {
  private static patterns = [
    /api[_-]?key[=:]\s*['"]*([a-zA-Z0-9-_]{20,})['"]*\s*/gi,
    /token[=:]\s*['"]*([a-zA-Z0-9-_]{20,})['"]*\s*/gi,
    /password[=:]\s*['"]*(.+?)['"]*\s*/gi,
    /secret[=:]\s*['"]*([a-zA-Z0-9-_]{20,})['"]*\s*/gi,
  ];

  static sanitize(message: string): string {
    let sanitized = message;

    for (const pattern of this.patterns) {
      sanitized = sanitized.replace(pattern, (match, captured) => {
        return match.replace(captured, '***REDACTED***');
      });
    }

    return sanitized;
  }

  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitize(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        // 如果 key 包含敏感詞，整個值遮蔽
        if (/api[_-]?key|token|password|secret/i.test(key)) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }
}

/**
 * 統一日誌服務
 *
 * 使用方式：
 * import { logger } from '@/services/logService';
 * logger.info('Component', '訊息', { data: 'value' });
 */
export class LogService {
  private isProduction = (import.meta as any).env?.PROD ?? false;
  private consoleAttached = false;

  constructor() {
    // 🔧 自動轉發所有 console.* 到日誌系統（僅執行一次）
    if (!this.consoleAttached) {
      attachConsole();
      this.consoleAttached = true;
      console.log('📝 [LogService] 日誌系統已初始化，所有 console.* 自動轉發到日誌檔案');
    }
  }

  /**
   * Debug 級別：詳細的調試資訊
   * 只在開發環境輸出到 console
   */
  debug(component: string, message: string, data?: any) {
    const sanitizedMessage = SensitiveDataFilter.sanitize(message);
    const sanitizedData = data ? SensitiveDataFilter.sanitizeObject(data) : undefined;
    const logMessage = this.formatMessage(component, sanitizedMessage, sanitizedData);

    if (!this.isProduction) {
      console.log(`🔍 [DEBUG] ${logMessage}`, sanitizedData || '');
    }

    debug(logMessage);
  }

  /**
   * Info 級別：一般資訊
   * 所有環境都記錄
   */
  info(component: string, message: string, data?: any) {
    const sanitizedMessage = SensitiveDataFilter.sanitize(message);
    const sanitizedData = data ? SensitiveDataFilter.sanitizeObject(data) : undefined;
    const logMessage = this.formatMessage(component, sanitizedMessage, sanitizedData);

    console.log(`ℹ️ [INFO] ${logMessage}`, sanitizedData || '');
    info(logMessage);
  }

  /**
   * Warn 級別：警告訊息
   * 需要注意但不影響功能
   */
  warn(component: string, message: string, data?: any) {
    const sanitizedMessage = SensitiveDataFilter.sanitize(message);
    const sanitizedData = data ? SensitiveDataFilter.sanitizeObject(data) : undefined;
    const logMessage = this.formatMessage(component, sanitizedMessage, sanitizedData);

    console.warn(`⚠️ [WARN] ${logMessage}`, sanitizedData || '');
    warn(logMessage);
  }

  /**
   * Error 級別：錯誤訊息
   * 影響功能的錯誤
   */
  error(component: string, message: string, error?: Error | any) {
    const sanitizedMessage = SensitiveDataFilter.sanitize(message);
    const errorInfo = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    const sanitizedError = SensitiveDataFilter.sanitizeObject(errorInfo);
    const logMessage = this.formatMessage(component, sanitizedMessage, sanitizedError);

    console.error(`❌ [ERROR] ${logMessage}`, sanitizedError || '');
    logError(logMessage);
  }

  /**
   * Trace 級別：追蹤資訊
   * 最詳細的日誌，用於深度調試
   */
  trace(component: string, message: string, data?: any) {
    const sanitizedMessage = SensitiveDataFilter.sanitize(message);
    const sanitizedData = data ? SensitiveDataFilter.sanitizeObject(data) : undefined;
    const logMessage = this.formatMessage(component, sanitizedMessage, sanitizedData);

    trace(logMessage);
  }

  /**
   * 格式化日誌訊息
   */
  private formatMessage(component: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${component}] ${message}${dataStr}`;
  }

  /**
   * 圖片相關日誌（專用於診斷圖片顯示問題）
   */
  imageDebug(component: string, operation: string, imageData: {
    id?: string;
    image_url?: string;
    image_path?: string;
    local_file_path?: string;
    full_path?: string;
    finalUrl?: string;
    error?: string;
  }) {
    // 圖片相關資料不需要過濾（URL/路徑不是敏感資訊）
    this.info(component, `圖片${operation}`, {
      operation,
      ...imageData
    });
  }
}

// 單例導出
export const logger = new LogService();
