import { DatabaseCheckResult, DatabaseIssue, DatabaseStatistics } from './types';

/**
 * 資料庫健康檢查器
 */
export class DatabaseHealthChecker {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * 執行完整的資料庫健康檢查
   */
  async performHealthCheck(): Promise<DatabaseCheckResult> {
    console.log('開始執行資料庫健康檢查...');
    
    const issues: DatabaseIssue[] = [];
    const statistics = await this.getStatistics();
    
    try {
      // 檢查資料完整性
      const integrityIssues = await this.checkDataIntegrity();
      issues.push(...integrityIssues);
      
      // 檢查孤立記錄
      const orphanIssues = await this.checkOrphanRecords();
      issues.push(...orphanIssues);
      
      // 檢查約束條件
      const constraintIssues = await this.checkConstraints();
      issues.push(...constraintIssues);
      
      // 檢查效能問題
      const performanceIssues = await this.checkPerformance();
      issues.push(...performanceIssues);
      
    } catch (error) {
      console.error('健康檢查過程中發生錯誤:', error);
      issues.push({
        type: 'corruption',
        severity: 'critical',
        table: 'unknown',
        description: `健康檢查失敗: ${error}`,
        suggestion: '請檢查資料庫連接和權限',
        autoFixable: false
      });
    }
    
    const isHealthy = issues.length === 0 || issues.every(issue => issue.severity === 'low');
    
    console.log(`健康檢查完成，發現 ${issues.length} 個問題`);
    
    return {
      isHealthy,
      issues,
      statistics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 檢查資料完整性
   */
  private async checkDataIntegrity(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];
    
    try {
      // 檢查 PRAGMA 指令
      const integrityCheck = this.db.prepare('PRAGMA integrity_check').all();
      
      if (integrityCheck.length === 0 || integrityCheck[0].integrity_check !== 'ok') {
        issues.push({
          type: 'integrity',
          severity: 'critical',
          table: 'database',
          description: '資料庫完整性檢查失敗',
          suggestion: '執行資料庫修復或從備份還原',
          autoFixable: false
        });
      }
      
      // 檢查外鍵約束
      const foreignKeyCheck = this.db.prepare('PRAGMA foreign_key_check').all();
      if (foreignKeyCheck.length > 0) {
        foreignKeyCheck.forEach((violation: any) => {
          issues.push({
            type: 'constraint',
            severity: 'high',
            table: violation.table,
            description: `外鍵約束違反: ${violation.table}`,
            suggestion: '修復或刪除違反約束的記錄',
            autoFixable: true
          });
        });
      }
      
    } catch (error) {
      console.error('資料完整性檢查失敗:', error);
      issues.push({
        type: 'corruption',
        severity: 'critical',
        table: 'unknown',
        description: '無法執行完整性檢查',
        suggestion: '檢查資料庫狀態',
        autoFixable: false
      });
    }
    
    return issues;
  }

  /**
   * 檢查孤立記錄
   */
  private async checkOrphanRecords(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];
    
    try {
      // 檢查孤立的章節（沒有對應專案的章節）
      const orphanChapters = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM chapters c 
        LEFT JOIN projects p ON c.project_id = p.id 
        WHERE p.id IS NULL
      `).get() as { count: number };
      
      if (orphanChapters.count > 0) {
        issues.push({
          type: 'orphan',
          severity: 'medium',
          table: 'chapters',
          description: `發現 ${orphanChapters.count} 個孤立的章節`,
          suggestion: '刪除孤立的章節記錄',
          autoFixable: true
        });
      }
      
      // 檢查孤立的角色
      const orphanCharacters = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM characters c 
        LEFT JOIN projects p ON c.project_id = p.id 
        WHERE p.id IS NULL
      `).get() as { count: number };
      
      if (orphanCharacters.count > 0) {
        issues.push({
          type: 'orphan',
          severity: 'medium',
          table: 'characters',
          description: `發現 ${orphanCharacters.count} 個孤立的角色`,
          suggestion: '刪除孤立的角色記錄',
          autoFixable: true
        });
      }
      
    } catch (error) {
      console.error('孤立記錄檢查失敗:', error);
    }
    
    return issues;
  }

  /**
   * 檢查約束條件
   */
  private async checkConstraints(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];
    
    try {
      // 檢查空的必填欄位
      const projectsWithoutName = this.db.prepare(`
        SELECT COUNT(*) as count FROM projects WHERE name IS NULL OR name = ''
      `).get() as { count: number };
      
      if (projectsWithoutName.count > 0) {
        issues.push({
          type: 'constraint',
          severity: 'high',
          table: 'projects',
          description: `發現 ${projectsWithoutName.count} 個專案沒有名稱`,
          suggestion: '為專案設定名稱或刪除無效專案',
          autoFixable: false
        });
      }
      
      // 檢查重複的專案名稱
      const duplicateProjectNames = this.db.prepare(`
        SELECT name, COUNT(*) as count 
        FROM projects 
        WHERE name IS NOT NULL AND name != ''
        GROUP BY name 
        HAVING count > 1
      `).all();
      
      if (duplicateProjectNames.length > 0) {
        issues.push({
          type: 'constraint',
          severity: 'low',
          table: 'projects',
          description: `發現 ${duplicateProjectNames.length} 個重複的專案名稱`,
          suggestion: '重新命名重複的專案',
          autoFixable: false
        });
      }
      
    } catch (error) {
      console.error('約束條件檢查失敗:', error);
    }
    
    return issues;
  }

  /**
   * 檢查效能問題
   */
  private async checkPerformance(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];
    
    try {
      // 檢查資料庫大小和碎片化
      const pageCount = this.db.prepare('PRAGMA page_count').get() as { page_count: number };
      const freelistCount = this.db.prepare('PRAGMA freelist_count').get() as { freelist_count: number };
      
      if (pageCount && freelistCount) {
        const fragmentationLevel = (freelistCount.freelist_count / pageCount.page_count) * 100;
        
        if (fragmentationLevel > 25) {
          issues.push({
            type: 'performance',
            severity: 'medium',
            table: 'database',
            description: `資料庫碎片化程度較高 (${fragmentationLevel.toFixed(1)}%)`,
            suggestion: '執行 VACUUM 操作來整理資料庫',
            autoFixable: true
          });
        }
      }
      
      // 檢查是否有缺少的索引
      const largeTableCheck = this.db.prepare(`
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' AND name IN ('projects', 'chapters', 'characters')
      `).all();
      
      largeTableCheck.forEach((table: any) => {
        const indexCheck = this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM sqlite_master 
          WHERE type='index' AND tbl_name=?
        `).get(table.name) as { count: number };
        
        if (indexCheck.count < 2) { // 假設每個表應該至少有2個索引
          issues.push({
            type: 'performance',
            severity: 'low',
            table: table.name,
            description: `表 ${table.name} 可能缺少必要的索引`,
            suggestion: '考慮為常用查詢欄位添加索引',
            autoFixable: false
          });
        }
      });
      
    } catch (error) {
      console.error('效能檢查失敗:', error);
    }
    
    return issues;
  }

  /**
   * 獲取資料庫統計資訊
   */
  private async getStatistics(): Promise<DatabaseStatistics> {
    try {
      const totalProjects = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
      const totalChapters = this.db.prepare('SELECT COUNT(*) as count FROM chapters').get() as { count: number };
      const totalCharacters = this.db.prepare('SELECT COUNT(*) as count FROM characters').get() as { count: number };
      const totalTemplates = this.db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number };
      
      // 計算資料庫大小
      const pageCount = this.db.prepare('PRAGMA page_count').get() as { page_count: number };
      const pageSize = this.db.prepare('PRAGMA page_size').get() as { page_size: number };
      const databaseSize = (pageCount?.page_count || 0) * (pageSize?.page_size || 0);
      
      // 獲取碎片化程度
      const freelistCount = this.db.prepare('PRAGMA freelist_count').get() as { freelist_count: number };
      const fragmentationLevel = pageCount && freelistCount ? 
        (freelistCount.freelist_count / pageCount.page_count) * 100 : 0;
      
      return {
        totalProjects: totalProjects?.count || 0,
        totalChapters: totalChapters?.count || 0,
        totalCharacters: totalCharacters?.count || 0,
        totalTemplates: totalTemplates?.count || 0,
        databaseSize,
        lastVacuum: null, // 需要額外實作來追蹤
        fragmentationLevel
      };
    } catch (error) {
      console.error('獲取統計資訊失敗:', error);
      return {
        totalProjects: 0,
        totalChapters: 0,
        totalCharacters: 0,
        totalTemplates: 0,
        databaseSize: 0,
        lastVacuum: null,
        fragmentationLevel: 0
      };
    }
  }
}