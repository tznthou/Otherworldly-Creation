import React, { useState } from 'react';
import { CHARACTER_ARCHETYPE_TEMPLATES, CharacterArchetypeTemplate, getRecommendedArchetypes } from '../../data/characterArchetypes';

interface ArchetypeSelectorProps {
  selectedArchetype?: string;
  onSelect: (archetype: string) => void;
  projectType?: string;
  className?: string;
}

export const ArchetypeSelector: React.FC<ArchetypeSelectorProps> = ({
  selectedArchetype,
  onSelect,
  projectType,
  className = '',
}) => {
  const [showAll, setShowAll] = useState(false);
  
  // 根據專案類型獲取推薦的原型，如果沒有專案類型則顯示全部
  const recommendedArchetypes = projectType ? getRecommendedArchetypes(projectType) : CHARACTER_ARCHETYPE_TEMPLATES;
  const allArchetypes = CHARACTER_ARCHETYPE_TEMPLATES;
  
  const displayArchetypes = showAll ? allArchetypes : recommendedArchetypes;
  
  const handleArchetypeClick = (template: CharacterArchetypeTemplate) => {
    onSelect(template.name);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 標題和切換按鈕 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          {showAll ? '所有角色原型' : '推薦原型'}
        </h4>
        {projectType && recommendedArchetypes.length < allArchetypes.length && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showAll ? '顯示推薦' : '顯示全部'}
          </button>
        )}
      </div>
      
      {/* 原型網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayArchetypes.map((template) => {
          const isSelected = selectedArchetype === template.name;
          
          return (
            <div
              key={template.id}
              onClick={() => handleArchetypeClick(template)}
              className={`
                relative p-3 border rounded-lg cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {/* 選中指示器 */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              
              {/* 原型名稱 */}
              <h5 className={`font-medium mb-1 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                {template.name}
              </h5>
              
              {/* 原型描述 */}
              <p className={`text-xs mb-2 line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                {template.description}
              </p>
              
              {/* 標籤 */}
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className={`
                      inline-block px-1.5 py-0.5 text-xs font-medium rounded-full
                      ${isSelected 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700'
                      }
                    `}
                  >
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className={`
                    inline-block px-1.5 py-0.5 text-xs font-medium rounded-full
                    ${isSelected 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}>
                    +{template.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 清除選擇 */}
      {selectedArchetype && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => onSelect('')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            清除選擇
          </button>
        </div>
      )}
    </div>
  );
};