import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  ImageVersion,
  VersionTree,
  VersionComparison,
  VersionHistory,
  VersionBranch,
  VersionFilter,
  VersionOperationResult,
  VersionStatistics,
  VersionStatus,
  VersionType,
  VersionExportOptions,
  VersionImportOptions,
} from '../../types/versionManagement';

// 版本管理狀態介面
export interface VersionManagementState {
  // 版本資料
  versions: ImageVersion[];
  currentVersionId: string | null;
  selectedVersionIds: string[];
  
  // 版本樹和分支
  versionTrees: Record<string, VersionTree>; // key: rootVersionId
  branches: VersionBranch[];
  currentBranchId: string | null;
  
  // 比較功能
  comparisons: VersionComparison[];
  currentComparisonId: string | null;
  isComparing: boolean;
  comparisonVersionIds: [string, string] | null;
  
  // 歷史記錄
  histories: Record<string, VersionHistory>; // key: imageId
  currentHistoryId: string | null;
  
  // 篩選和搜尋
  filter: VersionFilter | null;
  searchKeyword: string;
  filteredVersionIds: string[];
  
  // 統計資訊
  statistics: VersionStatistics | null;
  
  // UI 狀態
  activeView: 'timeline' | 'tree' | 'comparison' | 'gallery';
  showVersionDetails: boolean;
  showComparisonPanel: boolean;
  showExportPanel: boolean;
  showImportPanel: boolean;
  expandedVersionIds: string[]; // 展開的版本樹節點
  
  // 操作狀態
  loading: {
    loadingVersions: boolean;
    loadingTree: boolean;
    loadingComparison: boolean;
    loadingHistory: boolean;
    loadingStatistics: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    exporting: boolean;
    importing: boolean;
  };
  
  // 進度追蹤
  operationProgress: number;
  
  // 錯誤處理
  error: string | null;
  
  // 設定
  settings: {
    maxVersionsToKeep: number;
    autoCreateVersions: boolean;
    showPreviewInTimeline: boolean;
    defaultBranchName: string;
    compressionQuality: number;
  };
}

// 初始狀態
const initialState: VersionManagementState = {
  // 版本資料
  versions: [],
  currentVersionId: null,
  selectedVersionIds: [],
  
  // 版本樹和分支
  versionTrees: {},
  branches: [],
  currentBranchId: null,
  
  // 比較功能
  comparisons: [],
  currentComparisonId: null,
  isComparing: false,
  comparisonVersionIds: null,
  
  // 歷史記錄
  histories: {},
  currentHistoryId: null,
  
  // 篩選和搜尋
  filter: null,
  searchKeyword: '',
  filteredVersionIds: [],
  
  // 統計資訊
  statistics: null,
  
  // UI 狀態
  activeView: 'timeline',
  showVersionDetails: false,
  showComparisonPanel: false,
  showExportPanel: false,
  showImportPanel: false,
  expandedVersionIds: [],
  
  // 操作狀態
  loading: {
    loadingVersions: false,
    loadingTree: false,
    loadingComparison: false,
    loadingHistory: false,
    loadingStatistics: false,
    creating: false,
    updating: false,
    deleting: false,
    exporting: false,
    importing: false,
  },
  
  // 進度追蹤
  operationProgress: 0,
  
  // 錯誤處理
  error: null,
  
  // 設定
  settings: {
    maxVersionsToKeep: 50,
    autoCreateVersions: true,
    showPreviewInTimeline: true,
    defaultBranchName: 'main',
    compressionQuality: 0.8,
  },
};

// 異步 Actions
// 載入版本列表
export const loadVersions = createAsyncThunk(
  'versionManagement/loadVersions',
  async (imageId: string) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.getByImageId(imageId);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<ImageVersion[]>((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 1000);
    });
  }
);

// 創建新版本
export const createVersion = createAsyncThunk(
  'versionManagement/createVersion',
  async (versionData: Partial<ImageVersion>) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.create(versionData);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionOperationResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: '版本創建成功',
          versionId: Date.now().toString(),
        });
      }, 1000);
    });
  }
);

// 更新版本
export const updateVersion = createAsyncThunk(
  'versionManagement/updateVersion',
  async ({ versionId, data }: { versionId: string; data: Partial<ImageVersion> }) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.update(versionId, data);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionOperationResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: '版本更新成功',
          versionId,
        });
      }, 500);
    });
  }
);

// 刪除版本
export const deleteVersion = createAsyncThunk(
  'versionManagement/deleteVersion',
  async (versionId: string) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.delete(versionId);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionOperationResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: '版本刪除成功',
          versionId,
        });
      }, 500);
    });
  }
);

// 載入版本樹
export const loadVersionTree = createAsyncThunk(
  'versionManagement/loadVersionTree',
  async (rootVersionId: string) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.getTree(rootVersionId);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionTree>((resolve) => {
      setTimeout(() => {
        // 建立模擬版本樹
        const mockTree: VersionTree = {
          rootVersion: {} as ImageVersion,
          tree: {} as any,
          branches: [],
          totalVersions: 0,
          maxDepth: 0,
        };
        resolve(mockTree);
      }, 1000);
    });
  }
);

// 比較版本
export const compareVersions = createAsyncThunk(
  'versionManagement/compareVersions',
  async ({ version1Id, version2Id }: { version1Id: string; version2Id: string }) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.compare(version1Id, version2Id);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionComparison>((resolve) => {
      setTimeout(() => {
        const mockComparison: VersionComparison = {
          id: Date.now().toString(),
          version1: {} as ImageVersion,
          version2: {} as ImageVersion,
          differences: [],
          similarity: 0.8,
          comparedAt: new Date().toISOString(),
          comparisonType: 'manual',
        };
        resolve(mockComparison);
      }, 1000);
    });
  }
);

// 載入統計資訊
export const loadStatistics = createAsyncThunk(
  'versionManagement/loadStatistics',
  async (imageId?: string) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.getStatistics(imageId);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionStatistics>((resolve) => {
      setTimeout(() => {
        const mockStats: VersionStatistics = {
          totalVersions: 0,
          activeVersions: 0,
          archivedVersions: 0,
          totalBranches: 0,
          activeBranches: 0,
          averageVersionsPerBranch: 0,
          averageGenerationTime: 0,
          totalGenerationTime: 0,
          creationFrequency: {
            daily: [],
            weekly: [],
            monthly: [],
          },
          mostViewedVersions: [],
          mostLikedVersions: [],
          mostExportedVersions: [],
          modelUsage: {},
          providerUsage: {},
          averageFileSize: 0,
          totalStorageUsed: 0,
        };
        resolve(mockStats);
      }, 800);
    });
  }
);

// 導出版本
export const exportVersions = createAsyncThunk(
  'versionManagement/exportVersions',
  async (options: VersionExportOptions) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.export(options);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('/path/to/exported/file.zip');
      }, 2000);
    });
  }
);

// 匯入版本
export const importVersions = createAsyncThunk(
  'versionManagement/importVersions',
  async (options: VersionImportOptions) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.versions.import(options);
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionOperationResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: '版本匯入成功',
        });
      }, 3000);
    });
  }
);

// 創建分支
export const createBranch = createAsyncThunk(
  'versionManagement/createBranch',
  async ({ name, sourceVersionId }: { name: string; sourceVersionId: string }) => {
    // TODO: 實際實現時需要呼叫 API
    // const response = await api.branches.create({ name, sourceVersionId });
    // return response;
    
    // 模擬 API 呼叫
    return new Promise<VersionOperationResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: '分支創建成功',
          versionId: Date.now().toString(),
        });
      }, 1000);
    });
  }
);

// Redux Slice
export const versionManagementSlice = createSlice({
  name: 'versionManagement',
  initialState,
  reducers: {
    // UI 狀態管理
    setActiveView: (state, action: PayloadAction<VersionManagementState['activeView']>) => {
      state.activeView = action.payload;
    },
    
    setCurrentVersion: (state, action: PayloadAction<string | null>) => {
      state.currentVersionId = action.payload;
    },
    
    setSelectedVersionIds: (state, action: PayloadAction<string[]>) => {
      state.selectedVersionIds = action.payload;
    },
    
    toggleVersionSelection: (state, action: PayloadAction<string>) => {
      const versionId = action.payload;
      const index = state.selectedVersionIds.indexOf(versionId);
      if (index === -1) {
        state.selectedVersionIds.push(versionId);
      } else {
        state.selectedVersionIds.splice(index, 1);
      }
    },
    
    selectAllVersions: (state) => {
      state.selectedVersionIds = state.filteredVersionIds.length > 0 
        ? [...state.filteredVersionIds]
        : state.versions.map(v => v.id);
    },
    
    deselectAllVersions: (state) => {
      state.selectedVersionIds = [];
    },
    
    // 展開/摺疊版本樹節點
    toggleVersionExpansion: (state, action: PayloadAction<string>) => {
      const versionId = action.payload;
      const index = state.expandedVersionIds.indexOf(versionId);
      if (index === -1) {
        state.expandedVersionIds.push(versionId);
      } else {
        state.expandedVersionIds.splice(index, 1);
      }
    },
    
    expandAllVersions: (state) => {
      state.expandedVersionIds = state.versions.map(v => v.id);
    },
    
    collapseAllVersions: (state) => {
      state.expandedVersionIds = [];
    },
    
    // 比較功能
    setComparisonVersions: (state, action: PayloadAction<[string, string] | null>) => {
      state.comparisonVersionIds = action.payload;
      state.isComparing = action.payload !== null;
    },
    
    setShowComparisonPanel: (state, action: PayloadAction<boolean>) => {
      state.showComparisonPanel = action.payload;
    },
    
    clearComparison: (state) => {
      state.comparisonVersionIds = null;
      state.isComparing = false;
      state.currentComparisonId = null;
      state.showComparisonPanel = false;
    },
    
    // 篩選和搜尋
    setFilter: (state, action: PayloadAction<VersionFilter | null>) => {
      state.filter = action.payload;
      // 重新計算篩選結果
      if (action.payload) {
        // TODO: 實現篩選邏輯
        state.filteredVersionIds = state.versions.map(v => v.id);
      } else {
        state.filteredVersionIds = [];
      }
    },
    
    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
      // 重新計算搜尋結果
      if (action.payload.trim()) {
        state.filteredVersionIds = state.versions
          .filter(v => 
            v.prompt.toLowerCase().includes(action.payload.toLowerCase()) ||
            v.metadata.title?.toLowerCase().includes(action.payload.toLowerCase()) ||
            v.metadata.description?.toLowerCase().includes(action.payload.toLowerCase())
          )
          .map(v => v.id);
      } else {
        state.filteredVersionIds = [];
      }
    },
    
    clearFilter: (state) => {
      state.filter = null;
      state.searchKeyword = '';
      state.filteredVersionIds = [];
    },
    
    // 面板顯示控制
    setShowVersionDetails: (state, action: PayloadAction<boolean>) => {
      state.showVersionDetails = action.payload;
    },
    
    setShowExportPanel: (state, action: PayloadAction<boolean>) => {
      state.showExportPanel = action.payload;
    },
    
    setShowImportPanel: (state, action: PayloadAction<boolean>) => {
      state.showImportPanel = action.payload;
    },
    
    // 分支管理
    setCurrentBranch: (state, action: PayloadAction<string | null>) => {
      state.currentBranchId = action.payload;
    },
    
    // 設定管理
    updateSettings: (state, action: PayloadAction<Partial<VersionManagementState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // 進度更新
    setOperationProgress: (state, action: PayloadAction<number>) => {
      state.operationProgress = Math.max(0, Math.min(100, action.payload));
    },
    
    // 錯誤處理
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // 載入狀態管理
    setLoading: (state, action: PayloadAction<{ key: keyof VersionManagementState['loading']; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    
    // 重置狀態
    resetVersionManagement: () => initialState,
  },
  
  extraReducers: (builder) => {
    // 載入版本列表
    builder
      .addCase(loadVersions.pending, (state) => {
        state.loading.loadingVersions = true;
        state.error = null;
      })
      .addCase(loadVersions.fulfilled, (state, action) => {
        state.loading.loadingVersions = false;
        state.versions = action.payload;
        state.error = null;
      })
      .addCase(loadVersions.rejected, (state, action) => {
        state.loading.loadingVersions = false;
        state.error = action.error.message || '載入版本失敗';
      });
    
    // 創建版本
    builder
      .addCase(createVersion.pending, (state) => {
        state.loading.creating = true;
        state.error = null;
        state.operationProgress = 0;
      })
      .addCase(createVersion.fulfilled, (state, action) => {
        state.loading.creating = false;
        state.operationProgress = 100;
        if (action.payload.success) {
          // TODO: 新增版本到狀態中
          // const newVersion = action.payload.version;
          // state.versions.push(newVersion);
        }
        state.error = null;
      })
      .addCase(createVersion.rejected, (state, action) => {
        state.loading.creating = false;
        state.operationProgress = 0;
        state.error = action.error.message || '創建版本失敗';
      });
    
    // 更新版本
    builder
      .addCase(updateVersion.pending, (state) => {
        state.loading.updating = true;
        state.error = null;
      })
      .addCase(updateVersion.fulfilled, (state, action) => {
        state.loading.updating = false;
        if (action.payload.success && action.payload.versionId) {
          // TODO: 更新版本在狀態中
          // const versionIndex = state.versions.findIndex(v => v.id === action.payload.versionId);
          // if (versionIndex !== -1) {
          //   state.versions[versionIndex] = { ...state.versions[versionIndex], ...action.meta.arg.data };
          // }
        }
        state.error = null;
      })
      .addCase(updateVersion.rejected, (state, action) => {
        state.loading.updating = false;
        state.error = action.error.message || '更新版本失敗';
      });
    
    // 刪除版本
    builder
      .addCase(deleteVersion.pending, (state) => {
        state.loading.deleting = true;
        state.error = null;
      })
      .addCase(deleteVersion.fulfilled, (state, action) => {
        state.loading.deleting = false;
        if (action.payload.success && action.payload.versionId) {
          // 從狀態中移除版本
          state.versions = state.versions.filter(v => v.id !== action.payload.versionId);
          state.selectedVersionIds = state.selectedVersionIds.filter(id => id !== action.payload.versionId);
          if (state.currentVersionId === action.payload.versionId) {
            state.currentVersionId = null;
          }
        }
        state.error = null;
      })
      .addCase(deleteVersion.rejected, (state, action) => {
        state.loading.deleting = false;
        state.error = action.error.message || '刪除版本失敗';
      });
    
    // 載入版本樹
    builder
      .addCase(loadVersionTree.pending, (state) => {
        state.loading.loadingTree = true;
        state.error = null;
      })
      .addCase(loadVersionTree.fulfilled, (state, action) => {
        state.loading.loadingTree = false;
        const rootVersionId = action.payload.rootVersion.id;
        state.versionTrees[rootVersionId] = action.payload;
        state.error = null;
      })
      .addCase(loadVersionTree.rejected, (state, action) => {
        state.loading.loadingTree = false;
        state.error = action.error.message || '載入版本樹失敗';
      });
    
    // 比較版本
    builder
      .addCase(compareVersions.pending, (state) => {
        state.loading.loadingComparison = true;
        state.error = null;
      })
      .addCase(compareVersions.fulfilled, (state, action) => {
        state.loading.loadingComparison = false;
        state.comparisons.push(action.payload);
        state.currentComparisonId = action.payload.id;
        state.showComparisonPanel = true;
        state.error = null;
      })
      .addCase(compareVersions.rejected, (state, action) => {
        state.loading.loadingComparison = false;
        state.error = action.error.message || '比較版本失敗';
      });
    
    // 載入統計資訊
    builder
      .addCase(loadStatistics.pending, (state) => {
        state.loading.loadingStatistics = true;
        state.error = null;
      })
      .addCase(loadStatistics.fulfilled, (state, action) => {
        state.loading.loadingStatistics = false;
        state.statistics = action.payload;
        state.error = null;
      })
      .addCase(loadStatistics.rejected, (state, action) => {
        state.loading.loadingStatistics = false;
        state.error = action.error.message || '載入統計資訊失敗';
      });
    
    // 導出版本
    builder
      .addCase(exportVersions.pending, (state) => {
        state.loading.exporting = true;
        state.error = null;
        state.operationProgress = 0;
      })
      .addCase(exportVersions.fulfilled, (state, action) => {
        state.loading.exporting = false;
        state.operationProgress = 100;
        state.showExportPanel = false;
        // TODO: 顯示成功訊息或下載連結
        console.log(`版本導出成功: ${action.payload}`);
        state.error = null;
      })
      .addCase(exportVersions.rejected, (state, action) => {
        state.loading.exporting = false;
        state.operationProgress = 0;
        state.error = action.error.message || '導出版本失敗';
      });
    
    // 匯入版本
    builder
      .addCase(importVersions.pending, (state) => {
        state.loading.importing = true;
        state.error = null;
        state.operationProgress = 0;
      })
      .addCase(importVersions.fulfilled, (state, action) => {
        state.loading.importing = false;
        state.operationProgress = 100;
        state.showImportPanel = false;
        if (action.payload.success) {
          // TODO: 重新載入版本列表
        }
        state.error = null;
      })
      .addCase(importVersions.rejected, (state, action) => {
        state.loading.importing = false;
        state.operationProgress = 0;
        state.error = action.error.message || '匯入版本失敗';
      });
    
    // 創建分支
    builder
      .addCase(createBranch.pending, (state) => {
        state.loading.creating = true;
        state.error = null;
      })
      .addCase(createBranch.fulfilled, (state, action) => {
        state.loading.creating = false;
        if (action.payload.success) {
          // TODO: 新增分支到狀態中
        }
        state.error = null;
      })
      .addCase(createBranch.rejected, (state, action) => {
        state.loading.creating = false;
        state.error = action.error.message || '創建分支失敗';
      });
  },
});

// 導出 actions
export const {
  setActiveView,
  setCurrentVersion,
  setSelectedVersionIds,
  toggleVersionSelection,
  selectAllVersions,
  deselectAllVersions,
  toggleVersionExpansion,
  expandAllVersions,
  collapseAllVersions,
  setComparisonVersions,
  setShowComparisonPanel,
  clearComparison,
  setFilter,
  setSearchKeyword,
  clearFilter,
  setShowVersionDetails,
  setShowExportPanel,
  setShowImportPanel,
  setCurrentBranch,
  updateSettings,
  setOperationProgress,
  setError,
  clearError,
  setLoading,
  resetVersionManagement,
} = versionManagementSlice.actions;

// 導出 reducer
export default versionManagementSlice.reducer;