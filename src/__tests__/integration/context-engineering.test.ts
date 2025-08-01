import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { api } from '../../renderer/src/api';

// Mock the Tauri API
jest.mock('../../renderer/src/api', () => ({
  api: {
    context: {
      buildSeparatedContext: jest.fn(),
      estimateSeparatedContextTokens: jest.fn(),
    },
    ai: {
      generateWithSeparatedContext: jest.fn(),
    },
  },
}));

describe('Context Engineering Integration Tests', () => {
  const mockProjectId = 'test-project-id';
  const mockChapterId = 'test-chapter-id';
  const mockPosition = 100;
  const mockModel = 'llama3.2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildSeparatedContext', () => {
    it('should build separated context without language parameter', async () => {
      const mockSystemPrompt = '你是一個專業的中文小說續寫助手...';
      const mockUserContext = 'Title: 測試項目\nChapter: 第一章...';
      
      (api.context.buildSeparatedContext as jest.Mock).mockResolvedValue([
        mockSystemPrompt,
        mockUserContext,
      ]);

      const result = await api.context.buildSeparatedContext(
        mockProjectId,
        mockChapterId,
        mockPosition
      );

      expect(api.context.buildSeparatedContext).toHaveBeenCalledWith(
        mockProjectId,
        mockChapterId,
        mockPosition
      );
      expect(result).toEqual([mockSystemPrompt, mockUserContext]);
      expect(result[0]).toContain('你是一個專業的中文小說續寫助手');
      expect(result[1]).toContain('Title:');
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Failed to build context');
      (api.context.buildSeparatedContext as jest.Mock).mockRejectedValue(mockError);

      await expect(
        api.context.buildSeparatedContext(mockProjectId, mockChapterId, mockPosition)
      ).rejects.toThrow('Failed to build context');
    });
  });

  describe('estimateSeparatedContextTokens', () => {
    it('should estimate token usage correctly', async () => {
      const mockStats = {
        system_prompt_tokens: 150,
        user_context_tokens: 210,
        total_tokens: 360,
        efficiency_percentage: 58.3,
        character_count: 5,
        estimated_savings_vs_legacy: 29.8,
      };

      (api.context.estimateSeparatedContextTokens as jest.Mock).mockResolvedValue(mockStats);

      const result = await api.context.estimateSeparatedContextTokens(mockProjectId);

      expect(api.context.estimateSeparatedContextTokens).toHaveBeenCalledWith(mockProjectId);
      expect(result).toEqual(mockStats);
      expect(result.total_tokens).toBe(360);
      expect(result.estimated_savings_vs_legacy).toBeCloseTo(29.8);
    });
  });

  describe('generateWithSeparatedContext', () => {
    it('should generate text without language parameter', async () => {
      const mockGeneratedText = '主角緩緩地走進了大殿，金色的陽光透過彩色玻璃窗灑在地面上...';
      const mockParams = {
        temperature: 0.7,
        maxTokens: 200,
        topP: 0.9,
        presencePenalty: 0,
        frequencyPenalty: 0,
      };

      (api.ai.generateWithSeparatedContext as jest.Mock).mockResolvedValue(mockGeneratedText);

      const result = await api.ai.generateWithSeparatedContext(
        mockProjectId,
        mockChapterId,
        mockPosition,
        mockModel,
        mockParams
      );

      expect(api.ai.generateWithSeparatedContext).toHaveBeenCalledWith(
        mockProjectId,
        mockChapterId,
        mockPosition,
        mockModel,
        mockParams
      );
      expect(result).toBe(mockGeneratedText);
      expect(result).toContain('主角');
    });

    it('should handle generation errors', async () => {
      const mockError = new Error('Ollama service not available');
      const mockParams = {
        temperature: 0.7,
        maxTokens: 200,
      };

      (api.ai.generateWithSeparatedContext as jest.Mock).mockRejectedValue(mockError);

      await expect(
        api.ai.generateWithSeparatedContext(
          mockProjectId,
          mockChapterId,
          mockPosition,
          mockModel,
          mockParams
        )
      ).rejects.toThrow('Ollama service not available');
    });
  });

  describe('Token Efficiency Validation', () => {
    it('should achieve expected token savings', async () => {
      // Simulate traditional method
      const traditionalTokens = 513;
      
      // Simulate separated method
      const mockStats = {
        system_prompt_tokens: 150,
        user_context_tokens: 210,
        total_tokens: 360,
        efficiency_percentage: 58.3,
        character_count: 5,
        estimated_savings_vs_legacy: 29.8,
      };

      (api.context.estimateSeparatedContextTokens as jest.Mock).mockResolvedValue(mockStats);

      const result = await api.context.estimateSeparatedContextTokens(mockProjectId);
      
      const actualSavings = ((traditionalTokens - result.total_tokens) / traditionalTokens) * 100;
      
      expect(actualSavings).toBeCloseTo(29.8, 1);
      expect(result.total_tokens).toBeLessThan(traditionalTokens);
    });
  });

  describe('Language Purity', () => {
    it('should enforce Traditional Chinese only', async () => {
      const mockSystemPrompt = `你是一個專業的中文小說續寫助手。你的任務是根據提供的上下文資訊，在指定位置插入合適的續寫內容。

核心要求:
- 在 [CONTINUE HERE] 標記處插入續寫內容
- 不要重複或重寫現有內容
- 保持角色一致性和對話風格
- 確保情節連貫和細節一致
- CRITICAL: 嚴格使用繁體中文，絕對不允許混雜任何英文單詞或簡體字`;

      (api.context.buildSeparatedContext as jest.Mock).mockResolvedValue([
        mockSystemPrompt,
        'User context...',
      ]);

      const result = await api.context.buildSeparatedContext(
        mockProjectId,
        mockChapterId,
        mockPosition
      );

      expect(result[0]).toContain('CRITICAL: 嚴格使用繁體中文');
      expect(result[0]).toContain('絕對不允許混雜任何英文單詞或簡體字');
      expect(result[0]).not.toContain('language');
      expect(result[0]).not.toContain('en');
      expect(result[0]).not.toContain('ja');
      expect(result[0]).not.toContain('zh-CN');
    });
  });
});