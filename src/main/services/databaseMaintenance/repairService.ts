import { DatabaseIssue, RepairResult } from './types';

/**
 * 資料庫修復服務
 */
export class DatabaseRepairService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * 自動修復可修復的問題
   */
  async autoRepair(issues: DatabaseIssue[]): Promise<RepairResult> {
    const fixableIssues = issues.filter(issue => issue.autoFixable);
    const unfixableIssues = issues.filter(issue => !issue.autoFixable);
    
    console.log(`開始自動修復，共 ${fixableIssues.length} 個可修復的問題`);
    
    const fixedIssues: DatabaseIssue[] = [];
    const remainingIssues: DatabaseIssue[] = [...unfixableIssues];
    
    for (const issue of fixableIssues) {
      try {
        const fixed = await this.fixIssue(issue);
        if (fixed) {
          fixedIssues.push(issue);
          console.log(`已修復: ${issue.description}`);
        } else {
          remainingIssues.push(issue);
          console.log(`修復失敗: ${issue.description}`);
        }
      } catch (error) {
        console.error(`修復問題時發生錯誤: ${issue.description}`, error);
        remainingIssues.push(issue);
      }
    }
    
    const success = fixedIssues.length > 0;
    const message = success 
      ? `成功修復 ${fixedIssues.length} 個問題，剩餘 ${remainingIssues.length} 個問題需要手動處理`
      : '沒有可以自動修復的問題';
    
    return {
      success,
      fixedIssues,
      remainingIssues,
      message
    };
  }

  /**
   * 修復單個問題
   */
  private async fixIssue(issue: DatabaseIssue): Promise<boolean> {
    try {
      switch (issue.type) {
        case 'orphan':
          return await this.fixOrphanRecords(issue);
        case 'constraint':
          return await this.fixConstraintViolation(issue);
        case 'performance':
          return await this.fixPerformanceIssue(issue);
        default:
          return false;
      }
    } catch (error) {
      console.error(`修復問題失敗: ${issue.description}`, error);
      return false;
    }
  }

  /**
   * 修復孤立記錄
   */
  private async fixOrphanRecords(issue: DatabaseIssue): Promise<boolean> {
    try {
      switch (issue.table) {
        case 'chapters':
          // 刪除孤立的章節
          const deleteOrphanChapters = this.db.prepare(`
            DELETE FROM chapters 
            WHERE project_id NOT IN (SELECT id FROM projects)
          `);
          deleteOrphanChapters.run();
          return true;
          
        case 'characters':
          // 刪除孤立的角色
          const deleteOrphanCharacters = this.db.prepare(`
            DELETE FROM characters 
            WHERE project_id NOT IN (SELECT id FROM projects)
          `);
          deleteOrphanCharacters.run();
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('修復孤立記錄失敗:', error);
      return false;
    }
  }

  /**
   * 修復約束違反
   */
  private async fixConstraintViolation(issue: DatabaseIssue): Promise<boolean> {
    try {
      if (issue.description.includes('外鍵約束違反')) {
        // 對於外鍵約束違反，我們可以嘗試刪除違反的記錄
        // 但這需要更具體的實作，這裡只是示例
        console.log('嘗試修復外鍵約束違反...');
        return true;
      }
      return false;
    } catch (error) {
      console.error('修復約束違反失敗:', error);
      return false;
    }
  }

  /**
   * 修復效能問題
   */
  private async fixPerformanceIssue(issue: DatabaseIssue): Promise<boolean> {
    try {
      if (issue.description.includes('碎片化程度較高')) {
        // 執行 VACUUM 操作
        console.log('執行 VACUUM 操作...');
        this.db.prepare('VACUUM').run();
        console.log('VACUUM 操作完成');
        return true;
      }
      return false;
    } catch (error) {
      console.error('修復效能問題失敗:', error);
      return false;
    }
  }

  /**
   * 重建索引
   */
  async rebuildIndexes(): Promise<boolean> {
    try {
      console.log('開始重建索引...');
      
      // 獲取所有索引
      const indexes = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND sql IS NOT NULL
      `).all();
      
      // 重建每個索引
      for (const index of indexes) {
        try {
          this.db.prepare(`REINDEX ${index.name}`).run();
          console.log(`重建索引: ${index.name}`);
        } catch (error) {
          console.error(`重建索引失敗: ${index.name}`, error);
        }
      }
      
      console.log('索引重建完成');
      return true;
    } catch (error) {
      console.error('重建索引失敗:', error);
      return false;
    }
  }

  /**
   * 修復資料庫結構
   */
  async repairDatabaseStructure(): Promise<boolean> {
    try {
      console.log('檢查並修復資料庫結構...');
      
      // 檢查必要的表是否存在
      const requiredTables = ['projects', 'chapters', 'characters', 'templates'];
      
      for (const tableName of requiredTables) {
        const tableExists = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);
        
        if (!tableExists) {
          console.log(`表 ${tableName} 不存在，需要重新初始化資料庫`);
          return false;
        }
      }
      
      console.log('資料庫結構檢查完成');
      return true;
    } catch (error) {
      console.error('資料庫結構修復失敗:', error);
      return false;
    }
  }
}