import React, { memo } from 'react';
import { useCharacterSelection } from '../../../../hooks/illustration';
import type { Character } from '../../../../api/models';
import CosmicButton from '../../../UI/CosmicButton';

interface CharacterSelectionPanelProps {
  className?: string;
  projectId?: string;
  onSelectionChange?: (selectedIds: string[], selectedCharacters: Character[]) => void;
  maxSelection?: number;
  showSceneTypes?: boolean;
  sceneType?: 'portrait' | 'scene' | 'interaction';
  onSceneTypeChange?: (sceneType: 'portrait' | 'scene' | 'interaction') => void;
}

/**
 * 角色選擇面板組件
 * 
 * 功能：
 * - 顯示專案角色卡片
 * - 支援多選和單選模式
 * - 場景類型選擇
 * - 響應式設計和載入狀態
 */
export const CharacterSelectionPanel: React.FC<CharacterSelectionPanelProps> = memo(({
  className = '',
  projectId,
  onSelectionChange,
  maxSelection,
  showSceneTypes = true,
  sceneType = 'portrait',
  onSceneTypeChange
}) => {
  const {
    // 狀態
    selectedCharacters,
    charactersLoading,
    charactersError,
    
    // 數據
    effectiveProjectCharacters,
    selectedCharacterCount,
    hasSelectedCharacters,
    
    // 函數
    toggleCharacterSelection,
    selectAllCharacters,
    clearSelection,
    loadCharactersDirectly,
    
    // 實用函數
    isCharacterSelected,
    getSelectedCharactersData
  } = useCharacterSelection({ 
    projectId,
    autoLoadOnMount: true 
  });

  // 選擇變更回調
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedData = getSelectedCharactersData();
      onSelectionChange(selectedCharacters, selectedData);
    }
  }, [selectedCharacters, getSelectedCharactersData, onSelectionChange]);

  // 角色選擇處理（支援最大選擇數限制）
  const handleCharacterToggle = (characterId: string) => {
    const isSelected = isCharacterSelected(characterId);
    
    // 檢查最大選擇數限制
    if (!isSelected && maxSelection && selectedCharacterCount >= maxSelection) {
      console.warn(`最多只能選擇 ${maxSelection} 個角色`);
      return;
    }
    
    toggleCharacterSelection(characterId);
  };

  // 獲取角色頭像
  const getCharacterAvatar = (char: Character): string => {
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
  const getArchetypeColor = (archetype: string | undefined): string => {
    if (!archetype) return 'from-gray-600 to-gray-700';
    
    if (archetype.includes('主角') || archetype.includes('英雄')) return 'from-amber-500 to-orange-600';
    if (archetype.includes('反派') || archetype.includes('敵人')) return 'from-red-500 to-red-700';
    if (archetype.includes('魔法') || archetype.includes('法師')) return 'from-purple-500 to-indigo-600';
    if (archetype.includes('戰士') || archetype.includes('騎士')) return 'from-blue-500 to-blue-700';
    if (archetype.includes('配角') || archetype.includes('朋友')) return 'from-green-500 to-green-700';
    return 'from-slate-500 to-slate-700';
  };

  return (
    <div className={`character-selection-panel ${className}`}>
      {/* 標題和控制按鈕 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          🎭 選擇角色 ({selectedCharacterCount}
          {maxSelection ? `/${maxSelection}` : ''} 已選擇)
        </h3>
        <div className="flex items-center space-x-2">
          {charactersLoading && (
            <div className="text-blue-400 text-sm animate-pulse">載入中...</div>
          )}
          <CosmicButton
            onClick={loadCharactersDirectly}
            disabled={charactersLoading}
            variant="secondary"
            size="small"
          >
            🔄 重新載入
          </CosmicButton>
          {hasSelectedCharacters && (
            <CosmicButton
              onClick={clearSelection}
              variant="danger"
              size="small"
            >
              🗑️ 清空選擇
            </CosmicButton>
          )}
          {effectiveProjectCharacters.length > 0 && (!maxSelection || maxSelection > 1) && (
            <CosmicButton
              onClick={selectAllCharacters}
              variant="secondary"
              size="small"
              disabled={maxSelection ? selectedCharacterCount >= maxSelection : undefined}
            >
              ✅ 全選
            </CosmicButton>
          )}
        </div>
      </div>
      
      {/* 錯誤顯示 */}
      {charactersError && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-300">
          <span className="font-medium">載入錯誤：</span> {charactersError}
        </div>
      )}

      {/* 場景類型選擇 */}
      {showSceneTypes && (
        <div className="mb-6">
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
                onClick={() => onSceneTypeChange?.(type.value as typeof sceneType)}
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
      )}
      
      {/* 角色卡片網格 */}
      <div className="character-grid flex flex-wrap gap-6">
        {/* 載入狀態 */}
        {charactersLoading && (
          <div className="w-full text-center py-8 text-blue-400">
            <div className="text-6xl mb-4 animate-spin">🔄</div>
            <p>載入角色中...</p>
          </div>
        )}
        
        {/* 角色卡片 */}
        {effectiveProjectCharacters.map((character) => {
          const isSelected = isCharacterSelected(character.id);
          const isDisabled = Boolean(maxSelection && !isSelected && selectedCharacterCount >= maxSelection);
          
          return (
            <button
              key={character.id}
              onClick={() => handleCharacterToggle(character.id)}
              disabled={isDisabled}
              className={`
                relative w-52 h-36 text-white rounded-xl overflow-hidden group
                transition-all duration-300 ease-out
                ${isSelected 
                  ? 'ring-4 ring-gold-400 shadow-2xl shadow-gold-400/30' 
                  : 'hover:shadow-xl hover:shadow-black/20'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
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
                <div className="absolute top-3 right-3 w-8 h-8 bg-gold-400 rounded-full flex items-center justify-center shadow-lg z-10">
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
        
        {/* 空狀態 */}
        {!charactersLoading && effectiveProjectCharacters.length === 0 && (
          <div className="w-full text-center py-8 text-gray-400">
            <div className="text-6xl mb-4">🎭</div>
            <p className="mb-2">此專案還沒有角色</p>
            <p className="text-sm mt-2 mb-4">請先到角色管理頁面創建角色</p>
          </div>
        )}
      </div>

      {/* 選擇摘要 */}
      {hasSelectedCharacters && (
        <div className="mt-4 p-3 bg-cosmic-800/50 rounded-lg">
          <div className="text-sm text-cosmic-300">
            <span className="font-medium">已選擇角色：</span>
            {getSelectedCharactersData().map(char => char.name).join('、')}
            {maxSelection && (
              <span className="ml-2 text-cosmic-400">
                ({selectedCharacterCount}/{maxSelection})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CharacterSelectionPanel.displayName = 'CharacterSelectionPanel';

export default CharacterSelectionPanel;