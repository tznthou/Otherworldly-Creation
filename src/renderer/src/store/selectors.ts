/**
 * 🚀 Phase 2.2C: 統一 Redux Selector 中心
 * 集中管理和優化所有 Redux selectors，提供高性能的數據選擇器
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';

// =============================================================================
// 基礎選擇器
// =============================================================================

export const selectProjects = (state: RootState) => state.projects.projects;
export const selectCurrentProject = (state: RootState) => state.projects.currentProject;
export const selectProjectsLoading = (state: RootState) => state.projects.loading;
export const selectProjectsError = (state: RootState) => state.projects.error;

export const selectChapters = (state: RootState) => state.chapters.chapters;
export const selectCurrentChapter = (state: RootState) => state.chapters.currentChapter;
export const selectChaptersLoading = (state: RootState) => state.chapters.loading;
export const selectChaptersSaving = (state: RootState) => state.chapters.saving;

export const selectCharacters = (state: RootState) => state.characters.characters;
export const selectCurrentCharacter = (state: RootState) => state.characters.currentCharacter;
export const selectCharactersLoading = (state: RootState) => state.characters.loading;

export const selectAIProviders = (state: RootState) => state.ai.providers;
export const selectCurrentProviderId = (state: RootState) => state.ai.currentProviderId;
export const selectAIGenerating = (state: RootState) => state.ai.generating;
export const selectGenerationHistory = (state: RootState) => state.ai.generationHistory;

// =============================================================================
// 組合選擇器 (Cross-slice selectors)
// =============================================================================

/**
 * 獲取專案的完整統計資訊（包含章節和角色數據）
 */
export const selectProjectWithStats = createSelector(
  [selectProjects, selectChapters, selectCharacters],
  (projects, chapters, characters) => {
    return projects.map(project => {
      const projectChapters = chapters.filter(chapter => chapter.projectId === project.id);
      const projectCharacters = characters.filter(character => character.projectId === project.id);
      const totalWordCount = projectChapters.reduce((total, chapter) => 
        total + (chapter.wordCount || 0), 0
      );

      return {
        ...project,
        stats: {
          chapterCount: projectChapters.length,
          characterCount: projectCharacters.length,
          totalWordCount,
          averageWordsPerChapter: projectChapters.length > 0 
            ? Math.round(totalWordCount / projectChapters.length)
            : 0,
          hasContent: totalWordCount > 0,
          lastChapterDate: projectChapters.length > 0
            ? Math.max(...projectChapters.map(c => new Date(c.updatedAt).getTime()))
            : new Date(project.updatedAt).getTime()
        }
      };
    });
  }
);

/**
 * 當前專案的詳細資訊（包含章節和角色）
 */
export const selectCurrentProjectDetails = createSelector(
  [selectCurrentProject, selectChapters, selectCharacters],
  (currentProject, chapters, characters) => {
    if (!currentProject) return null;

    const projectChapters = chapters
      .filter(chapter => chapter.projectId === currentProject.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const projectCharacters = characters.filter(character => 
      character.projectId === currentProject.id
    );

    const totalWordCount = projectChapters.reduce((total, chapter) => 
      total + (chapter.wordCount || 0), 0
    );

    return {
      ...currentProject,
      chapters: projectChapters,
      characters: projectCharacters,
      stats: {
        chapterCount: projectChapters.length,
        characterCount: projectCharacters.length,
        totalWordCount,
        averageWordsPerChapter: projectChapters.length > 0 
          ? Math.round(totalWordCount / projectChapters.length)
          : 0,
        completionPercentage: currentProject.novelLength === 'short' ? 
          Math.min(100, (projectChapters.length / 5) * 100) :
          currentProject.novelLength === 'medium' ?
          Math.min(100, (projectChapters.length / 20) * 100) :
          Math.min(100, (projectChapters.length / 50) * 100)
      }
    };
  }
);

/**
 * 儀表板統計數據
 */
export const selectDashboardStats = createSelector(
  [selectProjects, selectChapters, selectCharacters, selectGenerationHistory],
  (projects, chapters, characters, generationHistory) => {
    const totalWordCount = chapters.reduce((total, chapter) => 
      total + (chapter.wordCount || 0), 0
    );

    const recentActivity = {
      recentProjects: projects.filter(p => {
        const updatedAt = new Date(p.updatedAt).getTime();
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return updatedAt > weekAgo;
      }).length,
      recentGenerations: generationHistory.filter(g => {
        const timestamp = g.timestamp.getTime();
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return timestamp > weekAgo;
      }).length
    };

    return {
      totalProjects: projects.length,
      totalChapters: chapters.length,
      totalCharacters: characters.length,
      totalWordCount,
      totalGenerations: generationHistory.length,
      recentActivity,
      averageWordsPerProject: projects.length > 0 
        ? Math.round(totalWordCount / projects.length)
        : 0,
      averageChaptersPerProject: projects.length > 0
        ? Math.round(chapters.length / projects.length * 100) / 100
        : 0
    };
  }
);

/**
 * AI 系統綜合狀態
 */
export const selectAISystemStatus = createSelector(
  [
    (state: RootState) => state.ai.providers,
    (state: RootState) => state.ai.currentProviderId,
    (state: RootState) => state.ai.availableModels,
    (state: RootState) => state.ai.currentModel,
    (state: RootState) => state.ai.generating,
    (state: RootState) => state.ai.error,
    (state: RootState) => state.ai.isOllamaConnected
  ],
  (providers, currentProviderId, availableModels, currentModel, generating, error, ollamaConnected) => {
    const enabledProviders = providers.filter(p => p.is_enabled);
    const currentProvider = providers.find(p => p.id === currentProviderId);
    
    return {
      // 整體狀態
      hasProviders: providers.length > 0,
      hasEnabledProviders: enabledProviders.length > 0,
      isConnected: ollamaConnected || (currentProvider?.is_enabled && availableModels.length > 0),
      isReady: !generating && !error && availableModels.length > 0,
      isGenerating: generating,
      hasError: !!error,
      
      // 詳細資訊
      totalProviders: providers.length,
      enabledProviders: enabledProviders.length,
      currentProvider,
      availableModels: availableModels.length,
      currentModel,
      error,
      
      // 狀態文字
      statusText: error ? '錯誤' :
                 generating ? '生成中' :
                 !currentProvider ? '未選擇提供者' :
                 availableModels.length === 0 ? '無可用模型' :
                 '就緒',
      
      // 狀態等級
      statusLevel: error ? 'error' :
                  generating ? 'generating' :
                  !currentProvider || availableModels.length === 0 ? 'warning' :
                  'success'
    };
  }
);

/**
 * 寫作進度追蹤
 */
export const selectWritingProgress = createSelector(
  [selectCurrentProjectDetails],
  (projectDetails) => {
    if (!projectDetails) return null;

    const { chapters, stats } = projectDetails;
    const targetChapters = projectDetails.novelLength === 'short' ? 5 :
                          projectDetails.novelLength === 'medium' ? 20 : 50;
    
    const targetWords = targetChapters * 2000; // 平均每章 2000 字
    
    const progressData = chapters.map((chapter, index) => ({
      chapterNumber: index + 1,
      wordCount: chapter.wordCount || 0,
      cumulativeWords: chapters.slice(0, index + 1)
        .reduce((total, ch) => total + (ch.wordCount || 0), 0),
      date: new Date(chapter.updatedAt),
      title: chapter.title
    }));

    return {
      current: {
        chapters: stats.chapterCount,
        words: stats.totalWordCount
      },
      targets: {
        chapters: targetChapters,
        words: targetWords
      },
      progress: {
        chapters: Math.min(100, (stats.chapterCount / targetChapters) * 100),
        words: Math.min(100, (stats.totalWordCount / targetWords) * 100),
        overall: Math.min(100, ((stats.chapterCount / targetChapters) * 0.6 + 
                                (stats.totalWordCount / targetWords) * 0.4) * 100)
      },
      progressData,
      isCompleted: stats.chapterCount >= targetChapters && stats.totalWordCount >= targetWords,
      estimatedDaysToComplete: stats.averageWordsPerChapter > 0 ? 
        Math.ceil((targetWords - stats.totalWordCount) / stats.averageWordsPerChapter) : null
    };
  }
);

// =============================================================================
// 性能優化的複合選擇器
// =============================================================================

/**
 * 搜索和過濾功能的統一選擇器
 */
export const createFilteredSelector = <T>(
  baseSelector: (state: RootState) => T[],
  filterFn: (items: T[], filters: any) => T[]
) => {
  return createSelector(
    [baseSelector, (_: RootState, filters: any) => filters],
    filterFn
  );
};

/**
 * 分頁功能的統一選擇器
 */
export const createPaginatedSelector = <T>(
  baseSelector: (state: RootState) => T[]
) => {
  return createSelector(
    [
      baseSelector,
      (_: RootState, page: number) => page,
      (_: RootState, page: number, pageSize: number) => pageSize
    ],
    (items, page, pageSize) => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      return {
        items: items.slice(startIndex, endIndex),
        totalItems: items.length,
        totalPages: Math.ceil(items.length / pageSize),
        currentPage: page,
        hasNextPage: endIndex < items.length,
        hasPrevPage: page > 1
      };
    }
  );
};

/**
 * 緩存優化的選擇器工廠
 */
export const createCachedSelector = <T, Args extends any[], Result>(
  selectors: ((state: RootState, ...args: Args) => T)[],
  resultFunc: (...args: T[]) => Result
) => {
  return createSelector(selectors, resultFunc);
};