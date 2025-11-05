import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('logs');

/**
 * 日誌管理 API
 * v1.3.3 新增
 */
export const logsApi = {
  /**
   * 獲取日誌目錄路徑
   */
  async getLogDirectory(): Promise<string> {
    return invoke<string>('get_log_directory');
  },

  /**
   * 打開日誌目錄
   */
  async openLogDirectory(): Promise<void> {
    return invoke('open_log_directory');
  },

  /**
   * 獲取最近的日誌（默認 1000 行）
   */
  async getRecentLogs(lines: number = 1000): Promise<string> {
    return invoke<string>('get_recent_logs', { lines });
  },

  /**
   * 複製日誌到剪貼板
   * @param lines 要複製的行數，默認 2000
   */
  async copyLogsToClipboard(lines: number = 2000): Promise<boolean> {
    try {
      const logs = await this.getRecentLogs(lines);
      await navigator.clipboard.writeText(logs);
      return true;
    } catch (error) {
      log.error('複製日誌失敗:', error);
      return false;
    }
  },

  /**
   * 刪除舊日誌（保留最近兩天）
   * @returns 刪除結果訊息
   */
  async deleteOldLogs(): Promise<string> {
    return invoke<string>('delete_old_logs');
  }
};
