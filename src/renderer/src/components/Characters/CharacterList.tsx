import React, { useState, useEffect, useMemo } from 'react';
import { Character, CharacterFilters, CharacterSortOptions } from '../../types/character';
import { CharacterCard } from './CharacterCard';
import { CharacterFiltersComponent } from './CharacterFilters';
import { CharacterDeleteModal } from './CharacterDeleteModal';

interface CharacterListProps {
  projectId: string;
  onCreateCharacter: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (character: Character) => void;
  onViewCharacter: (character: Character) => void;
}

export const CharacterList: React.FC<CharacterListProps> = ({
  projectId,
  onCreateCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onViewCharacter,
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CharacterFilters>({});
  const [sortOptions, setSortOptions] = useState<CharacterSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);

  // 載入角色列表
  const loadCharacters = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.characters.getByProjectId(projectId);
      setCharacters(result);
    } catch (err) {
      console.error('載入角色列表失敗:', err);
      setError('載入角色列表失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadCharacters();
    }
  }, [projectId]);

  // 過濾和排序角色
  const filteredAndSortedCharacters = useMemo(() => {
    let filtered = [...characters];

    // 應用搜索過濾
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(character =>
        character.name.toLowerCase().includes(searchTerm) ||
        character.personality?.toLowerCase().includes(searchTerm) ||
        character.background?.toLowerCase().includes(searchTerm) ||
        character.appearance?.toLowerCase().includes(searchTerm)
      );
    }

    // 應用原型過濾
    if (filters.archetype) {
      filtered = filtered.filter(character => character.archetype === filters.archetype);
    }

    // 應用性別過濾
    if (filters.gender) {
      filtered = filtered.filter(character => character.gender === filters.gender);
    }

    // 應用排序
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'archetype':
          aValue = a.archetype || '';
          bValue = b.archetype || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortOptions.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOptions.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [characters, filters, sortOptions]);

  const handleFiltersChange = (newFilters: CharacterFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleSortChange = (field: CharacterSortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDeleteCharacter = (character: Character) => {
    setCharacterToDelete(character);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (forceDelete: boolean) => {
    if (!characterToDelete) return;

    try {
      await window.electronAPI.characters.delete(characterToDelete.id, forceDelete);
      await loadCharacters(); // 重新載入列表
      setDeleteModalOpen(false);
      setCharacterToDelete(null);
    } catch (err: any) {
      console.error('刪除角色失敗:', err);
      
      if (err.message === 'CHARACTER_HAS_REFERENCES') {
        // 這個錯誤應該由 CharacterDeleteModal 處理
        throw err;
      } else {
        setError('刪除角色失敗，請稍後再試');
        setDeleteModalOpen(false);
        setCharacterToDelete(null);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setCharacterToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">載入中...</span>
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
            <button
              onClick={loadCharacters}
              className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
            >
              重新載入
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            管理專案中的角色，包括主角、配角和反派等
          </p>
        </div>
        <button
          onClick={onCreateCharacter}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新增角色
        </button>
      </div>

      {/* 過濾器 */}
      <CharacterFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* 排序選項 */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-600">排序方式:</span>
        <button
          onClick={() => handleSortChange('name')}
          className={`px-3 py-1 rounded-md transition-colors ${
            sortOptions.field === 'name'
              ? 'bg-blue-100 text-blue-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          名稱
          {sortOptions.field === 'name' && (
            <span className="ml-1">
              {sortOptions.direction === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
        <button
          onClick={() => handleSortChange('archetype')}
          className={`px-3 py-1 rounded-md transition-colors ${
            sortOptions.field === 'archetype'
              ? 'bg-blue-100 text-blue-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          原型
          {sortOptions.field === 'archetype' && (
            <span className="ml-1">
              {sortOptions.direction === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
        <button
          onClick={() => handleSortChange('createdAt')}
          className={`px-3 py-1 rounded-md transition-colors ${
            sortOptions.field === 'createdAt'
              ? 'bg-blue-100 text-blue-800'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          創建時間
          {sortOptions.field === 'createdAt' && (
            <span className="ml-1">
              {sortOptions.direction === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
      </div>

      {/* 角色列表 */}
      {filteredAndSortedCharacters.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {characters.length === 0 ? '尚無角色' : '沒有符合條件的角色'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {characters.length === 0 
              ? '開始創建您的第一個角色吧！' 
              : '嘗試調整搜索條件或清除過濾器'
            }
          </p>
          {characters.length === 0 && (
            <div className="mt-6">
              <button
                onClick={onCreateCharacter}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新增角色
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={onEditCharacter}
              onDelete={handleDeleteCharacter}
              onView={onViewCharacter}
            />
          ))}
        </div>
      )}

      {/* 統計資訊 */}
      {characters.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          顯示 {filteredAndSortedCharacters.length} / {characters.length} 個角色
        </div>
      )}

      {/* 刪除確認對話框 */}
      <CharacterDeleteModal
        isOpen={deleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        character={characterToDelete}
      />
    </div>
  );
};