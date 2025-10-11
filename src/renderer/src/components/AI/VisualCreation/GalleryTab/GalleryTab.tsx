import React, { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { convertFileSrc } from '@tauri-apps/api/core';
import { SafeImage } from '../../../UI/SafeImage';
import SimpleErrorBoundary from '../../../UI/SimpleErrorBoundary';
import type { RootState, AppDispatch } from '../../../../store/store';
import type { IllustrationHistoryItem } from '../../../../types/illustration';
import type { ImageVersion } from '../../../../types/versionManagement';
import type { DeleteIllustrationResponse } from '../../../../api/types';
import {
  setSelectedImageIds,
  setActiveTab,
} from '../../../../store/slices/visualCreationSlice';
import { addNotification } from '../../../../store/slices/uiSlice';
import { api } from '../../../../api';
import { formatDateTime } from '../../../../utils/dateUtils';
import { logger } from '../../../../services/logService';
import { useVersionManager } from '../../../../hooks/illustration/useVersionManager';
import { 
  setCurrentVersion,
  setSelectedVersionIds as setVersionSelectedIds 
} from '../../../../store/slices/versionManagementSlice';
import BatchExportPanel from '../panels/BatchExportPanel';
import ImageNamingPanel from '../ImageNaming/ImageNamingPanel';
import EbookIntegrationPanel from '../EbookIntegration/EbookIntegrationPanel';
import { EbookPreparationPanel } from '../EbookPreparation/EbookPreparationPanel';
import { createPortal } from 'react-dom';
import DeleteConfirmationModal from '../DeleteConfirmation/DeleteConfirmationModal';
import type { BatchRenameOperation, EbookExportConfig } from '../../../../types/imageMetadata';
import type { DeleteIllustrationRequest } from '../../../../api/types';
import { useGalleryData } from '../../../../hooks/gallery/useGalleryData';
import GalleryHeader from './components/GalleryHeader';
import { GalleryContent } from './components/GalleryContent';
import { createLogger } from '../../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('GalleryTab');

interface GalleryTabProps {
  className?: string;
}

const GalleryTab: React.FC<GalleryTabProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux 狀態
  const { isExporting, exportProgress, selectedImageIds } = useSelector((state: RootState) => state.visualCreation);
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 版本管理 Hook
  const {
    versions,
    createVersion,
    loading: _versionLoading,
    error: _versionError
  } = useVersionManager();
  
  // 使用新的數據管理 Hook
  const {
    illustrationHistory,
    loading: _loading,
    error: _error,
    fetchIllustrationHistory,
    refetchData,
    updateIllustrationHistory,
  } = useGalleryData(currentProject, versions);
  
  // 本地狀態
  const selectedImages = useMemo(() => new Set(selectedImageIds), [selectedImageIds]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterProvider, setFilterProvider] = useState<'all' | 'pollinations' | 'imagen'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');
  const [filterVersions, setFilterVersions] = useState<'all' | 'latest' | 'original' | 'multiple'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'provider' | 'type' | 'version' | 'custom'>('date');
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // 圖像預覽狀態
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<IllustrationHistoryItem | null>(null);
  
  // 模態框狀態
  const [showBatchExportModal, setShowBatchExportModal] = useState(false);
  const [showImageNamingPanel, setShowImageNamingPanel] = useState(false);
  const [showEbookIntegrationPanel, setShowEbookIntegrationPanel] = useState(false);
  const [showEbookPreparationPanel, setShowEbookPreparationPanel] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set()); // 標記正在刪除的圖片

  // 自動獲取插畫歷史數據
  useEffect(() => {
    log.debug('🔍 [GalleryTab] useEffect 觸發 - currentProject:', currentProject?.id);
    if (currentProject) {
      log.debug('🔍 [GalleryTab] 開始調用 fetchIllustrationHistory...');
      fetchIllustrationHistory();
    }
  }, [currentProject, fetchIllustrationHistory]);

  // 項目角色映射
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

  // 當專案變更時重新獲取數據
  useEffect(() => {
    if (currentProject) {
      fetchIllustrationHistory();
    }
  }, [currentProject, fetchIllustrationHistory, versions]);

  // 格式化版本號顯示
  const formatVersionNumber = (versionNumber?: number) => {
    if (!versionNumber) return '';
    return `v${versionNumber.toFixed(1)}`;
  };
  
  // 獲取版本類型圖標
  const getVersionTypeIcon = (type?: string) => {
    switch (type) {
      case 'original': return '🌟';
      case 'revision': return '✏️';
      case 'branch': return '🌿';
      case 'merge': return '🔄';
      default: return '📄';
    }
  };

  // 過濾和排序插畫
  const getFilteredIllustrations = () => {
    const filtered = illustrationHistory.filter(item => {
      // 項目過濾
      if (currentProject && item.project_id !== currentProject.id) return false;
      
      // 提供商過濾
      if (filterProvider !== 'all' && item.provider !== filterProvider) return false;
      
      // 狀態過濾
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      
      // 版本過濾
      if (filterVersions !== 'all') {
        switch (filterVersions) {
          case 'latest':
            if (!item.isLatestVersion) return false;
            break;
          case 'original':
            if (item.versionType !== 'original') return false;
            break;
          case 'multiple':
            if (!item.totalVersions || item.totalVersions <= 1) return false;
            break;
        }
      }
      
      // 搜索過濾
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesPrompt = item.original_prompt.toLowerCase().includes(searchLower) ||
                             (item.enhanced_prompt && item.enhanced_prompt.toLowerCase().includes(searchLower));
        const matchesVersion = formatVersionNumber(item.versionNumber).toLowerCase().includes(searchLower) ||
                              (item.versionTags && item.versionTags.some(tag => tag.toLowerCase().includes(searchLower)));
        
        if (!matchesPrompt && !matchesVersion) {
          return false;
        }
      }
      
      return true;
    });

    // 排序
    if (sortBy === 'custom' && customOrder.length > 0) {
      const orderMap = Object.fromEntries(customOrder.map((id, index) => [id, index]));
      filtered.sort((a, b) => {
        const orderA = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    } else {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'provider':
            return a.provider.localeCompare(b.provider);
          case 'type':
            return a.model.localeCompare(b.model);
          case 'version': {
            const versionCountDiff = (b.totalVersions || 0) - (a.totalVersions || 0);
            if (versionCountDiff !== 0) return versionCountDiff;
            return (b.versionNumber || 0) - (a.versionNumber || 0);
          }
          default:
            return 0;
        }
      });
    }

    return filtered;
  };

  const filteredIllustrations = getFilteredIllustrations();
  
  // 🔍 調試：檢查篩選過程
  log.debug('🔍 GalleryTab: 篩選過程調試', {
    原始數據長度: illustrationHistory.length,
    當前項目ID: currentProject?.id,
    篩選器狀態: { filterProvider, filterStatus, filterVersions, searchTerm },
    篩選後數據長度: filteredIllustrations.length,
    原始數據前2筆: illustrationHistory.slice(0, 2).map(item => ({
      id: item.id,
      project_id: item.project_id,
      status: item.status,
      provider: item.provider,
      isLatestVersion: item.isLatestVersion,
      versionType: item.versionType
    })),
    篩選後前2筆: filteredIllustrations.slice(0, 2).map(item => ({
      id: item.id,
      project_id: item.project_id,
      status: item.status,
      provider: item.provider
    }))
  });

  // 版本操作函數
  const _handleCreateVariant = async (imageId: string) => {
    const illustration = illustrationHistory.find(item => item.id === imageId);
    if (!illustration) return;
    
    try {
      const variantData: Partial<ImageVersion> = {
        prompt: illustration.original_prompt,
        originalPrompt: illustration.original_prompt,
        imageUrl: illustration.image_url || '',
        projectId: illustration.project_id,
        characterId: illustration.character_id,
        parentVersionId: illustration.versionId,
        type: 'branch',
        metadata: {
          title: `${illustration.original_prompt.slice(0, 30)}... 變體`,
          description: '基於原圖創建的變體版本',
          tags: illustration.versionTags?.map(name => ({ 
            id: `tag-${Date.now()}-${Math.random()}`, 
            name, 
            color: '#gold' 
          })) || [],
          aiParameters: {
            model: illustration.model,
            provider: illustration.provider,
          },
          dimensions: {
            width: illustration.width,
            height: illustration.height,
          },
          generationTime: 0,
          fileSize: 0,
          viewCount: 0,
          likeCount: 0,
          exportCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      
      const result = await createVersion(variantData);
      if (result.success) {
        log.debug('✅ 創建變體成功');
        refetchData();
      } else {
        log.error('❌ 創建變體失敗:', result.message);
      }
    } catch (error) {
      log.error('❌ 創建變體時發生錯誤:', error);
    }
  };
  
  // 查看版本歷史功能
  const handleViewVersionHistory = (imageId: string) => {
    const illustration = illustrationHistory.find(item => item.id === imageId);
    if (!illustration) return;

    try {
      if (illustration.versionId) {
        dispatch(setCurrentVersion(illustration.versionId));
        dispatch(setVersionSelectedIds([illustration.versionId]));
      }
      dispatch(setActiveTab('versions'));
      log.debug('✅ 切換到版本管理標籤頁:', {
        imageId: imageId,
        versionId: illustration.versionId,
        rootVersionId: illustration.rootVersionId,
        prompt: illustration.original_prompt.slice(0, 50)
      });
    } catch (error) {
      log.error('❌ 查看版本歷史時發生錯誤:', error);
    }
  };

  // 預覽圖像功能
  const _handlePreviewImage = (imageId: string) => {
    const illustration = illustrationHistory.find(item => item.id === imageId);
    if (!illustration) return;

    setPreviewImage(illustration);
    setShowPreview(true);
  };

  // 關閉預覽
  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewImage(null);
  }, []);

  // 下載圖像功能
  const handleDownloadImage = (imageId: string) => {
    const illustration = illustrationHistory.find(item => item.id === imageId);
    if (!illustration) return;

    try {
      const imageUrl = illustration.image_url || (illustration.image_path ? convertFileSrc(illustration.image_path) : '');
      if (!imageUrl) {
        log.error('圖像 URL 不存在');
        return;
      }

      const promptPart = illustration.original_prompt.slice(0, 30).replace(/[^\w\s-]/g, '').trim();
      const versionPart = illustration.versionNumber ? `v${illustration.versionNumber.toFixed(1)}` : 'v1.0';
      const idPart = illustration.id.slice(0, 8);
      const filename = `${promptPart}_${versionPart}_${idPart}.png`;

      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      log.debug('✅ 圖像下載已觸發:', filename);
    } catch (error) {
      log.error('❌ 下載圖像時發生錯誤:', error);
    }
  };

  // 刪除選中的圖片
  const handleDeleteSelected = () => {
    if (selectedImages.size === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: '無選擇項目',
        message: '請先選擇要刪除的圖片',
        duration: 3000
      }));
      return;
    }
    setShowDeleteConfirmation(true);
  };

  // 安全刪除 - WebView圖片引用解除 + 延遲刪除隊列
  const handleConfirmDeleteSafe = async (request: DeleteIllustrationRequest) => {
    let isOperationComplete = false;
    
    try {
      setIsDeleting(true);
      log.debug('🔍 [UltraSafeDelete] 開始超級安全刪除流程:', request);
      
      // 防護性檢查
      if (!request || !request.imageIds || request.imageIds.length === 0) {
        throw new Error('無效的刪除請求：缺少圖片 ID');
      }
      
      // 🚨 階段1：預防性UI標記 - 標記要刪除的項目但不移除
      log.debug('🎯 [UltraSafeDelete] 階段1: 預防性UI標記');
      const imagesToDelete = new Set(request.imageIds);
      setDeletingImages(imagesToDelete); // 假設我們添加這個狀態來標記正在刪除的圖片
      
      // 清空選擇狀態
      dispatch(setSelectedImageIds([]));
      
      // 🚨 階段2：強制重新渲染和DOM清理
      log.debug('⚡ [UltraSafeDelete] 階段2: 強制DOM更新');
      await new Promise<void>(resolve => {
        // 使用 flushSync 強制立即渲染
        startTransition(() => {
          // 觸發虛擬化網格重新計算
          updateIllustrationHistory(prev => [...prev]); // 觸發淺拷貝重新渲染
          resolve();
        });
      });
      
      // 等待DOM完全更新
      log.debug('⏳ [UltraSafeDelete] 等待DOM完全更新...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒確保DOM清理
      
      // 🚨 階段3：從UI數據中移除項目
      log.debug('🗑️ [UltraSafeDelete] 階段3: 從數據中移除項目');
      updateIllustrationHistory(prev => {
        const filtered = prev.filter(item => !imagesToDelete.has(item.id));
        log.debug(`📊 [UltraSafeDelete] 數據過濾: ${prev.length} -> ${filtered.length}`);
        return filtered;
      });
      
      // 再次等待確保虛擬化網格完成重新渲染
      log.debug('⏳ [UltraSafeDelete] 等待虛擬化網格完成渲染...');
      await new Promise(resolve => setTimeout(resolve, 1500)); // 額外1.5秒
      
      // 🚨 階段4：呼叫後端安全刪除API
      log.debug('🔄 [UltraSafeDelete] 階段4: 調用後端安全刪除API');
      const safeDeletePromise = api.illustration.deleteIllustrationsSafe({
        imageIds: request.imageIds,
        deleteType: request.deleteType,
        preserveMetadata: request.preserveMetadata,
        reason: request.reason,
        delayMs: 1000 // 額外延遲1秒
      });
      
      // 添加超時保護
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('超級安全刪除操作超時')), 45000); // 45秒超時
      });
      
      const response = await Promise.race([safeDeletePromise, timeoutPromise]) as DeleteIllustrationResponse;
      log.debug('✅ [UltraSafeDelete] 後端API響應:', response);
      
      if (response && response.success) {
        log.debug('🎉 [UltraSafeDelete] 超級安全刪除成功');
        
        // 顯示成功通知
        startTransition(() => {
          try {
            dispatch(addNotification({
              type: 'success',
              title: '超級安全刪除完成',
              message: `${response.message || '操作完成'}`,
              duration: 4000
            }));
            setShowDeleteConfirmation(false);
            log.debug('✅ [UltraSafeDelete] 成功通知已發送');
          } catch (notificationError) {
            log.error('❌ [UltraSafeDelete] 通知發送失敗:', notificationError);
            alert(`超級安全刪除完成: ${response.message}`);
            setShowDeleteConfirmation(false);
          }
        });
      } else {
        log.debug('⚠️ [UltraSafeDelete] 後端刪除失敗:', response);
        
        // 恢復UI狀態（重新獲取數據）
        try {
          await fetchIllustrationHistory();
        } catch (refetchError) {
          log.error('❌ [UltraSafeDelete] 恢復數據失敗:', refetchError);
        }
        
        startTransition(() => {
          try {
            dispatch(addNotification({
              type: 'error',
              title: '超級安全刪除失敗',
              message: (response && response.message) || '未知錯誤',
              duration: 0
            }));
          } catch (notificationError) {
            log.error('❌ [UltraSafeDelete] 錯誤通知發送失敗:', notificationError);
            alert(`超級安全刪除失敗: ${response?.message || '未知錯誤'}`);
          }
        });
      }
      isOperationComplete = true;
    } catch (error) {
      log.error('💥 [UltraSafeDelete] 超級安全刪除發生嚴重錯誤:', error);
      
      // 恢復UI狀態
      try {
        await fetchIllustrationHistory();
      } catch (refetchError) {
        log.error('❌ [UltraSafeDelete] 錯誤後恢復數據失敗:', refetchError);
      }
      
      // 嘗試發送錯誤通知
      try {
        startTransition(() => {
          dispatch(addNotification({
            type: 'error',
            title: '超級安全刪除錯誤',
            message: error instanceof Error ? error.message : '未知嚴重錯誤',
            duration: 0
          }));
        });
      } catch (notificationError) {
        log.error('❌ [UltraSafeDelete] 嚴重錯誤通知發送失敗:', notificationError);
        alert(`超級安全刪除嚴重錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
      }
    } finally {
      if (!isOperationComplete) {
        log.warn('⚠️ [UltraSafeDelete] 操作未正常完成，強制清理狀態');
      }
      setDeletingImages(new Set()); // 清理刪除標記狀態
      setIsDeleting(false);
      log.debug('🏁 [UltraSafeDelete] 超級安全刪除流程完成');
    }
  };

  // 傳統刪除（保留作為後備選項）
  const _handleConfirmDelete = async (request: DeleteIllustrationRequest) => {
    let isOperationComplete = false;
    
    try {
      setIsDeleting(true);
      log.debug('🔍 [DEBUG] 開始執行刪除操作:', request);
      
      // 防護性檢查
      if (!request || !request.imageIds || request.imageIds.length === 0) {
        throw new Error('無效的刪除請求：缺少圖片 ID');
      }
      
      // 添加超時保護
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('刪除操作超時')), 30000);
      });
      
      const deletePromise = api.illustration.deleteIllustrations(request);
      
      log.debug('🔄 [DEBUG] 開始 API 調用...');
      const response = await Promise.race([deletePromise, timeoutPromise]) as DeleteIllustrationResponse;
      log.debug('✅ [DEBUG] API 調用完成:', response);
      
      if (response && response.success) {
        log.debug('🎉 [DEBUG] 刪除成功，更新 UI 狀態');
        
        // 安全地更新列表狀態
        try {
          updateIllustrationHistory(prev => 
            prev.filter(item => !response.deletedImageIds.includes(item.id))
          );
          dispatch(setSelectedImageIds([]));
        } catch (stateError) {
          log.error('❌ [DEBUG] 狀態更新失敗:', stateError);
        }
        
        const successMessage = response.deletedToPath ? 
          `位置: ${response.deletedToPath}${response.failedCount > 0 ? `\n失敗: ${response.failedCount} 張` : ''}` :
          `${response.failedCount > 0 ? `失敗: ${response.failedCount} 張` : ''}`;

        // 使用 startTransition 批次更新狀態
        startTransition(() => {
          try {
            dispatch(addNotification({
              type: 'success',
              title: '刪除完成',
              message: `${response.message || '操作完成'}${successMessage ? '\n' + successMessage : ''}`,
              duration: 4000
            }));
            setShowDeleteConfirmation(false);
            log.debug('✅ [DEBUG] 成功通知已發送');
          } catch (notificationError) {
            log.error('❌ [DEBUG] 通知發送失敗:', notificationError);
            // 使用原生 alert 作為備用
            alert(`刪除完成: ${response.message}`);
            setShowDeleteConfirmation(false);
          }
        });
      } else {
        log.debug('⚠️ [DEBUG] 刪除操作失敗:', response);
        // 使用 startTransition 避免重啟
        startTransition(() => {
          try {
            dispatch(addNotification({
              type: 'error',
              title: '刪除失敗',
              message: (response && response.message) || '未知錯誤',
              duration: 0
            }));
          } catch (notificationError) {
            log.error('❌ [DEBUG] 錯誤通知發送失敗:', notificationError);
            // 使用原生 alert 作為備用
            alert(`刪除失敗: ${response?.message || '未知錯誤'}`);
          }
        });
      }
      isOperationComplete = true;
    } catch (error) {
      log.error('💥 [DEBUG] 刪除操作發生嚴重錯誤:', error);
      
      // 嘗試發送錯誤通知
      try {
        startTransition(() => {
          dispatch(addNotification({
            type: 'error',
            title: '系統錯誤',
            message: `操作失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
            duration: 0
          }));
        });
      } catch (notificationError) {
        log.error('❌ [DEBUG] 緊急錯誤通知也失敗了:', notificationError);
        // 最後手段：使用原生 alert
        alert(`系統錯誤: ${error instanceof Error ? error.message : '操作失敗，請重新啟動應用程式'}`);
      }
      
      isOperationComplete = true;
    } finally {
      // 確保無論如何都會清理狀態
      try {
        if (isOperationComplete) {
          setIsDeleting(false);
          log.debug('🧹 [DEBUG] 清理操作狀態完成');
        }
      } catch (cleanupError) {
        log.error('❌ [DEBUG] 狀態清理失敗:', cleanupError);
        // 強制清理
        setTimeout(() => {
          try {
            setIsDeleting(false);
          } catch (_) {
            log.error('❌ [DEBUG] 強制狀態清理也失敗');
          }
        }, 100);
      }
    }
  };

  // 關閉刪除確認對話框
  const handleCloseDeleteConfirmation = () => {
    if (!isDeleting) {
      setShowDeleteConfirmation(false);
    }
  };

  // 拖拽結束處理
  const _handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredIllustrations.findIndex(item => item.id === active.id);
      const newIndex = filteredIllustrations.findIndex(item => item.id === over?.id);

      const newOrder = arrayMove(
        filteredIllustrations.map(item => item.id),
        oldIndex,
        newIndex
      );
      
      setCustomOrder(newOrder);
      setSortBy('custom');
    }
  };


  // 切換圖像選擇 - 使用 useCallback 防止無限重新渲染
  const toggleImageSelection = useCallback((imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    dispatch(setSelectedImageIds(Array.from(newSelected)));
  }, [selectedImages, dispatch]);

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedImages.size === filteredIllustrations.length) {
      dispatch(setSelectedImageIds([]));
    } else {
      dispatch(setSelectedImageIds(filteredIllustrations.map(item => item.id)));
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return formatDateTime(dateString, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // 模態框處理函數
  const handleOpenBatchExport = () => setShowBatchExportModal(true);
  const handleCloseBatchExport = () => setShowBatchExportModal(false);
  const handleOpenImageNaming = () => {
    if (selectedImages.size === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: '無選擇項目',
        message: '請先選擇要重命名的圖片',
        duration: 3000
      }));
      return;
    }
    setShowImageNamingPanel(true);
  };
  const handleCloseImageNaming = () => setShowImageNamingPanel(false);

  // 電子書排版預備處理函數
  const handleOpenEbookPreparation = () => {
    if (!currentProject) {
      dispatch(addNotification({
        type: 'warning',
        title: '無專案選擇',
        message: '請先選擇一個專案才能進行電子書排版預備',
        duration: 3000
      }));
      return;
    }

    if (selectedImages.size === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: '無選擇項目',
        message: '請先選擇要整理的圖片',
        duration: 3000
      }));
      return;
    }

    setShowEbookPreparationPanel(true);
  };

  const handleCloseEbookPreparation = () => {
    setShowEbookPreparationPanel(false);
  };

  const handleOpenEbookIntegration = async () => {
    if (!currentProject) {
      dispatch(addNotification({
        type: 'warning',
        title: '無專案選擇',
        message: '請先選擇一個專案',
        duration: 3000
      }));
      return;
    }
    
    if (selectedImages.size === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: '無選擇項目',
        message: '請先選擇要設為封面的圖片',
        duration: 3000
      }));
      return;
    }
    
    if (selectedImages.size > 1) {
      dispatch(addNotification({
        type: 'warning',
        title: '選擇過多',
        message: '只能選擇一張圖片作為封面',
        duration: 3000
      }));
      return;
    }
    
    try {
      const selectedImageId = Array.from(selectedImages)[0];
      const selectedImage = filteredIllustrations.find(img => img.id === selectedImageId);
      
      if (!selectedImage) {
        dispatch(addNotification({
          type: 'error',
          title: '圖片未找到',
          message: '找不到選中的圖片',
          duration: 0
        }));
        return;
      }
      
      // 簡單實現：更新專案的封面圖片路徑
      const apiModule = await import('../../../../api');
      await apiModule.api.projects.update({
        ...currentProject,
        cover_image: selectedImage.image_path || selectedImage.image_url
      });
      
      dispatch(addNotification({
        type: 'success',
        title: '封面設定完成',
        message: `已將「${selectedImage.original_prompt}」設為專案封面`,
        duration: 4000
      }));
      
    } catch (error) {
      log.error('設定封面失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '設定封面失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        duration: 0
      }));
    }
  };
  const handleCloseEbookIntegration = () => setShowEbookIntegrationPanel(false);

  // 應用批次重命名
  const handleApplyRename = async (operation: BatchRenameOperation) => {
    try {
      log.debug('應用批次重命名:', operation);
      
      // 根據命名規則生成新名稱
      const renameOperations = operation.imageIds.map((imageId, index) => {
        const image = filteredIllustrations.find(img => img.id === imageId);
        let newName = `未命名_${index + 1}`;
        
        if (image && operation.namingRule) {
          // 根據命名規則生成名稱
          newName = operation.namingRule.template
            .replace('{prompt}', image.original_prompt?.substring(0, 30) || 'untitled')
            .replace('{index}', (index + 1).toString())
            .replace('{timestamp}', new Date().toISOString().slice(0, 10));
          
          if (operation.namingRule.customPrefix) {
            newName = operation.namingRule.customPrefix + '_' + newName;
          }
          if (operation.namingRule.customSuffix) {
            newName = newName + '_' + operation.namingRule.customSuffix;
          }
          
          // 限制長度
          if (newName.length > operation.namingRule.maxLength) {
            newName = newName.substring(0, operation.namingRule.maxLength);
          }
        }
        
        return {
          id: imageId,
          new_name: newName
        };
      });
      
      // 調用後端API
      const illustrationModule = await import('../../../../api/illustration');
      const illustrationAPI = illustrationModule.illustrationAPI;
      const result = await illustrationAPI.batchRename(renameOperations);
      
      // 顯示結果
      if (result.success_count > 0) {
        dispatch(addNotification({
          type: 'success',
          title: '重命名完成',
          message: `成功重命名 ${result.success_count} 張圖片${result.failure_count > 0 ? `\n失敗 ${result.failure_count} 張` : ''}`,
          duration: 4000
        }));
        
        // 刷新圖片列表
        if (refetchData) {
          refetchData();
        }
      } else {
        dispatch(addNotification({
          type: 'error',
          title: '重命名失敗',
          message: '請檢查圖片是否存在',
          duration: 0
        }));
      }
      
      setShowImageNamingPanel(false);
    } catch (error) {
      log.error('批次重命名失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '重命名失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        duration: 0
      }));
    }
  };

  // 匯出到電子書
  const handleExportToEbook = async (config: EbookExportConfig) => {
    try {
      log.debug('匯出到電子書:', config);
      const enabledPlacements = Object.entries(config.imagePlacementRules)
        .filter(([_, rule]) => rule.enabled)
        .map(([placement]) => placement)
        .join(', ');
      
      dispatch(addNotification({
        type: 'success',
        title: '電子書整合配置已保存',
        message: `品質: ${config.imageQuality}%\n最大尺寸: ${config.maxImageWidth}x${config.maxImageHeight}\n啟用位置: ${enabledPlacements}\n\n⚠️ 實際整合功能需要EPUB/PDF模組支援`,
        duration: 6000
      }));
      setShowEbookIntegrationPanel(false);
    } catch (error) {
      log.error('電子書整合失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '電子書整合失敗',
        message: '請稍後再試',
        duration: 0
      }));
    }
  };

  // 預覽導航：上一張/下一張
  const handlePreviewNavigation = useCallback((direction: 'prev' | 'next') => {
    if (!previewImage) return;
    
    const currentIndex = filteredIllustrations.findIndex(item => item.id === previewImage.id);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredIllustrations.length - 1;
    } else {
      newIndex = currentIndex < filteredIllustrations.length - 1 ? currentIndex + 1 : 0;
    }
    
    setPreviewImage(filteredIllustrations[newIndex]);
  }, [previewImage, filteredIllustrations]);

  // 預覽鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showPreview) return;
      
      switch (event.key) {
        case 'Escape':
          handleClosePreview();
          break;
        case 'ArrowLeft':
          handlePreviewNavigation('prev');
          break;
        case 'ArrowRight':
          handlePreviewNavigation('next');
          break;
      }
    };

    if (showPreview) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPreview, handlePreviewNavigation, handleClosePreview]);

  // 準備數據
  const selectedImageIdsArray = Array.from(selectedImages);
  const availableImages = filteredIllustrations.map(item => {
    // 🔧 智能 URL 偵測：區分 HTTP URL 和本地路徑
    const isValidHttpUrl = item.image_url && /^https?:\/\//.test(item.image_url);
    const imageUrl = isValidHttpUrl
      ? item.image_url
      : (item.full_path ? convertFileSrc(item.full_path) : '');

    // 🔍 圖片路徑診斷 - 使用結構化日誌 (v1.3.3)
    logger.imageDebug('GalleryTab', '生成 availableImages', {
      id: item.id,
      image_url: item.image_url,
      image_path: item.image_path,
      local_file_path: item.local_file_path,
      full_path: item.full_path,
      finalUrl: imageUrl
    });

    return {
      id: item.id,
      url: imageUrl || '',
      name: item.original_prompt.slice(0, 30).replace(/[^\w\s-]/g, '').trim() || `illustration_${item.id}`
    };
  });

  return (
    <div className={`gallery-tab flex flex-col h-full min-h-screen ${className}`}>
      {/* 頂部控制欄 */}
      <GalleryHeader
        currentProject={currentProject}
        filteredIllustrations={filteredIllustrations}
        selectedImages={selectedImages}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterProvider={filterProvider}
        setFilterProvider={setFilterProvider}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterVersions={filterVersions}
        setFilterVersions={setFilterVersions}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        toggleSelectAll={toggleSelectAll}
        isExporting={isExporting}
        exportProgress={exportProgress}
        onOpenImageNaming={handleOpenImageNaming}
        onOpenEbookPreparation={handleOpenEbookPreparation}
        onOpenEbookIntegration={handleOpenEbookIntegration}
        onOpenBatchExport={handleOpenBatchExport}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* 主要內容區域 - 添加 flex-1 來占滿剩餘高度 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <GalleryContent
          illustrations={filteredIllustrations}
          selectedImages={selectedImages}
          onToggleSelection={toggleImageSelection}
          deletingImages={deletingImages}
          viewMode={viewMode}
        />
      </div>

      {/* 使用提示 */}
      <div className="flex-shrink-0 mt-3 text-xs text-cosmic-500">
        <p>💡 <strong>圖庫說明：</strong></p>
        <p>• 點擊圖像可以選擇，支持批量操作（導出、刪除等）</p>
        <p>• 使用搜索和過濾器可以快速找到特定的插畫和版本</p>
        <p>• 🕰️ 查看版本歷史，🔄 創建變體版本，👁️ 預覽大圖，📥 下載圖片</p>
        <p>• 在列表視圖中拖拽圖像可以自定義導出順序</p>
        <p>• 切換網格/列表視圖以適應不同的瀏覽需求</p>
        <p>• 預覽模式：ESC 關閉，← → 箭頭導航圖片</p>
      </div>

      {/* 圖像預覽 Modal */}
      {showPreview && previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClosePreview}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] bg-cosmic-800 rounded-lg shadow-2xl border border-cosmic-600"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 關閉按鈕 */}
            <button
              onClick={handleClosePreview}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-cosmic-700/80 hover:bg-cosmic-600 text-white rounded-full transition-colors"
              title="關閉預覽 (ESC)"
            >
              ✕
            </button>

            {/* 導航按鈕 */}
            {filteredIllustrations.length > 1 && (
              <>
                <button
                  onClick={() => handlePreviewNavigation('prev')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-cosmic-700/80 hover:bg-cosmic-600 text-white rounded-full transition-colors"
                  title="上一張 (←)"
                >
                  ←
                </button>
                <button
                  onClick={() => handlePreviewNavigation('next')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-cosmic-700/80 hover:bg-cosmic-600 text-white rounded-full transition-colors"
                  title="下一張 (→)"
                >
                  →
                </button>
              </>
            )}

            <div className="flex flex-col">
              {/* 圖像區域 */}
              <div className="flex-1 p-6 pb-0">
                <SafeImage
                  imageUrl={previewImage.image_url}
                  localFilePath={previewImage.full_path || previewImage.image_path}
                  alt={previewImage.original_prompt}
                  className="w-full h-full object-contain max-h-[60vh] rounded"
                  onLoad={() => log.debug('預覽圖像載入完成')}
                  onError={() => log.error('預覽圖像載入失敗')}
                  fallbackIcon="🖼️"
                />
              </div>

              {/* 圖像信息 */}
              <div className="p-6 pt-4 border-t border-cosmic-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {previewImage.enhanced_prompt || previewImage.original_prompt}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        previewImage.is_free ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {previewImage.provider === 'pollinations' ? 'Pollinations' : 'Imagen'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-cosmic-600 text-white">
                        {previewImage.model}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-cosmic-600 text-white">
                        {previewImage.width}×{previewImage.height}
                      </span>
                    </div>

                    {/* 版本信息 */}
                    {previewImage.versionNumber && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-cosmic-300">版本：</span>
                        <span className="px-2 py-1 bg-cosmic-700 text-white text-sm rounded flex items-center gap-1">
                          {getVersionTypeIcon(previewImage.versionType)}
                          {formatVersionNumber(previewImage.versionNumber)}
                          {previewImage.totalVersions && previewImage.totalVersions > 1 && (
                            <span className="text-gold-400">({previewImage.totalVersions})</span>
                          )}
                        </span>
                        {previewImage.isLatestVersion && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">最新</span>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-cosmic-400 space-y-1">
                      <p>創建時間：{formatDate(previewImage.created_at)}</p>
                      {previewImage.character_id && (
                        <p>關聯角色：{projectCharacters.find(c => c.id === previewImage.character_id)?.name || '未知角色'}</p>
                      )}
                      {previewImage.branchName && (
                        <p>版本分支：{previewImage.branchName}</p>
                      )}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleDownloadImage(previewImage.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
                    >
                      📥 下載
                    </button>
                    {previewImage.versionId && (
                      <button
                        onClick={() => handleViewVersionHistory(previewImage.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
                      >
                        🕰️ 版本歷史
                      </button>
                    )}
                  </div>
                </div>

                {/* 版本標籤 */}
                {previewImage.versionTags && previewImage.versionTags.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-cosmic-700">
                    <span className="text-sm text-cosmic-300 mr-2">標籤：</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {previewImage.versionTags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gold-600/20 text-gold-400 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 批次導出模態框 */}
      {showBatchExportModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleCloseBatchExport}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-cosmic-900 rounded-lg shadow-2xl border border-cosmic-600 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-cosmic-700 bg-cosmic-800">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📦</div>
                <div>
                  <h2 className="text-xl font-cosmic text-gold-500">批次導出系統</h2>
                  <p className="text-sm text-cosmic-400">導出 {selectedImages.size} 張圖片，享受企業級批次處理體驗</p>
                </div>
              </div>
              <button
                onClick={handleCloseBatchExport}
                className="w-8 h-8 flex items-center justify-center bg-cosmic-700 hover:bg-cosmic-600 text-white rounded-full transition-colors"
                title="關閉"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                <BatchExportPanel
                  selectedImageIds={selectedImageIdsArray}
                  availableImages={availableImages}
                  className="shadow-none border-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 圖片命名面板 */}
      {showImageNamingPanel && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleCloseImageNaming}
        >
          <div 
            className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageNamingPanel
              selectedImageIds={selectedImageIdsArray}
              onClose={handleCloseImageNaming}
              onApply={handleApplyRename}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
      
      {/* 電子書排版預備面板 */}
      {showEbookPreparationPanel && currentProject && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          style={{ zIndex: 999999 }}
          onClick={handleCloseEbookPreparation}
        >
          <div
            className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-cosmic-900 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <EbookPreparationPanel
              selectedImageIds={selectedImageIdsArray}
              illustrations={filteredIllustrations}
              onClose={handleCloseEbookPreparation}
              className="w-full h-full"
            />
          </div>
        </div>,
        document.body
      )}

      {/* 電子書整合面板 */}
      {showEbookIntegrationPanel && currentProject && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          style={{ zIndex: 9999 }}
          onClick={handleCloseEbookIntegration}
        >
          <div 
            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <EbookIntegrationPanel
              projectId={currentProject.id}
              onClose={handleCloseEbookIntegration}
              onExportToEbook={handleExportToEbook}
              className="w-full h-full"
            />
          </div>
        </div>,
        document.body
      )}
      
      {/* 刪除確認對話框 */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        selectedImages={filteredIllustrations.filter(img => selectedImages.has(img.id))}
        onClose={handleCloseDeleteConfirmation}
        onConfirm={handleConfirmDeleteSafe}
        isDeleting={isDeleting}
      />
    </div>
  );
};

// 用錯誤邊界包裝組件以防止崩潰
const GalleryTabWithErrorBoundary: React.FC<GalleryTabProps> = (props) => {
  return (
    <SimpleErrorBoundary context="圖庫管理">
      <GalleryTab {...props} />
    </SimpleErrorBoundary>
  );
};

export default GalleryTabWithErrorBoundary;