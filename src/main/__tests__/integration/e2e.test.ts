import { initDatabase, getDatabase, closeDatabase } from '../../database/database';
import { setContextManager, getContextManager } from '../../services/contextManager';
import { getDatabaseMaintenanceService } from '../../services/databaseMaintenance';
import { ollamaService } from '../../services/ollamaService';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Mock Electron API
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, '../../../test-data')),
  },
}));

// Mock fetch for Ollama service
global.fetch = jest.fn();

describe('端到端整合測試', () => {
  let testDbPath: string;

  beforeAll(async () => {
    // 設置測試環境
    testDbPath = path.join(__dirname, '../../../test-data', 'genesis-chronicle.db');
    
    // 確保測試目錄存在
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 初始化應用程式
    await initDatabase();
    const db = getDatabase();
    setContextManager(db);

    // Mock Ollama 服務
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/tags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            models: [
              { name: 'llama3', size: 4661224676 }
            ]
          }),
        });
      }
      
      if (url.includes('/api/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            response: '這是AI生成的測試內容，包含了豐富的情節和角色描述。',
            done: true
          }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterAll(async () => {
    // 清理測試資料
    closeDatabase();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('完整專案工作流程', () => {
    let projectId: string;
    let characterId: string;
    let chapterId: string;

    it('應該能創建新專案', async () => {
      const db = getDatabase();
      projectId = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO projects (id, name, type, description, settings)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        projectId,
        '測試異世界小說',
        'isekai',
        '一個關於轉生到異世界的故事',
        JSON.stringify({
          genre: 'fantasy',
          targetLength: 'novel',
          writingStyle: 'light'
        })
      );

      expect(result.changes).toBe(1);

      // 驗證專案已創建
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project).toBeDefined();
      expect(project.name).toBe('測試異世界小說');
      expect(project.type).toBe('isekai');
    });

    it('應該能創建角色', async () => {
      const db = getDatabase();
      characterId = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        characterId,
        projectId,
        '田中太郎',
        '轉生勇者',
        18,
        '男',
        '黑髮黑眼，身材中等',
        '正義感強烈但有些天然呆',
        '原本是普通的高中生，因為意外轉生到異世界'
      );

      expect(result.changes).toBe(1);

      // 驗證角色已創建
      const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
      expect(character).toBeDefined();
      expect(character.name).toBe('田中太郎');
      expect(character.archetype).toBe('轉生勇者');
    });

    it('應該能創建章節', async () => {
      const db = getDatabase();
      chapterId = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        chapterId,
        projectId,
        '第一章：異世界召喚',
        '田中太郎正在上學的路上，突然被一道光芒包圍...',
        1
      );

      expect(result.changes).toBe(1);

      // 驗證章節已創建
      const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
      expect(chapter).toBeDefined();
      expect(chapter.title).toBe('第一章：異世界召喚');
      expect(chapter.order_num).toBe(1);
    });

    it('應該能構建上下文', async () => {
      const contextManager = getContextManager();
      
      const context = await contextManager.buildContext(projectId, chapterId, 10);
      
      expect(context).toContain('專案：測試異世界小說');
      expect(context).toContain('田中太郎');
      expect(context).toContain('第一章：異世界召喚');
      expect(context.length).toBeGreaterThan(100);
    });

    it('應該能使用AI生成內容', async () => {
      const result = await ollamaService.generateText(
        'llama3',
        '請繼續這個異世界故事：田中太郎被召喚到異世界後...'
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response!.length).toBeGreaterThan(10);
    });

    it('應該能執行資料庫維護', async () => {
      const maintenanceService = getDatabaseMaintenanceService();
      
      // 執行健康檢查
      const healthResult = await maintenanceService.performHealthCheck();
      expect(healthResult.isHealthy).toBeDefined();
      expect(Array.isArray(healthResult.issues)).toBe(true);
      expect(healthResult.statistics).toBeDefined();

      // 生成報告
      const report = await maintenanceService.generateErrorReport(healthResult);
      expect(report).toContain('資料庫健康檢查報告');
      expect(report).toContain('統計資訊');
    });
  });

  describe('資料完整性測試', () => {
    it('應該維護外鍵約束', async () => {
      const db = getDatabase();
      
      // 嘗試插入無效的外鍵引用
      const stmt = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      expect(() => {
        stmt.run(uuidv4(), 'invalid-project-id', '測試章節', '測試內容', 1);
      }).toThrow();
    });

    it('應該支援級聯刪除', async () => {
      const db = getDatabase();
      const testProjectId = uuidv4();
      const testChapterId = uuidv4();
      
      // 創建測試專案和章節
      db.prepare(`
        INSERT INTO projects (id, name, type, description)
        VALUES (?, ?, ?, ?)
      `).run(testProjectId, '測試專案', 'fantasy', '測試描述');
      
      db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num)
        VALUES (?, ?, ?, ?, ?)
      `).run(testChapterId, testProjectId, '測試章節', '測試內容', 1);
      
      // 刪除專案
      db.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
      
      // 驗證章節也被刪除
      const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(testChapterId);
      expect(chapter).toBeUndefined();
    });
  });

  describe('錯誤處理測試', () => {
    it('應該處理資料庫連接錯誤', async () => {
      // 模擬資料庫錯誤
      const db = getDatabase();
      const originalPrepare = db.prepare;
      
      db.prepare = jest.fn(() => {
        throw new Error('資料庫連接失敗');
      });
      
      const maintenanceService = getDatabaseMaintenanceService();
      const result = await maintenanceService.performHealthCheck();
      
      expect(result.isHealthy).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      
      // 恢復原始方法
      db.prepare = originalPrepare;
    });

    it('應該處理AI服務錯誤', async () => {
      // 模擬網路錯誤
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('網路連接失敗'));
      
      const result = await ollamaService.generateText('llama3', '測試提示');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('網路連接失敗');
    });
  });
});