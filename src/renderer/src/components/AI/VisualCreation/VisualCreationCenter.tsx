import React from 'react';
import { useDispatch } from 'react-redux';
// import { useNavigate } from 'react-router-dom'; // 暫時不使用
import type { AppDispatch } from '../../../store/store';
import LoadingSpinner from '../../UI/LoadingSpinner';

// 導入 Redux actions
import { 
  clearError, 
  initializeVisualCreation,
  setCurrentProvider 
} from '../../../store/slices/visualCreationSlice';

// 導入自定義 hooks
import { 
  useTutorialManager, 
  useVisualCreationData, 
  useVisualCreationHandlers 
} from '../../../hooks/visual-creation';
// 版本管理已簡化，不再需要複雜的狀態管理

// 導入子組件
import { CreateTab } from './CreateTab';
import { GalleryTab } from './GalleryTab';
import ImagePreviewModal from './ImagePreviewModal';
import ExportSettingsPanel from './panels/ExportSettingsPanel';
import ServiceConfigurationPanel from './panels/ServiceConfigurationPanel';
// import { StyleTemplateSelector } from './StyleTemplateSelector';
import TutorialOverlay from './shared/TutorialOverlay';
import PollinationsAuthStatus from '../PollinationsAuthStatus';
import PollinationsAuthGuide from '../PollinationsAuthGuide';

// 版本管理組件已移除，功能簡化

interface VisualCreationCenterProps {
  className?: string;
}

type ActiveTab = 'create' | 'gallery';
// type IllustrationProvider = 'pollinations' | 'imagen';

const VisualCreationCenter: React.FC<VisualCreationCenterProps> = ({
  className = ''
}) => {
  const dispatch = useDispatch<AppDispatch>();
  // const navigate = useNavigate(); // 暫時不使用
  const [showAuthGuide, setShowAuthGuide] = React.useState(false);
  const [authStatusKey, setAuthStatusKey] = React.useState(0); // 用於強制重新渲染認證狀態
  
  // 使用自定義 hooks 來管理狀態和邏輯
  const { 
    currentProject, 
    characters: _characters, 
    activeTab, 
    currentProvider, 
    error, 
    loading, 
    selectedImageIds 
  } = useVisualCreationData();
  
  const {
    showTutorial,
    handleTutorialComplete,
    handleTutorialSkip,
    resetTutorial
  } = useTutorialManager(currentProject);
  
  const {
    // handleProviderChange, // 暫時不使用
    handleTabChange,
    handleSaveSelectedImages
  } = useVisualCreationHandlers();
  
  // 認證相關處理
  const handleAuthStatusClick = () => {
    setShowAuthGuide(true);
  };
  
  const handleAuthUpdate = () => {
    setAuthStatusKey(prev => prev + 1); // 強制重新渲染認證狀態
  };

  // 渲染標籤頁內容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'create':
        return (
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              <CreateTab />
            </div>
          </div>
        );
        
      case 'gallery':
        return (
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              <GalleryTab />
            </div>
          </div>
        );
        
      default:
        return (
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              <CreateTab />
            </div>
          </div>
        );
    }
  };

  // 如果沒有選擇專案，顯示提示
  if (!currentProject) {
    return (
      <div 
        className={`visual-creation-center h-full ${className}`}
        style={{ isolation: 'isolate' }}
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl text-gold-500 font-cosmic mb-2">請選擇專案</h3>
            <p className="text-cosmic-300">需要選擇一個專案才能使用視覺創作功能</p>
          </div>
        </div>
      </div>
    );
  }

  // 載入中狀態
  if (loading.initializing) {
    return (
      <div 
        className={`visual-creation-center h-full ${className}`}
        style={{ isolation: 'isolate' }}
      >
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="large" />
          <span className="ml-3 text-cosmic-300">初始化視覺創作中心...</span>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div 
        className={`visual-creation-center h-full ${className}`}
        style={{ isolation: 'isolate' }}
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center bg-red-900/20 border border-red-700/50 rounded-lg p-6 max-w-md">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-xl text-red-400 font-cosmic mb-2">初始化失敗</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => {
                dispatch(clearError());
                if (currentProject) {
                  dispatch(initializeVisualCreation(currentProject.id));
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              重試
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`visual-creation-center h-full flex flex-col ${className}`} 
      style={{ isolation: 'isolate' }}
    >
      {/* 頂部標題 */}
      <div className="flex-shrink-0 bg-cosmic-900/95 border-b border-cosmic-700">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎨</div>
            <div>
              <h1 className="text-xl font-cosmic text-gold-500">視覺創作中心</h1>
              <p className="text-sm text-cosmic-400">AI 插畫創作和管理平台</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容區域 - 恢復左右布局 */}
      <div className="flex-1 flex flex-row min-h-0" style={{ isolation: 'auto' }}>
        {/* 左側：AI 服務配置面板 - 響應式寬度，正常布局流 */}
        <div className="w-72 lg:w-80 xl:w-96 flex-shrink-0 bg-cosmic-900/80 border-r border-cosmic-700 overflow-y-auto">
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gold-400 mb-2 flex items-center">
                <span className="mr-2">⚙️</span>
                AI 服務配置
              </h2>
              <p className="text-sm text-cosmic-400">選擇和配置圖像生成服務</p>
            </div>
            
            {/* AI 服務配置面板 */}
            <ServiceConfigurationPanel 
              className="mb-4"
              onConfigurationChange={(config) => {
                console.log('🔧 [VisualCreation] 配置更新:', config);
                // 同步提供者到 Redux 狀態
                if (config.provider !== currentProvider) {
                  console.log('🔄 [VisualCreation] 提供者變更:', currentProvider, '->', config.provider);
                  dispatch(setCurrentProvider(config.provider));
                }
              }}
              showBillingWarning={true}
            />
            
            {/* 認證狀態（僅 Pollinations） */}
            {currentProvider === 'pollinations' && (
              <div className="mt-4">
                <PollinationsAuthStatus
                  key={authStatusKey}
                  onClick={handleAuthStatusClick}
                  showDetails={true}
                  className="cursor-pointer hover:bg-cosmic-800/30 rounded-lg p-3 transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* 右側：插圖功能區域 - 填充剩餘空間 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-cosmic-900/30">
          {/* 標籤頁導航 */}
          <div className="flex-shrink-0 bg-cosmic-900/80 border-b border-cosmic-700">
            <nav className="flex px-6">
              {[
                { id: 'create' as ActiveTab, label: '創建', icon: '✨', description: '生成新的插畫（已整合模板功能）' },
                { id: 'gallery' as ActiveTab, label: '圖庫', icon: '🖼️', description: '插畫歷史管理' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-gold-500 text-gold-500 bg-cosmic-800/50'
                      : 'border-transparent text-cosmic-400 hover:text-cosmic-200 hover:bg-cosmic-800/30'
                  }`}
                  title={tab.description}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 插圖功能內容區域 - 優化滾動處理 */}
          <div className="flex-1 bg-cosmic-900/50 min-h-0 overflow-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* 底部狀態欄 */}
      <div className="flex-shrink-0 bg-cosmic-900/95 border-t border-cosmic-700 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-cosmic-400">
          <div className="flex items-center space-x-4">
            <span>專案: {currentProject.name}</span>
            <span>•</span>
            <span>服務: {
              currentProvider === 'pollinations' ? 'Pollinations.AI (免費)' :
              currentProvider === 'imagen' ? 'Google Imagen (付費)' :
              currentProvider === 'gemini' ? 'Gemini 2.5 Flash Image Preview' : '未知服務'
            }</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>服務正常</span>
          </div>
        </div>
      </div>

      {/* 圖像預覽模態框 - 次高優先級 */}
      <div className="relative z-[9998]">
        <ImagePreviewModal onSaveSelected={handleSaveSelectedImages} />
      </div>
      
      {/* 導出設定面板 - 中等優先級 */}
      <div className="relative z-[9997]">
        <ExportSettingsPanel 
          selectedImageIds={selectedImageIds}
        />
      </div>

      {/* 教學覆蓋層 - 高優先級但低於配置面板 */}
      <div className="relative z-[9998]">
        <TutorialOverlay
          isVisible={showTutorial}
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      </div>

      {/* Pollinations 認證指南 - 中等優先級 */}
      <div className="relative z-[9997]">
        <PollinationsAuthGuide
          isOpen={showAuthGuide}
          onClose={() => setShowAuthGuide(false)}
          onAuthUpdate={handleAuthUpdate}
        />
      </div>

      {/* 重新查看教學按鈕（開發用） */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={resetTutorial}
          className="fixed bottom-4 left-4 z-50 px-3 py-2 bg-cosmic-700 hover:bg-cosmic-600 text-cosmic-300 text-xs rounded border border-cosmic-600"
          title="重新顯示教學（僅開發模式）"
        >
          🎓 教學
        </button>
      )}
    </div>
  );
};

export default VisualCreationCenter;