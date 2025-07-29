import { getDatabase } from '../../database/database';
import { DatabaseHealthChecker } from './healthChecker';
import { DatabaseRepairService } from './repairService';
import { DatabaseOptimizer } from './optimizer';
import { DatabaseBackupService } from './backupService';
import { 
  DatabaseCheckResult, 
  DatabaseIssue, 
  DatabaseStatistics, 
  RepairResult,
  OptimizationResult,
  BackupResult
} from './types';

/**
 * 整合的資料庫維護服務
 */
export class DatabaseMaintenanceService {
  private db: any;
  private healthChecker: DatabaseHealthChecker;
  private repairService: DatabaseRepairService;
  private optimizer: DatabaseOptimizer;
  private backupService: DatabaseBackupService;

  constructor() {
    this.db = getDatabase();
    this.healthChecker = new DatabaseHealthChecker(this.db);
    this.repairService = new DatabaseRepairService(this.db);
    this.optimizer = new DatabaseOptimizer(this.db);
    this.backupService = new DatabaseBackupService(this.db);
  }

  /**
   * 執行完整的資料庫健康檢查
   */
  async performHealthCheck(): Promise<DatabaseCheckResult> {
    return await this.healthChecker.performHealthCheck();
  }

  /**
   * 自動修復可修復的問題
   */
  async performAutoRepair(issues: DatabaseIssue[]): Promise<RepairResult> {
    return await this.repairService.autoRepair(issues);
  }

  /**
   * 修復資料庫問題
   */
  async repairIssues(issues: DatabaseIssue[]): Promise<RepairResult> {
    return await this.repairService.autoRepair(issues);
  }

  /**
   * 優化資料庫性能
   */
  async optimizePerformance(checkResult: DatabaseCheckResult): Promise<OptimizationResult> {
    return await this.optimizer.optimizeDatabase();
  }

  /**
   * 獲取資料庫統計
   */
  async getDatabaseStats(): Promise<DatabaseStatistics> {
    const healthCheck = await this.performHealthCheck();
    return healthCheck.statistics;
  }

  /**
   * 重建索引
   */
  async rebuildIndexes(): Promise<boolean> {
    return await this.repairService.rebuildIndexes();
  }

  /**
   * 修復資料庫結構
   */
  async repairDatabaseStructure(): Promise<boolean> {
    return await this.repairService.repairDatabaseStructure();
  }

  /**
   * 執行資料庫優化
   */
  async optimizeDatabase(): Promise<OptimizationResult> {
    return await this.optimizer.optimizeDatabase();
  }

  /**
   * 清理過期資料
   */
  async cleanupExpiredData(): Promise<number> {
    return await this.optimizer.cleanupExpiredData();
  }

  /**
   * 分析資料庫效能
   */
  async analyzePerformance(): Promise<{
    fragmentationLevel: number;
    indexEfficiency: number;
    recommendedActions: string[];
  }> {
    return await this.optimizer.analyzePerformance();
  }

  /**
   * 創建資料庫備份
   */
  async createBackup(backupPath?: string): Promise<BackupResult> {
    return await this.backupService.createBackup(backupPath);
  }

  /**
   * 從備份還原資料庫
   */
  async restoreFromBackup(backupPath: string): Promise<BackupResult> {
    return await this.backupService.restoreFromBackup(backupPath);
  }

  /**
   * 執行自動備份
   */
  async performAutoBackup(): Promise<BackupResult> {
    return await this.backupService.performAutoBackup();
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
    return this.backupService.listBackups(backupDir);
  }

  /**
   * 清理舊備份
   */
  async cleanupOldBackups(backupDir: string, keepDays: number = 30): Promise<number> {
    return await this.backupService.cleanupOldBackups(backupDir, keepDays);
  }

  /**
   * 生成詳細的錯誤報告
   */
  async generateErrorReport(checkResult: DatabaseCheckResult): Promise<string> {
    const report = [];
    
    // 報告標題
    report.push('='.repeat(60));
    report.push('創世紀元：異世界創作神器 - 資料庫健康報告');
    report.push('='.repeat(60));
    report.push('');
    
    // 基本資訊
    report.push(`檢查時間: ${new Date(checkResult.timestamp).toLocaleString('zh-TW')}`);
    report.push(`整體狀態: ${checkResult.isHealthy ? '健康' : '需要注意'}`);
    report.push(`發現問題: ${checkResult.issues.length} 個`);
    report.push('');
    
    // 統計資訊
    report.push('資料庫統計資訊:');
    report.push('-'.repeat(30));
    report.push(`專案數量: ${checkResult.statistics.totalProjects}`);
    report.push(`章節數量: ${checkResult.statistics.totalChapters}`);
    report.push(`角色數量: ${checkResult.statistics.totalCharacters}`);
    report.push(`模板數量: ${checkResult.statistics.totalTemplates}`);
    report.push(`資料庫大小: ${this.formatBytes(checkResult.statistics.databaseSize)}`);
    report.push(`碎片化程度: ${checkResult.statistics.fragmentationLevel.toFixed(1)}%`);
    report.push(`上次整理: ${checkResult.statistics.lastVacuum ? 
      new Date(checkResult.statistics.lastVacuum).toLocaleString('zh-TW') : '未知'}`);
    report.push('');
    
    // 問題詳情
    if (checkResult.issues.length > 0) {
      // 按嚴重程度分組
      const criticalIssues = checkResult.issues.filter(i => i.severity === 'critical');
      const highIssues = checkResult.issues.filter(i => i.severity === 'high');
      const mediumIssues = checkResult.issues.filter(i => i.severity === 'medium');
      const lowIssues = checkResult.issues.filter(i => i.severity === 'low');
      
      if (criticalIssues.length > 0) {
        report.push('🔴 嚴重問題 (需要立即處理):');
        report.push('-'.repeat(40));
        criticalIssues.forEach((issue, index) => {
          report.push(`${index + 1}. [${issue.table}] ${issue.description}`);
          report.push(`   建議: ${issue.suggestion}`);
          report.push(`   可自動修復: ${issue.autoFixable ? '是' : '否'}`);
          report.push('');
        });
      }
      
      if (highIssues.length > 0) {
        report.push('🟠 高優先級問題:');
        report.push('-'.repeat(40));
        highIssues.forEach((issue, index) => {
          report.push(`${index + 1}. [${issue.table}] ${issue.description}`);
          report.push(`   建議: ${issue.suggestion}`);
          report.push(`   可自動修復: ${issue.autoFixable ? '是' : '否'}`);
          report.push('');
        });
      }
      
      if (mediumIssues.length > 0) {
        report.push('🟡 中等優先級問題:');
        report.push('-'.repeat(40));
        mediumIssues.forEach((issue, index) => {
          report.push(`${index + 1}. [${issue.table}] ${issue.description}`);
          report.push(`   建議: ${issue.suggestion}`);
          report.push(`   可自動修復: ${issue.autoFixable ? '是' : '否'}`);
          report.push('');
        });
      }
      
      if (lowIssues.length > 0) {
        report.push('🟢 低優先級問題:');
        report.push('-'.repeat(40));
        lowIssues.forEach((issue, index) => {
          report.push(`${index + 1}. [${issue.table}] ${issue.description}`);
          report.push(`   建議: ${issue.suggestion}`);
          report.push(`   可自動修復: ${issue.autoFixable ? '是' : '否'}`);
          report.push('');
        });
      }
    } else {
      report.push('✅ 未發現任何問題，資料庫狀態良好！');
      report.push('');
    }
    
    // 建議操作
    report.push('建議操作:');
    report.push('-'.repeat(30));
    
    const autoFixableCount = checkResult.issues.filter(i => i.autoFixable).length;
    if (autoFixableCount > 0) {
      report.push(`• 執行自動修復可以解決 ${autoFixableCount} 個問題`);
    }
    
    if (checkResult.statistics.fragmentationLevel > 20) {
      report.push('• 建議執行資料庫整理以提升性能');
    }
    
    if (checkResult.statistics.lastVacuum === null || 
        (new Date().getTime() - new Date(checkResult.statistics.lastVacuum).getTime()) > 30 * 24 * 60 * 60 * 1000) {
      report.push('• 建議定期執行資料庫維護');
    }
    
    report.push('• 定期備份重要資料');
    report.push('');
    
    // 技術資訊
    report.push('技術資訊:');
    report.push('-'.repeat(30));
    report.push(`SQLite 版本: ${this.db.prepare('SELECT sqlite_version()').get()['sqlite_version()']}`);
    report.push(`外鍵約束: ${this.db.prepare('PRAGMA foreign_keys').get().foreign_keys ? '啟用' : '停用'}`);
    report.push('');
    
    report.push('='.repeat(60));
    report.push('報告結束');
    report.push('='.repeat(60));
    
    return report.join('\n');
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

  /**
   * 執行完整的維護流程
   */
  async performFullMaintenance(): Promise<{
    healthCheck: DatabaseCheckResult;
    repair?: RepairResult;
    optimization?: OptimizationResult;
    backup?: BackupResult;
    success: boolean;
    message: string;
  }> {
    try {
      console.log('開始執行完整的資料庫維護...');
      
      // 1. 健康檢查
      const healthCheck = await this.performHealthCheck();
      
      // 2. 自動修復
      let repair: RepairResult | undefined;
      if (healthCheck.issues.some(issue => issue.autoFixable)) {
        repair = await this.performAutoRepair(healthCheck.issues);
      }
      
      // 3. 資料庫優化
      let optimization: OptimizationResult | undefined;
      if (healthCheck.statistics.fragmentationLevel > 10) {
        optimization = await this.optimizeDatabase();
      }
      
      // 4. 自動備份
      const backup = await this.performAutoBackup();
      
      const success = healthCheck.isHealthy && 
                     (!repair || repair.success) && 
                     (!optimization || optimization.success) && 
                     backup.success;
      
      const message = success ? 
        '完整維護流程執行成功' : 
        '維護流程完成，但發現一些問題需要注意';
      
      console.log(message);
      
      return {
        healthCheck,
        repair,
        optimization,
        backup,
        success,
        message
      };
    } catch (error) {
      console.error('完整維護流程失敗:', error);
      throw error;
    }
  }
}

// 導出單例實例
let maintenanceService: DatabaseMaintenanceService | null = null;

export function getDatabaseMaintenanceService(): DatabaseMaintenanceService {
  if (!maintenanceService) {
    maintenanceService = new DatabaseMaintenanceService();
  }
  return maintenanceService;
}

// 重新導出類型
export type {
  DatabaseCheckResult,
  DatabaseIssue,
  DatabaseStatistics,
  RepairResult,
  OptimizationResult,
  BackupResult
};