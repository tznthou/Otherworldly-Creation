import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store/store';
import { useAppDispatch } from '../../../../../hooks/redux';
import { IllustrationHistoryItem } from '../../../../../types/illustration';
import { EbookImagePosition } from '../../../../../types/ebookPreparation';
import { SafeImage } from '../../../../UI/SafeImage';
import { createLogger } from '../../../../../utils/logger';
import { useEbookPreparationPersistence } from '../../../../../hooks/useEbookPreparationPersistence';
import {
  addImageToCategory,
  removeImageFromCategory,
  addChapterConfiguration
} from '../../../../../store/slices/ebookPreparationSlice';

const log = createLogger('ChapterConfigurationPanel');

interface ChapterConfigurationPanelProps {
  selectedImages: IllustrationHistoryItem[];
  projectId: string;
}

const ChapterConfigurationPanel: React.FC<ChapterConfigurationPanelProps> = ({
  selectedImages,
  projectId
}) => {
  const dispatch = useAppDispatch();
  const chapters = useSelector((state: RootState) => state.chapters.chapters);
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const ebookConfig = useSelector((state: RootState) => state.ebookPreparation.currentConfig);

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  // 使用持久化 hook
  const { initializeForProject, saveToStorage, isInitialized } = useEbookPreparationPersistence(projectId, true);

  // 初始化配置（如果需要）
  useEffect(() => {
    if (!isInitialized && currentProject) {
      initializeForProject(currentProject.name, 'Unknown');
    }
  }, [isInitialized, currentProject, initializeForProject]);

  // 確保所有章節都有配置條目
  useEffect(() => {
    if (!ebookConfig) return;

    chapters
      .filter(ch => ch.projectId === projectId)
      .forEach(chapter => {
        const exists = ebookConfig.chapterConfigurations.some(c => c.chapterId === chapter.id);
        if (!exists) {
          dispatch(addChapterConfiguration({
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            chapterNumber: chapter.order
          }));
        }
      });
  }, [chapters, projectId, ebookConfig, dispatch]);

  const projectChapters = useMemo(() => {
    return chapters.filter(ch => ch.projectId === projectId).sort((a, b) => a.order - b.order);
  }, [chapters, projectId]);

  const positionOptions = [
    { value: EbookImagePosition.ChapterHeader, label: '章節開頭', icon: '📖', color: 'bg-blue-500' },
    { value: EbookImagePosition.ChapterEnd, label: '章節結尾', icon: '📄', color: 'bg-green-500' },
    { value: EbookImagePosition.InlineText, label: '文中插圖', icon: '🖼️', color: 'bg-purple-500' },
    { value: EbookImagePosition.FullPage, label: '全頁插圖', icon: '🎨', color: 'bg-orange-500' },
    { value: EbookImagePosition.SceneIllustration, label: '場景插圖', icon: '🏞️', color: 'bg-teal-500' }
  ];

  // 從 Redux config 計算已分配的圖片 IDs
  const assignedImageIds = useMemo(() => {
    if (!ebookConfig) return new Set<string>();
    const ids = new Set<string>();
    ebookConfig.chapterConfigurations.forEach(config => {
      config.images.forEach(img => ids.add(img.imageId));
    });
    return ids;
  }, [ebookConfig]);

  const unassignedImages = useMemo(() => {
    return selectedImages.filter(img => !assignedImageIds.has(img.id));
  }, [selectedImages, assignedImageIds]);

  // 獲取選中章節的配置
  const _selectedChapterConfig = useMemo(() => {
    if (!selectedChapterId || !ebookConfig) return null;
    return ebookConfig.chapterConfigurations.find(c => c.chapterId === selectedChapterId) || null;
  }, [selectedChapterId, ebookConfig]);

  const handleDragStart = useCallback((imageId: string) => {
    setDraggedImageId(imageId);
    log.debug('開始拖動圖片:', imageId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedImageId(null);
  }, []);

  const handleDropToChapter = useCallback((chapterId: string, position: EbookImagePosition) => {
    if (!draggedImageId || !ebookConfig) return;

    log.debug('放置圖片到章節:', { chapterId, position, imageId: draggedImageId });

    try {
      // 獲取該章節該位置已有的圖片數量，用於設定 order
      const chapterConfig = ebookConfig.chapterConfigurations.find(c => c.chapterId === chapterId);
      const existingImages = chapterConfig?.images.filter(img => img.position === position) || [];

      // 使用 Redux action
      dispatch(addImageToCategory({
        imageId: draggedImageId,
        position,
        chapterId,
        order: existingImages.length
      }));
    } catch (error) {
      log.error('新增圖片到章節失敗:', error);
    }

    setDraggedImageId(null);
  }, [draggedImageId, ebookConfig, dispatch]);

  const handleRemoveImageFromChapter = useCallback((chapterId: string, imageId: string) => {
    try {
      dispatch(removeImageFromCategory({
        imageId,
        chapterId
      }));
    } catch (error) {
      log.error('移除圖片失敗:', error);
    }
  }, [dispatch]);

  const handleUpdateImageOrder = useCallback((chapterId: string, imageId: string, newOrder: number) => {
    if (!ebookConfig) return;

    const chapterConfig = ebookConfig.chapterConfigurations.find(c => c.chapterId === chapterId);
    if (!chapterConfig) return;

    const imageConfig = chapterConfig.images.find(img => img.imageId === imageId);
    if (!imageConfig) return;

    try {
      // 移除舊的圖片配置
      dispatch(removeImageFromCategory({ imageId, chapterId }));

      // 重新添加新的 order
      dispatch(addImageToCategory({
        imageId,
        position: imageConfig.position,
        chapterId,
        order: newOrder
      }));
    } catch (error) {
      log.error('更新圖片順序失敗:', error);
    }
  }, [ebookConfig, dispatch]);

  const getImageById = useCallback((imageId: string) => {
    return selectedImages.find(img => img.id === imageId);
  }, [selectedImages]);

  const stats = useMemo(() => {
    const totalImages = selectedImages.length;
    const assignedCount = assignedImageIds.size;
    const unassignedCount = totalImages - assignedCount;
    const configuredChapters = ebookConfig?.chapterConfigurations.filter(c => c.images.length > 0).length || 0;

    return { totalImages, assignedCount, unassignedCount, configuredChapters };
  }, [selectedImages.length, assignedImageIds, ebookConfig]);

  // 手動保存配置
  const handleSaveConfig = useCallback(() => {
    saveToStorage();
    log.info('✅ 配置已手動保存');
  }, [saveToStorage]);

  if (projectChapters.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">📚</div>
        <p className="text-text-secondary/80">此專案尚無章節</p>
        <p className="text-sm text-text-secondary mt-2">請先在編輯器中建立章節</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計資訊 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <h4 className="text-base font-medium text-text-secondary/20 mb-3 flex items-center">
          <span className="text-xl mr-2">📊</span>
          配置統計
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">總圖片數</div>
            <div className="text-lg font-semibold text-text-secondary/20">{stats.totalImages}</div>
          </div>
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">已分配</div>
            <div className="text-lg font-semibold text-green-400">{stats.assignedCount}</div>
          </div>
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">未分配</div>
            <div className="text-lg font-semibold text-orange-400">{stats.unassignedCount}</div>
          </div>
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">已配置章節</div>
            <div className="text-lg font-semibold text-text-secondary/20">{stats.configuredChapters}/{projectChapters.length}</div>
          </div>
        </div>
      </div>

      {/* 使用說明 */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-warm-gold/40 rounded-lg p-4">
        <h4 className="text-warm-gold font-medium mb-2 flex items-center">
          <span className="text-xl mr-2">💡</span>
          使用說明
        </h4>
        <ul className="text-warm-gold/80 text-sm space-y-1">
          <li>• 從左側未分配圖片區拖動圖片到章節的位置區域</li>
          <li>• 每個章節可以設定多張圖片，不同位置</li>
          <li>• 點擊章節查看該章節的圖片配置詳情</li>
          <li>• 可以調整圖片在章節中的顯示順序</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：未分配圖片區 */}
        <div className="lg:col-span-1">
          <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4 sticky top-4">
            <h4 className="text-base font-medium text-text-secondary/20 mb-4 flex items-center">
              <span className="text-xl mr-2">🖼️</span>
              未分配圖片 ({unassignedImages.length})
            </h4>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unassignedImages.length === 0 ? (
                <div className="text-center py-8 text-text-secondary/80">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm">所有圖片已分配</p>
                </div>
              ) : (
                unassignedImages.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => handleDragStart(image.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-bg-light/40 rounded-lg p-2 cursor-move hover:bg-bg-dark/80 transition-colors border border-warm-gold/20 ${
                      draggedImageId === image.id ? 'opacity-50 ring-2 ring-warm-gold' : ''
                    }`}
                  >
                    <SafeImage
                      imageUrl={image.image_url && image.image_url.startsWith('http') ? image.image_url : undefined}
                      localFilePath={image.local_file_path || image.image_path}
                      alt={`Image ${index + 1}`}
                      className="w-full aspect-video object-cover rounded mb-2"
                      loading="lazy"
                      fallbackIcon="🎨"
                    />
                    <p className="text-xs text-text-secondary truncate">
                      {image.original_prompt?.slice(0, 50) || `圖片 ${index + 1}`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右側：章節列表 */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {projectChapters.map((chapter, index) => {
              const config = ebookConfig?.chapterConfigurations.find(c => c.chapterId === chapter.id);
              const imageCount = config?.images.length || 0;
              const isSelected = selectedChapterId === chapter.id;

              return (
                <div key={chapter.id} className="bg-bg-light/50 backdrop-blur-sm rounded-lg border border-warm-gold/10">
                  {/* 章節標題列 */}
                  <div
                    className="p-4 cursor-pointer hover:bg-bg-dark/80 transition-colors"
                    onClick={() => setSelectedChapterId(isSelected ? null : chapter.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{isSelected ? '📖' : '📕'}</span>
                        <div>
                          <h5 className="font-medium text-text-secondary/40">
                            第 {index + 1} 章：{chapter.title}
                          </h5>
                          <p className="text-xs text-text-secondary/80">
                            {imageCount > 0 ? `已配置 ${imageCount} 張圖片` : '尚未配置圖片'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {imageCount > 0 && (
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                            {imageCount} 張
                          </span>
                        )}
                        <span className="text-text-secondary/80">
                          {isSelected ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 展開的章節配置區 */}
                  {isSelected && (
                    <div className="border-t border-warm-gold/10 p-4 space-y-4">
                      {/* 位置區域 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {positionOptions.map(pos => {
                          const posImages = config?.images.filter(img => img.position === pos.value) || [];

                          return (
                            <div
                              key={pos.value}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDropToChapter(chapter.id, pos.value)}
                              className={`border-2 border-dashed rounded-lg p-3 min-h-24 transition-all ${
                                draggedImageId
                                  ? 'border-warm-gold bg-warm-gold/10 hover:bg-warm-gold/20'
                                  : 'border-warm-gold/20 bg-bg-light/40'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-lg">{pos.icon}</span>
                                <span className="text-sm font-medium text-text-secondary/40">{pos.label}</span>
                                <span className="text-xs text-text-secondary/80">({posImages.length})</span>
                              </div>

                              {posImages.length === 0 ? (
                                <div className="text-center py-4 text-xs text-text-secondary/80">
                                  拖動圖片到此處
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {posImages.map((imgConfig) => {
                                    const image = getImageById(imgConfig.imageId);
                                    if (!image) return null;

                                    return (
                                      <div key={imgConfig.imageId} className="bg-bg-dark/80 rounded p-2 flex items-center space-x-2">
                                        <SafeImage
                                          imageUrl={image.image_url && image.image_url.startsWith('http') ? image.image_url : undefined}
                                          localFilePath={image.local_file_path || image.image_path}
                                          alt="Preview"
                                          className="w-12 h-12 object-cover rounded"
                                          loading="lazy"
                                          fallbackIcon="🎨"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-text-secondary truncate">
                                            {image.original_prompt?.slice(0, 30) || 'Image'}
                                          </p>
                                          <div className="flex items-center space-x-2 mt-1">
                                            <label className="text-xs text-text-secondary/80">順序:</label>
                                            <input
                                              type="number"
                                              min="0"
                                              value={imgConfig.order}
                                              onChange={(e) => handleUpdateImageOrder(chapter.id, imgConfig.imageId, parseInt(e.target.value) || 0)}
                                              className="w-12 px-1 py-0.5 bg-bg-light/40 text-text-secondary/20 rounded text-xs"
                                            />
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleRemoveImageFromChapter(chapter.id, imgConfig.imageId)}
                                          className="text-red-400 hover:text-red-300 text-xs p-1"
                                          title="移除"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部操作列 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary/80">
            配置完成度: {stats.configuredChapters}/{projectChapters.length} 章節
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                log.debug('📋 [章節配置] 目前配置:', ebookConfig);
              }}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-light/50 backdrop-blur-sm hover:bg-bg-dark/80 rounded-lg transition-colors"
            >
              查看配置
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={stats.assignedCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterConfigurationPanel;
