import React, { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store/store';
import { IllustrationHistoryItem } from '../../../../../types/illustration';
import { EbookImagePosition } from '../../../../../types/ebookPreparation';
import { SafeImage } from '../../../../UI/SafeImage';
import { createLogger } from '../../../../../utils/logger';

const log = createLogger('ChapterConfigurationPanel');

interface ChapterConfigurationPanelProps {
  selectedImages: IllustrationHistoryItem[];
  projectId: string;
}

interface ChapterImageConfig {
  chapterId: string;
  images: {
    imageId: string;
    position: EbookImagePosition;
    order: number;
    customSize?: { width: number; height: number };
    caption?: string;
    altText?: string;
  }[];
}

const ChapterConfigurationPanel: React.FC<ChapterConfigurationPanelProps> = ({
  selectedImages,
  projectId
}) => {
  const chapters = useSelector((state: RootState) => state.chapters.chapters);
  const [chapterConfigs, setChapterConfigs] = useState<Record<string, ChapterImageConfig>>({});
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  const projectChapters = useMemo(() => {
    return chapters.filter(ch => ch.projectId === projectId).sort((a, b) => a.order - b.order);
  }, [chapters, projectId]);

  const positionOptions = [
    { value: EbookImagePosition.ChapterHeader, label: '章节开头', icon: '📖', color: 'bg-blue-500' },
    { value: EbookImagePosition.ChapterEnd, label: '章节结尾', icon: '📄', color: 'bg-green-500' },
    { value: EbookImagePosition.InlineText, label: '文中插图', icon: '🖼️', color: 'bg-purple-500' },
    { value: EbookImagePosition.FullPage, label: '全页插图', icon: '🎨', color: 'bg-orange-500' },
    { value: EbookImagePosition.SceneIllustration, label: '场景插图', icon: '🏞️', color: 'bg-teal-500' }
  ];

  const assignedImageIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(chapterConfigs).forEach(config => {
      config.images.forEach(img => ids.add(img.imageId));
    });
    return ids;
  }, [chapterConfigs]);

  const unassignedImages = useMemo(() => {
    return selectedImages.filter(img => !assignedImageIds.has(img.id));
  }, [selectedImages, assignedImageIds]);

  const selectedChapterConfig = useMemo(() => {
    if (!selectedChapterId) return null;
    return chapterConfigs[selectedChapterId] || null;
  }, [selectedChapterId, chapterConfigs]);

  const handleDragStart = useCallback((imageId: string) => {
    setDraggedImageId(imageId);
    log.debug('开始拖动图片:', imageId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedImageId(null);
  }, []);

  const handleDropToChapter = useCallback((chapterId: string, position: EbookImagePosition) => {
    if (!draggedImageId) return;

    log.debug('放置图片到章节:', { chapterId, position, imageId: draggedImageId });

    setChapterConfigs(prev => {
      const config = prev[chapterId] || { chapterId, images: [] };
      const existingIndex = config.images.findIndex(img => img.imageId === draggedImageId);

      if (existingIndex >= 0) {
        config.images[existingIndex].position = position;
      } else {
        config.images.push({
          imageId: draggedImageId,
          position,
          order: config.images.length
        });
      }

      return { ...prev, [chapterId]: config };
    });

    setDraggedImageId(null);
  }, [draggedImageId]);

  const handleRemoveImageFromChapter = useCallback((chapterId: string, imageId: string) => {
    setChapterConfigs(prev => {
      const config = prev[chapterId];
      if (!config) return prev;

      config.images = config.images.filter(img => img.imageId !== imageId);

      if (config.images.length === 0) {
        const newConfigs = { ...prev };
        delete newConfigs[chapterId];
        return newConfigs;
      }

      return { ...prev, [chapterId]: config };
    });
  }, []);

  const handleUpdateImageOrder = useCallback((chapterId: string, imageId: string, newOrder: number) => {
    setChapterConfigs(prev => {
      const config = prev[chapterId];
      if (!config) return prev;

      const imageIndex = config.images.findIndex(img => img.imageId === imageId);
      if (imageIndex === -1) return prev;

      config.images[imageIndex].order = newOrder;
      config.images.sort((a, b) => a.order - b.order);

      return { ...prev, [chapterId]: config };
    });
  }, []);

  const getImageById = useCallback((imageId: string) => {
    return selectedImages.find(img => img.id === imageId);
  }, [selectedImages]);

  const stats = useMemo(() => {
    const totalImages = selectedImages.length;
    const assignedCount = assignedImageIds.size;
    const unassignedCount = totalImages - assignedCount;
    const configuredChapters = Object.keys(chapterConfigs).length;

    return { totalImages, assignedCount, unassignedCount, configuredChapters };
  }, [selectedImages.length, assignedImageIds, chapterConfigs]);

  if (projectChapters.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">📚</div>
        <p className="text-text-secondary/80">此专案尚无章节</p>
        <p className="text-sm text-text-secondary mt-2">请先在编辑器中创建章节</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <h4 className="text-base font-medium text-text-secondary/20 mb-3 flex items-center">
          <span className="text-xl mr-2">📊</span>
          配置统计
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">总图片数</div>
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
            <div className="text-text-secondary/80">已配置章节</div>
            <div className="text-lg font-semibold text-text-secondary/20">{stats.configuredChapters}/{projectChapters.length}</div>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-warm-gold/40 rounded-lg p-4">
        <h4 className="text-warm-gold font-medium mb-2 flex items-center">
          <span className="text-xl mr-2">💡</span>
          使用说明
        </h4>
        <ul className="text-warm-gold/80 text-sm space-y-1">
          <li>• 从左侧未分配图片区拖动图片到章节的位置区域</li>
          <li>• 每个章节可以设置多张图片，不同位置</li>
          <li>• 点击章节查看该章节的图片配置详情</li>
          <li>• 可以调整图片在章节中的显示顺序</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：未分配图片区 */}
        <div className="lg:col-span-1">
          <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4 sticky top-4">
            <h4 className="text-base font-medium text-text-secondary/20 mb-4 flex items-center">
              <span className="text-xl mr-2">🖼️</span>
              未分配图片 ({unassignedImages.length})
            </h4>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unassignedImages.length === 0 ? (
                <div className="text-center py-8 text-text-secondary/80">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm">所有图片已分配</p>
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
                      {image.original_prompt?.slice(0, 50) || `图片 ${index + 1}`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：章节列表 */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {projectChapters.map((chapter, index) => {
              const config = chapterConfigs[chapter.id];
              const imageCount = config?.images.length || 0;
              const isSelected = selectedChapterId === chapter.id;

              return (
                <div key={chapter.id} className="bg-bg-light/50 backdrop-blur-sm rounded-lg border border-warm-gold/10">
                  {/* 章节标题栏 */}
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
                            {imageCount > 0 ? `已配置 ${imageCount} 张图片` : '尚未配置图片'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {imageCount > 0 && (
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                            {imageCount} 张
                          </span>
                        )}
                        <span className="text-text-secondary/80">
                          {isSelected ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 展开的章节配置区 */}
                  {isSelected && (
                    <div className="border-t border-warm-gold/10 p-4 space-y-4">
                      {/* 位置区域 */}
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
                                  拖动图片到此处
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
                                            <label className="text-xs text-text-secondary/80">顺序:</label>
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

      {/* 底部操作栏 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary/80">
            配置完成度: {stats.configuredChapters}/{projectChapters.length} 章节
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                log.debug('📋 [章节配置] 当前配置:', chapterConfigs);
              }}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-light/50 backdrop-blur-sm hover:bg-bg-dark/80 rounded-lg transition-colors"
            >
              查看配置
            </button>
            <button
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
