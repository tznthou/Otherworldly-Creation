import React, { useState } from 'react';
import { Character } from '../../types/character';
import { CharacterDeleteModal } from './CharacterDeleteModal';
import api from '../../api';

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
    // 不要在這裡關閉模態框，讓父組件處理
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (forceDelete: boolean) => {
    try {
      await api.characters.delete(character.id);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b border-cosmic-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gold-400">
              {character.name}
            </h2>
            {character.archetype && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-cosmic-800 text-gold-400 rounded-full">
                {character.archetype}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gold-500 transition-colors"
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
                <h3 className="text-sm font-medium text-gray-400 mb-1">年齡</h3>
                <p className="text-white">{character.age}歲</p>
              </div>
            )}
            
            {character.gender && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">性別</h3>
                <p className="text-white">{character.gender}</p>
              </div>
            )}
          </div>

          {/* 外觀描述 */}
          {character.appearance && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">外觀描述</h3>
              <div className="bg-cosmic-800/50 rounded-md p-4">
                <p className="text-gray-200 whitespace-pre-wrap">{character.appearance}</p>
              </div>
            </div>
          )}

          {/* 性格特點 */}
          {character.personality && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">性格特點</h3>
              <div className="bg-cosmic-800/50 rounded-md p-4">
                <p className="text-gray-200 whitespace-pre-wrap">{character.personality}</p>
              </div>
            </div>
          )}

          {/* 背景故事 */}
          {character.background && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">背景故事</h3>
              <div className="bg-cosmic-800/50 rounded-md p-4">
                <p className="text-gray-200 whitespace-pre-wrap">{character.background}</p>
              </div>
            </div>
          )}

          {/* 角色關係 */}
          {character.relationships && character.relationships.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">角色關係</h3>
              <div className="space-y-3">
                {character.relationships.map((relationship, index) => (
                  <div key={index} className="bg-cosmic-800/50 rounded-md p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-white">
                        {getCharacterName(relationship.targetId)}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-cosmic-700 text-gold-400 rounded-full">
                        {relationship.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {relationship.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 創建和更新時間 */}
          <div className="border-t border-cosmic-700 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
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
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-cosmic-700">
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 text-sm font-medium text-red-400 bg-red-900/30 border border-red-800 rounded-md hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
          >
            刪除角色
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-cosmic-900 bg-gold-500 border border-transparent rounded-md hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 transition-all"
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