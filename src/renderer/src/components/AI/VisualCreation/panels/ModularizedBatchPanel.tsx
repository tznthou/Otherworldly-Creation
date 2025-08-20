import React, { useState, useCallback } from 'react';
import { Card } from '../../../UI/Card';
import { Alert } from '../../../UI/Alert';
import CharacterSelectionPanel from './CharacterSelectionPanel';
import ServiceConfigurationPanel from './ServiceConfigurationPanel';
import CosmicButton from '../../../UI/CosmicButton';
import type { Character } from '../../../../api/models';

/**
 * 模組化後的批次面板組件 - 演示版本
 * 
 * 這是一個展示模組化效果的測試組件，
 * 整合了新的 CharacterSelectionPanel 和 ServiceConfigurationPanel
 */
export const ModularizedBatchPanel: React.FC = () => {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedCharacterData, setSelectedCharacterData] = useState<Character[]>([]);
  const [sceneType, setSceneType] = useState<'portrait' | 'scene' | 'interaction'>('portrait');
  const [serviceConfig, setServiceConfig] = useState<any>(null);
  const [showDemo, setShowDemo] = useState(true);

  // 處理角色選擇變更
  const handleCharacterSelectionChange = useCallback((
    selectedIds: string[], 
    characters: Character[]
  ) => {
    setSelectedCharacters(selectedIds);
    setSelectedCharacterData(characters);
    console.log('🎭 角色選擇更新:', {
      count: selectedIds.length,
      characters: characters.map(c => c.name)
    });
  }, []);

  // 處理服務配置變更
  const handleServiceConfigChange = useCallback((config: any) => {
    setServiceConfig(config);
    console.log('🤖 服務配置更新:', config);
  }, []);

  // 生成演示請求
  const generateDemo = useCallback(() => {
    if (selectedCharacterData.length === 0) {
      alert('請先選擇至少一個角色！');
      return;
    }

    if (!serviceConfig?.isValid) {
      alert('請完成服務配置！');
      return;
    }

    const demoRequest = {
      characters: selectedCharacterData.map(c => c.name),
      sceneType,
      service: serviceConfig.provider,
      colorMode: serviceConfig.colorMode,
      timestamp: new Date().toISOString()
    };

    console.log('🚀 生成演示請求:', demoRequest);
    alert('演示請求已生成！請查看控制台日誌。');
  }, [selectedCharacterData, sceneType, serviceConfig]);

  return (
    <div className="modularized-batch-panel">
      <Card className="p-6">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-2">✨</span>
            模組化批次面板 (演示版本)
          </h2>
          <CosmicButton
            onClick={() => setShowDemo(!showDemo)}
            variant="secondary"
            size="small"
          >
            {showDemo ? '隱藏說明' : '顯示說明'}
          </CosmicButton>
        </div>

        {/* 演示說明 */}
        {showDemo && (
          <Alert className="mb-6">
            <div className="space-y-2">
              <div className="font-medium">🎯 模組化重構演示</div>
              <div className="text-sm space-y-1">
                <p>• <strong>CharacterSelectionPanel</strong>: 獨立的角色選擇組件，使用 useCharacterSelection hook</p>
                <p>• <strong>ServiceConfigurationPanel</strong>: 服務配置組件，使用 useIllustrationService hook</p>
                <p>• <strong>模組化優勢</strong>: 代碼重用、獨立測試、清晰職責分離</p>
                <p>• <strong>狀態管理</strong>: 使用 Custom Hooks 管理業務邏輯，組件只負責 UI 渲染</p>
              </div>
            </div>
          </Alert>
        )}

        <div className="space-y-8">
          {/* 角色選擇面板 */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              1️⃣ 角色選擇模組
            </h3>
            <CharacterSelectionPanel
              onSelectionChange={handleCharacterSelectionChange}
              showSceneTypes={true}
              sceneType={sceneType}
              onSceneTypeChange={setSceneType}
            />
          </div>

          {/* 服務配置面板 */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              2️⃣ 服務配置模組
            </h3>
            <ServiceConfigurationPanel
              onConfigurationChange={handleServiceConfigChange}
            />
          </div>

          {/* 狀態摘要和演示 */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              3️⃣ 狀態摘要與演示
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 角色選擇狀態 */}
              <div className="bg-gray-700 p-3 rounded">
                <h4 className="font-medium text-gold-400 mb-2">角色選擇狀態</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>選中數量: {selectedCharacters.length}</div>
                  <div>場景類型: {sceneType}</div>
                  {selectedCharacterData.length > 0 && (
                    <div>角色: {selectedCharacterData.map(c => c.name).join('、')}</div>
                  )}
                </div>
              </div>

              {/* 服務配置狀態 */}
              <div className="bg-gray-700 p-3 rounded">
                <h4 className="font-medium text-blue-400 mb-2">服務配置狀態</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  {serviceConfig ? (
                    <>
                      <div>服務: {serviceConfig.provider}</div>
                      <div>色彩: {serviceConfig.colorMode}</div>
                      <div>狀態: {serviceConfig.isValid ? '✅ 有效' : '❌ 無效'}</div>
                      {serviceConfig.pollinationsModel && (
                        <div>模型: {serviceConfig.pollinationsModel}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500">等待配置...</div>
                  )}
                </div>
              </div>
            </div>

            {/* 演示按鈕 */}
            <div className="flex justify-center">
              <CosmicButton
                onClick={generateDemo}
                disabled={selectedCharacters.length === 0 || !serviceConfig?.isValid}
                size="large"
              >
                🚀 生成演示請求
              </CosmicButton>
            </div>
          </div>
        </div>

        {/* 技術說明 */}
        <div className="mt-8 p-4 bg-cosmic-900/50 rounded-lg border border-cosmic-700">
          <h4 className="font-medium text-cosmic-300 mb-2">🔧 技術實現</h4>
          <div className="text-sm text-cosmic-400 space-y-1">
            <p>• <strong>useCharacterSelection</strong>: 管理角色載入、選擇、過濾邏輯</p>
            <p>• <strong>useIllustrationService</strong>: 管理服務配置、API Key、驗證邏輯</p>
            <p>• <strong>組件通信</strong>: 通過回調函數進行父子組件通信</p>
            <p>• <strong>性能優化</strong>: 使用 React.memo、useCallback 減少不必要的重渲染</p>
            <p>• <strong>TypeScript</strong>: 完整的類型安全和 IntelliSense 支持</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ModularizedBatchPanel;