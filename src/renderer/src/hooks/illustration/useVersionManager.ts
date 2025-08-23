import { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  ImageVersion,
  VersionTree,
  VersionOperationResult,
  VersionFilter,
  VersionExportOptions,
  VersionImportOptions,
  VersionTreeNode,
} from '../../types/versionManagement';

// 返回類型定義
export interface UseVersionManagerReturn {
  // 狀態
  versions: ImageVersion[];
  currentVersion: ImageVersion | null;
  selectedVersionIds: string[];
  loading: boolean;
  error: string | null;
  
  // 版本 CRUD
  createVersion: (data: Partial<ImageVersion>) => Promise<VersionOperationResult>;
  updateVersion: (id: string, data: Partial<ImageVersion>) => Promise<VersionOperationResult>;
  deleteVersion: (id: string) => Promise<VersionOperationResult>;
  duplicateVersion: (id: string, changes?: Partial<ImageVersion>) => Promise<VersionOperationResult>;
  
  // 版本選擇
  selectVersion: (id: string) => void;
  selectMultipleVersions: (ids: string[]) => void;
  toggleVersionSelection: (id: string) => void;
  clearSelection: () => void;
  
  // 分支操作
  createBranch: (name: string, sourceVersionId: string) => Promise<VersionOperationResult>;
  switchToBranch: (branchId: string) => void;
  mergeBranch: (sourceBranchId: string, targetBranchId: string) => Promise<VersionOperationResult>;
  
  // 查詢
  getVersionById: (id: string) => ImageVersion | undefined;
  getVersionsByFilter: (filter: VersionFilter) => ImageVersion[];
  
  // 工具
  buildVersionTree: () => VersionTree | undefined;
  exportVersions: (options: VersionExportOptions) => Promise<string>;
  importVersions: (options: VersionImportOptions) => Promise<VersionOperationResult>;
}
import {
  loadVersions,
  createVersion as createVersionAsync,
  updateVersion as updateVersionAsync,
  deleteVersion as deleteVersionAsync,
  loadVersionTree,
  exportVersions as exportVersionsAsync,
  importVersions as importVersionsAsync,
  createBranch,
  setCurrentVersion,
  clearError,
} from '../../store/slices/versionManagementSlice';

/**
 * 版本管理 Hook
 * 提供版本的 CRUD 操作、版本樹構建、分支管理等功能
 */
export const useVersionManager = (): UseVersionManagerReturn => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 從 Redux store 獲取狀態
  const {
    versions,
    currentVersionId,
    versionTrees,
    branches,
    currentBranchId: _currentBranchId,
    filter: _filter,
    loading,
    error,
  } = useSelector((state: RootState) => state.versionManagement);
  
  // 本地狀態
  const [localError, setLocalError] = useState<string | null>(null);

  // 計算當前版本
  const currentVersion = useMemo(() => {
    return currentVersionId ? versions.find(v => v.id === currentVersionId) || null : null;
  }, [versions, currentVersionId]);

  // 計算當前版本樹
  const _versionTree = useMemo(() => {
    if (!currentVersion) return undefined;
    return versionTrees[currentVersion.rootVersionId];
  }, [versionTrees, currentVersion]);

  // 綜合錯誤狀態
  const combinedError = error || localError;
  const isLoading = loading.loadingVersions || loading.creating || loading.updating || loading.deleting;

  // 創建版本
  const createVersion = useCallback(async (data: Partial<ImageVersion>): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      dispatch(clearError());

      // 建構完整的版本資料
      const versionData: Partial<ImageVersion> = {
        ...data,
        versionNumber: (data.parentVersionId ? versions.filter(v => v.parentVersionId === data.parentVersionId).length + 1 : 1),
        status: data.status || 'active',
        type: data.type || (data.parentVersionId ? 'revision' : 'original'),
        childVersionIds: [],
        metadata: {
          title: data.metadata?.title || `版本 ${data.versionNumber || 1}`,
          description: data.metadata?.description || '',
          tags: data.metadata?.tags ?? [],
          generationTime: data.metadata?.generationTime || 0,
          fileSize: data.metadata?.fileSize || 0,
          dimensions: data.metadata?.dimensions || { width: 1024, height: 1024 },
          aiParameters: data.metadata?.aiParameters || {
            model: 'unknown',
            provider: 'unknown',
          },
          viewCount: 0,
          likeCount: 0,
          exportCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data.metadata,
        },
      };

      const result = await dispatch(createVersionAsync(versionData)).unwrap();
      
      if (result.success) {
        // 重新載入版本列表
        if (versionData.tempImageData?.id) {
          await dispatch(loadVersions(versionData.tempImageData.id));
        }
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || '創建版本失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'CREATE_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [dispatch, versions]);

  // 更新版本
  const updateVersion = useCallback(async (id: string, data: Partial<ImageVersion>): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      dispatch(clearError());

      // 更新 metadata 的 updatedAt
      const updatedData = {
        ...data,
        metadata: data.metadata ? {
          ...data.metadata,
          tags: data.metadata.tags || [],
          updatedAt: new Date().toISOString(),
        } : undefined,
      };

      const result = await dispatch(updateVersionAsync({ versionId: id, data: updatedData })).unwrap();
      
      if (result.success) {
        // 重新載入版本樹（如果需要）
        const version = versions.find(v => v.id === id);
        if (version && versionTrees[version.rootVersionId]) {
          await dispatch(loadVersionTree(version.rootVersionId));
        }
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || '更新版本失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'UPDATE_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [dispatch, versions, versionTrees]);

  // 刪除版本
  const deleteVersion = useCallback(async (id: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      dispatch(clearError());

      const version = versions.find(v => v.id === id);
      if (!version) {
        throw new Error('版本不存在');
      }

      // 檢查是否有子版本
      if (version.childVersionIds.length > 0) {
        throw new Error('無法刪除有子版本的版本，請先刪除子版本');
      }

      const result = await dispatch(deleteVersionAsync(id)).unwrap();
      
      if (result.success && version) {
        // 重新載入版本樹
        await dispatch(loadVersionTree(version.rootVersionId));
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || '刪除版本失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'DELETE_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [dispatch, versions]);

  // 複製版本
  const duplicateVersion = useCallback(async (id: string): Promise<VersionOperationResult> => {
    try {
      const sourceVersion = versions.find(v => v.id === id);
      if (!sourceVersion) {
        throw new Error('源版本不存在');
      }

      // 創建新版本，基於源版本
      const duplicatedData: Partial<ImageVersion> = {
        ...sourceVersion,
        id: undefined, // 讓後端生成新ID
        parentVersionId: sourceVersion.parentVersionId, // 保持相同的父版本
        childVersionIds: [], // 新版本沒有子版本
        type: 'branch' as VersionType,
        metadata: {
          ...sourceVersion.metadata,
          title: `${sourceVersion.metadata.title} (副本)`,
          description: `${sourceVersion.metadata.description}\n\n基於版本 ${sourceVersion.versionNumber} 複製`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0,
          exportCount: 0,
        },
      };

      return await createVersion(duplicatedData);
    } catch (error: any) {
      const errorMessage = error.message || '複製版本失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'DUPLICATE_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [versions, createVersion]);

  // 創建分支
  const createBranchFromVersion = useCallback(async (versionId: string, branchName: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      dispatch(clearError());

      if (!branchName.trim()) {
        throw new Error('分支名稱不能為空');
      }

      // 檢查分支名稱是否已存在
      const existingBranch = branches.find(b => b.name === branchName.trim());
      if (existingBranch) {
        throw new Error('分支名稱已存在');
      }

      const result = await dispatch(createBranch({ name: branchName.trim(), sourceVersionId: versionId })).unwrap();
      
      if (result.success) {
        // 重新載入版本樹
        const version = versions.find(v => v.id === versionId);
        if (version) {
          await dispatch(loadVersionTree(version.rootVersionId));
        }
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || '創建分支失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'CREATE_BRANCH_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [dispatch, branches, versions]);

  // 切換到分支
  const switchToBranch = useCallback(async (branchId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      const branch = branches.find(b => b.id === branchId);
      if (!branch) {
        throw new Error('分支不存在');
      }

      // 設置當前版本為分支的頭版本
      dispatch(setCurrentVersion(branch.headVersionId));

      return {
        success: true,
        message: `已切換到分支：${branch.name}`,
      };
    } catch (error: any) {
      const errorMessage = error.message || '切換分支失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'SWITCH_BRANCH_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [dispatch, branches]);

  // 合併分支（簡化版）
  const mergeBranch = useCallback(async (_sourceBranchId: string, _targetBranchId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      // TODO: 實現分支合併邏輯
      // 這是一個複雜的操作，需要處理版本衝突、合併策略等
      
      return {
        success: false,
        message: '分支合併功能尚未實現',
        error: {
          code: 'NOT_IMPLEMENTED',
          details: 'Branch merging feature is not implemented yet',
        },
      };
    } catch (error: any) {
      const errorMessage = error.message || '合併分支失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'MERGE_BRANCH_FAILED',
          details: error.toString(),
        },
      };
    }
  }, []);

  // 獲取版本
  const getVersionById = useCallback((id: string): ImageVersion | undefined => {
    return versions.find(v => v.id === id);
  }, [versions]);

  // 根據篩選條件獲取版本
  const getVersionsByFilter = useCallback((filterOptions: VersionFilter): ImageVersion[] => {
    let filteredVersions = [...versions];

    // 時間範圍篩選
    if (filterOptions.dateRange) {
      const { start, end } = filterOptions.dateRange;
      filteredVersions = filteredVersions.filter(v => {
        const createdAt = new Date(v.metadata.createdAt);
        return createdAt >= new Date(start) && createdAt <= new Date(end);
      });
    }

    // 狀態篩選
    if (filterOptions.statuses && filterOptions.statuses.length > 0) {
      filteredVersions = filteredVersions.filter(v => filterOptions.statuses!.includes(v.status));
    }

    // 類型篩選
    if (filterOptions.types && filterOptions.types.length > 0) {
      filteredVersions = filteredVersions.filter(v => filterOptions.types!.includes(v.type));
    }

    // 標籤篩選
    if (filterOptions.tags && filterOptions.tags.length > 0) {
      filteredVersions = filteredVersions.filter(v => 
        filterOptions.tags!.some(tag => 
          v.metadata.tags.some(vTag => vTag.name === tag)
        )
      );
    }

    // 分支篩選
    if (filterOptions.branches && filterOptions.branches.length > 0) {
      filteredVersions = filteredVersions.filter(v => 
        filterOptions.branches!.includes(v.branchName || 'main')
      );
    }

    // 關鍵字搜尋
    if (filterOptions.searchKeyword) {
      const keyword = filterOptions.searchKeyword.toLowerCase();
      filteredVersions = filteredVersions.filter(v => 
        v.prompt.toLowerCase().includes(keyword) ||
        v.metadata.title?.toLowerCase().includes(keyword) ||
        v.metadata.description?.toLowerCase().includes(keyword)
      );
    }

    // 參數篩選
    if (filterOptions.parameterFilters) {
      const { model, provider, minFileSize, maxFileSize } = filterOptions.parameterFilters;
      
      if (model) {
        filteredVersions = filteredVersions.filter(v => v.metadata.aiParameters.model === model);
      }
      
      if (provider) {
        filteredVersions = filteredVersions.filter(v => v.metadata.aiParameters.provider === provider);
      }
      
      if (minFileSize !== undefined) {
        filteredVersions = filteredVersions.filter(v => v.metadata.fileSize >= minFileSize);
      }
      
      if (maxFileSize !== undefined) {
        filteredVersions = filteredVersions.filter(v => v.metadata.fileSize <= maxFileSize);
      }
    }

    return filteredVersions;
  }, [versions]);

  // 構建版本樹
  const buildVersionTree = useCallback((): VersionTree | undefined => {
    if (!currentVersion) return undefined;

    const rootVersion = versions.find(v => v.id === currentVersion.rootVersionId);
    if (!rootVersion) return undefined;

    // 構建版本樹節點
    const buildTreeNode = (version: ImageVersion, depth = 0): VersionTreeNode => {
      const children = version.childVersionIds
        .map(childId => versions.find(v => v.id === childId))
        .filter(Boolean)
        .map(child => buildTreeNode(child!, depth + 1));

      return {
        version,
        children,
        depth,
        isExpanded: true, // 默認展開
        branchInfo: branches.find(b => b.headVersionId === version.id),
      };
    };

    const tree = buildTreeNode(rootVersion);
    const allVersions = versions.filter(v => v.rootVersionId === rootVersion.id);
    const maxDepth = Math.max(...allVersions.map(v => {
      let depth = 0;
      let current = v;
      while (current.parentVersionId) {
        depth++;
        current = versions.find(parent => parent.id === current.parentVersionId)!;
        if (!current) break;
      }
      return depth;
    }));

    return {
      rootVersion,
      tree,
      branches: branches.filter(b => 
        allVersions.some(v => v.id === b.headVersionId)
      ),
      totalVersions: allVersions.length,
      maxDepth,
    };
  }, [currentVersion, versions, branches]);

  // 導出版本
  const exportVersions = useCallback(async (options: VersionExportOptions): Promise<string> => {
    try {
      setLocalError(null);
      const result = await dispatch(exportVersionsAsync(options)).unwrap();
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '導出版本失敗';
      setLocalError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch]);

  // 匯入版本
  const importVersions = useCallback(async (options: VersionImportOptions): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      const result = await dispatch(importVersionsAsync(options)).unwrap();
      
      if (result.success) {
        // 重新載入版本列表
        // TODO: 根據匯入的版本重新載入相關資料
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || '匯入版本失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'IMPORT_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [dispatch]);

  // 本地選擇狀態
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  
  // Selection 方法
  const selectVersion = useCallback((id: string) => {
    setSelectedVersionIds([id]);
  }, []);
  
  const selectMultipleVersions = useCallback((ids: string[]) => {
    setSelectedVersionIds(ids);
  }, []);
  
  const toggleVersionSelection = useCallback((id: string) => {
    setSelectedVersionIds(prev => 
      prev.includes(id) 
        ? prev.filter(vId => vId !== id)
        : [...prev, id]
    );
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedVersionIds([]);
  }, []);

  return {
    // 資料
    versions,
    currentVersion,
    selectedVersionIds,
    
    // 狀態
    loading: isLoading,
    error: combinedError,
    
    // 操作
    createVersion,
    updateVersion,
    deleteVersion,
    duplicateVersion,
    
    // 版本選擇
    selectVersion,
    selectMultipleVersions,
    toggleVersionSelection,
    clearSelection,
    
    // 分支操作
    createBranch: createBranchFromVersion,
    switchToBranch,
    mergeBranch,
    
    // 查詢
    getVersionById,
    getVersionsByFilter,
    
    // 工具
    buildVersionTree,
    exportVersions,
    importVersions,
  };
};