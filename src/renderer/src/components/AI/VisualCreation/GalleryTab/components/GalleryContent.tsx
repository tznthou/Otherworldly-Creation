import React from 'react';
import { SafeImage } from '../../../../UI/SafeImage';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { IllustrationHistoryItem } from '../../../../../types/illustration';
import type { Character } from '../../../../../types/character';
import VirtualizedImageGrid from '../VirtualizedImageGrid';
import VirtualizedContainer from '../VirtualizedContainer';
import { formatDateTime } from '../../../../../utils/dateUtils';

interface GalleryContentProps {
  loading: boolean;
  versionLoading: boolean;
  filteredIllustrations: IllustrationHistoryItem[];
  selectedImages: Set<string>;
  viewMode: 'grid' | 'list';
  projectCharacters: Character[];
  
  // 事件處理
  onToggleImageSelection: (imageId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onPreviewImage: (imageId: string) => void;
  onDownloadImage: (imageId: string) => void;
  onViewVersionHistory: (imageId: string) => void;
  onCreateVariant: (imageId: string) => void;
}

const GalleryContent: React.FC<GalleryContentProps> = ({
  loading,
  versionLoading,
  filteredIllustrations,
  selectedImages,
  viewMode,
  projectCharacters,
  onToggleImageSelection,
  onDragEnd,
  onPreviewImage,
  onDownloadImage,
  onViewVersionHistory,
  onCreateVariant,
}) => {
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

  // 獲取角色名稱
  const getCharacterName = (characterId?: string) => {
    if (!characterId) return '無角色';
    const char = projectCharacters.find(c => c.id === characterId);
    return char?.name || '未知角色';
  };

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

  if (loading || versionLoading) {
    return (
      <div className="flex-1 bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-cosmic-400">載入插畫和版本數據中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (filteredIllustrations.length === 0) {
    return (
      <div className="flex-1 bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-6xl mb-6">🖼️</div>
          <h3 className="text-xl font-cosmic text-cosmic-300 mb-2">尚無插畫</h3>
          <p className="text-cosmic-400 mb-4">開始創建您的第一張插畫吧！</p>
          <button className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors">
            🎨 開始創作
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <div className="h-full overflow-y-auto">
          {viewMode === 'grid' ? (
            // 虛擬化網格視圖
            <VirtualizedContainer>
              {({ width, height }) => (
                <VirtualizedImageGrid
                  illustrations={filteredIllustrations}
                  selectedImages={selectedImages}
                  onToggleSelection={onToggleImageSelection}
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
                    onClick={() => onToggleImageSelection(item.id)}
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
                        <SafeImage
                          imageUrl={item.image_url}
                          localFilePath={item.local_file_path}
                          alt={item.original_prompt}
                          className="w-full h-full object-cover"
                          fallbackIcon="🎨"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cosmic-400 text-xl">
                          {getStatusIcon(item.status)}
                        </div>
                      )}
                      
                      {/* 版本標識 */}
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
                        
                        {/* 版本狀態標識 */}
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
                        {/* 版本信息 */}
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
                      {/* 版本操作 */}
                      {item.versionId && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewVersionHistory(item.id);
                            }}
                            className="p-1 text-cosmic-400 hover:text-white transition-colors"
                            title="查看版本歷史"
                          >
                            🕰️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateVariant(item.id);
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
                          onPreviewImage(item.id);
                        }}
                        className="p-1 text-cosmic-400 hover:text-white transition-colors"
                        title="預覽"
                      >
                        👁️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadImage(item.id);
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
    </div>
  );
};

export default GalleryContent;