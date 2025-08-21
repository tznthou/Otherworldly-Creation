import { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  VersionBranch,
  VersionOperationResult,
  ImageVersion,
  VersionDifference,
} from '../../types/versionManagement';

// 返回類型定義
export interface UseVersionBranchingReturn {
  // 狀態
  branches: VersionBranch[];
  currentBranch: VersionBranch | null;
  loading: boolean;
  error: string | null;
  
  // 分支操作
  createBranch: (name: string, sourceVersionId: string, color?: string) => Promise<VersionOperationResult>;
  switchBranch: (branchId: string) => Promise<VersionOperationResult>;
  mergeBranch: (sourceBranchId: string, targetBranchId: string) => Promise<VersionOperationResult>;
  deleteBranch: (branchId: string) => Promise<VersionOperationResult>;
  
  // 分支管理
  renameBranch: (branchId: string, newName: string) => Promise<VersionOperationResult>;
  setBranchColor: (branchId: string, color: string) => void;
  
  // 查詢功能
  getBranchById: (branchId: string) => VersionBranch | undefined;
  getBranchByName: (name: string) => VersionBranch | undefined;
  getVersionsInBranch: (branchId: string) => ImageVersion[];
  
  // 衝突檢測
  detectConflicts: (sourceBranchId: string, targetBranchId: string) => Promise<VersionDifference[]>;
  resolveConflict: (conflictId: string, resolution: 'source' | 'target' | 'custom') => void;
}
import {
  createBranch as createBranchAsync,
  setCurrentBranch,
  setError,
  clearError,
} from '../../store/slices/versionManagementSlice';

/**
 * 版本分支 Hook
 * 提供分支創建、管理、切換、合併等功能
 */
export const useVersionBranching = (): UseVersionBranchingReturn => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 從 Redux store 獲取狀態
  const {
    versions,
    branches,
    currentBranchId,
    loading,
    error,
  } = useSelector((state: RootState) => state.versionManagement);
  
  // 本地狀態
  const [localError, setLocalError] = useState<string | null>(null);
  const [localBranches, setLocalBranches] = useState<VersionBranch[]>([]);

  // 計算當前分支
  const currentBranch = useMemo(() => {
    return currentBranchId ? 
      branches.find(b => b.id === currentBranchId) || 
      localBranches.find(b => b.id === currentBranchId) || null : 
      null;
  }, [branches, localBranches, currentBranchId]);

  // 合併所有分支
  const allBranches = useMemo(() => {
    const branchIds = new Set(branches.map(b => b.id));
    const uniqueLocalBranches = localBranches.filter(b => !branchIds.has(b.id));
    return [...branches, ...uniqueLocalBranches];
  }, [branches, localBranches]);

  // 綜合錯誤狀態
  const combinedError = error || localError;

  // 創建分支
  const createBranch = useCallback(async (name: string, sourceVersionId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      dispatch(clearError());

      // 驗證輸入
      if (!name.trim()) {
        throw new Error('分支名稱不能為空');
      }

      if (!sourceVersionId) {
        throw new Error('必須指定源版本');
      }

      // 檢查源版本是否存在
      const sourceVersion = versions.find(v => v.id === sourceVersionId);
      if (!sourceVersion) {
        throw new Error('源版本不存在');
      }

      // 檢查分支名稱是否已存在
      const existingBranch = allBranches.find(b => b.name.toLowerCase() === name.trim().toLowerCase());
      if (existingBranch) {
        throw new Error(`分支名稱 "${name}" 已存在`);
      }

      // 調用 Redux async action
      const result = await dispatch(createBranchAsync({ name: name.trim(), sourceVersionId })).unwrap();
      
      if (result.success) {
        // 創建本地分支記錄
        const newBranch: VersionBranch = {
          id: result.versionId || Date.now().toString(),
          name: name.trim(),
          description: `基於版本 ${sourceVersion.versionNumber} 創建的分支`,
          rootVersionId: sourceVersion.rootVersionId,
          headVersionId: sourceVersionId,
          versionIds: [sourceVersionId],
          createdAt: new Date().toISOString(),
          isActive: true,
          color: generateBranchColor(name),
        };

        setLocalBranches(prev => [...prev, newBranch]);
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
  }, [dispatch, versions, allBranches]);

  // 刪除分支
  const deleteBranch = useCallback(async (branchId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      const branch = allBranches.find(b => b.id === branchId);
      if (!branch) {
        throw new Error('分支不存在');
      }

      // 檢查是否為當前分支
      if (currentBranchId === branchId) {
        throw new Error('無法刪除當前使用中的分支');
      }

      // 檢查是否為主分支
      if (branch.name === 'main' || branch.name === 'master') {
        throw new Error('無法刪除主分支');
      }

      // TODO: 實際實現時需要呼叫 API
      // const result = await api.branches.delete(branchId);
      
      // 從本地分支中移除
      setLocalBranches(prev => prev.filter(b => b.id !== branchId));

      return {
        success: true,
        message: `分支 "${branch.name}" 已刪除`,
      };
    } catch (error: any) {
      const errorMessage = error.message || '刪除分支失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'DELETE_BRANCH_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [allBranches, currentBranchId]);

  // 重命名分支
  const renameBranch = useCallback(async (branchId: string, newName: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      if (!newName.trim()) {
        throw new Error('分支名稱不能為空');
      }

      const branch = allBranches.find(b => b.id === branchId);
      if (!branch) {
        throw new Error('分支不存在');
      }

      // 檢查新名稱是否已存在
      const existingBranch = allBranches.find(b => 
        b.id !== branchId && 
        b.name.toLowerCase() === newName.trim().toLowerCase()
      );
      if (existingBranch) {
        throw new Error(`分支名稱 "${newName}" 已存在`);
      }

      // TODO: 實際實現時需要呼叫 API
      // const result = await api.branches.rename(branchId, newName);
      
      // 更新本地分支
      setLocalBranches(prev => 
        prev.map(b => 
          b.id === branchId 
            ? { ...b, name: newName.trim(), color: generateBranchColor(newName) }
            : b
        )
      );

      return {
        success: true,
        message: `分支已重命名為 "${newName}"`,
      };
    } catch (error: any) {
      const errorMessage = error.message || '重命名分支失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'RENAME_BRANCH_FAILED',
          details: error.toString(),
        },
      };
    }
  }, [allBranches]);

  // 切換分支
  const switchBranch = useCallback(async (branchId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      const branch = allBranches.find(b => b.id === branchId);
      if (!branch) {
        throw new Error('分支不存在');
      }

      // 設置當前分支
      dispatch(setCurrentBranch(branchId));

      return {
        success: true,
        message: `已切換到分支 "${branch.name}"`,
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
  }, [dispatch, allBranches]);

  // 合併分支
  const mergeBranches = useCallback(async (sourceBranchId: string, targetBranchId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      const sourceBranch = allBranches.find(b => b.id === sourceBranchId);
      const targetBranch = allBranches.find(b => b.id === targetBranchId);

      if (!sourceBranch || !targetBranch) {
        throw new Error('源分支或目標分支不存在');
      }

      if (sourceBranchId === targetBranchId) {
        throw new Error('無法將分支合併到自身');
      }

      // TODO: 實現複雜的分支合併邏輯
      // 這需要處理版本衝突、合併策略等
      
      return {
        success: false,
        message: '分支合併功能尚在開發中',
        error: {
          code: 'MERGE_NOT_IMPLEMENTED',
          details: 'Branch merging feature is under development',
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
  }, [allBranches]);

  // 檢查合併衝突
  const checkMergeConflicts = useCallback(async (sourceBranchId: string, targetBranchId: string): Promise<VersionDifference[]> => {
    try {
      setLocalError(null);
      
      const sourceBranch = allBranches.find(b => b.id === sourceBranchId);
      const targetBranch = allBranches.find(b => b.id === targetBranchId);

      if (!sourceBranch || !targetBranch) {
        throw new Error('源分支或目標分支不存在');
      }

      // 獲取分支的頭版本
      const sourceHeadVersion = versions.find(v => v.id === sourceBranch.headVersionId);
      const targetHeadVersion = versions.find(v => v.id === targetBranch.headVersionId);

      if (!sourceHeadVersion || !targetHeadVersion) {
        throw new Error('無法找到分支的頭版本');
      }

      // 檢查衝突（簡化版）
      const conflicts: VersionDifference[] = [];

      // 提示詞衝突
      if (sourceHeadVersion.prompt !== targetHeadVersion.prompt) {
        conflicts.push({
          type: 'prompt',
          field: 'prompt',
          oldValue: targetHeadVersion.prompt,
          newValue: sourceHeadVersion.prompt,
          description: '提示詞內容有差異',
        });
      }

      // AI 參數衝突
      const sourceParams = sourceHeadVersion.metadata.aiParameters;
      const targetParams = targetHeadVersion.metadata.aiParameters;

      if (sourceParams.model !== targetParams.model) {
        conflicts.push({
          type: 'parameters',
          field: 'model',
          oldValue: targetParams.model,
          newValue: sourceParams.model,
          description: 'AI 模型不同',
        });
      }

      if (sourceParams.provider !== targetParams.provider) {
        conflicts.push({
          type: 'parameters',
          field: 'provider',
          oldValue: targetParams.provider,
          newValue: sourceParams.provider,
          description: 'AI 提供商不同',
        });
      }

      // 尺寸衝突
      const sourceDim = sourceHeadVersion.metadata.dimensions;
      const targetDim = targetHeadVersion.metadata.dimensions;

      if (sourceDim.width !== targetDim.width || sourceDim.height !== targetDim.height) {
        conflicts.push({
          type: 'parameters',
          field: 'dimensions',
          oldValue: `${targetDim.width}×${targetDim.height}`,
          newValue: `${sourceDim.width}×${sourceDim.height}`,
          description: '圖片尺寸不同',
        });
      }

      return conflicts;
    } catch (error: any) {
      const errorMessage = error.message || '檢查合併衝突失敗';
      setLocalError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [allBranches, versions]);

  // 獲取分支
  const getBranchById = useCallback((id: string): VersionBranch | undefined => {
    return allBranches.find(b => b.id === id);
  }, [allBranches]);

  // 獲取活躍分支
  const getActiveBranches = useCallback((): VersionBranch[] => {
    return allBranches.filter(b => b.isActive);
  }, [allBranches]);

  // 獲取分支歷史
  const getBranchHistory = useCallback((branchId: string): ImageVersion[] => {
    const branch = allBranches.find(b => b.id === branchId);
    if (!branch) return [];

    return branch.versionIds
      .map(versionId => versions.find(v => v.id === versionId))
      .filter(Boolean) as ImageVersion[];
  }, [allBranches, versions]);

  // 生成分支顏色
  const generateBranchColor = useCallback((branchName: string): string => {
    const colors = [
      '#3B82F6', // 藍色
      '#10B981', // 綠色
      '#F59E0B', // 黃色
      '#EF4444', // 紅色
      '#8B5CF6', // 紫色
      '#F97316', // 橙色
      '#06B6D4', // 青色
      '#84CC16', // 萊姆綠
      '#EC4899', // 粉紅色
      '#6B7280', // 灰色
    ];

    // 基於分支名稱生成一致的顏色
    let hash = 0;
    for (let i = 0; i < branchName.length; i++) {
      hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }, []);

  return {
    // 資料
    branches: allBranches,
    currentBranch,
    
    // 狀態
    loading: loading.creating,
    error: combinedError,
    
    // 操作
    createBranch,
    deleteBranch,
    renameBranch,
    switchBranch,
    
    // 合併
    mergeBranch: mergeBranches,
    detectConflicts: checkMergeConflicts,
    resolveConflict: () => {}, // TODO: 實現衝突解決
    
    // 分支管理
    setBranchColor: (branchId: string, color: string) => {
      // TODO: 實現分支顏色設置
    },
    
    // 查詢
    getBranchById,
    getBranchByName: (name: string) => {
      return allBranches.find(b => b.name === name);
    },
    getVersionsInBranch: (branchId: string) => {
      // TODO: 實現獲取分支中的版本
      return [];
    },
  };
};