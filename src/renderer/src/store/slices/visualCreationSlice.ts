import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../api';
import { createVersion } from './versionManagementSlice';
import { tempImageToVersion, generateNextVersionNumber } from '../../utils/versionUtils';
import type { AppDispatch, RootState } from '../store';

// 類型定義
export interface TempImageData {
  id: string;
  prompt: string;
  temp_path: string;
  image_url?: string;
  parameters: {
    model: string;
    width: number;
    height: number;
    seed?: number;
    enhance: boolean;
    style?: string;
  };
  file_size_bytes: number;
  generation_time_ms: number;
  provider: string;
  is_free: boolean;
  is_temp: boolean;
  project_id?: string;
  character_id?: string;
  original_prompt: string;
}

export interface GenerationTask {
  id: string;
  prompt: string;
  provider: 'pollinations' | 'imagen';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  selectedCharacterIds: string[];
  sceneType: 'portrait' | 'scene' | 'interaction';
  error?: string;
  result?: TempImageData;
}

export interface GenerationHistory {
  id: string;
  projectId: string;
  provider: 'pollinations' | 'imagen';
  totalImages: number;
  successfulImages: number;
  timestamp: string;
  images: TempImageData[];
}

// 導出格式選項
export type ExportFormat = 'png' | 'jpg' | 'webp';

// 導出設定介面
export interface ExportSettings {
  format: ExportFormat;
  quality: number; // 1-100，僅適用於 JPG/WebP
  prefix: string; // 檔名前綴
  includeMetadata: boolean; // 是否包含生成參數
}

// 導出任務介面
export interface ExportTask {
  id: string;
  imageIds: string[];
  settings: ExportSettings;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  exportedFiles: string[];
  error?: string;
}

// 狀態介面
export interface VisualCreationState {
  // UI 狀態
  activeTab: 'create' | 'monitor' | 'gallery' | 'templates' | 'versions';
  currentProvider: 'pollinations' | 'imagen';
  
  // 創建狀態
  selectedCharacters: string[];
  sceneType: 'portrait' | 'scene' | 'interaction';
  
  // 生成狀態
  isGenerating: boolean;
  generationProgress: number;
  currentGenerationId: string | null;
  generationQueue: GenerationTask[];
  
  // 預覽狀態
  tempImages: TempImageData[];
  showImagePreview: boolean;
  selectedImageIds: string[];
  currentImageIndex: number;
  showImageDetails: boolean;
  
  // 導出狀態
  exportSettings: ExportSettings;
  isExporting: boolean;
  exportProgress: number;
  exportTask: ExportTask | null;
  showExportPanel: boolean;
  
  // 歷史記錄
  generationHistory: GenerationHistory[];
  
  // 版本管理整合
  versionManagement: {
    currentImageId: string | null; // 當前查看版本的圖片ID
    showVersionPanel: boolean; // 顯示版本管理面板
    selectedImageForVersioning: TempImageData | null; // 選中要進行版本管理的圖片
    autoCreateVersions: boolean; // 自動為生成的圖片創建版本
    pendingVersionCreation: string[]; // 待創建版本的圖片ID列表
    lastGeneratedImageId: string | null; // 最後生成的圖片ID
  };
  
  // 錯誤處理
  error: string | null;
  
  // 載入狀態
  loading: {
    initializing: boolean;
    generating: boolean;
    loadingHistory: boolean;
    savingImages: boolean;
    exporting: boolean;
  };
}

// 初始狀態
const initialState: VisualCreationState = {
  // UI 狀態
  activeTab: 'create',
  currentProvider: 'pollinations',
  
  // 創建狀態
  selectedCharacters: [],
  sceneType: 'portrait',
  
  // 生成狀態
  isGenerating: false,
  generationProgress: 0,
  currentGenerationId: null,
  generationQueue: [],
  
  // 預覽狀態
  tempImages: [],
  showImagePreview: false,
  selectedImageIds: [],
  currentImageIndex: 0,
  showImageDetails: false,
  
  // 導出狀態
  exportSettings: {
    format: 'png',
    quality: 90,
    prefix: 'illustration',
    includeMetadata: true,
  },
  isExporting: false,
  exportProgress: 0,
  exportTask: null,
  showExportPanel: false,
  
  // 歷史記錄
  generationHistory: [],
  
  // 版本管理整合
  versionManagement: {
    currentImageId: null,
    showVersionPanel: false,
    selectedImageForVersioning: null,
    autoCreateVersions: true,
    pendingVersionCreation: [],
    lastGeneratedImageId: null,
  },
  
  // 錯誤處理
  error: null,
  
  // 載入狀態
  loading: {
    initializing: false,
    generating: false,
    loadingHistory: false,
    savingImages: false,
    exporting: false,
  },
};

// Async Thunks
export const initializeVisualCreation = createAsyncThunk(
  'visualCreation/initialize',
  async (_projectId: string) => {
    try {
      // 初始化批次管理器
      const batchResult = await api.illustration.initializeBatchManager();
      
      // 清理過期的臨時圖像
      try {
        await api.illustration.cleanupExpiredTempImages();
      } catch (error) {
        console.warn('清理臨時圖像失敗:', error);
      }
      
      // 載入插畫歷史 (如果需要的話)
      // const historyResult = await api.illustration.getIllustrationHistory(projectId);
      
      return {
        success: batchResult.success,
        message: batchResult.message,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '初始化失敗');
    }
  }
);

export const generateIllustration = createAsyncThunk(
  'visualCreation/generate',
  async (params: {
    prompt: string;
    width?: number;
    height?: number;
    model?: 'flux' | 'gptimage' | 'kontext' | 'sdxl';
    seed?: number;
    enhance?: boolean;
    style?: 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art';
    projectId?: string;
    characterId?: string;
    provider: 'pollinations' | 'imagen';
  }) => {
    if (params.provider === 'pollinations') {
      return await api.illustration.generateFreeIllustration(
        params.prompt,
        params.width,
        params.height,
        params.model,
        params.seed,
        params.enhance,
        params.style,
        params.projectId,
        params.characterId
      );
    } else {
      // Imagen 實現
      throw new Error('Imagen provider not implemented yet');
    }
  }
);

export const saveSelectedImages = createAsyncThunk(
  'visualCreation/saveImages',
  async (selectedImageIds: string[], { getState }) => {
    const state = getState() as { visualCreation: VisualCreationState };
    const selectedImages = state.visualCreation.tempImages.filter(
      img => selectedImageIds.includes(img.id)
    );
    
    const savedImages: TempImageData[] = [];
    
    for (const imageData of selectedImages) {
      try {
        const result = await api.illustration.confirmTempImageSave(imageData);
        if (result.success) {
          savedImages.push(imageData);
        }
      } catch (error) {
        console.error(`保存圖像失敗: ${imageData.id}`, error);
      }
    }
    
    // 清理未選中的臨時圖像
    const unselectedImages = state.visualCreation.tempImages.filter(
      img => !selectedImageIds.includes(img.id)
    );
    
    for (const imageData of unselectedImages) {
      try {
        await api.illustration.deleteTempImage(imageData.temp_path);
      } catch (error) {
        console.error(`清理臨時圖像失敗: ${imageData.id}`, error);
      }
    }
    
    return savedImages;
  }
);

export const exportSelectedImages = createAsyncThunk(
  'visualCreation/exportImages',
  async (
    { selectedImageIds, exportPath }: { selectedImageIds: string[]; exportPath?: string },
    { getState, dispatch }
  ) => {
    const state = getState() as { visualCreation: VisualCreationState };
    const { tempImages, exportSettings } = state.visualCreation;
    
    const selectedImages = tempImages.filter(img => selectedImageIds.includes(img.id));
    
    if (selectedImages.length === 0) {
      throw new Error('沒有選中的圖像可以導出');
    }

    // 創建導出任務
    const exportTask: ExportTask = {
      id: Date.now().toString(),
      imageIds: selectedImageIds,
      settings: exportSettings,
      status: 'processing',
      progress: 0,
      exportedFiles: [],
    };

    dispatch(setExportTask(exportTask));

    const exportedFiles: string[] = [];
    let processedCount = 0;

    try {
      // 如果沒有指定導出路徑，使用系統對話框選擇
      const finalExportPath = exportPath || await api.system.selectDirectory();
      
      if (!finalExportPath) {
        throw new Error('未選擇導出路徑');
      }

      for (const [index, imageData] of selectedImages.entries()) {
        try {
          // 生成檔名
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
          const fileName = `${exportSettings.prefix}-${timestamp}-${index + 1}.${exportSettings.format}`;
          
          // 調用後端導出 API（需要在 Tauri 後端實現）
          const result = await api.illustration.exportImage({
            imagePath: imageData.temp_path,
            outputPath: `${finalExportPath}/${fileName}`,
            format: exportSettings.format,
            quality: exportSettings.quality,
            includeMetadata: exportSettings.includeMetadata,
            metadata: exportSettings.includeMetadata ? {
              prompt: imageData.prompt,
              parameters: imageData.parameters,
              provider: imageData.provider,
              generationTime: imageData.generation_time_ms,
            } : undefined,
          });

          if (result.success) {
            exportedFiles.push(result.outputPath || fileName);
          }
        } catch (error) {
          console.error(`導出圖像失敗: ${imageData.id}`, error);
        }

        processedCount++;
        const progress = Math.round((processedCount / selectedImages.length) * 100);
        
        // 更新進度
        dispatch(setExportProgress(progress));
      }

      const updatedTask: ExportTask = {
        ...exportTask,
        status: 'completed',
        progress: 100,
        exportedFiles,
      };

      dispatch(setExportTask(updatedTask));
      
      return {
        success: true,
        exportedCount: exportedFiles.length,
        totalCount: selectedImages.length,
        exportPath: finalExportPath,
        exportedFiles,
      };
    } catch (error) {
      const failedTask: ExportTask = {
        ...exportTask,
        status: 'failed',
        error: error instanceof Error ? error.message : '導出失敗',
      };

      dispatch(setExportTask(failedTask));
      throw error;
    }
  }
);

// Slice
export const visualCreationSlice = createSlice({
  name: 'visualCreation',
  initialState,
  reducers: {
    // UI 狀態管理
    setActiveTab: (state, action: PayloadAction<VisualCreationState['activeTab']>) => {
      state.activeTab = action.payload;
    },
    
    setCurrentProvider: (state, action: PayloadAction<VisualCreationState['currentProvider']>) => {
      state.currentProvider = action.payload;
    },
    
    // 創建狀態管理
    setSelectedCharacters: (state, action: PayloadAction<string[]>) => {
      state.selectedCharacters = action.payload;
    },
    
    toggleCharacterSelection: (state, action: PayloadAction<string>) => {
      const characterId = action.payload;
      const index = state.selectedCharacters.indexOf(characterId);
      if (index === -1) {
        state.selectedCharacters.push(characterId);
      } else {
        state.selectedCharacters.splice(index, 1);
      }
    },
    
    setSceneType: (state, action: PayloadAction<VisualCreationState['sceneType']>) => {
      state.sceneType = action.payload;
    },
    
    // 預覽狀態管理
    setTempImages: (state, action: PayloadAction<TempImageData[]>) => {
      state.tempImages = action.payload;
    },
    
    clearTempImages: (state) => {
      state.tempImages = [];
    },
    
    setShowImagePreview: (state, action: PayloadAction<boolean>) => {
      state.showImagePreview = action.payload;
    },
    
    setSelectedImageIds: (state, action: PayloadAction<string[]>) => {
      state.selectedImageIds = action.payload;
    },
    
    toggleImageSelection: (state, action: PayloadAction<string>) => {
      const imageId = action.payload;
      const index = state.selectedImageIds.indexOf(imageId);
      if (index === -1) {
        state.selectedImageIds.push(imageId);
      } else {
        state.selectedImageIds.splice(index, 1);
      }
    },
    
    selectAllImages: (state) => {
      state.selectedImageIds = state.tempImages.map(img => img.id);
    },
    
    deselectAllImages: (state) => {
      state.selectedImageIds = [];
    },
    
    setCurrentImageIndex: (state, action: PayloadAction<number>) => {
      state.currentImageIndex = action.payload;
    },
    
    setShowImageDetails: (state, action: PayloadAction<boolean>) => {
      state.showImageDetails = action.payload;
    },
    
    closeImagePreview: (state) => {
      state.showImagePreview = false;
      state.currentImageIndex = 0;
      state.showImageDetails = false;
    },
    
    // 導出狀態管理
    setExportSettings: (state, action: PayloadAction<Partial<ExportSettings>>) => {
      state.exportSettings = { ...state.exportSettings, ...action.payload };
    },
    
    setShowExportPanel: (state, action: PayloadAction<boolean>) => {
      state.showExportPanel = action.payload;
    },
    
    setExportProgress: (state, action: PayloadAction<number>) => {
      state.exportProgress = action.payload;
    },
    
    setExportTask: (state, action: PayloadAction<ExportTask | null>) => {
      state.exportTask = action.payload;
      if (action.payload) {
        state.isExporting = action.payload.status === 'processing';
        state.exportProgress = action.payload.progress;
      } else {
        state.isExporting = false;
        state.exportProgress = 0;
      }
    },
    
    clearExportTask: (state) => {
      state.exportTask = null;
      state.isExporting = false;
      state.exportProgress = 0;
      state.showExportPanel = false;
    },
    
    // 版本管理整合
    setVersionCurrentImageId: (state, action: PayloadAction<string | null>) => {
      state.versionManagement.currentImageId = action.payload;
    },
    
    setShowVersionPanel: (state, action: PayloadAction<boolean>) => {
      state.versionManagement.showVersionPanel = action.payload;
    },
    
    setSelectedImageForVersioning: (state, action: PayloadAction<TempImageData | null>) => {
      state.versionManagement.selectedImageForVersioning = action.payload;
    },
    
    setAutoCreateVersions: (state, action: PayloadAction<boolean>) => {
      state.versionManagement.autoCreateVersions = action.payload;
    },
    
    // 版本創建狀態管理
    addPendingVersionCreation: (state, action: PayloadAction<string>) => {
      if (!state.versionManagement.pendingVersionCreation.includes(action.payload)) {
        state.versionManagement.pendingVersionCreation.push(action.payload);
      }
    },
    
    removePendingVersionCreation: (state, action: PayloadAction<string>) => {
      state.versionManagement.pendingVersionCreation = state.versionManagement.pendingVersionCreation
        .filter(id => id !== action.payload);
    },
    
    clearPendingVersionCreation: (state) => {
      state.versionManagement.pendingVersionCreation = [];
    },
    
    setLastGeneratedImageId: (state, action: PayloadAction<string | null>) => {
      state.versionManagement.lastGeneratedImageId = action.payload;
    },
    
    openVersionPanel: (state, action: PayloadAction<TempImageData>) => {
      state.versionManagement.selectedImageForVersioning = action.payload;
      state.versionManagement.currentImageId = action.payload.id;
      state.versionManagement.showVersionPanel = true;
      state.activeTab = 'versions';
    },
    
    closeVersionPanel: (state) => {
      state.versionManagement.showVersionPanel = false;
      state.versionManagement.selectedImageForVersioning = null;
      state.versionManagement.currentImageId = null;
    },
    
    // 錯誤處理
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // 載入狀態
    setLoading: (state, action: PayloadAction<{ key: keyof VisualCreationState['loading']; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    
    // 重置狀態
    resetVisualCreation: () => initialState,
  },
  
  extraReducers: (builder) => {
    // 初始化
    builder
      .addCase(initializeVisualCreation.pending, (state) => {
        state.loading.initializing = true;
        state.error = null;
      })
      .addCase(initializeVisualCreation.fulfilled, (state) => {
        state.loading.initializing = false;
        state.error = null;
      })
      .addCase(initializeVisualCreation.rejected, (state, action) => {
        state.loading.initializing = false;
        state.error = action.error.message || '初始化失敗';
      });
    
    // 生成插畫
    builder
      .addCase(generateIllustration.pending, (state) => {
        state.isGenerating = true;
        state.loading.generating = true;
        state.error = null;
        state.generationProgress = 0;
      })
      .addCase(generateIllustration.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.loading.generating = false;
        state.generationProgress = 100;
        
        if (action.payload.success && action.payload.image_path) {
          // 添加新生成的圖像到臨時列表
          const newImage: TempImageData = {
            id: action.payload.id || Date.now().toString(),
            prompt: action.payload.prompt || '',
            temp_path: action.payload.image_path,
            image_url: action.payload.image_url,
            parameters: {
              model: action.payload.parameters?.model || 'flux',
              width: action.payload.parameters?.width || 1024,
              height: action.payload.parameters?.height || 1024,
              seed: action.payload.parameters?.seed,
              enhance: action.payload.parameters?.enhance || false,
              style: action.payload.parameters?.style || undefined,
            },
            file_size_bytes: 0,
            generation_time_ms: action.payload.generation_time_ms || 0,
            provider: state.currentProvider,
            is_free: state.currentProvider === 'pollinations',
            is_temp: true,
            project_id: undefined,
            character_id: undefined,
            original_prompt: action.payload.prompt || '',
          };
          
          state.tempImages.push(newImage);
          // 自動選中新生成的圖像
          state.selectedImageIds.push(newImage.id);
          state.showImagePreview = true;
          
          // 版本管理整合：標記新圖像需要創建版本
          if (state.versionManagement.autoCreateVersions) {
            state.versionManagement.pendingVersionCreation.push(newImage.id);
            state.versionManagement.lastGeneratedImageId = newImage.id;
          }
        }
      })
      .addCase(generateIllustration.rejected, (state, action) => {
        state.isGenerating = false;
        state.loading.generating = false;
        state.generationProgress = 0;
        state.error = action.error.message || '生成失敗';
      });
    
    // 保存圖像
    builder
      .addCase(saveSelectedImages.pending, (state) => {
        state.loading.savingImages = true;
        state.error = null;
      })
      .addCase(saveSelectedImages.fulfilled, (state, action) => {
        state.loading.savingImages = false;
        // 清理已保存的臨時圖像
        state.tempImages = [];
        state.selectedImageIds = [];
        state.showImagePreview = false;
        state.currentImageIndex = 0;
        state.showImageDetails = false;
        
        // 可以在這裡添加成功保存的通知
        console.log(`成功保存 ${action.payload.length} 張圖像`);
      })
      .addCase(saveSelectedImages.rejected, (state, action) => {
        state.loading.savingImages = false;
        state.error = action.error.message || '保存圖像失敗';
      });
    
    // 導出圖像
    builder
      .addCase(exportSelectedImages.pending, (state) => {
        state.loading.exporting = true;
        state.isExporting = true;
        state.error = null;
        state.exportProgress = 0;
      })
      .addCase(exportSelectedImages.fulfilled, (state, action) => {
        state.loading.exporting = false;
        state.isExporting = false;
        state.exportProgress = 100;
        
        // 顯示成功訊息
        console.log(`成功導出 ${action.payload.exportedCount}/${action.payload.totalCount} 張圖像到 ${action.payload.exportPath}`);
      })
      .addCase(exportSelectedImages.rejected, (state, action) => {
        state.loading.exporting = false;
        state.isExporting = false;
        state.exportProgress = 0;
        state.error = action.error.message || '導出圖像失敗';
      });
  },
});

// 導出 actions
export const {
  setActiveTab,
  setCurrentProvider,
  setSelectedCharacters,
  toggleCharacterSelection,
  setSceneType,
  setTempImages,
  clearTempImages,
  setShowImagePreview,
  setSelectedImageIds,
  toggleImageSelection,
  selectAllImages,
  deselectAllImages,
  setCurrentImageIndex,
  setShowImageDetails,
  closeImagePreview,
  setExportSettings,
  setShowExportPanel,
  setExportProgress,
  setExportTask,
  clearExportTask,
  setVersionCurrentImageId,
  setShowVersionPanel,
  setSelectedImageForVersioning,
  setAutoCreateVersions,
  addPendingVersionCreation,
  removePendingVersionCreation,
  clearPendingVersionCreation,
  setLastGeneratedImageId,
  openVersionPanel,
  closeVersionPanel,
  setError,
  clearError,
  setLoading,
  resetVisualCreation,
} = visualCreationSlice.actions;

// 導出 reducer
export default visualCreationSlice.reducer;