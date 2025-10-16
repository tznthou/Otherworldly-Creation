import React, { useState } from 'react';
import { SafeImage } from '../../../UI/SafeImage';
import { TempImageData } from '../../../../store/slices/visualCreationSlice';

interface TempImageVersionCardProps {
  tempImage: TempImageData;
  isPendingVersion: boolean;
  isLastGenerated: boolean;
  onCreateVersion: (imageId: string) => Promise<void>;
  onCreateVariant: (imageId: string) => Promise<void>;
  onViewVersionPanel: (imageId: string) => void;
  className?: string;
}

/**
 * 臨時圖片版本管理卡片組件
 * 提供版本保存、變體生成等操作
 */
const TempImageVersionCard: React.FC<TempImageVersionCardProps> = ({
  tempImage,
  isPendingVersion,
  isLastGenerated,
  onCreateVersion,
  onCreateVariant,
  onViewVersionPanel,
  className = ''
}) => {
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);

  // 處理創建版本
  const handleCreateVersion = async () => {
    setIsCreatingVersion(true);
    try {
      await onCreateVersion(tempImage.id);
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // 處理創建變體
  const handleCreateVariant = async () => {
    setIsCreatingVariant(true);
    try {
      await onCreateVariant(tempImage.id);
    } finally {
      setIsCreatingVariant(false);
    }
  };

  return (
    <div className={`bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden ${className}`}>
      {/* 圖片區域 */}
      <div className="relative aspect-square bg-cosmic-900">
        <SafeImage
          imageUrl={tempImage.image_url}
          localFilePath={tempImage.temp_path}
          alt={tempImage.prompt}
          className="w-full h-full object-cover"
          fallbackIcon="🎨"
        />
        
        {/* 狀態徽章 */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isLastGenerated && (
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
              ✨ 最新
            </span>
          )}
          
          {isPendingVersion && (
            <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded">
              ⏳ 待創建版本
            </span>
          )}
          
          {tempImage.is_free && (
            <span className="bg-warm-gold text-white text-xs px-2 py-1 rounded">
              🆓 免費
            </span>
          )}
        </div>

        {/* 參數信息 */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {tempImage.parameters.width}×{tempImage.parameters.height} • {tempImage.parameters.model}
        </div>
      </div>

      {/* 信息區域 */}
      <div className="p-3">
        {/* 提示詞預覽 */}
        <div className="mb-3">
          <h4 className="text-sm font-medium text-cosmic-200 mb-1">提示詞</h4>
          <p className="text-xs text-cosmic-400 line-clamp-2" title={tempImage.prompt}>
            {tempImage.prompt}
          </p>
        </div>

        {/* 技術參數 */}
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-cosmic-400">提供商:</span>
            <span className="text-cosmic-200 ml-1">{tempImage.provider}</span>
          </div>
          <div>
            <span className="text-cosmic-400">模型:</span>
            <span className="text-cosmic-200 ml-1">{tempImage.parameters.model}</span>
          </div>
          <div>
            <span className="text-cosmic-400">尺寸:</span>
            <span className="text-cosmic-200 ml-1">
              {tempImage.parameters.width}×{tempImage.parameters.height}
            </span>
          </div>
          <div>
            <span className="text-cosmic-400">生成時間:</span>
            <span className="text-cosmic-200 ml-1">
              {(tempImage.generation_time_ms / 1000).toFixed(1)}s
            </span>
          </div>
          {tempImage.parameters.seed && (
            <div className="col-span-2">
              <span className="text-cosmic-400">種子:</span>
              <span className="text-cosmic-200 ml-1">{tempImage.parameters.seed}</span>
            </div>
          )}
          {tempImage.parameters.style && (
            <div className="col-span-2">
              <span className="text-cosmic-400">風格:</span>
              <span className="text-cosmic-200 ml-1">{tempImage.parameters.style}</span>
            </div>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="space-y-2">
          {/* 版本保存按鈕 */}
          <button
            onClick={handleCreateVersion}
            disabled={isCreatingVersion}
            className={`w-full px-3 py-2 text-sm rounded transition-colors ${
              isPendingVersion
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:bg-cosmic-600 disabled:cursor-not-allowed`}
          >
            {isCreatingVersion ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                創建中...
              </div>
            ) : isPendingVersion ? (
              '💾 保存為正式版本'
            ) : (
              '💾 保存為版本'
            )}
          </button>

          {/* 操作按鈕組 */}
          <div className="grid grid-cols-2 gap-2">
            {/* 生成變體按鈕 */}
            <button
              onClick={handleCreateVariant}
              disabled={isCreatingVariant}
              className="px-3 py-2 bg-clay-orange hover:bg-clay-orange disabled:bg-cosmic-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
            >
              {isCreatingVariant ? (
                <div className="flex items-center justify-center gap-1">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">生成中</span>
                </div>
              ) : (
                '🎯 生成變體'
              )}
            </button>

            {/* 版本管理按鈕 */}
            <button
              onClick={() => onViewVersionPanel(tempImage.id)}
              className="px-3 py-2 bg-warm-gold hover:bg-warm-gold text-white text-sm rounded transition-colors"
            >
              📝 版本管理
            </button>
          </div>
        </div>

        {/* 額外信息 */}
        {isPendingVersion && (
          <div className="mt-2 p-2 bg-orange-900/30 border border-orange-700/50 rounded text-xs">
            <div className="text-orange-300">
              💡 此圖片已自動創建為草稿版本，點擊「保存為正式版本」可升級為正式版本。
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TempImageVersionCard;