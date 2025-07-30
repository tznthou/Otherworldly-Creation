import BackupService from './backupService';
import { SettingsService } from './settingsService';
import api from '../api';

interface AutoBackupStatus {
  enabled: boolean;
  lastBackup: Date | null;
  nextBackup: Date | null;
  backupCount: number;
  error: string | null;
}

class AutoBackupServiceClass {
  private intervalId: NodeJS.Timeout | null = null;
  private status: AutoBackupStatus = {
    enabled: false,
    lastBackup: null,
    nextBackup: null,
    backupCount: 0,
    error: null,
  };
  private listeners: Array<(status: AutoBackupStatus) => void> = [];

  /**
   * 初始化自動備份服務
   */
  async initialize(): Promise<void> {
    try {
      const settings = await SettingsService.loadSettings();
      
      if (settings.backup.autoBackup) {
        this.startAutoBackup(settings.backup.backupInterval);
      }

      // 載入上次備份資訊
      this.loadBackupHistory();
    } catch (error) {
      console.error('自動備份服務初始化失敗:', error);
      this.updateStatus({ error: '初始化失敗' });
    }
  }

  /**
   * 開始自動備份
   */
  startAutoBackup(intervalHours: number): void {
    this.stopAutoBackup();

    const intervalMs = intervalHours * 60 * 60 * 1000; // 轉換為毫秒
    
    this.intervalId = setInterval(() => {
      this.performAutoBackup();
    }, intervalMs);

    const nextBackup = new Date(Date.now() + intervalMs);
    
    this.updateStatus({
      enabled: true,
      nextBackup,
      error: null,
    });

    console.log(`自動備份已啟動，間隔: ${intervalHours} 小時`);
  }

  /**
   * 停止自動備份
   */
  stopAutoBackup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.updateStatus({
      enabled: false,
      nextBackup: null,
    });

    console.log('自動備份已停止');
  }

  /**
   * 執行自動備份
   */
  private async performAutoBackup(): Promise<void> {
    try {
      console.log('開始執行自動備份...');
      
      const settings = await SettingsService.loadSettings();
      
      // 創建備份
      const filename = await BackupService.createFullBackup();
      
      // 更新狀態
      const now = new Date();
      const nextBackup = new Date(now.getTime() + settings.backup.backupInterval * 60 * 60 * 1000);
      
      this.updateStatus({
        lastBackup: now,
        nextBackup,
        backupCount: this.status.backupCount + 1,
        error: null,
      });

      // 儲存備份歷史
      this.saveBackupHistory();

      // 清理舊備份（如果啟用）
      await this.cleanupOldBackups(settings.backup.maxBackupFiles);

      console.log(`自動備份完成: ${filename}`);
      
      // 通知用戶（可選）
      // TODO: 實現跨平台通知系統
      console.log('自動備份完成:', filename);

    } catch (error) {
      console.error('自動備份失敗:', error);
      
      this.updateStatus({
        error: error instanceof Error ? error.message : '自動備份失敗',
      });

      // 通知用戶備份失敗
      // TODO: 實現跨平台通知系統
      console.error('自動備份失敗 - 請檢查應用程式狀態或手動創建備份');
    }
  }

  /**
   * 清理舊備份
   */
  private async cleanupOldBackups(maxFiles: number): Promise<void> {
    try {
      // 這裡需要實現清理邏輯
      // 由於我們使用下載方式，無法直接管理檔案
      // 可以考慮在未來版本中實現本地備份資料夾管理
      console.log(`備份清理: 保留最近 ${maxFiles} 個備份檔案`);
    } catch (error) {
      console.error('清理舊備份失敗:', error);
    }
  }

  /**
   * 手動觸發備份
   */
  async triggerManualBackup(): Promise<string> {
    try {
      const filename = await BackupService.createFullBackup();
      
      this.updateStatus({
        lastBackup: new Date(),
        backupCount: this.status.backupCount + 1,
        error: null,
      });

      this.saveBackupHistory();
      
      return filename;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '手動備份失敗';
      this.updateStatus({ error: errorMessage });
      throw error;
    }
  }

  /**
   * 獲取備份狀態
   */
  getStatus(): AutoBackupStatus {
    return { ...this.status };
  }

  /**
   * 獲取下次備份倒數時間（秒）
   */
  getNextBackupCountdown(): number {
    if (!this.status.nextBackup) return 0;
    
    const now = Date.now();
    const nextBackup = this.status.nextBackup.getTime();
    
    return Math.max(0, Math.floor((nextBackup - now) / 1000));
  }

  /**
   * 更新設定
   */
  async updateSettings(autoBackup: boolean, intervalHours: number): Promise<void> {
    if (autoBackup) {
      this.startAutoBackup(intervalHours);
    } else {
      this.stopAutoBackup();
    }
  }

  /**
   * 添加狀態監聽器
   */
  addStatusListener(callback: (status: AutoBackupStatus) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 移除狀態監聽器
   */
  removeStatusListener(callback: (status: AutoBackupStatus) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 更新狀態並通知監聽器
   */
  private updateStatus(updates: Partial<AutoBackupStatus>): void {
    this.status = { ...this.status, ...updates };
    
    this.listeners.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('自動備份狀態監聽器執行失敗:', error);
      }
    });
  }

  /**
   * 載入備份歷史
   */
  private loadBackupHistory(): void {
    try {
      const history = localStorage.getItem('genesis-chronicle-backup-history');
      if (history) {
        const data = JSON.parse(history);
        this.updateStatus({
          lastBackup: data.lastBackup ? new Date(data.lastBackup) : null,
          backupCount: data.backupCount || 0,
        });
      }
    } catch (error) {
      console.error('載入備份歷史失敗:', error);
    }
  }

  /**
   * 儲存備份歷史
   */
  private saveBackupHistory(): void {
    try {
      const history = {
        lastBackup: this.status.lastBackup?.toISOString(),
        backupCount: this.status.backupCount,
      };
      localStorage.setItem('genesis-chronicle-backup-history', JSON.stringify(history));
    } catch (error) {
      console.error('儲存備份歷史失敗:', error);
    }
  }

  /**
   * 格式化時間間隔
   */
  formatTimeInterval(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} 秒`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} 分鐘`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} 小時`;
    } else {
      return `${Math.floor(seconds / 86400)} 天`;
    }
  }

  /**
   * 檢查備份健康狀態
   */
  checkBackupHealth(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
  } {
    const now = Date.now();
    const settings = SettingsService.loadSettings();
    
    // 如果自動備份已停用
    if (!this.status.enabled) {
      return {
        status: 'warning',
        message: '自動備份已停用'
      };
    }

    // 如果有錯誤
    if (this.status.error) {
      return {
        status: 'error',
        message: this.status.error
      };
    }

    // 如果從未備份過
    if (!this.status.lastBackup) {
      return {
        status: 'warning',
        message: '尚未執行過備份'
      };
    }

    // 檢查上次備份時間
    const timeSinceLastBackup = now - this.status.lastBackup.getTime();
    const maxInterval = 48 * 60 * 60 * 1000; // 48 小時

    if (timeSinceLastBackup > maxInterval) {
      return {
        status: 'warning',
        message: '上次備份時間過久'
      };
    }

    return {
      status: 'healthy',
      message: '備份狀態正常'
    };
  }

  /**
   * 銷毀服務
   */
  destroy(): void {
    this.stopAutoBackup();
    this.listeners = [];
  }
}

// 單例模式
export const AutoBackupService = new AutoBackupServiceClass();

export default AutoBackupService;