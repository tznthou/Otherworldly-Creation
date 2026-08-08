/**
 * useAIGeneration 的設定同步測試
 *
 * 釘住的症狀：使用者在「設定 → 智慧上下文」改了任何一項，AI 續寫的行為不變，
 * 要重開 app 才生效。根因是 generate 的 useCallback 依賴只列了 dispatch
 * （穩定引用），函式體卻讀了八個 settings 欄位 —— 閉包停在 mount 當下那份。
 *
 * 測試對象是 hook 的契約：它交給 ContextPreparationService 的優化配置，
 * 必須反映「呼叫當下」的 Redux settings，而不是 mount 當下的。
 * 因此 spy 的是 hook 的下游（服務層），Redux 與 hook 本身都跑真的。
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createEditor } from 'slate';

import { createAppStore } from '../../../renderer/src/store/store';
import { useAIGeneration, type AIGenerationConfig } from '../../../renderer/src/hooks/useAIGeneration';
import {
  DEFAULT_SETTINGS,
  updateAISettings,
  updateSettings,
  type AppSettings,
} from '../../../renderer/src/store/slices/settingsSlice';
import {
  contextPreparationService,
  type ContextOptimizationConfig,
  type EditorContext,
  type PromptContext,
} from '../../../renderer/src/services/ai-generation/ContextPreparationService';
import { generationExecutor } from '../../../renderer/src/services/ai-generation/GenerationExecutor';

// 使用者在設定頁能調的每一項都給一個非預設值，
// 這樣任何一項沒跟上，斷言就會指出是哪一項。
const USER_TUNED_CONTEXT: AppSettings['ai']['intelligentContext'] = {
  enabled: true,
  optimizationLevel: 'experimental',
  preserveDialogue: false,
  maxTokenBudget: 12345,
  plotAnalysisWeight: 0.6,
  statusWeight: 0.25,
  proximityWeight: 0.15,
  enablePerformanceMode: true,
};

const EDITOR_CONTEXT: EditorContext = {
  position: 0,
  hasSelection: false,
  isCollapsed: true,
  currentText: '前情提要。',
  textLength: 5,
};

const PROMPT_CONTEXT: PromptContext = {
  basePrompt: '前情提要。',
  systemPrompt: '你是小說寫作助手',
  position: 0,
};

function settingsStateWith(intelligentContext: AppSettings['ai']['intelligentContext'], featureOn: boolean) {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ai: { ...DEFAULT_SETTINGS.ai, intelligentContext },
      features: { ...DEFAULT_SETTINGS.features, intelligentContextOptimization: featureOn },
    },
    isLoading: false,
    hasUnsavedChanges: false,
    lastSaved: null,
  };
}

function buildConfig(editor: ReturnType<typeof createEditor>): AIGenerationConfig {
  return {
    model: 'llama3',
    provider: 'ollama',
    editor,
    projectId: 'test-project-1',
    chapterId: 'test-chapter-1',
    generationCount: 1,
    baseParams: {
      temperature: 0.7,
      topP: 0.9,
      presencePenalty: 0,
      maxTokens: 600,
      generationCount: 1,
    },
  };
}

describe('useAIGeneration 與智慧上下文設定的同步', () => {
  let preparePromptContextSpy: jest.SpyInstance;

  beforeEach(() => {
    jest
      .spyOn(contextPreparationService, 'prepareEditorContext')
      .mockReturnValue(EDITOR_CONTEXT);

    preparePromptContextSpy = jest
      .spyOn(contextPreparationService, 'preparePromptContext')
      .mockResolvedValue(PROMPT_CONTEXT);

    // 生成本身不是這個測試的對象，回一個成功結果讓流程走完即可。
    jest.spyOn(generationExecutor, 'executeBatchGeneration').mockResolvedValue({
      results: [
        {
          id: 'gen-1',
          text: '生成的內容',
          temperature: 0.7,
          timestamp: new Date('2026-08-08T00:00:00Z'),
          success: true,
        },
      ],
      successCount: 1,
      failureCount: 0,
      errors: [],
      totalRequested: 1,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mountHook(preloadedSettings: ReturnType<typeof settingsStateWith>) {
    const store = createAppStore({ settings: preloadedSettings });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    return { store, result };
  }

  function optimizationConfigOfLastCall(): ContextOptimizationConfig {
    const lastCall = preparePromptContextSpy.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    return lastCall![3] as ContextOptimizationConfig;
  }

  it('mount 當下的設定會傳給上下文準備服務', async () => {
    const { result } = mountHook(settingsStateWith(USER_TUNED_CONTEXT, true));
    const editor = createEditor();

    await act(async () => {
      await result.current.generate(buildConfig(editor));
    });

    const config = optimizationConfigOfLastCall();
    expect(config.enableIntelligentOptimization).toBe(true);
    expect(config.contextOptimizationLevel).toBe('experimental');
    expect(config.preserveDialogue).toBe(false);
    expect(config.maxTokenBudget).toBe(12345);
    expect(config.plotAnalysisWeight).toBe(0.6);
    expect(config.statusWeight).toBe(0.25);
    expect(config.proximityWeight).toBe(0.15);
  });

  it('mount 之後才改的設定，下一次生成就要生效（不必重開 app）', async () => {
    // 起手式是預設值：功能關閉、advanced、8000 token
    const { store, result } = mountHook(
      settingsStateWith(DEFAULT_SETTINGS.ai.intelligentContext, false)
    );
    const editor = createEditor();

    // 使用者到「設定 → 一般」把智慧上下文打開並調整參數
    act(() => {
      store.dispatch(
        updateSettings({
          features: { ...DEFAULT_SETTINGS.features, intelligentContextOptimization: true },
        })
      );
      store.dispatch(updateAISettings({ intelligentContext: USER_TUNED_CONTEXT }));
    });

    await act(async () => {
      await result.current.generate(buildConfig(editor));
    });

    const config = optimizationConfigOfLastCall();
    expect(config.enableIntelligentOptimization).toBe(true);
    expect(config.contextOptimizationLevel).toBe('experimental');
    expect(config.preserveDialogue).toBe(false);
    expect(config.maxTokenBudget).toBe(12345);
    expect(config.plotAnalysisWeight).toBe(0.6);
    expect(config.statusWeight).toBe(0.25);
    expect(config.proximityWeight).toBe(0.15);
  });
});
