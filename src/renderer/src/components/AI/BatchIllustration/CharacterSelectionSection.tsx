import React from 'react';
import { Character } from '../../../api/models';
import { useCharacterSelection } from '../../../hooks/illustration';

interface CharacterSelectionSectionProps {
  characterSelection: ReturnType<typeof useCharacterSelection>;
  sceneType: 'portrait' | 'scene' | 'interaction';
  onSceneTypeChange: (sceneType: 'portrait' | 'scene' | 'interaction') => void;
  className?: string;
}

const CharacterSelectionSection: React.FC<CharacterSelectionSectionProps> = ({
  characterSelection,
  sceneType,
  onSceneTypeChange,
  className = ''
}) => {
  const {
    selectedCharacters,
    charactersLoading,
    charactersError,
    effectiveProjectCharacters,
    toggleCharacterSelection,
    loadCharactersDirectly
  } = characterSelection;

  // 獲取角色頭像
  const getCharacterAvatar = (char: Character) => {
    if (char.gender === 'female') {
      return char.archetype?.includes('魔法') || char.archetype?.includes('法師') ? '🧙‍♀️' : '👩';
    } else if (char.gender === 'male') {
      return char.archetype?.includes('魔法') || char.archetype?.includes('法師') ? '🧙‍♂️' : '👨';
    }
    // 根據角色類型
    if (char.archetype?.includes('魔法') || char.archetype?.includes('法師')) return '🧙';
    if (char.archetype?.includes('戰士') || char.archetype?.includes('騎士')) return '⚔️';
    if (char.archetype?.includes('盜賊') || char.archetype?.includes('刺客')) return '🗡️';
    if (char.archetype?.includes('治療') || char.archetype?.includes('牧師')) return '🛡️';
    return '👤';
  };

  // 獲取角色類型顏色
  const getArchetypeColor = (archetype: string | undefined) => {
    if (!archetype) return 'from-gray-600 to-gray-700';
    
    if (archetype.includes('主角') || archetype.includes('英雄')) return 'from-amber-500 to-orange-600';
    if (archetype.includes('反派') || archetype.includes('敵人')) return 'from-red-500 to-red-700';
    if (archetype.includes('魔法') || archetype.includes('法師')) return 'from-purple-500 to-indigo-600';
    if (archetype.includes('戰士') || archetype.includes('騎士')) return 'from-blue-500 to-blue-700';
    if (archetype.includes('配角') || archetype.includes('朋友')) return 'from-green-500 to-green-700';
    return 'from-slate-500 to-slate-700';
  };

  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          🎭 選擇角色 ({selectedCharacters.length} 已選擇)
        </h3>
        <div className="flex items-center space-x-2">
          {charactersLoading && (
            <div className="text-blue-400 text-sm animate-pulse">載入中...</div>
          )}
          <button
            onClick={loadCharactersDirectly}
            disabled={charactersLoading}
            className="px-3 py-1 bg-cosmic-700 hover:bg-cosmic-600 disabled:opacity-50 text-cosmic-200 rounded text-sm transition-colors"
          >
            🔄 重新載入
          </button>
        </div>
      </div>
      
      {charactersError && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-300">
          <span className="font-medium">載入錯誤：</span> {charactersError}
        </div>
      )}
      
      <div className="character-grid flex flex-wrap gap-6 mb-6">
        {charactersLoading && (
          <div className="col-span-full text-center py-8 text-blue-400">
            <div className="text-6xl mb-4 animate-spin">🔄</div>
            <p>載入角色中...</p>
          </div>
        )}
        {effectiveProjectCharacters.map((character) => {
          const isSelected = selectedCharacters.includes(character.id);

          return (
            <button
              key={character.id}
              onClick={() => toggleCharacterSelection(character.id)}
              className={`
                relative w-52 h-36 text-white rounded-xl overflow-hidden group
                transition-all duration-300 ease-out
                ${isSelected 
                  ? 'ring-4 ring-gold-400 shadow-2xl shadow-gold-400/30' 
                  : 'hover:shadow-xl hover:shadow-black/20'
                }
                bg-gradient-to-br ${getArchetypeColor(character.archetype)}
                border-2 ${isSelected ? 'border-gold-300' : 'border-white/20'}
              `}
            >
              {/* 背景裝飾 */}
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-tr-full"></div>
              
              {/* 選中狀態指示器 */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-8 h-8 bg-gold-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-black text-lg font-bold">✓</span>
                </div>
              )}
              
              {/* 角色頭像 */}
              <div className="absolute top-4 left-4 text-4xl filter drop-shadow-lg">
                {getCharacterAvatar(character)}
              </div>
              
              {/* 角色信息 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                {/* 角色名稱 */}
                <h4 className="text-lg font-bold text-white mb-1 truncate">
                  {character.name}
                </h4>
                
                {/* 角色類型標籤 */}
                {character.archetype && (
                  <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                    {character.archetype}
                  </span>
                )}
                
                {/* 年齡 */}
                {character.age && (
                  <div className="text-xs text-white/80 mt-1">
                    📅 {character.age}歲
                  </div>
                )}
              </div>

              {/* Hover效果 */}
              <div className={`
                absolute inset-0 bg-gradient-to-t from-transparent to-white/10 
                opacity-0 group-hover:opacity-100 transition-opacity duration-300
                ${isSelected ? 'opacity-20' : ''}
              `}></div>
            </button>
          );
        })}
        
        {!charactersLoading && effectiveProjectCharacters.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400">
            <div className="text-6xl mb-4">🎭</div>
            <p className="mb-2">此專案還沒有角色</p>
            <p className="text-sm mt-2 mb-4">請先到角色管理頁面創建角色</p>
          </div>
        )}
      </div>

      {/* 場景類型選擇 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          場景類型
        </label>
        <div className="flex space-x-2">
          {[
            { value: 'portrait', label: '🎭 角色肖像', desc: '單一角色精美肖像' },
            { value: 'interaction', label: '💬 角色互動', desc: '多角色對話場景' },
            { value: 'scene', label: '🏰 環境場景', desc: '角色在特定環境中' }
          ].map(type => (
            <button
              key={type.value}
              onClick={() => onSceneTypeChange(type.value as 'portrait' | 'scene' | 'interaction')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                sceneType === type.value
                  ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                  : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="text-center">
                <div className="text-sm font-medium">{type.label}</div>
                <div className="text-xs opacity-75">{type.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharacterSelectionSection;