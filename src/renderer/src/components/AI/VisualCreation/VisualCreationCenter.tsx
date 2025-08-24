import React, { useEffect, useCallback, useMemo } from 'react';
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
import { fetchCharactersByProjectId } from '../../../store/slices/charactersSlice';
import { 
  loadVersions,
  resetVersionManagement 
} from '../../../store/slices/versionManagementSlice';

// 導入子組件
import { CreateTab } from './CreateTab';
import { GalleryTab } from './GalleryTab';
import ImagePreviewModal from './ImagePreviewModal';
import ExportSettingsPanel from './panels/ExportSettingsPanel';
import { StyleTemplateSelector } from './StyleTemplateSelector';

// 導入版本管理組件
import { VersionTimeline, VersionDetailsPanel, VersionComparisonView } from './VersionManagement';

interface VisualCreationCenterProps {
  className?: string;
}

type ActiveTab = 'create' | 'gallery' | 'templates' | 'versions';
type IllustrationProvider = 'pollinations' | 'imagen';

const VisualCreationCenter: React.FC<VisualCreationCenterProps> = ({
  className = ''
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // Redux 狀態
  const {
    activeTab,
    currentProvider,
    error,
    loading,
    selectedImageIds,
  } = useSelector((state: RootState) => state.visualCreation);

  // 版本管理狀態
  const {
    versions,
    currentVersionId,
    selectedVersionIds,
    versionTrees,
    loading: _versionLoading,
    error: _versionError,
  } = useSelector((state: RootState) => state.versionManagement);

  // 穩定化版本樹引用，避免無限循環
  const firstVersionTree = useMemo(() => {
    const trees = Object.values(versionTrees);
    return trees.length > 0 ? trees[0] : undefined;
  }, [versionTrees]);

  // 穩定化版本比較數據
  const comparisonVersions = useMemo(() => {
    if (selectedVersionIds.length < 2) return [];
    return selectedVersionIds
      .slice(0, 2)
      .map(id => versions.find(v => v.id === id))
      .filter(Boolean);
  }, [selectedVersionIds, versions]);

  // 穩定化當前版本
  const currentVersion = useMemo(() => {
    return currentVersionId ? versions.find(v => v.id === currentVersionId) : undefined;
  }, [currentVersionId, versions]);

  // 初始化組件 - 同時載入角色和版本管理
  useEffect(() => {
    if (currentProject) {
      console.log('🎨 [VisualCreationCenter] 初始化，專案ID:', currentProject.id);
      dispatch(clearError());
      dispatch(initializeVisualCreation(currentProject.id));
      
      // 載入角色資料到 Redux
      console.log('📊 [VisualCreationCenter] 載入角色資料...');
      dispatch(fetchCharactersByProjectId(currentProject.id));
      
      // 初始化版本管理系統
      console.log('🕒 [VisualCreationCenter] 初始化版本管理系統...');
      dispatch(resetVersionManagement());
      dispatch(loadVersions(currentProject.id));
    }
  }, [currentProject, dispatch]);

  // 調試：監控角色狀態變化
  useEffect(() => {
    console.log('🎨 [VisualCreationCenter] 角色狀態更新:');
    console.log('   📊 角色總數:', characters.length);
    if (characters.length > 0) {
      console.log('   🎭 角色列表:', characters.map(c => ({
        id: c.id,
        name: c.name,
        projectId: c.projectId
      })));
    }
    
    if (currentProject) {
      const projectCharacters = characters.filter(c => String(c.projectId) === String(currentProject.id));
      console.log('   🎯 專案角色數:', projectCharacters.length);
    }
  }, [characters, currentProject]);

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
        
      case 'gallery':
        return (
          <div className="p-6 h-full">
            <GalleryTab className="h-full" />
          </div>
        );
        
      case 'templates':
        return (
          <div className="p-6 h-full">
            <StyleTemplateSelector 
              className="h-full" 
              onTemplateApply={(template) => {
                console.log('🎨 [VisualCreationCenter] 應用風格模板:', template.name);
                // TODO: 將模板應用到當前的創作配置中
              }}
            />
          </div>
        );

      case 'versions':
        return (
          <div className="p-6 h-full">
            <div className="h-full flex flex-col space-y-6">
              {/* 版本管理主標題 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🕒</div>
                  <div>
                    <h2 className="text-xl font-cosmic text-gold-500">版本管理</h2>
                    <p className="text-sm text-cosmic-400">追踪插畫版本歷史，比較差異與管理分支</p>
                  </div>
                </div>
              </div>

              {/* 版本管理內容區域 */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* 版本時間線 (左側) */}
                <div className="lg:col-span-2 bg-cosmic-800/30 border border-cosmic-700 rounded-lg">
                  <div className="p-4 border-b border-cosmic-700">
                    <h3 className="text-lg font-medium text-cosmic-100 flex items-center space-x-2">
                      <span>📈</span>
                      <span>版本時間線</span>
                    </h3>
                    <p className="text-sm text-cosmic-400 mt-1">
                      視覺化顯示插畫版本的演進歷史
                    </p>
                  </div>
                  <div className="h-96">
                    <VersionTimeline
                      versions={versions}
                      versionTree={firstVersionTree}
                      layout="vertical"
                      showBranches={true}
                      showLabels={true}
                      showMiniCards={true}
                      selectedVersionId={currentVersionId || undefined}
                      className="h-full"
                    />
                  </div>
                </div>

                {/* 版本詳細資訊 (右側) */}
                <div className="bg-cosmic-800/30 border border-cosmic-700 rounded-lg">
                  <div className="p-4 border-b border-cosmic-700">
                    <h3 className="text-lg font-medium text-cosmic-100 flex items-center space-x-2">
                      <span>📋</span>
                      <span>版本詳情</span>
                    </h3>
                    <p className="text-sm text-cosmic-400 mt-1">
                      查看所選版本的詳細資訊
                    </p>
                  </div>
                  <div className="h-96">
                    <VersionDetailsPanel 
                      version={currentVersion}
                      className="h-full" 
                    />
                  </div>
                </div>
              </div>

              {/* 版本比較區域 (底部) */}
              <div className="bg-cosmic-800/30 border border-cosmic-700 rounded-lg">
                <div className="p-4 border-b border-cosmic-700">
                  <h3 className="text-lg font-medium text-cosmic-100 flex items-center space-x-2">
                    <span>🔄</span>
                    <span>版本比較</span>
                  </h3>
                  <p className="text-sm text-cosmic-400 mt-1">
                    並排比較不同版本之間的差異
                  </p>
                </div>
                <div className="h-64">
                  <VersionComparisonView
                    version1={comparisonVersions[0]}
                    version2={comparisonVersions[1]}
                    mode="visual"
                    layout="side-by-side"
                    showDifferences={true}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
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
            { id: 'templates' as ActiveTab, label: '模板', icon: '🎨', description: '風格模板管理' },
            { id: 'gallery' as ActiveTab, label: '圖庫', icon: '🖼️', description: '插畫歷史管理' },
            { id: 'versions' as ActiveTab, label: '版本', icon: '🕒', description: '版本管理與比較' }
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
      
      {/* 導出設定面板 */}
      <ExportSettingsPanel 
        selectedImageIds={selectedImageIds}
      />
    </div>
  );
};

export default VisualCreationCenter;