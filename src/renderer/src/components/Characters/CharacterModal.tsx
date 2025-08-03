import React, { useState, useEffect } from 'react';
import { Character, CharacterFormData, GENDER_OPTIONS, Relationship } from '../../types/character';
import { getArchetypeTemplateByName, CharacterArchetypeTemplate } from '../../data/characterArchetypes';
import { ArchetypeSelector } from './ArchetypeSelector';
import { RelationshipEditor } from './RelationshipEditor';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: CharacterFormData) => Promise<void>;
  character?: Character | null;
  projectId: string;
  projectType?: string;
  allCharacters?: Character[];
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  character,
  projectId,
  projectType,
  allCharacters = [],
}) => {
  const [formData, setFormData] = useState<CharacterFormData>({
    name: '',
    archetype: '',
    age: undefined,
    gender: '',
    appearance: '',
    personality: '',
    background: '',
    relationships: [],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<CharacterArchetypeTemplate | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'relationships'>('basic');
  const [showRelationshipEditor, setShowRelationshipEditor] = useState(false);

  const isEditing = !!character;

  useEffect(() => {
    if (isOpen) {
      if (character) {
        // 編輯模式：填入現有角色資料
        setFormData({
          name: character.name,
          archetype: character.archetype || '',
          age: character.age,
          gender: character.gender || '',
          appearance: character.appearance || '',
          personality: character.personality || '',
          background: character.background || '',
          relationships: character.relationships || [],
        });
      } else {
        // 新增模式：重置表單
        setFormData({
          name: '',
          archetype: '',
          age: undefined,
          gender: '',
          appearance: '',
          personality: '',
          background: '',
          relationships: [],
        });
      }
      setErrors({});
      setActiveTab('basic');
      setShowRelationshipEditor(false);
    }
  }, [isOpen, character]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 角色名稱驗證
    if (!formData.name.trim()) {
      newErrors.name = '角色名稱為必填項目';
    } else if (formData.name.trim().length < 1) {
      newErrors.name = '角色名稱不能為空';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = '角色名稱不能超過 50 個字符';
    }

    // 年齡驗證
    if (formData.age !== undefined) {
      if (formData.age < 0 || formData.age > 1000) {
        newErrors.age = '年齡必須在 0-1000 之間';
      }
    }

    // 外觀描述長度驗證
    if (formData.appearance && formData.appearance.length > 500) {
      newErrors.appearance = '外觀描述不能超過 500 個字符';
    }

    // 性格特點長度驗證
    if (formData.personality && formData.personality.length > 500) {
      newErrors.personality = '性格特點不能超過 500 個字符';
    }

    // 背景故事長度驗證
    if (formData.background && formData.background.length > 1000) {
      newErrors.background = '背景故事不能超過 1000 個字符';
    }

    // 原型與模板一致性驗證
    if (formData.archetype && selectedTemplate) {
      if (formData.archetype !== selectedTemplate.name) {
        // 這是一個內部一致性檢查，通常不會發生
        console.warn('原型與選中的模板不一致');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('儲存角色失敗:', error);
      setErrors({ submit: '儲存失敗，請稍後再試' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CharacterFormData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // 清除該欄位的錯誤
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleArchetypeChange = (archetypeName: string) => {
    const template = getArchetypeTemplateByName(archetypeName);
    setSelectedTemplate(template || null);
    
    handleInputChange('archetype', archetypeName);
    
    if (template) {
      setShowTemplatePreview(true);
    } else {
      setShowTemplatePreview(false);
    }
  };

  const applyTemplate = () => {
    if (!selectedTemplate) return;
    
    // 只在欄位為空時才填入預設值，避免覆蓋用戶已輸入的內容
    setFormData(prev => ({
      ...prev,
      personality: prev.personality || selectedTemplate.defaultPersonality,
      appearance: prev.appearance || selectedTemplate.defaultAppearance || '',
      background: prev.background || selectedTemplate.defaultBackground || '',
      age: prev.age || (selectedTemplate.suggestedAge ? 
        Math.floor((selectedTemplate.suggestedAge.min + selectedTemplate.suggestedAge.max) / 2) : 
        undefined),
      gender: prev.gender || (selectedTemplate.suggestedGender?.[0] || ''),
    }));
    
    setShowTemplatePreview(false);
  };

  const dismissTemplate = () => {
    setShowTemplatePreview(false);
  };

  const handleRelationshipSave = async (relationships: Relationship[]) => {
    console.log('CharacterModal - handleRelationshipSave called with:', relationships);
    setFormData(prev => ({
      ...prev,
      relationships,
    }));
    console.log('CharacterModal - formData updated with relationships');
    setShowRelationshipEditor(false);
  };

  const handleRelationshipCancel = () => {
    setShowRelationshipEditor(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* 標題列 */}
          <div className="flex items-center justify-between p-6 border-b border-cosmic-700">
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? '編輯角色' : '新增角色'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 標籤導航 */}
          <div className="border-b border-cosmic-700">
            <nav className="flex space-x-8 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-gold-500 text-gold-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-cosmic-600'
                }`}
              >
                基本資料
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('relationships')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'relationships'
                    ? 'border-gold-500 text-gold-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-cosmic-600'
                }`}
              >
                角色關係
                {formData.relationships && formData.relationships.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-500 text-cosmic-950">
                    {formData.relationships.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* 表單內容 */}
          <div className="p-6 space-y-6">
            {/* 基本資料標籤 */}
            {activeTab === 'basic' && (
              <>
                {/* 基本資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 角色名稱 */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                  角色名稱 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 bg-cosmic-900 border rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 ${
                    errors.name ? 'border-red-400' : 'border-cosmic-600'
                  }`}
                  placeholder="輸入角色名稱"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              {/* 角色原型 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  角色原型
                </label>
                <ArchetypeSelector
                  selectedArchetype={formData.archetype}
                  onSelect={handleArchetypeChange}
                  projectType={projectType}
                />
              </div>

              {/* 年齡 */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-1">
                  年齡
                </label>
                <input
                  type="number"
                  id="age"
                  value={formData.age || ''}
                  onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 bg-cosmic-900 border rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 ${
                    errors.age ? 'border-red-400' : 'border-cosmic-600'
                  }`}
                  placeholder="輸入年齡"
                  min="0"
                  max="1000"
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-400">{errors.age}</p>
                )}
              </div>

              {/* 性別 */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-1">
                  性別
                </label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 bg-cosmic-900 border border-cosmic-600 rounded-md text-white focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                >
                  <option value="">選擇性別</option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 外觀描述 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="appearance" className="block text-sm font-medium text-gray-300">
                  外觀描述
                </label>
                <span className="text-xs text-gray-400">
                  {formData.appearance?.length || 0}/500
                </span>
              </div>
              <textarea
                id="appearance"
                value={formData.appearance}
                onChange={(e) => handleInputChange('appearance', e.target.value)}
                rows={3}
                maxLength={500}
                className={`w-full px-3 py-2 bg-cosmic-900 border rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 ${
                  errors.appearance ? 'border-red-400' : 'border-cosmic-600'
                }`}
                placeholder="描述角色的外觀特徵..."
              />
              {errors.appearance && (
                <p className="mt-1 text-sm text-red-400">{errors.appearance}</p>
              )}
            </div>

            {/* 性格特點 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="personality" className="block text-sm font-medium text-gray-300">
                  性格特點
                </label>
                <span className="text-xs text-gray-400">
                  {formData.personality?.length || 0}/500
                </span>
              </div>
              <textarea
                id="personality"
                value={formData.personality}
                onChange={(e) => handleInputChange('personality', e.target.value)}
                rows={3}
                maxLength={500}
                className={`w-full px-3 py-2 bg-cosmic-900 border rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 ${
                  errors.personality ? 'border-red-400' : 'border-cosmic-600'
                }`}
                placeholder="描述角色的性格特點..."
              />
              {errors.personality && (
                <p className="mt-1 text-sm text-red-400">{errors.personality}</p>
              )}
            </div>

            {/* 背景故事 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="background" className="block text-sm font-medium text-gray-300">
                  背景故事
                </label>
                <span className="text-xs text-gray-400">
                  {formData.background?.length || 0}/1000
                </span>
              </div>
              <textarea
                id="background"
                value={formData.background}
                onChange={(e) => handleInputChange('background', e.target.value)}
                rows={4}
                maxLength={1000}
                className={`w-full px-3 py-2 bg-cosmic-900 border rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 ${
                  errors.background ? 'border-red-400' : 'border-cosmic-600'
                }`}
                placeholder="描述角色的背景故事..."
              />
              {errors.background && (
                <p className="mt-1 text-sm text-red-400">{errors.background}</p>
              )}
            </div>

            {/* 模板預覽和應用 */}
            {showTemplatePreview && selectedTemplate && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-blue-900">
                    🎭 {selectedTemplate.name} 模板預覽
                  </h4>
                  <button
                    type="button"
                    onClick={dismissTemplate}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">描述：</span>
                    <p className="text-blue-700 mt-1">{selectedTemplate.description}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-blue-800">預設性格：</span>
                    <p className="text-blue-700 mt-1">{selectedTemplate.defaultPersonality}</p>
                  </div>
                  
                  {selectedTemplate.defaultAppearance && (
                    <div>
                      <span className="font-medium text-blue-800">預設外觀：</span>
                      <p className="text-blue-700 mt-1">{selectedTemplate.defaultAppearance}</p>
                    </div>
                  )}
                  
                  {selectedTemplate.defaultBackground && (
                    <div>
                      <span className="font-medium text-blue-800">預設背景：</span>
                      <p className="text-blue-700 mt-1">{selectedTemplate.defaultBackground}</p>
                    </div>
                  )}
                  
                  {selectedTemplate.suggestedAge && (
                    <div>
                      <span className="font-medium text-blue-800">建議年齡：</span>
                      <span className="text-blue-700 ml-1">
                        {selectedTemplate.suggestedAge.min} - {selectedTemplate.suggestedAge.max} 歲
                      </span>
                    </div>
                  )}
                  
                  {selectedTemplate.suggestedGender && selectedTemplate.suggestedGender.length > 0 && (
                    <div>
                      <span className="font-medium text-blue-800">建議性別：</span>
                      <span className="text-blue-700 ml-1">
                        {selectedTemplate.suggestedGender.join('、')}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTemplate.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={dismissTemplate}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    稍後再說
                  </button>
                  <button
                    type="button"
                    onClick={applyTemplate}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    應用模板
                  </button>
                </div>
              </div>
            )}

                {/* 提交錯誤 */}
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-400">{errors.submit}</p>
                  </div>
                )}
              </>
            )}

            {/* 角色關係標籤 */}
            {activeTab === 'relationships' && (
              <>
                {showRelationshipEditor ? (
                  <RelationshipEditor
                    character={{
                      ...formData,
                      id: character?.id || '',
                      projectId,
                      createdAt: character?.createdAt || new Date(),
                      updatedAt: character?.updatedAt || new Date(),
                    }}
                    allCharacters={allCharacters}
                    onSave={handleRelationshipSave}
                    onCancel={handleRelationshipCancel}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white">角色關係</h3>
                      <button
                        type="button"
                        onClick={() => setShowRelationshipEditor(true)}
                        className="px-4 py-2 text-sm font-medium text-cosmic-950 bg-gold-500 rounded-md hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
                      >
                        管理關係
                      </button>
                    </div>

                    {formData.relationships && formData.relationships.length > 0 ? (
                      <div className="space-y-3">
                        {formData.relationships.map((relationship, index) => {
                          const targetCharacter = allCharacters.find(c => c.id === relationship.targetId);
                          return (
                            <div key={index} className="bg-cosmic-900 rounded-lg p-4 border border-cosmic-700">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium text-white">
                                  {targetCharacter?.name || '未知角色'}
                                </span>
                                <span className="px-2 py-1 text-xs font-medium bg-gold-500 text-cosmic-950 rounded-full">
                                  {relationship.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300">
                                {relationship.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-4xl mb-2">👥</div>
                        <p>尚未建立任何角色關係</p>
                        <p className="text-sm">點擊「管理關係」開始添加關係</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 按鈕列 */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-cosmic-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-cosmic-800 border border-cosmic-600 rounded-md hover:bg-cosmic-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-cosmic-950 bg-gold-500 border border-transparent rounded-md hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '儲存中...' : (isEditing ? '更新' : '創建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};