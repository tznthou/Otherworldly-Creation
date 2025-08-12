import React from 'react';
import { Character } from '../../api/models';

interface CharacterCardProps {
  character: Character;
  selected: boolean;
  onSelect: (characterId: string) => void;
  showDetails?: boolean;
  className?: string;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ 
  character, 
  selected, 
  onSelect, 
  showDetails = false,
  className = ''
}) => {
  const getCharacterAvatar = (char: Character) => {
    // 根據性別和角色類型返回合適的表情符號
    if (char.gender === 'female') {
      return char.archetype?.includes('魔法') || char.archetype?.includes('法師') ? '🧙‍♀️' : '👩';
    } else if (char.gender === 'male') {
      return char.archetype?.includes('魔法') || char.archetype?.includes('法師') ? '🧙‍♂️' : '👨';
    }
    // 默認根據角色類型
    if (char.archetype?.includes('魔法') || char.archetype?.includes('法師')) return '🧙';
    if (char.archetype?.includes('戰士') || char.archetype?.includes('騎士')) return '⚔️';
    if (char.archetype?.includes('盜賊') || char.archetype?.includes('刺客')) return '🗡️';
    if (char.archetype?.includes('治療') || char.archetype?.includes('牧師')) return '🛡️';
    return '👤';
  };

  const getArchetypeColor = (archetype?: string) => {
    if (!archetype) return 'bg-gray-600';
    
    if (archetype.includes('主角') || archetype.includes('英雄')) return 'bg-gold-600';
    if (archetype.includes('反派') || archetype.includes('敵人')) return 'bg-red-600';
    if (archetype.includes('魔法') || archetype.includes('法師')) return 'bg-purple-600';
    if (archetype.includes('戰士') || archetype.includes('騎士')) return 'bg-blue-600';
    if (archetype.includes('配角') || archetype.includes('朋友')) return 'bg-green-600';
    return 'bg-cosmic-600';
  };

  return (
    <div 
      className={`
        character-card relative cursor-pointer transition-all duration-200 
        ${selected 
          ? 'ring-2 ring-gold-500 bg-cosmic-800/80' 
          : 'bg-cosmic-800/40 hover:bg-cosmic-800/60'
        }
        rounded-lg p-4 min-h-[120px] flex flex-col items-center text-center
        ${className}
      `}
      onClick={(e) => {
        console.log('🚨 點擊事件詳情:');
        console.log('角色名稱:', character.name);
        console.log('角色ID:', character.id);
        console.log('點擊座標:', e.clientX, e.clientY);
        console.log('目標元素:', e.currentTarget);
        console.log('事件階段:', e.eventPhase);
        onSelect(character.id);
      }}
    >
      {/* 選中狀態指示器 */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}

      {/* 角色頭像 */}
      <div className="text-3xl mb-2 transition-transform duration-200 hover:scale-110">
        {getCharacterAvatar(character)}
      </div>

      {/* 角色名稱 */}
      <h4 className="text-white font-medium text-sm mb-1 truncate w-full">
        {character.name}
      </h4>

      {/* 角色類型標籤 */}
      {character.archetype && (
        <span className={`
          px-2 py-1 rounded-full text-xs text-white font-medium mb-2
          ${getArchetypeColor(character.archetype)}
        `}>
          {character.archetype}
        </span>
      )}

      {/* 詳細資訊 */}
      {showDetails && character.personality && (
        <p className="text-gray-300 text-xs leading-tight line-clamp-2">
          {character.personality.slice(0, 40)}...
        </p>
      )}

      {/* 角色統計 */}
      <div className="flex items-center justify-center space-x-2 mt-auto text-xs text-gray-400">
        {character.age && (
          <span>📅 {character.age}歲</span>
        )}
        {character.relationships && character.relationships.length > 0 && (
          <span>👥 {character.relationships.length}</span>
        )}
      </div>

      {/* 載入動畫 */}
      <div className={`
        absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent
        transform -skew-x-12 -translate-x-full transition-transform duration-1000
        ${selected ? 'translate-x-full' : ''}
      `} />
    </div>
  );
};

export default CharacterCard;