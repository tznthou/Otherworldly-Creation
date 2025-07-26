import React from 'react';
import { Character } from '../../types/character';

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onView: (character: Character) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onEdit,
  onDelete,
  onView,
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(character);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(character);
  };

  const handleView = () => {
    onView(character);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200"
      onClick={handleView}
    >
      <div className="p-4">
        {/* 角色頭部資訊 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {character.name}
            </h3>
            {character.archetype && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {character.archetype}
              </span>
            )}
          </div>
          
          {/* 操作按鈕 */}
          <div className="flex space-x-1 ml-2">
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="編輯角色"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="刪除角色"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 角色基本資訊 */}
        <div className="space-y-2 text-sm text-gray-600">
          {character.age && (
            <div className="flex items-center">
              <span className="font-medium w-12">年齡:</span>
              <span>{character.age}歲</span>
            </div>
          )}
          
          {character.gender && (
            <div className="flex items-center">
              <span className="font-medium w-12">性別:</span>
              <span>{character.gender}</span>
            </div>
          )}
          
          {character.personality && (
            <div>
              <span className="font-medium">性格:</span>
              <p className="text-gray-700 mt-1 line-clamp-2">
                {character.personality}
              </p>
            </div>
          )}
        </div>

        {/* 角色外觀描述 */}
        {character.appearance && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="font-medium text-sm text-gray-600">外觀:</span>
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">
              {character.appearance}
            </p>
          </div>
        )}

        {/* 創建時間 */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          創建於 {character.createdAt.toLocaleDateString('zh-TW')}
        </div>
      </div>
    </div>
  );
};