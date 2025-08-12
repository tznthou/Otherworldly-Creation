/**
 * 優化的 Redux 選擇器
 * 使用 reselect 創建記憶化選擇器，避免不必要的重新計算
 */

import { createSelector, createSelectorCreator, lruMemoize } from 'reselect';
import { RootState } from './store';
// import { Character } from '../api/models';

// 創建自定義選擇器創建器，使用 LRU 緩存
const createLRUSelector = createSelectorCreator(
  lruMemoize,
  {
    maxSize: 50, // 最大緩存50個結果
    equalityCheck: (a, b) => a === b,
  }
);

// 基礎選擇器（直接從 state 選取值）
const selectCharacters = (state: RootState) => state.characters.characters;
// const selectCharactersLoading = (state: RootState) => state.characters.loading;
// const selectCharactersError = (state: RootState) => state.characters.error;
const selectSearchQuery = (state: RootState) => state.characters.searchQuery;
// const selectCurrentProject = (state: RootState) => state.projects.currentProject;
const selectUISettings = (state: RootState) => state.ui;
const selectChapters = (state: RootState) => state.chapters.chapters;
// const selectCurrentChapter = (state: RootState) => state.chapters.currentChapter;

// 記憶化選擇器 - 角色相關
export const selectCharactersByProjectId = createSelector(
  [selectCharacters, (_: RootState, projectId: string) => projectId],
  (characters, projectId) => {
    if (!projectId) return [];
    return characters.filter(character => character.projectId === projectId);
  }
);

export const selectFilteredCharacters = createSelector(
  [selectCharacters, selectSearchQuery],
  (characters, searchQuery) => {
    if (!searchQuery.trim()) return characters;
    
    const query = searchQuery.toLowerCase();
    return characters.filter(character =>
      character.name.toLowerCase().includes(query) ||
      character.background?.toLowerCase().includes(query) ||
      character.archetype?.toLowerCase().includes(query) ||
      character.personality?.toLowerCase().includes(query)
    );
  }
);

export const selectCharactersCount = createSelector(
  [selectCharacters],
  (characters) => characters.length
);

// 暫時移除 importance 屬性的選擇器，因為 Character 模型中沒有此屬性
// export const selectMainCharacters = createSelector(
//   [selectCharacters],
//   (characters) => characters.filter(character => character.importance === 'main')
// );

// export const selectSupportingCharacters = createSelector(
//   [selectCharacters],
//   (characters) => characters.filter(character => character.importance === 'supporting')
// );

// 記憶化選擇器 - 章節相關
export const selectChaptersByProjectId = createSelector(
  [selectChapters, (_: RootState, projectId: string) => projectId],
  (chapters, projectId) => {
    if (!projectId) return [];
    return chapters.filter(chapter => chapter.projectId === projectId);
  }
);

export const selectChaptersWithContent = createSelector(
  [selectChapters],
  (chapters) => chapters.filter(chapter => chapter.content && Array.isArray(chapter.content) && chapter.content.length > 0)
);

export const selectTotalWordCount = createSelector(
  [selectChapters],
  (chapters) => {
    return chapters.reduce((total, chapter) => {
      if (!chapter.content || !Array.isArray(chapter.content)) return total;
      // 將 Slate 內容轉換為純文字進行字數統計
      const contentText = chapter.content.map(node => 
        'text' in node ? node.text : ''
      ).join('');
      // 簡單的中文字數統計
      const chineseChars = (contentText.match(/[\u4e00-\u9fa5]/g) || []).length;
      const englishWords = (contentText.match(/[a-zA-Z]+/g) || []).length;
      return total + chineseChars + englishWords;
    }, 0);
  }
);

// 記憶化選擇器 - AI 相關
export const selectAvailableModels = (state: RootState) => state.ai.availableModels;
export const selectCurrentModel = (state: RootState) => state.ai.currentModel;
export const selectAIStatus = (state: RootState) => ({
  isConnected: state.ai.isOllamaConnected,
  isProcessing: state.ai.generating,
  error: state.ai.error
});

// 複雜的組合選擇器
export const selectProjectStatistics = createLRUSelector(
  [selectChaptersByProjectId, selectCharactersByProjectId, selectTotalWordCount],
  (chapters, characters, totalWords) => ({
    chaptersCount: chapters.length,
    charactersCount: characters.length,
    totalWordCount: totalWords,
    // 暫時移除 importance 相關統計
    chaptersWithContent: chapters.filter(c => c.content && Array.isArray(c.content) && c.content.length > 0).length,
  })
);

// 記憶化選擇器 - 模態框和 UI 狀態
export const selectActiveModals = createSelector(
  [selectUISettings],
  (ui) => Object.entries(ui.modals)
    .filter(([_, isOpen]) => isOpen)
    .map(([modalName]) => modalName)
);

export const selectIsAnyModalOpen = createSelector(
  [selectActiveModals],
  (activeModals) => activeModals.length > 0
);

// 性能優化選擇器 - 檢測可能的性能問題
export const selectPerformanceMetrics = createSelector(
  [selectCharacters, selectChapters, selectActiveModals],
  (characters, chapters, activeModals) => ({
    largeCharacterList: characters.length > 100,
    largeChapterList: chapters.length > 50,
    multipleModalsOpen: activeModals.length > 1,
    heavyContent: chapters.some(c => c.content && c.content.length > 50000), // 5萬字以上的章節
  })
);

// 記憶化選擇器工廠函數
export const makeSelectCharacterById = () => createSelector(
  [selectCharacters, (_: RootState, characterId: string) => characterId],
  (characters, characterId) => characters.find(character => character.id === characterId)
);

export const makeSelectChapterById = () => createSelector(
  [selectChapters, (_: RootState, chapterId: string) => chapterId],
  (chapters, chapterId) => chapters.find(chapter => chapter.id === chapterId)
);

// 導出記憶化選擇器的性能統計
export const getSelectorsPerformanceInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      selectFilteredCharacters: (selectFilteredCharacters as any).recomputations?.() || 0,
      selectProjectStatistics: (selectProjectStatistics as any).recomputations?.() || 0,
      selectActiveModals: (selectActiveModals as any).recomputations?.() || 0,
    };
  }
  return null;
};