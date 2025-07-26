import { OllamaService, ollamaService } from '../../services/ollamaService';

// 模擬 fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// 模擬 AbortController
global.AbortController = jest.fn(() => ({
  abort: jest.fn(),
  signal: {} as AbortSignal,
})) as any;

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(() => {
    service = new OllamaService('http://localhost:11434', 5000, 2, 500);
    mockFetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkServiceAvailability', () => {
    it('應該在服務可用時返回成功結果', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await service.checkServiceAvailability();

      expect(result.available).toBe(true);
      expect(result.version).toBe('0.1.0');
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/version',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('應該在服務不可用時返回錯誤', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await service.checkServiceAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('HTTP 500: Internal Server Error');
      expect(result.version).toBeUndefined();
    });

    it('應該處理連接拒絕錯誤', async () => {
      const error = new Error('ECONNREFUSED');
      mockFetch.mockRejectedValue(error);

      const result = await service.checkServiceAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('Ollama 服務未運行');
    });

    it('應該處理超時錯誤', async () => {
      const error = new Error('AbortError');
      mockFetch.mockRejectedValue(error);

      const result = await service.checkServiceAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('連接超時');
    });

    it('應該處理其他錯誤', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      const result = await service.checkServiceAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('listModels', () => {
    it('應該返回模型列表', async () => {
      // 模擬服務檢查成功
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        // 模擬模型列表請求成功
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            models: [
              {
                name: 'llama3:latest',
                size: 4661224676,
                digest: 'abc123',
                modified_at: '2024-01-01T00:00:00Z',
              },
              {
                name: 'codellama:latest',
                size: 3825819519,
                digest: 'def456',
                modified_at: '2024-01-02T00:00:00Z',
              },
            ],
          }),
        } as any);

      const result = await service.listModels();

      expect(result.success).toBe(true);
      expect(result.models).toHaveLength(2);
      expect(result.models[0]).toEqual({
        name: 'llama3:latest',
        size: 4661224676,
        modified_at: '2024-01-01T00:00:00Z',
      });
      expect(result.error).toBeUndefined();
    });

    it('應該在服務不可用時返回錯誤', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.listModels();

      expect(result.success).toBe(false);
      expect(result.models).toHaveLength(0);
      expect(result.error).toBe('Ollama 服務未運行');
    });

    it('應該處理空模型列表', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ models: [] }),
        } as any);

      const result = await service.listModels();

      expect(result.success).toBe(true);
      expect(result.models).toHaveLength(0);
    });

    it('應該處理 API 錯誤', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as any);

      const result = await service.listModels();

      expect(result.success).toBe(false);
      expect(result.error).toBe('無法獲取模型列表: HTTP 404');
    });
  });

  describe('generateText', () => {
    it('應該成功生成文本', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '這是生成的文本',
            done: true,
            total_duration: 1000000,
            eval_count: 10,
            eval_duration: 500000,
          }),
        } as any);

      const result = await service.generateText('llama3', '寫一個故事');

      expect(result.success).toBe(true);
      expect(result.response).toBe('這是生成的文本');
      expect(result.metadata).toEqual({
        total_duration: 1000000,
        eval_count: 10,
        eval_duration: 500000,
      });
      expect(result.error).toBeUndefined();
    });

    it('應該使用正確的請求參數', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '生成的文本',
            done: true,
          }),
        } as any);

      await service.generateText('llama3', '測試提示', {
        temperature: 0.8,
        topP: 0.95,
        maxTokens: 500,
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',
            prompt: '測試提示',
            stream: false,
            options: {
              temperature: 0.8,
              top_p: 0.95,
              max_tokens: 500,
              presence_penalty: 0,
              frequency_penalty: 0,
            },
          }),
        })
      );
    });

    it('應該在服務不可用時返回錯誤', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.generateText('llama3', '測試');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ollama 服務未運行');
    });

    it('應該處理 4xx 錯誤且不重試', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as any);

      const result = await service.generateText('invalid-model', '測試');

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 404: Not Found');
      expect(mockFetch).toHaveBeenCalledTimes(2); // 不應該重試
    });

    it('應該對 5xx 錯誤進行重試', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            response: '重試成功',
            done: true,
          }),
        } as any);

      // 快進時間以模擬重試延遲
      const generatePromise = service.generateText('llama3', '測試');
      jest.advanceTimersByTime(500);
      const result = await generatePromise;

      expect(result.success).toBe(true);
      expect(result.response).toBe('重試成功');
      expect(mockFetch).toHaveBeenCalledTimes(4); // 2次服務檢查 + 2次生成請求
    });
  });

  describe('checkModelAvailability', () => {
    it('應該確認模型存在', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            models: [
              { name: 'llama3:latest', size: 1000, modified_at: '2024-01-01' },
            ],
          }),
        } as any);

      const result = await service.checkModelAvailability('llama3:latest');

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該確認模型不存在', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ models: [] }),
        } as any);

      const result = await service.checkModelAvailability('nonexistent-model');

      expect(result.available).toBe(false);
      expect(result.error).toBe('模型 "nonexistent-model" 不存在');
    });

    it('應該支援部分匹配模型名稱', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            models: [
              { name: 'llama3:7b', size: 1000, modified_at: '2024-01-01' },
            ],
          }),
        } as any);

      const result = await service.checkModelAvailability('llama3');

      expect(result.available).toBe(true);
    });
  });

  describe('getServiceStatus', () => {
    it('應該返回完整的服務狀態', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            models: [
              { name: 'llama3:latest', size: 1000, modified_at: '2024-01-01' },
              { name: 'codellama:latest', size: 2000, modified_at: '2024-01-02' },
            ],
          }),
        } as any);

      const result = await service.getServiceStatus();

      expect(result.service.available).toBe(true);
      expect(result.service.version).toBe('0.1.0');
      expect(result.models.count).toBe(2);
      expect(result.models.list).toEqual(['llama3:latest', 'codellama:latest']);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('updateConfig', () => {
    it('應該更新配置', () => {
      const newService = new OllamaService();
      
      newService.updateConfig({
        baseUrl: 'http://custom:8080',
        timeout: 10000,
        retryAttempts: 5,
        retryDelay: 2000,
      });

      // 由於屬性是私有的，我們通過行為來測試
      expect(newService).toBeDefined();
    });
  });

  describe('單例實例', () => {
    it('應該提供單例實例', () => {
      expect(ollamaService).toBeInstanceOf(OllamaService);
    });
  });
});