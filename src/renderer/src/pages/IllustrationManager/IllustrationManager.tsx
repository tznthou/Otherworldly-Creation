import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  IllustrationGenerationPanel,
  CharacterConsistencyPanel,
  BatchIllustrationPanel,
  IllustrationHistoryPanel 
} from '../../components/AI';
import { DetailedGenerationResult } from '../../types/illustration';
import { Card } from '../../components/UI/Card';
import CosmicButton from '../../components/UI/CosmicButton';
import { Alert } from '../../components/UI/Alert';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('IllustrationManager');

// interface IllustrationManagerProps {}

const IllustrationManager: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  // Redux 狀態
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 組件狀態
  const [activeTab, setActiveTab] = useState<'generate' | 'consistency' | 'batch' | 'history'>('generate');
  const [error, setError] = useState('');

  // 檢查項目狀態
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      setError('請先選擇或載入專案');
      // 可以在這裡添加自動載入專案的邏輯
    }
  }, [projectId, currentProject]);

  // 獲取項目角色
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

  const tabConfigs = [
    {
      id: 'generate' as const,
      label: 'AI 插畫生成',
      icon: '🎨',
      description: '使用 Gemini Imagen API 生成高品質插畫'
    },
    {
      id: 'consistency' as const,
      label: '角色一致性',
      icon: '🎭',
      description: '管理角色視覺特徵和一致性設定'
    },
    {
      id: 'batch' as const,
      label: '批次生成',
      icon: '⚡',
      description: '批次處理多個插畫生成任務'
    },
    {
      id: 'history' as const,
      label: '插畫歷史',
      icon: '🖼️',
      description: '瀏覽和管理已生成的插畫'
    }
  ];

  const handleGenerationComplete = (result: DetailedGenerationResult) => {
    log.debug('插畫生成完成:', result);
    // 可以添加成功通知或自動切換到歷史頁面
    setActiveTab('history');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="text-xl font-bold text-white mb-4">需要選擇專案</h2>
          <p className="text-gray-400 mb-6">
            請先回到專案總覽選擇一個專案，才能使用插畫生成功能
          </p>
          <CosmicButton onClick={() => navigate('/')}>
            返回專案總覽
          </CosmicButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* 頁面標題 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <span className="mr-3">🎨</span>
              AI 插畫管理
            </h1>
            <p className="text-gray-400 mt-2">
              為專案「{currentProject.name}」創建和管理 AI 插畫
              {projectCharacters.length > 0 && ` • ${projectCharacters.length} 個角色`}
            </p>
          </div>
          <CosmicButton
            onClick={() => navigate('/')}
            variant="secondary"
            size="small"
          >
            返回總覽
          </CosmicButton>
        </div>
      </div>

      {/* 功能標籤 */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {tabConfigs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title={tab.description}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      {/* 主要內容區域 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'generate' && (
          <IllustrationGenerationPanel
            onGenerationComplete={handleGenerationComplete}
            onError={handleError}
          />
        )}
        
        {activeTab === 'consistency' && (
          <CharacterConsistencyPanel
            onReportGenerated={(report) => {
              log.debug('一致性報告已生成:', report);
            }}
          />
        )}
        
        {activeTab === 'batch' && (
          <BatchIllustrationPanel />
        )}
        
        {activeTab === 'history' && (
          <IllustrationHistoryPanel />
        )}
      </div>
    </div>
  );
};

export default IllustrationManager;