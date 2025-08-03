import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createProject } from '../../store/slices/projectsSlice';
import { closeModal } from '../../store/slices/uiSlice';
import { fetchAvailableModels } from '../../store/slices/aiSlice';
import { fetchAllTemplates } from '../../store/slices/templatesSlice';

interface ProjectType {
  id: 'isekai' | 'school' | 'scifi' | 'fantasy';
  name: string;
  icon: string;
  description: string;
  color: string;
}

const projectTypes: ProjectType[] = [
  {
    id: 'isekai',
    name: '異世界',
    icon: '🌟',
    description: '主角穿越或轉生到異世界的冒險故事',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'school',
    name: '校園',
    icon: '🏫',
    description: '以學校為背景的青春戀愛或成長故事',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'scifi',
    name: '科幻',
    icon: '🚀',
    description: '探索未來科技和太空冒險的故事',
    color: 'from-green-500 to-teal-500',
  },
  {
    id: 'fantasy',
    name: '奇幻',
    icon: '⚔️',
    description: '充滿魔法和神秘生物的奇幻世界冒險',
    color: 'from-orange-500 to-red-500',
  },
];

interface TemplateSettings {
  // 異世界設定
  levelSystem?: string;
  magicSystem?: string;
  reincarnation?: string;
  
  // 校園設定
  schoolName?: string;
  schoolType?: string;
  
  // 科幻設定
  techLevel?: string;
  worldSetting?: string;
  
  // 奇幻設定
  races?: string;
}

interface AISettings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

const CreateProjectModal: React.FC = () => {
  console.log('CreateProjectModal 被渲染');
  const dispatch = useAppDispatch();
  const { availableModels, isOllamaConnected } = useAppSelector(state => state.ai);
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedType, setSelectedType] = useState<ProjectType['id'] | null>(null);
  
  // 模板設定
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({});
  
  // AI 設定
  const [aiSettings, setAiSettings] = useState<AISettings>({
    model: 'llama3',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 200,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    type?: string;
    model?: string;
  }>({});
  
  // 載入可用的 AI 模型
  useEffect(() => {
    if (isOllamaConnected) {
      dispatch(fetchAvailableModels());
    }
  }, [dispatch, isOllamaConnected]);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    dispatch(closeModal('createProject'));
  };

  const validateStep1 = () => {
    const newErrors: {
      name?: string;
      type?: string;
    } = {};

    if (!projectName.trim()) {
      newErrors.name = '請輸入專案名稱';
    }

    if (!selectedType) {
      newErrors.type = '請選擇專案類型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep2 = () => {
    // 步驟 2 沒有必填欄位，直接返回 true
    return true;
  };
  
  const validateStep3 = () => {
    const newErrors: {
      model?: string;
    } = {};

    if (!aiSettings.model) {
      newErrors.model = '請選擇 AI 模型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      
      // 根據選擇的專案類型設置默認的模板設定
      if (selectedType) {
        const defaultSettings: TemplateSettings = {};
        
        switch (selectedType) {
          case 'isekai':
            defaultSettings.levelSystem = '等級與技能系統';
            defaultSettings.magicSystem = '元素魔法';
            defaultSettings.reincarnation = '車禍後轉生';
            break;
          case 'school':
            defaultSettings.schoolName = '櫻花高中';
            defaultSettings.schoolType = '普通高中';
            break;
          case 'scifi':
            defaultSettings.techLevel = '近未來科技';
            defaultSettings.worldSetting = '太空殖民時代';
            break;
          case 'fantasy':
            defaultSettings.magicSystem = '魔法與咒語';
            defaultSettings.races = '人類、精靈、矮人、獸人';
            break;
        }
        
        setTemplateSettings(defaultSettings);
      }
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    if (!validateStep3()) {
      return;
    }

    if (!selectedType) return;

    setIsSubmitting(true);

    try {
      // 1. 創建專案
      const projectResult = await dispatch(createProject({
        name: projectName,
        type: selectedType,
        description: projectDescription,
        settings: {
          aiModel: aiSettings.model,
          aiParams: {
            temperature: aiSettings.temperature,
            topP: aiSettings.topP,
            maxTokens: aiSettings.maxTokens,
          },
        },
      })).unwrap();

      // 2. 應用對應的模板
      try {
        // 載入模板
        await dispatch(fetchAllTemplates());
        
        // 找到對應類型的預設模板
        const templateId = `${selectedType}-default`;
        const { templateService } = await import('../../services/templateService');
        
        // 應用模板到新創建的專案
        const applicationResult = await templateService.applyTemplateToProject(
          templateId,
          projectResult.id,
          {
            createCharacters: true,
            updateProjectSettings: true
          }
        );

        if (!applicationResult.success) {
          console.warn('模板應用失敗:', applicationResult.message);
          // 不阻止專案創建，只是記錄警告
        }
      } catch (templateError) {
        console.error('應用模板失敗:', templateError);
        // 不阻止專案創建，模板應用失敗不影響專案創建
      }

      handleClose();
    } catch (error) {
      console.error('創建專案失敗:', error);
      setErrors({
        name: '創建專案失敗，請稍後再試',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 處理模板設定變更
  const handleTemplateSettingChange = (key: keyof TemplateSettings, value: string) => {
    setTemplateSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 處理 AI 設定變更
  const handleAISettingChange = (key: keyof AISettings, value: any) => {
    setAiSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-2xl relative my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between relative z-10 flex-shrink-0">
          <h2 className="text-xl font-cosmic text-gold-500">創建新專案</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white hover:bg-cosmic-700 text-2xl p-2 rounded-lg transition-colors"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        {/* 內容 */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* 步驟指示器 */}
          <div className="flex items-center mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 1 ? 'bg-gold-500 text-cosmic-900' : 'bg-cosmic-700 text-gold-500'
            }`}>
              1
            </div>
            <div className={`h-1 flex-1 mx-2 ${
              step >= 2 ? 'bg-gold-500' : 'bg-cosmic-700'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 2 ? 'bg-gold-500 text-cosmic-900' : (step > 2 ? 'bg-cosmic-700 text-gold-500' : 'bg-cosmic-700 text-gray-300')
            }`}>
              2
            </div>
            <div className={`h-1 flex-1 mx-2 ${
              step >= 3 ? 'bg-gold-500' : 'bg-cosmic-700'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 3 ? 'bg-gold-500 text-cosmic-900' : 'bg-cosmic-700 text-gray-300'
            }`}>
              3
            </div>
          </div>

          {/* 步驟 1：基本資訊 */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">專案名稱</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="輸入專案名稱"
                  className={`w-full bg-cosmic-800 border ${
                    errors.name ? 'border-red-500' : 'border-cosmic-700'
                  } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-gray-300 mb-2">選擇專案類型</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-4 rounded-lg cursor-pointer border ${
                        selectedType === type.id
                          ? 'border-gold-500 bg-cosmic-800'
                          : 'border-cosmic-700 bg-cosmic-900 hover:bg-cosmic-800'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-2xl mr-3`}>
                          {type.icon}
                        </div>
                        <h3 className="text-lg font-medium text-white">
                          {type.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400">
                        {type.description}
                      </p>
                    </div>
                  ))}
                </div>
                {errors.type && (
                  <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                )}
              </div>
            </div>
          )}

          {/* 步驟 2：詳細資訊和模板設定 */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">專案描述（選填）</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="輸入專案描述..."
                  rows={3}
                  className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                ></textarea>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gold-400 mb-4">模板設定</h3>
                <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
                  {selectedType === 'isekai' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-2">等級系統</label>
                        <input
                          type="text"
                          value={templateSettings.levelSystem || ''}
                          onChange={(e) => handleTemplateSettingChange('levelSystem', e.target.value)}
                          placeholder="例如：等級與技能系統"
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">魔法系統</label>
                        <input
                          type="text"
                          value={templateSettings.magicSystem || ''}
                          onChange={(e) => handleTemplateSettingChange('magicSystem', e.target.value)}
                          placeholder="例如：元素魔法"
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">轉生設定</label>
                        <input
                          type="text"
                          value={templateSettings.reincarnation || ''}
                          onChange={(e) => handleTemplateSettingChange('reincarnation', e.target.value)}
                          placeholder="例如：車禍後轉生"
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                    </div>
                  )}

                  {selectedType === 'school' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-2">學校名稱</label>
                        <input
                          type="text"
                          value={templateSettings.schoolName || ''}
                          onChange={(e) => handleTemplateSettingChange('schoolName', e.target.value)}
                          placeholder="例如：櫻花高中"
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">學校類型</label>
                        <select
                          value={templateSettings.schoolType || ''}
                          onChange={(e) => handleTemplateSettingChange('schoolType', e.target.value)}
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        >
                          <option value="">選擇學校類型</option>
                          <option value="普通高中">普通高中</option>
                          <option value="私立貴族學校">私立貴族學校</option>
                          <option value="藝術學校">藝術學校</option>
                          <option value="體育學校">體育學校</option>
                          <option value="魔法學院">魔法學院</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedType === 'scifi' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-2">科技水平</label>
                        <select
                          value={templateSettings.techLevel || ''}
                          onChange={(e) => handleTemplateSettingChange('techLevel', e.target.value)}
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        >
                          <option value="">選擇科技水平</option>
                          <option value="近未來科技">近未來科技</option>
                          <option value="太空時代">太空時代</option>
                          <option value="星際文明">星際文明</option>
                          <option value="後奇點時代">後奇點時代</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">世界設定</label>
                        <input
                          type="text"
                          value={templateSettings.worldSetting || ''}
                          onChange={(e) => handleTemplateSettingChange('worldSetting', e.target.value)}
                          placeholder="例如：太空殖民時代"
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                    </div>
                  )}

                  {selectedType === 'fantasy' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-2">魔法系統</label>
                        <input
                          type="text"
                          value={templateSettings.magicSystem || ''}
                          onChange={(e) => handleTemplateSettingChange('magicSystem', e.target.value)}
                          placeholder="例如：魔法與咒語"
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">種族設定</label>
                        <input
                          type="text"
                          value={templateSettings.races || ''}
                          onChange={(e) => handleTemplateSettingChange('races', e.target.value)}
                          placeholder="例如：人類、精靈、矮人、獸人"
                          className="w-full bg-cosmic-900 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* 步驟 3：AI 設定 */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gold-400 mb-4">AI 設定</h3>
                <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">AI 模型</label>
                    <select
                      value={aiSettings.model}
                      onChange={(e) => handleAISettingChange('model', e.target.value)}
                      className={`w-full bg-cosmic-900 border ${
                        errors.model ? 'border-red-500' : 'border-cosmic-700'
                      } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
                      disabled={!isOllamaConnected || availableModels.length === 0}
                    >
                      {!isOllamaConnected ? (
                        <option value="">Ollama 未連接</option>
                      ) : availableModels.length === 0 ? (
                        <option value="">無可用模型</option>
                      ) : (
                        <>
                          <option value="">選擇 AI 模型</option>
                          {availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </>
                      )}
                    </select>
                    {errors.model && (
                      <p className="text-red-500 text-sm mt-1">{errors.model}</p>
                    )}
                    {!isOllamaConnected && (
                      <p className="text-yellow-500 text-sm mt-1">
                        Ollama 服務未連接，請先安裝並啟動 Ollama
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">
                      溫度（Temperature）：{aiSettings.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={aiSettings.temperature}
                      onChange={(e) => handleAISettingChange('temperature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>更保守（0）</span>
                      <span>更創意（1）</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Top P：{aiSettings.topP}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={aiSettings.topP}
                      onChange={(e) => handleAISettingChange('topP', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>詞彙選擇較固定</span>
                      <span>詞彙選擇較多樣</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      控制 AI 在生成文字時的詞彙多樣性。較低值讓輸出更穩定集中，較高值讓輸出更富變化。
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">
                      最大生成長度：{aiSettings.maxTokens} tokens
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="50"
                      value={aiSettings.maxTokens}
                      onChange={(e) => handleAISettingChange('maxTokens', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>較短回應</span>
                      <span>較長回應</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      限制 AI 單次生成文字的最大長度。1 token 約等於 0.75 個中文字，400 tokens 約為 300 字。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gold-400 mb-4">專案預覽</h3>
                <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <div className="text-2xl mr-3">
                      {projectTypes.find(t => t.id === selectedType)?.icon || '📝'}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{projectName}</h4>
                      <p className="text-sm text-gray-400">
                        {projectTypes.find(t => t.id === selectedType)?.name || '未知類型'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 border-t border-cosmic-700 pt-4 mb-4">
                    {projectDescription || '暫無描述'}
                  </p>
                  <div className="text-xs text-gray-500 border-t border-cosmic-700 pt-4">
                    <div className="flex justify-between mb-1">
                      <span>AI 模型：</span>
                      <span className="text-gold-400">{aiSettings.model || '未選擇'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>模板：</span>
                      <span className="text-gold-400">
                        {selectedType === 'isekai' && '異世界模板'}
                        {selectedType === 'school' && '校園模板'}
                        {selectedType === 'scifi' && '科幻模板'}
                        {selectedType === 'fantasy' && '奇幻模板'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-cosmic-700 flex justify-between relative z-10 bg-cosmic-900 rounded-b-xl flex-shrink-0">
          {step === 1 ? (
            <button
              onClick={handleClose}
              className="btn-secondary"
            >
              取消
            </button>
          ) : (
            <button
              onClick={handlePrevStep}
              className="btn-secondary"
            >
              上一步
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="btn-primary"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? '創建中...' : '創建專案'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;