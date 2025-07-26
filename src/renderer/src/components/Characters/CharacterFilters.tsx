import React from 'react';
import { CharacterFilters, CHARACTER_ARCHETYPES, GENDER_OPTIONS } from '../../types/character';

interface CharacterFiltersProps {
  filters: CharacterFilters;
  onFiltersChange: (filters: CharacterFilters) => void;
  onClearFilters: () => void;
}

export const CharacterFiltersComponent: React.FC<CharacterFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: e.target.value,
    });
  };

  const handleArchetypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      archetype: e.target.value || undefined,
    });
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      gender: e.target.value || undefined,
    });
  };

  const hasActiveFilters = filters.search || filters.archetype || filters.gender;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 搜索框 */}
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            搜索角色
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              placeholder="輸入角色名稱或描述..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 角色原型過濾 */}
        <div className="w-full lg:w-48">
          <label htmlFor="archetype" className="block text-sm font-medium text-gray-700 mb-1">
            角色原型
          </label>
          <select
            id="archetype"
            value={filters.archetype || ''}
            onChange={handleArchetypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部原型</option>
            {CHARACTER_ARCHETYPES.map((archetype) => (
              <option key={archetype} value={archetype}>
                {archetype}
              </option>
            ))}
          </select>
        </div>

        {/* 性別過濾 */}
        <div className="w-full lg:w-32">
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            性別
          </label>
          <select
            id="gender"
            value={filters.gender || ''}
            onChange={handleGenderChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部性別</option>
            {GENDER_OPTIONS.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </div>

        {/* 清除過濾器按鈕 */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              清除過濾
            </button>
          </div>
        )}
      </div>
    </div>
  );
};