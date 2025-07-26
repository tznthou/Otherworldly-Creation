import * as fs from 'fs';
import * as path from 'path';
import { BackupResult } from './types';

/**
 * 資料庫備份服務
 */
export class DatabaseBackupService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * 創建資料庫備份
   */
  async createBackup(backupPath?: string): Promise<BackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalBackupPath = backupPath || path.join(
        process.cwd(), 
        'backups', 
        `genesis-chronicle-backup-${timestamp}.db`
      );

      // 確保備份目錄存在
      const backupDir = path.dirname(finalBackupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      console.log(`開始創建資料庫備份到: ${finalBackupPath}`);

      // 使用 SQLite 的 VACUUM INTO 命令創建備份
      this.db.prepare(`VACUUM INTO ?`).run(finalBackupPath);

      // 獲取備份檔案大小
      const stats = fs.statSync(finalBackupPath);
      const size = stats.size;

      console.log(`備份創建成功，大小: ${this.formatBytes(size)}`);

      // 記錄備份資訊
      await this.recordBackupInfo(finalBackupPath, size);

      return {
        success: true,
        backupPath: finalBackupPath,
        size,
        timestamp: new Date().toISOString(),
        message: `備份創建成功: ${finalBackupPath}`
      };
    } catch (error) {
      console.error('創建備份失敗:', error);
      return {
        success: false,
        backupPath: '',
        size: 0,
        timestamp: new Date().toISOString(),
        message: `備份失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      };
    }
  }

  /**
   * 從備份還原資料庫
   */
  async restoreFromBackup(backupPath: string): Promise<BackupResult> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`備份檔案不存在: ${backupPath}`);
      }

      console.log(`開始從備份還原: ${backupPath}`);

      // 驗證備份檔案
      const isValid = await this.validateBackupFile(backupPath);
      if (!isValid) {
        throw new Error('備份檔案損壞或無效');
      }

      // 獲取當前資料庫路徑
      const currentDbPath = this.getCurrentDatabasePath();
      
      // 創建當前資料庫的備份（作為安全措施）
      const safetyBackupPath = `${currentDbPath}.before-restore-${Date.now()}.backup`;
      fs.copyFileSync(currentDbPath, safetyBackupPath);

      // 關閉當前資料庫連接
      this.db.close();

      // 複製備份檔案覆蓋當前資料庫
      fs.copyFileSync(backupPath, currentDbPath);

      const stats = fs.statSync(currentDbPath);

      console.log(`資料庫還原成功，大小: ${this.formatBytes(stats.size)}`);

      return {
        success: true,
        backupPath: currentDbPath,
        size: stats.size,
        timestamp: new Date().toISOString(),
        message: `資料庫還原成功，安全備份保存至: ${safetyBackupPath}`
      };
    } catch (error) {
      console.error('還原備份失敗:', error);
      return {
        success: false,
        backupPath: '',
        size: 0,
        timestamp: new Date().toISOString(),
        message: `還原失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      };
    }
  }

  /**
   * 清理舊備份
   */
  async cleanupOldBackups(backupDir: string, keepDays: number = 30): Promise<number> {
    try {
      if (!fs.existsSync(backupDir)) {
        return 0;
      }

      const files = fs.readdirSync(backupDir);
      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        if (file.includes('backup') && file.endsWith('.db')) {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`刪除過期備份: ${file}`);
          }
        }
      }

      console.log(`清理完成，刪除了 ${deletedCount} 個過期備份`);
      return deletedCount;
    } catch (error) {
      console.error('清理舊備份失敗:', error);
      return 0;
    }
  }

  /**
   * 列出可用的備份
   */
  listBackups(backupDir?: string): Array<{
    name: string;
    path: string;
    size: number;
    created: Date;
  }> {
    try {
      const searchDir = backupDir || path.join(process.cwd(), 'backups');
      
      if (!fs.existsSync(searchDir)) {
        return [];
      }

      const files = fs.readdirSync(searchDir);
      const backups: Array<{
        name: string;
        path: string;
        size: number;
        created: Date;
      }> = [];

      for (const file of files) {
        if (file.includes('backup') && file.endsWith('.db')) {
          const filePath = path.join(searchDir, file);
          const stats = fs.statSync(filePath);
          
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime
          });
        }
      }

      // 按創建時間排序（最新的在前）
      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error('列出備份失敗:', error);
      return [];
    }
  }

  /**
   * 驗證備份檔案
   */
  private async validateBackupFile(backupPath: string): Promise<boolean> {
    try {
      // 使用 better-sqlite3 開啟備份檔案進行驗證
      const Database = require('better-sqlite3');
      const testDb = new Database(backupPath, { readonly: true });
      
      // 執行簡單的完整性檢查
      const result = testDb.prepare('PRAGMA integrity_check').get();
      testDb.close();
      
      return result.integrity_check === 'ok';
    } catch (error) {
      console.error('驗證備份檔案失敗:', error);
      return false;
    }
  }

  /**
   * 記錄備份資訊
   */
  private async recordBackupInfo(backupPath: string, size: number): Promise<void> {
    try {
      const backupInfo = {
        path: backupPath,
        size,
        timestamp: new Date().toISOString()
      };

      this.db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value) 
        VALUES ('last_backup', ?)
      `).run(JSON.stringify(backupInfo));
    } catch {
      // 如果沒有設定表，創建一個
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        
        const backupInfo = {
          path: backupPath,
          size,
          timestamp: new Date().toISOString()
        };

        this.db.prepare(`
          INSERT INTO app_settings (key, value) 
          VALUES ('last_backup', ?)
        `).run(JSON.stringify(backupInfo));
      } catch (error) {
        console.error('記錄備份資訊失敗:', error);
      }
    }
  }

  /**
   * 獲取當前資料庫檔案路徑
   */
  private getCurrentDatabasePath(): string {
    // 這裡需要根據實際的資料庫配置來獲取路徑
    // 暫時使用預設路徑
    return path.join(process.cwd(), 'data', 'genesis-chronicle.db');
  }

  /**
   * 自動備份（定期執行）
   */
  async performAutoBackup(): Promise<BackupResult> {
    try {
      // 檢查是否需要執行自動備份
      const needsBackup = await this.shouldPerformAutoBackup();
      
      if (!needsBackup) {
        return {
          success: true,
          backupPath: '',
          size: 0,
          timestamp: new Date().toISOString(),
          message: '暫時不需要執行自動備份'
        };
      }

      // 執行自動備份
      const result = await this.createBackup();
      
      if (result.success) {
        // 清理舊的自動備份
        const backupDir = path.dirname(result.backupPath);
        await this.cleanupOldBackups(backupDir, 7); // 保留7天的自動備份
      }

      return result;
    } catch (error) {
      console.error('自動備份失敗:', error);
      return {
        success: false,
        backupPath: '',
        size: 0,
        timestamp: new Date().toISOString(),
        message: `自動備份失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      };
    }
  }

  /**
   * 檢查是否需要執行自動備份
   */
  private async shouldPerformAutoBackup(): Promise<boolean> {
    try {
      const lastBackupInfo = this.db.prepare(`
        SELECT value FROM app_settings 
        WHERE key = 'last_backup'
      `).get();

      if (!lastBackupInfo) {
        return true; // 從未備份過
      }

      const backupData = JSON.parse(lastBackupInfo.value);
      const lastBackupTime = new Date(backupData.timestamp);
      const now = new Date();
      
      // 如果距離上次備份超過24小時，則需要備份
      const hoursSinceLastBackup = (now.getTime() - lastBackupTime.getTime()) / (1000 * 60 * 60);
      
      return hoursSinceLastBackup >= 24;
    } catch (error) {
      console.error('檢查自動備份條件失敗:', error);
      return true; // 出錯時預設需要備份
    }
  }

  /**
   * 格式化位元組大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}