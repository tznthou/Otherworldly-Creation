import { initDatabase, getDatabase, closeDatabase } from '../../database/database';
import { setContextManager, getContextManager } from '../../services/contextManager';
import { getDatabaseMaintenanceService } from '../../services/databaseMaintenance';
import { ollamaService } from '../../services/ollamaService';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 模擬 Electron 環境
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(os.tmpdir(), 'test-genesis-chronicle-perf')),
  },
}));

// 模擬 fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

/**
 * 性能測試套件
 * 測試系統在各種負載條件下的性能表現
 */
describe('性能測試', () => {
  const testDbPath = path.join(os.tmpdir(), 'test-genesis-chronicle-perf', 'genesis-chronicle.db');

  beforeAll(async () => {
    // 清理測試環境
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 初始化應用程式
    await initDatabase();
    const db = getDatabase();
    setContextManager(db);
  });

  afterAll(async () => {
    try {
      closeDatabase();
    } catch (error) {
      // 忽略關閉錯誤
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('資料庫性能測試', () => {
    it('大量專案創建性能測試', async () => {
      const db = getDatabase();
      const projectCount = 1000;
      
      console.log(`開始創建 ${projectCount} 個專案...`);
      const startTime = performance.now();
      
      const insertProject = db.prepare(`
        INSERT INTO projects (id, name, type, description, created_at, updated_at) 
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const transaction = db.transaction(() => {
        for (let i = 0; i < projectCount; i++) {
          insertProject.run(
            `perf-project-${i}`,
            `性能測試專案 ${i}`,
            'isekai',
            `這是第 ${i} 個性能測試專案`
          );
        }
      });
      
      transaction();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`創建 ${projectCount} 個專案耗時: ${duration.toFixed(2)}ms`);
      
      // 驗證創建成功
      const count = db.prepare('SELECT COUNT(*) as count FROM projects WHERE id LIKE "perf-project-%"').get() as { count: number };
      expect(count.count).toBe(projectCount);
      
      // 性能要求：1000個專案應該在2秒內創建完成
      expect(duration).toBeLessThan(2000);
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id LIKE "perf-project-%"').run();
      
      console.log('✅ 大量專案創建性能測試通過');
    });

    it('大量章節查詢性能測試', async () => {
      const db = getDatabase();
      
      // 創建測試專案
      const testProjectId = 'perf-query-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(testProjectId, '查詢性能測試專案', 'isekai');
      
      // 創建大量章節
      const chapterCount = 5000;
      console.log(`創建 ${chapterCount} 個章節用於查詢測試...`);
      
      const insertChapter = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const createTransaction = db.transaction(() => {
        for (let i = 0; i < chapterCount; i++) {
          insertChapter.run(
            `perf-chapter-${i}`,
            testProjectId,
            `第 ${i + 1} 章`,
            `這是第 ${i + 1} 章的內容。`.repeat(100), // 較長的內容
            i + 1
          );
        }
      });
      
      createTransaction();
      
      // 測試查詢性能
      console.log('開始查詢性能測試...');
      const queryStartTime = performance.now();
      
      // 執行多種查詢
      const queries = [
        () => db.prepare('SELECT * FROM chapters WHERE project_id = ?').all(testProjectId),
        () => db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_num').all(testProjectId),
        () => db.prepare('SELECT COUNT(*) FROM chapters WHERE project_id = ?').get(testProjectId),
        () => db.prepare('SELECT * FROM chapters WHERE project_id = ? AND order_num BETWEEN ? AND ?').all(testProjectId, 1000, 2000),
        () => db.prepare('SELECT title, order_num FROM chapters WHERE project_id = ? ORDER BY order_num DESC LIMIT 100').all(testProjectId)
      ];
      
      queries.forEach((query, index) => {
        const start = performance.now();
        const result = query();
        const end = performance.now();
        console.log(`查詢 ${index + 1} 耗時: ${(end - start).toFixed(2)}ms`);
      });
      
      const queryEndTime = performance.now();
      const totalQueryDuration = queryEndTime - queryStartTime;
      
      console.log(`總查詢耗時: ${totalQueryDuration.toFixed(2)}ms`);
      
      // 性能要求：所有查詢應該在1秒內完成
      expect(totalQueryDuration).toBeLessThan(1000);
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
      
      console.log('✅ 大量章節查詢性能測試通過');
    });

    it('複雜關聯查詢性能測試', async () => {
      const db = getDatabase();
      
      // 創建測試專案
      const complexProjectId = 'complex-query-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(complexProjectId, '複雜查詢測試專案', 'fantasy');
      
      // 創建角色和關係
      const characterCount = 500;
      const relationshipCount = 2000;
      
      console.log(`創建 ${characterCount} 個角色和 ${relationshipCount} 個關係...`);
      
      const insertCharacter = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const insertRelationship = db.prepare(`
        INSERT INTO character_relationships (id, source_id, target_id, type, description) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const setupTransaction = db.transaction(() => {
        // 創建角色
        for (let i = 0; i < characterCount; i++) {
          insertCharacter.run(
            `complex-char-${i}`,
            complexProjectId,
            `角色${i}`,
            ['勇者', '法師', '盜賊', '牧師', '戰士'][i % 5],
            18 + (i % 50),
            i % 2 === 0 ? '男' : '女'
          );
        }
        
        // 創建關係
        for (let i = 0; i < relationshipCount; i++) {
          const sourceId = `complex-char-${Math.floor(Math.random() * characterCount)}`;
          const targetId = `complex-char-${Math.floor(Math.random() * characterCount)}`;
          
          if (sourceId !== targetId) {
            insertRelationship.run(
              `complex-rel-${i}`,
              sourceId,
              targetId,
              ['朋友', '敵人', '戀人', '師徒', '同伴'][i % 5],
              `關係描述 ${i}`
            );
          }
        }
      });
      
      setupTransaction();
      
      // 測試複雜查詢性能
      console.log('開始複雜關聯查詢測試...');
      const complexQueryStartTime = performance.now();
      
      const complexQueries = [
        // 查詢角色及其所有關係
        () => db.prepare(`
          SELECT c.*, 
                 COUNT(cr1.id) as outgoing_relationships,
                 COUNT(cr2.id) as incoming_relationships
          FROM characters c
          LEFT JOIN character_relationships cr1 ON c.id = cr1.source_id
          LEFT JOIN character_relationships cr2 ON c.id = cr2.target_id
          WHERE c.project_id = ?
          GROUP BY c.id
          LIMIT 100
        `).all(complexProjectId),
        
        // 查詢特定類型的關係網路
        () => db.prepare(`
          SELECT cr.*, 
                 s.name as source_name, 
                 t.name as target_name
          FROM character_relationships cr
          JOIN characters s ON cr.source_id = s.id
          JOIN characters t ON cr.target_id = t.id
          WHERE s.project_id = ? AND cr.type = '朋友'
          ORDER BY s.name
        `).all(complexProjectId),
        
        // 查詢角色統計
        () => db.prepare(`
          SELECT archetype, 
                 COUNT(*) as count,
                 AVG(age) as avg_age
          FROM characters 
          WHERE project_id = ?
          GROUP BY archetype
        `).all(complexProjectId)
      ];
      
      complexQueries.forEach((query, index) => {
        const start = performance.now();
        const result = query();
        const end = performance.now();
        console.log(`複雜查詢 ${index + 1} 耗時: ${(end - start).toFixed(2)}ms, 結果數: ${Array.isArray(result) ? result.length : 1}`);
      });
      
      const complexQueryEndTime = performance.now();
      const totalComplexDuration = complexQueryEndTime - complexQueryStartTime;
      
      console.log(`複雜查詢總耗時: ${totalComplexDuration.toFixed(2)}ms`);
      
      // 性能要求：複雜查詢應該在2秒內完成
      expect(totalComplexDuration).toBeLessThan(2000);
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(complexProjectId);
      
      console.log('✅ 複雜關聯查詢性能測試通過');
    });
  });

  describe('上下文管理性能測試', () => {
    it('大型專案上下文構建性能測試', async () => {
      const db = getDatabase();
      const contextManager = getContextManager();
      
      // 創建大型測試專案
      const largeProjectId = 'large-context-project';
      db.prepare(`
        INSERT INTO projects (id, name, type, description) 
        VALUES (?, ?, ?, ?)
      `).run(
        largeProjectId, 
        '大型上下文測試專案', 
        'epic-fantasy',
        '這是一個包含大量內容的史詩奇幻專案，用於測試上下文構建性能。'.repeat(10)
      );
      
      // 創建大量角色
      const characterCount = 100;
      const insertCharacter = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (let i = 0; i < characterCount; i++) {
        insertCharacter.run(
          `large-char-${i}`,
          largeProjectId,
          `角色${i}`,
          ['勇者', '法師', '盜賊', '牧師', '戰士', '弓箭手', '騎士', '刺客'][i % 8],
          18 + (i % 60),
          i % 2 === 0 ? '男' : '女',
          `這是角色${i}的外觀描述。`.repeat(5),
          `這是角色${i}的性格描述。`.repeat(5),
          `這是角色${i}的背景故事。`.repeat(10)
        );
      }
      
      // 創建大量章節
      const chapterCount = 50;
      const insertChapter = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (let i = 0; i < chapterCount; i++) {
        insertChapter.run(
          `large-chapter-${i}`,
          largeProjectId,
          `第 ${i + 1} 章：章節標題`,
          `這是第 ${i + 1} 章的內容。`.repeat(200), // 較長的章節內容
          i + 1
        );
      }
      
      // 測試上下文構建性能
      console.log('開始大型專案上下文構建測試...');
      
      const contextTests = [
        { chapterIndex: 0, description: '第一章上下文' },
        { chapterIndex: 25, description: '中間章節上下文' },
        { chapterIndex: 49, description: '最後章節上下文' }
      ];
      
      for (const test of contextTests) {
        const startTime = performance.now();
        const context = await contextManager.buildContext(largeProjectId, `large-chapter-${test.chapterIndex}`, 0);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`${test.description}構建耗時: ${duration.toFixed(2)}ms, 上下文長度: ${context.length}`);
        
        // 驗證上下文內容
        expect(context).toContain('大型上下文測試專案');
        expect(context).toContain('角色');
        expect(context).toContain('第');
        
        // 性能要求：上下文構建應該在1秒內完成
        expect(duration).toBeLessThan(1000);
      }
      
      // 測試上下文壓縮性能
      console.log('測試上下文壓縮性能...');
      const fullContext = await contextManager.buildContext(largeProjectId, `large-chapter-25`, 0);
      
      const compressionTests = [
        { maxLength: 1000, description: '壓縮到1000字符' },
        { maxLength: 500, description: '壓縮到500字符' },
        { maxLength: 200, description: '壓縮到200字符' }
      ];
      
      for (const test of compressionTests) {
        const startTime = performance.now();
        const compressed = contextManager.compressContext(fullContext, test.maxLength);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`${test.description}耗時: ${duration.toFixed(2)}ms, 壓縮後長度: ${compressed.length}`);
        
        expect(compressed.length).toBeLessThanOrEqual(test.maxLength);
        expect(duration).toBeLessThan(100); // 壓縮應該很快
      }
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(largeProjectId);
      
      console.log('✅ 大型專案上下文構建性能測試通過');
    });
  });

  describe('AI 服務性能測試', () => {
    it('並發 AI 請求性能測試', async () => {
      // 模擬 AI 服務響應
      mockFetch
        .mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '這是 AI 生成的測試回應內容。',
            done: true,
            total_duration: 1000000,
            eval_count: 20,
            eval_duration: 500000,
          }),
        } as any);
      
      console.log('開始並發 AI 請求測試...');
      
      const concurrentRequests = 10;
      const requests = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          ollamaService.generateText('llama3', `這是第 ${i + 1} 個測試請求`)
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      console.log(`${concurrentRequests} 個並發請求總耗時: ${totalDuration.toFixed(2)}ms`);
      console.log(`平均每個請求耗時: ${(totalDuration / concurrentRequests).toFixed(2)}ms`);
      
      // 驗證所有請求都成功
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.response).toContain('AI 生成的測試回應');
      });
      
      // 性能要求：10個並發請求應該在5秒內完成
      expect(totalDuration).toBeLessThan(5000);
      
      console.log('✅ 並發 AI 請求性能測試通過');
    });

    it('大文本 AI 處理性能測試', async () => {
      // 創建大文本
      const largeText = '這是一段很長的文本內容。'.repeat(1000);
      
      // 模擬處理大文本的 AI 響應
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '基於提供的大量文本，我生成了相應的回應內容。',
            done: true,
            total_duration: 5000000,
            eval_count: 100,
            eval_duration: 3000000,
          }),
        } as any);
      
      console.log(`開始大文本處理測試，文本長度: ${largeText.length} 字符`);
      
      const startTime = performance.now();
      const result = await ollamaService.generateText('llama3', largeText);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`大文本處理耗時: ${duration.toFixed(2)}ms`);
      
      expect(result.success).toBe(true);
      expect(result.response).toContain('回應內容');
      
      // 性能要求：大文本處理應該在10秒內完成
      expect(duration).toBeLessThan(10000);
      
      console.log('✅ 大文本 AI 處理性能測試通過');
    });
  });

  describe('資料庫維護性能測試', () => {
    it('大型資料庫健康檢查性能測試', async () => {
      const db = getDatabase();
      const maintenanceService = getDatabaseMaintenanceService();
      
      // 創建大量測試資料
      console.log('創建大量測試資料...');
      
      const projectCount = 100;
      const chapterPerProject = 20;
      const characterPerProject = 10;
      
      const insertProject = db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `);
      
      const insertChapter = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const insertCharacter = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype) 
        VALUES (?, ?, ?, ?)
      `);
      
      const setupTransaction = db.transaction(() => {
        for (let p = 0; p < projectCount; p++) {
          const projectId = `maint-project-${p}`;
          insertProject.run(projectId, `維護測試專案 ${p}`, 'isekai');
          
          // 為每個專案創建章節
          for (let c = 0; c < chapterPerProject; c++) {
            insertChapter.run(
              `maint-chapter-${p}-${c}`,
              projectId,
              `第 ${c + 1} 章`,
              `章節內容 ${c}`,
              c + 1
            );
          }
          
          // 為每個專案創建角色
          for (let ch = 0; ch < characterPerProject; ch++) {
            insertCharacter.run(
              `maint-character-${p}-${ch}`,
              projectId,
              `角色 ${ch}`,
              '村民'
            );
          }
        }
      });
      
      setupTransaction();
      
      console.log(`已創建 ${projectCount} 個專案，${projectCount * chapterPerProject} 個章節，${projectCount * characterPerProject} 個角色`);
      
      // 測試健康檢查性能
      console.log('開始健康檢查性能測試...');
      const healthCheckStartTime = performance.now();
      
      const healthCheck = await maintenanceService.performHealthCheck();
      
      const healthCheckEndTime = performance.now();
      const healthCheckDuration = healthCheckEndTime - healthCheckStartTime;
      
      console.log(`健康檢查耗時: ${healthCheckDuration.toFixed(2)}ms`);
      
      // 驗證健康檢查結果
      expect(healthCheck).toHaveProperty('isHealthy');
      expect(healthCheck).toHaveProperty('statistics');
      expect(healthCheck.statistics.totalProjects).toBe(projectCount);
      expect(healthCheck.statistics.totalChapters).toBe(projectCount * chapterPerProject);
      expect(healthCheck.statistics.totalCharacters).toBe(projectCount * characterPerProject);
      
      // 性能要求：健康檢查應該在3秒內完成
      expect(healthCheckDuration).toBeLessThan(3000);
      
      // 測試報告生成性能
      console.log('測試報告生成性能...');
      const reportStartTime = performance.now();
      
      const report = await maintenanceService.generateErrorReport(healthCheck);
      
      const reportEndTime = performance.now();
      const reportDuration = reportEndTime - reportStartTime;
      
      console.log(`報告生成耗時: ${reportDuration.toFixed(2)}ms`);
      
      expect(report).toContain('資料庫健康報告');
      expect(report).toContain(`專案數量: ${projectCount}`);
      
      // 性能要求：報告生成應該在1秒內完成
      expect(reportDuration).toBeLessThan(1000);
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id LIKE "maint-project-%"').run();
      
      console.log('✅ 大型資料庫健康檢查性能測試通過');
    });

    it('資料庫優化性能測試', async () => {
      const db = getDatabase();
      const maintenanceService = getDatabaseMaintenanceService();
      
      // 創建一些測試資料然後刪除，產生碎片
      console.log('創建測試資料並產生碎片...');
      
      const fragmentationTransaction = db.transaction(() => {
        for (let i = 0; i < 1000; i++) {
          db.prepare(`
            INSERT INTO projects (id, name, type) 
            VALUES (?, ?, ?)
          `).run(`frag-project-${i}`, `碎片測試專案 ${i}`, 'isekai');
        }
        
        // 刪除一半資料產生碎片
        for (let i = 0; i < 500; i++) {
          db.prepare('DELETE FROM projects WHERE id = ?').run(`frag-project-${i}`);
        }
      });
      
      fragmentationTransaction();
      
      // 測試優化性能
      console.log('開始資料庫優化性能測試...');
      const optimizeStartTime = performance.now();
      
      const optimizeResult = await maintenanceService.optimizeDatabase();
      
      const optimizeEndTime = performance.now();
      const optimizeDuration = optimizeEndTime - optimizeStartTime;
      
      console.log(`資料庫優化耗時: ${optimizeDuration.toFixed(2)}ms`);
      
      expect(optimizeResult.success).toBe(true);
      expect(optimizeResult.message).toContain('優化完成');
      
      // 性能要求：資料庫優化應該在5秒內完成
      expect(optimizeDuration).toBeLessThan(5000);
      
      // 清理剩餘測試資料
      db.prepare('DELETE FROM projects WHERE id LIKE "frag-project-%"').run();
      
      console.log('✅ 資料庫優化性能測試通過');
    });
  });

  describe('記憶體使用測試', () => {
    it('長時間運行記憶體穩定性測試', async () => {
      const db = getDatabase();
      const contextManager = getContextManager();
      
      console.log('開始記憶體穩定性測試...');
      
      // 模擬長時間運行的操作
      const iterations = 100;
      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        // 創建臨時專案
        const tempProjectId = `memory-test-${i}`;
        db.prepare(`
          INSERT INTO projects (id, name, type) 
          VALUES (?, ?, ?)
        `).run(tempProjectId, `記憶體測試專案 ${i}`, 'isekai');
        
        // 創建章節
        db.prepare(`
          INSERT INTO chapters (id, project_id, title, content, order_num) 
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `memory-chapter-${i}`,
          tempProjectId,
          `測試章節 ${i}`,
          `這是測試章節 ${i} 的內容。`.repeat(50),
          1
        );
        
        // 構建上下文
        await contextManager.buildContext(tempProjectId, `memory-chapter-${i}`, 0);
        
        // 清理臨時資料
        db.prepare('DELETE FROM projects WHERE id = ?').run(tempProjectId);
        
        // 每10次迭代檢查記憶體使用
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          const heapUsed = (currentMemory.heapUsed / 1024 / 1024).toFixed(2);
          console.log(`迭代 ${i}: 堆記憶體使用 ${heapUsed}MB`);
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);
      
      console.log(`記憶體增長: ${memoryIncreaseMB}MB`);
      
      // 記憶體增長應該控制在合理範圍內（小於50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log('✅ 長時間運行記憶體穩定性測試通過');
    });
  });
});