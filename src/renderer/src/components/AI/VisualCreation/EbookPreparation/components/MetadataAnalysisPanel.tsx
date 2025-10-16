import React, { useMemo } from 'react';
import { IllustrationHistoryItem } from '../../../../../types/illustration';

interface MetadataAnalysisPanelProps {
  selectedImages: IllustrationHistoryItem[];
}

interface ImageAnalysis {
  id: string;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
  resolution: 'low' | 'medium' | 'high' | 'ultra';
  totalPixels: number;
  fileEfficiency: number; // KB per megapixel
  ebookSuitability: {
    cover: number;      // 0-100 適合度評分
    inline: number;     // 內頁插圖適合度
    portrait: number;   // 人物肖像適合度
    scene: number;      // 場景圖適合度
  };
  recommendations: string[];
}

interface MetadataStats {
  totalImages: number;
  averageResolution: number;
  fileStats: {
    totalSize: number;
    averageSize: number;
    largestFile: number;
    smallestFile: number;
  };
  orientationDistribution: {
    portrait: number;
    landscape: number;
    square: number;
  };
  qualityDistribution: {
    low: number;
    medium: number;
    high: number;
    ultra: number;
  };
}

const MetadataAnalysisPanel: React.FC<MetadataAnalysisPanelProps> = ({
  selectedImages
}) => {
  // 分析每張圖片的元數據
  const imageAnalyses = useMemo((): ImageAnalysis[] => {
    return selectedImages.map(image => {
      const width = image.width || 0;
      const height = image.height || 0;
      const fileSize = image.file_size_bytes || 0;

      // 計算基本指標
      const aspectRatio = width > 0 && height > 0 ? width / height : 1;
      const totalPixels = width * height;
      const megapixels = totalPixels / 1000000;
      const fileSizeKB = fileSize / 1024;
      const fileEfficiency = megapixels > 0 ? fileSizeKB / megapixels : 0;

      // 判定方向
      let orientation: 'portrait' | 'landscape' | 'square' = 'square';
      if (aspectRatio > 1.1) orientation = 'landscape';
      else if (aspectRatio < 0.9) orientation = 'portrait';

      // 判定解析度等級
      let resolution: 'low' | 'medium' | 'high' | 'ultra' = 'low';
      if (totalPixels >= 4000000) resolution = 'ultra';      // 4MP+
      else if (totalPixels >= 2000000) resolution = 'high';  // 2MP+
      else if (totalPixels >= 800000) resolution = 'medium'; // 0.8MP+

      // 電子書適用性評估
      const ebookSuitability = {
        // 封面適合度：偏好直向、高解析度
        cover: Math.min(100,
          (orientation === 'portrait' ? 40 : orientation === 'square' ? 20 : 10) +
          (resolution === 'ultra' ? 30 : resolution === 'high' ? 20 : resolution === 'medium' ? 10 : 0) +
          (aspectRatio >= 0.6 && aspectRatio <= 0.8 ? 30 : 10)
        ),

        // 內頁插圖：中等解析度即可，各方向都可
        inline: Math.min(100,
          (resolution === 'medium' ? 35 : resolution === 'high' ? 30 : resolution === 'ultra' ? 25 : 15) +
          (fileEfficiency < 200 ? 25 : fileEfficiency < 400 ? 15 : 5) + // 檔案效率
          30 // 基礎分
        ),

        // 人物肖像：偏好直向或正方形
        portrait: Math.min(100,
          (orientation === 'portrait' ? 35 : orientation === 'square' ? 25 : 10) +
          (resolution === 'high' ? 25 : resolution === 'medium' ? 20 : resolution === 'ultra' ? 20 : 10) +
          (aspectRatio >= 0.7 && aspectRatio <= 1.3 ? 25 : 10) +
          15 // 基礎分
        ),

        // 場景圖：偏好橫向、中高解析度
        scene: Math.min(100,
          (orientation === 'landscape' ? 35 : orientation === 'square' ? 20 : 15) +
          (resolution === 'high' ? 25 : resolution === 'ultra' ? 20 : resolution === 'medium' ? 15 : 5) +
          (aspectRatio >= 1.3 && aspectRatio <= 2.0 ? 25 : 10) +
          15 // 基礎分
        )
      };

      // 生成建議
      const recommendations: string[] = [];

      if (resolution === 'low') {
        recommendations.push('⚠️ 解析度較低，建議僅用於縮圖或小尺寸顯示');
      }

      if (fileEfficiency > 500) {
        recommendations.push('📦 檔案較大，建議壓縮以優化載入速度');
      }

      const bestUse = Object.entries(ebookSuitability).reduce((a, b) =>
        ebookSuitability[a[0] as keyof typeof ebookSuitability] > b[1] ? a : b
      );

      if (bestUse[1] >= 70) {
        const useNames = { cover: '封面', inline: '內頁插圖', portrait: '人物肖像', scene: '場景圖' };
        recommendations.push(`✨ 最適合用作${useNames[bestUse[0] as keyof typeof useNames]} (適合度: ${bestUse[1]}%)`);
      }

      return {
        id: image.id,
        aspectRatio,
        orientation,
        resolution,
        totalPixels,
        fileEfficiency,
        ebookSuitability,
        recommendations
      };
    });
  }, [selectedImages]);

  // 計算整體統計
  const stats = useMemo((): MetadataStats => {
    const validImages = selectedImages.filter(img => img.width && img.height && img.file_size_bytes);

    if (validImages.length === 0) {
      return {
        totalImages: 0,
        averageResolution: 0,
        fileStats: { totalSize: 0, averageSize: 0, largestFile: 0, smallestFile: 0 },
        orientationDistribution: { portrait: 0, landscape: 0, square: 0 },
        qualityDistribution: { low: 0, medium: 0, high: 0, ultra: 0 }
      };
    }

    const fileSizes = validImages.map(img => img.file_size_bytes || 0);
    const resolutions = validImages.map(img => (img.width || 0) * (img.height || 0));

    return {
      totalImages: validImages.length,
      averageResolution: resolutions.reduce((a, b) => a + b, 0) / resolutions.length,
      fileStats: {
        totalSize: fileSizes.reduce((a, b) => a + b, 0),
        averageSize: fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length,
        largestFile: Math.max(...fileSizes),
        smallestFile: Math.min(...fileSizes)
      },
      orientationDistribution: {
        portrait: imageAnalyses.filter(a => a.orientation === 'portrait').length,
        landscape: imageAnalyses.filter(a => a.orientation === 'landscape').length,
        square: imageAnalyses.filter(a => a.orientation === 'square').length
      },
      qualityDistribution: {
        low: imageAnalyses.filter(a => a.resolution === 'low').length,
        medium: imageAnalyses.filter(a => a.resolution === 'medium').length,
        high: imageAnalyses.filter(a => a.resolution === 'high').length,
        ultra: imageAnalyses.filter(a => a.resolution === 'ultra').length
      }
    };
  }, [selectedImages, imageAnalyses]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatPixels = (pixels: number): string => {
    if (pixels >= 1000000) {
      return (pixels / 1000000).toFixed(1) + 'MP';
    } else if (pixels >= 1000) {
      return (pixels / 1000).toFixed(0) + 'K';
    }
    return pixels.toString();
  };

  if (selectedImages.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-text-secondary/80">請選擇圖片以查看元數據分析</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 整體統計 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <h4 className="text-base font-medium text-text-secondary/20 mb-4 flex items-center">
          <span className="text-xl mr-2">📊</span>
          整體統計分析
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">總圖片數</div>
            <div className="text-lg font-semibold text-text-secondary/20">{stats.totalImages}</div>
          </div>
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">平均解析度</div>
            <div className="text-lg font-semibold text-text-secondary/20">{formatPixels(stats.averageResolution)}</div>
          </div>
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">總檔案大小</div>
            <div className="text-lg font-semibold text-text-secondary/20">{formatFileSize(stats.fileStats.totalSize)}</div>
          </div>
          <div className="bg-bg-light/40 p-3 rounded">
            <div className="text-text-secondary/80">平均檔案大小</div>
            <div className="text-lg font-semibold text-text-secondary/20">{formatFileSize(stats.fileStats.averageSize)}</div>
          </div>
        </div>

        {/* 分佈圖表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 方向分佈 */}
          <div className="bg-bg-light/40 p-3 rounded">
            <h5 className="text-sm font-medium text-text-secondary/40 mb-3">圖片方向分佈</h5>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary/80">直向 📱</span>
                <span className="text-text-secondary/40">{stats.orientationDistribution.portrait}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary/80">橫向 🖥️</span>
                <span className="text-text-secondary/40">{stats.orientationDistribution.landscape}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary/80">正方 ⏹️</span>
                <span className="text-text-secondary/40">{stats.orientationDistribution.square}</span>
              </div>
            </div>
          </div>

          {/* 品質分佈 */}
          <div className="bg-bg-light/40 p-3 rounded">
            <h5 className="text-sm font-medium text-text-secondary/40 mb-3">解析度品質分佈</h5>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-red-400">低品質 🔴</span>
                <span className="text-text-secondary/40">{stats.qualityDistribution.low}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-400">中等品質 🟡</span>
                <span className="text-text-secondary/40">{stats.qualityDistribution.medium}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-400">高品質 🟢</span>
                <span className="text-text-secondary/40">{stats.qualityDistribution.high}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-warm-gold">超高品質 🔵</span>
                <span className="text-text-secondary/40">{stats.qualityDistribution.ultra}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 個別圖片分析 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <h4 className="text-base font-medium text-text-secondary/20 mb-4 flex items-center">
          <span className="text-xl mr-2">🔍</span>
          個別圖片分析
        </h4>

        <div className="max-h-96 overflow-y-auto space-y-3">
          {imageAnalyses.map((analysis, index) => {
            const image = selectedImages.find(img => img.id === analysis.id);
            if (!image) return null;

            const fileName = image.local_file_path?.split('/').pop() ||
                           image.image_path?.split('/').pop() ||
                           `圖片-${index + 1}`;

            return (
              <div key={analysis.id} className="bg-bg-light/40 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-text-secondary/40 truncate flex-1 mr-2">{fileName}</h5>
                  <div className="flex space-x-1 text-xs">
                    <span className={`px-2 py-1 rounded ${
                      analysis.resolution === 'ultra' ? 'bg-warm-gold text-white' :
                      analysis.resolution === 'high' ? 'bg-green-600 text-white' :
                      analysis.resolution === 'medium' ? 'bg-yellow-600 text-black' :
                      'bg-red-600 text-white'
                    }`}>
                      {analysis.resolution.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                  <div>
                    <div className="text-text-secondary/80">尺寸</div>
                    <div className="text-text-secondary/40">{image.width}×{image.height}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary/80">比例</div>
                    <div className="text-text-secondary/40">{analysis.aspectRatio.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary/80">檔案大小</div>
                    <div className="text-text-secondary/40">{formatFileSize(image.file_size_bytes || 0)}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary/80">效率</div>
                    <div className="text-text-secondary/40">{analysis.fileEfficiency.toFixed(0)} KB/MP</div>
                  </div>
                </div>

                {/* 電子書適用性 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                  <div className="text-center">
                    <div className="text-text-secondary/80">封面</div>
                    <div className={`font-semibold ${
                      analysis.ebookSuitability.cover >= 70 ? 'text-green-400' :
                      analysis.ebookSuitability.cover >= 40 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {analysis.ebookSuitability.cover}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-text-secondary/80">內頁</div>
                    <div className={`font-semibold ${
                      analysis.ebookSuitability.inline >= 70 ? 'text-green-400' :
                      analysis.ebookSuitability.inline >= 40 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {analysis.ebookSuitability.inline}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-text-secondary/80">肖像</div>
                    <div className={`font-semibold ${
                      analysis.ebookSuitability.portrait >= 70 ? 'text-green-400' :
                      analysis.ebookSuitability.portrait >= 40 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {analysis.ebookSuitability.portrait}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-text-secondary/80">場景</div>
                    <div className={`font-semibold ${
                      analysis.ebookSuitability.scene >= 70 ? 'text-green-400' :
                      analysis.ebookSuitability.scene >= 40 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {analysis.ebookSuitability.scene}%
                    </div>
                  </div>
                </div>

                {/* 建議 */}
                {analysis.recommendations.length > 0 && (
                  <div className="border-t border-warm-gold/10 pt-2">
                    <div className="text-text-secondary/80 text-xs mb-1">建議：</div>
                    <div className="space-y-1">
                      {analysis.recommendations.map((rec, i) => (
                        <div key={i} className="text-xs text-text-secondary">{rec}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MetadataAnalysisPanel;