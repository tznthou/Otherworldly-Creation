import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal, addNotification } from '../../store/slices/uiSlice';
import { NovelTemplate, TEMPLATE_TYPES } from '../../types/template';
import useTemplateApplication, { TemplateApplicationOptions } from '../../hooks/useTemplateApplication';
import { useNavigate } from 'react-router-dom';

interface TemplateApplicationModalProps {
  template: NovelTemplate;
}

const TemplateApplicationModal: React.FC<TemplateApplicationModalProps> = ({ template }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { applyTemplateToProject, isApplying } = useTemplateApplication();
  
  const [options, setOptions] = useState<TemplateApplicationOptions>({
    projectName: `新的${template.name}專案`,
    projectDescription: '',
    applyWorldSetting: true,
    createCharacters: true,
    selectedArchetypes: ['0'] // 預設選擇第一個角色原型
  });

  const handleClose = () => {
    dispatch(closeModal('templateApplication'));
  };

  const handleApply = async () => {
    if (!options.projectName.trim()) {
      dispatch(addNotification({
        type: 'error',
        title: '專案名稱不能為空',
        message: '請輸入專案名稱'
      }));
      return;
    }

    try {
      const result = await applyTemplateToProject(template, options);
      
      if (result.success) {
        dispatch(addNotification({
          type: 'success',
          title: '模板應用成功',
          message: result.message
        }));
        
        handleClose();
        
        // 導航到新創建的專案
        if (result.projectId) {
          navigate(`/project/${result.projectId}`);
        }
      } else {
        dispatch(addNotification({
          type: 'error',
          title: '模板應用失敗',
          message: result.message
        }));
      }
    } catch (_error) {
      dispatch(addNotification({
        type: 'error',
        title: '創建失敗',
        message: '創建專案時發生未知錯誤'
      }));
    }
  };

  const getTemplateIcon = (type: string) => {
    const icons = {
      isekai: '🌟',
      school: '🏫', 
      scifi: '🚀',
      fantasy: '⚔️'
    };
    return icons[type as keyof typeof icons] || '📖';
  };

  const getTemplateColor = (type: string) => {
    const colors = {
      isekai: 'from-gold-500 to-yellow-600',
      school: 'from-pink-500 to-rose-600',
      scifi: 'from-cyan-500 to-blue-600',
      fantasy: 'from-purple-500 to-indigo-600'
    };
    return colors[type as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-dark border border-warm-gold/10 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-warm-gold/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTemplateColor(template.type)} flex items-center justify-center text-2xl`}>
              {getTemplateIcon(template.type)}
            </div>
            <div>
              <h2 className="text-xl font-serif-tc text-warm-gold">應用模板創建專案</h2>
              <p className="text-gray-400 text-sm">{template.name} - {TEMPLATE_TYPES[template.type]}</p>
            </div>
          </div>
        </div>

        {/* 內容 */}
        <div className="p-6 space-y-6">
          {/* 專案基本信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif-tc text-warm-gold">📝 專案信息</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                專案名稱 *
              </label>
              <input
                type="text"
                value={options.projectName}
                onChange={(e) => setOptions(prev => ({ ...prev, projectName: e.target.value }))}
                className="w-full px-3 py-2 bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-500 focus:border-warm-gold"
                placeholder="輸入專案名稱"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                專案描述（可選）
              </label>
              <textarea
                value={options.projectDescription}
                onChange={(e) => setOptions(prev => ({ ...prev, projectDescription: e.target.value }))}
                className="w-full px-3 py-2 bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-500 focus:border-warm-gold resize-none h-20"
                placeholder={`描述您的${TEMPLATE_TYPES[template.type]}故事...`}
                maxLength={500}
              />
            </div>
          </div>

          {/* 模板應用選項 */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif-tc text-warm-gold">⚙️ 應用選項</h3>
            
            {/* 世界觀設定 */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="applyWorldSetting"
                checked={options.applyWorldSetting}
                onChange={(e) => setOptions(prev => ({ ...prev, applyWorldSetting: e.target.checked }))}
                className="mt-1 rounded border-warm-gold/10 bg-bg-light/50 backdrop-blur-sm text-warm-gold focus:ring-gold-500"
              />
              <div>
                <label htmlFor="applyWorldSetting" className="text-white font-medium">
                  應用世界觀設定
                </label>
                <p className="text-gray-400 text-sm">
                  包含時代背景、科技水平、社會結構等世界觀設定
                </p>
              </div>
            </div>

            {/* 角色創建 */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="createCharacters"
                  checked={options.createCharacters}
                  onChange={(e) => setOptions(prev => ({ ...prev, createCharacters: e.target.checked }))}
                  className="mt-1 rounded border-warm-gold/10 bg-bg-light/50 backdrop-blur-sm text-warm-gold focus:ring-gold-500"
                />
                <div>
                  <label htmlFor="createCharacters" className="text-white font-medium">
                    創建角色原型
                  </label>
                  <p className="text-gray-400 text-sm">
                    根據模板自動創建角色，您可以選擇要創建的角色類型
                  </p>
                </div>
              </div>

              {/* 角色選擇 */}
              {options.createCharacters && (
                <div className="ml-6 space-y-2">
                  <p className="text-sm text-gray-300 font-medium">選擇要創建的角色：</p>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {template.characterArchetypes.map((archetype, index) => (
                      <label key={index} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.selectedArchetypes.includes(index.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOptions(prev => ({
                                ...prev,
                                selectedArchetypes: [...prev.selectedArchetypes, index.toString()]
                              }));
                            } else {
                              setOptions(prev => ({
                                ...prev,
                                selectedArchetypes: prev.selectedArchetypes.filter(id => id !== index.toString())
                              }));
                            }
                          }}
                          className="rounded border-warm-gold/10 bg-bg-light/50 backdrop-blur-sm text-warm-gold focus:ring-gold-500"
                        />
                        <span className="text-sm text-gray-300">{archetype.name}</span>
                        <span className="text-xs text-gray-500">({archetype.description})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 模板預覽 */}
          <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">📋 模板預覽</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">類型：</span>
                <span className="text-white">{TEMPLATE_TYPES[template.type]}</span>
              </div>
              <div>
                <span className="text-gray-400">角色原型：</span>
                <span className="text-white">{template.characterArchetypes.length} 個</span>
              </div>
              <div>
                <span className="text-gray-400">主要主題：</span>
                <span className="text-white">{template.writingGuidelines.themes.slice(0, 2).join(', ')}</span>
              </div>
              <div>
                <span className="text-gray-400">寫作風格：</span>
                <span className="text-white">{template.writingGuidelines.style}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-warm-gold/10 flex justify-between">
          <button
            onClick={handleClose}
            disabled={isApplying}
            className="btn-secondary disabled:opacity-50"
          >
            取消
          </button>
          
          <button
            onClick={handleApply}
            disabled={isApplying || !options.projectName.trim()}
            className="btn-primary disabled:opacity-50 flex items-center space-x-2"
          >
            {isApplying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>創建中...</span>
              </>
            ) : (
              <>
                <span>🌟</span>
                <span>創建專案</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateApplicationModal;