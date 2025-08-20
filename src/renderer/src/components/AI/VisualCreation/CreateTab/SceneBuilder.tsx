import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../../store/store';
import { setSceneType } from '../../../../store/slices/visualCreationSlice';

const SceneBuilder: React.FC = () => {
  const dispatch = useDispatch();
  
  const { sceneType, selectedCharacters } = useSelector((state: RootState) => state.visualCreation);
  
  const sceneTypes = [
    {
      id: 'portrait' as const,
      name: '肖像',
      icon: '👤',
      description: '單一角色的精美肖像畫',
      recommendation: '適合展現角色特色和外貌',
      minCharacters: 1,
      maxCharacters: 1,
    },
    {
      id: 'interaction' as const,
      name: '互動',
      icon: '👥',
      description: '角色之間的互動場景',
      recommendation: '展現角色關係和情感交流',
      minCharacters: 2,
      maxCharacters: 4,
    },
    {
      id: 'scene' as const,
      name: '場景',
      icon: '🏞️',
      description: '包含環境背景的完整場景',
      recommendation: '營造故事氛圍和世界觀',
      minCharacters: 0,
      maxCharacters: 6,
    },
  ];
  
  const handleSceneTypeChange = (type: 'portrait' | 'scene' | 'interaction') => {
    dispatch(setSceneType(type));
  };
  
  const getCharacterCountStatus = (minChar: number, maxChar: number) => {
    const count = selectedCharacters.length;
    if (count < minChar) {
      return { status: 'warning', message: `至少需要 ${minChar} 個角色` };
    }
    if (count > maxChar) {
      return { status: 'warning', message: `最多支援 ${maxChar} 個角色` };
    }
    return { status: 'good', message: `角色數量適合 (${count}/${maxChar})` };
  };
  
  return (
    <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
      <h3 className="text-lg font-cosmic text-gold-500 mb-3">🎬 場景類型</h3>
      
      <div className="space-y-3">
        {sceneTypes.map((type) => {
          const isSelected = sceneType === type.id;
          const charStatus = getCharacterCountStatus(type.minCharacters, type.maxCharacters);
          const isDisabled = selectedCharacters.length < type.minCharacters || selectedCharacters.length > type.maxCharacters;
          
          return (
            <div
              key={type.id}
              onClick={() => !isDisabled && handleSceneTypeChange(type.id)}
              className={`
                cursor-pointer p-3 rounded-lg border transition-all duration-200
                ${isSelected 
                  ? 'bg-gold-900/30 border-gold-500 ring-2 ring-gold-500/50' 
                  : isDisabled
                  ? 'bg-cosmic-800/20 border-cosmic-700 opacity-50 cursor-not-allowed'
                  : 'bg-cosmic-700/50 border-cosmic-600 hover:border-cosmic-500 hover:bg-cosmic-700/70'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                {/* 場景圖標 */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg
                  ${isSelected 
                    ? 'bg-gold-600 text-white' 
                    : isDisabled 
                    ? 'bg-cosmic-700 text-cosmic-500'
                    : 'bg-cosmic-600 text-cosmic-300'
                  }
                `}>
                  {type.icon}
                </div>
                
                {/* 場景資訊 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`
                      font-medium
                      ${isSelected ? 'text-gold-300' : isDisabled ? 'text-cosmic-500' : 'text-white'}
                    `}>
                      {type.name}
                    </h4>
                    {isSelected && (
                      <div className="flex-shrink-0 w-4 h-4 bg-gold-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  
                  <p className={`
                    text-sm mb-2
                    ${isSelected ? 'text-gold-200' : isDisabled ? 'text-cosmic-500' : 'text-cosmic-300'}
                  `}>
                    {type.description}
                  </p>
                  
                  <p className={`
                    text-xs mb-2
                    ${isSelected ? 'text-gold-400' : isDisabled ? 'text-cosmic-600' : 'text-cosmic-400'}
                  `}>
                    {type.recommendation}
                  </p>
                  
                  {/* 角色數量狀態 */}
                  <div className="flex items-center space-x-2">
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${charStatus.status === 'good' 
                        ? 'bg-green-900/30 text-green-400' 
                        : 'bg-amber-900/30 text-amber-400'
                      }
                    `}>
                      {charStatus.message}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 當前選擇摘要 */}
      {sceneType && (
        <div className="mt-4 p-3 bg-gold-900/20 border border-gold-700/50 rounded-lg">
          <p className="text-gold-300 text-sm font-medium mb-1">
            當前選擇：{sceneTypes.find(t => t.id === sceneType)?.name} {sceneTypes.find(t => t.id === sceneType)?.icon}
          </p>
          <p className="text-gold-400 text-xs">
            {sceneTypes.find(t => t.id === sceneType)?.description}
          </p>
        </div>
      )}
      
      {/* 使用提示 */}
      <div className="mt-3 text-xs text-cosmic-500">
        <p>💡 不同場景類型會影響 AI 生成的構圖和細節重點</p>
        <p>🎨 肖像注重角色特寫，互動強調表情關係，場景突出環境氛圍</p>
      </div>
    </div>
  );
};

export default SceneBuilder;