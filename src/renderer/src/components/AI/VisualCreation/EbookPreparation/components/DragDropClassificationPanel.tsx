import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { IllustrationHistoryItem } from '../../../../../types/illustration';
import { SafeImage } from '../../../../UI/SafeImage';

export interface ImageCategory {
  id: string;
  name: string;
  color: string;
  emoji: string;
  description: string;
}

// 默認分類
const DEFAULT_CATEGORIES: ImageCategory[] = [
  {
    id: 'cover',
    name: '封面圖',
    color: '#3B82F6',
    emoji: '🎭',
    description: '書籍封面、封底或主要宣傳圖片'
  },
  {
    id: 'character',
    name: '角色插圖',
    color: '#10B981',
    emoji: '👤',
    description: '角色設定圖、人物立繪或角色特寫'
  },
  {
    id: 'scene',
    name: '場景插圖',
    color: '#F59E0B',
    emoji: '🏞️',
    description: '背景環境、場景設定或氛圍圖'
  },
  {
    id: 'action',
    name: '動作插圖',
    color: '#EF4444',
    emoji: '⚔️',
    description: '戰鬥場面、動作戲或情節高潮'
  },
  {
    id: 'misc',
    name: '其他',
    color: '#8B5CF6',
    emoji: '📚',
    description: '裝飾圖案、分隔線或其他用途'
  }
];

interface DragDropClassificationPanelProps {
  selectedImages: IllustrationHistoryItem[];
  onClassificationChange: (classifications: Record<string, ImageCategory>) => void;
}

// 可拖曳圖片組件
interface DraggableImageProps {
  image: IllustrationHistoryItem;
  index: number;
  onImageClick?: (image: IllustrationHistoryItem) => void;
}

const DraggableImageItem: React.FC<DraggableImageProps> = ({ image, index, onImageClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: image.id,
    data: {
      type: 'image',
      image: image,
      index: index
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
  } : undefined;

  const getImageName = (img: IllustrationHistoryItem, idx: number): string => {
    return img.versionTags?.[0] ||
           img.model ||
           img.original_prompt?.slice(0, 30) ||
           `Image ${idx + 1}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        relative group cursor-grab active:cursor-grabbing
        bg-white rounded-lg shadow-sm border-2 border-blue-200
        hover:border-blue-400 hover:shadow-md transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95 shadow-lg ring-2 ring-blue-400' : ''}
      `}
      onClick={() => onImageClick?.(image)}
    >
      {/* 拖曳狀態指示器 */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded-lg flex items-center justify-center z-40">
          <div className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-bold">
            🚀 拖曳中
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <SafeImage
          key={`safe-image-${image.id}`}
          imageUrl={image.image_url && image.image_url.startsWith('http') ? image.image_url : undefined}
          localFilePath={image.local_file_path || image.image_path}
          alt={getImageName(image, index)}
          className="w-full aspect-square object-cover pointer-events-none select-none"
          loading="lazy"
          fallbackIcon="🎨"
        />
        <div className="p-2">
          <h4 className="text-sm font-medium text-gray-800 truncate">
            {getImageName(image, index)}
          </h4>
          <p className="text-xs text-gray-500 truncate">
            {image.model || 'Unknown Model'}
          </p>
        </div>
      </div>
    </div>
  );
};

// 可放置分類區域組件
interface DroppableCategoryProps {
  category: ImageCategory;
  images: IllustrationHistoryItem[];
  onClearCategory: (categoryId: string) => void;
}

const DroppableCategoryArea: React.FC<DroppableCategoryProps> = ({
  category,
  images,
  onClearCategory
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: category.id,
    data: {
      type: 'category',
      category: category
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative min-h-48 p-4 rounded-lg border-2 border-dashed transition-all duration-200
        ${isOver
          ? 'border-yellow-400 bg-yellow-50 scale-105 shadow-lg'
          : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }
      `}
      style={{
        borderColor: isOver ? '#F59E0B' : category.color,
        backgroundColor: isOver ? '#FEF3C7' : undefined,
        outline: isOver ? '3px solid #F59E0B' : `2px dashed ${category.color}`,
        outlineOffset: '4px'
      }}
    >
      {/* 分類標題 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{category.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-800">{category.name}</h3>
            <p className="text-xs text-gray-500">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">({images.length})</span>
          {images.length > 0 && (
            <button
              onClick={() => onClearCategory(category.id)}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Hover狀態指示器 */}
      {isOver && (
        <div className="absolute inset-0 bg-yellow-400 bg-opacity-20 border-2 border-yellow-400 rounded-lg flex items-center justify-center z-30">
          <div className="bg-yellow-600 text-white px-3 py-1 rounded-full font-bold text-sm">
            🎯 放置到 {category.name}
          </div>
        </div>
      )}

      {/* 圖片網格 */}
      <div className="relative z-20">
        {images.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">{category.emoji}</div>
            <p className="text-sm">拖曳圖片到這裡</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {images.map((image, index) => (
              <div key={`${image.id}-${index}`} className="relative">
                <SafeImage
                  key={`categorized-image-${image.id}`}
                  imageUrl={image.image_url && image.image_url.startsWith('http') ? image.image_url : undefined}
                  localFilePath={image.local_file_path || image.image_path}
                  alt={`${category.name} ${index + 1}`}
                  className="w-full aspect-square object-cover rounded shadow-sm"
                  loading="lazy"
                  fallbackIcon="🎨"
                />
                <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-1 py-0.5 rounded">
                  ✓
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DragDropClassificationPanel: React.FC<DragDropClassificationPanelProps> = ({
  selectedImages,
  onClassificationChange
}) => {
  const [categories] = useState<ImageCategory[]>(DEFAULT_CATEGORIES);
  const [imageClassifications, setImageClassifications] = useState<Record<string, string>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // 配置傳感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動距離後才開始拖曳
      },
    })
  );

  // 分類圖片
  const categorizedImages = useMemo(() => {
    const result: Record<string, IllustrationHistoryItem[]> = {};

    categories.forEach(category => {
      result[category.id] = [];
    });

    selectedImages.forEach(image => {
      const categoryId = imageClassifications[image.id];
      if (categoryId && result[categoryId]) {
        result[categoryId].push(image);
      }
    });

    return result;
  }, [categories, selectedImages, imageClassifications]);

  // 獲取未分類圖片
  const unclassifiedImages = useMemo(() => {
    return selectedImages.filter(image => !imageClassifications[image.id]);
  }, [selectedImages, imageClassifications]);

  // 統計數據
  const stats = useMemo(() => {
    const total = selectedImages.length;
    const classified = Object.keys(imageClassifications).length;
    const unclassified = total - classified;

    return {
      total,
      classified,
      unclassified,
      progress: total > 0 ? Math.round((classified / total) * 100) : 0
    };
  }, [selectedImages.length, imageClassifications]);

  // 處理拖曳開始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('🟢 [DragDropFixed] DragStart', {
      activeId: event.active.id,
      data: event.active.data.current
    });

    setActiveDragId(String(event.active.id));
  }, []);

  // 處理拖曳結束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    console.log('✅ [DragDropFixed] DragEnd', {
      activeId: event.active.id,
      overId: event.over?.id,
      activeData: event.active.data.current,
      overData: event.over?.data.current
    });

    const { active, over } = event;
    setActiveDragId(null);

    if (!over) {
      console.log('🚫 [DragDropFixed] 沒有有效的放置目標');
      return;
    }

    const imageId = String(active.id);
    const categoryId = String(over.id);

    // 檢查是否是有效的分類
    const targetCategory = categories.find(cat => cat.id === categoryId);
    if (!targetCategory) {
      console.log('🚫 [DragDropFixed] 無效的分類目標:', categoryId);
      return;
    }

    console.log('✅ [DragDropFixed] 成功分類:', {
      imageId,
      categoryId,
      categoryName: targetCategory.name
    });

    // 更新分類
    const newClassifications = {
      ...imageClassifications,
      [imageId]: categoryId
    };

    setImageClassifications(newClassifications);

    // 生成分類映射
    const categoryMap: Record<string, ImageCategory> = {};
    Object.entries(newClassifications).forEach(([imgId, catId]) => {
      const category = categories.find(cat => cat.id === catId);
      if (category) {
        categoryMap[imgId] = category;
      }
    });

    onClassificationChange(categoryMap);
  }, [categories, imageClassifications, onClassificationChange]);

  // 清除分類
  const handleClearCategory = useCallback((categoryId: string) => {
    const newClassifications = { ...imageClassifications };

    Object.keys(newClassifications).forEach(imageId => {
      if (newClassifications[imageId] === categoryId) {
        delete newClassifications[imageId];
      }
    });

    setImageClassifications(newClassifications);

    // 更新分類映射
    const categoryMap: Record<string, ImageCategory> = {};
    Object.entries(newClassifications).forEach(([imgId, catId]) => {
      const category = categories.find(cat => cat.id === catId);
      if (category) {
        categoryMap[imgId] = category;
      }
    });

    onClassificationChange(categoryMap);
  }, [imageClassifications, categories, onClassificationChange]);

  // 清除所有分類
  const handleClearAll = useCallback(() => {
    setImageClassifications({});
    onClassificationChange({});
  }, [onClassificationChange]);

  return (
    <div className="space-y-6">
      {/* 標題和統計 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            🚀 圖片分類 (DnD-Kit修復版)
          </h2>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            disabled={stats.classified === 0}
          >
            清除所有分類
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-500">總圖片</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{stats.classified}</div>
            <div className="text-sm text-green-500">已分類</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-2xl font-bold text-orange-600">{stats.unclassified}</div>
            <div className="text-sm text-orange-500">未分類</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-2xl font-bold text-purple-600">{stats.progress}%</div>
            <div className="text-sm text-purple-500">完成度</div>
          </div>
        </div>

        {/* 進度條 */}
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 未分類圖片區域 */}
        {unclassifiedImages.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              📋 未分類圖片 ({unclassifiedImages.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {unclassifiedImages.map((image, index) => (
                <DraggableImageItem
                  key={image.id}
                  image={image}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* 分類區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map(category => (
            <div key={category.id} className="bg-white p-4 rounded-lg shadow">
              <DroppableCategoryArea
                category={category}
                images={categorizedImages[category.id] || []}
                onClearCategory={handleClearCategory}
              />
            </div>
          ))}
        </div>

        {/* DragOverlay - 拖曳時的視覺反饋 */}
        <DragOverlay>
          {activeDragId ? (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-2xl transform rotate-3 scale-110">
              <div className="text-center">
                <div className="text-sm">🚀</div>
                <div className="text-xs">拖曳中</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 調試信息 */}
      <div className="bg-gray-100 p-4 rounded-lg text-sm">
        <div className="font-semibold text-gray-700 mb-2">🔧 調試信息</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-medium">拖曳庫:</span> @dnd-kit
          </div>
          <div>
            <span className="font-medium">傳感器:</span> PointerSensor
          </div>
          <div>
            <span className="font-medium">激活距離:</span> 8px
          </div>
          <div>
            <span className="font-medium">當前拖曳:</span> {activeDragId || '無'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropClassificationPanel;