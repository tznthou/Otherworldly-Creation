import React, { memo, useCallback, useState, useMemo } from 'react';
import { StyleTemplate } from '../../../../types/styleTemplate';
import { useStyleTemplates } from '../../../../hooks/illustration/useStyleTemplates';
import StyleTemplateCard from './StyleTemplateCard';
import TemplateFilters from './TemplateFilters';
import TemplatePreview from './TemplatePreview';

interface StyleTemplateSelectorProps {
  onTemplateSelect?: (template: StyleTemplate) => void;
  onTemplateApply?: (template: StyleTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
  showFilters?: boolean;
  gridColumns?: 2 | 3 | 4 | 6;
  maxHeight?: string;
}

type ViewMode = 'grid' | 'list';

/**
 * 風格模板選擇器主組件
 * 整合所有模板相關功能的主要界面
 */
export const StyleTemplateSelector = memo<StyleTemplateSelectorProps>(({
  onTemplateSelect,
  onTemplateApply,
  selectedTemplateId,
  className = '',
  showFilters = true,
  gridColumns = 3,
  maxHeight = '600px'
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewTemplate, setPreviewTemplate] = useState<StyleTemplate | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const {
    filteredTemplates,
    selectedTemplate,
    filter,
    sortBy,
    loading,
    error,
    setFilter,
    setSortBy,
    resetFilter,
    selectTemplate
  } = useStyleTemplates({
    loadBuiltInTemplates: true
  });

  const handleTemplateSelect = useCallback((template: StyleTemplate) => {
    selectTemplate(template);
    onTemplateSelect?.(template);
  }, [selectTemplate, onTemplateSelect]);

  const handleTemplateApply = useCallback((template: StyleTemplate) => {
    selectTemplate(template);
    onTemplateApply?.(template);
  }, [selectTemplate, onTemplateApply]);

  const handlePreviewOpen = useCallback((template: StyleTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewModalOpen(true);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setIsPreviewModalOpen(false);
    setPreviewTemplate(null);
  }, []);

  const handlePreviewApply = useCallback((template: StyleTemplate) => {
    handleTemplateApply(template);
    handlePreviewClose();
  }, [handleTemplateApply, handlePreviewClose]);

  const gridClass = useMemo(() => {
    const columnMap = {
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    };
    return columnMap[gridColumns];
  }, [gridColumns]);

  const hasTemplates = filteredTemplates.length > 0;
  const hasSelectedTemplate = selectedTemplateId 
    ? filteredTemplates.find(t => t.id === selectedTemplateId)
    : selectedTemplate;

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入模板中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-2">載入模板失敗</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 篩選器區域 */}
      {showFilters && (
        <div className="bg-cosmic-800/30 rounded-lg border border-cosmic-700 p-4">
          <TemplateFilters
            filter={filter}
            sortBy={sortBy}
            onFilterChange={setFilter}
            onSortChange={setSortBy}
            onReset={resetFilter}
          />
        </div>
      )}

      {/* 工具欄 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-cosmic-100">
            風格模板
            {hasTemplates && (
              <span className="ml-2 text-sm text-cosmic-400">
                ({filteredTemplates.length} 個模板)
              </span>
            )}
          </h3>
          
          {hasSelectedTemplate && (
            <div className="flex items-center space-x-2 text-sm text-gold-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>已選擇: {hasSelectedTemplate.name}</span>
            </div>
          )}
        </div>

        {/* 視圖模式切換 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-gold-600/20 text-gold-400'
                : 'bg-cosmic-700 text-cosmic-300 hover:bg-cosmic-600'
            }`}
            title="網格視圖"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-gold-600/20 text-gold-400'
                : 'bg-cosmic-700 text-cosmic-300 hover:bg-cosmic-600'
            }`}
            title="列表視圖"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 模板列表區域 */}
      <div 
        className="bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden"
        style={{ maxHeight }}
      >
        {!hasTemplates ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-cosmic-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <p className="text-cosmic-300 mb-2">找不到符合條件的模板</p>
              <p className="text-cosmic-400 text-sm">請調整篩選條件或重置篩選器</p>
            </div>
          </div>
        ) : (
          <div 
            className="overflow-y-auto p-4"
            style={{ maxHeight: `calc(${maxHeight} - 80px)` }}
          >
            {viewMode === 'grid' ? (
              <div className={`grid gap-4 ${gridClass}`}>
                {filteredTemplates.map((template) => (
                  <StyleTemplateCard
                    key={template.id}
                    template={template}
                    isSelected={template.id === selectedTemplateId || template.id === selectedTemplate?.id}
                    onSelect={handleTemplateSelect}
                    onApply={handleTemplateApply}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                      template.id === selectedTemplateId || template.id === selectedTemplate?.id
                        ? 'border-gold-500 bg-gold-50'
                        : 'border-gray-200 hover:border-gold-300'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {template.preview ? (
                        <img
                          src={template.preview}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🎨
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {template.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {template.category}
                        </span>
                        {template.usage.count > 0 && (
                          <span className="text-xs text-gray-500">
                            {template.usage.count}x 使用
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewOpen(template);
                        }}
                        className="px-3 py-1 text-sm text-gold-600 hover:text-gold-700 hover:bg-gold-50 rounded transition-colors"
                      >
                        預覽
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateApply(template);
                        }}
                        className="px-3 py-1 text-sm bg-gold-600 text-white hover:bg-gold-700 rounded transition-colors"
                      >
                        套用
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 預覽模態框 */}
      {isPreviewModalOpen && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <TemplatePreview
              template={previewTemplate}
              onApply={handlePreviewApply}
              onClose={handlePreviewClose}
            />
          </div>
        </div>
      )}
    </div>
  );
});

StyleTemplateSelector.displayName = 'StyleTemplateSelector';

export default StyleTemplateSelector;