import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../store/store';
import {
  setExportSettings,
  setShowExportPanel,
  exportSelectedImages,
} from '../../../../store/slices/visualCreationSlice';
import type { ExportFormat } from '../../../../store/slices/visualCreationSlice';

interface ExportSettingsPanelProps {
  selectedImageIds: string[];
}

const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({
  selectedImageIds
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const { 
    exportSettings, 
    showExportPanel, 
    isExporting, 
    exportProgress,
    exportTask 
  } = useSelector((state: RootState) => state.visualCreation);

  // 格式選項
  const formatOptions = [
    { value: 'png', label: 'PNG', description: '無損壓縮，支援透明背景' },
    { value: 'jpg', label: 'JPG', description: '有損壓縮，檔案較小' },
    { value: 'webp', label: 'WebP', description: '現代格式，壓縮效率高' },
  ] as const;

  // 品質預設
  const qualityPresets = [
    { value: 60, label: '低品質', description: '檔案最小' },
    { value: 80, label: '標準品質', description: '平衡品質與大小' },
    { value: 90, label: '高品質', description: '推薦設定' },
    { value: 100, label: '最高品質', description: '檔案最大' },
  ];

  // 檔名前綴建議
  const prefixSuggestions = [
    'illustration',
    'artwork',
    'character',
    'scene',
    'portrait',
  ];

  const handleClose = () => {
    dispatch(setShowExportPanel(false));
  };

  const handleExport = async () => {
    try {
      await dispatch(exportSelectedImages({ 
        selectedImageIds 
      })).unwrap();
      handleClose();
    } catch (error) {
      console.error('導出失敗:', error);
    }
  };

  const handleSettingChange = (key: keyof typeof exportSettings, value: any) => {
    dispatch(setExportSettings({ [key]: value }));
  };

  if (!showExportPanel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-cosmic-800 rounded-lg border border-cosmic-700 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-6 border-b border-cosmic-700">
          <h2 className="text-xl font-cosmic text-white">
            🎨 導出設定
          </h2>
          <button
            onClick={handleClose}
            className="text-cosmic-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 設定內容 */}
        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="bg-cosmic-700/30 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">導出概覽</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-cosmic-400">選中圖像:</span>
                <span className="ml-2 text-white">{selectedImageIds.length} 張</span>
              </div>
              <div>
                <span className="text-cosmic-400">當前格式:</span>
                <span className="ml-2 text-white uppercase">{exportSettings.format}</span>
              </div>
            </div>
          </div>

          {/* 格式設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">導出格式</h3>
            <div className="grid grid-cols-1 gap-3">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center p-4 rounded-lg border cursor-pointer transition-all
                    ${exportSettings.format === option.value
                      ? 'border-gold-500 bg-gold-900/20'
                      : 'border-cosmic-600 hover:border-cosmic-500'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={exportSettings.format === option.value}
                    onChange={(e) => handleSettingChange('format', e.target.value as ExportFormat)}
                    className="mr-3 text-gold-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{option.label}</span>
                      <span className="text-xs text-cosmic-400 uppercase">.{option.value}</span>
                    </div>
                    <p className="text-sm text-cosmic-400 mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 品質設定（僅對 JPG/WebP 有效） */}
          {(exportSettings.format === 'jpg' || exportSettings.format === 'webp') && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">品質設定</h3>
              
              {/* 滑桿控制 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-cosmic-300">壓縮品質</span>
                  <span className="text-white font-mono">{exportSettings.quality}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={exportSettings.quality}
                  onChange={(e) => handleSettingChange('quality', parseInt(e.target.value))}
                  className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
              </div>

              {/* 預設按鈕 */}
              <div className="grid grid-cols-4 gap-2">
                {qualityPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleSettingChange('quality', preset.value)}
                    className={`
                      px-3 py-2 rounded text-sm transition-colors
                      ${exportSettings.quality === preset.value
                        ? 'bg-gold-600 text-white'
                        : 'bg-cosmic-700 text-cosmic-300 hover:bg-cosmic-600'
                      }
                    `}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 檔名設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">檔名設定</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-cosmic-300 mb-2">
                  檔名前綴
                </label>
                <input
                  type="text"
                  value={exportSettings.prefix}
                  onChange={(e) => handleSettingChange('prefix', e.target.value)}
                  placeholder="例如: illustration"
                  className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white placeholder-cosmic-400"
                />
              </div>
              
              {/* 前綴建議 */}
              <div className="flex flex-wrap gap-2">
                {prefixSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSettingChange('prefix', suggestion)}
                    className="px-2 py-1 text-xs bg-cosmic-700 hover:bg-cosmic-600 text-cosmic-300 rounded transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* 檔名預覽 */}
            <div className="bg-cosmic-700/30 rounded p-3">
              <span className="text-sm text-cosmic-400">檔名預覽: </span>
              <span className="text-sm font-mono text-white">
                {exportSettings.prefix}-2024-01-15-001.{exportSettings.format}
              </span>
            </div>
          </div>

          {/* 元數據設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">進階選項</h3>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={exportSettings.includeMetadata}
                onChange={(e) => handleSettingChange('includeMetadata', e.target.checked)}
                className="mt-1 text-gold-500"
              />
              <div>
                <span className="text-white">包含生成參數</span>
                <p className="text-sm text-cosmic-400 mt-1">
                  在圖像中嵌入提示詞、模型參數等元數據信息
                </p>
              </div>
            </label>
          </div>

          {/* 導出進度（當正在導出時） */}
          {isExporting && exportTask && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">正在導出...</span>
                <span className="text-blue-400">{exportProgress}%</span>
              </div>
              <div className="w-full bg-cosmic-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-sm text-cosmic-400 mt-2">
                已處理 {exportTask.exportedFiles.length} / {exportTask.imageIds.length} 張圖像
              </p>
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-cosmic-700 bg-cosmic-800/50">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-4 py-2 text-cosmic-300 hover:text-white transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedImageIds.length === 0}
            className="px-6 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-gold-400 text-white rounded-lg transition-colors"
          >
            {isExporting ? `導出中... (${exportProgress}%)` : `開始導出 ${selectedImageIds.length} 張圖像`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportSettingsPanel;