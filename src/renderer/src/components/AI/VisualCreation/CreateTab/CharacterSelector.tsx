import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../store/store';
import { toggleCharacterSelection, setSelectedCharacters } from '../../../../store/slices/visualCreationSlice';
import Tooltip from '../../../UI/Tooltip';
import { GUIDANCE_TEXTS } from '../shared/guidanceTexts';

const CharacterSelector: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux 狀態
  const { selectedCharacters } = useSelector((state: RootState) => state.visualCreation);
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 獲取項目角色 - 強化過濾邏輯
  const projectCharacters = characters.filter(c => {
    // 確保類型一致比較，處理string vs number的情況
    const charProjectId = String(c.projectId);
    const currentProjectId = String(currentProject?.id);
    const match = charProjectId === currentProjectId;
    
    if (!match && characters.length > 0) {
      console.log(`🎯 [CharacterSelector] 角色過濾: ${c.name} - 角色ProjectId: "${charProjectId}" (${typeof c.projectId}), 當前ProjectId: "${currentProjectId}" (${typeof currentProject?.id}), 匹配: ${match}`);
    }
    
    return match;
  });
  
  // 調試信息
  console.log('🐛 [CharacterSelector Debug] =================');
  console.log('📂 currentProject:', currentProject);
  console.log('🔑 currentProject?.id:', currentProject?.id, '(類型:', typeof currentProject?.id, ')');
  console.log('📊 Redux characters總數:', characters.length);
  console.log('🎯 projectCharacters總數 (過濾後):', projectCharacters.length);
  
  if (characters.length > 0 && projectCharacters.length === 0) {
    console.log('❌ 沒有找到匹配的角色！');
    console.log('📋 所有角色詳情:', characters.map(c => ({ 
      id: c.id, 
      name: c.name, 
      projectId: c.projectId, 
      projectIdType: typeof c.projectId 
    })));
  }
  console.log('========================================');
  
  // 處理角色選擇
  const handleCharacterToggle = (characterId: string) => {
    dispatch(toggleCharacterSelection(characterId));
  };
  
  // 全選/取消全選
  const handleSelectAll = () => {
    if (selectedCharacters.length === projectCharacters.length) {
      dispatch(setSelectedCharacters([])); // 取消全選
    } else {
      dispatch(setSelectedCharacters(projectCharacters.map(c => c.id))); // 全選
    }
  };
  
  if (!currentProject) {
    return (
      <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
        <h3 className="text-lg font-cosmic text-gold-500 mb-2">👥 角色選擇</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-cosmic-400 text-sm mb-2">請先選擇專案</p>
          <p className="text-cosmic-500 text-xs">
            選擇專案後即可看到可用角色
          </p>
        </div>
      </div>
    );
  }
  
  if (projectCharacters.length === 0) {
    return (
      <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
        <h3 className="text-lg font-cosmic text-gold-500 mb-2">👥 角色選擇</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-cosmic-400 text-sm mb-2">{GUIDANCE_TEXTS.characterSelection.emptyState}</p>
          <p className="text-cosmic-500 text-xs mb-3">
            角色是創作插畫的核心，快去創建您的第一個角色吧！
          </p>
          <Tooltip content="前往角色管理頁面創建新角色">
            <button className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white text-sm rounded transition-colors">
              ➕ 創建角色
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-cosmic text-gold-500">👥 角色選擇</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-cosmic-400">
            已選 {selectedCharacters.length}/{projectCharacters.length}
          </span>
          <button
            onClick={handleSelectAll}
            className="text-xs px-2 py-1 bg-cosmic-700 hover:bg-cosmic-600 text-cosmic-300 hover:text-white rounded transition-colors"
          >
            {selectedCharacters.length === projectCharacters.length ? '取消全選' : '全選'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {projectCharacters.map((character) => {
          const isSelected = selectedCharacters.includes(character.id);
          
          return (
            <Tooltip
              key={character.id}
              content={isSelected ? '點擊取消選擇' : GUIDANCE_TEXTS.characterSelection.tooltip}
              position="top"
            >
              <div
                onClick={() => handleCharacterToggle(character.id)}
                className={`
                  cursor-pointer p-3 rounded-lg border transition-all duration-200
                  ${isSelected 
                    ? 'bg-gold-900/30 border-gold-500 ring-2 ring-gold-500/50' 
                    : 'bg-cosmic-700/50 border-cosmic-600 hover:border-cosmic-500 hover:bg-cosmic-700/70'
                  }
                `}
              >
              <div className="flex items-start space-x-3">
                {/* 角色頭像或圖標 */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold
                  ${isSelected 
                    ? 'bg-gold-600 text-white' 
                    : 'bg-cosmic-600 text-cosmic-300'
                  }
                `}>
                  {character.name.charAt(0)}
                </div>
                
                {/* 角色資訊 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className={`
                      font-medium truncate
                      ${isSelected ? 'text-gold-300' : 'text-white'}
                    `}>
                      {character.name}
                    </h4>
                    {isSelected && (
                      <div className="flex-shrink-0 w-4 h-4 bg-gold-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  
                  {character.personality && (
                    <p className="text-xs text-cosmic-400 truncate mb-1">
                      {character.personality.length > 20 ? character.personality.slice(0, 20) + '...' : character.personality}
                    </p>
                  )}
                  
                  {character.appearance && (
                    <p className="text-xs text-cosmic-500 line-clamp-2">
                      {character.appearance}
                    </p>
                  )}
                </div>
              </div>
              
              {/* 選擇狀態指示器 */}
              <div className={`
                mt-2 h-1 rounded-full transition-all duration-200
                ${isSelected ? 'bg-gold-500' : 'bg-cosmic-600'}
              `} />
            </div>
          </Tooltip>
          );
        })}
      </div>
      
      {/* 選擇提示 */}
      {selectedCharacters.length > 0 && (
        <div className="mt-3 p-2 bg-gold-900/20 border border-gold-700/50 rounded text-xs">
          <p className="text-gold-300">
            <span className="font-medium">已選擇角色：</span>
            {selectedCharacters.map(id => {
              const char = projectCharacters.find(c => c.id === id);
              return char?.name;
            }).filter(Boolean).join('、')}
          </p>
        </div>
      )}
      
      {/* 使用提示 */}
      <div className="mt-3 text-xs text-cosmic-500">
        <p>💡 選擇的角色將出現在生成的插畫中</p>
        <p>📝 建議：肖像選 1 個角色，互動選 2-3 個，場景可選多個</p>
      </div>
    </div>
  );
};

export default CharacterSelector;