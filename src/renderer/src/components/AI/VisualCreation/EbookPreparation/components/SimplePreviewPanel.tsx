import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store/store';
import { IllustrationHistoryItem } from '../../../../../types/illustration';
import { EbookImagePosition } from '../../../../../types/ebookPreparation';
import { SafeImage } from '../../../../UI/SafeImage';
import { createLogger } from '../../../../../utils/logger';

const _log = createLogger('SimplePreviewPanel');

interface SimplePreviewPanelProps {
  selectedImages: IllustrationHistoryItem[];
  projectId: string;
}

type DeviceType = 'phone' | 'tablet' | 'kindle' | 'desktop';

// 裝置尺寸配置
const DEVICE_DIMENSIONS = {
  phone: { width: 375, height: 667, name: 'Phone', icon: '📱' },
  tablet: { width: 768, height: 1024, name: 'Tablet', icon: '📱' },
  kindle: { width: 600, height: 800, name: 'Kindle', icon: '📚' },
  desktop: { width: 1024, height: 768, name: 'Desktop', icon: '🖥️' }
};

// 圖片位置樣式配置
const POSITION_STYLES = {
  [EbookImagePosition.ChapterHeader]: 'w-full mb-6',
  [EbookImagePosition.ChapterEnd]: 'w-full mt-6',
  [EbookImagePosition.InlineText]: 'w-2/3 mx-auto my-4',
  [EbookImagePosition.FullPage]: 'w-full h-auto',
  [EbookImagePosition.SceneIllustration]: 'w-3/4 mx-auto my-6',
  [EbookImagePosition.CharacterPortrait]: 'w-1/2 mx-auto my-4',
  [EbookImagePosition.Map]: 'w-full my-6',
  [EbookImagePosition.Cover]: 'w-full h-full object-cover',
  [EbookImagePosition.BackCover]: 'w-full h-full object-cover',
  [EbookImagePosition.Diagram]: 'w-3/4 mx-auto my-4'
};

const SimplePreviewPanel: React.FC<SimplePreviewPanelProps> = ({
  selectedImages,
  projectId
}) => {
  const [deviceType, setDeviceType] = useState<DeviceType>('tablet');
  const [showGrid, setShowGrid] = useState(true);
  const [showMargins, setShowMargins] = useState(true);
  const [scale, setScale] = useState(0.6);

  const chapters = useSelector((state: RootState) => state.chapters.chapters);
  const ebookPreparation = useSelector((state: RootState) => state.ebookPreparation);

  const projectChapters = useMemo(() => {
    return chapters
      .filter(ch => ch.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }, [chapters, projectId]);

  const chapterConfigurations = useMemo(() => {
    return ebookPreparation.currentConfig?.chapterConfigurations || [];
  }, [ebookPreparation.currentConfig]);

  const deviceDimensions = DEVICE_DIMENSIONS[deviceType];

  const getImageById = (imageId: string) => {
    return selectedImages.find(img => img.id === imageId);
  };

  const getChapterImages = (chapterId: string) => {
    const config = chapterConfigurations.find(c => c.chapterId === chapterId);
    if (!config) return [];

    // 必須先複製再排序：config.images 直接來自 Redux，RTK 的 Immer 預設會凍結
    // state，對凍結陣列呼叫原地排序的 sort() 會丟 TypeError
    return [...config.images]
      .sort((a, b) => a.order - b.order)
      .map(imgConfig => ({
        ...imgConfig,
        image: getImageById(imgConfig.imageId)
      }))
      .filter(item => item.image);
  };

  const renderImageByPosition = (
    image: IllustrationHistoryItem,
    position: EbookImagePosition,
    index: number
  ) => {
    const styleClass = POSITION_STYLES[position] || 'w-2/3 mx-auto my-4';

    return (
      <div key={`${image.id}-${index}`} className={`${styleClass} relative group`}>
        <SafeImage
          imageUrl={image.image_url && image.image_url.startsWith('http') ? image.image_url : undefined}
          localFilePath={image.local_file_path || image.image_path}
          alt={image.original_prompt || 'Image'}
          className="w-full h-auto rounded shadow-md"
          loading="lazy"
          fallbackIcon="🎨"
        />
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {position.replace(/_/g, ' ')}
        </div>
      </div>
    );
  };

  const renderChapter = (chapter: typeof projectChapters[0], chapterIndex: number) => {
    const chapterImages = getChapterImages(chapter.id);

    if (chapterImages.length === 0) {
      return (
        <div key={chapter.id} className="mb-8 p-4 border border-dashed border-gray-300 rounded bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            第 {chapterIndex + 1} 章：{chapter.title}
          </h3>
          <p className="text-sm text-gray-500 italic">尚未配置圖片</p>
        </div>
      );
    }

    const headerImages = chapterImages.filter(img => img.position === EbookImagePosition.ChapterHeader);
    const endImages = chapterImages.filter(img => img.position === EbookImagePosition.ChapterEnd);
    const otherImages = chapterImages.filter(
      img => img.position !== EbookImagePosition.ChapterHeader && img.position !== EbookImagePosition.ChapterEnd
    );

    return (
      <div key={chapter.id} className="mb-8">
        {/* 章節標題 */}
        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-300">
          第 {chapterIndex + 1} 章：{chapter.title}
        </h3>

        {/* 章節開頭圖片 */}
        {headerImages.map((imgConfig, idx) =>
          imgConfig.image ? renderImageByPosition(imgConfig.image, imgConfig.position, idx) : null
        )}

        {/* 正文區域（包含其他位置的圖片） */}
        <div className="my-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {chapter.wordCount ? `字數: ${chapter.wordCount}` : '正文內容...'}
          </p>

          {otherImages.map((imgConfig, idx) =>
            imgConfig.image ? renderImageByPosition(imgConfig.image, imgConfig.position, idx) : null
          )}

          {otherImages.length === 0 && (
            <p className="text-sm text-gray-500 italic">（文中插圖將顯示在這裡）</p>
          )}
        </div>

        {/* 章節結尾圖片 */}
        {endImages.map((imgConfig, idx) =>
          imgConfig.image ? renderImageByPosition(imgConfig.image, imgConfig.position, idx) : null
        )}
      </div>
    );
  };

  const hasAnyConfiguration = chapterConfigurations.length > 0;

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 裝置選擇 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary/40 mb-2">
              裝置類型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DEVICE_DIMENSIONS) as DeviceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setDeviceType(type)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    deviceType === type
                      ? 'bg-warm-gold text-white'
                      : 'bg-bg-light/40 text-text-secondary hover:bg-bg-dark/80'
                  }`}
                >
                  {DEVICE_DIMENSIONS[type].icon} {DEVICE_DIMENSIONS[type].name}
                </button>
              ))}
            </div>
          </div>

          {/* 輔助線選項 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary/40 mb-2">
              輔助選項
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4 text-warm-gold bg-bg-dark/80 border-warm-gold/10 rounded focus:ring-gold-500"
                />
                <span className="text-sm text-text-secondary">顯示網格</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showMargins}
                  onChange={(e) => setShowMargins(e.target.checked)}
                  className="w-4 h-4 text-warm-gold bg-bg-dark/80 border-warm-gold/10 rounded focus:ring-gold-500"
                />
                <span className="text-sm text-text-secondary">顯示邊距</span>
              </label>
            </div>
          </div>

          {/* 縮放控制 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary/40 mb-2">
              縮放比例: {Math.round(scale * 100)}%
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-2 bg-bg-dark/80 rounded-lg appearance-none slider"
            />
            <div className="flex justify-between text-xs text-text-secondary/80 mt-1">
              <span>30%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 預覽資訊 */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-warm-gold/40 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{deviceDimensions.icon}</span>
            <div>
              <h4 className="text-warm-gold font-medium">
                {deviceDimensions.name} 預覽
              </h4>
              <p className="text-warm-gold/80 text-sm">
                {deviceDimensions.width} × {deviceDimensions.height} px
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-warm-gold/80 text-sm">
              已配置 {chapterConfigurations.length} 個章節
            </p>
            <p className="text-warm-gold/80 text-xs">
              共 {selectedImages.length} 張圖片
            </p>
          </div>
        </div>
      </div>

      {/* 預覽容器 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-6">
        <div className="flex justify-center">
          {!hasAnyConfiguration ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-xl font-semibold text-text-secondary/40 mb-2">尚無章節配置</h3>
              <p className="text-text-secondary/80">請先在「章節配置」標籤中配置圖片</p>
            </div>
          ) : (
            <div
              className="relative bg-white shadow-2xl overflow-auto"
              style={{
                width: `${deviceDimensions.width * scale}px`,
                height: `${deviceDimensions.height * scale}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top center'
              }}
            >
              {/* 網格背景 */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(200, 200, 200, 0.2) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(200, 200, 200, 0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                />
              )}

              {/* 邊距指示器 */}
              {showMargins && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-dashed border-blue-300/50" />
                </div>
              )}

              {/* 內容區域 */}
              <div
                className="relative h-full overflow-y-auto p-8"
                style={{
                  fontSize: `${14 * (1 / scale)}px`
                }}
              >
                {projectChapters.map((chapter, index) => renderChapter(chapter, index))}

                {projectChapters.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-gray-500">此專案尚無章節</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 提示資訊 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-text-secondary/80">
            <p className="font-medium mb-1">預覽說明：</p>
            <ul className="space-y-1">
              <li>• 懸停在圖片上可查看圖片位置類型</li>
              <li>• 使用縮放滑桿調整預覽大小</li>
              <li>• 切換不同裝置查看不同尺寸的排版效果</li>
              <li>• 此為簡化預覽，實際電子書效果可能略有差異</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePreviewPanel;
