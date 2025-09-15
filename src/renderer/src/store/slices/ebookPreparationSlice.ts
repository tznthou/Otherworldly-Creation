import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  EbookPreparationState,
  EbookPreparationConfig,
  EbookPreparationResult,
  EbookImagePosition,
  DEFAULT_EBOOK_PREPARATION_CONFIG
} from '../../types/ebookPreparation';

/**
 * 電子書排版預備 Redux Slice
 * 完全獨立於現有的 EPUB/PDF 相關 slice，不會影響現有功能
 */

const initialState: EbookPreparationState = {
  currentConfig: null,
  isProcessing: false,
  processingProgress: 0,
  processingStatus: '',
  lastResult: null,
  activeTab: 'organize',
  selectedImages: [],
  previewMode: false,
  previewDevice: 'tablet',
  error: null,
  warnings: []
};

const ebookPreparationSlice = createSlice({
  name: 'ebookPreparation',
  initialState,
  reducers: {
    // 配置管理
    initializeConfig: (state, action: PayloadAction<{
      projectId: string;
      bookTitle: string;
      bookAuthor: string;
    }>) => {
      const { projectId, bookTitle, bookAuthor } = action.payload;
      state.currentConfig = {
        projectId,
        bookTitle,
        bookAuthor,
        imageCategories: [],
        chapterConfigurations: [],
        ...DEFAULT_EBOOK_PREPARATION_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as EbookPreparationConfig;
    },

    updateConfig: (state, action: PayloadAction<Partial<EbookPreparationConfig>>) => {
      if (state.currentConfig) {
        state.currentConfig = {
          ...state.currentConfig,
          ...action.payload,
          updatedAt: new Date().toISOString()
        };
      }
    },

    resetConfig: (state) => {
      state.currentConfig = null;
      state.lastResult = null;
      state.error = null;
      state.warnings = [];
    },

    // 圖片選擇管理
    setSelectedImages: (state, action: PayloadAction<string[]>) => {
      state.selectedImages = action.payload;
    },

    toggleImageSelection: (state, action: PayloadAction<string>) => {
      const imageId = action.payload;
      const index = state.selectedImages.indexOf(imageId);
      if (index >= 0) {
        state.selectedImages.splice(index, 1);
      } else {
        state.selectedImages.push(imageId);
      }
    },

    clearImageSelection: (state) => {
      state.selectedImages = [];
    },

    // 處理狀態管理
    startProcessing: (state, action: PayloadAction<string>) => {
      state.isProcessing = true;
      state.processingProgress = 0;
      state.processingStatus = action.payload;
      state.error = null;
      state.warnings = [];
    },

    updateProcessingProgress: (state, action: PayloadAction<{
      progress: number;
      status: string;
    }>) => {
      state.processingProgress = action.payload.progress;
      state.processingStatus = action.payload.status;
    },

    finishProcessing: (state, action: PayloadAction<EbookPreparationResult>) => {
      state.isProcessing = false;
      state.processingProgress = 100;
      state.processingStatus = '處理完成';
      state.lastResult = action.payload;
    },

    failProcessing: (state, action: PayloadAction<string>) => {
      state.isProcessing = false;
      state.processingProgress = 0;
      state.processingStatus = '處理失敗';
      state.error = action.payload;
    },

    // UI 狀態管理
    setActiveTab: (state, action: PayloadAction<'organize' | 'configure' | 'preview'>) => {
      state.activeTab = action.payload;
    },

    // 預覽模式管理
    togglePreviewMode: (state) => {
      state.previewMode = !state.previewMode;
    },

    setPreviewDevice: (state, action: PayloadAction<'tablet' | 'phone' | 'desktop' | 'kindle'>) => {
      state.previewDevice = action.payload;
    },

    // 圖片分類管理
    addImageToCategory: (state, action: PayloadAction<{
      imageId: string;
      position: EbookImagePosition;
      chapterId?: string;
      order?: number;
    }>) => {
      if (!state.currentConfig) return;

      const { imageId, position, chapterId, order = 0 } = action.payload;

      // 如果是章節相關的圖片
      if (chapterId) {
        let chapterConfig = state.currentConfig.chapterConfigurations.find(c => c.chapterId === chapterId);
        if (!chapterConfig) {
          chapterConfig = {
            chapterId,
            chapterTitle: `章節 ${chapterId}`,
            chapterNumber: parseInt(chapterId.replace(/\D/g, '')) || 1,
            images: []
          };
          state.currentConfig.chapterConfigurations.push(chapterConfig);
        }

        // 移除該圖片在其他位置的配置
        chapterConfig.images = chapterConfig.images.filter(img => img.imageId !== imageId);

        // 添加到新位置
        chapterConfig.images.push({
          position,
          imageId,
          order
        });

        // 按順序排序
        chapterConfig.images.sort((a, b) => a.order - b.order);
      }

      state.currentConfig.updatedAt = new Date().toISOString();
    },

    removeImageFromCategory: (state, action: PayloadAction<{
      imageId: string;
      chapterId?: string;
    }>) => {
      if (!state.currentConfig) return;

      const { imageId, chapterId } = action.payload;

      if (chapterId) {
        const chapterConfig = state.currentConfig.chapterConfigurations.find(c => c.chapterId === chapterId);
        if (chapterConfig) {
          chapterConfig.images = chapterConfig.images.filter(img => img.imageId !== imageId);
        }
      }

      state.currentConfig.updatedAt = new Date().toISOString();
    },

    // 章節配置管理
    addChapterConfiguration: (state, action: PayloadAction<{
      chapterId: string;
      chapterTitle: string;
      chapterNumber: number;
    }>) => {
      if (!state.currentConfig) return;

      const { chapterId, chapterTitle, chapterNumber } = action.payload;

      // 檢查是否已存在
      const existingIndex = state.currentConfig.chapterConfigurations.findIndex(c => c.chapterId === chapterId);
      if (existingIndex >= 0) {
        // 更新現有配置
        state.currentConfig.chapterConfigurations[existingIndex] = {
          ...state.currentConfig.chapterConfigurations[existingIndex],
          chapterTitle,
          chapterNumber
        };
      } else {
        // 添加新配置
        state.currentConfig.chapterConfigurations.push({
          chapterId,
          chapterTitle,
          chapterNumber,
          images: []
        });
      }

      state.currentConfig.updatedAt = new Date().toISOString();
    },

    removeChapterConfiguration: (state, action: PayloadAction<string>) => {
      if (!state.currentConfig) return;

      const chapterId = action.payload;
      state.currentConfig.chapterConfigurations = state.currentConfig.chapterConfigurations.filter(
        c => c.chapterId !== chapterId
      );

      state.currentConfig.updatedAt = new Date().toISOString();
    },

    // 錯誤和警告管理
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    addWarning: (state, action: PayloadAction<string>) => {
      if (!state.warnings.includes(action.payload)) {
        state.warnings.push(action.payload);
      }
    },

    removeWarning: (state, action: PayloadAction<string>) => {
      state.warnings = state.warnings.filter(w => w !== action.payload);
    },

    clearWarnings: (state) => {
      state.warnings = [];
    },

    // 重置狀態
    resetState: (state) => {
      Object.assign(state, initialState);
    }
  }
});

export const {
  // 配置管理
  initializeConfig,
  updateConfig,
  resetConfig,

  // 圖片選擇管理
  setSelectedImages,
  toggleImageSelection,
  clearImageSelection,

  // 處理狀態管理
  startProcessing,
  updateProcessingProgress,
  finishProcessing,
  failProcessing,

  // UI 狀態管理
  setActiveTab,

  // 預覽模式管理
  togglePreviewMode,
  setPreviewDevice,

  // 圖片分類管理
  addImageToCategory,
  removeImageFromCategory,

  // 章節配置管理
  addChapterConfiguration,
  removeChapterConfiguration,

  // 錯誤和警告管理
  setError,
  clearError,
  addWarning,
  removeWarning,
  clearWarnings,

  // 重置狀態
  resetState
} = ebookPreparationSlice.actions;

export default ebookPreparationSlice.reducer;