import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { createProject } from '../../store/slices/projectsSlice';
import { closeModal } from '../../store/slices/uiSlice';
import { fetchAllTemplates } from '../../store/slices/templatesSlice';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('CreateProjectModal');

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

interface NovelLength {
  id: 'short' | 'medium' | 'long';
  name: string;
  icon: string;
  description: string;
  estimatedChapters: string;
  wordCount: string;
}

const novelLengths: NovelLength[] = [
  {
    id: 'short',
    name: '短篇',
    icon: '📄',
    description: '簡潔有力的故事，適合初學者練習',
    estimatedChapters: '1-5 章',
    wordCount: '1-5 萬字',
  },
  {
    id: 'medium',
    name: '中篇',
    icon: '📖',
    description: '適中篇幅，有足夠空間發展情節',
    estimatedChapters: '10-30 章',
    wordCount: '5-20 萬字',  
  },
  {
    id: 'long',
    name: '長篇',
    icon: '📚',
    description: '宏大史詩，構建完整的世界觀',
    estimatedChapters: '50+ 章',
    wordCount: '20+ 萬字',
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
  log.debug('CreateProjectModal 被渲染');
  const dispatch = useAppDispatch();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedType, setSelectedType] = useState<ProjectType['id'] | null>(null);
  const [selectedNovelLength, setSelectedNovelLength] = useState<NovelLength['id']>('medium');
  
  // 模板設定
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({});
  
  // AI 設定（使用預設值）
  const aiSettings: AISettings = {
    model: 'llama3',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 200,
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    type?: string;
    novelLength?: string;
  }>({});

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    dispatch(closeModal('createProject'));
  };

  const validateStep1 = () => {
    const newErrors: {
      name?: string;
      type?: string;
      novelLength?: string;
    } = {};

    if (!projectName.trim()) {
      newErrors.name = '請輸入專案名稱';
    }

    if (!selectedType) {
      newErrors.type = '請選擇專案類型';
    }

    if (!selectedNovelLength) {
      newErrors.novelLength = '請選擇小說篇幅';
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
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setStep(1);
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
        novelLength: selectedNovelLength,
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
          log.warn('模板應用失敗:', applicationResult.message);
          // 不阻止專案創建，只是記錄警告
        }
      } catch (templateError) {
        log.error('應用模板失敗:', templateError);
        // 不阻止專案創建，模板應用失敗不影響專案創建
      }

      handleClose();
    } catch (error) {
      log.error('創建專案失敗:', error);
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        className="bg-bg-dark border border-warm-gold/10 rounded-xl shadow-xl w-full max-w-2xl relative my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="p-6 border-b border-warm-gold/10 flex items-center justify-between relative z-10 flex-shrink-0">
          <h2 className="text-xl font-serif-tc text-warm-gold">創建新專案</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white hover:bg-bg-dark/80 text-2xl p-2 rounded-lg transition-colors"
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
              step === 1 ? 'bg-warm-gold/50 text-text-primary' : 'bg-bg-dark/80 text-warm-gold'
            }`}>
              1
            </div>
            <div className={`h-1 flex-1 mx-2 ${
              step >= 2 ? 'bg-warm-gold/50' : 'bg-bg-dark/80'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 2 ? 'bg-warm-gold/50 text-text-primary' : 'bg-bg-dark/80 text-gray-300'
            }`}>
              2
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
                  className={`w-full bg-bg-light/50 backdrop-blur-sm border ${
                    errors.name ? 'border-red-500' : 'border-warm-gold/10'
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
                          ? 'border-warm-gold bg-bg-light/50 backdrop-blur-sm'
                          : 'border-warm-gold/10 bg-bg-dark hover:bg-bg-light/50 backdrop-blur-sm'
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

              <div className="mb-6">
                <label className="block text-gray-300 mb-2">選擇小說篇幅</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {novelLengths.map((length) => (
                    <div
                      key={length.id}
                      onClick={() => setSelectedNovelLength(length.id)}
                      className={`p-4 rounded-lg cursor-pointer border ${
                        selectedNovelLength === length.id
                          ? 'border-warm-gold bg-bg-light/50 backdrop-blur-sm'
                          : 'border-warm-gold/10 bg-bg-dark hover:bg-bg-light/50 backdrop-blur-sm'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <div className="text-2xl mr-3">
                          {length.icon}
                        </div>
                        <h3 className="text-lg font-medium text-white">
                          {length.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {length.description}
                      </p>
                      <div className="text-xs text-gray-500">
                        <div>{length.estimatedChapters}</div>
                        <div>{length.wordCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.novelLength && (
                  <p className="text-red-500 text-sm mt-1">{errors.novelLength}</p>
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
                  className="w-full bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                ></textarea>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-warm-gold mb-4">模板設定</h3>
                <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg p-4">
                  {selectedType === 'isekai' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-2">等級系統</label>
                        <input
                          type="text"
                          value={templateSettings.levelSystem || ''}
                          onChange={(e) => handleTemplateSettingChange('levelSystem', e.target.value)}
                          placeholder="例如：等級與技能系統"
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">魔法系統</label>
                        <input
                          type="text"
                          value={templateSettings.magicSystem || ''}
                          onChange={(e) => handleTemplateSettingChange('magicSystem', e.target.value)}
                          placeholder="例如：元素魔法"
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">轉生設定</label>
                        <input
                          type="text"
                          value={templateSettings.reincarnation || ''}
                          onChange={(e) => handleTemplateSettingChange('reincarnation', e.target.value)}
                          placeholder="例如：車禍後轉生"
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">學校類型</label>
                        <select
                          value={templateSettings.schoolType || ''}
                          onChange={(e) => handleTemplateSettingChange('schoolType', e.target.value)}
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">種族設定</label>
                        <input
                          type="text"
                          value={templateSettings.races || ''}
                          onChange={(e) => handleTemplateSettingChange('races', e.target.value)}
                          placeholder="例如：人類、精靈、矮人、獸人"
                          className="w-full bg-bg-dark border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-warm-gold/10 flex justify-between relative z-10 bg-bg-dark rounded-b-xl flex-shrink-0">
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

          {step < 2 ? (
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