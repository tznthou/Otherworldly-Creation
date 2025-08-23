import { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  ImageVersion,
  VersionComparison,
  VersionDifference,
  VersionOperationResult,
} from '../../types/versionManagement';

// 返回類型定義
export interface UseVersionComparisonReturn {
  // 狀態
  comparisons: VersionComparison[];
  currentComparison: VersionComparison | null;
  isComparing: boolean;
  loading: boolean;
  error: string | null;
  
  // 比較操作
  compareVersions: (version1Id: string, version2Id: string) => Promise<VersionComparison>;
  saveComparison: (comparison: VersionComparison) => Promise<VersionOperationResult>;
  deleteComparison: (comparisonId: string) => Promise<VersionOperationResult>;
  setCurrentComparison: (comparisonId: string | null) => void;
  clearComparison: () => void;
  
  // 工具方法
  calculateSimilarity: (version1: ImageVersion, version2: ImageVersion) => number;
  findDifferences: (version1: ImageVersion, version2: ImageVersion) => VersionDifference[];
  generateComparisonReport: (comparison: VersionComparison) => string;
}
import {
  compareVersions as compareVersionsAsync,
  setComparisonVersions,
  setShowComparisonPanel,
  clearComparison,
  clearError,
} from '../../store/slices/versionManagementSlice';

/**
 * 版本比較 Hook
 * 提供版本比較、差異分析、相似度計算等功能
 */
export const useVersionComparison = (): UseVersionComparisonReturn => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 從 Redux store 獲取狀態
  const {
    versions,
    comparisons,
    currentComparisonId,
    isComparing,
    comparisonVersionIds: _comparisonVersionIds,
    showComparisonPanel: _showComparisonPanel,
    loading,
    error,
  } = useSelector((state: RootState) => state.versionManagement);
  
  // 本地狀態
  const [localError, setLocalError] = useState<string | null>(null);

  // 計算當前比較
  const currentComparison = useMemo(() => {
    return currentComparisonId ? comparisons.find(c => c.id === currentComparisonId) || null : null;
  }, [comparisons, currentComparisonId]);

  // 綜合錯誤狀態
  const combinedError = error || localError;

  // 比較兩個版本
  const compareVersions = useCallback(async (version1Id: string, version2Id: string): Promise<VersionComparison> => {
    try {
      setLocalError(null);
      dispatch(clearError());

      const version1 = versions.find(v => v.id === version1Id);
      const version2 = versions.find(v => v.id === version2Id);

      if (!version1 || !version2) {
        throw new Error('找不到指定的版本');
      }

      // 設置比較狀態
      dispatch(setComparisonVersions([version1Id, version2Id]));

      // 執行異步比較
      const comparison = await dispatch(compareVersionsAsync({ version1Id, version2Id })).unwrap();
      
      // 顯示比較面板
      dispatch(setShowComparisonPanel(true));

      return comparison;
    } catch (error: any) {
      const errorMessage = error.message || '版本比較失敗';
      setLocalError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, versions]);

  // 儲存比較結果
  const saveComparison = useCallback(async (_comparison: VersionComparison): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      // TODO: 實際實現時需要呼叫 API 來儲存比較結果
      // const result = await api.comparisons.save(comparison);
      
      // 模擬儲存操作
      return new Promise<VersionOperationResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: '比較結果已儲存',
          });
        }, 500);
      });
    } catch (error: any) {
      const errorMessage = error.message || '儲存比較結果失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'SAVE_COMPARISON_FAILED',
          details: error.toString(),
        },
      };
    }
  }, []);

  // 刪除比較記錄
  const deleteComparison = useCallback(async (_comparisonId: string): Promise<VersionOperationResult> => {
    try {
      setLocalError(null);
      
      // TODO: 實際實現時需要呼叫 API 來刪除比較記錄
      // const result = await api.comparisons.delete(comparisonId);
      
      // 模擬刪除操作
      return new Promise<VersionOperationResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: '比較記錄已刪除',
          });
        }, 300);
      });
    } catch (error: any) {
      const errorMessage = error.message || '刪除比較記錄失敗';
      setLocalError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: {
          code: 'DELETE_COMPARISON_FAILED',
          details: error.toString(),
        },
      };
    }
  }, []);

  // 計算相似度
  const calculateSimilarity = useCallback((version1: ImageVersion, version2: ImageVersion): number => {
    let similarity = 0;
    let totalWeight = 0;

    // 提示詞相似度 (權重: 40%)
    const promptSimilarity = calculateTextSimilarity(version1.prompt, version2.prompt);
    similarity += promptSimilarity * 0.4;
    totalWeight += 0.4;

    // AI 參數相似度 (權重: 30%)
    const parameterSimilarity = calculateParameterSimilarity(
      version1.metadata.aiParameters,
      version2.metadata.aiParameters
    );
    similarity += parameterSimilarity * 0.3;
    totalWeight += 0.3;

    // 尺寸相似度 (權重: 10%)
    const dimensionSimilarity = calculateDimensionSimilarity(
      version1.metadata.dimensions,
      version2.metadata.dimensions
    );
    similarity += dimensionSimilarity * 0.1;
    totalWeight += 0.1;

    // 標籤相似度 (權重: 10%)
    const tagSimilarity = calculateTagSimilarity(
      version1.metadata.tags,
      version2.metadata.tags
    );
    similarity += tagSimilarity * 0.1;
    totalWeight += 0.1;

    // 檔案大小相似度 (權重: 5%)
    const fileSizeSimilarity = calculateFileSizeSimilarity(
      version1.metadata.fileSize,
      version2.metadata.fileSize
    );
    similarity += fileSizeSimilarity * 0.05;
    totalWeight += 0.05;

    // 生成時間相似度 (權重: 5%)
    const generationTimeSimilarity = calculateGenerationTimeSimilarity(
      version1.metadata.generationTime,
      version2.metadata.generationTime
    );
    similarity += generationTimeSimilarity * 0.05;
    totalWeight += 0.05;

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }, []);

  // 文字相似度計算 (簡化版的 Jaccard 相似度)
  const calculateTextSimilarity = useCallback((text1: string, text2: string): number => {
    if (!text1 && !text2) return 1;
    if (!text1 || !text2) return 0;

    // 將文字轉換為詞彙集合
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));

    // 計算交集和聯集
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }, []);

  // AI 參數相似度計算
  const calculateParameterSimilarity = useCallback((params1: any, params2: any): number => {
    let similarity = 0;
    let count = 0;

    // 模型相同性
    if (params1.model === params2.model) similarity += 1;
    count++;

    // 提供商相同性
    if (params1.provider === params2.provider) similarity += 1;
    count++;

    // 種子值相似度
    if (params1.seed !== undefined && params2.seed !== undefined) {
      similarity += params1.seed === params2.seed ? 1 : 0;
      count++;
    }

    // 指導值相似度
    if (params1.guidance !== undefined && params2.guidance !== undefined) {
      const guidanceDiff = Math.abs(params1.guidance - params2.guidance);
      similarity += Math.max(0, 1 - guidanceDiff / 10); // 假設最大差異為10
      count++;
    }

    // 步數相似度
    if (params1.steps !== undefined && params2.steps !== undefined) {
      const stepsDiff = Math.abs(params1.steps - params2.steps);
      similarity += Math.max(0, 1 - stepsDiff / 50); // 假設最大差異為50
      count++;
    }

    // 增強設定相同性
    if (params1.enhance === params2.enhance) similarity += 1;
    count++;

    // 風格相同性
    if (params1.style === params2.style) similarity += 1;
    count++;

    return count > 0 ? similarity / count : 0;
  }, []);

  // 尺寸相似度計算
  const calculateDimensionSimilarity = useCallback((dim1: any, dim2: any): number => {
    if (!dim1 || !dim2) return 0;

    const widthRatio = Math.min(dim1.width, dim2.width) / Math.max(dim1.width, dim2.width);
    const heightRatio = Math.min(dim1.height, dim2.height) / Math.max(dim1.height, dim2.height);

    return (widthRatio + heightRatio) / 2;
  }, []);

  // 標籤相似度計算
  const calculateTagSimilarity = useCallback((tags1: any[], tags2: any[]): number => {
    if (!tags1?.length && !tags2?.length) return 1;
    if (!tags1?.length || !tags2?.length) return 0;

    const tagNames1 = new Set(tags1.map(tag => tag.name?.toLowerCase()));
    const tagNames2 = new Set(tags2.map(tag => tag.name?.toLowerCase()));

    const intersection = new Set([...tagNames1].filter(tag => tagNames2.has(tag)));
    const union = new Set([...tagNames1, ...tagNames2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }, []);

  // 檔案大小相似度計算
  const calculateFileSizeSimilarity = useCallback((size1: number, size2: number): number => {
    if (size1 === 0 && size2 === 0) return 1;
    if (size1 === 0 || size2 === 0) return 0;

    const ratio = Math.min(size1, size2) / Math.max(size1, size2);
    return ratio;
  }, []);

  // 生成時間相似度計算
  const calculateGenerationTimeSimilarity = useCallback((time1: number, time2: number): number => {
    if (time1 === 0 && time2 === 0) return 1;
    if (time1 === 0 || time2 === 0) return 0;

    const ratio = Math.min(time1, time2) / Math.max(time1, time2);
    return ratio;
  }, []);

  // 尋找差異
  const findDifferences = useCallback((version1: ImageVersion, version2: ImageVersion): VersionDifference[] => {
    const differences: VersionDifference[] = [];

    // 提示詞差異
    if (version1.prompt !== version2.prompt) {
      differences.push({
        type: 'prompt',
        field: 'prompt',
        oldValue: version1.prompt,
        newValue: version2.prompt,
        description: '提示詞內容不同',
      });
    }

    // AI 參數差異
    const params1 = version1.metadata.aiParameters;
    const params2 = version2.metadata.aiParameters;

    if (params1.model !== params2.model) {
      differences.push({
        type: 'parameters',
        field: 'model',
        oldValue: params1.model,
        newValue: params2.model,
        description: 'AI 模型不同',
      });
    }

    if (params1.provider !== params2.provider) {
      differences.push({
        type: 'parameters',
        field: 'provider',
        oldValue: params1.provider,
        newValue: params2.provider,
        description: 'AI 提供商不同',
      });
    }

    if (params1.seed !== params2.seed) {
      differences.push({
        type: 'parameters',
        field: 'seed',
        oldValue: params1.seed,
        newValue: params2.seed,
        description: '隨機種子值不同',
      });
    }

    if (params1.guidance !== params2.guidance) {
      differences.push({
        type: 'parameters',
        field: 'guidance',
        oldValue: params1.guidance,
        newValue: params2.guidance,
        description: '指導強度不同',
      });
    }

    if (params1.steps !== params2.steps) {
      differences.push({
        type: 'parameters',
        field: 'steps',
        oldValue: params1.steps,
        newValue: params2.steps,
        description: '生成步數不同',
      });
    }

    if (params1.enhance !== params2.enhance) {
      differences.push({
        type: 'parameters',
        field: 'enhance',
        oldValue: params1.enhance,
        newValue: params2.enhance,
        description: '增強設定不同',
      });
    }

    if (params1.style !== params2.style) {
      differences.push({
        type: 'parameters',
        field: 'style',
        oldValue: params1.style,
        newValue: params2.style,
        description: '風格設定不同',
      });
    }

    // 尺寸差異
    const dim1 = version1.metadata.dimensions;
    const dim2 = version2.metadata.dimensions;

    if (dim1.width !== dim2.width || dim1.height !== dim2.height) {
      differences.push({
        type: 'parameters',
        field: 'dimensions',
        oldValue: `${dim1.width}×${dim1.height}`,
        newValue: `${dim2.width}×${dim2.height}`,
        description: '圖片尺寸不同',
      });
    }

    // 標題差異
    if (version1.metadata.title !== version2.metadata.title) {
      differences.push({
        type: 'metadata',
        field: 'title',
        oldValue: version1.metadata.title,
        newValue: version2.metadata.title,
        description: '標題不同',
      });
    }

    // 描述差異
    if (version1.metadata.description !== version2.metadata.description) {
      differences.push({
        type: 'metadata',
        field: 'description',
        oldValue: version1.metadata.description,
        newValue: version2.metadata.description,
        description: '描述不同',
      });
    }

    // 檔案大小差異
    if (version1.metadata.fileSize !== version2.metadata.fileSize) {
      differences.push({
        type: 'metadata',
        field: 'fileSize',
        oldValue: version1.metadata.fileSize,
        newValue: version2.metadata.fileSize,
        description: '檔案大小不同',
      });
    }

    return differences;
  }, []);

  // 生成比較報告
  const generateComparisonReport = useCallback((comparison: VersionComparison): string => {
    const { version1, version2, differences, similarity } = comparison;
    
    let report = `版本比較報告\n`;
    report += `==================\n\n`;
    
    report += `版本 1: ${version1.metadata.title || '未命名'} (版本 ${version1.versionNumber})\n`;
    report += `版本 2: ${version2.metadata.title || '未命名'} (版本 ${version2.versionNumber})\n`;
    report += `相似度: ${(similarity * 100).toFixed(1)}%\n\n`;
    
    if (differences.length === 0) {
      report += `兩個版本完全相同。\n`;
    } else {
      report += `發現 ${differences.length} 項差異:\n\n`;
      
      differences.forEach((diff, index) => {
        report += `${index + 1}. ${diff.description}\n`;
        report += `   ${diff.field}: "${diff.oldValue}" → "${diff.newValue}"\n\n`;
      });
    }
    
    report += `比較時間: ${new Date(comparison.comparedAt).toLocaleString()}\n`;
    report += `比較方式: ${comparison.comparisonType === 'manual' ? '手動比較' : '自動比較'}\n`;
    
    return report;
  }, []);

  return {
    // 資料
    comparisons,
    currentComparison,
    
    // 狀態
    isComparing: loading.loadingComparison || isComparing,
    loading: loading.loadingComparison,
    error: combinedError,
    
    // 操作
    compareVersions,
    saveComparison,
    deleteComparison,
    setCurrentComparison: (_comparisonId: string | null) => {
      // TODO: 實現設置當前比較
    },
    clearComparison: () => {
      dispatch(clearComparison());
    },
    
    // 分析
    calculateSimilarity,
    findDifferences,
    generateComparisonReport,
  };
};