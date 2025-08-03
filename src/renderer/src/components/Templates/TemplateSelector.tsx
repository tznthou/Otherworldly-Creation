import React, { useState, useEffect } from 'react';
import { NovelTemplate, TemplateType, TEMPLATE_TYPES } from '../../types/template';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  fetchAllTemplates, 
  selectFilteredAndSortedTemplates, 
  selectTemplateLoading,
  selectTemplateError,
  setFilters,
  setSortOptions as _setSortOptions
} from '../../store/slices/templatesSlice';

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect: (template: NovelTemplate) => void;
  onCancel?: () => void;
  filterType?: TemplateType;
  showCustomTemplates?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onSelect,
  onCancel,
  filterType,
  showCustomTemplates = true,
}) => {
  const dispatch = useAppDispatch();
  const templates = useAppSelector(selectFilteredAndSortedTemplates);
  const loading = useAppSelector(selectTemplateLoading);
  const error = useAppSelector(selectTemplateError);

  const [selectedTemplate, setSelectedTemplate] = useState<NovelTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    dispatch(fetchAllTemplates());
  }, [dispatch]);

  useEffect(() => {
    // 設置過濾器
    const filters: { search?: string; type?: string; category?: string } = {};
    if (filterType) {
      filters.type = filterType;
    }
    if (!showCustomTemplates) {
      filters.isCustom = false;
    }
    dispatch(setFilters(filters));
  }, [dispatch, filterType, showCustomTemplates]);

  useEffect(() => {
    // 如果有預選的模板 ID，找到對應的模板
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
      }
    }
  }, [selectedTemplateId, templates]);

  const handleTemplateClick = (template: NovelTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  const handleBackToList = () => {
    setPreviewMode(false);
  };

  const getTemplateTypeColor = (type: TemplateType): string => {
    const colors = {
      isekai: 'bg-purple-100 text-purple-800',
      school: 'bg-pink-100 text-pink-800',
      scifi: 'bg-blue-100 text-blue-800',
      fantasy: 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">載入模板中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">載入錯誤</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (previewMode && selectedTemplate) {
    return (
      <div className="space-y-6">
        {/* 預覽標題 */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回列表
          </button>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTemplateTypeColor(selectedTemplate.type)}`}>
              {TEMPLATE_TYPES[selectedTemplate.type]}
            </span>
            {selectedTemplate.isCustom && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                自定義
              </span>
            )}
          </div>
        </div>

        {/* 模板詳情 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTemplate.name}</h2>
          <p className="text-gray-600 mb-6">{selectedTemplate.description}</p>

          {/* 世界觀設定 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">世界觀設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700">時代背景</h4>
                <p className="text-gray-600">{selectedTemplate.worldSetting.era}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">科技水平</h4>
                <p className="text-gray-600">{selectedTemplate.worldSetting.technology}</p>
              </div>
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-700">社會結構</h4>
                <p className="text-gray-600">{selectedTemplate.worldSetting.society}</p>
              </div>
            </div>
          </div>

          {/* 特殊元素 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">特殊元素</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTemplate.worldSetting.specialElements.map((element, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                >
                  {element}
                </span>
              ))}
            </div>
          </div>

          {/* 角色原型 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">角色原型</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTemplate.characterArchetypes.slice(0, 4).map((archetype, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-1">{archetype.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{archetype.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {archetype.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 寫作指導 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">寫作指導</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700">語調風格</h4>
                <p className="text-gray-600">{selectedTemplate.writingGuidelines.tone}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">節奏控制</h4>
                <p className="text-gray-600">{selectedTemplate.writingGuidelines.pacing}</p>
              </div>
            </div>
          </div>

          {/* 範例內容 */}
          {selectedTemplate.sampleContent && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">範例內容</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">開場範例</h4>
                <p className="text-gray-600 italic">"{selectedTemplate.sampleContent.opening}"</p>
              </div>
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center justify-end space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
          )}
          <button
            onClick={handleConfirmSelection}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            選擇此模板
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">選擇模板</h2>
        <p className="mt-1 text-sm text-gray-600">
          選擇一個模板來快速開始您的創作，每個模板都包含完整的世界觀設定和角色原型
        </p>
      </div>

      {/* 模板列表 */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有可用的模板</h3>
          <p className="mt-1 text-sm text-gray-500">請檢查過濾條件或聯繫管理員</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                selectedTemplate?.id === template.id
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleTemplateClick(template)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTemplateTypeColor(template.type)}`}>
                    {TEMPLATE_TYPES[template.type]}
                  </span>
                  {template.isCustom && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      自定義
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{template.description}</p>
                
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">時代：</span>{template.worldSetting.era}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.worldSetting.specialElements.slice(0, 3).map((element, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {element}
                      </span>
                    ))}
                    {template.worldSetting.specialElements.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{template.worldSetting.specialElements.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部按鈕 */}
      {!previewMode && (
        <div className="flex items-center justify-end space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
          )}
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedTemplate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            選擇模板
          </button>
        </div>
      )}
    </div>
  );
};