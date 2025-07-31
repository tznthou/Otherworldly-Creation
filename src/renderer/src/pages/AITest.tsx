import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addNotification } from '../store/slices/uiSlice';
import { setCurrentModel, fetchAvailableModels } from '../store/slices/aiSlice';
import api from '../api';

const AITest: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentModel, availableModels, isOllamaConnected } = useAppSelector(state => state.ai);
  
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('請寫一個簡短的故事開頭');

  // 獲取可用的 AI 模型
  useEffect(() => {
    if (isOllamaConnected && availableModels.length === 0) {
      dispatch(fetchAvailableModels());
    }
  }, [dispatch, isOllamaConnected, availableModels.length]);

  const handleTest = async () => {
    if (!currentModel) {
      dispatch(addNotification({
        type: 'warning',
        title: '未選擇模型',
        message: '請先選擇一個 AI 模型',
        duration: 3000,
      }));
      return;
    }

    setIsGenerating(true);
    setResult('');

    try {
      console.log('測試基本文本生成...');
      
      const params = {
        temperature: 0.7,
        maxTokens: 200,
        topP: 0.9,
        presencePenalty: 0,
        frequencyPenalty: 0,
      };

      const response = await api.ai.generateText(prompt, currentModel, params);
      console.log('生成結果:', response);
      
      setResult(response);
      
      dispatch(addNotification({
        type: 'success',
        title: '生成成功',
        message: '文本生成完成',
        duration: 3000,
      }));

    } catch (error) {
      console.error('生成失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '生成失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        duration: 5000,
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContextTest = async () => {
    if (!currentModel) {
      dispatch(addNotification({
        type: 'warning',
        title: '未選擇模型',
        message: '請先選擇一個 AI 模型',
        duration: 3000,
      }));
      return;
    }

    setIsGenerating(true);
    setResult('');

    try {
      console.log('測試上下文生成...');
      
      const params = {
        temperature: 0.7,
        maxTokens: 200,
        topP: 0.9,
        presencePenalty: 0,
        frequencyPenalty: 0,
        maxContextTokens: 2000,
      };

      // 使用假的 ID 進行測試
      const response = await api.ai.generateWithContext('test-project', 'test-chapter', 0, currentModel, params);
      console.log('上下文生成結果:', response);
      
      setResult(response);
      
      dispatch(addNotification({
        type: 'success',
        title: '上下文生成成功',
        message: '上下文生成完成',
        duration: 3000,
      }));

    } catch (error) {
      console.error('上下文生成失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '上下文生成失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        duration: 5000,
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gold-400 mb-6">AI 功能測試</h1>
      
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gold-400 mb-4">基本設定</h2>
        
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Ollama 連接狀態</label>
          <div className={`px-3 py-2 rounded ${isOllamaConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {isOllamaConnected ? '✓ 已連接' : '✗ 未連接'}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">選擇模型</label>
          <select
            value={currentModel || ''}
            onChange={(e) => dispatch(setCurrentModel(e.target.value))}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded px-3 py-2 text-white"
            disabled={!isOllamaConnected || availableModels.length === 0}
          >
            <option value="">請選擇模型...</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">測試提示詞</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded px-3 py-2 text-white h-20"
            placeholder="輸入測試提示詞..."
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleTest}
            disabled={isGenerating || !currentModel || !isOllamaConnected}
            className="btn-primary"
          >
            {isGenerating ? '生成中...' : '測試基本生成'}
          </button>
          
          <button
            onClick={handleContextTest}
            disabled={isGenerating || !currentModel || !isOllamaConnected}
            className="btn-secondary"
          >
            {isGenerating ? '生成中...' : '測試上下文生成'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gold-400 mb-4">生成結果</h2>
          <div className="bg-cosmic-900 p-4 rounded text-white whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITest;