import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  VersionHistory,
  VersionStatistics,
  VersionFilter,
  VersionOperationResult,
  ImageVersion,
} from '../../types/versionManagement';

// 返回類型定義
export interface UseVersionHistoryReturn {
  // 狀態
  histories: VersionHistory[];
  currentHistory: VersionHistory | null;
  filteredHistories: VersionHistory[];
  statistics: VersionStatistics | null;
  loading: boolean;
  error: string | null;
  
  // 歷史操作
  loadHistory: (imageId: string) => Promise<VersionHistory[]>;
  createHistoryEntry: (imageId: string, versionId: string, action: string) => Promise<void>;
  
  // 篩選和搜尋
  filterHistories: (filter: VersionFilter) => void;
  searchHistories: (keyword: string) => void;
  clearFilter: () => void;
  
  // 統計功能
  getStatistics: (imageId?: string) => Promise<VersionStatistics>;
  getCreationFrequency: (period: 'daily' | 'weekly' | 'monthly') => any[];
  
  // 導出功能
  exportHistory: (imageId: string, format: 'json' | 'csv') => Promise<string>;
}
import {
  loadStatistics,
  setSearchKeyword,
  clearFilter,
  clearError,
} from '../../store/slices/versionManagementSlice';

/**
 * 版本歷史 Hook
 * 提供版本歷史記錄管理、篩選搜尋、統計分析等功能
 */
export const useVersionHistory = (): UseVersionHistoryReturn => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 從 Redux store 獲取狀態
  const {
    versions,
    histories,
    currentHistoryId,
    statistics,
    filter: _filter,
    searchKeyword: _searchKeyword,
    filteredVersionIds: _filteredVersionIds,
    loading,
    error,
  } = useSelector((state: RootState) => state.versionManagement);
  
  // 本地狀態
  const [localError, setLocalError] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<VersionHistory[]>([]);

  // 計算當前歷史記錄
  const currentHistory = useMemo(() => {
    if (!currentHistoryId) return null;
    return histories[currentHistoryId] || localHistory.find(h => h.imageId === currentHistoryId) || null;
  }, [histories, currentHistoryId, localHistory]);

  // 綜合錯誤狀態
  const combinedError = error || localError;

  // 合併歷史記錄
  const allHistories = useMemo(() => {
    const historiesArray = Object.values(histories);
    return [...historiesArray, ...localHistory.filter(h => !histories[h.imageId])];
  }, [histories, localHistory]);

  // 載入版本歷史
  const loadHistory = useCallback(async (imageId: string): Promise<VersionHistory[]> => {
    try {
      setLocalError(null);
      dispatch(clearError());

      // TODO: 實際實現時需要呼叫 API
      // const result = await api.history.getByImageId(imageId);
      
      // 模擬 API 呼叫
      return new Promise<VersionHistory[]>((resolve) => {
        setTimeout(() => {
          // 從現有版本建構歷史記錄
          const imageVersions = versions.filter(v => 
            v.tempImageData?.id === imageId || 
            v.id === imageId ||
            v.rootVersionId === imageId
          );

          const history: VersionHistory = {
            imageId,
            versions: imageVersions,
            tree: {
              rootVersion: imageVersions[0] || {} as ImageVersion,
              tree: {} as any,
              branches: [],
              totalVersions: imageVersions.length,
              maxDepth: 0,
            },
            comparisons: [],
            stats: {
              totalVersions: imageVersions.length,
              activeBranches: 1,
              lastModified: imageVersions.length > 0 ? 
                Math.max(...imageVersions.map(v => new Date(v.metadata.updatedAt).getTime())).toString() :
                new Date().toISOString(),
              averageGenerationTime: imageVersions.length > 0 ?
                imageVersions.reduce((sum, v) => sum + v.metadata.generationTime, 0) / imageVersions.length :
                0,
              totalFileSize: imageVersions.reduce((sum, v) => sum + v.metadata.fileSize, 0),
            },
            settings: {
              autoCleanup: false,
              defaultBranchName: 'main',
            },
          };

          // 更新本地歷史記錄
          setLocalHistory(prev => {
            const filtered = prev.filter(h => h.imageId !== imageId);
            return [...filtered, history];
          });

          resolve([history]);
        }, 800);
      });
    } catch (error: any) {
      const errorMessage = error.message || '載入版本歷史失敗';
      setLocalError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, versions]);

  // 更新歷史記錄
  const _updateHistory = useCallback(async (imageId: string, data: Partial<VersionHistory>): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      // TODO: 實際實現時需要呼叫 API
      // const result = await api.history.update(imageId, data);
      
      // 更新本地歷史記錄
      setLocalHistory(prev => 
        prev.map(h => h.imageId === imageId ? { ...h, ...data } : h)
      );

      return {
        success: true,
        message: '歷史記錄更新成功',
      };
    } catch (error: any) {
      const errorMessage = error.message || '更新歷史記錄失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'UPDATE_HISTORY_FAILED',
          details: error.toString(),
        },
      };
    }
  }, []);

  // 清除歷史記錄
  const _clearHistory = useCallback(async (imageId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      // TODO: 實際實現時需要呼叫 API
      // const result = await api.history.clear(imageId);
      
      // 從本地歷史記錄中移除
      setLocalHistory(prev => prev.filter(h => h.imageId !== imageId));

      return {
        success: true,
        message: '歷史記錄已清除',
      };
    } catch (error: any) {
      const errorMessage = error.message || '清除歷史記錄失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'CLEAR_HISTORY_FAILED',
          details: error.toString(),
        },
      };
    }
  }, []);

  // 應用篩選
  const applyFilter = useCallback((filterOptions: VersionFilter) => {
    dispatch(setFilter(filterOptions));
  }, [dispatch]);

  // 清除篩選
  const clearFilterAction = useCallback(() => {
    dispatch(clearFilter());
  }, [dispatch]);

  // 搜尋版本
  const searchVersions = useCallback((keyword: string): ImageVersion[] => {
    dispatch(setSearchKeyword(keyword));
    
    if (!keyword.trim()) {
      return versions;
    }

    const lowercaseKeyword = keyword.toLowerCase();
    
    return versions.filter(version => 
      version.prompt.toLowerCase().includes(lowercaseKeyword) ||
      version.metadata.title?.toLowerCase().includes(lowercaseKeyword) ||
      version.metadata.description?.toLowerCase().includes(lowercaseKeyword) ||
      version.metadata.tags.some(tag => 
        tag.name.toLowerCase().includes(lowercaseKeyword)
      ) ||
      version.metadata.aiParameters.model.toLowerCase().includes(lowercaseKeyword) ||
      version.metadata.aiParameters.provider.toLowerCase().includes(lowercaseKeyword)
    );
  }, [dispatch, versions]);

  // 生成統計資訊
  const generateStatistics = useCallback((): VersionStatistics => {
    const stats: VersionStatistics = {
      // 基本統計
      totalVersions: versions.length,
      activeVersions: versions.filter(v => v.status === 'active').length,
      archivedVersions: versions.filter(v => v.status === 'archived').length,
      
      // 分支統計
      totalBranches: 0,
      activeBranches: 0,
      averageVersionsPerBranch: 0,
      
      // 時間統計
      averageGenerationTime: versions.length > 0 ? 
        versions.reduce((sum, v) => sum + v.metadata.generationTime, 0) / versions.length : 0,
      totalGenerationTime: versions.reduce((sum, v) => sum + v.metadata.generationTime, 0),
      creationFrequency: {
        daily: [],
        weekly: [],
        monthly: [],
      },
      
      // 使用統計
      mostViewedVersions: [...versions]
        .sort((a, b) => b.metadata.viewCount - a.metadata.viewCount)
        .slice(0, 10),
      mostLikedVersions: [...versions]
        .sort((a, b) => b.metadata.likeCount - a.metadata.likeCount)
        .slice(0, 10),
      mostExportedVersions: [...versions]
        .sort((a, b) => b.metadata.exportCount - a.metadata.exportCount)
        .slice(0, 10),
      
      // 技術統計
      modelUsage: {},
      providerUsage: {},
      averageFileSize: versions.length > 0 ? 
        versions.reduce((sum, v) => sum + v.metadata.fileSize, 0) / versions.length : 0,
      totalStorageUsed: versions.reduce((sum, v) => sum + v.metadata.fileSize, 0),
    };

    // 計算模型使用統計
    versions.forEach(version => {
      const model = version.metadata.aiParameters.model;
      stats.modelUsage[model] = (stats.modelUsage[model] || 0) + 1;
    });

    // 計算提供商使用統計
    versions.forEach(version => {
      const provider = version.metadata.aiParameters.provider;
      stats.providerUsage[provider] = (stats.providerUsage[provider] || 0) + 1;
    });

    // 計算創建頻率統計
    const now = new Date();
    const dailyStats: number[] = new Array(30).fill(0);
    const weeklyStats: number[] = new Array(12).fill(0);
    const monthlyStats: number[] = new Array(12).fill(0);

    versions.forEach(version => {
      const createdAt = new Date(version.metadata.createdAt);
      const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const weeksDiff = Math.floor(daysDiff / 7);
      const monthsDiff = Math.floor(daysDiff / 30);

      // 每日統計（過去30天）
      if (daysDiff >= 0 && daysDiff < 30) {
        dailyStats[29 - daysDiff]++;
      }

      // 每週統計（過去12週）
      if (weeksDiff >= 0 && weeksDiff < 12) {
        weeklyStats[11 - weeksDiff]++;
      }

      // 每月統計（過去12個月）
      if (monthsDiff >= 0 && monthsDiff < 12) {
        monthlyStats[11 - monthsDiff]++;
      }
    });

    stats.creationFrequency = {
      daily: dailyStats,
      weekly: weeklyStats,
      monthly: monthlyStats,
    };

    return stats;
  }, [versions]);

  // 導出統計資訊
  const _exportStatistics = useCallback(async (format: 'json' | 'csv'): Promise<string> => {
    try {
      setLocalError(null);
      
      const stats = generateStatistics();
      
      if (format === 'json') {
        const jsonData = JSON.stringify(stats, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 創建下載連結
        const link = document.createElement('a');
        link.href = url;
        link.download = `version-statistics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return url;
      } else if (format === 'csv') {
        // 生成 CSV 格式
        let csvContent = 'Metric,Value\n';
        csvContent += `Total Versions,${stats.totalVersions}\n`;
        csvContent += `Active Versions,${stats.activeVersions}\n`;
        csvContent += `Archived Versions,${stats.archivedVersions}\n`;
        csvContent += `Average Generation Time,${stats.averageGenerationTime}\n`;
        csvContent += `Total Generation Time,${stats.totalGenerationTime}\n`;
        csvContent += `Average File Size,${stats.averageFileSize}\n`;
        csvContent += `Total Storage Used,${stats.totalStorageUsed}\n`;
        
        csvContent += '\n\nModel Usage\n';
        Object.entries(stats.modelUsage).forEach(([model, count]) => {
          csvContent += `${model},${count}\n`;
        });
        
        csvContent += '\n\nProvider Usage\n';
        Object.entries(stats.providerUsage).forEach(([provider, count]) => {
          csvContent += `${provider},${count}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        // 創建下載連結
        const link = document.createElement('a');
        link.href = url;
        link.download = `version-statistics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return url;
      }
      
      throw new Error('不支援的格式');
    } catch (error: any) {
      const errorMessage = error.message || '導出統計資訊失敗';
      setLocalError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [generateStatistics]);

  // 自動載入統計資訊
  useEffect(() => {
    if (versions.length > 0 && !statistics) {
      dispatch(loadStatistics());
    }
  }, [versions.length, statistics, dispatch]);

  // 即時統計計算
  const realTimeStatistics = useMemo(() => {
    return generateStatistics();
  }, [generateStatistics]);

  return {
    // 資料
    histories: allHistories,
    currentHistory,
    filteredHistories: allHistories, // TODO: 實現過濾邏輯
    statistics: statistics || realTimeStatistics,
    
    // 狀態
    loading: loading.loadingHistory || loading.loadingStatistics,
    error: combinedError,
    
    // 操作
    loadHistory,
    createHistoryEntry: async (_imageId: string, _versionId: string, _action: string) => {
      // TODO: 實現歷史記錄創建
    },
    
    // 篩選和搜尋
    filterHistories: applyFilter,
    searchHistories: searchVersions,
    clearFilter: clearFilterAction,
    
    // 統計功能
    getStatistics: async (_imageId?: string) => {
      // TODO: 實現統計獲取
      return generateStatistics();
    },
    getCreationFrequency: (_period: 'daily' | 'weekly' | 'monthly') => {
      // TODO: 實現創建頻率統計
      return [];
    },
    
    // 導出功能
    exportHistory: async (_imageId: string, _format: 'json' | 'csv') => {
      // TODO: 實現歷史導出
      return '';
    },
  };
};