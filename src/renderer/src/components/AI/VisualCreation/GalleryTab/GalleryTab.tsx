import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { convertFileSrc } from '@tauri-apps/api/core';
import { SafeImage } from '../../../UI/SafeImage';
import type { RootState, AppDispatch } from '../../../../store/store';
import type { IllustrationHistoryItem } from '../../../../types/illustration';
import type { ImageVersion } from '../../../../types/versionManagement';
import {
  exportSelectedImages,
  setSelectedImageIds,
  setActiveTab,
} from '../../../../store/slices/visualCreationSlice';
import { api } from '../../../../api';
import { formatDateTime } from '../../../../utils/dateUtils';
import { useVersionManager } from '../../../../hooks/illustration/useVersionManager';
import { 
  setCurrentVersion,
  setSelectedVersionIds as setVersionSelectedIds 
} from '../../../../store/slices/versionManagementSlice';
import BatchExportPanel from '../panels/BatchExportPanel';
import ImageNamingPanel from '../ImageNaming/ImageNamingPanel';
import EbookIntegrationPanel from '../EbookIntegration/EbookIntegrationPanel';
import { createPortal } from 'react-dom';
import DeleteConfirmationModal from '../DeleteConfirmation/DeleteConfirmationModal';
import type { BatchRenameOperation, EbookExportConfig } from '../../../../types/imageMetadata';
import type { DeleteIllustrationRequest } from '../../../../api/types';
import { useGalleryData } from '../../../../hooks/gallery/useGalleryData';
import GalleryHeader from './components/GalleryHeader';
import GalleryContent from './components/GalleryContent';

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
    loading: versionLoading,
    error: _versionError
  } = useVersionManager();
  
  // 使用新的數據管理 Hook
  const {
    illustrationHistory,
    loading,
    error: _error,
    fetchIllustrationHistory,
    refetchData,
    updateIllustrationHistory,
  } = useGalleryData(currentProject, versions);
  
  // 本地狀態
  const selectedImages = new Set(selectedImageIds);
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // 版本操作函數
  const handleCreateVariant = async (imageId: string) => {
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
        console.log('✅ 創建變體成功');
        refetchData();
      } else {
        console.error('❌ 創建變體失敗:', result.message);
      }
    } catch (error) {
      console.error('❌ 創建變體時發生錯誤:', error);
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
      console.log('✅ 切換到版本管理標籤頁:', {
        imageId: imageId,
        versionId: illustration.versionId,
        rootVersionId: illustration.rootVersionId,
        prompt: illustration.original_prompt.slice(0, 50)
      });
    } catch (error) {
      console.error('❌ 查看版本歷史時發生錯誤:', error);
    }
  };

  // 預覽圖像功能
  const handlePreviewImage = (imageId: string) => {
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
      const imageUrl = illustration.image_url || (illustration.local_file_path ? convertFileSrc(illustration.local_file_path) : '');
      if (!imageUrl) {
        console.error('圖像 URL 不存在');
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

      console.log('✅ 圖像下載已觸發:', filename);
    } catch (error) {
      console.error('❌ 下載圖像時發生錯誤:', error);
    }
  };

  // 刪除選中的圖片
  const handleDeleteSelected = () => {
    if (selectedImages.size === 0) {
      alert('請先選擇要刪除的圖片');
      return;
    }
    setShowDeleteConfirmation(true);
  };

  // 處理刪除確認
  const handleConfirmDelete = async (request: DeleteIllustrationRequest) => {
    setIsDeleting(true);
    try {
      console.log('執行刪除操作:', request);
      
      const response = await api.illustration.deleteIllustrations(request);
      
      if (response.success) {
        updateIllustrationHistory(prev => 
          prev.filter(item => !response.deletedImageIds.includes(item.id))
        );
        
        dispatch(setSelectedImageIds([]));
        
        const successMessage = `✅ ${response.message}\n${response.deletedToPath ? `位置: ${response.deletedToPath}` : ''}\n${response.failedCount > 0 ? `\n失敗: ${response.failedCount} 張` : ''}`;

        alert(successMessage);
        setShowDeleteConfirmation(false);
      } else {
        alert('刪除失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('刪除圖片失敗:', error);
      alert('刪除失敗，請稍後再試');
    } finally {
      setIsDeleting(false);
    }
  };

  // 關閉刪除確認對話框
  const handleCloseDeleteConfirmation = () => {
    if (!isDeleting) {
      setShowDeleteConfirmation(false);
    }
  };

  // 拖拽結束處理
  const handleDragEnd = (event: DragEndEvent) => {
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

  // 導出選中圖像
  const handleExportSelected = async () => {
    if (selectedImages.size === 0) return;
    
    const selectedIds = Array.from(selectedImages);
    try {
      await dispatch(exportSelectedImages({ 
        selectedImageIds: selectedIds 
      })).unwrap();
    } catch (error) {
      console.error('導出失敗:', error);
    }
  };

  // 切換圖像選擇
  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    dispatch(setSelectedImageIds(Array.from(newSelected)));
  };

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
      alert('請先選擇要重命名的圖片');
      return;
    }
    setShowImageNamingPanel(true);
  };
  const handleCloseImageNaming = () => setShowImageNamingPanel(false);
  const handleOpenEbookIntegration = () => {
    if (!currentProject) {
      alert('請先選擇一個專案');
      return;
    }
    setShowEbookIntegrationPanel(true);
  };
  const handleCloseEbookIntegration = () => setShowEbookIntegrationPanel(false);

  // 應用批次重命名
  const handleApplyRename = async (operation: BatchRenameOperation) => {
    try {
      console.log('應用批次重命名:', operation);
      alert(`🎉 重命名預覽完成！\n\n將會重命名 ${operation.imageIds.length} 張圖片\n\n⚠️ 實際重命名功能需要後端API支援`);
      setShowImageNamingPanel(false);
    } catch (error) {
      console.error('批次重命名失敗:', error);
      alert('重命名失敗，請稍後再試');
    }
  };

  // 匯出到電子書
  const handleExportToEbook = async (config: EbookExportConfig) => {
    try {
      console.log('匯出到電子書:', config);
      const enabledPlacements = Object.entries(config.imagePlacementRules)
        .filter(([_, rule]) => rule.enabled)
        .map(([placement]) => placement)
        .join(', ');
      
      alert(`📚 電子書整合配置已保存！\n\n品質: ${config.imageQuality}%\n最大尺寸: ${config.maxImageWidth}x${config.maxImageHeight}\n啟用位置: ${enabledPlacements}\n\n⚠️ 實際整合功能需要EPUB/PDF模組支援`);
      setShowEbookIntegrationPanel(false);
    } catch (error) {
      console.error('電子書整合失敗:', error);
      alert('電子書整合失敗，請稍後再試');
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
  const availableImages = filteredIllustrations.map(item => ({
    id: item.id,
    url: item.image_url || (item.local_file_path ? convertFileSrc(item.local_file_path) : '') || '',
    name: item.original_prompt.slice(0, 30).replace(/[^\w\s-]/g, '').trim() || `illustration_${item.id}`
  }));

  return (
    <div className={`gallery-tab flex flex-col h-full ${className}`}>
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
        onOpenEbookIntegration={handleOpenEbookIntegration}
        onOpenBatchExport={handleOpenBatchExport}
        onExportSelected={handleExportSelected}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* 主要內容區域 */}
      <GalleryContent
        loading={loading}
        versionLoading={versionLoading}
        filteredIllustrations={filteredIllustrations}
        selectedImages={selectedImages}
        viewMode={viewMode}
        projectCharacters={projectCharacters}
        onToggleImageSelection={toggleImageSelection}
        onDragEnd={handleDragEnd}
        onPreviewImage={handlePreviewImage}
        onDownloadImage={handleDownloadImage}
        onViewVersionHistory={handleViewVersionHistory}
        onCreateVariant={handleCreateVariant}
      />

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
                  localFilePath={previewImage.local_file_path}
                  alt={previewImage.original_prompt}
                  className="w-full h-full object-contain max-h-[60vh] rounded"
                  onLoad={() => console.log('預覽圖像載入完成')}
                  onError={() => console.error('預覽圖像載入失敗')}
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
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default GalleryTab;