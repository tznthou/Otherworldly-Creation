import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal, openModal, setSelectedTemplate } from '../../store/slices/uiSlice';
import { fetchAllTemplates } from '../../store/slices/templatesSlice';
import { Icon } from '../UI/Icon';
import { NovelTemplate, TEMPLATE_TYPES } from '../../types/template';

const TemplateManagerModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { templates, loading } = useAppSelector(state => state.templates);
  const [localSelectedTemplate, setLocalSelectedTemplate] = useState<NovelTemplate | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    dispatch(fetchAllTemplates());
  }, [dispatch]);

  const handleClose = () => {
    dispatch(closeModal('templateManager'));
  };

  const handleTemplateSelect = (template: NovelTemplate) => {
    setLocalSelectedTemplate(template);
    setView('detail');
  };

  const handleApplyTemplate = (template: NovelTemplate) => {
    // 儲存選中的模板並打開應用模態框
    dispatch(setSelectedTemplate(template));
    dispatch(closeModal('templateManager'));
    dispatch(openModal('templateApplication'));
  };

  const getTemplateIcon = (type: string): { name: string; variant: 'outline' | 'solid' } => {
    const icons = {
      isekai: { name: 'Sparkles', variant: 'solid' as const },
      school: { name: 'Heart', variant: 'solid' as const },
      scifi: { name: 'RocketLaunch', variant: 'solid' as const },
      fantasy: { name: 'Bolt', variant: 'solid' as const }
    };
    return icons[type as keyof typeof icons] || { name: 'BookOpen', variant: 'outline' as const };
  };

  const getTemplateColor = (type: string) => {
    const colors = {
      isekai: 'from-purple-500 to-pink-500',
      school: 'from-pink-500 to-rose-500',
      scifi: 'from-blue-500 to-cyan-500',
      fantasy: 'from-purple-500 to-violet-500'
    };
    return colors[type as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10001] p-4" style={{ isolation: 'isolate' }}>
        <div className="bg-bg-dark border border-warm-gold/10 rounded-xl shadow-xl p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-warm-gold"></div>
            <span className="text-warm-gold">載入模板中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10001] p-4" style={{ isolation: 'isolate' }}>
      <div className="bg-bg-dark border border-warm-gold/10 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-warm-gold/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {view === 'detail' && (
              <button
                onClick={() => setView('list')}
                className="text-gray-400 hover:text-warm-gold transition-colors"
              >
                ← 返回
              </button>
            )}
            <h2 className="text-xl font-serif-tc text-warm-gold">
              🎭 {view === 'detail' ? localSelectedTemplate?.name : '輕小說模板'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 模板列表視圖 */}
        {view === 'list' && (
          <div className="p-6">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">📚</div>
              <h3 className="text-xl font-serif-tc text-warm-gold mb-2">選擇創作模板</h3>
              <p className="text-gray-300">
                選擇合適的模板，快速開始您的輕小說創作之旅
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="card card-hover group cursor-pointer" onClick={() => handleTemplateSelect(template)}>
                  <div className="relative overflow-hidden">
                    {/* 背景漸變 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${getTemplateColor(template.type)} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                    
                    {/* 內容 */}
                    <div className="relative p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTemplateColor(template.type)} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon
                              name={getTemplateIcon(template.type).name}
                              variant={getTemplateIcon(template.type).variant}
                              className="w-6 h-6 text-white"
                            />
                          </div>
                          <div>
                            <h4 className="font-serif-tc text-lg text-white group-hover:text-warm-gold transition-colors">
                              {template.name}
                            </h4>
                            <span className="text-sm text-gray-400">
                              {TEMPLATE_TYPES[template.type]}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {template.description}
                      </p>

                      {/* 特色標籤 */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {template.characterArchetypes.slice(0, 3).map((archetype, index) => (
                          <span key={index} className="px-2 py-1 bg-bg-light/50 backdrop-blur-sm text-xs text-gray-300 rounded-full">
                            {archetype.name}
                          </span>
                        ))}
                        {template.characterArchetypes.length > 3 && (
                          <span className="px-2 py-1 bg-bg-light/50 backdrop-blur-sm text-xs text-gray-400 rounded-full">
                            +{template.characterArchetypes.length - 3}
                          </span>
                        )}
                      </div>

                      {/* 底部信息 */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">v{template.version}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">點擊查看詳情</span>
                          <span className="text-warm-gold group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 模板詳情視圖 */}
        {view === 'detail' && localSelectedTemplate && (
          <div className="p-6 space-y-6">
            {/* 模板概述 */}
            <div className="card">
              <div className="flex items-start space-x-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getTemplateColor(localSelectedTemplate.type)} flex items-center justify-center`}>
                  <Icon
                    name={getTemplateIcon(localSelectedTemplate.type).name}
                    variant={getTemplateIcon(localSelectedTemplate.type).variant}
                    className="w-8 h-8 text-white"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-serif-tc text-white mb-2">{localSelectedTemplate.name}</h3>
                  <p className="text-gray-300 mb-3">{localSelectedTemplate.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>類型：{TEMPLATE_TYPES[localSelectedTemplate.type]}</span>
                    <span>版本：v{localSelectedTemplate.version}</span>
                    <span>角色原型：{localSelectedTemplate.characterArchetypes.length}個</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 世界觀設定 */}
            <div className="card">
              <h4 className="text-lg font-serif-tc text-warm-gold mb-4">🌍 世界觀設定</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-white font-medium mb-2">時代背景</h5>
                  <p className="text-gray-300 text-sm">{localSelectedTemplate.worldSetting.era}</p>
                </div>
                <div>
                  <h5 className="text-white font-medium mb-2">科技水平</h5>
                  <p className="text-gray-300 text-sm">{localSelectedTemplate.worldSetting.technology}</p>
                </div>
                <div>
                  <h5 className="text-white font-medium mb-2">社會結構</h5>
                  <p className="text-gray-300 text-sm">{localSelectedTemplate.worldSetting.society}</p>
                </div>
                <div>
                  <h5 className="text-white font-medium mb-2">特殊元素</h5>
                  <div className="flex flex-wrap gap-1">
                    {localSelectedTemplate.worldSetting.specialElements.map((element, index) => (
                      <span key={index} className="px-2 py-1 bg-bg-light/50 backdrop-blur-sm text-xs text-gray-300 rounded">
                        {element}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 角色原型 */}
            <div className="card">
              <h4 className="text-lg font-serif-tc text-warm-gold mb-4">👥 角色原型</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localSelectedTemplate.characterArchetypes.slice(0, 4).map((archetype, index) => (
                  <div key={index} className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">{archetype.name}</h5>
                    <p className="text-gray-300 text-sm mb-2">{archetype.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {archetype.commonTraits.slice(0, 3).map((trait, traitIndex) => (
                        <span key={traitIndex} className="px-2 py-1 bg-bg-dark/80 text-xs text-gray-400 rounded">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {localSelectedTemplate.characterArchetypes.length > 4 && (
                <p className="text-center text-gray-400 text-sm mt-4">
                  還有 {localSelectedTemplate.characterArchetypes.length - 4} 個角色原型...
                </p>
              )}
            </div>

            {/* 寫作指導 */}
            <div className="card">
              <h4 className="text-lg font-serif-tc text-warm-gold mb-4">✍️ 寫作指導</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-white font-medium mb-2">寫作風格</h5>
                  <p className="text-gray-300 text-sm mb-4">{localSelectedTemplate.writingGuidelines.style}</p>
                  
                  <h5 className="text-white font-medium mb-2">主要主題</h5>
                  <div className="flex flex-wrap gap-1">
                    {localSelectedTemplate.writingGuidelines.themes.map((theme, index) => (
                      <span key={index} className="px-2 py-1 bg-bg-light/50 backdrop-blur-sm text-xs text-gray-300 rounded">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-white font-medium mb-2">語調</h5>
                  <p className="text-gray-300 text-sm mb-4">{localSelectedTemplate.writingGuidelines.tone}</p>
                  
                  <h5 className="text-white font-medium mb-2">節奏控制</h5>
                  <p className="text-gray-300 text-sm">{localSelectedTemplate.writingGuidelines.pacing}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-warm-gold/10 flex justify-between">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            關閉
          </button>
          
          {view === 'detail' && localSelectedTemplate && (
            <button
              onClick={() => handleApplyTemplate(localSelectedTemplate)}
              className="btn-primary"
            >
              🌟 使用此模板創建專案
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateManagerModal;