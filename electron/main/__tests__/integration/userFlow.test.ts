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

describe('使用者流程測試', () => {
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
            response: '這是AI生成的精彩內容，包含了豐富的情節發展和角色互動。故事在這裡變得更加引人入勝，主角面臨新的挑戰...',
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

  describe('新手使用者完整流程', () => {
    let projectId: string;
    let mainCharacterId: string;
    let supportCharacterId: string;
    let chapter1Id: string;
    let chapter2Id: string;

    it('步驟1：創建新專案（異世界小說）', async () => {
      const db = getDatabase();
      projectId = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO projects (id, name, type, description, settings)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        projectId,
        '異世界轉生記',
        'isekai',
        '一個普通高中生轉生到異世界成為勇者的故事',
        JSON.stringify({
          genre: 'fantasy',
          targetLength: 'novel',
          writingStyle: 'light',
          targetAudience: 'young_adult'
        })
      );

      expect(result.changes).toBe(1);
      console.log('✅ 專案創建成功');
    });

    it('步驟2：創建主要角色（田中太郎 - 勇者）', async () => {
      const db = getDatabase();
      mainCharacterId = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        mainCharacterId,
        projectId,
        '田中太郎',
        '轉生勇者',
        18,
        '男',
        '黑髮黑眼，身材中等，有著普通高中生的外表',
        '正義感強烈但有些天然呆，保持著現代人的常識和價值觀',
        '原本是東京的普通高中生，因為交通意外而死亡，被女神轉生到異世界並獲得了勇者的力量'
      );

      expect(result.changes).toBe(1);
      
      // 添加角色能力
      const abilityStmt = db.prepare(`
        INSERT INTO character_abilities (id, character_id, name, description)
        VALUES (?, ?, ?, ?)
      `);
      
      abilityStmt.run(uuidv4(), mainCharacterId, '聖劍術', '能夠使用聖劍進行戰鬥，對邪惡生物有特效');
      abilityStmt.run(uuidv4(), mainCharacterId, '現代知識', '保留前世的現代知識，能夠創新和改良');
      
      console.log('✅ 主角創建成功');
    });

    it('步驟3：創建支援角色（艾莉絲 - 法師）', async () => {
      const db = getDatabase();
      supportCharacterId = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        supportCharacterId,
        projectId,
        '艾莉絲',
        '精靈法師',
        120,
        '女',
        '金髮碧眼，尖耳朵，身材纖細優雅',
        '高傲但善良，對魔法有著極高的天賦和熱情',
        '精靈族的天才法師，因為對人類世界的好奇而加入勇者的隊伍'
      );

      expect(result.changes).toBe(1);
      
      // 添加角色能力
      const abilityStmt = db.prepare(`
        INSERT INTO character_abilities (id, character_id, name, description)
        VALUES (?, ?, ?, ?)
      `);
      
      abilityStmt.run(uuidv4(), supportCharacterId, '高級魔法', '能夠使用各種高級魔法，包括攻擊、防禦和輔助魔法');
      abilityStmt.run(uuidv4(), supportCharacterId, '魔法研究', '對魔法理論有深入研究，能夠開發新的魔法');
      
      // 建立角色關係
      const relationStmt = db.prepare(`
        INSERT INTO character_relationships (id, source_id, target_id, type, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      relationStmt.run(uuidv4(), mainCharacterId, supportCharacterId, '夥伴', '勇者隊伍的重要成員，逐漸發展出深厚友誼');
      relationStmt.run(uuidv4(), supportCharacterId, mainCharacterId, '夥伴', '對勇者的現代知識感到好奇和欽佩');
      
      console.log('✅ 支援角色創建成功');
    });

    it('步驟4：撰寫第一章（異世界召喚）', async () => {
      const db = getDatabase();
      chapter1Id = uuidv4();
      
      const content = `
        田中太郎正走在回家的路上，突然一輛失控的卡車向他衝來。
        
        "糟糕！"他心想，但已經來不及閃避。
        
        當他再次睜開眼睛時，發現自己站在一個華麗的魔法陣中央，周圍是穿著長袍的人們。
        
        "歡迎來到阿爾卡迪亞王國，勇者大人！"一位美麗的女祭司向他鞠躬說道。
        
        田中太郎愣住了，這不是他熟悉的世界...
      `;
      
      const stmt = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        chapter1Id,
        projectId,
        '第一章：異世界召喚',
        content.trim(),
        1
      );

      expect(result.changes).toBe(1);
      console.log('✅ 第一章撰寫完成');
    });

    it('步驟5：使用AI輔助撰寫第二章（魔法學院）', async () => {
      const contextManager = getContextManager();
      
      // 構建上下文
      const context = await contextManager.buildContext(projectId, chapter1Id, 10);
      expect(context).toContain('田中太郎');
      expect(context).toContain('艾莉絲');
      
      // 使用AI生成內容
      const prompt = `
        基於以下上下文，請繼續撰寫第二章，描述田中太郎在魔法學院的第一天：
        
        ${context}
        
        請描述他如何遇到艾莉絲，以及他們的第一次互動。
      `;
      
      const aiResult = await ollamaService.generateText('llama3', prompt);
      expect(aiResult.success).toBe(true);
      expect(aiResult.response!.length).toBeGreaterThan(100);
      
      // 創建第二章
      const db = getDatabase();
      chapter2Id = uuidv4();
      
      const stmt = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        chapter2Id,
        projectId,
        '第二章：魔法學院',
        aiResult.response!,
        2
      );

      expect(result.changes).toBe(1);
      console.log('✅ AI輔助第二章撰寫完成');
    });

    it('步驟6：執行專案維護', async () => {
      const maintenanceService = getDatabaseMaintenanceService();
      
      // 執行健康檢查
      const healthResult = await maintenanceService.performHealthCheck();
      expect(healthResult).toBeDefined();
      expect(typeof healthResult.isHealthy).toBe('boolean');
      
      // 生成報告
      const report = await maintenanceService.generateErrorReport(healthResult);
      expect(report).toContain('資料庫健康檢查報告');
      expect(report).toContain('專案數量');
      expect(report).toContain('角色數量');
      expect(report).toContain('章節數量');
      
      // 執行優化
      const optimizeResult = await maintenanceService.optimizeDatabase();
      expect(optimizeResult.success).toBe(true);
      
      console.log('✅ 專案維護完成');
    });

    it('步驟7：專案匯出和匯入功能測試', async () => {
      const db = getDatabase();
      
      // 模擬匯出功能
      const exportData = {
        projects: db.prepare('SELECT * FROM projects WHERE id = ?').all(projectId),
        chapters: db.prepare('SELECT * FROM chapters WHERE project_id = ?').all(projectId),
        characters: db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId),
        character_abilities: db.prepare(`
          SELECT ca.* FROM character_abilities ca
          JOIN characters c ON ca.character_id = c.id
          WHERE c.project_id = ?
        `).all(projectId),
        character_relationships: db.prepare(`
          SELECT cr.* FROM character_relationships cr
          JOIN characters c ON cr.source_id = c.id
          WHERE c.project_id = ?
        `).all(projectId)
      };
      
      expect(exportData.projects.length).toBe(1);
      expect(exportData.chapters.length).toBe(2);
      expect(exportData.characters.length).toBe(2);
      expect(exportData.character_abilities.length).toBeGreaterThan(0);
      expect(exportData.character_relationships.length).toBeGreaterThan(0);
      
      console.log('✅ 專案匯出測試完成');
      
      // 驗證資料完整性
      const project = exportData.projects[0];
      expect(project.name).toBe('異世界轉生記');
      expect(project.type).toBe('isekai');
      
      const chapters = exportData.chapters.sort((a: any, b: any) => a.order_num - b.order_num);
      expect(chapters[0].title).toBe('第一章：異世界召喚');
      expect(chapters[1].title).toBe('第二章：魔法學院');
      
      console.log('✅ 匯出資料驗證完成');
    });
  });

  describe('進階使用者流程', () => {
    it('應該能處理批量操作', async () => {
      const db = getDatabase();
      const batchSize = 10;
      const projectIds: string[] = [];
      
      // 批量創建專案
      const projectStmt = db.prepare(`
        INSERT INTO projects (id, name, type, description)
        VALUES (?, ?, ?, ?)
      `);
      
      for (let i = 0; i < batchSize; i++) {
        const id = uuidv4();
        projectIds.push(id);
        projectStmt.run(id, `批量專案 ${i + 1}`, 'fantasy', `批量測試專案 ${i + 1}`);
      }
      
      // 驗證批量創建
      const projects = db.prepare('SELECT * FROM projects WHERE name LIKE ?').all('批量專案%');
      expect(projects.length).toBe(batchSize);
      
      // 批量刪除
      const deleteStmt = db.prepare('DELETE FROM projects WHERE id = ?');
      projectIds.forEach(id => deleteStmt.run(id));
      
      // 驗證批量刪除
      const remainingProjects = db.prepare('SELECT * FROM projects WHERE name LIKE ?').all('批量專案%');
      expect(remainingProjects.length).toBe(0);
      
      console.log('✅ 批量操作測試完成');
    });

    it('應該能處理複雜角色關係網路', async () => {
      const db = getDatabase();
      const testProjectId = uuidv4();
      
      // 創建測試專案
      db.prepare(`
        INSERT INTO projects (id, name, type, description)
        VALUES (?, ?, ?, ?)
      `).run(testProjectId, '複雜關係測試', 'fantasy', '測試複雜角色關係');
      
      // 創建多個角色
      const characterIds: string[] = [];
      const characterNames = ['主角', '女主角', '反派', '導師', '夥伴A', '夥伴B'];
      
      const charStmt = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      characterNames.forEach((name, index) => {
        const id = uuidv4();
        characterIds.push(id);
        charStmt.run(id, testProjectId, name, '測試原型', 20 + index, index % 2 === 0 ? '男' : '女');
      });
      
      // 建立複雜關係網路
      const relationStmt = db.prepare(`
        INSERT INTO character_relationships (id, source_id, target_id, type, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      // 主角與其他角色的關係
      relationStmt.run(uuidv4(), characterIds[0], characterIds[1], '戀人', '主角與女主角的戀愛關係');
      relationStmt.run(uuidv4(), characterIds[0], characterIds[2], '敵人', '主角與反派的對立關係');
      relationStmt.run(uuidv4(), characterIds[0], characterIds[3], '師徒', '主角與導師的師徒關係');
      relationStmt.run(uuidv4(), characterIds[0], characterIds[4], '夥伴', '主角與夥伴A的友誼');
      relationStmt.run(uuidv4(), characterIds[0], characterIds[5], '夥伴', '主角與夥伴B的友誼');
      
      // 其他角色間的關係
      relationStmt.run(uuidv4(), characterIds[1], characterIds[2], '敵人', '女主角與反派的對立');
      relationStmt.run(uuidv4(), characterIds[4], characterIds[5], '夥伴', '夥伴A與夥伴B的友誼');
      
      // 驗證關係網路
      const relationships = db.prepare(`
        SELECT * FROM character_relationships cr
        JOIN characters c ON cr.source_id = c.id
        WHERE c.project_id = ?
      `).all(testProjectId);
      
      expect(relationships.length).toBe(7);
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
      
      console.log('✅ 複雜關係網路測試完成');
    });
  });

  describe('錯誤恢復流程', () => {
    it('應該能檢測和修復資料損壞', async () => {
      const maintenanceService = getDatabaseMaintenanceService();
      const db = getDatabase();
      
      // 創建測試資料
      const testProjectId = uuidv4();
      const testChapterId = uuidv4();
      
      db.prepare(`
        INSERT INTO projects (id, name, type, description)
        VALUES (?, ?, ?, ?)
      `).run(testProjectId, '損壞測試專案', 'fantasy', '測試資料損壞恢復');
      
      db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num)
        VALUES (?, ?, ?, ?, ?)
      `).run(testChapterId, testProjectId, '測試章節', '測試內容', 1);
      
      // 執行健康檢查
      const healthResult = await maintenanceService.performHealthCheck();
      expect(healthResult).toBeDefined();
      
      // 如果有問題，嘗試自動修復
      if (healthResult.issues.length > 0) {
        const repairResult = await maintenanceService.performAutoRepair(healthResult.issues);
        expect(repairResult).toBeDefined();
        expect(typeof repairResult.success).toBe('boolean');
      }
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
      
      console.log('✅ 資料損壞檢測和修復測試完成');
    });
  });
});