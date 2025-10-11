/**
 * Logger Service - 統一的日誌管理系統
 *
 * 用途：替代散落的 console.log 調用，提供環境感知的日誌輸出
 *
 * 功能：
 * - 開發環境：完整日誌輸出
 * - 生產環境：只輸出 warn 和 error
 * - 結構化日誌：包含時間戳、日誌級別、模組名
 *
 * 使用方式：
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('載入專案', { projectId: '123' });
 * logger.info('使用者操作', { action: 'create-chapter' });
 * logger.warn('API Key 未設定');
 * logger.error('請求失敗', error);
 * ```
 *
 * 創建日期：2025-10-11
 * 目的：Phase 2 技術債清理 - 防止 console 污染
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LoggerConfig {
  /** 最低日誌級別（低於此級別的日誌不輸出） */
  minLevel: LogLevel;
  /** 是否啟用日誌輸出 */
  enabled: boolean;
  /** 是否包含時間戳 */
  includeTimestamp: boolean;
  /** 是否包含模組名 */
  includeModule: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    // 根據環境自動配置
    // 使用 process.env 因為它在所有環境都可用
    const isDevelopment = process.env.NODE_ENV !== 'production';

    this.config = {
      minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
      enabled: true,
      includeTimestamp: true,
      includeModule: true,
    };
  }

  /**
   * 更新 Logger 配置（用於測試或特殊情況）
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 格式化日誌訊息
   */
  private formatMessage(level: LogLevel, module: string, message: string): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
      parts.push(`[${timestamp}]`);
    }

    const levelName = LogLevel[level];
    parts.push(`[${levelName}]`);

    if (this.config.includeModule && module) {
      parts.push(`[${module}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * 判斷是否應該輸出日誌
   */
  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.minLevel;
  }

  /**
   * Debug 日誌（僅開發環境）
   * 用於：詳細的調試資訊、函數進入退出、變數值等
   */
  public debug(message: string, data?: unknown, module = ''): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const formattedMessage = this.formatMessage(LogLevel.DEBUG, module, message);

    if (data !== undefined) {
      /* eslint-disable-next-line no-console */
      console.log(formattedMessage, data);
    } else {
      /* eslint-disable-next-line no-console */
      console.log(formattedMessage);
    }
  }

  /**
   * Info 日誌（僅開發環境）
   * 用於：一般資訊、用戶操作、功能執行等
   */
  public info(message: string, data?: unknown, module = ''): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formattedMessage = this.formatMessage(LogLevel.INFO, module, message);

    if (data !== undefined) {
      /* eslint-disable-next-line no-console */
      console.log(formattedMessage, data);
    } else {
      /* eslint-disable-next-line no-console */
      console.log(formattedMessage);
    }
  }

  /**
   * Warn 日誌（開發和生產環境）
   * 用於：警告訊息、非致命錯誤、棄用警告等
   */
  public warn(message: string, data?: unknown, module = ''): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formattedMessage = this.formatMessage(LogLevel.WARN, module, message);

    if (data !== undefined) {
      /* eslint-disable-next-line no-console */
      console.warn(formattedMessage, data);
    } else {
      /* eslint-disable-next-line no-console */
      console.warn(formattedMessage);
    }
  }

  /**
   * Error 日誌（開發和生產環境）
   * 用於：錯誤、異常、失敗的操作等
   */
  public error(message: string, error?: unknown, module = ''): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const formattedMessage = this.formatMessage(LogLevel.ERROR, module, message);

    if (error !== undefined) {
      /* eslint-disable-next-line no-console */
      console.error(formattedMessage, error);
    } else {
      /* eslint-disable-next-line no-console */
      console.error(formattedMessage);
    }
  }

  /**
   * Fatal 日誌（開發和生產環境）
   * 用於：致命錯誤、應用崩潰等
   */
  public fatal(message: string, error?: unknown, module = ''): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;

    const formattedMessage = this.formatMessage(LogLevel.FATAL, module, message);

    if (error !== undefined) {
      /* eslint-disable-next-line no-console */
      console.error('🔥 FATAL:', formattedMessage, error);
    } else {
      /* eslint-disable-next-line no-console */
      console.error('🔥 FATAL:', formattedMessage);
    }
  }

  /**
   * 創建帶有模組名的 Logger 實例
   *
   * 使用方式：
   * ```typescript
   * const log = logger.createModuleLogger('ProjectService');
   * console.log('載入專案'); // 自動包含模組名
   * ```
   */
  public createModuleLogger(moduleName: string) {
    return {
      debug: (message: string, data?: unknown) => this.debug(message, data, moduleName),
      info: (message: string, data?: unknown) => this.info(message, data, moduleName),
      warn: (message: string, data?: unknown) => this.warn(message, data, moduleName),
      error: (message: string, error?: unknown) => this.error(message, error, moduleName),
      fatal: (message: string, error?: unknown) => this.fatal(message, error, moduleName),
    };
  }

  /**
   * 臨時啟用調試模式（用於生產環境調試）
   */
  public enableDebugMode(): void {
    this.config.minLevel = LogLevel.DEBUG;
    this.info('Debug mode enabled', undefined, 'Logger');
  }

  /**
   * 恢復預設配置
   */
  public resetConfig(): void {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    this.config.minLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }
}

// 導出單例 Logger 實例
export const logger = new Logger();

// 導出創建模組 Logger 的便捷函數
export function createLogger(moduleName: string) {
  return logger.createModuleLogger(moduleName);
}

/**
 * Performance Logger - 性能監控專用
 */
export class PerformanceLogger {
  private timers: Map<string, number> = new Map();

  /**
   * 開始計時
   */
  public start(label: string): void {
    this.timers.set(label, performance.now());
    logger.debug(`⏱️ [Performance] Start: ${label}`);
  }

  /**
   * 結束計時並輸出
   */
  public end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      logger.warn(`⏱️ [Performance] No start time for: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    logger.debug(`⏱️ [Performance] End: ${label} - ${duration.toFixed(2)}ms`);
    this.timers.delete(label);

    return duration;
  }

  /**
   * 測量函數執行時間
   */
  public async measure<T>(
    label: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      logger.error(`⏱️ [Performance] ${label} failed`, error);
      throw error;
    }
  }
}

export const performanceLogger = new PerformanceLogger();
