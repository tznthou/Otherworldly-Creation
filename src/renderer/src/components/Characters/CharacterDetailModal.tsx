import React, { useState } from 'react';
import { Character } from '../../types/character';
import { CharacterDeleteModal } from './CharacterDeleteModal';

interface CharacterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  allCharacters?: Character[];
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  isOpen,
  onClose,
  character,
  onEdit,
  onDelete,
  allCharacters = [],
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  if (!isOpen || !character) return null;

  const handleEdit = () => {
    onEdit(character);
    onClose();
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (forceDelete: boolean) => {
    try {
      await window.electronAPI.characters.delete(character.id, forceDelete);
      setDeleteModalOpen(false);
      onClose();
      // 通知父組件重新載入列表
      window.location.reload();
    } catch (error) {
      console.error('刪除角色失敗:', error);
      throw error;
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
  };

  const getCharacterName = (characterId: string): string => {
    const foundCharacter = allCharacters.find(c => c.id === characterId);
    return foundCharacter?.name || '未知角色';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {character.name}
            </h2>
            {character.archetype && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {character.archetype}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-6">
            {character.age && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">年齡</h3>
                <p className="text-gray-900">{character.age}歲</p>
              </div>
            )}
            
            {character.gender && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">性別</h3>
                <p className="text-gray-900">{character.gender}</p>
              </div>
            )}
          </div>

          {/* 外觀描述 */}
          {character.appearance && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">外觀描述</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{character.appearance}</p>
              </div>
            </div>
          )}

          {/* 性格特點 */}
          {character.personality && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">性格特點</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{character.personality}</p>
              </div>
            </div>
          )}

          {/* 背景故事 */}
          {character.background && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">背景故事</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{character.background}</p>
              </div>
            </div>
          )}

          {/* 角色關係 */}
          {character.relationships && character.relationships.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">角色關係</h3>
              <div className="space-y-3">
                {character.relationships.map((relationship, index) => (
                  <div key={index} className="bg-gray-50 rounded-md p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-gray-900">
                        {getCharacterName(relationship.targetId)}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {relationship.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {relationship.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 創建和更新時間 */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <span className="font-medium">創建時間:</span>
                <br />
                {character.createdAt.toLocaleString('zh-TW')}
              </div>
              <div>
                <span className="font-medium">更新時間:</span>
                <br />
                {character.updatedAt.toLocaleString('zh-TW')}
              </div>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            刪除角色
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            編輯角色
          </button>
        </div>

        {/* 刪除確認對話框 */}
        <CharacterDeleteModal
          isOpen={deleteModalOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          character={character}
        />
      </div>
    </div>
  );
};