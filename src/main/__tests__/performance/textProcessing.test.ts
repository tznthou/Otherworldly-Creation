import { initDatabase, getDatabase, closeDatabase } from '../../database/database';
import { setContextManager, getContextManager } from '../../services/contextManager';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 模擬 Electron 環境
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(os.tmpdir(), 'test-genesis-chronicle-text-perf')),
  },
}));

/**
 * 大型文本處理性能測試
 * 測試系統處理大量文本內容時的性能表現
 */
describe('大型文本處理性能測試', () => {
  const testDbPath = path.join(os.tmpdir(), 'test-genesis-chronicle-text-perf', 'genesis-chronicle.db');

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

  describe('章節文本處理性能', () => {
    it('應該能快速處理超長章節內容', async () => {
      const db = getDatabase();
      
      // 創建測試專案
      const projectId = 'long-text-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(projectId, '長文本測試專案', 'epic-fantasy');

      // 生成超長文本內容（約100KB）
      const baseText = '這是一個非常長的章節內容，包含了詳細的場景描述、角色對話、心理活動和動作描述。';
      const longContent = baseText.repeat(1000); // 約100KB的文本
      
      console.log(`測試文本長度: ${longContent.length} 字符 (${(longContent.length / 1024).toFixed(2)} KB)`);

      // 測試插入性能
      const insertStartTime = performance.now();
      
      const chapterId = 'long-chapter-1';
      db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num) 
        VALUES (?, ?, ?, ?, ?)
      `).run(
        chapterId,
        projectId,
        '超長章節測試',
        longContent,
        1
      );

      const insertEndTime = performance.now();
      const insertDuration = insertEndTime - insertStartTime;
      
      console.log(`插入超長章節耗時: ${insertDuration.toFixed(2)}ms`);

      // 測試查詢性能
      const queryStartTime = performance.now();
      
      const retrievedChapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
      
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      
      console.log(`查詢超長章節耗時: ${queryDuration.toFixed(2)}ms`);

      // 驗證內容完整性
      expect(retrievedChapter).toBeDefined();
      expect(retrievedChapter.content.length).toBe(longContent.length);
      expect(retrievedChapter.content).toBe(longContent);

      // 測試更新性能
      const updatedContent = longContent + '\\n\\n這是新增的內容。';
      const updateStartTime = performance.now();
      
      db.prepare('UPDATE chapters SET content = ? WHERE id = ?').run(updatedContent, chapterId);
      
      const updateEndTime = performance.now();
      const updateDuration = updateEndTime - updateStartTime;
      
      console.log(`更新超長章節耗時: ${updateDuration.toFixed(2)}ms`);

      // 性能要求
      expect(insertDuration).toBeLessThan(100); // 插入應該在100ms內完成
      expect(queryDuration).toBeLessThan(50);   // 查詢應該在50ms內完成
      expect(updateDuration).toBeLessThan(100); // 更新應該在100ms內完成

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      
      console.log('✅ 超長章節處理性能測試通過');
    });

    it('應該能高效處理大量章節的批量操作', async () => {
      const db = getDatabase();
      
      // 創建測試專案
      const projectId = 'batch-text-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(projectId, '批量文本測試專案', 'light-novel');

      const chapterCount = 1000;
      const chapterContent = '這是一個標準長度的章節內容。'.repeat(50); // 約2KB每章
      
      console.log(`準備創建 ${chapterCount} 個章節，每章約 ${(chapterContent.length / 1024).toFixed(2)} KB`);

      // 測試批量插入性能
      const batchInsertStartTime = performance.now();
      
      const insertChapter = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const batchInsertTransaction = db.transaction(() => {
        for (let i = 0; i < chapterCount; i++) {
          insertChapter.run(
            `batch-chapter-${i}`,
            projectId,
            `第 ${i + 1} 章`,
            chapterContent,
            i + 1
          );
        }
      });
      
      batchInsertTransaction();
      
      const batchInsertEndTime = performance.now();
      const batchInsertDuration = batchInsertEndTime - batchInsertStartTime;
      
      console.log(`批量插入 ${chapterCount} 個章節耗時: ${batchInsertDuration.toFixed(2)}ms`);
      console.log(`平均每章插入耗時: ${(batchInsertDuration / chapterCount).toFixed(2)}ms`);

      // 測試批量查詢性能
      const batchQueryStartTime = performance.now();
      
      const allChapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_num').all(projectId);
      
      const batchQueryEndTime = performance.now();
      const batchQueryDuration = batchQueryEndTime - batchQueryStartTime;
      
      console.log(`批量查詢 ${chapterCount} 個章節耗時: ${batchQueryDuration.toFixed(2)}ms`);

      // 驗證查詢結果
      expect(allChapters).toHaveLength(chapterCount);
      expect(allChapters[0].title).toBe('第 1 章');
      expect(allChapters[chapterCount - 1].title).toBe(`第 ${chapterCount} 章`);

      // 測試範圍查詢性能
      const rangeQueryStartTime = performance.now();
      
      const rangeChapters = db.prepare(`
        SELECT * FROM chapters 
        WHERE project_id = ? AND order_num BETWEEN ? AND ? 
        ORDER BY order_num
      `).all(projectId, 100, 200);
      
      const rangeQueryEndTime = performance.now();
      const rangeQueryDuration = rangeQueryEndTime - rangeQueryStartTime;
      
      console.log(`範圍查詢 (100-200章) 耗時: ${rangeQueryDuration.toFixed(2)}ms`);
      
      expect(rangeChapters).toHaveLength(101); // 100到200包含101章

      // 測試批量更新性能
      const batchUpdateStartTime = performance.now();
      
      const updateChapter = db.prepare('UPDATE chapters SET content = ? WHERE id = ?');
      const updatedContent = chapterContent + '\\n\\n[已更新]';
      
      const batchUpdateTransaction = db.transaction(() => {
        for (let i = 0; i < 100; i++) { // 更新前100章
          updateChapter.run(updatedContent, `batch-chapter-${i}`);
        }
      });
      
      batchUpdateTransaction();
      
      const batchUpdateEndTime = performance.now();
      const batchUpdateDuration = batchUpdateEndTime - batchUpdateStartTime;
      
      console.log(`批量更新 100 個章節耗時: ${batchUpdateDuration.toFixed(2)}ms`);

      // 測試批量刪除性能
      const batchDeleteStartTime = performance.now();
      
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId); // 級聯刪除所有章節
      
      const batchDeleteEndTime = performance.now();
      const batchDeleteDuration = batchDeleteEndTime - batchDeleteStartTime;
      
      console.log(`批量刪除 ${chapterCount} 個章節耗時: ${batchDeleteDuration.toFixed(2)}ms`);

      // 性能要求
      expect(batchInsertDuration).toBeLessThan(5000);  // 1000章插入應該在5秒內完成
      expect(batchQueryDuration).toBeLessThan(1000);   // 1000章查詢應該在1秒內完成
      expect(rangeQueryDuration).toBeLessThan(100);    // 範圍查詢應該在100ms內完成
      expect(batchUpdateDuration).toBeLessThan(1000);  // 100章更新應該在1秒內完成
      expect(batchDeleteDuration).toBeLessThan(1000);  // 批量刪除應該在1秒內完成

      console.log('✅ 大量章節批量操作性能測試通過');
    });

    it('應該能高效處理文本搜索和過濾', async () => {
      const db = getDatabase();
      
      // 創建測試專案
      const projectId = 'search-text-project';
      db.prepare(`
        INSERT INTO projects (id, name, type) 
        VALUES (?, ?, ?)
      `).run(projectId, '文本搜索測試專案', 'mystery');

      // 創建包含不同關鍵詞的章節
      const keywords = ['魔法', '劍術', '冒險', '友情', '戰鬥', '成長', '秘密', '寶藏', '怪物', '英雄'];
      const chapterCount = 500;
      
      console.log(`創建 ${chapterCount} 個包含關鍵詞的章節...`);
      
      const insertChapter = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const createTransaction = db.transaction(() => {
        for (let i = 0; i < chapterCount; i++) {
          const keyword = keywords[i % keywords.length];
          const content = `這是第 ${i + 1} 章的內容，主要講述了關於${keyword}的故事。`.repeat(20) +
                         `在這個章節中，主角學習了${keyword}的技巧，並且遇到了許多關於${keyword}的挑戰。`.repeat(10);
          
          insertChapter.run(
            `search-chapter-${i}`,
            projectId,
            `第 ${i + 1} 章：${keyword}之章`,
            content,
            i + 1
          );
        }
      });
      
      createTransaction();

      // 測試全文搜索性能
      const searchTests = [
        { keyword: '魔法', description: '搜索"魔法"關鍵詞' },
        { keyword: '劍術', description: '搜索"劍術"關鍵詞' },
        { keyword: '主角', description: '搜索"主角"關鍵詞' },
        { keyword: '挑戰', description: '搜索"挑戰"關鍵詞' }
      ];

      for (const test of searchTests) {
        const searchStartTime = performance.now();
        
        const searchResults = db.prepare(`
          SELECT id, title, order_num 
          FROM chapters 
          WHERE project_id = ? AND (title LIKE ? OR content LIKE ?)
          ORDER BY order_num
        `).all(projectId, `%${test.keyword}%`, `%${test.keyword}%`);
        
        const searchEndTime = performance.now();
        const searchDuration = searchEndTime - searchStartTime;
        
        console.log(`${test.description}耗時: ${searchDuration.toFixed(2)}ms, 找到 ${searchResults.length} 個結果`);
        
        expect(searchResults.length).toBeGreaterThan(0);
        expect(searchDuration).toBeLessThan(200); // 搜索應該在200ms內完成
      }

      // 測試複雜查詢性能
      const complexQueryStartTime = performance.now();
      
      const complexResults = db.prepare(`
        SELECT c.*, 
               LENGTH(c.content) as content_length,
               CASE 
                 WHEN c.content LIKE '%魔法%' THEN '魔法類'
                 WHEN c.content LIKE '%劍術%' THEN '戰鬥類'
                 ELSE '其他類'
               END as category
        FROM chapters c
        WHERE c.project_id = ? 
          AND LENGTH(c.content) > 100
          AND c.order_num BETWEEN 1 AND 100
        ORDER BY content_length DESC
        LIMIT 20
      `).all(projectId);
      
      const complexQueryEndTime = performance.now();
      const complexQueryDuration = complexQueryEndTime - complexQueryStartTime;
      
      console.log(`複雜查詢耗時: ${complexQueryDuration.toFixed(2)}ms, 結果數: ${complexResults.length}`);
      
      expect(complexResults.length).toBeGreaterThan(0);
      expect(complexQueryDuration).toBeLessThan(300); // 複雜查詢應該在300ms內完成

      // 測試聚合查詢性能
      const aggregateStartTime = performance.now();
      
      const aggregateResults = db.prepare(`
        SELECT 
          COUNT(*) as total_chapters,
          AVG(LENGTH(content)) as avg_content_length,
          MAX(LENGTH(content)) as max_content_length,
          MIN(LENGTH(content)) as min_content_length
        FROM chapters 
        WHERE project_id = ?
      `).get(projectId);
      
      const aggregateEndTime = performance.now();
      const aggregateDuration = aggregateEndTime - aggregateStartTime;
      
      console.log(`聚合查詢耗時: ${aggregateDuration.toFixed(2)}ms`);
      console.log(`統計結果: 總章節 ${aggregateResults.total_chapters}, 平均長度 ${aggregateResults.avg_content_length.toFixed(0)}`);
      
      expect(aggregateResults.total_chapters).toBe(chapterCount);
      expect(aggregateDuration).toBeLessThan(100); // 聚合查詢應該在100ms內完成

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      
      console.log('✅ 文本搜索和過濾性能測試通過');
    });
  });

  describe('上下文處理性能', () => {
    it('應該能快速構建大型專案的上下文', async () => {
      const db = getDatabase();
      const contextManager = getContextManager();
      
      // 創建大型測試專案
      const projectId = 'large-context-project';
      db.prepare(`
        INSERT INTO projects (id, name, type, description) 
        VALUES (?, ?, ?, ?)
      `).run(
        projectId,
        '大型上下文測試專案',
        'epic-fantasy',
        '這是一個包含大量角色和章節的史詩奇幻專案，用於測試上下文構建的性能極限。'.repeat(5)
      );

      // 創建大量角色
      const characterCount = 200;
      console.log(`創建 ${characterCount} 個詳細角色...`);
      
      const insertCharacter = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const characterTransaction = db.transaction(() => {
        for (let i = 0; i < characterCount; i++) {
          const archetypes = ['勇者', '法師', '盜賊', '牧師', '戰士', '弓箭手', '騎士', '刺客', '賢者', '吟遊詩人'];
          insertCharacter.run(
            `large-char-${i}`,
            projectId,
            `角色${i}號`,
            archetypes[i % archetypes.length],
            18 + (i % 60),
            i % 2 === 0 ? '男' : '女',
            `這是角色${i}的詳細外觀描述，包含身高、體重、髮色、眼色等特徵。`.repeat(3),
            `這是角色${i}的性格描述，包含性格特點、行為習慣、價值觀等。`.repeat(3),
            `這是角色${i}的背景故事，包含出身、經歷、技能、目標等詳細信息。`.repeat(5)
          );
        }
      });
      
      characterTransaction();

      // 為角色添加能力
      console.log('為角色添加能力...');
      const insertAbility = db.prepare(`
        INSERT INTO character_abilities (id, character_id, name, description) 
        VALUES (?, ?, ?, ?)
      `);
      
      const abilityTransaction = db.transaction(() => {
        for (let i = 0; i < characterCount; i++) {
          const abilities = ['基礎戰鬥', '魔法感知', '生存技能', '社交能力', '特殊技能'];
          abilities.forEach((ability, index) => {
            insertAbility.run(
              `ability-${i}-${index}`,
              `large-char-${i}`,
              `${ability}`,
              `角色${i}的${ability}描述，包含具體的技能效果和使用方法。`.repeat(2)
            );
          });
        }
      });
      
      abilityTransaction();

      // 創建大量章節
      const chapterCount = 100;
      console.log(`創建 ${chapterCount} 個詳細章節...`);
      
      const insertChapter = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const chapterTransaction = db.transaction(() => {
        for (let i = 0; i < chapterCount; i++) {
          const content = `第 ${i + 1} 章的詳細內容，包含場景描述、角色對話、動作描述和心理活動。`.repeat(100);
          insertChapter.run(
            `large-chapter-${i}`,
            projectId,
            `第 ${i + 1} 章：章節標題`,
            content,
            i + 1
          );
        }
      });
      
      chapterTransaction();

      // 測試不同章節的上下文構建性能
      const contextTests = [
        { chapterIndex: 0, description: '第一章上下文（包含所有角色）' },
        { chapterIndex: 50, description: '中間章節上下文' },
        { chapterIndex: 99, description: '最後章節上下文' }
      ];

      for (const test of contextTests) {
        const contextStartTime = performance.now();
        
        const context = await contextManager.buildContext(
          projectId, 
          `large-chapter-${test.chapterIndex}`, 
          0
        );
        
        const contextEndTime = performance.now();
        const contextDuration = contextEndTime - contextStartTime;
        
        console.log(`${test.description}構建耗時: ${contextDuration.toFixed(2)}ms`);
        console.log(`上下文長度: ${context.length} 字符 (${(context.length / 1024).toFixed(2)} KB)`);
        
        // 驗證上下文內容
        expect(context).toContain('大型上下文測試專案');
        expect(context).toContain('角色');
        expect(context).toContain('第');
        
        // 性能要求：即使是大型專案，上下文構建也應該在2秒內完成
        expect(contextDuration).toBeLessThan(2000);
      }

      // 測試上下文壓縮性能
      console.log('測試大型上下文壓縮性能...');
      const fullContext = await contextManager.buildContext(projectId, `large-chapter-50`, 0);
      
      const compressionTests = [
        { maxLength: 5000, description: '壓縮到5KB' },
        { maxLength: 2000, description: '壓縮到2KB' },
        { maxLength: 1000, description: '壓縮到1KB' },
        { maxLength: 500, description: '壓縮到500字符' }
      ];

      for (const test of compressionTests) {
        const compressionStartTime = performance.now();
        
        const compressed = contextManager.compressContext(fullContext, test.maxLength);
        
        const compressionEndTime = performance.now();
        const compressionDuration = compressionEndTime - compressionStartTime;
        
        console.log(`${test.description}耗時: ${compressionDuration.toFixed(2)}ms, 壓縮後長度: ${compressed.length}`);
        
        expect(compressed.length).toBeLessThanOrEqual(test.maxLength);
        expect(compressionDuration).toBeLessThan(200); // 壓縮應該很快
        expect(compressed).toContain('大型上下文測試專案'); // 重要信息應該保留
      }

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      
      console.log('✅ 大型專案上下文處理性能測試通過');
    });
  });

  describe('記憶體效率測試', () => {
    it('應該在處理大量文本時保持記憶體效率', async () => {
      const db = getDatabase();
      const contextManager = getContextManager();
      
      console.log('開始記憶體效率測試...');
      
      const initialMemory = process.memoryUsage();
      console.log(`初始記憶體使用: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

      // 創建多個專案並處理大量文本
      const projectCount = 10;
      const chaptersPerProject = 50;
      
      for (let p = 0; p < projectCount; p++) {
        const projectId = `memory-project-${p}`;
        
        // 創建專案
        db.prepare(`
          INSERT INTO projects (id, name, type) 
          VALUES (?, ?, ?)
        `).run(projectId, `記憶體測試專案 ${p}`, 'light-novel');
        
        // 創建章節
        const largeContent = '這是一個包含大量文本的章節內容。'.repeat(200);
        
        for (let c = 0; c < chaptersPerProject; c++) {
          db.prepare(`
            INSERT INTO chapters (id, project_id, title, content, order_num) 
            VALUES (?, ?, ?, ?, ?)
          `).run(
            `memory-chapter-${p}-${c}`,
            projectId,
            `第 ${c + 1} 章`,
            largeContent,
            c + 1
          );
        }
        
        // 構建上下文（模擬實際使用）
        await contextManager.buildContext(projectId, `memory-chapter-${p}-25`, 0);
        
        // 檢查記憶體使用
        if (p % 3 === 0) {
          const currentMemory = process.memoryUsage();
          const heapUsed = (currentMemory.heapUsed / 1024 / 1024).toFixed(2);
          console.log(`處理 ${p + 1} 個專案後記憶體使用: ${heapUsed} MB`);
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);
      
      console.log(`最終記憶體使用: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`記憶體增長: ${memoryIncreaseMB} MB`);

      // 清理所有測試資料
      for (let p = 0; p < projectCount; p++) {
        db.prepare('DELETE FROM projects WHERE id = ?').run(`memory-project-${p}`);
      }

      // 強制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const afterCleanupMemory = process.memoryUsage();
      const afterCleanupMB = (afterCleanupMemory.heapUsed / 1024 / 1024).toFixed(2);
      console.log(`清理後記憶體使用: ${afterCleanupMB} MB`);

      // 記憶體增長應該控制在合理範圍內（小於100MB）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log('✅ 記憶體效率測試通過');
    });
  });
});