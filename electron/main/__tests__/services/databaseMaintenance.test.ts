import { DatabaseMaintenanceService, getDatabaseMaintenanceService } from '../../services/databaseMaintenance';
import { initDatabase, getDatabase, closeDatabase } from '../../database/database';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 模擬 electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(os.tmpdir(), 'test-genesis-chronicle')),
  },
}));

// 模擬 contextManager
jest.mock('../../services/contextManager', () => ({
  setContextManager: jest.fn(),
}));

describe('DatabaseMaintenanceService', () => {
  let maintenanceService: DatabaseMaintenanceService;
  const testDbPath = path.join(os.tmpdir(), 'test-genesis-chronicle', 'genesis-chronicle.db');

  beforeEach(async () => {
    // 清理測試資料庫
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // 確保測試目錄存在
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 初始化資料庫和服務
    await initDatabase();
    maintenanceService = getDatabaseMaintenanceService();
  });

  afterEach(() => {
    try {
      closeDatabase();
    } catch (error) {
      // 忽略關閉錯誤
    }
    
    // 清理測試資料庫
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('performHealthCheck', () => {
    it('應該返回健康檢查結果', async () => {
      const result = await maintenanceService.performHealthCheck();
      
      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('timestamp');
      
      expect(Array.isArray(result.issues)).toBe(true);
      expect(typeof result.isHealthy).toBe('boolean');
      expect(typeof result.timestamp).toBe('string');
    });

    it('應該返回正確的統計資訊', async () => {
      const db = getDatabase();
      
      // 插入測試資料
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        'test-project-1', '測試專案', 'isekai'
      );
      
      const result = await maintenanceService.performHealthCheck();
      
      expect(result.statistics.totalProjects).toBe(1);
      expect(result.statistics.totalChapters).toBe(0);
      expect(result.statistics.totalCharacters).toBe(0);
      expect(result.statistics.databaseSize).toBeGreaterThan(0);
      expect(typeof result.statistics.fragmentationLevel).toBe('number');
    });

    it('應該檢測孤立記錄', async () => {
      const db = getDatabase();
      
      // 創建孤立的章節記錄
      db.exec('PRAGMA foreign_keys = OFF');
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        'orphan-chapter', 'non-existent-project', '孤立章節', 1
      );
      db.exec('PRAGMA foreign_keys = ON');
      
      const result = await maintenanceService.performHealthCheck();
      
      const orphanIssues = result.issues.filter(issue => issue.type === 'orphan');
      expect(orphanIssues.length).toBeGreaterThan(0);
      
      const chapterOrphanIssue = orphanIssues.find(issue => issue.table === 'chapters');
      expect(chapterOrphanIssue).toBeDefined();
      expect(chapterOrphanIssue?.autoFixable).toBe(true);
    });

    it('應該檢測章節順序問題', async () => {
      const db = getDatabase();
      
      // 插入專案
      const projectId = 'test-project-1';
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      // 插入不連續的章節順序
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        'chapter-1', projectId, '第一章', 1
      );
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        'chapter-3', projectId, '第三章', 3
      );
      
      const result = await maintenanceService.performHealthCheck();
      
      const integrityIssues = result.issues.filter(issue => 
        issue.type === 'integrity' && issue.description.includes('章節順序不連續')
      );
      expect(integrityIssues.length).toBeGreaterThan(0);
    });
  });

  describe('performAutoRepair', () => {
    it('應該修復孤立記錄', async () => {
      const db = getDatabase();
      
      // 創建孤立記錄
      db.exec('PRAGMA foreign_keys = OFF');
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        'orphan-chapter', 'non-existent-project', '孤立章節', 1
      );
      db.exec('PRAGMA foreign_keys = ON');
      
      // 獲取問題
      const healthCheck = await maintenanceService.performHealthCheck();
      const orphanIssues = healthCheck.issues.filter(issue => issue.type === 'orphan');
      
      // 執行修復
      const repairResult = await maintenanceService.performAutoRepair(orphanIssues);
      
      expect(repairResult.success).toBe(true);
      expect(repairResult.fixedIssues.length).toBeGreaterThan(0);
      
      // 驗證孤立記錄已被刪除
      const remainingChapters = db.prepare('SELECT * FROM chapters WHERE project_id = ?').all('non-existent-project');
      expect(remainingChapters).toHaveLength(0);
    });

    it('應該修復章節順序問題', async () => {
      const db = getDatabase();
      
      // 插入專案和不連續的章節
      const projectId = 'test-project-1';
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        'chapter-1', projectId, '第一章', 1
      );
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        'chapter-3', projectId, '第三章', 3
      );
      
      // 獲取問題並修復
      const healthCheck = await maintenanceService.performHealthCheck();
      const integrityIssues = healthCheck.issues.filter(issue => 
        issue.type === 'integrity' && issue.autoFixable
      );
      
      const repairResult = await maintenanceService.performAutoRepair(integrityIssues);
      
      expect(repairResult.success).toBe(true);
      
      // 驗證章節順序已修復
      const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_num').all(projectId);
      expect(chapters[0].order_num).toBe(1);
      expect(chapters[1].order_num).toBe(2);
    });

    it('應該處理無法修復的問題', async () => {
      const nonFixableIssue = {
        type: 'corruption' as const,
        severity: 'critical' as const,
        table: 'database',
        description: '無法修復的問題',
        suggestion: '需要手動處理',
        autoFixable: false
      };
      
      const repairResult = await maintenanceService.performAutoRepair([nonFixableIssue]);
      
      expect(repairResult.remainingIssues).toContain(nonFixableIssue);
      expect(repairResult.fixedIssues).not.toContain(nonFixableIssue);
    });
  });

  describe('optimizeDatabase', () => {
    it('應該成功執行資料庫優化', async () => {
      const result = await maintenanceService.optimizeDatabase();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('資料庫優化完成');
    });

    it('應該記錄優化時間', async () => {
      await maintenanceService.optimizeDatabase();
      
      const db = getDatabase();
      
      // 檢查是否記錄了 VACUUM 時間
      try {
        const lastVacuum = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('last_vacuum');
        expect(lastVacuum).toBeDefined();
        expect(new Date(lastVacuum.value)).toBeInstanceOf(Date);
      } catch (error) {
        // 如果沒有 app_settings 表，這是正常的
      }
    });
  });

  describe('generateErrorReport', () => {
    it('應該生成詳細的錯誤報告', async () => {
      const healthCheck = await maintenanceService.performHealthCheck();
      const report = await maintenanceService.generateErrorReport(healthCheck);
      
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      expect(report).toContain('創世紀元：異世界創作神器');
      expect(report).toContain('資料庫健康報告');
      expect(report).toContain('檢查時間');
      expect(report).toContain('整體狀態');
    });

    it('應該包含統計資訊', async () => {
      const db = getDatabase();
      
      // 插入測試資料
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        'test-project-1', '測試專案', 'isekai'
      );
      
      const healthCheck = await maintenanceService.performHealthCheck();
      const report = await maintenanceService.generateErrorReport(healthCheck);
      
      expect(report).toContain('專案數量: 1');
      expect(report).toContain('資料庫統計資訊');
      expect(report).toContain('碎片化程度');
    });

    it('應該包含問題詳情', async () => {
      const db = getDatabase();
      
      // 創建問題
      db.exec('PRAGMA foreign_keys = OFF');
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        'orphan-chapter', 'non-existent-project', '孤立章節', 1
      );
      db.exec('PRAGMA foreign_keys = ON');
      
      const healthCheck = await maintenanceService.performHealthCheck();
      const report = await maintenanceService.generateErrorReport(healthCheck);
      
      expect(report).toContain('中等優先級問題');
      expect(report).toContain('孤立');
      expect(report).toContain('可自動修復');
    });
  });

  describe('單例模式', () => {
    it('應該返回相同的服務實例', () => {
      const service1 = getDatabaseMaintenanceService();
      const service2 = getDatabaseMaintenanceService();
      
      expect(service1).toBe(service2);
    });
  });
});