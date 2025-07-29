import { OptimizationResult } from './types';

/**
 * 資料庫優化器
 */
export class DatabaseOptimizer {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * 執行完整的資料庫優化
   */
  async optimizeDatabase(): Promise<OptimizationResult> {
    console.log('開始執行資料庫優化...');
    
    const operationsPerformed: string[] = [];
    
    try {
      // 獲取優化前的大小
      const beforeStats = this.getDbStats();
      const originalSize = beforeStats.size;
      
      // 1. 執行 VACUUM 清理碎片
      console.log('執行 VACUUM 操作...');
      this.db.exec('VACUUM');
      operationsPerformed.push('VACUUM - 清理資料庫碎片');
      
      // 2. 更新統計資訊
      console.log('更新查詢統計資訊...');
      this.db.exec('ANALYZE');
      operationsPerformed.push('ANALYZE - 更新查詢優化器統計資訊');
      
      // 3. 重建索引
      await this.rebuildIndexes();
      operationsPerformed.push('重建索引 - 提升查詢效能');
      
      // 4. 記錄優化時間
      this.recordOptimizationTime();
      operationsPerformed.push('記錄優化時間');
      
      // 獲取優化後的大小
      const afterStats = this.getDbStats();
      const newSize = afterStats.size;
      const savedSpace = originalSize - newSize;
      
      console.log(`資料庫優化完成，節省空間: ${this.formatBytes(savedSpace)}`);
      
      return {
        success: true,
        originalSize,
        newSize,
        savedSpace,
        operationsPerformed,
        message: `資料庫優化完成，節省空間: ${this.formatBytes(savedSpace)}`
      };
    } catch (error) {
      console.error('資料庫優化失敗:', error);
      return {
        success: false,
        originalSize: 0,
        newSize: 0,
        savedSpace: 0,
        operationsPerformed: [...operationsPerformed, `錯誤: ${error}`],
        message: `資料庫優化失敗: ${error}`
      };
    }
  }

  /**
   * 重建所有索引
   */
  private async rebuildIndexes(): Promise<void> {
    try {
      console.log('開始重建索引...');
      
      // 獲取所有自定義索引
      const indexes = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND sql IS NOT NULL 
        AND name NOT LIKE 'sqlite_autoindex_%'
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
    } catch (error) {
      console.error('重建索引過程失敗:', error);
      throw error;
    }
  }

  /**
   * 清理過期資料
   */
  async cleanupExpiredData(): Promise<number> {
    let deletedCount = 0;
    
    try {
      // 清理超過30天的臨時資料（如果有的話）
      const result = this.db.prepare(`
        DELETE FROM temp_data 
        WHERE created_at < datetime('now', '-30 days')
      `);
      
      try {
        const info = result.run();
        deletedCount += info.changes || 0;
        console.log(`清理了 ${info.changes} 條過期臨時資料`);
      } catch {
        // 如果沒有 temp_data 表，忽略錯誤
      }
      
      // 清理空的專案記錄（沒有章節和角色的專案）
      const emptyProjects = this.db.prepare(`
        DELETE FROM projects 
        WHERE id NOT IN (
          SELECT DISTINCT project_id FROM chapters 
          UNION 
          SELECT DISTINCT project_id FROM characters
        )
        AND created_at < datetime('now', '-7 days')
      `);
      
      const emptyInfo = emptyProjects.run();
      deletedCount += emptyInfo.changes || 0;
      
      if (emptyInfo.changes > 0) {
        console.log(`清理了 ${emptyInfo.changes} 個空的專案記錄`);
      }
      
    } catch (error) {
      console.error('清理過期資料失敗:', error);
    }
    
    return deletedCount;
  }

  /**
   * 壓縮大型內容
   */
  async compressLargeContent(): Promise<number> {
    // 這裡可以實作內容壓縮邏輯
    // 例如：壓縮超過一定大小的章節內容
    console.log('內容壓縮功能待實作');
    return 0;
  }

  /**
   * 獲取資料庫統計資訊
   */
  private getDbStats(): { size: number; pageCount: number; pageSize: number } {
    try {
      const pageCount = this.db.prepare('PRAGMA page_count').get()?.page_count || 0;
      const pageSize = this.db.prepare('PRAGMA page_size').get()?.page_size || 0;
      const size = pageCount * pageSize;
      
      return { size, pageCount, pageSize };
    } catch (error) {
      console.error('獲取資料庫統計失敗:', error);
      return { size: 0, pageCount: 0, pageSize: 0 };
    }
  }

  /**
   * 記錄優化時間
   */
  private recordOptimizationTime(): void {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value) 
        VALUES ('last_vacuum', ?)
      `).run(new Date().toISOString());
    } catch {
      // 如果沒有設定表，創建一個
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        this.db.prepare(`
          INSERT INTO app_settings (key, value) 
          VALUES ('last_vacuum', ?)
        `).run(new Date().toISOString());
      } catch (error) {
        console.error('記錄優化時間失敗:', error);
      }
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

  /**
   * 分析資料庫效能
   */
  async analyzePerformance(): Promise<{
    fragmentationLevel: number;
    indexEfficiency: number;
    recommendedActions: string[];
  }> {
    const recommendations: string[] = [];
    
    try {
      // 檢查碎片化程度
      const pageCount = this.db.prepare('PRAGMA page_count').get()?.page_count || 0;
      const freelistCount = this.db.prepare('PRAGMA freelist_count').get()?.freelist_count || 0;
      const fragmentationLevel = pageCount > 0 ? (freelistCount / pageCount) * 100 : 0;
      
      if (fragmentationLevel > 20) {
        recommendations.push('執行 VACUUM 操作以減少碎片化');
      }
      
      // 檢查索引使用情況
      const indexStats = this.db.prepare(`
        SELECT COUNT(*) as total FROM sqlite_master 
        WHERE type='index' AND sql IS NOT NULL
      `).get();
      
      let indexEfficiency = 100; // 預設值
      
      if (indexStats.total < 5) {
        recommendations.push('考慮為常用查詢欄位添加索引');
        indexEfficiency = 60;
      }
      
      // 檢查資料庫大小
      const stats = this.getDbStats();
      if (stats.size > 100 * 1024 * 1024) { // 100MB
        recommendations.push('考慮定期清理過期資料');
      }
      
      return {
        fragmentationLevel,
        indexEfficiency,
        recommendedActions: recommendations
      };
    } catch (error) {
      console.error('效能分析失敗:', error);
      return {
        fragmentationLevel: 0,
        indexEfficiency: 0,
        recommendedActions: ['無法執行效能分析，請檢查資料庫狀態']
      };
    }
  }
}