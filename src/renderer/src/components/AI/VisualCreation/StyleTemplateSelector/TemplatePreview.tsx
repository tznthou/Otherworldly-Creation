import React, { memo, useCallback, useState } from 'react';
import { StyleTemplate } from '../../../../types/styleTemplate';

interface TemplatePreviewProps {
  template: StyleTemplate;
  onApply?: (template: StyleTemplate) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * 風格模板詳細預覽組件
 * 提供模板的詳細信息展示和預覽功能
 */
export const TemplatePreview = memo<TemplatePreviewProps>(({
  template,
  onApply,
  onClose,
  className = ''
}) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleApplyClick = useCallback(() => {
    onApply?.(template);
  }, [onApply, template]);

  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoading(false);
    setImageError(true);
  }, []);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      'anime': 'bg-pink-100 text-pink-800 border-pink-200',
      'realistic': 'bg-warm-gold/10 text-warm-gold border-warm-gold/20',
      'fantasy': 'bg-clay-orange/10 text-clay-orange border-clay-orange/20',
      'watercolor': 'bg-green-100 text-green-800 border-green-200',
      'digital_art': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProviderName = (provider: string): string => {
    const nameMap: Record<string, string> = {
      'pollinations': 'Pollinations',
      'imagen': 'Google Imagen',
    };
    return nameMap[provider] || provider;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* 標題欄 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {template.name}
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm border ${getCategoryColor(template.category)}`}>
            {template.category}
          </span>
          {template.isBuiltIn && (
            <span className="px-2 py-1 bg-warm-gold text-white text-xs rounded-full">
              內建模板
            </span>
          )}
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="關閉預覽"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 預覽圖片區域 */}
          <div className="space-y-4">
            <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden relative">
              {template.preview ? (
                <>
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600"></div>
                    </div>
                  )}
                  {!imageError ? (
                    <img
                      src={template.preview}
                      alt={template.name}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">預覽圖片載入失敗</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  🎨
                </div>
              )}
            </div>

            {/* 應用按鈕 */}
            <button
              onClick={handleApplyClick}
              className="w-full py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              套用此模板
            </button>
          </div>

          {/* 詳細信息區域 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">基本信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">描述:</span>
                  <span className="text-gray-900 text-right flex-1 ml-2">{template.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">使用次數:</span>
                  <span className="text-gray-900">{template.usage.count} 次</span>
                </div>
                {template.usage.rating && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">評分:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-900">{template.usage.rating.toFixed(1)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">創建時間:</span>
                  <span className="text-gray-900">{formatDate(template.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">更新時間:</span>
                  <span className="text-gray-900">{formatDate(template.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* 支援的提供商 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">支援的提供商</h3>
              <div className="flex flex-wrap gap-2">
                {template.supportedProviders.map((provider) => (
                  <span
                    key={provider}
                    className="px-3 py-1 bg-warm-gold/5 text-warm-gold rounded-lg text-sm border border-warm-gold/20"
                  >
                    {getProviderName(provider)}
                  </span>
                ))}
              </div>
            </div>

            {/* 標籤 */}
            {template.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">標籤</h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 提示詞預覽 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">提示詞預覽</h3>
              <div className="space-y-3">
                {template.parameters.positivePrompts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">正面提示詞</h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-1">
                        {template.parameters.positivePrompts.slice(0, 5).map((prompt, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                          >
                            {prompt}
                          </span>
                        ))}
                        {template.parameters.positivePrompts.length > 5 && (
                          <span className="text-xs text-green-600">
                            +{template.parameters.positivePrompts.length - 5} 更多...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {template.parameters.negativePrompts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">負面提示詞</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-1">
                        {template.parameters.negativePrompts.slice(0, 5).map((prompt, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
                          >
                            {prompt}
                          </span>
                        ))}
                        {template.parameters.negativePrompts.length > 5 && (
                          <span className="text-xs text-red-600">
                            +{template.parameters.negativePrompts.length - 5} 更多...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TemplatePreview.displayName = 'TemplatePreview';

export default TemplatePreview;