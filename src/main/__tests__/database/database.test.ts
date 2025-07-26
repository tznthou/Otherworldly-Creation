import { initDatabase, getDatabase, closeDatabase } from '../../database/database';
import Database from 'better-sqlite3';
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

describe('Database Service', () => {
  const testDbPath = path.join(os.tmpdir(), 'test-genesis-chronicle', 'genesis-chronicle.db');
  
  beforeEach(() => {
    // 清理測試資料庫
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // 確保測試目錄存在
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
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

  describe('initDatabase', () => {
    it('應該成功初始化資料庫', async () => {
      await expect(initDatabase()).resolves.not.toThrow();
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('應該創建所有必要的資料表', async () => {
      await initDatabase();
      const db = getDatabase();
      
      // 檢查資料表是否存在
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();
      
      const tableNames = tables.map((table: any) => table.name);
      
      expect(tableNames).toContain('projects');
      expect(tableNames).toContain('chapters');
      expect(tableNames).toContain('characters');
      expect(tableNames).toContain('character_abilities');
      expect(tableNames).toContain('character_relationships');
      expect(tableNames).toContain('templates');
      expect(tableNames).toContain('db_version');
    });

    it('應該插入預設模板', async () => {
      await initDatabase();
      const db = getDatabase();
      
      const templates = db.prepare('SELECT * FROM templates').all();
      expect(templates.length).toBeGreaterThan(0);
      
      // 檢查是否有異世界模板
      const isekaiTemplate = templates.find((t: any) => t.type === 'isekai');
      expect(isekaiTemplate).toBeDefined();
      expect(isekaiTemplate.name).toBe('異世界轉生模板');
    });

    it('應該設置正確的資料庫版本', async () => {
      await initDatabase();
      const db = getDatabase();
      
      const version = db.prepare('SELECT version FROM db_version ORDER BY version DESC LIMIT 1').get();
      expect(version.version).toBe(1);
    });

    it('應該啟用外鍵約束', async () => {
      await initDatabase();
      const db = getDatabase();
      
      const foreignKeys = db.prepare('PRAGMA foreign_keys').get();
      expect(foreignKeys.foreign_keys).toBe(1);
    });
  });

  describe('getDatabase', () => {
    it('應該在初始化後返回資料庫實例', async () => {
      await initDatabase();
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(typeof db.prepare).toBe('function');
    });

    it('應該在未初始化時拋出錯誤', () => {
      expect(() => getDatabase()).toThrow('資料庫尚未初始化');
    });
  });

  describe('closeDatabase', () => {
    it('應該成功關閉資料庫', async () => {
      await initDatabase();
      expect(() => closeDatabase()).not.toThrow();
    });

    it('應該在未初始化時不拋出錯誤', () => {
      expect(() => closeDatabase()).not.toThrow();
    });
  });

  describe('資料庫遷移', () => {
    it('應該正確處理資料庫版本升級', async () => {
      // 創建舊版本資料庫
      const db = new Database(testDbPath);
      db.exec(`
        CREATE TABLE db_version (
          version INTEGER PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      db.exec('INSERT INTO db_version (version) VALUES (0)');
      db.close();

      // 執行遷移
      await initDatabase();
      const newDb = getDatabase();
      
      const version = newDb.prepare('SELECT version FROM db_version ORDER BY version DESC LIMIT 1').get();
      expect(version.version).toBe(1);
    });
  });

  describe('資料完整性', () => {
    beforeEach(async () => {
      await initDatabase();
    });

    it('應該支援外鍵約束', () => {
      const db = getDatabase();
      
      // 插入專案
      const projectId = 'test-project-1';
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      // 插入章節
      const chapterId = 'test-chapter-1';
      expect(() => {
        db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
          chapterId, projectId, '第一章', 1
        );
      }).not.toThrow();
      
      // 嘗試插入無效外鍵的章節
      expect(() => {
        db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
          'test-chapter-2', 'invalid-project', '第二章', 2
        );
      }).toThrow();
    });

    it('應該支援級聯刪除', () => {
      const db = getDatabase();
      
      // 插入測試資料
      const projectId = 'test-project-1';
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      const chapterId = 'test-chapter-1';
      db.prepare('INSERT INTO chapters (id, project_id, title, order_num) VALUES (?, ?, ?, ?)').run(
        chapterId, projectId, '第一章', 1
      );
      
      // 刪除專案
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      
      // 檢查章節是否被級聯刪除
      const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ?').all(projectId);
      expect(chapters).toHaveLength(0);
    });
  });
});