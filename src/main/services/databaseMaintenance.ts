import { getDatabase } from '../database/database';

export interface DatabaseCheckResult {
  isHealthy: boolean;
  issues: DatabaseIssue[];
  statistics: DatabaseStatistics;
  timestamp: string;
}

export interface DatabaseIssue {
  type: 'integrity' | 'orphan' | 'corruption' | 'constraint' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface DatabaseStatistics {
  totalProjects: number;
  totalChapters: number;
  totalCharacters: number;
  totalTemplates: number;
  databaseSize: number;
  lastVacuum: string | null;
  fragmentationLevel: number;
}

export interface RepairResult {
  success: boolean;
  fixedIssues: DatabaseIssue[];
  remainingIssues: DatabaseIssue[];
  message: string;
}

export class DatabaseMaintenanceService {
  private db: any;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 執行完整的資料庫健康檢查
   */
  async performHealthCheck(): Promise<DatabaseCheckResult> {
    console.log('開始執行資料庫健康檢查...');
    
    const issues: DatabaseIssue[] = [];
    const statistics = await this.getStatistics();

    try {
      // 1. 檢查資料庫完整性
      const integrityIssues = await this.checkIntegrity();
      issues.push(...integrityIssues);

      // 2. 檢查外鍵約束
      const constraintIssues = await this.checkConstraints();
      issues.push(...constraintIssues);

      // 3. 檢查孤立記錄
      const orphanIssues = await this.checkOrphanRecords();
      issues.push(...orphanIssues);

      // 4. 檢查資料一致性
      const consistencyIssues = await this.checkDataConsistency();
      issues.push(...consistencyIssues);

      // 5. 檢查性能問題
      const performanceIssues = await this.checkPerformance();
      issues.push(...performanceIssues);

      const isHealthy = issues.filter(issue => 
        issue.severity === 'high' || issue.severity === 'critical'
      ).length === 0;

      console.log(`資料庫健康檢查完成，發現 ${issues.length} 個問題`);

      return {
        isHealthy,
        issues,
        statistics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('資料庫健康檢查失敗:', error);
      
      issues.push({
        type: 'corruption',
        severity: 'critical',
        table: 'unknown',
        description: `資料庫檢查過程中發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        suggestion: '請嘗試重新啟動應用程式或聯繫技術支援',
        autoFixable: false
      });

      return {
        isHealthy: false,
        issues,
        statistics,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 檢查資料庫完整性
   */
  private async checkIntegrity(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];

    try {
      // 執行 SQLite 內建的完整性檢查
      const result = this.db.prepare('PRAGMA integrity_check').all();
      
      for (const row of result) {
        if (row.integrity_check !== 'ok') {
          issues.push({
            type: 'integrity',
            severity: 'critical',
            table: 'database',
            description: `資料庫完整性問題: ${row.integrity_check}`,
            suggestion: '建議立即備份資料並重建資料庫',
            autoFixable: false
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'corruption',
        severity: 'critical',
        table: 'database',
        description: `無法執行完整性檢查: ${error instanceof Error ? error.message : '未知錯誤'}`,
        suggestion: '資料庫可能已損壞，請嘗試從備份還原',
        autoFixable: false
      });
    }

    return issues;
  }

  /**
   * 檢查外鍵約束
   */
  private async checkConstraints(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];

    try {
      // 檢查外鍵約束違反
      const result = this.db.prepare('PRAGMA foreign_key_check').all();
      
      for (const row of result) {
        issues.push({
          type: 'constraint',
          severity: 'high',
          table: row.table,
          description: `外鍵約束違反: ${row.table} 表中的記錄引用了不存在的 ${row.parent} 記錄`,
          suggestion: '刪除無效的引用記錄或修復引用關係',
          autoFixable: true
        });
      }
    } catch (error) {
      issues.push({
        type: 'constraint',
        severity: 'medium',
        table: 'unknown',
        description: `無法檢查外鍵約束: ${error instanceof Error ? error.message : '未知錯誤'}`,
        suggestion: '檢查資料庫設定是否正確',
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
      // 檢查孤立的章節記錄
      const orphanChapters = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM chapters c 
        LEFT JOIN projects p ON c.project_id = p.id 
        WHERE p.id IS NULL
      `).get();

      if (orphanChapters.count > 0) {
        issues.push({
          type: 'orphan',
          severity: 'medium',
          table: 'chapters',
          description: `發現 ${orphanChapters.count} 個孤立的章節記錄`,
          suggestion: '刪除這些孤立記錄以清理資料庫',
          autoFixable: true
        });
      }

      // 檢查孤立的角色記錄
      const orphanCharacters = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM characters c 
        LEFT JOIN projects p ON c.project_id = p.id 
        WHERE p.id IS NULL
      `).get();

      if (orphanCharacters.count > 0) {
        issues.push({
          type: 'orphan',
          severity: 'medium',
          table: 'characters',
          description: `發現 ${orphanCharacters.count} 個孤立的角色記錄`,
          suggestion: '刪除這些孤立記錄以清理資料庫',
          autoFixable: true
        });
      }

      // 檢查孤立的角色能力記錄
      const orphanAbilities = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM character_abilities ca 
        LEFT JOIN characters c ON ca.character_id = c.id 
        WHERE c.id IS NULL
      `).get();

      if (orphanAbilities.count > 0) {
        issues.push({
          type: 'orphan',
          severity: 'low',
          table: 'character_abilities',
          description: `發現 ${orphanAbilities.count} 個孤立的角色能力記錄`,
          suggestion: '刪除這些孤立記錄以清理資料庫',
          autoFixable: true
        });
      }

      // 檢查孤立的角色關係記錄
      const orphanRelationships = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM character_relationships cr 
        LEFT JOIN characters c1 ON cr.source_id = c1.id 
        LEFT JOIN characters c2 ON cr.target_id = c2.id 
        WHERE c1.id IS NULL OR c2.id IS NULL
      `).get();

      if (orphanRelationships.count > 0) {
        issues.push({
          type: 'orphan',
          severity: 'low',
          table: 'character_relationships',
          description: `發現 ${orphanRelationships.count} 個孤立的角色關係記錄`,
          suggestion: '刪除這些孤立記錄以清理資料庫',
          autoFixable: true
        });
      }
    } catch (error) {
      issues.push({
        type: 'orphan',
        severity: 'medium',
        table: 'unknown',
        description: `檢查孤立記錄時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        suggestion: '檢查資料庫結構是否正確',
        autoFixable: false
      });
    }

    return issues;
  }

  /**
   * 檢查資料一致性
   */
  private async checkDataConsistency(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];

    try {
      // 檢查章節順序是否連續
      const projects = this.db.prepare('SELECT id FROM projects').all();
      
      for (const project of projects) {
        const chapters = this.db.prepare(`
          SELECT order_num 
          FROM chapters 
          WHERE project_id = ? 
          ORDER BY order_num
        `).all(project.id);

        if (chapters.length > 0) {
          for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].order_num !== i + 1) {
              issues.push({
                type: 'integrity',
                severity: 'low',
                table: 'chapters',
                description: `專案 ${project.id} 的章節順序不連續`,
                suggestion: '重新排序章節編號',
                autoFixable: true
              });
              break;
            }
          }
        }
      }

      // 檢查重複的章節順序
      const duplicateOrders = this.db.prepare(`
        SELECT project_id, order_num, COUNT(*) as count 
        FROM chapters 
        GROUP BY project_id, order_num 
        HAVING COUNT(*) > 1
      `).all();

      for (const duplicate of duplicateOrders) {
        issues.push({
          type: 'integrity',
          severity: 'medium',
          table: 'chapters',
          description: `專案 ${duplicate.project_id} 中存在重複的章節順序 ${duplicate.order_num}`,
          suggestion: '修正重複的章節順序',
          autoFixable: true
        });
      }

      // 檢查自我引用的角色關係
      const selfReferences = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM character_relationships 
        WHERE source_id = target_id
      `).get();

      if (selfReferences.count > 0) {
        issues.push({
          type: 'integrity',
          severity: 'low',
          table: 'character_relationships',
          description: `發現 ${selfReferences.count} 個角色自我引用關係`,
          suggestion: '刪除自我引用的關係記錄',
          autoFixable: true
        });
      }
    } catch (error) {
      issues.push({
        type: 'integrity',
        severity: 'medium',
        table: 'unknown',
        description: `檢查資料一致性時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        suggestion: '檢查資料庫查詢是否正確',
        autoFixable: false
      });
    }

    return issues;
  }

  /**
   * 檢查性能問題
   */
  private async checkPerformance(): Promise<DatabaseIssue[]> {
    const issues: DatabaseIssue[] = [];

    try {
      // 檢查資料庫碎片化程度
      const pageInfo = this.db.prepare('PRAGMA page_count').get();
      const freelistInfo = this.db.prepare('PRAGMA freelist_count').get();
      
      const fragmentationLevel = (freelistInfo.freelist_count / pageInfo.page_count) * 100;

      if (fragmentationLevel > 20) {
        issues.push({
          type: 'performance',
          severity: 'medium',
          table: 'database',
          description: `資料庫碎片化程度較高 (${fragmentationLevel.toFixed(1)}%)`,
          suggestion: '執行 VACUUM 操作以整理資料庫',
          autoFixable: true
        });
      }

      // 檢查大型文本內容
      const largeChapters = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM chapters 
        WHERE LENGTH(content) > 100000
      `).get();

      if (largeChapters.count > 10) {
        issues.push({
          type: 'performance',
          severity: 'low',
          table: 'chapters',
          description: `發現 ${largeChapters.count} 個大型章節可能影響性能`,
          suggestion: '考慮將長章節分割為較小的段落',
          autoFixable: false
        });
      }

      // 檢查是否需要更新統計資訊
      const lastAnalyze = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='sqlite_stat1'
      `).get();

      if (!lastAnalyze) {
        issues.push({
          type: 'performance',
          severity: 'low',
          table: 'database',
          description: '資料庫統計資訊未更新',
          suggestion: '執行 ANALYZE 命令更新查詢優化器統計資訊',
          autoFixable: true
        });
      }
    } catch (error) {
      issues.push({
        type: 'performance',
        severity: 'low',
        table: 'unknown',
        description: `檢查性能問題時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
        suggestion: '檢查資料庫狀態',
        autoFixable: false
      });
    }

    return issues;
  }

  /**
   * 獲取資料庫統計資訊
   */
  private async getStatistics(): Promise<DatabaseStatistics> {
    try {
      const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get();
      const chapterCount = this.db.prepare('SELECT COUNT(*) as count FROM chapters').get();
      const characterCount = this.db.prepare('SELECT COUNT(*) as count FROM characters').get();
      const templateCount = this.db.prepare('SELECT COUNT(*) as count FROM templates').get();
      
      const pageInfo = this.db.prepare('PRAGMA page_count').get();
      const pageSize = this.db.prepare('PRAGMA page_size').get();
      const freelistInfo = this.db.prepare('PRAGMA freelist_count').get();
      
      const databaseSize = pageInfo.page_count * pageSize.page_size;
      const fragmentationLevel = (freelistInfo.freelist_count / pageInfo.page_count) * 100;

      // 嘗試獲取上次 VACUUM 時間（從應用程式日誌或設定中）
      let lastVacuum: string | null = null;
      try {
        const vacuumInfo = this.db.prepare(`
          SELECT value FROM app_settings 
          WHERE key = 'last_vacuum' 
          LIMIT 1
        `).get();
        lastVacuum = vacuumInfo?.value || null;
      } catch {
        // 如果沒有設定表，忽略錯誤
      }

      return {
        totalProjects: projectCount.count,
        totalChapters: chapterCount.count,
        totalCharacters: characterCount.count,
        totalTemplates: templateCount.count,
        databaseSize,
        lastVacuum,
        fragmentationLevel
      };
    } catch (error) {
      console.error('獲取資料庫統計資訊失敗:', error);
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

  /**
   * 自動修復可修復的問題
   */
  async performAutoRepair(issues: DatabaseIssue[]): Promise<RepairResult> {
    console.log('開始執行自動修復...');
    
    const fixedIssues: DatabaseIssue[] = [];
    const remainingIssues: DatabaseIssue[] = [];
    let success = true;
    let message = '';

    // 在事務中執行修復操作
    const transaction = this.db.transaction(() => {
      for (const issue of issues) {
        if (!issue.autoFixable) {
          remainingIssues.push(issue);
          continue;
        }

        try {
          switch (issue.type) {
            case 'orphan':
              this.fixOrphanRecords(issue);
              fixedIssues.push(issue);
              break;

            case 'integrity':
              this.fixIntegrityIssues(issue);
              fixedIssues.push(issue);
              break;

            case 'performance':
              this.fixPerformanceIssues(issue);
              fixedIssues.push(issue);
              break;

            case 'constraint':
              this.fixConstraintIssues(issue);
              fixedIssues.push(issue);
              break;

            default:
              remainingIssues.push(issue);
          }
        } catch (error) {
          console.error(`修復問題失敗: ${issue.description}`, error);
          remainingIssues.push({
            ...issue,
            description: `${issue.description} (修復失敗: ${error instanceof Error ? error.message : '未知錯誤'})`
          });
          success = false;
        }
      }
    });

    try {
      transaction();
      message = `成功修復 ${fixedIssues.length} 個問題，剩餘 ${remainingIssues.length} 個問題需要手動處理`;
      console.log(message);
    } catch (error) {
      success = false;
      message = `修復過程中發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
      console.error(message);
      
      // 如果事務失敗，所有問題都視為未修復
      remainingIssues.push(...fixedIssues);
      fixedIssues.length = 0;
    }

    return {
      success,
      fixedIssues,
      remainingIssues,
      message
    };
  }

  /**
   * 修復孤立記錄
   */
  private fixOrphanRecords(issue: DatabaseIssue): void {
    switch (issue.table) {
      case 'chapters':
        this.db.prepare(`
          DELETE FROM chapters 
          WHERE project_id NOT IN (SELECT id FROM projects)
        `).run();
        break;

      case 'characters':
        this.db.prepare(`
          DELETE FROM characters 
          WHERE project_id NOT IN (SELECT id FROM projects)
        `).run();
        break;

      case 'character_abilities':
        this.db.prepare(`
          DELETE FROM character_abilities 
          WHERE character_id NOT IN (SELECT id FROM characters)
        `).run();
        break;

      case 'character_relationships':
        this.db.prepare(`
          DELETE FROM character_relationships 
          WHERE source_id NOT IN (SELECT id FROM characters) 
          OR target_id NOT IN (SELECT id FROM characters)
        `).run();
        break;
    }
  }

  /**
   * 修復完整性問題
   */
  private fixIntegrityIssues(issue: DatabaseIssue): void {
    if (issue.description.includes('章節順序不連續')) {
      // 重新排序章節
      const projectId = this.extractProjectIdFromDescription(issue.description);
      if (projectId) {
        const chapters = this.db.prepare(`
          SELECT id FROM chapters 
          WHERE project_id = ? 
          ORDER BY order_num, created_at
        `).all(projectId);

        for (let i = 0; i < chapters.length; i++) {
          this.db.prepare(`
            UPDATE chapters 
            SET order_num = ? 
            WHERE id = ?
          `).run(i + 1, chapters[i].id);
        }
      }
    } else if (issue.description.includes('重複的章節順序')) {
      // 修復重複的章節順序
      const projectId = this.extractProjectIdFromDescription(issue.description);
      if (projectId) {
        const chapters = this.db.prepare(`
          SELECT id FROM chapters 
          WHERE project_id = ? 
          ORDER BY created_at
        `).all(projectId);

        for (let i = 0; i < chapters.length; i++) {
          this.db.prepare(`
            UPDATE chapters 
            SET order_num = ? 
            WHERE id = ?
          `).run(i + 1, chapters[i].id);
        }
      }
    } else if (issue.description.includes('自我引用關係')) {
      // 刪除自我引用的關係
      this.db.prepare(`
        DELETE FROM character_relationships 
        WHERE source_id = target_id
      `).run();
    }
  }

  /**
   * 修復性能問題
   */
  private fixPerformanceIssues(issue: DatabaseIssue): void {
    if (issue.description.includes('碎片化程度較高')) {
      // 執行 VACUUM 操作
      this.db.exec('VACUUM');
      
      // 記錄 VACUUM 時間
      try {
        this.db.prepare(`
          INSERT OR REPLACE INTO app_settings (key, value) 
          VALUES ('last_vacuum', ?)
        `).run(new Date().toISOString());
      } catch {
        // 如果沒有設定表，創建一個
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
      }
    } else if (issue.description.includes('統計資訊未更新')) {
      // 執行 ANALYZE 操作
      this.db.exec('ANALYZE');
    }
  }

  /**
   * 修復約束問題
   */
  private fixConstraintIssues(issue: DatabaseIssue): void {
    // 對於外鍵約束違反，刪除無效的記錄
    const result = this.db.prepare('PRAGMA foreign_key_check').all();
    
    for (const row of result) {
      // 刪除違反外鍵約束的記錄
      this.db.prepare(`DELETE FROM ${row.table} WHERE rowid = ?`).run(row.rowid);
    }
  }

  /**
   * 從描述中提取專案ID
   */
  private extractProjectIdFromDescription(description: string): string | null {
    const match = description.match(/專案 ([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
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
   * 執行資料庫優化
   */
  async optimizeDatabase(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('開始執行資料庫優化...');
      
      // 1. 執行 VACUUM 清理碎片
      this.db.exec('VACUUM');
      
      // 2. 更新統計資訊
      this.db.exec('ANALYZE');
      
      // 3. 記錄優化時間
      try {
        this.db.prepare(`
          INSERT OR REPLACE INTO app_settings (key, value) 
          VALUES ('last_vacuum', ?)
        `).run(new Date().toISOString());
      } catch {
        // 如果沒有設定表，創建一個
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
      }
      
      console.log('資料庫優化完成');
      return {
        success: true,
        message: '資料庫優化完成，性能已提升'
      };
    } catch (error) {
      console.error('資料庫優化失敗:', error);
      return {
        success: false,
        message: `資料庫優化失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      };
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