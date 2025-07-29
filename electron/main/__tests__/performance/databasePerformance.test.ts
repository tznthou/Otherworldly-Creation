import { initDatabase, getDatabase, closeDatabase } from '../../database/database';
import { getDatabaseMaintenanceService } from '../../services/databaseMaintenance';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 模擬 Electron 環境
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(os.tmpdir(), 'test-genesis-chronicle-db-perf')),
  },
  dialog: {
    showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '/tmp/export.json' })),
    showOpenDialog: jest.fn(() => Promise.resolve({ canceled: false, filePaths: ['/tmp/import.json'] })),
    showMessageBoxSync: jest.fn(() => 1),
  },
}));

/**
 * 資料庫性能測試
 * 測試資料庫在各種負載條件下的性能表現
 */
describe('資料庫性能測試', () => {
  const testDbPath = path.join(os.tmpdir(), 'test-genesis-chronicle-db-perf', 'genesis-chronicle.db');

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

  describe('基本 CRUD 操作性能', () => {
    it('應該能快速執行大量專案 CRUD 操作', async () => {
      const db = getDatabase();
      const recordCount = 5000;
      
      console.log(`測試 ${recordCount} 個專案的 CRUD 操作性能...`);

      // 測試批量插入性能
      console.log('測試批量插入性能...');
      const insertStartTime = performance.now();
      
      const insertProject = db.prepare(`
        INSERT INTO projects (id, name, type, description, created_at, updated_at) 
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const insertTransaction = db.transaction(() => {
        for (let i = 0; i < recordCount; i++) {
          insertProject.run(
            `perf-project-${i}`,
            `性能測試專案 ${i}`,
            ['isekai', 'school', 'fantasy', 'sci-fi'][i % 4],
            `這是第 ${i} 個性能測試專案的描述`
          );
        }
      });
      
      insertTransaction();
      
      const insertEndTime = performance.now();
      const insertDuration = insertEndTime - insertStartTime;
      
      console.log(`插入 ${recordCount} 個專案耗時: ${insertDuration.toFixed(2)}ms`);
      console.log(`平均每個專案插入耗時: ${(insertDuration / recordCount).toFixed(3)}ms`);

      // 驗證插入結果
      const insertedCount = db.prepare('SELECT COUNT(*) as count FROM projects WHERE id LIKE "perf-project-%"').get() as { count: number };
      expect(insertedCount.count).toBe(recordCount);

      // 測試單條查詢性能
      console.log('測試單條查詢性能...');
      const singleQueryTimes = [];
      
      for (let i = 0; i < 100; i++) {
        const randomId = Math.floor(Math.random() * recordCount);
        const queryStartTime = performance.now();
        
        const result = db.prepare('SELECT * FROM projects WHERE id = ?').get(`perf-project-${randomId}`);
        
        const queryEndTime = performance.now();
        singleQueryTimes.push(queryEndTime - queryStartTime);
        
        expect(result).toBeDefined();
        expect(result.name).toBe(`性能測試專案 ${randomId}`);
      }
      
      const avgSingleQueryTime = singleQueryTimes.reduce((a, b) => a + b, 0) / singleQueryTimes.length;
      console.log(`100次單條查詢平均耗時: ${avgSingleQueryTime.toFixed(3)}ms`);

      // 測試批量查詢性能
      console.log('測試批量查詢性能...');
      const batchQueryStartTime = performance.now();
      
      const allProjects = db.prepare('SELECT * FROM projects WHERE id LIKE "perf-project-%" ORDER BY created_at').all();
      
      const batchQueryEndTime = performance.now();
      const batchQueryDuration = batchQueryEndTime - batchQueryStartTime;
      
      console.log(`查詢 ${recordCount} 個專案耗時: ${batchQueryDuration.toFixed(2)}ms`);
      expect(allProjects).toHaveLength(recordCount);

      // 測試條件查詢性能
      console.log('測試條件查詢性能...');
      const conditionQueryStartTime = performance.now();
      
      const isekaiProjects = db.prepare('SELECT * FROM projects WHERE type = ? AND id LIKE "perf-project-%"').all('isekai');
      
      const conditionQueryEndTime = performance.now();
      const conditionQueryDuration = conditionQueryEndTime - conditionQueryStartTime;
      
      console.log(`條件查詢耗時: ${conditionQueryDuration.toFixed(2)}ms, 結果數: ${isekaiProjects.length}`);
      expect(isekaiProjects.length).toBeGreaterThan(0);

      // 測試批量更新性能
      console.log('測試批量更新性能...');
      const updateStartTime = performance.now();
      
      const updateProject = db.prepare('UPDATE projects SET description = ? WHERE id = ?');
      
      const updateTransaction = db.transaction(() => {
        for (let i = 0; i < 1000; i++) { // 更新前1000個
          updateProject.run(`更新後的描述 ${i}`, `perf-project-${i}`);
        }
      });
      
      updateTransaction();
      
      const updateEndTime = performance.now();
      const updateDuration = updateEndTime - updateStartTime;
      
      console.log(`更新 1000 個專案耗時: ${updateDuration.toFixed(2)}ms`);

      // 測試批量刪除性能
      console.log('測試批量刪除性能...');
      const deleteStartTime = performance.now();
      
      db.prepare('DELETE FROM projects WHERE id LIKE "perf-project-%"').run();
      
      const deleteEndTime = performance.now();
      const deleteDuration = deleteEndTime - deleteStartTime;
      
      console.log(`刪除 ${recordCount} 個專案耗時: ${deleteDuration.toFixed(2)}ms`);

      // 驗證刪除結果
      const remainingCount = db.prepare('SELECT COUNT(*) as count FROM projects WHERE id LIKE "perf-project-%"').get() as { count: number };
      expect(remainingCount.count).toBe(0);

      // 性能要求
      expect(insertDuration).toBeLessThan(10000);      // 5000個專案插入 < 10秒
      expect(avgSingleQueryTime).toBeLessThan(1);      // 單條查詢 < 1ms
      expect(batchQueryDuration).toBeLessThan(2000);   // 批量查詢 < 2秒
      expect(conditionQueryDuration).toBeLessThan(500); // 條件查詢 < 500ms
      expect(updateDuration).toBeLessThan(2000);       // 1000個更新 < 2秒
      expect(deleteDuration).toBeLessThan(2000);       // 批量刪除 < 2秒

      console.log('✅ 大量專案 CRUD 操作性能測試通過');
    });

    it('應該能快速執行大量章節 CRUD 操作', async () => {
      const db = getDatabase();
      
      // 創建測試專案
      const projectId = 'chapter-perf-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(projectId, '章節性能測試專案', 'light-novel');

      const chapterCount = 10000;
      console.log(`測試 ${chapterCount} 個章節的 CRUD 操作性能...`);

      // 測試章節批量插入性能
      console.log('測試章節批量插入性能...');
      const insertStartTime = performance.now();
      
      const insertChapter = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const chapterContent = '這是一個標準長度的章節內容，包含情節發展和角色對話。'.repeat(20);
      
      const insertTransaction = db.transaction(() => {
        for (let i = 0; i < chapterCount; i++) {
          insertChapter.run(
            `perf-chapter-${i}`,
            projectId,
            `第 ${i + 1} 章`,
            chapterContent,
            i + 1
          );
        }
      });
      
      insertTransaction();
      
      const insertEndTime = performance.now();
      const insertDuration = insertEndTime - insertStartTime;
      
      console.log(`插入 ${chapterCount} 個章節耗時: ${insertDuration.toFixed(2)}ms`);
      console.log(`平均每個章節插入耗時: ${(insertDuration / chapterCount).toFixed(3)}ms`);

      // 測試章節排序查詢性能
      console.log('測試章節排序查詢性能...');
      const sortedQueryStartTime = performance.now();
      
      const sortedChapters = db.prepare(`
        SELECT id, title, order_num 
        FROM chapters 
        WHERE project_id = ? 
        ORDER BY order_num
      `).all(projectId);
      
      const sortedQueryEndTime = performance.now();
      const sortedQueryDuration = sortedQueryEndTime - sortedQueryStartTime;
      
      console.log(`排序查詢 ${chapterCount} 個章節耗時: ${sortedQueryDuration.toFixed(2)}ms`);
      expect(sortedChapters).toHaveLength(chapterCount);
      expect(sortedChapters[0].title).toBe('第 1 章');

      // 測試範圍查詢性能
      console.log('測試範圍查詢性能...');
      const rangeQueryStartTime = performance.now();
      
      const rangeChapters = db.prepare(`
        SELECT * FROM chapters 
        WHERE project_id = ? AND order_num BETWEEN ? AND ?
      `).all(projectId, 1000, 2000);
      
      const rangeQueryEndTime = performance.now();
      const rangeQueryDuration = rangeQueryEndTime - rangeQueryStartTime;
      
      console.log(`範圍查詢 (1000-2000) 耗時: ${rangeQueryDuration.toFixed(2)}ms, 結果數: ${rangeChapters.length}`);
      expect(rangeChapters).toHaveLength(1001);

      // 測試分頁查詢性能
      console.log('測試分頁查詢性能...');
      const pageSize = 50;
      const pageQueryTimes = [];
      
      for (let page = 0; page < 10; page++) {
        const offset = page * pageSize;
        const pageQueryStartTime = performance.now();
        
        const pageChapters = db.prepare(`
          SELECT * FROM chapters 
          WHERE project_id = ? 
          ORDER BY order_num 
          LIMIT ? OFFSET ?
        `).all(projectId, pageSize, offset);
        
        const pageQueryEndTime = performance.now();
        pageQueryTimes.push(pageQueryEndTime - pageQueryStartTime);
        
        expect(pageChapters).toHaveLength(pageSize);
      }
      
      const avgPageQueryTime = pageQueryTimes.reduce((a, b) => a + b, 0) / pageQueryTimes.length;
      console.log(`分頁查詢平均耗時: ${avgPageQueryTime.toFixed(3)}ms (每頁 ${pageSize} 條)`);

      // 測試全文搜索性能
      console.log('測試全文搜索性能...');
      const searchStartTime = performance.now();
      
      const searchResults = db.prepare(`
        SELECT id, title, order_num 
        FROM chapters 
        WHERE project_id = ? AND content LIKE ?
      `).all(projectId, '%情節發展%');
      
      const searchEndTime = performance.now();
      const searchDuration = searchEndTime - searchStartTime;
      
      console.log(`全文搜索耗時: ${searchDuration.toFixed(2)}ms, 結果數: ${searchResults.length}`);
      expect(searchResults.length).toBeGreaterThan(0);

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      // 性能要求
      expect(insertDuration).toBeLessThan(20000);      // 10000個章節插入 < 20秒
      expect(sortedQueryDuration).toBeLessThan(3000);  // 排序查詢 < 3秒
      expect(rangeQueryDuration).toBeLessThan(200);    // 範圍查詢 < 200ms
      expect(avgPageQueryTime).toBeLessThan(50);       // 分頁查詢 < 50ms
      expect(searchDuration).toBeLessThan(1000);       // 全文搜索 < 1秒

      console.log('✅ 大量章節 CRUD 操作性能測試通過');
    });

    it('應該能快速執行大量角色和關係 CRUD 操作', async () => {
      const db = getDatabase();
      
      // 創建測試專案
      const projectId = 'character-perf-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(projectId, '角色性能測試專案', 'epic-fantasy');

      const characterCount = 2000;
      const relationshipCount = 5000;
      
      console.log(`測試 ${characterCount} 個角色和 ${relationshipCount} 個關係的 CRUD 操作性能...`);

      // 測試角色批量插入性能
      console.log('測試角色批量插入性能...');
      const characterInsertStartTime = performance.now();
      
      const insertCharacter = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const characterTransaction = db.transaction(() => {
        for (let i = 0; i < characterCount; i++) {
          const archetypes = ['勇者', '法師', '盜賊', '牧師', '戰士', '弓箭手', '騎士', '刺客'];
          insertCharacter.run(
            `perf-char-${i}`,
            projectId,
            `角色${i}`,
            archetypes[i % archetypes.length],
            18 + (i % 60),
            i % 2 === 0 ? '男' : '女',
            `角色${i}的外觀描述`,
            `角色${i}的性格描述`,
            `角色${i}的背景故事`
          );
        }
      });
      
      characterTransaction();
      
      const characterInsertEndTime = performance.now();
      const characterInsertDuration = characterInsertEndTime - characterInsertStartTime;
      
      console.log(`插入 ${characterCount} 個角色耗時: ${characterInsertDuration.toFixed(2)}ms`);

      // 測試角色關係批量插入性能
      console.log('測試角色關係批量插入性能...');
      const relationshipInsertStartTime = performance.now();
      
      const insertRelationship = db.prepare(`
        INSERT INTO character_relationships (id, source_id, target_id, type, description) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const relationshipTypes = ['朋友', '敵人', '戀人', '師徒', '同伴', '競爭對手'];
      
      const relationshipTransaction = db.transaction(() => {
        for (let i = 0; i < relationshipCount; i++) {
          const sourceId = `perf-char-${Math.floor(Math.random() * characterCount)}`;
          const targetId = `perf-char-${Math.floor(Math.random() * characterCount)}`;
          
          if (sourceId !== targetId) {
            insertRelationship.run(
              `perf-rel-${i}`,
              sourceId,
              targetId,
              relationshipTypes[i % relationshipTypes.length],
              `關係描述 ${i}`
            );
          }
        }
      });
      
      relationshipTransaction();
      
      const relationshipInsertEndTime = performance.now();
      const relationshipInsertDuration = relationshipInsertEndTime - relationshipInsertStartTime;
      
      console.log(`插入 ${relationshipCount} 個關係耗時: ${relationshipInsertDuration.toFixed(2)}ms`);

      // 測試複雜關聯查詢性能
      console.log('測試複雜關聯查詢性能...');
      const complexQueryStartTime = performance.now();
      
      const complexResults = db.prepare(`
        SELECT c.*, 
               COUNT(cr1.id) as outgoing_relationships,
               COUNT(cr2.id) as incoming_relationships
        FROM characters c
        LEFT JOIN character_relationships cr1 ON c.id = cr1.source_id
        LEFT JOIN character_relationships cr2 ON c.id = cr2.target_id
        WHERE c.project_id = ?
        GROUP BY c.id
        HAVING outgoing_relationships > 0 OR incoming_relationships > 0
        ORDER BY (outgoing_relationships + incoming_relationships) DESC
        LIMIT 100
      `).all(projectId);
      
      const complexQueryEndTime = performance.now();
      const complexQueryDuration = complexQueryEndTime - complexQueryStartTime;
      
      console.log(`複雜關聯查詢耗時: ${complexQueryDuration.toFixed(2)}ms, 結果數: ${complexResults.length}`);

      // 測試角色統計查詢性能
      console.log('測試角色統計查詢性能...');
      const statsQueryStartTime = performance.now();
      
      const statsResults = db.prepare(`
        SELECT 
          archetype,
          gender,
          COUNT(*) as count,
          AVG(age) as avg_age,
          MIN(age) as min_age,
          MAX(age) as max_age
        FROM characters 
        WHERE project_id = ?
        GROUP BY archetype, gender
        ORDER BY count DESC
      `).all(projectId);
      
      const statsQueryEndTime = performance.now();
      const statsQueryDuration = statsQueryEndTime - statsQueryStartTime;
      
      console.log(`統計查詢耗時: ${statsQueryDuration.toFixed(2)}ms, 結果數: ${statsResults.length}`);

      // 測試關係網路查詢性能
      console.log('測試關係網路查詢性能...');
      const networkQueryStartTime = performance.now();
      
      const networkResults = db.prepare(`
        SELECT cr.*, 
               s.name as source_name, 
               t.name as target_name
        FROM character_relationships cr
        JOIN characters s ON cr.source_id = s.id
        JOIN characters t ON cr.target_id = t.id
        WHERE s.project_id = ? AND cr.type = '朋友'
        ORDER BY s.name, t.name
      `).all(projectId);
      
      const networkQueryEndTime = performance.now();
      const networkQueryDuration = networkQueryEndTime - networkQueryStartTime;
      
      console.log(`關係網路查詢耗時: ${networkQueryDuration.toFixed(2)}ms, 結果數: ${networkResults.length}`);

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      // 性能要求
      expect(characterInsertDuration).toBeLessThan(5000);    // 2000個角色插入 < 5秒
      expect(relationshipInsertDuration).toBeLessThan(8000); // 5000個關係插入 < 8秒
      expect(complexQueryDuration).toBeLessThan(2000);       // 複雜查詢 < 2秒
      expect(statsQueryDuration).toBeLessThan(500);          // 統計查詢 < 500ms
      expect(networkQueryDuration).toBeLessThan(1000);       // 網路查詢 < 1秒

      console.log('✅ 大量角色和關係 CRUD 操作性能測試通過');
    });
  });

  describe('資料庫維護操作性能', () => {
    it('應該能快速執行大型資料庫的健康檢查', async () => {
      const db = getDatabase();
      const maintenanceService = getDatabaseMaintenanceService();
      
      // 創建大量測試資料
      console.log('創建大型測試資料集...');
      
      const projectCount = 200;
      const chapterPerProject = 50;
      const characterPerProject = 20;
      
      const setupStartTime = performance.now();
      
      const setupTransaction = db.transaction(() => {
        // 創建專案
        const insertProject = db.prepare(`
          INSERT INTO projects (id, name, type, description) 
          VALUES (?, ?, ?, ?)
        `);
        
        const insertChapter = db.prepare(`
          INSERT INTO chapters (id, project_id, title, content, order_num) 
          VALUES (?, ?, ?, ?, ?)
        `);
        
        const insertCharacter = db.prepare(`
          INSERT INTO characters (id, project_id, name, archetype, age, gender) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        for (let p = 0; p < projectCount; p++) {
          const projectId = `health-project-${p}`;
          insertProject.run(
            projectId,
            `健康檢查測試專案 ${p}`,
            ['isekai', 'school', 'fantasy', 'sci-fi'][p % 4],
            `專案 ${p} 的描述`
          );
          
          // 為每個專案創建章節
          for (let c = 0; c < chapterPerProject; c++) {
            insertChapter.run(
              `health-chapter-${p}-${c}`,
              projectId,
              `第 ${c + 1} 章`,
              `章節 ${c} 的內容`.repeat(50),
              c + 1
            );
          }
          
          // 為每個專案創建角色
          for (let ch = 0; ch < characterPerProject; ch++) {
            insertCharacter.run(
              `health-character-${p}-${ch}`,
              projectId,
              `角色 ${ch}`,
              ['勇者', '法師', '戰士'][ch % 3],
              18 + (ch % 50),
              ch % 2 === 0 ? '男' : '女'
            );
          }
        }
      });
      
      setupTransaction();
      
      const setupEndTime = performance.now();
      const setupDuration = setupEndTime - setupStartTime;
      
      console.log(`創建測試資料耗時: ${setupDuration.toFixed(2)}ms`);
      console.log(`總計: ${projectCount} 個專案, ${projectCount * chapterPerProject} 個章節, ${projectCount * characterPerProject} 個角色`);

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

      // 測試報告生成性能
      console.log('測試報告生成性能...');
      const reportStartTime = performance.now();
      
      const report = await maintenanceService.generateErrorReport(healthCheck);
      
      const reportEndTime = performance.now();
      const reportDuration = reportEndTime - reportStartTime;
      
      console.log(`報告生成耗時: ${reportDuration.toFixed(2)}ms`);
      console.log(`報告長度: ${report.length} 字符`);
      
      expect(report).toContain('資料庫健康報告');
      expect(report).toContain(`專案數量: ${projectCount}`);

      // 清理測試資料
      console.log('清理測試資料...');
      const cleanupStartTime = performance.now();
      
      db.prepare('DELETE FROM projects WHERE id LIKE "health-project-%"').run();
      
      const cleanupEndTime = performance.now();
      const cleanupDuration = cleanupEndTime - cleanupStartTime;
      
      console.log(`清理資料耗時: ${cleanupDuration.toFixed(2)}ms`);

      // 性能要求
      expect(setupDuration).toBeLessThan(30000);        // 資料創建 < 30秒
      expect(healthCheckDuration).toBeLessThan(5000);   // 健康檢查 < 5秒
      expect(reportDuration).toBeLessThan(2000);        // 報告生成 < 2秒
      expect(cleanupDuration).toBeLessThan(5000);       // 資料清理 < 5秒

      console.log('✅ 大型資料庫健康檢查性能測試通過');
    });

    it('應該能快速執行資料庫優化操作', async () => {
      const db = getDatabase();
      const maintenanceService = getDatabaseMaintenanceService();
      
      // 創建資料並產生碎片
      console.log('創建資料並產生碎片...');
      
      const fragmentationStartTime = performance.now();
      
      const fragmentationTransaction = db.transaction(() => {
        // 創建大量資料
        for (let i = 0; i < 5000; i++) {
          db.prepare(`
            INSERT INTO projects (id, name, type, description) 
            VALUES (?, ?, ?, ?)
          `).run(
            `frag-project-${i}`,
            `碎片測試專案 ${i}`,
            'isekai',
            `描述 ${i}`.repeat(20)
          );
        }
        
        // 刪除一半資料產生碎片
        for (let i = 0; i < 2500; i++) {
          db.prepare('DELETE FROM projects WHERE id = ?').run(`frag-project-${i}`);
        }
        
        // 更新剩餘資料
        for (let i = 2500; i < 5000; i++) {
          db.prepare('UPDATE projects SET description = ? WHERE id = ?').run(
            `更新後的描述 ${i}`.repeat(30),
            `frag-project-${i}`
          );
        }
      });
      
      fragmentationTransaction();
      
      const fragmentationEndTime = performance.now();
      const fragmentationDuration = fragmentationEndTime - fragmentationStartTime;
      
      console.log(`產生碎片耗時: ${fragmentationDuration.toFixed(2)}ms`);

      // 測試資料庫優化性能
      console.log('開始資料庫優化性能測試...');
      const optimizeStartTime = performance.now();
      
      const optimizeResult = await maintenanceService.optimizeDatabase();
      
      const optimizeEndTime = performance.now();
      const optimizeDuration = optimizeEndTime - optimizeStartTime;
      
      console.log(`資料庫優化耗時: ${optimizeDuration.toFixed(2)}ms`);
      
      expect(optimizeResult.success).toBe(true);
      expect(optimizeResult.message).toContain('優化完成');

      // 測試優化後的查詢性能
      console.log('測試優化後的查詢性能...');
      const postOptimizeQueryStartTime = performance.now();
      
      const remainingProjects = db.prepare('SELECT * FROM projects WHERE id LIKE "frag-project-%" ORDER BY name').all();
      
      const postOptimizeQueryEndTime = performance.now();
      const postOptimizeQueryDuration = postOptimizeQueryEndTime - postOptimizeQueryStartTime;
      
      console.log(`優化後查詢耗時: ${postOptimizeQueryDuration.toFixed(2)}ms, 結果數: ${remainingProjects.length}`);
      
      expect(remainingProjects).toHaveLength(2500);

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id LIKE "frag-project-%"').run();

      // 性能要求
      expect(optimizeDuration).toBeLessThan(10000);           // 優化操作 < 10秒
      expect(postOptimizeQueryDuration).toBeLessThan(500);    // 優化後查詢 < 500ms

      console.log('✅ 資料庫優化操作性能測試通過');
    });
  });

  describe('資料庫索引和查詢優化測試', () => {
    it('應該能高效處理複雜的多表聯合查詢', async () => {
      const db = getDatabase();
      
      // 創建測試資料
      const projectId = 'complex-query-project';
      db.prepare(`
        INSERT INTO projects (id, name, type, description) 
        VALUES (?, ?, ?, ?)
      `).run(projectId, '複雜查詢測試專案', 'epic-fantasy', '用於測試複雜查詢性能的專案');

      const characterCount = 1000;
      const chapterCount = 500;
      const relationshipCount = 3000;
      
      console.log(`創建測試資料: ${characterCount} 角色, ${chapterCount} 章節, ${relationshipCount} 關係...`);
      
      const setupTransaction = db.transaction(() => {
        // 創建角色
        const insertCharacter = db.prepare(`
          INSERT INTO characters (id, project_id, name, archetype, age, gender) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        for (let i = 0; i < characterCount; i++) {
          insertCharacter.run(
            `complex-char-${i}`,
            projectId,
            `角色${i}`,
            ['勇者', '法師', '戰士', '盜賊', '牧師'][i % 5],
            18 + (i % 60),
            i % 2 === 0 ? '男' : '女'
          );
        }
        
        // 創建章節
        const insertChapter = db.prepare(`
          INSERT INTO chapters (id, project_id, title, content, order_num) 
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (let i = 0; i < chapterCount; i++) {
          insertChapter.run(
            `complex-chapter-${i}`,
            projectId,
            `第 ${i + 1} 章`,
            `章節 ${i} 的內容，提到了角色${i % characterCount}`.repeat(10),
            i + 1
          );
        }
        
        // 創建關係
        const insertRelationship = db.prepare(`
          INSERT INTO character_relationships (id, source_id, target_id, type, description) 
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (let i = 0; i < relationshipCount; i++) {
          const sourceId = `complex-char-${Math.floor(Math.random() * characterCount)}`;
          const targetId = `complex-char-${Math.floor(Math.random() * characterCount)}`;
          
          if (sourceId !== targetId) {
            insertRelationship.run(
              `complex-rel-${i}`,
              sourceId,
              targetId,
              ['朋友', '敵人', '戀人', '師徒'][i % 4],
              `關係 ${i}`
            );
          }
        }
      });
      
      setupTransaction();

      // 測試複雜查詢性能
      const complexQueries = [
        {
          name: '角色關係統計查詢',
          query: `
            SELECT c.name, c.archetype, c.age,
                   COUNT(DISTINCT cr1.id) as outgoing_count,
                   COUNT(DISTINCT cr2.id) as incoming_count,
                   COUNT(DISTINCT cr1.id) + COUNT(DISTINCT cr2.id) as total_relationships
            FROM characters c
            LEFT JOIN character_relationships cr1 ON c.id = cr1.source_id
            LEFT JOIN character_relationships cr2 ON c.id = cr2.target_id
            WHERE c.project_id = ?
            GROUP BY c.id, c.name, c.archetype, c.age
            HAVING total_relationships > 0
            ORDER BY total_relationships DESC
            LIMIT 50
          `,
          params: [projectId]
        },
        {
          name: '跨表內容搜索查詢',
          query: `
            SELECT DISTINCT c.name as character_name, ch.title as chapter_title, ch.order_num
            FROM characters c
            JOIN chapters ch ON c.project_id = ch.project_id
            WHERE c.project_id = ? 
              AND (ch.content LIKE '%' || c.name || '%' OR ch.title LIKE '%角色%')
            ORDER BY ch.order_num
            LIMIT 100
          `,
          params: [projectId]
        },
        {
          name: '關係網路深度查詢',
          query: `
            SELECT s.name as source_name, s.archetype as source_archetype,
                   t.name as target_name, t.archetype as target_archetype,
                   cr.type as relationship_type
            FROM character_relationships cr
            JOIN characters s ON cr.source_id = s.id
            JOIN characters t ON cr.target_id = t.id
            WHERE s.project_id = ? 
              AND s.archetype = '勇者' 
              AND cr.type IN ('朋友', '戀人')
            ORDER BY s.name, t.name
          `,
          params: [projectId]
        },
        {
          name: '聚合統計查詢',
          query: `
            SELECT 
              p.name as project_name,
              COUNT(DISTINCT c.id) as character_count,
              COUNT(DISTINCT ch.id) as chapter_count,
              COUNT(DISTINCT cr.id) as relationship_count,
              AVG(c.age) as avg_character_age,
              COUNT(DISTINCT CASE WHEN c.gender = '男' THEN c.id END) as male_count,
              COUNT(DISTINCT CASE WHEN c.gender = '女' THEN c.id END) as female_count
            FROM projects p
            LEFT JOIN characters c ON p.id = c.project_id
            LEFT JOIN chapters ch ON p.id = ch.project_id
            LEFT JOIN character_relationships cr ON c.id = cr.source_id
            WHERE p.id = ?
            GROUP BY p.id, p.name
          `,
          params: [projectId]
        }
      ];

      for (const queryTest of complexQueries) {
        console.log(`測試 ${queryTest.name}...`);
        const queryStartTime = performance.now();
        
        const results = db.prepare(queryTest.query).all(...queryTest.params);
        
        const queryEndTime = performance.now();
        const queryDuration = queryEndTime - queryStartTime;
        
        console.log(`${queryTest.name}耗時: ${queryDuration.toFixed(2)}ms, 結果數: ${results.length}`);
        
        expect(results.length).toBeGreaterThan(0);
        expect(queryDuration).toBeLessThan(2000); // 複雜查詢應該在2秒內完成
      }

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      console.log('✅ 複雜多表聯合查詢性能測試通過');
    });
  });

  describe('資料庫併發操作性能', () => {
    it('應該能處理模擬的併發讀寫操作', async () => {
      const db = getDatabase();
      
      // 創建基礎測試資料
      const baseProjectId = 'concurrent-base-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(baseProjectId, '併發測試基礎專案', 'test');

      console.log('開始併發操作性能測試...');
      
      const concurrentOperations = [];
      const operationCount = 20;
      
      // 模擬併發讀操作
      for (let i = 0; i < operationCount; i++) {
        concurrentOperations.push(
          new Promise<number>((resolve) => {
            const startTime = performance.now();
            
            // 執行複雜讀操作
            const results = db.prepare(`
              SELECT p.*, 
                     COUNT(c.id) as character_count,
                     COUNT(ch.id) as chapter_count
              FROM projects p
              LEFT JOIN characters c ON p.id = c.project_id
              LEFT JOIN chapters ch ON p.id = ch.project_id
              WHERE p.id LIKE 'concurrent-%'
              GROUP BY p.id
            `).all();
            
            const endTime = performance.now();
            resolve(endTime - startTime);
          })
        );
      }
      
      // 模擬併發寫操作
      for (let i = 0; i < operationCount; i++) {
        concurrentOperations.push(
          new Promise<number>((resolve) => {
            const startTime = performance.now();
            
            // 執行寫操作
            const projectId = `concurrent-project-${i}`;
            db.prepare(`
              INSERT INTO projects (id, name, type) 
              VALUES (?, ?, ?)
            `).run(projectId, `併發測試專案 ${i}`, 'concurrent-test');
            
            // 立即查詢驗證
            const result = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
            
            const endTime = performance.now();
            resolve(endTime - startTime);
          })
        );
      }
      
      const concurrentStartTime = performance.now();
      const operationTimes = await Promise.all(concurrentOperations);
      const concurrentEndTime = performance.now();
      
      const totalConcurrentDuration = concurrentEndTime - concurrentStartTime;
      const avgOperationTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
      const maxOperationTime = Math.max(...operationTimes);
      const minOperationTime = Math.min(...operationTimes);
      
      console.log(`併發操作總耗時: ${totalConcurrentDuration.toFixed(2)}ms`);
      console.log(`平均單操作耗時: ${avgOperationTime.toFixed(2)}ms`);
      console.log(`最長單操作耗時: ${maxOperationTime.toFixed(2)}ms`);
      console.log(`最短單操作耗時: ${minOperationTime.toFixed(2)}ms`);
      
      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id LIKE "concurrent-%"').run();
      
      // 性能要求
      expect(totalConcurrentDuration).toBeLessThan(5000);  // 併發操作總時間 < 5秒
      expect(avgOperationTime).toBeLessThan(100);          // 平均操作時間 < 100ms
      expect(maxOperationTime).toBeLessThan(500);          // 最長操作時間 < 500ms
      
      console.log('✅ 併發操作性能測試通過');
    });
  });
});