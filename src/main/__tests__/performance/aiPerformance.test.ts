import { ollamaService } from '../../services/ollamaService';
import { initDatabase, getDatabase, closeDatabase } from '../../database/database';
import { setContextManager, getContextManager } from '../../services/contextManager';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 模擬 Electron 環境
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(os.tmpdir(), 'test-genesis-chronicle-ai-perf')),
  },
}));

// 模擬 fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

/**
 * AI 請求性能測試
 * 測試 AI 服務在各種負載條件下的性能表現
 */
describe('AI 請求性能測試', () => {
  const testDbPath = path.join(os.tmpdir(), 'test-genesis-chronicle-ai-perf', 'genesis-chronicle.db');

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

  describe('單次 AI 請求性能', () => {
    it('應該能快速處理短文本生成請求', async () => {
      // 模擬快速響應
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '這是一個簡短的 AI 生成回應。',
            done: true,
            total_duration: 500000, // 0.5秒
            eval_count: 10,
            eval_duration: 300000,
          }),
        } as any);

      const shortPrompt = '請寫一個簡短的開場白。';
      
      console.log(`測試短文本生成，提示長度: ${shortPrompt.length} 字符`);
      
      const startTime = performance.now();
      const result = await ollamaService.generateText('llama3', shortPrompt);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`短文本生成耗時: ${duration.toFixed(2)}ms`);
      console.log(`生成內容: "${result.response}"`);
      
      expect(result.success).toBe(true);
      expect(result.response).toContain('AI 生成');
      expect(duration).toBeLessThan(1000); // 短文本應該在1秒內完成
      
      console.log('✅ 短文本生成性能測試通過');
    });

    it('應該能處理中等長度文本生成請求', async () => {
      // 模擬中等響應時間
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '這是一個中等長度的 AI 生成回應，包含更多的細節和描述。'.repeat(5),
            done: true,
            total_duration: 2000000, // 2秒
            eval_count: 50,
            eval_duration: 1500000,
          }),
        } as any);

      const mediumPrompt = '請寫一個包含角色介紹和場景描述的段落。'.repeat(3);
      
      console.log(`測試中等文本生成，提示長度: ${mediumPrompt.length} 字符`);
      
      const startTime = performance.now();
      const result = await ollamaService.generateText('llama3', mediumPrompt);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`中等文本生成耗時: ${duration.toFixed(2)}ms`);
      console.log(`生成內容長度: ${result.response?.length || 0} 字符`);
      
      expect(result.success).toBe(true);
      expect(result.response?.length || 0).toBeGreaterThan(50);
      expect(duration).toBeLessThan(3000); // 中等文本應該在3秒內完成
      
      console.log('✅ 中等文本生成性能測試通過');
    });

    it('應該能處理長文本生成請求', async () => {
      // 模擬較長響應時間
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '這是一個長篇的 AI 生成回應，包含詳細的情節發展、角色對話和場景描述。'.repeat(20),
            done: true,
            total_duration: 5000000, // 5秒
            eval_count: 200,
            eval_duration: 4000000,
          }),
        } as any);

      const longPrompt = '請寫一個完整的章節，包含詳細的場景描述、角色對話和情節發展。'.repeat(10);
      
      console.log(`測試長文本生成，提示長度: ${longPrompt.length} 字符`);
      
      const startTime = performance.now();
      const result = await ollamaService.generateText('llama3', longPrompt);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`長文本生成耗時: ${duration.toFixed(2)}ms`);
      console.log(`生成內容長度: ${result.response?.length || 0} 字符`);
      
      expect(result.success).toBe(true);
      expect(result.response?.length || 0).toBeGreaterThan(200);
      expect(duration).toBeLessThan(8000); // 長文本應該在8秒內完成
      
      console.log('✅ 長文本生成性能測試通過');
    });
  });

  describe('並發 AI 請求性能', () => {
    it('應該能處理低並發請求', async () => {
      const concurrentCount = 3;
      
      // 為每個請求設置模擬響應
      for (let i = 0; i < concurrentCount * 2; i++) { // *2 因為每個請求需要兩次 fetch
        if (i % 2 === 0) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
          } as any);
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({
              response: `這是第 ${Math.floor(i/2) + 1} 個並發請求的回應。`,
              done: true,
              total_duration: 1000000,
              eval_count: 25,
              eval_duration: 800000,
            }),
          } as any);
        }
      }

      console.log(`測試 ${concurrentCount} 個並發 AI 請求...`);
      
      const requests = [];
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentCount; i++) {
        requests.push(
          ollamaService.generateText('llama3', `這是第 ${i + 1} 個並發請求`)
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      console.log(`${concurrentCount} 個並發請求總耗時: ${totalDuration.toFixed(2)}ms`);
      console.log(`平均每個請求耗時: ${(totalDuration / concurrentCount).toFixed(2)}ms`);
      
      // 驗證所有請求都成功
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.response).toContain(`第 ${index + 1} 個`);
      });
      
      expect(totalDuration).toBeLessThan(5000); // 3個並發請求應該在5秒內完成
      
      console.log('✅ 低並發請求性能測試通過');
    });

    it('應該能處理中等並發請求', async () => {
      const concurrentCount = 8;
      
      // 為每個請求設置模擬響應
      for (let i = 0; i < concurrentCount * 2; i++) {
        if (i % 2 === 0) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
          } as any);
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({
              response: `這是第 ${Math.floor(i/2) + 1} 個中等並發請求的回應，包含更多內容。`,
              done: true,
              total_duration: 1500000,
              eval_count: 40,
              eval_duration: 1200000,
            }),
          } as any);
        }
      }

      console.log(`測試 ${concurrentCount} 個中等並發 AI 請求...`);
      
      const requests = [];
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentCount; i++) {
        requests.push(
          ollamaService.generateText('llama3', `請為第 ${i + 1} 個請求生成一段描述`)
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      console.log(`${concurrentCount} 個並發請求總耗時: ${totalDuration.toFixed(2)}ms`);
      console.log(`平均每個請求耗時: ${(totalDuration / concurrentCount).toFixed(2)}ms`);
      
      // 驗證所有請求都成功
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.response).toContain(`第 ${index + 1} 個`);
      });
      
      expect(totalDuration).toBeLessThan(10000); // 8個並發請求應該在10秒內完成
      
      console.log('✅ 中等並發請求性能測試通過');
    });

    it('應該能處理高並發請求', async () => {
      const concurrentCount = 15;
      
      // 為每個請求設置模擬響應
      for (let i = 0; i < concurrentCount * 2; i++) {
        if (i % 2 === 0) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
          } as any);
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({
              response: `高並發請求 ${Math.floor(i/2) + 1} 的回應。`,
              done: true,
              total_duration: 2000000,
              eval_count: 30,
              eval_duration: 1500000,
            }),
          } as any);
        }
      }

      console.log(`測試 ${concurrentCount} 個高並發 AI 請求...`);
      
      const requests = [];
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentCount; i++) {
        requests.push(
          ollamaService.generateText('llama3', `高並發測試請求 ${i + 1}`)
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      console.log(`${concurrentCount} 個並發請求總耗時: ${totalDuration.toFixed(2)}ms`);
      console.log(`平均每個請求耗時: ${(totalDuration / concurrentCount).toFixed(2)}ms`);
      
      // 驗證所有請求都成功
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.response).toContain(`${index + 1}`);
      });
      
      expect(totalDuration).toBeLessThan(20000); // 15個並發請求應該在20秒內完成
      
      console.log('✅ 高並發請求性能測試通過');
    });
  });

  describe('AI 請求與上下文整合性能', () => {
    it('應該能高效處理帶有大量上下文的 AI 請求', async () => {
      const db = getDatabase();
      const contextManager = getContextManager();
      
      // 創建測試專案
      const projectId = 'ai-context-project';
      db.prepare(`
        INSERT INTO projects (id, name, type, description) 
        VALUES (?, ?, ?, ?)
      `).run(
        projectId,
        'AI 上下文測試專案',
        'light-novel',
        '這是一個用於測試 AI 與上下文整合性能的專案。'.repeat(5)
      );

      // 創建角色
      const characterCount = 20;
      for (let i = 0; i < characterCount; i++) {
        db.prepare(`
          INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `ai-char-${i}`,
          projectId,
          `角色${i}`,
          ['主角', '配角', '反派', '導師', '朋友'][i % 5],
          18 + (i % 40),
          i % 2 === 0 ? '男' : '女',
          `角色${i}的外觀描述。`.repeat(3),
          `角色${i}的性格描述。`.repeat(3),
          `角色${i}的背景故事。`.repeat(5)
        );
      }

      // 創建章節
      const chapterCount = 10;
      for (let i = 0; i < chapterCount; i++) {
        db.prepare(`
          INSERT INTO chapters (id, project_id, title, content, order_num) 
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `ai-chapter-${i}`,
          projectId,
          `第 ${i + 1} 章`,
          `第 ${i + 1} 章的詳細內容，包含情節發展和角色互動。`.repeat(50),
          i + 1
        );
      }

      // 測試不同章節的上下文 + AI 生成性能
      const testCases = [
        { chapterIndex: 0, description: '第一章（包含所有角色介紹）' },
        { chapterIndex: 5, description: '中間章節' },
        { chapterIndex: 9, description: '最後章節' }
      ];

      for (const testCase of testCases) {
        console.log(`測試 ${testCase.description} 的上下文 + AI 生成...`);
        
        // 構建上下文
        const contextStartTime = performance.now();
        const context = await contextManager.buildContext(
          projectId, 
          `ai-chapter-${testCase.chapterIndex}`, 
          0
        );
        const contextEndTime = performance.now();
        const contextDuration = contextEndTime - contextStartTime;
        
        console.log(`上下文構建耗時: ${contextDuration.toFixed(2)}ms, 長度: ${context.length} 字符`);

        // 模擬 AI 響應
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
          } as any)
          .mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({
              response: `基於提供的豐富上下文，我為第 ${testCase.chapterIndex + 1} 章生成了續寫內容。`,
              done: true,
              total_duration: 3000000 + (context.length / 100), // 根據上下文長度調整時間
              eval_count: 80,
              eval_duration: 2500000,
            }),
          } as any);

        // AI 生成
        const aiStartTime = performance.now();
        const prompt = `基於以下上下文，請繼續撰寫故事：\n\n${context}\n\n請繼續第 ${testCase.chapterIndex + 1} 章的內容。`;
        const result = await ollamaService.generateText('llama3', prompt);
        const aiEndTime = performance.now();
        const aiDuration = aiEndTime - aiStartTime;
        
        console.log(`AI 生成耗時: ${aiDuration.toFixed(2)}ms`);
        console.log(`總耗時: ${(contextDuration + aiDuration).toFixed(2)}ms`);
        
        expect(result.success).toBe(true);
        expect(result.response).toContain('生成了續寫內容');
        
        // 性能要求：上下文構建 + AI 生成應該在合理時間內完成
        expect(contextDuration).toBeLessThan(1000); // 上下文構建 < 1秒
        expect(aiDuration).toBeLessThan(5000);      // AI 生成 < 5秒
        expect(contextDuration + aiDuration).toBeLessThan(6000); // 總時間 < 6秒
      }

      // 清理測試資料
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      
      console.log('✅ AI 請求與上下文整合性能測試通過');
    });
  });

  describe('AI 請求錯誤處理性能', () => {
    it('應該能快速處理服務不可用錯誤', async () => {
      // 模擬服務不可用
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      
      console.log('測試 AI 服務不可用時的錯誤處理性能...');
      
      const startTime = performance.now();
      const result = await ollamaService.generateText('llama3', '測試請求');
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`錯誤處理耗時: ${duration.toFixed(2)}ms`);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Ollama 服務未運行');
      expect(duration).toBeLessThan(1000); // 錯誤處理應該很快
      
      console.log('✅ 服務不可用錯誤處理性能測試通過');
    });

    it('應該能快速處理超時錯誤', async () => {
      // 模擬超時
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );
      
      console.log('測試 AI 請求超時時的錯誤處理性能...');
      
      const startTime = performance.now();
      const result = await ollamaService.generateText('llama3', '測試超時請求');
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`超時錯誤處理耗時: ${duration.toFixed(2)}ms`);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('請求失敗');
      expect(duration).toBeLessThan(2000); // 超時處理應該在2秒內完成
      
      console.log('✅ 超時錯誤處理性能測試通過');
    });

    it('應該能快速處理無效響應錯誤', async () => {
      // 模擬無效響應
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: jest.fn().mockResolvedValue({ error: 'Server error' }),
        } as any);
      
      console.log('測試 AI 服務返回錯誤響應時的處理性能...');
      
      const startTime = performance.now();
      const result = await ollamaService.generateText('llama3', '測試錯誤響應');
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`錯誤響應處理耗時: ${duration.toFixed(2)}ms`);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('請求失敗');
      expect(duration).toBeLessThan(1000); // 錯誤響應處理應該很快
      
      console.log('✅ 無效響應錯誤處理性能測試通過');
    });
  });

  describe('AI 請求資源使用測試', () => {
    it('應該在大量 AI 請求時保持資源效率', async () => {
      console.log('開始 AI 請求資源使用測試...');
      
      const initialMemory = process.memoryUsage();
      console.log(`初始記憶體使用: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

      const requestCount = 50;
      
      // 為所有請求設置模擬響應
      for (let i = 0; i < requestCount * 2; i++) {
        if (i % 2 === 0) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
          } as any);
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({
              response: `這是第 ${Math.floor(i/2) + 1} 個資源測試請求的回應。`,
              done: true,
              total_duration: 1000000,
              eval_count: 20,
              eval_duration: 800000,
            }),
          } as any);
        }
      }

      // 分批執行請求以模擬實際使用
      const batchSize = 5;
      const batches = Math.ceil(requestCount / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchRequests = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, requestCount);
        
        for (let i = batchStart; i < batchEnd; i++) {
          batchRequests.push(
            ollamaService.generateText('llama3', `資源測試請求 ${i + 1}`)
          );
        }
        
        await Promise.all(batchRequests);
        
        // 檢查記憶體使用
        if (batch % 2 === 0) {
          const currentMemory = process.memoryUsage();
          const heapUsed = (currentMemory.heapUsed / 1024 / 1024).toFixed(2);
          console.log(`完成 ${batchEnd} 個請求後記憶體使用: ${heapUsed} MB`);
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);
      
      console.log(`最終記憶體使用: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`記憶體增長: ${memoryIncreaseMB} MB`);

      // 記憶體增長應該控制在合理範圍內（小於50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log('✅ AI 請求資源使用測試通過');
    });
  });
});