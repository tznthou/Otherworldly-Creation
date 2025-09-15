import { useState, useCallback } from 'react';
import type { IllustrationHistoryItem } from '../../types/illustration';
import type { ImageVersion } from '../../types/versionManagement';
import type { Project } from '../../api/models';
import { api } from '../../api';

/**
 * 圖庫數據管理 Hook
 * 包含關鍵的 useCallback 優化邏輯，避免無限迴圈
 */
export const useGalleryData = (
  currentProject: Project | null,
  versions: ImageVersion[]
) => {
  const [illustrationHistory, setIllustrationHistory] = useState<IllustrationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 版本數據映射函數 (使用 useCallback 避免重複創建)
  const enrichWithVersionData = useCallback((illustration: IllustrationHistoryItem): IllustrationHistoryItem => {
    // 查找對應的版本數據
    const relatedVersions = versions.filter(v => 
      v.tempImageData?.id === illustration.id || 
      v.projectId === illustration.project_id
    );
    
    if (relatedVersions.length === 0) {
      // 如果沒有版本數據，返回原始數據
      return illustration;
    }
    
    // 找到最相關的版本（通常是最新的）
    const relevantVersion = relatedVersions
      .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime())[0];
    
    // 計算版本統計
    const rootVersions = relatedVersions.filter(v => v.rootVersionId === relevantVersion.rootVersionId);
    const isLatest = rootVersions.every(v => 
      new Date(v.metadata.createdAt).getTime() <= new Date(relevantVersion.metadata.createdAt).getTime()
    );
    
    // 映射版本類型，確保類型安全
    let mappedVersionType: 'original' | 'revision' | 'branch' | 'merge' | undefined;
    switch (relevantVersion.type) {
      case 'original':
      case 'revision':
      case 'branch':
      case 'merge':
        mappedVersionType = relevantVersion.type;
        break;
      default:
        mappedVersionType = undefined;
    }
    
    return {
      ...illustration,
      // 版本管理數據
      versionId: relevantVersion.id,
      versionNumber: relevantVersion.versionNumber,
      parentVersionId: relevantVersion.parentVersionId,
      rootVersionId: relevantVersion.rootVersionId,
      versionType: mappedVersionType,
      versionStatus: relevantVersion.status,
      isLatestVersion: isLatest,
      totalVersions: rootVersions.length,
      branchName: relevantVersion.branchName,
      versionTags: relevantVersion.metadata.tags.map(tag => tag.name),
    };
  }, [versions]);

  // 獲取插畫歷史 (使用 useCallback 避免無限迴圈)
  const fetchIllustrationHistory = useCallback(async () => {
    if (!currentProject) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.illustration.getIllustrationHistory(
        currentProject.id,
        undefined, // characterId - 獲取所有角色的插畫
        100, // limit - 獲取最近100張
        0 // offset
      );
      
      // 檢查回傳格式並取出 illustrations 陣列
      let history: unknown[] = [];
      
      if (Array.isArray(response)) {
        // 如果直接是陣列（舊格式）
        history = response;
      } else if (response && typeof response === 'object' && 'illustrations' in response && Array.isArray((response as { illustrations: unknown[] }).illustrations)) {
        // 如果是物件格式包含 illustrations 陣列（新格式）
        history = (response as { illustrations: unknown[] }).illustrations;
      } else {
        console.error('API 回傳格式不正確:', response);
        throw new Error('API 回傳的數據格式不正確');
      }
      
      // 整合版本管理數據
      console.log('[useGalleryData] 原始歷史數據:', history.length, '條記錄');
      console.log('[useGalleryData] 原始數據內容:', history.slice(0, 2)); // 顯示前2筆詳細內容
      const enrichedHistory = history.map((illustration: unknown) => enrichWithVersionData(illustration as IllustrationHistoryItem));
      console.log('[useGalleryData] 處理後歷史數據:', enrichedHistory.length, '條記錄');
      console.log('[useGalleryData] 處理後數據內容:', enrichedHistory.slice(0, 2)); // 顯示前2筆處理後內容
      
      setIllustrationHistory(enrichedHistory);
      console.log('[useGalleryData] 已設置插畫歷史狀態');
    } catch (err) {
      console.error('獲取插畫歷史失敗:', err);
      setError(err instanceof Error ? err.message : '獲取插畫歷史失敗');
    } finally {
      setLoading(false);
    }
  }, [currentProject, enrichWithVersionData]); // 🔥 移除 loading 依賴，避免無限迴圈

  // 重新獲取數據的便捷方法
  const refetchData = useCallback(() => {
    fetchIllustrationHistory();
  }, [fetchIllustrationHistory]);

  // 更新本地狀態（用於刪除操作後的狀態同步）
  const updateIllustrationHistory = useCallback((updater: (prev: IllustrationHistoryItem[]) => IllustrationHistoryItem[]) => {
    setIllustrationHistory(updater);
  }, []);

  return {
    illustrationHistory,
    loading,
    error,
    fetchIllustrationHistory,
    refetchData,
    updateIllustrationHistory,
    enrichWithVersionData,
  };
};