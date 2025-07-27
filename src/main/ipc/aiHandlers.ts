import { ipcMain } from 'electron';
import { getContextManager } from '../services/contextManager';
import { ollamaService } from '../services/ollamaService';

/**
 * 設置 AI 引擎相關的 IPC 處理程序
 */
export function setupAIHandlers(): void {
  console.log('=== 註冊 AI IPC 處理器 ===');
  
  // 檢查 Ollama 服務
  ipcMain.handle('ai:checkOllamaService', async () => {
    try {
      console.log('=== IPC: 檢查 Ollama 服務 ===');
      const result = await ollamaService.checkServiceAvailability();
      console.log('IPC: Ollama 服務檢查結果:', JSON.stringify(result, null, 2));
      console.log('IPC: 服務可用性:', result.available);
      return result.available;
    } catch (error) {
      console.error('IPC: 檢查 Ollama 服務失敗:', error);
      return false;
    }
  });
  console.log('已註冊: ai:checkOllamaService');

  // 獲取詳細的服務狀態
  ipcMain.handle('ai:getServiceStatus', async () => {
    try {
      console.log('=== 開始獲取服務狀態 ===');
      const status = await ollamaService.getServiceStatus();
      console.log('服務狀態:', JSON.stringify(status, null, 2));
      return status;
    } catch (error) {
      console.error('獲取服務狀態失敗:', error);
      return {
        service: { available: false, error: '服務檢查失敗' },
        models: { count: 0, list: [] },
        lastChecked: new Date(),
      };
    }
  });
  
  // 獲取模型列表
  ipcMain.handle('ai:listModels', async () => {
    try {
      console.log('=== 開始獲取模型列表 ===');
      const result = await ollamaService.listModels();
      console.log('模型列表結果:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        const modelNames = result.models.map(model => model.name);
        console.log('可用模型:', modelNames);
        console.log('模型數量:', modelNames.length);
        return modelNames;
      } else {
        console.error('獲取模型列表失敗:', result.error);
        return [];
      }
    } catch (error) {
      console.error('獲取模型列表失敗:', error);
      return [];
    }
  });

  // 獲取詳細的模型資訊
  ipcMain.handle('ai:getModelsInfo', async () => {
    try {
      console.log('=== 開始獲取詳細模型資訊 ===');
      const result = await ollamaService.listModels();
      console.log('詳細模型資訊:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('獲取模型資訊失敗:', error);
      return {
        success: false,
        models: [],
        error: '獲取模型資訊失敗',
      };
    }
  });

  // 檢查特定模型是否可用
  ipcMain.handle('ai:checkModelAvailability', async (_, modelName) => {
    try {
      return await ollamaService.checkModelAvailability(modelName);
    } catch (error) {
      console.error('檢查模型可用性失敗:', error);
      return {
        available: false,
        error: '檢查模型失敗',
      };
    }
  });
  
  // 生成文本
  ipcMain.handle('ai:generateText', async (_, prompt, model, params) => {
    try {
      const result = await ollamaService.generateText(model, prompt, {
        temperature: params.temperature,
        topP: params.topP,
        maxTokens: params.maxTokens,
        presencePenalty: params.presencePenalty,
        frequencyPenalty: params.frequencyPenalty,
      });

      if (result.success) {
        return result.response;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('AI 文本生成失敗:', error);
      throw error;
    }
  });
  
  // 使用上下文生成文本
  ipcMain.handle('ai:generateWithContext', async (_, projectId, chapterId, position, model, params) => {
    try {
      // 1. 獲取上下文
      const contextManager = getContextManager();
      const maxContextTokens = params.maxContextTokens || 2000;
      
      // 構建基本上下文
      const context = await contextManager.buildContext(projectId, chapterId, position);
      
      // 壓縮上下文
      const compressedContext = contextManager.compressContext(context, maxContextTokens);
      
      // 2. 添加生成指令
      const prompt = `${compressedContext}\n\n請根據以上內容，繼續寫下去：`;
      
      // 3. 生成文本
      const result = await ollamaService.generateText(model, prompt, {
        temperature: params.temperature,
        topP: params.topP,
        maxTokens: params.maxTokens,
        presencePenalty: params.presencePenalty,
        frequencyPenalty: params.frequencyPenalty,
      });

      if (result.success && result.response) {
        return result.response;
      } else {
        throw new Error(result.error || '生成失敗');
      }
    } catch (error) {
      console.error('AI 上下文生成失敗:', error);
      throw error;
    }
  });

  // 更新 Ollama 配置
  ipcMain.handle('ai:updateOllamaConfig', async (_, config) => {
    try {
      ollamaService.updateConfig(config);
      return { success: true };
    } catch (error) {
      console.error('更新 Ollama 配置失敗:', error);
      return { success: false, error: '更新配置失敗' };
    }
  });
}