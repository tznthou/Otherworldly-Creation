import React, { memo, useCallback } from 'react';
import { StyleTemplate } from '../../../../types/styleTemplate';

interface StyleTemplateCardProps {
  template: StyleTemplate;
  isSelected?: boolean;
  onSelect?: (template: StyleTemplate) => void;
  onApply?: (template: StyleTemplate) => void;
  className?: string;
}

/**
 * 風格模板卡片組件
 * 展示單個風格模板的信息，支持選擇和快速應用
 */
export const StyleTemplateCard = memo<StyleTemplateCardProps>(({
  template,
  isSelected = false,
  onSelect,
  onApply,
  className = ''
}) => {
  const handleCardClick = useCallback(() => {
    onSelect?.(template);
  }, [onSelect, template]);

  const handleApplyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發卡片選擇
    onApply?.(template);
  }, [onApply, template]);

  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      'anime': 'bg-pink-100 text-pink-800',
      'realistic': 'bg-warm-gold/10 text-warm-gold',
      'fantasy': 'bg-clay-orange/10 text-clay-orange',
      'watercolor': 'bg-green-100 text-green-800',
      'digital_art': 'bg-yellow-100 text-yellow-800',
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
  };

  const getProviderIcon = (provider: string): string => {
    const iconMap: Record<string, string> = {
      'pollinations': '🌸',
      'imagen': '🖼️',
    };
    return iconMap[provider] || '🎨';
  };

  return (
    <div
      className={`
        relative group cursor-pointer
        bg-white rounded-lg shadow-sm border-2 transition-all duration-200
        hover:shadow-md hover:border-gold-300
        ${isSelected ? 'border-gold-500 ring-2 ring-gold-200 shadow-md' : 'border-gray-200'}
        ${className}
      `}
      onClick={handleCardClick}
    >
      {/* 模板預覽區域 */}
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-lg relative overflow-hidden">
        {template.preview ? (
          <img
            src={template.preview}
            alt={template.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🎨
          </div>
        )}
        
        {/* 懸停時顯示的快速操作 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={handleApplyClick}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200"
          >
            立即套用
          </button>
        </div>

        {/* 內建模板標記 */}
        {template.isBuiltIn && (
          <div className="absolute top-2 left-2 bg-warm-gold text-white text-xs px-2 py-1 rounded-full">
            內建
          </div>
        )}

        {/* 使用次數標記 */}
        {template.usage.count > 0 && (
          <div className="absolute top-2 right-2 bg-gray-900/70 text-white text-xs px-2 py-1 rounded-full">
            {template.usage.count}x
          </div>
        )}
      </div>

      {/* 模板信息 */}
      <div className="p-4">
        {/* 模板名稱和類別 */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 truncate flex-1 mr-2">
            {template.name}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getCategoryColor(template.category)}`}>
            {template.category}
          </span>
        </div>

        {/* 模板描述 */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* 支援的提供商 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {template.supportedProviders.map((provider) => (
              <span
                key={provider}
                title={provider}
                className="text-lg"
              >
                {getProviderIcon(provider)}
              </span>
            ))}
          </div>

          {/* 評分顯示 */}
          {template.usage.rating && (
            <div className="flex items-center space-x-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-sm text-gray-600">
                {template.usage.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* 標籤 */}
        {template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 選中狀態指示器 */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center text-white text-xs">
          ✓
        </div>
      )}
    </div>
  );
});

StyleTemplateCard.displayName = 'StyleTemplateCard';

export default StyleTemplateCard;