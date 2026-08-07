import api from '../api';
import { SettingsService } from './settingsService';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('autoBackupService');

export interface AutoBackupStatus {
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

      // 先載入上次備份資訊，下面判斷要不要補備份時要用
      this.loadBackupHistory();

      if (!settings.backup.autoBackup) {
        return;
      }

      const { backupInterval } = settings.backup;
      this.startAutoBackup(backupInterval);

      // 桌面 app 不是長駐服務。使用者每天開兩三個小時就關掉，24 小時的
      // setInterval 永遠撐不到觸發——只註冊排程的話，接了線照樣一次都不會備份。
      if (this.isBackupOverdue(backupInterval)) {
        await this.performAutoBackup();
      }
    } catch (error) {
      log.error('自動備份服務初始化失敗:', error);
      this.updateStatus({ error: '初始化失敗' });
    }
  }

  /**
   * 距上次備份是否已超過一個間隔（從未備份過也算）
   */
  private isBackupOverdue(intervalHours: number): boolean {
    if (!this.status.lastBackup) {
      return true;
    }

    return Date.now() - this.status.lastBackup.getTime() >= intervalHours * 60 * 60 * 1000;
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

    log.debug(`自動備份已啟動，間隔: ${intervalHours} 小時`);
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

    log.debug('自動備份已停止');
  }

  /**
   * 寫出一份資料庫備份
   *
   * 走後端的 SQLite Online Backup（含 -wal 內容），舊路徑是前端組 JSON 再觸發
   * 瀏覽器下載——無人值守時根本落不了地，而且只涵蓋專案 / 章節 / 角色 / 設定，
   * 漏掉語彙、插畫、電子書對應等資料表。保留份數由後端依 maxBackupFiles 輪替。
   */
  private async writeBackup(): Promise<{ path: string; intervalHours: number }> {
    const settings = await SettingsService.loadSettings();
    const { backupLocation, maxBackupFiles, backupInterval } = settings.backup;

    const path = await api.database.createAutoBackup(
      backupLocation || undefined,
      maxBackupFiles,
    );

    return { path, intervalHours: backupInterval };
  }

  /**
   * 執行自動備份
   */
  private async performAutoBackup(): Promise<void> {
    try {
      log.debug('開始執行自動備份...');

      const { path, intervalHours } = await this.writeBackup();

      const now = new Date();
      const nextBackup = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

      this.updateStatus({
        lastBackup: now,
        nextBackup,
        backupCount: this.status.backupCount + 1,
        error: null,
      });

      this.saveBackupHistory();

      log.debug(`自動備份完成: ${path}`);
    } catch (error) {
      log.error('自動備份失敗:', error);

      this.updateStatus({
        error: error instanceof Error ? error.message : '自動備份失敗',
      });

      // 通知用戶備份失敗
      // TODO: 實現跨平台通知系統
      log.error('自動備份失敗 - 請檢查應用程式狀態或手動創建備份');
    }
  }

  /**
   * 手動觸發備份
   */
  async triggerManualBackup(): Promise<string> {
    try {
      const { path } = await this.writeBackup();

      this.updateStatus({
        lastBackup: new Date(),
        backupCount: this.status.backupCount + 1,
        error: null,
      });

      this.saveBackupHistory();

      return path;
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
        log.error('自動備份狀態監聽器執行失敗:', error);
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
      log.error('載入備份歷史失敗:', error);
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
      log.error('儲存備份歷史失敗:', error);
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
   *
   * 狀態一併歸零。留著上次備份時間與錯誤訊息的話，重新 initialize()
   * 會先閃出一段屬於上一輪的狀態；真實的備份歷史存在 localStorage，
   * initialize() 會重新載入，這裡清掉不會弄丟東西。
   */
  destroy(): void {
    this.stopAutoBackup();
    this.listeners = [];
    this.status = {
      enabled: false,
      lastBackup: null,
      nextBackup: null,
      backupCount: 0,
      error: null,
    };
  }
}

// 單例模式
export const AutoBackupService = new AutoBackupServiceClass();

export default AutoBackupService;