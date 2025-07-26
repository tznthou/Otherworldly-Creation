import React, { useState, useEffect } from 'react';
import { NovelTemplate, TemplateType, TEMPLATE_TYPES } from '../../types/template';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchAllTemplates,
  selectFilteredAndSortedTemplates,
  selectTemplateLoading,
  selectTemplateError,
  setFilters,
  setSortOptions,
  deleteTemplate,
  cloneTemplate,
  updateTemplate
} from '../../store/slices/templatesSlice';

interface TemplateManagerProps {
  onEditTemplate?: (template: NovelTemplate) => void;
  onCreateTemplate?: () => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  onEditTemplate,
  onCreateTemplate,
}) => {
  const dispatch = useAppDispatch();
  const templates = useAppSelector(selectFilteredAndSortedTemplates);
  const loading = useAppSelector(selectTemplateLoading);
  const error = useAppSelector(selectTemplateError);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TemplateType | ''>('');
  const [customFilter, setCustomFilter] = useState<'all' | 'default' | 'custom'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<NovelTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    dispatch(fetchAllTemplates());
  }, [dispatch]);

  useEffect(() => {
    // 更新過濾器
    const filters: any = {};
    
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }
    
    if (typeFilter) {
      filters.type = typeFilter;
    }
    
    if (customFilter === 'default') {
      filters.isCustom = false;
    } else if (customFilter === 'custom') {
      filters.isCustom = true;
    }

    dispatch(setFilters(filters));
  }, [dispatch, searchQuery, typeFilter, customFilter]);

  const handleSortChange = (field: 'name' | 'type' | 'createdAt' | 'updatedAt') => {
    dispatch(setSortOptions({ field, direction: 'asc' }));
  };

  const handleDeleteClick = (template: NovelTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedTemplate) {
      try {
        await dispatch(deleteTemplate(selectedTemplate.id)).unwrap();
        setShowDeleteConfirm(false);
        setSelectedTemplate(null);
      } catch (error) {
        console.error('刪除模板失敗:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedTemplate(null);
  };

  const handleCloneTemplate = async (template: NovelTemplate) => {
    try {
      await dispatch(cloneTemplate({ 
        id: template.id, 
        newName: `${template.name} (副本)` 
      })).unwrap();
    } catch (error) {
      console.error('複製模板失敗:', error);
    }
  };

  const handleToggleActive = async (template: NovelTemplate) => {
    try {
      await dispatch(updateTemplate({
        id: template.id,
        updates: { isActive: !template.isActive }
      })).unwrap();
    } catch (error) {
      console.error('更新模板狀態失敗:', error);
    }
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

  return (
    <div className="space-y-6">
      {/* 標題和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            管理輕小說創作模板，包括預設模板和自定義模板
          </p>
        </div>
        {onCreateTemplate && (
          <button
            onClick={onCreateTemplate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增模板
          </button>
        )}
      </div>

      {/* 過濾器 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 搜索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模板名稱或描述..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 類型過濾 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TemplateType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">所有類型</option>
              {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* 自定義過濾 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">來源</label>
            <select
              value={customFilter}
              onChange={(e) => setCustomFilter(e.target.value as 'all' | 'default' | 'custom')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全部</option>
              <option value="default">預設模板</option>
              <option value="custom">自定義模板</option>
            </select>
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
            <select
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">名稱</option>
              <option value="type">類型</option>
              <option value="createdAt">創建時間</option>
              <option value="updatedAt">更新時間</option>
            </select>
          </div>
        </div>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">錯誤</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 模板列表 */}
      {templates.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到模板</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || typeFilter || customFilter !== 'all' 
              ? '嘗試調整搜索條件或過濾器' 
              : '還沒有任何模板'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模板
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    類型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新時間
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {template.name}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTemplateTypeColor(template.type)}`}>
                        {TEMPLATE_TYPES[template.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          template.isActive !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.isActive !== false ? '啟用' : '停用'}
                        </span>
                        {template.isCustom && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            自定義
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.updatedAt.toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* 啟用/停用 */}
                        <button
                          onClick={() => handleToggleActive(template)}
                          className={`text-xs px-2 py-1 rounded ${
                            template.isActive !== false
                              ? 'text-gray-600 hover:text-gray-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {template.isActive !== false ? '停用' : '啟用'}
                        </button>

                        {/* 複製 */}
                        <button
                          onClick={() => handleCloneTemplate(template)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          複製
                        </button>

                        {/* 編輯 */}
                        {onEditTemplate && (
                          <button
                            onClick={() => onEditTemplate(template)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs"
                          >
                            編輯
                          </button>
                        )}

                        {/* 刪除（僅自定義模板） */}
                        {template.isCustom && (
                          <button
                            onClick={() => handleDeleteClick(template)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            刪除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 統計資訊 */}
      {templates.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          顯示 {templates.length} 個模板
        </div>
      )}

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">確認刪除</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                確定要刪除模板「{selectedTemplate.name}」嗎？此操作無法復原。
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};