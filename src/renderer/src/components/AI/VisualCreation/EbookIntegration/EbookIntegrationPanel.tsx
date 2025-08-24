import React, { useState, useEffect, useMemo } from 'react';
import { 
  EbookExportConfig, 
  EbookImageIntegration,
  EbookImagePlacement,
  ImageCategory
} from '../../../../types/imageMetadata';
import { IllustrationHistoryItem } from '../../../../types/illustration';

interface EbookIntegrationPanelProps {
  projectId: string;
  onClose: () => void;
  onExportToEbook: (config: EbookExportConfig) => void;
  className?: string;
}

/**
 * 電子書整合面板 - 管理圖片在電子書中的整合和配置
 */
export const EbookIntegrationPanel: React.FC<EbookIntegrationPanelProps> = ({
  projectId,
  onClose,
  onExportToEbook,
  className = ''
}) => {
  const [exportConfig, setExportConfig] = useState<EbookExportConfig>({
    includeImages: true,
    imageQuality: 85,
    maxImageWidth: 1200,
    maxImageHeight: 900,
    compressionLevel: 'medium',
    includeImageMetadata: true,
    includeAltText: true,
    includeDescriptions: true,
    imagePlacementRules: {
      [EbookImagePlacement.ChapterHeader]: { enabled: true, maxSize: 800, quality: 90 },
      [EbookImagePlacement.ChapterEnd]: { enabled: true, maxSize: 600, quality: 85 },
      [EbookImagePlacement.Inline]: { enabled: true, maxSize: 1000, quality: 80 },
      [EbookImagePlacement.FullPage]: { enabled: true, maxSize: 1200, quality: 95 },
      [EbookImagePlacement.Cover]: { enabled: true, maxSize: 1600, quality: 100 },
      [EbookImagePlacement.BackCover]: { enabled: true, maxSize: 1600, quality: 100 },
      [EbookImagePlacement.CharacterPortrait]: { enabled: true, maxSize: 800, quality: 90 },
      [EbookImagePlacement.SceneIllustration]: { enabled: true, maxSize: 1200, quality: 90 },
      [EbookImagePlacement.Map]: { enabled: true, maxSize: 1500, quality: 95 },
      [EbookImagePlacement.Diagram]: { enabled: true, maxSize: 1000, quality: 90 }
    }
  });

  const [_projectImages, setProjectImages] = useState<IllustrationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'placement' | 'settings' | 'preview'>('overview');
  const [integrationData, setIntegrationData] = useState<EbookImageIntegration | null>(null);

  // 載入專案圖片
  useEffect(() => {
    const loadProjectImages = async () => {
      setIsLoading(true);
      try {
        // 這裡需要實際的 API 呼叫
        // const images = await api.illustration.getIllustrationHistory(projectId);
        
        // 臨時模擬數據
        const mockImages: IllustrationHistoryItem[] = [
          {
            id: 'img1',
            project_id: projectId,
            character_id: 'char1',
            original_prompt: '主角艾莉的肖像',
            model: 'flux',
            width: 1024,
            height: 1024,
            status: 'completed',
            created_at: new Date().toISOString(),
            is_favorite: false,
            provider: 'pollinations',
            is_free: true,
            image_url: '/path/to/image1.png',
            local_file_path: '/path/to/image1.png',
            enhance: false
          },
          {
            id: 'img2',
            project_id: projectId,
            original_prompt: '第一章開場場景',
            model: 'flux',
            width: 1200,
            height: 800,
            status: 'completed',
            created_at: new Date().toISOString(),
            is_favorite: true,
            provider: 'pollinations',
            is_free: true,
            image_url: '/path/to/image2.png',
            local_file_path: '/path/to/image2.png',
            enhance: false
          }
        ];
        setProjectImages(mockImages);

        // 生成整合數據
        generateIntegrationData(mockImages);
      } catch (error) {
        console.error('載入專案圖片失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectImages();
  }, [projectId]);

  // 生成整合數據
  const generateIntegrationData = (images: IllustrationHistoryItem[]) => {
    const integration: EbookImageIntegration = {
      projectId,
      totalImages: images.length,
      processedImages: images.filter(img => img.status === 'completed').length,
      byChapter: [
        {
          chapterId: 'ch1',
          chapterTitle: '第一章：命運的邂逅',
          imageCount: 1,
          totalSize: 2.5,
          placements: [
            {
              placement: EbookImagePlacement.Inline,
              images: [
                {
                  imageId: 'img2',
                  filename: 'Ch01_Opening_Scene.png',
                  description: '第一章開場場景描繪',
                  order: 1
                }
              ]
            }
          ]
        }
      ],
      globalImages: [
        {
          imageId: 'img1',
          category: ImageCategory.Character,
          placement: EbookImagePlacement.CharacterPortrait,
          filename: 'Character_Alice_Portrait.png',
          description: '主角艾莉的角色肖像'
        }
      ],
      statistics: {
        totalSizeMB: 5.2,
        averageImageSize: 2.6,
        compressionRatio: 0.75,
        estimatedEbookIncrease: 4.8
      },
      lastUpdated: new Date().toISOString()
    };
    
    setIntegrationData(integration);
  };

  // 位置配置選項
  const placementOptions = [
    { value: EbookImagePlacement.ChapterHeader, label: '章節標題', icon: '📖', description: '顯示在章節開頭' },
    { value: EbookImagePlacement.ChapterEnd, label: '章節結尾', icon: '📄', description: '顯示在章節結尾' },
    { value: EbookImagePlacement.Inline, label: '文中插圖', icon: '🖼️', description: '嵌入文字內容中' },
    { value: EbookImagePlacement.FullPage, label: '全頁插圖', icon: '🎨', description: '獨立頁面顯示' },
    { value: EbookImagePlacement.Cover, label: '封面', icon: '📚', description: '作為電子書封面' },
    { value: EbookImagePlacement.CharacterPortrait, label: '角色肖像', icon: '👤', description: '角色介紹頁面' },
    { value: EbookImagePlacement.SceneIllustration, label: '場景插圖', icon: '🏞️', description: '重要場景描繪' },
    { value: EbookImagePlacement.Map, label: '地圖', icon: '🗺️', description: '世界觀地圖' },
    { value: EbookImagePlacement.Diagram, label: '圖表', icon: '📊', description: '說明圖表' }
  ];

  // 品質預設
  const qualityPresets = [
    { name: '高品質', quality: 95, compression: 'low' as const, description: '最佳視覺效果，檔案較大' },
    { name: '平衡', quality: 85, compression: 'medium' as const, description: '品質與檔案大小平衡' },
    { name: '優化', quality: 75, compression: 'high' as const, description: '較小檔案，適合快速載入' }
  ];

  const totalEstimatedSize = useMemo(() => {
    if (!integrationData) return 0;
    return integrationData.statistics.totalSizeMB * (exportConfig.imageQuality / 100);
  }, [integrationData, exportConfig.imageQuality]);

  const enabledPlacements = useMemo(() => {
    return Object.entries(exportConfig.imagePlacementRules)
      .filter(([_, rule]) => rule.enabled)
      .length;
  }, [exportConfig.imagePlacementRules]);

  // 更新配置
  const updateConfig = (updates: Partial<EbookExportConfig>) => {
    setExportConfig(prev => ({ ...prev, ...updates }));
  };

  // 更新位置規則
  const updatePlacementRule = (placement: EbookImagePlacement, rule: Partial<EbookExportConfig['imagePlacementRules'][EbookImagePlacement.Inline]>) => {
    setExportConfig(prev => ({
      ...prev,
      imagePlacementRules: {
        ...prev.imagePlacementRules,
        [placement]: { ...prev.imagePlacementRules[placement], ...rule }
      }
    }));
  };

  if (isLoading) {
    return (
      <div className={`bg-cosmic-800/95 border border-cosmic-700 rounded-lg shadow-xl p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-4"></div>
            <p className="text-cosmic-400">載入電子書整合資料中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative isolate bg-cosmic-800/95 border border-cosmic-700 rounded-lg shadow-xl ${className}`}
      style={{ zIndex: 1100 }}
    >
      {/* 標題列 */}
      <div className="flex items-center justify-between p-4 border-b border-cosmic-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gold-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-cosmic-100">電子書整合</h3>
            <p className="text-sm text-cosmic-400">
              {integrationData ? `${integrationData.totalImages} 張圖片，預估增加 ${totalEstimatedSize.toFixed(1)} MB` : '載入中...'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cosmic-400 hover:text-cosmic-200 hover:bg-cosmic-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 頁籤導航 */}
      <div className="flex border-b border-cosmic-700">
        {[
          { id: 'overview', name: '概覽', icon: '📊' },
          { id: 'placement', name: '位置配置', icon: '📍' },
          { id: 'settings', name: '匯出設定', icon: '⚙️' },
          { id: 'preview', name: '預覽', icon: '👁️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'text-gold-400 border-b-2 border-gold-500 bg-gold-500/10'
                : 'text-cosmic-400 hover:text-cosmic-300 hover:bg-cosmic-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* 概覽頁籤 */}
        {selectedTab === 'overview' && integrationData && (
          <div className="space-y-6">
            {/* 統計卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-cosmic-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gold-400">{integrationData.totalImages}</div>
                <div className="text-sm text-cosmic-400">總圖片數</div>
              </div>
              <div className="bg-cosmic-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{integrationData.processedImages}</div>
                <div className="text-sm text-cosmic-400">已處理</div>
              </div>
              <div className="bg-cosmic-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{enabledPlacements}</div>
                <div className="text-sm text-cosmic-400">啟用位置</div>
              </div>
              <div className="bg-cosmic-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{totalEstimatedSize.toFixed(1)} MB</div>
                <div className="text-sm text-cosmic-400">預估大小</div>
              </div>
            </div>

            {/* 章節圖片分佈 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-cosmic-200">章節圖片分佈</h4>
              <div className="space-y-3">
                {integrationData.byChapter.map((chapter) => (
                  <div key={chapter.chapterId} className="bg-cosmic-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-cosmic-200">{chapter.chapterTitle}</h5>
                      <div className="text-sm text-cosmic-400">
                        {chapter.imageCount} 張圖片 • {chapter.totalSize} MB
                      </div>
                    </div>
                    <div className="space-y-2">
                      {chapter.placements.map((placement, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gold-400 rounded-full"></div>
                            <span className="text-cosmic-300">
                              {placementOptions.find(p => p.value === placement.placement)?.label}
                            </span>
                          </div>
                          <span className="text-cosmic-400">{placement.images.length} 張</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 全域圖片 */}
            {integrationData.globalImages.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-cosmic-200">全域圖片</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrationData.globalImages.map((image) => (
                    <div key={image.imageId} className="bg-cosmic-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-cosmic-200 truncate">{image.filename}</h5>
                        <span className="text-xs bg-gold-600/20 text-gold-400 px-2 py-1 rounded">
                          {placementOptions.find(p => p.value === image.placement)?.icon}
                        </span>
                      </div>
                      <p className="text-sm text-cosmic-400">{image.description}</p>
                      <div className="mt-2 text-xs text-cosmic-500">
                        類別: {image.category} • 位置: {placementOptions.find(p => p.value === image.placement)?.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 位置配置頁籤 */}
        {selectedTab === 'placement' && (
          <div className="space-y-6">
            <div className="text-sm text-cosmic-400">
              配置不同位置類型的圖片顯示規則和品質設定
            </div>
            <div className="space-y-4">
              {placementOptions.map((option) => {
                const rule = exportConfig.imagePlacementRules[option.value];
                return (
                  <div key={option.value} className="bg-cosmic-800/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-cosmic-700 rounded-lg flex items-center justify-center text-lg">
                          {option.icon}
                        </div>
                        <div>
                          <h5 className="font-medium text-cosmic-200">{option.label}</h5>
                          <p className="text-sm text-cosmic-400">{option.description}</p>
                        </div>
                      </div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => updatePlacementRule(option.value, { enabled: e.target.checked })}
                          className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                        />
                        <span className="text-sm text-cosmic-300">啟用</span>
                      </label>
                    </div>
                    
                    {rule.enabled && (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-cosmic-700">
                        <div>
                          <label className="block text-sm font-medium text-cosmic-300 mb-2">
                            最大尺寸: {rule.maxSize}px
                          </label>
                          <input
                            type="range"
                            min="400"
                            max="2000"
                            step="100"
                            value={rule.maxSize || 1000}
                            onChange={(e) => updatePlacementRule(option.value, { maxSize: parseInt(e.target.value) })}
                            className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cosmic-300 mb-2">
                            品質: {rule.quality}%
                          </label>
                          <input
                            type="range"
                            min="50"
                            max="100"
                            step="5"
                            value={rule.quality || 85}
                            onChange={(e) => updatePlacementRule(option.value, { quality: parseInt(e.target.value) })}
                            className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 匯出設定頁籤 */}
        {selectedTab === 'settings' && (
          <div className="space-y-6">
            {/* 品質預設 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-cosmic-200">品質預設</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {qualityPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => updateConfig({ 
                      imageQuality: preset.quality, 
                      compressionLevel: preset.compression 
                    })}
                    className={`p-4 text-left rounded-lg border transition-all ${
                      exportConfig.imageQuality === preset.quality
                        ? 'border-gold-500 bg-gold-600/10'
                        : 'border-cosmic-600 bg-cosmic-800/50 hover:border-cosmic-500'
                    }`}
                  >
                    <h5 className="font-medium text-cosmic-200">{preset.name}</h5>
                    <p className="text-sm text-cosmic-400 mt-1">{preset.description}</p>
                    <div className="text-xs text-gold-400 mt-2">品質: {preset.quality}%</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 詳細設定 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-cosmic-200">詳細設定</h4>
              <div className="bg-cosmic-800/50 rounded-lg p-4 space-y-4">
                {/* 圖片品質 */}
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    整體圖片品質: {exportConfig.imageQuality}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={exportConfig.imageQuality}
                    onChange={(e) => updateConfig({ imageQuality: parseInt(e.target.value) })}
                    className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                  />
                </div>

                {/* 尺寸限制 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      最大寬度: {exportConfig.maxImageWidth}px
                    </label>
                    <input
                      type="range"
                      min="600"
                      max="2400"
                      step="100"
                      value={exportConfig.maxImageWidth}
                      onChange={(e) => updateConfig({ maxImageWidth: parseInt(e.target.value) })}
                      className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      最大高度: {exportConfig.maxImageHeight}px
                    </label>
                    <input
                      type="range"
                      min="400"
                      max="1800"
                      step="100"
                      value={exportConfig.maxImageHeight}
                      onChange={(e) => updateConfig({ maxImageHeight: parseInt(e.target.value) })}
                      className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                    />
                  </div>
                </div>

                {/* 包含選項 */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeImageMetadata}
                      onChange={(e) => updateConfig({ includeImageMetadata: e.target.checked })}
                      className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-cosmic-300">包含圖片元數據</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeAltText}
                      onChange={(e) => updateConfig({ includeAltText: e.target.checked })}
                      className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-cosmic-300">包含替代文字</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeDescriptions}
                      onChange={(e) => updateConfig({ includeDescriptions: e.target.checked })}
                      className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-cosmic-300">包含圖片描述</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 預覽頁籤 */}
        {selectedTab === 'preview' && (
          <div className="space-y-6">
            <div className="text-center py-8 text-cosmic-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h4 className="text-lg font-medium mb-2">電子書預覽</h4>
              <p>此功能將在後續版本中實現</p>
              <p className="text-sm mt-1">將提供電子書布局的即時預覽</p>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作區 */}
      <div className="border-t border-cosmic-700 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-cosmic-400">
            預估電子書增加大小: {totalEstimatedSize.toFixed(1)} MB
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-cosmic-300 hover:text-cosmic-100 hover:bg-cosmic-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => onExportToEbook(exportConfig)}
              className="px-4 py-2 bg-gold-600 text-white hover:bg-gold-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>匯出到電子書</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EbookIntegrationPanel;