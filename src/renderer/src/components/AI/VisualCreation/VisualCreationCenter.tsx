import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store/store';
import LoadingSpinner from '../../UI/LoadingSpinner';

// 導入 Redux actions
import {
  setActiveTab,
  setCurrentProvider,
  initializeVisualCreation,
  clearError,
} from '../../../store/slices/visualCreationSlice';

// 導入子組件
import { CreateTab } from './CreateTab';
import { MonitorTab } from './MonitorTab';
import { GalleryTab } from './GalleryTab';
import ImagePreviewModal from './ImagePreviewModal';

interface VisualCreationCenterProps {
  className?: string;
}

type ActiveTab = 'create' | 'monitor' | 'gallery';
type IllustrationProvider = 'pollinations' | 'imagen';

const VisualCreationCenter: React.FC<VisualCreationCenterProps> = ({
  className = ''
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  
  // Redux 狀態
  const {
    activeTab,
    currentProvider,
    error,
    loading,
  } = useSelector((state: RootState) => state.visualCreation);

  // 初始化組件
  useEffect(() => {
    if (currentProject) {
      dispatch(clearError());
      dispatch(initializeVisualCreation(currentProject.id));
    }
  }, [currentProject, dispatch]);

  // 供應商切換處理
  const handleProviderChange = useCallback((provider: IllustrationProvider) => {
    dispatch(setCurrentProvider(provider));
    console.log(`🔄 插畫服務切換至: ${provider === 'pollinations' ? 'Pollinations.AI (免費)' : 'Google Imagen (付費)'}`);
  }, [dispatch]);

  // 標籤切換處理
  const handleTabChange = useCallback((tab: ActiveTab) => {
    dispatch(setActiveTab(tab));
    console.log(`🎯 切換至標籤頁: ${tab}`);
  }, [dispatch]);

  // 渲染標籤頁內容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'create':
        return (
          <div className="p-6 h-full">
            <CreateTab className="h-full" />
          </div>
        );
        
      case 'monitor':
        return (
          <div className="p-6 h-full">
            <MonitorTab className="h-full" />
          </div>
        );
        
      case 'gallery':
        return (
          <div className="p-6 h-full">
            <GalleryTab className="h-full" />
          </div>
        );
        
      default:
        return null;
    }
  };

  // 如果沒有選擇專案，顯示提示
  if (!currentProject) {
    return (
      <div className={`visual-creation-center ${className}`}>
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
      <div className={`visual-creation-center ${className}`}>
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
      <div className={`visual-creation-center ${className}`}>
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
    <div className={`visual-creation-center h-full flex flex-col ${className}`}>
      {/* 頂部標題和供應商選擇器 */}
      <div className="flex-shrink-0 bg-cosmic-900/95 border-b border-cosmic-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 標題 */}
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎨</div>
            <div>
              <h1 className="text-xl font-cosmic text-gold-500">視覺創作中心</h1>
              <p className="text-sm text-cosmic-400">統一的 AI 插畫創作和管理平台</p>
            </div>
          </div>

          {/* 供應商選擇器 */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-cosmic-400">插畫服務:</span>
            <div className="flex bg-cosmic-800 rounded-lg p-1 border border-cosmic-700">
              <button
                onClick={() => handleProviderChange('pollinations')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
                  currentProvider === 'pollinations'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-cosmic-300 hover:text-white hover:bg-cosmic-700'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span className="text-xs">🆓</span>
                  <span>Pollinations</span>
                </div>
              </button>
              <button
                onClick={() => handleProviderChange('imagen')}
                className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
                  currentProvider === 'imagen'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-cosmic-300 hover:text-white hover:bg-cosmic-700'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span className="text-xs">💳</span>
                  <span>Imagen</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 標籤頁導航 */}
      <div className="flex-shrink-0 bg-cosmic-900/80 border-b border-cosmic-700">
        <nav className="flex px-6">
          {[
            { id: 'create' as ActiveTab, label: '創建', icon: '✨', description: '生成新的插畫' },
            { id: 'monitor' as ActiveTab, label: '監控', icon: '📊', description: '批次任務監控' },
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

      {/* 主要內容區域 */}
      <div className="flex-1 bg-cosmic-900/50 overflow-y-auto">
        {renderTabContent()}
      </div>

      {/* 底部狀態欄 */}
      <div className="flex-shrink-0 bg-cosmic-900/95 border-t border-cosmic-700 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-cosmic-400">
          <div className="flex items-center space-x-4">
            <span>專案: {currentProject.name}</span>
            <span>•</span>
            <span>服務: {currentProvider === 'pollinations' ? 'Pollinations.AI (免費)' : 'Google Imagen (付費)'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>服務正常</span>
          </div>
        </div>
      </div>

      {/* 圖像預覽模態框 */}
      <ImagePreviewModal />
    </div>
  );
};

export default VisualCreationCenter;