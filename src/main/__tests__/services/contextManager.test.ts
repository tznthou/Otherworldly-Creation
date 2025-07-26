import { ContextManagerImpl, setContextManager, getContextManager } from '../../services/contextManager';
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

describe('ContextManager', () => {
  let contextManager: ContextManagerImpl;
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

    // 初始化資料庫
    await initDatabase();
    const db = getDatabase();
    
    // 創建上下文管理器實例
    contextManager = new ContextManagerImpl(db);
    setContextManager(db);
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

  describe('buildContext', () => {
    it('應該構建完整的上下文', async () => {
      const db = getDatabase();
      
      // 插入測試資料
      const projectId = 'test-project-1';
      const chapterId = 'test-chapter-1';
      
      db.prepare('INSERT INTO projects (id, name, type, description) VALUES (?, ?, ?, ?)').run(
        projectId, '測試專案', 'isekai', '一個測試專案'
      );
      
      db.prepare('INSERT INTO chapters (id, project_id, title, content, order_num) VALUES (?, ?, ?, ?, ?)').run(
        chapterId, projectId, '第一章', '這是第一章的內容。\n\n主角開始了冒險。', 1
      );
      
      db.prepare('INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        'char-1', projectId, '主角', '勇者', 18, '男', '黑髮黑眼', '勇敢正義', '普通高中生'
      );
      
      const context = await contextManager.buildContext(projectId, chapterId, 10);
      
      expect(context).toContain('專案：測試專案');
      expect(context).toContain('類型：異世界');
      expect(context).toContain('主要角色：');
      expect(context).toContain('主角：18歲，男，勇者類型');
      expect(context).toContain('當前章節：第一章');
      expect(context).toContain('這是第一章的內容');
    });

    it('應該處理不存在的專案', async () => {
      await expect(contextManager.buildContext('non-existent', 'chapter-1', 0))
        .rejects.toThrow('找不到專案: non-existent');
    });

    it('應該處理不存在的章節', async () => {
      const db = getDatabase();
      const projectId = 'test-project-1';
      
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      await expect(contextManager.buildContext(projectId, 'non-existent-chapter', 0))
        .rejects.toThrow('找不到章節: non-existent-chapter');
    });

    it('應該處理沒有角色的專案', async () => {
      const db = getDatabase();
      const projectId = 'test-project-1';
      const chapterId = 'test-chapter-1';
      
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      db.prepare('INSERT INTO chapters (id, project_id, title, content, order_num) VALUES (?, ?, ?, ?, ?)').run(
        chapterId, projectId, '第一章', '內容', 1
      );
      
      const context = await contextManager.buildContext(projectId, chapterId, 0);
      
      expect(context).toContain('專案：測試專案');
      expect(context).toContain('當前章節：第一章');
      expect(context).not.toContain('主要角色：');
    });
  });

  describe('compressContext', () => {
    it('應該在不需要壓縮時返回原始上下文', () => {
      const shortContext = '這是一個短上下文';
      const result = contextManager.compressContext(shortContext, 1000);
      
      expect(result).toBe(shortContext);
    });

    it('應該壓縮過長的上下文', () => {
      const longContext = '專案：測試專案\n類型：異世界\n\n主要角色：\n- 主角：18歲，男，勇者類型\n  外貌：黑髮黑眼\n  性格：勇敢正義\n  背景：普通高中生\n\n當前章節：第一章\n\n' + 'A'.repeat(1000);
      
      const result = contextManager.compressContext(longContext, 50);
      
      expect(result.length).toBeLessThan(longContext.length);
      expect(result).toContain('專案：測試專案'); // 重要資訊應該保留
    });

    it('應該優先保留重要的部分', () => {
      const context = '專案：重要專案\n類型：異世界\n\n主要角色：\n- 主角：重要角色\n\n當前章節：重要章節\n\n' + 'B'.repeat(500);
      
      const result = contextManager.compressContext(context, 100);
      
      expect(result).toContain('專案：重要專案');
      expect(result).toContain('主要角色：');
      expect(result).toContain('當前章節：重要章節');
    });
  });

  describe('integrateCharacters', () => {
    it('應該整合角色資訊到上下文', () => {
      const context = '原始上下文';
      const characters = [
        {
          id: 'char-1',
          projectId: 'proj-1',
          name: '主角',
          archetype: '勇者',
          age: 18,
          gender: '男',
          appearance: '黑髮黑眼',
          personality: '勇敢',
          background: '高中生',
          abilities: ['劍術', '魔法'],
          relationships: [
            { targetId: 'char-2', type: '朋友', description: '好友關係' }
          ]
        }
      ];
      
      const result = contextManager.integrateCharacters(context, characters);
      
      expect(result).toContain('原始上下文');
      expect(result).toContain('角色資訊：');
      expect(result).toContain('主角：18歲，男，勇者類型');
      expect(result).toContain('外貌：黑髮黑眼');
      expect(result).toContain('性格：勇敢');
      expect(result).toContain('背景：高中生');
      expect(result).toContain('能力：劍術、魔法');
      expect(result).toContain('關係：');
    });

    it('應該處理空角色列表', () => {
      const context = '原始上下文';
      const result = contextManager.integrateCharacters(context, []);
      
      expect(result).toBe(context);
    });

    it('應該處理沒有能力和關係的角色', () => {
      const context = '原始上下文';
      const characters = [
        {
          id: 'char-1',
          projectId: 'proj-1',
          name: '簡單角色',
          archetype: '村民',
          age: 25,
          gender: '女',
          appearance: '普通',
          personality: '友善',
          background: '村民',
          abilities: [],
          relationships: []
        }
      ];
      
      const result = contextManager.integrateCharacters(context, characters);
      
      expect(result).toContain('簡單角色：25歲，女，村民類型');
      expect(result).not.toContain('能力：');
      expect(result).not.toContain('關係：');
    });
  });

  describe('extractRelevantContent', () => {
    it('應該在位置為0時返回空字符串', () => {
      const content = '這是一些內容';
      const result = contextManager.extractRelevantContent(content, 0);
      
      expect(result).toBe('');
    });

    it('應該在內容很短時返回空字符串', () => {
      const content = '短內容';
      const result = contextManager.extractRelevantContent(content, 3);
      
      expect(result).toBe('');
    });

    it('應該提取相關內容', () => {
      const content = '第一段內容。\n\n第二段內容，包含重要資訊。\n\n第三段內容。\n\n第四段內容。';
      const position = content.length - 10; // 接近結尾的位置
      
      const result = contextManager.extractRelevantContent(content, position);
      
      expect(result).toContain('第二段內容');
      expect(result).toContain('第三段內容');
      expect(result).toContain('第四段內容');
    });

    it('應該處理沒有段落分隔的內容', () => {
      const content = '這是一段很長的內容，沒有段落分隔，但是包含了很多重要的資訊和細節。';
      const position = content.length - 5;
      
      const result = contextManager.extractRelevantContent(content, position);
      
      expect(result).toBe(content);
    });
  });

  describe('analyzeContextQuality', () => {
    it('應該分析上下文品質', () => {
      const context = '這是一個測試上下文，包含專案資訊、角色資訊和章節內容。';
      
      const result = contextManager.analyzeContextQuality(context);
      
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('characterInfoQuality');
      expect(result).toHaveProperty('worldBuildingQuality');
      expect(result).toHaveProperty('narrativeCoherenceQuality');
      expect(result).toHaveProperty('overallQuality');
      expect(result).toHaveProperty('suggestions');
      
      expect(typeof result.totalTokens).toBe('number');
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.overallQuality).toBeGreaterThanOrEqual(0);
      expect(result.overallQuality).toBeLessThanOrEqual(100);
    });
  });

  describe('getRelevantCharacters', () => {
    it('應該獲取相關角色', async () => {
      const db = getDatabase();
      const projectId = 'test-project-1';
      
      // 插入測試資料
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      db.prepare('INSERT INTO characters (id, project_id, name, archetype, age, gender) VALUES (?, ?, ?, ?, ?, ?)').run(
        'char-1', projectId, '主角', '勇者', 18, '男'
      );
      
      db.prepare('INSERT INTO characters (id, project_id, name, archetype, age, gender) VALUES (?, ?, ?, ?, ?, ?)').run(
        'char-2', projectId, '夥伴', '法師', 17, '女'
      );
      
      const result = await contextManager.getRelevantCharacters(projectId, '測試內容');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('archetype');
    });

    it('應該處理沒有角色的專案', async () => {
      const db = getDatabase();
      const projectId = 'empty-project';
      
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '空專案', 'isekai'
      );
      
      const result = await contextManager.getRelevantCharacters(projectId, '測試內容');
      
      expect(result).toEqual([]);
    });
  });

  describe('detectNewCharacters', () => {
    it('應該檢測新角色', () => {
      const content = '「小明」對「小華」說話。';
      
      const result = contextManager.detectNewCharacters(content);
      
      expect(Array.isArray(result)).toBe(true);
      // 簡化實現返回空數組
      expect(result).toEqual([]);
    });
  });

  describe('checkConsistency', () => {
    it('應該檢查一致性', async () => {
      const content = '測試內容';
      const projectId = 'test-project';
      
      const result = await contextManager.checkConsistency(content, projectId);
      
      expect(Array.isArray(result)).toBe(true);
      // 簡化實現返回空數組
      expect(result).toEqual([]);
    });
  });

  describe('單例模式', () => {
    it('應該正確設置和獲取上下文管理器', () => {
      const db = getDatabase();
      setContextManager(db);
      
      const manager = getContextManager();
      expect(manager).toBeDefined();
      expect(typeof manager.buildContext).toBe('function');
    });

    it('應該在未初始化時拋出錯誤', () => {
      // 重置單例
      jest.resetModules();
      const { getContextManager: getNewContextManager } = require('../../services/contextManager');
      
      expect(() => getNewContextManager()).toThrow('上下文管理器尚未初始化');
    });
  });

  describe('私有方法測試（通過公共方法間接測試）', () => {
    it('應該正確處理不同專案類型', async () => {
      const db = getDatabase();
      
      // 測試不同類型的專案
      const projectTypes = ['isekai', 'school', 'scifi', 'fantasy'];
      
      for (const type of projectTypes) {
        const projectId = `test-${type}`;
        const chapterId = `chapter-${type}`;
        
        db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
          projectId, `${type}專案`, type
        );
        
        db.prepare('INSERT INTO chapters (id, project_id, title, content, order_num) VALUES (?, ?, ?, ?, ?)').run(
          chapterId, projectId, '測試章節', '測試內容', 1
        );
        
        const context = await contextManager.buildContext(projectId, chapterId, 0);
        
        expect(context).toContain(`專案：${type}專案`);
        expect(context).toContain('類型：');
      }
    });

    it('應該正確處理角色關係', async () => {
      const db = getDatabase();
      const projectId = 'test-project';
      const chapterId = 'test-chapter';
      
      // 插入專案和章節
      db.prepare('INSERT INTO projects (id, name, type) VALUES (?, ?, ?)').run(
        projectId, '測試專案', 'isekai'
      );
      
      db.prepare('INSERT INTO chapters (id, project_id, title, content, order_num) VALUES (?, ?, ?, ?, ?)').run(
        chapterId, projectId, '測試章節', '測試內容', 1
      );
      
      // 插入角色
      db.prepare('INSERT INTO characters (id, project_id, name, archetype, age, gender) VALUES (?, ?, ?, ?, ?, ?)').run(
        'char-1', projectId, '主角', '勇者', 18, '男'
      );
      
      db.prepare('INSERT INTO characters (id, project_id, name, archetype, age, gender) VALUES (?, ?, ?, ?, ?, ?)').run(
        'char-2', projectId, '夥伴', '法師', 17, '女'
      );
      
      // 插入關係
      db.prepare('INSERT INTO character_relationships (id, source_id, target_id, type, description) VALUES (?, ?, ?, ?, ?)').run(
        'rel-1', 'char-1', 'char-2', '朋友', '好友關係'
      );
      
      const context = await contextManager.buildContext(projectId, chapterId, 0);
      
      expect(context).toContain('主角：18歲，男，勇者類型');
      expect(context).toContain('夥伴：17歲，女，法師類型');
    });
  });
});