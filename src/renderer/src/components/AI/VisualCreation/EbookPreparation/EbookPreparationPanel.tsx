import React, { useState, useEffect, useMemo } from 'react';
import { IllustrationHistoryItem } from '../../../../types/illustration';
import BatchRenamePanel from './components/BatchRenamePanel';
import MetadataAnalysisPanel from './components/MetadataAnalysisPanel';
import DragDropClassificationPanel, { ImageCategory } from './components/DragDropClassificationPanel';

interface EbookPreparationPanelProps {
  selectedImageIds: string[];
  illustrations: IllustrationHistoryItem[];
  onClose: () => void;
  className?: string;
}

/**
 * 電子書排版預備面板 - 獨立的圖片預處理工具
 * 不影響現有的 EPUB/PDF 輸出功能，僅作為預處理和組織工具
 */
export const EbookPreparationPanel: React.FC<EbookPreparationPanelProps> = ({
  selectedImageIds,
  illustrations,
  onClose,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'organize' | 'configure' | 'preview'>('organize');
  const [organizeSubTab, setOrganizeSubTab] = useState<'rename' | 'metadata' | 'classify'>('rename');
  const [isProcessing, _setIsProcessing] = useState(false);
  const [_imageClassifications, setImageClassifications] = useState<Record<string, ImageCategory>>({});

  // 過濾選中的圖片
  const selectedImages = useMemo(() => {
    return illustrations.filter(img => selectedImageIds.includes(img.id));
  }, [illustrations, selectedImageIds]);

  // 統計信息
  const stats = useMemo(() => {
    return {
      totalImages: selectedImages.length,
      completedImages: selectedImages.filter(img => img.status === 'completed').length,
      totalSize: selectedImages.reduce((sum, img) => sum + (img.file_size_bytes || 0), 0),
      avgDimensions: {
        width: Math.round(selectedImages.reduce((sum, img) => sum + (img.width || 0), 0) / selectedImages.length) || 0,
        height: Math.round(selectedImages.reduce((sum, img) => sum + (img.height || 0), 0) / selectedImages.length) || 0
      }
    };
  }, [selectedImages]);

  // Tab 配置
  const tabs = [
    {
      id: 'organize' as const,
      name: '圖片整理',
      icon: '🏷️',
      description: '批次重命名和元數據分析'
    },
    {
      id: 'configure' as const,
      name: '章節配置',
      icon: '📖',
      description: '設定圖片在電子書中的位置'
    },
    {
      id: 'preview' as const,
      name: '排版預覽',
      icon: '👁️',
      description: '預覽電子書排版效果'
    }
  ];

  // 子標籤配置（僅用於 organize）
  const organizeSubTabs = [
    {
      id: 'rename' as const,
      name: '批次重命名',
      icon: '🏷️',
      description: '智能重命名和分類'
    },
    {
      id: 'metadata' as const,
      name: '元數據分析',
      icon: '📊',
      description: '圖片品質和適用性分析'
    },
    {
      id: 'classify' as const,
      name: '拖放分類',
      icon: '🗂️',
      description: '拖拽圖片進行分類整理'
    }
  ];

  useEffect(() => {
    console.log('🚀 [EbookPreparationPanel] 初始化，選中圖片：', selectedImages.length);
  }, [selectedImages.length]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleRename = (imageId: string, newName: string) => {
    console.log('🏷️ [批次重命名]', { imageId, newName });
    // TODO: 實現重命名邏輯
  };

  const handleClassificationChange = (classifications: Record<string, ImageCategory>) => {
    setImageClassifications(classifications);
    console.log('🗂️ [拖放分類]', classifications);
  };

  const renderOrganizeContent = () => {
    return (
      <div className="space-y-6">
        {/* 統計面板 */}
        <div className="bg-cosmic-800 rounded-lg p-4">
          <h4 className="text-base font-medium text-cosmic-100 mb-3 flex items-center">
            <span className="text-xl mr-2">📊</span>
            圖片統計
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-cosmic-750 p-3 rounded">
              <div className="text-cosmic-400">總數量</div>
              <div className="text-lg font-semibold text-cosmic-100">{stats.totalImages}</div>
            </div>
            <div className="bg-cosmic-750 p-3 rounded">
              <div className="text-cosmic-400">已完成</div>
              <div className="text-lg font-semibold text-green-400">{stats.completedImages}</div>
            </div>
            <div className="bg-cosmic-750 p-3 rounded">
              <div className="text-cosmic-400">總大小</div>
              <div className="text-lg font-semibold text-cosmic-100">{formatFileSize(stats.totalSize)}</div>
            </div>
            <div className="bg-cosmic-750 p-3 rounded">
              <div className="text-cosmic-400">平均尺寸</div>
              <div className="text-lg font-semibold text-cosmic-100">
                {stats.avgDimensions.width}×{stats.avgDimensions.height}
              </div>
            </div>
          </div>
        </div>

        {/* 功能說明 */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-4">
          <h4 className="text-blue-300 font-medium mb-2 flex items-center">
            <span className="text-xl mr-2">💡</span>
            功能說明
          </h4>
          <p className="text-blue-200 text-sm mb-3">
            這是一個獨立的電子書排版預備工具，幫助您組織和準備圖片，<strong>不會影響現有的完美 PDF 輸出功能</strong>。
          </p>
          <ul className="text-blue-200 text-sm space-y-1">
            <li>• <strong>批次重命名：</strong>智能重命名和分類整理</li>
            <li>• <strong>元數據分析：</strong>圖片品質和電子書適用性評估</li>
            <li>• <strong>拖放分類：</strong>直觀的拖拽式圖片分類管理</li>
          </ul>
        </div>

        {/* 子標籤導航 */}
        <div className="bg-cosmic-800 rounded-lg p-4">
          <div className="flex space-x-1 mb-4">
            {organizeSubTabs.map(subTab => (
              <button
                key={subTab.id}
                onClick={() => setOrganizeSubTab(subTab.id)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  organizeSubTab === subTab.id
                    ? 'bg-gold-500 text-black'
                    : 'bg-cosmic-750 text-cosmic-300 hover:bg-cosmic-700'
                }`}
              >
                <span className="mr-2">{subTab.icon}</span>
                {subTab.name}
              </button>
            ))}
          </div>

          {/* 子標籤內容 */}
          {organizeSubTab === 'rename' && (
            <BatchRenamePanel
              selectedImages={selectedImages}
              onRename={handleRename}
            />
          )}

          {organizeSubTab === 'metadata' && (
            <MetadataAnalysisPanel
              selectedImages={selectedImages}
            />
          )}

          {organizeSubTab === 'classify' && (
            <DragDropClassificationPanel
              selectedImages={selectedImages}
              onClassificationChange={handleClassificationChange}
            />
          )}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'organize':
        return renderOrganizeContent();

      case 'configure':
        return (
          <div className="space-y-6">
            <div className="bg-cosmic-800 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold text-cosmic-200 mb-2">章節配置功能</h3>
              <p className="text-cosmic-400">正在開發中，敬請期待...</p>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div className="bg-cosmic-800 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-cosmic-200 mb-2">排版預覽功能</h3>
              <p className="text-cosmic-400">正在開發中，敬請期待...</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-cosmic-900 rounded-xl border border-cosmic-700 ${className}`}>
      {/* 標題欄 */}
      <div className="flex items-center justify-between p-6 border-b border-cosmic-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-xl">
            📚
          </div>
          <div>
            <h2 className="text-xl font-semibold text-cosmic-100">電子書排版預備</h2>
            <p className="text-sm text-cosmic-400">智能圖片整理與排版配置工具</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-cosmic-400 hover:text-cosmic-200 p-2 rounded-lg hover:bg-cosmic-800 transition-colors"
          title="關閉"
        >
          ✕
        </button>
      </div>

      {/* Tab 導航 */}
      <div className="border-b border-cosmic-700">
        <div className="flex px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'border-gold-500 text-gold-400 bg-gold-500/10'
                  : 'border-transparent text-cosmic-400 hover:text-cosmic-200 hover:bg-cosmic-800'
                }
              `}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 內容 */}
      <div className="p-6 min-h-96">
        {renderTabContent()}
      </div>

      {/* 底部操作欄 */}
      <div className="border-t border-cosmic-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-cosmic-400">
            已選擇 {selectedImages.length} 張圖片用於電子書排版
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-cosmic-300 bg-cosmic-800 hover:bg-cosmic-700 rounded-lg transition-colors"
            >
              關閉
            </button>
            <button
              disabled={selectedImages.length === 0 || isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isProcessing ? '處理中...' : '開始處理'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};