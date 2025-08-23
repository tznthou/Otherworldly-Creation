import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { RootState, AppDispatch } from '../../../../store/store';
import type { IllustrationHistoryItem } from '../../../../types/illustration';
import type { ImageVersion } from '../../../../types/versionManagement';
import {
  setShowExportPanel,
  exportSelectedImages,
  setSelectedImageIds,
  setActiveTab,
} from '../../../../store/slices/visualCreationSlice';
import VirtualizedImageGrid from './VirtualizedImageGrid';
import VirtualizedContainer from './VirtualizedContainer';
import { api } from '../../../../api';
import { formatDateTime } from '../../../../utils/dateUtils';
import { useVersionManager } from '../../../../hooks/illustration/useVersionManager';
import { 
  setCurrentVersion,
  setSelectedVersionIds as setVersionSelectedIds 
} from '../../../../store/slices/versionManagementSlice';
import BatchExportPanel from '../panels/BatchExportPanel';

interface GalleryTabProps {
  className?: string;
}

const GalleryTab: React.FC<GalleryTabProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux 狀態
  const { isExporting, exportProgress, selectedImageIds } = useSelector((state: RootState) => state.visualCreation);
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 版本管理 Hook (Phase 4.3 新增)
  const {
    versions,
    createVersion,
    loading: versionLoading,
    error: _versionError
  } = useVersionManager();
  
  // 本地狀態（從 Redux 中獲取選中的圖像）
  const selectedImages = new Set(selectedImageIds);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterProvider, setFilterProvider] = useState<'all' | 'pollinations' | 'imagen'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');
  
  // 版本管理篩選器 (Phase 4.3 新增)
  const [filterVersions, setFilterVersions] = useState<'all' | 'latest' | 'original' | 'multiple'>('all');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'provider' | 'type' | 'version' | 'custom'>('date');
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // 圖像預覽狀態 (Phase 4.3 新增)
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<IllustrationHistoryItem | null>(null);
  
  // 批次導出模態框狀態 (Phase 5 新增)
  const [showBatchExportModal, setShowBatchExportModal] = useState(false);
  
  // 插畫歷史數據（從API獲取）
  const [illustrationHistory, setIllustrationHistory] = useState<IllustrationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  // 項目角色映射
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

  // 拖拽感應器設置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 版本數據映射函數 (Phase 4.3 新增)
  const enrichWithVersionData = (illustration: IllustrationHistoryItem): IllustrationHistoryItem => {
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
  };

  // 獲取插畫歷史
  const fetchIllustrationHistory = useCallback(async () => {
    if (!currentProject || loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const history = await api.illustration.getIllustrationHistory(
        currentProject.id,
        undefined, // characterId - 獲取所有角色的插畫
        100, // limit - 獲取最近100張
        0 // offset
      );
      
      // 整合版本管理數據 (Phase 4.3)
      const enrichedHistory = history.map(enrichWithVersionData);
      
      setIllustrationHistory(enrichedHistory);
    } catch (err) {
      console.error('獲取插畫歷史失敗:', err);
      setError(err instanceof Error ? err.message : '獲取插畫歷史失敗');
    } finally {
      setLoading(false);
    }
  }, [currentProject, loading]);

  // 當專案變更時重新獲取數據
  useEffect(() => {
    if (currentProject) {
      fetchIllustrationHistory();
    } else {
      setIllustrationHistory([]);
    }
  }, [currentProject, fetchIllustrationHistory, versions]); // 添加缺失的依賴

  // 獲取角色名稱
  const getCharacterName = (characterId?: string) => {
    if (!characterId) return '無角色';
    const char = projectCharacters.find(c => c.id === characterId);
    return char?.name || '未知角色';
  };
  
  // 格式化版本號顯示 (Phase 4.3 新增)
  const formatVersionNumber = (versionNumber?: number) => {
    if (!versionNumber) return '';
    return `v${versionNumber.toFixed(1)}`;
  };
  
  // 獲取版本類型圖標 (Phase 4.3 新增)
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
      
      // 版本過濾 (Phase 4.3 新增)
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
      
      // 搜索過濾 (擴展版本搜索)
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
      // 自定義排序（拖拽排序）
      const orderMap = Object.fromEntries(customOrder.map((id, index) => [id, index]));
      filtered.sort((a, b) => {
        const orderA = orderMap[a.id] ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap[b.id] ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    } else {
      // 標準排序
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'provider':
            return a.provider.localeCompare(b.provider);
          case 'type':
            return a.model.localeCompare(b.model);
          case 'version': { // Phase 4.3 新增
            // 先按版本數量排序，再按版本號排序
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

  // 版本操作函數 (Phase 4.3 新增)
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
        // 重新獲取數據
        fetchIllustrationHistory();
      } else {
        console.error('❌ 創建變體失敗:', result.message);
      }
    } catch (error) {
      console.error('❌ 創建變體時發生錯誤:', error);
    }
  };
  
  // 查看版本歷史功能 (Phase 4.3 新增)
  const handleViewVersionHistory = (imageId: string) => {
    const illustration = illustrationHistory.find(item => item.id === imageId);
    if (!illustration) return;

    try {
      // 如果有版本 ID，設置為當前版本
      if (illustration.versionId) {
        dispatch(setCurrentVersion(illustration.versionId));
        dispatch(setVersionSelectedIds([illustration.versionId]));
      }

      // 切換到版本管理標籤頁
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

  // 預覽圖像功能 (Phase 4.3 新增)
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


  // 下載圖像功能 (Phase 4.3 新增)
  const handleDownloadImage = (imageId: string) => {
    const illustration = illustrationHistory.find(item => item.id === imageId);
    if (!illustration) return;

    try {
      // 獲取圖像 URL
      const imageUrl = illustration.image_url || (illustration.local_file_path ? `file://${illustration.local_file_path}` : '');
      if (!imageUrl) {
        console.error('圖像 URL 不存在');
        return;
      }

      // 生成智能檔案名：提示詞_版本號_ID.png
      const promptPart = illustration.original_prompt.slice(0, 30).replace(/[^\w\s-]/g, '').trim();
      const versionPart = illustration.versionNumber ? `v${illustration.versionNumber.toFixed(1)}` : 'v1.0';
      const idPart = illustration.id.slice(0, 8);
      const filename = `${promptPart}_${versionPart}_${idPart}.png`;

      // 創建下載連結
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

  // 開啟導出設定面板 - 未使用，保留供未來使用
  const _handleOpenExportSettings = () => {
    dispatch(setShowExportPanel(true));
  };

  const filteredIllustrations = getFilteredIllustrations();

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

  // 預覽鍵盤事件處理 (Phase 4.3 新增)
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

  // 獲取狀態圖標和名稱
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      default: return '❓';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'completed': return '完成';
      case 'failed': return '失敗';
      case 'pending': return '等待';
      case 'processing': return '處理中';
      default: return '未知';
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

  // 格式化日期 - JavaScript 自動處理 UTC 到本地時區的轉換
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

  // 準備BatchExportPanel所需的數據 (Phase 5 新增)
  const selectedImageIdsArray = Array.from(selectedImages);
  const availableImages = filteredIllustrations.map(item => ({
    id: item.id,
    url: item.image_url || `file://${item.local_file_path}` || '',
    name: item.original_prompt.slice(0, 30).replace(/[^\w\s-]/g, '').trim() || `illustration_${item.id}`
  }));

  // 打開批次導出模態框
  const handleOpenBatchExport = () => {
    setShowBatchExportModal(true);
  };

  // 關閉批次導出模態框
  const handleCloseBatchExport = () => {
    setShowBatchExportModal(false);
  };

  return (
    <div className={`gallery-tab flex flex-col h-full ${className}`}>
      {/* 頂部控制欄 */}
      <div className="flex-shrink-0 bg-cosmic-800/30 rounded-lg p-4 mb-4 border border-cosmic-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 搜索和過濾器 */}
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            {/* 搜索框 */}
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索插畫（提示詞、版本號、標籤）..."
                className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white placeholder-cosmic-400 text-sm"
              />
            </div>
            
            {/* 過濾器 */}
            <div className="flex gap-2">
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value as 'all' | 'pollinations' | 'imagen')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="all">所有服務</option>
                <option value="pollinations">Pollinations (免費)</option>
                <option value="imagen">Imagen (付費)</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'failed')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="all">所有狀態</option>
                <option value="completed">已完成</option>
                <option value="failed">失敗</option>
              </select>
              
              {/* 版本篩選器 (Phase 4.3 新增) */}
              <select
                value={filterVersions}
                onChange={(e) => setFilterVersions(e.target.value as 'all' | 'latest' | 'original' | 'multiple')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="all">所有版本</option>
                <option value="latest">僅最新版本</option>
                <option value="original">僅原創版本</option>
                <option value="multiple">有多版本</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'provider' | 'type' | 'version' | 'custom')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="date">按日期排序</option>
                <option value="provider">按服務排序</option>
                <option value="type">按模型排序</option>
                <option value="version">按版本排序</option>
                <option value="custom">自定義排序 {sortBy === 'custom' && '✓'}</option>
              </select>
            </div>
          </div>
          
          {/* 視圖控制和操作 */}
          <div className="flex items-center gap-2">
            {/* 視圖模式切換 */}
            <div className="flex bg-cosmic-700 rounded p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-gold-600 text-white' 
                    : 'text-cosmic-300 hover:text-white'
                }`}
              >
                🔳 網格
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-gold-600 text-white' 
                    : 'text-cosmic-300 hover:text-white'
                }`}
              >
                📋 列表
              </button>
            </div>
            
            {/* 選擇控制 */}
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1 bg-cosmic-700 hover:bg-cosmic-600 text-cosmic-200 rounded text-sm transition-colors"
            >
              {selectedImages.size === filteredIllustrations.length ? '取消全選' : '全選'}
            </button>
          </div>
        </div>
        
        {/* 統計信息 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-cosmic-700/50">
          <div className="flex items-center space-x-4 text-sm text-cosmic-400">
            <span>總共 {filteredIllustrations.length} 張插畫</span>
            <span>•</span>
            <span>已選擇 {selectedImages.size} 張</span>
            {/* 版本統計 (Phase 4.3 新增) */}
            <span>•</span>
            <span>
              {filteredIllustrations.filter(item => item.totalVersions && item.totalVersions > 1).length} 個多版本圖片
            </span>
            {currentProject && (
              <>
                <span>•</span>
                <span>專案: {currentProject.name}</span>
              </>
            )}
          </div>
          
          {selectedImages.size > 0 && (
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleOpenBatchExport}
                className="px-3 py-1 bg-gold-600 hover:bg-gold-700 text-white rounded text-sm transition-colors flex items-center gap-2"
              >
                📦 批次導出 ({selectedImages.size})
              </button>
              <button 
                onClick={handleExportSelected}
                disabled={isExporting}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded text-sm transition-colors"
              >
                {isExporting ? (
                  <>📤 導出中... ({exportProgress}%)</>
                ) : (
                  <>📁 快速導出</>
                )}
              </button>
              <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                🗑️ 刪除選中
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="flex-1 bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden">
        {loading || versionLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-cosmic-400">載入插畫和版本數據中...</p>
            </div>
          </div>
        ) : filteredIllustrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-6">🖼️</div>
            <h3 className="text-xl font-cosmic text-cosmic-300 mb-2">
              {currentProject ? '尚無插畫' : '請選擇專案'}
            </h3>
            <p className="text-cosmic-400 mb-4">
              {currentProject 
                ? '開始創建您的第一張插畫吧！' 
                : '選擇一個專案後即可查看插畫歷史'
              }
            </p>
            {currentProject && (
              <button className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors">
                🎨 開始創作
              </button>
            )}
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full overflow-y-auto">
              {viewMode === 'grid' ? (
                // 虛擬化網格視圖
                <VirtualizedContainer>
                  {({ width, height }) => (
                    <VirtualizedImageGrid
                      illustrations={filteredIllustrations}
                      selectedImages={selectedImages}
                      onToggleSelection={toggleImageSelection}
                      containerWidth={width}
                      containerHeight={height}
                    />
                  )}
                </VirtualizedContainer>
              ) : (
                // 列表視圖（支援拖拽排序）
                <SortableContext 
                  items={filteredIllustrations.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-cosmic-700">
                {filteredIllustrations.map((item) => (
                  <div
                    key={item.id}
                    className={`
                      p-4 flex items-center space-x-4 hover:bg-cosmic-700/30 transition-colors cursor-pointer
                      ${selectedImages.has(item.id) ? 'bg-gold-900/20' : ''}
                    `}
                    onClick={() => toggleImageSelection(item.id)}
                  >
                    {/* 選擇框 */}
                    <div className={`
                      flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs
                      ${selectedImages.has(item.id)
                        ? 'bg-gold-500 border-gold-500 text-white'
                        : 'border-cosmic-500 hover:border-gold-400'
                      }
                    `}>
                      {selectedImages.has(item.id) && '✓'}
                    </div>
                    
                    {/* 縮略圖 */}
                    <div className="flex-shrink-0 w-16 h-16 bg-cosmic-700 rounded overflow-hidden relative">
                      {item.image_url || item.local_file_path ? (
                        <img
                          src={item.image_url || `file://${item.local_file_path}`}
                          alt={item.original_prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cosmic-400 text-xl">
                          {getStatusIcon(item.status)}
                        </div>
                      )}
                      
                      {/* 版本標識 (Phase 4.3 新增) */}
                      {item.versionNumber && (
                        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded flex items-center space-x-1">
                          <span>{getVersionTypeIcon(item.versionType)}</span>
                          <span>{formatVersionNumber(item.versionNumber)}</span>
                          {item.totalVersions && item.totalVersions > 1 && (
                            <span className="text-gold-400">({item.totalVersions})</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* 詳細信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-white truncate">
                          {getStatusName(item.status)} - {item.model}
                        </h4>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs
                          ${item.is_free ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}
                        `}>
                          {item.provider === 'pollinations' ? 'Pollinations' : 'Imagen'}
                        </span>
                        
                        {/* 版本狀態標識 (Phase 4.3 新增) */}
                        {item.versionStatus && item.versionStatus !== 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-600 text-white">
                            {item.versionStatus}
                          </span>
                        )}
                        {item.isLatestVersion && item.totalVersions && item.totalVersions > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-600 text-white">
                            最新
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-cosmic-300 truncate mb-1">
                        {item.enhanced_prompt || item.original_prompt}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-cosmic-400">
                        <span>{formatDate(item.created_at)}</span>
                        <span>{item.width}×{item.height}</span>
                        {item.character_id && (
                          <span>角色: {getCharacterName(item.character_id)}</span>
                        )}
                        {/* 版本信息 (Phase 4.3 新增) */}
                        {item.branchName && (
                          <span>分支: {item.branchName}</span>
                        )}
                        {item.versionTags && item.versionTags.length > 0 && (
                          <span>標籤: {item.versionTags.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按鈕 */}
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      {/* 版本操作 (Phase 4.3 新增) */}
                      {item.versionId && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewVersionHistory(item.id);
                            }}
                            className="p-1 text-cosmic-400 hover:text-white transition-colors"
                            title="查看版本歷史"
                          >
                            🕰️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateVariant(item.id);
                            }}
                            className="p-1 text-cosmic-400 hover:text-white transition-colors"
                            title="創建變體"
                          >
                            🔄
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewImage(item.id);
                        }}
                        className="p-1 text-cosmic-400 hover:text-white transition-colors"
                        title="預覽"
                      >
                        👁️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(item.id);
                        }}
                        className="p-1 text-cosmic-400 hover:text-white transition-colors"
                        title="下載"
                      >
                        📥
                      </button>
                    </div>
                    </div>
                  ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </DndContext>
        )}
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

      {/* 圖像預覽 Modal (Phase 4.3 新增) */}
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
                <img
                  src={previewImage.image_url || `file://${previewImage.local_file_path}`}
                  alt={previewImage.original_prompt}
                  className="w-full h-full object-contain max-h-[60vh] rounded"
                  onLoad={() => console.log('預覽圖像載入完成')}
                  onError={() => console.error('預覽圖像載入失敗')}
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
                        <p>關聯角色：{getCharacterName(previewImage.character_id)}</p>
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
      
      {/* 批次導出模態框 (Phase 5 新增) */}
      {showBatchExportModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleCloseBatchExport}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-cosmic-900 rounded-lg shadow-2xl border border-cosmic-600 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模態框標題欄 */}
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

            {/* BatchExportPanel 內容 */}
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
    </div>
  );
};

export default GalleryTab;