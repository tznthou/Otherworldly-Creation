import React, { useState, useEffect, useCallback } from 'react';
import { NovelTemplate, TemplateApplicationResult } from '../../types/template';
import { CharacterArchetypeTemplate } from '../../types/template';
import { templateService } from '../../services/templateService';
import { templateCharacterService } from '../../services/templateCharacterService';

interface TemplateApplicationWizardProps {
  template: NovelTemplate;
  projectId: string;
  onComplete: (result: TemplateApplicationResult) => void;
  onCancel: () => void;
}

type WizardStep = 'overview' | 'characters' | 'settings' | 'applying' | 'complete';

export const TemplateApplicationWizard: React.FC<TemplateApplicationWizardProps> = ({
  template,
  projectId,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('overview');
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [createCharacters, setCreateCharacters] = useState(true);
  const [updateProjectSettings, setUpdateProjectSettings] = useState(true);
  const [applicationResult, setApplicationResult] = useState<TemplateApplicationResult | null>(null);
  const [_isApplying, _setIsApplying] = useState(false);
  const [characterPreviews, setCharacterPreviews] = useState<Array<{
    archetype: CharacterArchetypeTemplate;
    previewData: Partial<Character>;
  }>>([]);

  useEffect(() => {
    // 獲取推薦的角色組合
    const { essential, optional: _optional } = templateCharacterService.getRecommendedCharacterCombination(template);
    const recommendedArchetypes = essential.map(arch => arch.name);
    setSelectedArchetypes(recommendedArchetypes);
    
    // 生成角色預覽
    updateCharacterPreviews(recommendedArchetypes);
  }, [template, updateCharacterPreviews]);

  const updateCharacterPreviews = useCallback((archetypes: string[]) => {
    const previews = templateCharacterService.previewCharacterCreation(template, archetypes);
    setCharacterPreviews(previews);
  }, [template]);

  const handleArchetypeToggle = (archetypeName: string) => {
    const newSelection = selectedArchetypes.includes(archetypeName)
      ? selectedArchetypes.filter(name => name !== archetypeName)
      : [...selectedArchetypes, archetypeName];
    
    setSelectedArchetypes(newSelection);
    updateCharacterPreviews(newSelection);
  };

  const handleApplyTemplate = async () => {
    _setIsApplying(true);
    setCurrentStep('applying');

    try {
      const result = await templateService.applyTemplateToProject(template.id, projectId, {
        createCharacters,
        selectedArchetypes: createCharacters ? selectedArchetypes : [],
        updateProjectSettings
      });

      setApplicationResult(result);
      setCurrentStep('complete');
    } catch (error) {
      console.error('應用模板失敗:', error);
      setApplicationResult({
        success: false,
        message: `應用模板失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        appliedSettings: {
          worldSetting: template.worldSetting,
          createdCharacters: [],
          projectSettings: {}
        },
        errors: [error instanceof Error ? error.message : '未知錯誤']
      });
      setCurrentStep('complete');
    } finally {
      _setIsApplying(false);
    }
  };

  const handleComplete = () => {
    if (applicationResult) {
      onComplete(applicationResult);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'overview', label: '模板概覽' },
      { key: 'characters', label: '角色設定' },
      { key: 'settings', label: '應用設定' },
      { key: 'applying', label: '應用中' },
      { key: 'complete', label: '完成' }
    ];

    const currentIndex = steps.findIndex(step => step.key === currentStep);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              index <= currentIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {index + 1}
            </div>
            <div className={`text-sm ${
              index <= currentIndex ? 'text-blue-600' : 'text-gray-500'
            } ml-2`}>
              {step.label}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-4 ${
                index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderOverviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h2>
        <p className="text-gray-600">{template.description}</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">模板將為您的專案提供：</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">世界觀設定</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 時代背景：{template.worldSetting.era}</li>
              <li>• 科技水平：{template.worldSetting.technology}</li>
              <li>• 社會結構：{template.worldSetting.society}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">特殊元素</h4>
            <div className="flex flex-wrap gap-1">
              {template.worldSetting.specialElements.slice(0, 6).map((element, index) => (
                <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {element}
                </span>
              ))}
              {template.worldSetting.specialElements.length > 6 && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  +{template.worldSetting.specialElements.length - 6}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">角色原型 ({template.characterArchetypes.length} 個)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {template.characterArchetypes.slice(0, 4).map((archetype, index) => (
            <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
              <h4 className="font-medium text-green-900">{archetype.name}</h4>
              <p className="text-sm text-green-700 mt-1">{archetype.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={() => setCurrentStep('characters')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          下一步
        </button>
      </div>
    </div>
  );

  const renderCharactersStep = () => {
    const { essential, optional } = templateCharacterService.getRecommendedCharacterCombination(template);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">選擇要創建的角色</h2>
          <p className="text-gray-600">您可以選擇要自動創建的角色原型</p>
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={createCharacters}
              onChange={(e) => setCreateCharacters(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">自動創建角色</span>
          </label>
        </div>

        {createCharacters && (
          <>
            {/* 必要角色 */}
            {essential.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">推薦角色（建議創建）</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {essential.map((archetype) => (
                    <div
                      key={archetype.name}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedArchetypes.includes(archetype.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleArchetypeToggle(archetype.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{archetype.name}</h4>
                        <input
                          type="checkbox"
                          checked={selectedArchetypes.includes(archetype.name)}
                          onChange={() => {}}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{archetype.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {archetype.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 可選角色 */}
            {optional.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">其他角色（可選）</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {optional.map((archetype) => (
                    <div
                      key={archetype.name}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedArchetypes.includes(archetype.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleArchetypeToggle(archetype.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{archetype.name}</h4>
                        <input
                          type="checkbox"
                          checked={selectedArchetypes.includes(archetype.name)}
                          onChange={() => {}}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{archetype.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {archetype.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 角色預覽 */}
            {selectedArchetypes.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">角色預覽</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {characterPreviews.map((preview, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{preview.previewData.name}</h4>
                          <div className="text-sm text-gray-500">
                            {preview.previewData.age && `${preview.previewData.age}歲`}
                            {preview.previewData.gender && ` • ${preview.previewData.gender}`}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{preview.previewData.personality}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep('overview')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            上一步
          </button>
          <button
            onClick={() => setCurrentStep('settings')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            下一步
          </button>
        </div>
      </div>
    );
  };

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">應用設定</h2>
        <p className="text-gray-600">確認模板應用的設定選項</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">更新專案設定</h3>
            <p className="text-sm text-gray-600">將模板的世界觀設定和寫作指導應用到專案</p>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={updateProjectSettings}
              onChange={(e) => setUpdateProjectSettings(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">創建角色</h3>
            <p className="text-sm text-gray-600">
              根據選擇的角色原型自動創建 {selectedArchetypes.length} 個角色
            </p>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={createCharacters}
              onChange={(e) => setCreateCharacters(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">應用摘要</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 模板：{template.name}</li>
          {updateProjectSettings && <li>• 將更新專案的世界觀設定和寫作指導</li>}
          {createCharacters && <li>• 將創建 {selectedArchetypes.length} 個角色</li>}
          {createCharacters && selectedArchetypes.length > 1 && <li>• 將建立角色間的基本關係</li>}
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('characters')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          上一步
        </button>
        <button
          onClick={handleApplyTemplate}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          應用模板
        </button>
      </div>
    </div>
  );

  const renderApplyingStep = () => (
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">正在應用模板...</h2>
      <p className="text-gray-600">請稍候，正在設定您的專案</p>
    </div>
  );

  const renderCompleteStep = () => {
    if (!applicationResult) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            applicationResult.success ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {applicationResult.success ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h2 className={`text-xl font-semibold mb-2 ${
            applicationResult.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {applicationResult.success ? '模板應用成功！' : '模板應用失敗'}
          </h2>
          <p className="text-gray-600">{applicationResult.message}</p>
        </div>

        {applicationResult.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">應用結果：</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• 已更新專案設定</li>
              {applicationResult.appliedSettings.createdCharacters.length > 0 && (
                <li>• 已創建 {applicationResult.appliedSettings.createdCharacters.length} 個角色</li>
              )}
              <li>• AI 續寫將參考模板特色生成內容</li>
            </ul>
          </div>
        )}

        {applicationResult.errors && applicationResult.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-900 mb-2">錯誤詳情：</h3>
            <ul className="text-sm text-red-800 space-y-1">
              {applicationResult.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleComplete}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            完成
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {renderStepIndicator()}
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        {currentStep === 'overview' && renderOverviewStep()}
        {currentStep === 'characters' && renderCharactersStep()}
        {currentStep === 'settings' && renderSettingsStep()}
        {currentStep === 'applying' && renderApplyingStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
};