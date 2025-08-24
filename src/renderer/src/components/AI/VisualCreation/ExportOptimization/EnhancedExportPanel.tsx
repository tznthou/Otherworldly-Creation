import React, { useState, useEffect, useMemo } from 'react';
import { EbookExportConfig } from '../../../../types/imageMetadata';
// Note: Using any for now as these types are not defined yet
type EPubGenerationOptions = any;
type PDFGenerationOptions = any;

interface EnhancedExportPanelProps {
  _projectId: string;
  selectedImageIds?: string[];
  onClose: () => void;
  onExportEPUB: (options: EPubGenerationOptions & { imageConfig: EbookExportConfig }) => void;
  onExportPDF: (options: PDFGenerationOptions & { imageConfig: EbookExportConfig }) => void;
  className?: string;
}

type ExportFormat = 'epub' | 'pdf' | 'both';
type QualityPreset = 'web' | 'print' | 'archive' | 'custom';

/**
 * 增強的導出面板 - 整合EPUB/PDF導出與圖片優化
 */
export const EnhancedExportPanel: React.FC<EnhancedExportPanelProps> = ({
  _projectId,
  selectedImageIds = [],
  onClose,
  onExportEPUB,
  onExportPDF,
  className = ''
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('epub');
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('web');
  const [selectedTab, setSelectedTab] = useState<'format' | 'images' | 'advanced' | 'preview'>('format');

  // EPUB 配置
  const [epubOptions, setEpubOptions] = useState<EPubGenerationOptions>({
    includeChapterNumbers: true,
    includeTOC: true,
    includeMetadata: true,
    customCSS: '',
    fontSize: 'medium',
    fontFamily: 'default',
    includeImages: true,
    imageQuality: 85,
    compressImages: true
  });

  // PDF 配置
  const [pdfOptions, setPdfOptions] = useState<PDFGenerationOptions>({
    pageSize: 'A4',
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    includeHeader: true,
    includeFooter: true,
    headerText: '',
    footerText: '',
    fontSize: 12,
    fontFamily: 'default',
    includeImages: true,
    imageQuality: 90,
    generateBookmarks: true,
    includeTOC: true
  });

  // 圖片配置
  const [imageConfig, setImageConfig] = useState<EbookExportConfig>({
    includeImages: true,
    imageQuality: 85,
    maxImageWidth: 1200,
    maxImageHeight: 900,
    compressionLevel: 'medium',
    includeImageMetadata: true,
    includeAltText: true,
    includeDescriptions: true,
    imagePlacementRules: {
      chapter_header: { enabled: true, maxSize: 800, quality: 90 },
      chapter_end: { enabled: true, maxSize: 600, quality: 85 },
      inline: { enabled: true, maxSize: 1000, quality: 80 },
      full_page: { enabled: true, maxSize: 1200, quality: 95 },
      cover: { enabled: true, maxSize: 1600, quality: 100 },
      back_cover: { enabled: true, maxSize: 1600, quality: 100 },
      character_portrait: { enabled: true, maxSize: 800, quality: 90 },
      scene_illustration: { enabled: true, maxSize: 1200, quality: 90 },
      map: { enabled: true, maxSize: 1500, quality: 95 },
      diagram: { enabled: true, maxSize: 1000, quality: 90 }
    }
  });

  const [estimatedSize, setEstimatedSize] = useState({ epub: 0, pdf: 0, images: 0 });

  // 品質預設配置
  const qualityPresets = {
    web: {
      name: 'Web 優化',
      description: '適合線上閱讀，檔案較小',
      imageQuality: 75,
      maxWidth: 1000,
      maxHeight: 750,
      compression: 'high' as const
    },
    print: {
      name: '印刷品質',
      description: '適合印刷輸出，高品質',
      imageQuality: 95,
      maxWidth: 1600,
      maxHeight: 1200,
      compression: 'low' as const
    },
    archive: {
      name: '封存品質',
      description: '最高品質，長期保存',
      imageQuality: 100,
      maxWidth: 2000,
      maxHeight: 1500,
      compression: 'none' as const
    },
    custom: {
      name: '自訂設定',
      description: '手動設定所有參數',
      imageQuality: imageConfig.imageQuality,
      maxWidth: imageConfig.maxImageWidth,
      maxHeight: imageConfig.maxImageHeight,
      compression: imageConfig.compressionLevel
    }
  };

  // 當品質預設改變時更新配置
  useEffect(() => {
    if (qualityPreset !== 'custom') {
      const preset = qualityPresets[qualityPreset];
      setImageConfig(prev => ({
        ...prev,
        imageQuality: preset.imageQuality,
        maxImageWidth: preset.maxWidth,
        maxImageHeight: preset.maxHeight,
        compressionLevel: preset.compression
      }));
      
      // 同步更新 EPUB 和 PDF 的圖片品質
      setEpubOptions((prev: any) => ({ ...prev, imageQuality: preset.imageQuality }));
      setPdfOptions((prev: any) => ({ ...prev, imageQuality: preset.imageQuality }));
    }
  }, [qualityPreset]);

  // 計算預估檔案大小
  const calculateEstimatedSize = useMemo(() => {
    // 簡化的大小估算邏輯
    const baseTextSize = 2; // MB
    const imageCount = selectedImageIds.length || 10; // 假設有10張圖片
    const avgImageSize = (imageConfig.imageQuality / 100) * 0.5; // MB per image
    
    const imagesSize = imageCount * avgImageSize;
    const epubSize = baseTextSize + imagesSize * 0.8; // EPUB壓縮更好
    const pdfSize = baseTextSize + imagesSize * 1.2; // PDF通常較大
    
    return { epub: epubSize, pdf: pdfSize, images: imagesSize };
  }, [imageConfig, selectedImageIds.length]);

  useEffect(() => {
    setEstimatedSize(calculateEstimatedSize);
  }, [calculateEstimatedSize]);

  // 處理導出
  const handleExport = async () => {
    try {
      const combinedImageConfig = {
        ...imageConfig,
        includeImages: epubOptions.includeImages || pdfOptions.includeImages
      };

      if (exportFormat === 'epub' || exportFormat === 'both') {
        await onExportEPUB({ ...epubOptions, imageConfig: combinedImageConfig });
      }
      
      if (exportFormat === 'pdf' || exportFormat === 'both') {
        await onExportPDF({ ...pdfOptions, imageConfig: combinedImageConfig });
      }

      onClose();
    } catch (error) {
      console.error('導出失敗:', error);
      alert('導出失敗，請稍後再試');
    }
  };

  return (
    <div className={`bg-cosmic-800/95 border border-cosmic-700 rounded-lg shadow-xl ${className}`}>
      {/* 標題列 */}
      <div className="flex items-center justify-between p-4 border-b border-cosmic-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gold-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0-6V4m0 6l4.5 4.5M12 10L7.5 5.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-cosmic-100">增強導出系統</h3>
            <p className="text-sm text-cosmic-400">
              專業的EPUB/PDF導出，整合圖片優化和版面控制
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
          { id: 'format', name: '格式設定', icon: '📄' },
          { id: 'images', name: '圖片優化', icon: '🖼️' },
          { id: 'advanced', name: '進階選項', icon: '⚙️' },
          { id: 'preview', name: '預覽摘要', icon: '👁️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as 'format' | 'images' | 'advanced' | 'preview')}
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

      <div className="p-4 max-h-96 overflow-y-auto">
        {/* 格式設定頁籤 */}
        {selectedTab === 'format' && (
          <div className="space-y-6">
            {/* 導出格式選擇 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-cosmic-200">導出格式</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'epub', name: 'EPUB 電子書', description: '通用電子書格式，適合各種閱讀器', icon: '📱' },
                  { id: 'pdf', name: 'PDF 文件', description: '固定版面，適合印刷和精確顯示', icon: '📄' },
                  { id: 'both', name: '雙格式導出', description: '同時生成EPUB和PDF兩種格式', icon: '📚' }
                ].map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setExportFormat(format.id as ExportFormat)}
                    className={`p-4 text-left rounded-lg border transition-all ${
                      exportFormat === format.id
                        ? 'border-gold-500 bg-gold-600/10 ring-1 ring-gold-500/50'
                        : 'border-cosmic-600 bg-cosmic-800/50 hover:border-cosmic-500 hover:bg-cosmic-700/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{format.icon}</span>
                      <h5 className="font-medium text-cosmic-200">{format.name}</h5>
                    </div>
                    <p className="text-sm text-cosmic-400">{format.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 品質預設 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-cosmic-200">品質預設</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(qualityPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setQualityPreset(key as QualityPreset)}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      qualityPreset === key
                        ? 'border-purple-500 bg-purple-600/10 ring-1 ring-purple-500/50'
                        : 'border-cosmic-600 bg-cosmic-800/50 hover:border-cosmic-500'
                    }`}
                  >
                    <h6 className="font-medium text-cosmic-200 mb-1">{preset.name}</h6>
                    <p className="text-xs text-cosmic-400 mb-2">{preset.description}</p>
                    <div className="text-xs text-purple-400">
                      {preset.imageQuality}% • {preset.maxWidth}x{preset.maxHeight}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 圖片優化頁籤 */}
        {selectedTab === 'images' && (
          <div className="space-y-6">
            {/* 圖片品質控制 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-cosmic-200">圖片品質控制</h4>
              <div className="bg-cosmic-800/50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">
                    整體圖片品質: {imageConfig.imageQuality}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={imageConfig.imageQuality}
                    onChange={(e) => {
                      const quality = parseInt(e.target.value);
                      setImageConfig(prev => ({ ...prev, imageQuality: quality }));
                      if (qualityPreset !== 'custom') setQualityPreset('custom');
                    }}
                    className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                  />
                  <div className="flex justify-between text-xs text-cosmic-400 mt-1">
                    <span>檔案較小</span>
                    <span>平衡</span>
                    <span>最高品質</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      最大寬度: {imageConfig.maxImageWidth}px
                    </label>
                    <input
                      type="range"
                      min="600"
                      max="2400"
                      step="100"
                      value={imageConfig.maxImageWidth}
                      onChange={(e) => {
                        setImageConfig(prev => ({ ...prev, maxImageWidth: parseInt(e.target.value) }));
                        if (qualityPreset !== 'custom') setQualityPreset('custom');
                      }}
                      className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      最大高度: {imageConfig.maxImageHeight}px
                    </label>
                    <input
                      type="range"
                      min="400"
                      max="1800"
                      step="100"
                      value={imageConfig.maxImageHeight}
                      onChange={(e) => {
                        setImageConfig(prev => ({ ...prev, maxImageHeight: parseInt(e.target.value) }));
                        if (qualityPreset !== 'custom') setQualityPreset('custom');
                      }}
                      className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cosmic-300 mb-2">壓縮等級</label>
                  <select
                    value={imageConfig.compressionLevel}
                    onChange={(e) => {
                      setImageConfig(prev => ({ ...prev, compressionLevel: e.target.value as any }));
                      if (qualityPreset !== 'custom') setQualityPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 text-cosmic-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="none">無壓縮</option>
                    <option value="low">低壓縮</option>
                    <option value="medium">中等壓縮</option>
                    <option value="high">高壓縮</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 圖片包含選項 */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-cosmic-200">包含選項</h4>
              <div className="bg-cosmic-800/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={imageConfig.includeImageMetadata}
                      onChange={(e) => setImageConfig(prev => ({ ...prev, includeImageMetadata: e.target.checked }))}
                      className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-cosmic-300">包含圖片元數據</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={imageConfig.includeAltText}
                      onChange={(e) => setImageConfig(prev => ({ ...prev, includeAltText: e.target.checked }))}
                      className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-cosmic-300">包含替代文字</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={imageConfig.includeDescriptions}
                      onChange={(e) => setImageConfig(prev => ({ ...prev, includeDescriptions: e.target.checked }))}
                      className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-cosmic-300">包含圖片描述</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 進階選項頁籤 */}
        {selectedTab === 'advanced' && (
          <div className="space-y-6">
            {(exportFormat === 'epub' || exportFormat === 'both') && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-cosmic-200">EPUB 進階設定</h4>
                <div className="bg-cosmic-800/50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={epubOptions.includeChapterNumbers}
                        onChange={(e) => setEpubOptions((prev: any) => ({ ...prev, includeChapterNumbers: e.target.checked }))}
                        className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                      />
                      <span className="text-sm text-cosmic-300">包含章節編號</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={epubOptions.includeTOC}
                        onChange={(e) => setEpubOptions((prev: any) => ({ ...prev, includeTOC: e.target.checked }))}
                        className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                      />
                      <span className="text-sm text-cosmic-300">包含目錄</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">字體大小</label>
                    <select
                      value={epubOptions.fontSize}
                      onChange={(e) => setEpubOptions((prev: any) => ({ ...prev, fontSize: e.target.value }))}
                      className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 text-cosmic-100 rounded-lg"
                    >
                      <option value="small">小</option>
                      <option value="medium">中</option>
                      <option value="large">大</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(exportFormat === 'pdf' || exportFormat === 'both') && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-cosmic-200">PDF 進階設定</h4>
                <div className="bg-cosmic-800/50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">頁面大小</label>
                    <select
                      value={pdfOptions.pageSize}
                      onChange={(e) => setPdfOptions((prev: any) => ({ ...prev, pageSize: e.target.value }))}
                      className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 text-cosmic-100 rounded-lg"
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeHeader}
                        onChange={(e) => setPdfOptions((prev: any) => ({ ...prev, includeHeader: e.target.checked }))}
                        className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                      />
                      <span className="text-sm text-cosmic-300">包含頁首</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={pdfOptions.includeFooter}
                        onChange={(e) => setPdfOptions((prev: any) => ({ ...prev, includeFooter: e.target.checked }))}
                        className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                      />
                      <span className="text-sm text-cosmic-300">包含頁尾</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 預覽摘要頁籤 */}
        {selectedTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-cosmic-800/50 rounded-lg p-4">
              <h4 className="text-lg font-medium text-cosmic-200 mb-4">導出摘要</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-cosmic-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-gold-400">{exportFormat.toUpperCase()}</div>
                  <div className="text-sm text-cosmic-400">導出格式</div>
                </div>
                <div className="text-center p-3 bg-cosmic-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{imageConfig.imageQuality}%</div>
                  <div className="text-sm text-cosmic-400">圖片品質</div>
                </div>
                <div className="text-center p-3 bg-cosmic-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {exportFormat === 'both' 
                      ? `${(estimatedSize.epub + estimatedSize.pdf).toFixed(1)}` 
                      : `${estimatedSize[exportFormat === 'epub' ? 'epub' : 'pdf'].toFixed(1)}`} MB
                  </div>
                  <div className="text-sm text-cosmic-400">預估大小</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cosmic-300">圖片最大尺寸:</span>
                  <span className="text-cosmic-100">{imageConfig.maxImageWidth} × {imageConfig.maxImageHeight}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cosmic-300">壓縮等級:</span>
                  <span className="text-cosmic-100">{imageConfig.compressionLevel}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cosmic-300">包含元數據:</span>
                  <span className={imageConfig.includeImageMetadata ? 'text-green-400' : 'text-red-400'}>
                    {imageConfig.includeImageMetadata ? '是' : '否'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cosmic-300">包含替代文字:</span>
                  <span className={imageConfig.includeAltText ? 'text-green-400' : 'text-red-400'}>
                    {imageConfig.includeAltText ? '是' : '否'}
                  </span>
                </div>
              </div>
            </div>

            {/* 檔案大小詳細分析 */}
            <div className="bg-cosmic-800/50 rounded-lg p-4">
              <h5 className="font-medium text-cosmic-200 mb-3">檔案大小分析</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cosmic-300">圖片總大小:</span>
                  <span className="text-cosmic-100">{estimatedSize.images.toFixed(1)} MB</span>
                </div>
                {(exportFormat === 'epub' || exportFormat === 'both') && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cosmic-300">EPUB 檔案:</span>
                    <span className="text-cosmic-100">{estimatedSize.epub.toFixed(1)} MB</span>
                  </div>
                )}
                {(exportFormat === 'pdf' || exportFormat === 'both') && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cosmic-300">PDF 檔案:</span>
                    <span className="text-cosmic-100">{estimatedSize.pdf.toFixed(1)} MB</span>
                  </div>
                )}
                {exportFormat === 'both' && (
                  <div className="flex items-center justify-between text-sm font-medium border-t border-cosmic-700 pt-2">
                    <span className="text-gold-300">總計:</span>
                    <span className="text-gold-300">{(estimatedSize.epub + estimatedSize.pdf).toFixed(1)} MB</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作區 */}
      <div className="border-t border-cosmic-700 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-cosmic-400">
            {exportFormat === 'both' ? '將生成兩個檔案' : `將生成 ${exportFormat.toUpperCase()} 檔案`} • 
            預估大小: {exportFormat === 'both' 
              ? `${(estimatedSize.epub + estimatedSize.pdf).toFixed(1)} MB` 
              : `${estimatedSize[exportFormat === 'epub' ? 'epub' : 'pdf'].toFixed(1)} MB`
            }
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-cosmic-300 hover:text-cosmic-100 hover:bg-cosmic-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              className="px-6 py-2 bg-gold-600 text-white hover:bg-gold-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0-6V4m0 6l4.5 4.5M12 10L7.5 5.5" />
              </svg>
              <span>開始導出</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExportPanel;