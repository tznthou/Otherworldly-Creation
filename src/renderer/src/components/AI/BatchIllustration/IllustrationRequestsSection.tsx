import React from 'react';
import { useCharacterSelection } from '../../../hooks/illustration';
import CosmicButton from '../../UI/CosmicButton';
import { Icon } from '../../UI/Icon';

export interface BatchRequestItem {
  id: string;
  scene_description: string;
  selectedCharacterIds: string[];
  style_template: string;
  aspect_ratio: string;
  scene_type: 'portrait' | 'scene' | 'interaction';
}

interface IllustrationRequestsSectionProps {
  requests: BatchRequestItem[];
  onAddRequest: () => void;
  onRemoveRequest: (id: string) => void;
  onUpdateRequest: (id: string, field: keyof BatchRequestItem, value: string | string[]) => void;
  characterSelection: ReturnType<typeof useCharacterSelection>;
  sceneType: 'portrait' | 'scene' | 'interaction';
  onBatchAddPortraits: () => void;
  className?: string;
}

const IllustrationRequestsSection: React.FC<IllustrationRequestsSectionProps> = ({
  requests,
  onAddRequest,
  onRemoveRequest,
  onUpdateRequest,
  characterSelection,
  sceneType: _sceneType,
  onBatchAddPortraits,
  className = ''
}) => {
  const { selectedCharacters, effectiveProjectCharacters } = characterSelection;

  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          插畫請求 ({requests.length})
        </h3>
        <CosmicButton onClick={onAddRequest} variant="secondary" size="small">
          <Icon name="Plus" variant="solid" className="w-4 h-4 inline mr-1" />
          添加請求
        </CosmicButton>
      </div>

      {/* 智能建議按鈕 */}
      {selectedCharacters.length > 0 && (
        <div className="flex space-x-2 mb-4">
          <CosmicButton
            onClick={onAddRequest}
            variant="secondary"
            size="small"
            disabled={selectedCharacters.length === 0}
          >
            <Icon name="Sparkles" variant="solid" className="w-4 h-4 inline mr-1" />
            基於選中角色生成請求
          </CosmicButton>

          <CosmicButton
            onClick={onBatchAddPortraits}
            variant="secondary"
            size="small"
          >
            <Icon name="PaintBrush" variant="solid" className="w-4 h-4 inline mr-1" />
            為每個角色生成肖像
          </CosmicButton>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((request, index) => (
          <div key={request.id} className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">請求 {index + 1}</span>
              <CosmicButton
                onClick={() => onRemoveRequest(request.id)}
                variant="danger"
                size="small"
              >
                ✕
              </CosmicButton>
            </div>

            {/* 關聯角色顯示 */}
            {request.selectedCharacterIds && request.selectedCharacterIds.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  關聯角色
                </label>
                <div className="flex flex-wrap gap-2">
                  {request.selectedCharacterIds.map(charId => {
                    const character = effectiveProjectCharacters.find(c => c.id === charId);
                    return character ? (
                      <span key={charId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-warm-gold/20 text-warm-gold border border-warm-gold/30">
                        <span className="mr-1">{character.archetype?.includes('魔法') ? '🧙' : '👤'}</span>
                        {character.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  場景描述 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={request.scene_description}
                  onChange={(e) => onUpdateRequest(request.id, 'scene_description', e.target.value)}
                  placeholder="請描述要生成的插畫場景"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-clay-orange resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  場景類型
                </label>
                <select
                  value={request.scene_type}
                  onChange={(e) => onUpdateRequest(request.id, 'scene_type', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-clay-orange"
                >
                  <option value="portrait">🎭 角色肖像</option>
                  <option value="interaction">💬 角色互動</option>
                  <option value="scene">🏰 環境場景</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  風格模板
                </label>
                <select
                  value={request.style_template}
                  onChange={(e) => onUpdateRequest(request.id, 'style_template', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-clay-orange"
                >
                  <option value="anime-portrait">動漫人物肖像</option>
                  <option value="fantasy-scene">奇幻場景</option>
                  <option value="manga-style">漫畫風格</option>
                  <option value="illustration">精美插畫</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-4">尚未添加任何插畫請求</p>
            <CosmicButton onClick={onAddRequest} variant="secondary">
              <Icon name="Plus" variant="solid" className="w-4 h-4 inline mr-1" />
              添加第一個請求
            </CosmicButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default IllustrationRequestsSection;