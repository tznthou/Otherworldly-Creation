import React, { memo, useCallback, useMemo } from 'react';
import { StyleTemplateFilter, StyleTemplateSortBy, STYLE_CATEGORIES } from '../../../../types/styleTemplate';

interface TemplateFiltersProps {
  filter: StyleTemplateFilter;
  sortBy: StyleTemplateSortBy;
  onFilterChange: (filter: StyleTemplateFilter) => void;
  onSortChange: (sortBy: StyleTemplateSortBy) => void;
  onReset: () => void;
  className?: string;
}

/**
 * 風格模板過濾和搜索組件
 * 提供搜索、過濾、排序功能
 */
export const TemplateFilters = memo<TemplateFiltersProps>(({
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
  onReset,
  className = ''
}) => {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filter,
      searchTerm: e.target.value
    });
  }, [filter, onFilterChange]);

  const handleCategoryChange = useCallback((category: string) => {
    onFilterChange({
      ...filter,
      category: category === 'all' ? undefined : category as any
    });
  }, [filter, onFilterChange]);

  const handleProviderChange = useCallback((provider: string) => {
    onFilterChange({
      ...filter,
      provider: provider === 'all' ? undefined : provider as 'pollinations' | 'imagen'
    });
  }, [filter, onFilterChange]);

  const handleBuiltInChange = useCallback((builtIn: string) => {
    onFilterChange({
      ...filter,
      isBuiltIn: builtIn === 'all' ? undefined : builtIn === 'builtin'
    });
  }, [filter, onFilterChange]);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value as StyleTemplateSortBy);
  }, [onSortChange]);

  const hasActiveFilters = useMemo(() => {
    return !!(filter.searchTerm || filter.category || filter.provider || filter.isBuiltIn !== undefined);
  }, [filter]);

  const sortOptions = [
    { value: 'name', label: '按名稱排序' },
    { value: 'category', label: '按類別排序' },
    { value: 'usage', label: '按使用次數排序' },
    { value: 'rating', label: '按評分排序' },
    { value: 'created', label: '按創建時間排序' },
    { value: 'updated', label: '按更新時間排序' }
  ];

  const providerOptions = [
    { value: 'all', label: '所有提供商' },
    { value: 'pollinations', label: 'Pollinations' },
    { value: 'imagen', label: 'Google Imagen' }
  ];

  const builtInOptions = [
    { value: 'all', label: '所有模板' },
    { value: 'builtin', label: '內建模板' },
    { value: 'custom', label: '自定義模板' }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 搜索欄 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="搜索模板名稱或描述..."
          value={filter.searchTerm || ''}
          onChange={handleSearchChange}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
        />
      </div>

      {/* 過濾選項 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 類別過濾 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            類別
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !filter.category 
                  ? 'bg-gold-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {STYLE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center space-x-1 ${
                  filter.category === category.id
                    ? 'bg-gold-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 提供商過濾 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            提供商
          </label>
          <select
            value={filter.provider || 'all'}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 模板類型過濾 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            模板類型
          </label>
          <select
            value={filter.isBuiltIn === undefined ? 'all' : filter.isBuiltIn ? 'builtin' : 'custom'}
            onChange={(e) => handleBuiltInChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          >
            {builtInOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 排序和重置 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* 排序選項 */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            排序方式:
          </label>
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 重置和狀態顯示 */}
        <div className="flex items-center space-x-3">
          {hasActiveFilters && (
            <span className="text-sm text-gray-500">
              篩選條件已套用
            </span>
          )}
          <button
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            重置篩選
          </button>
        </div>
      </div>

      {/* 活動篩選標籤 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filter.searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              搜索: "{filter.searchTerm}"
              <button
                onClick={() => onFilterChange({ ...filter, searchTerm: undefined })}
                className="ml-2 hover:text-blue-600"
              >
                ×
              </button>
            </span>
          )}
          {filter.category && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
              類別: {STYLE_CATEGORIES.find(c => c.id === filter.category)?.name}
              <button
                onClick={() => onFilterChange({ ...filter, category: undefined })}
                className="ml-2 hover:text-purple-600"
              >
                ×
              </button>
            </span>
          )}
          {filter.provider && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              提供商: {filter.provider === 'pollinations' ? 'Pollinations' : 'Google Imagen'}
              <button
                onClick={() => onFilterChange({ ...filter, provider: undefined })}
                className="ml-2 hover:text-green-600"
              >
                ×
              </button>
            </span>
          )}
          {filter.isBuiltIn !== undefined && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
              類型: {filter.isBuiltIn ? '內建模板' : '自定義模板'}
              <button
                onClick={() => onFilterChange({ ...filter, isBuiltIn: undefined })}
                className="ml-2 hover:text-yellow-600"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
});

TemplateFilters.displayName = 'TemplateFilters';

export default TemplateFilters;