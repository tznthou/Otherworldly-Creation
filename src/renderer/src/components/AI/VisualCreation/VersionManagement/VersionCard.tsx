import React, { useState, useCallback, useMemo } from 'react';
import { ImageVersion } from '../../../../types/versionManagement';
import { VERSION_MANAGEMENT_CONSTANTS } from './index';

// 版本卡片模式
export type VersionCardMode = 'compact' | 'normal' | 'detailed';

// 版本卡片大小
export type VersionCardSize = 'small' | 'medium' | 'large';

// 版本卡片屬性
export interface VersionCardProps {
  // 核心資料
  version: ImageVersion;
  
  // 顯示配置
  mode?: VersionCardMode;
  size?: VersionCardSize;
  showActions?: boolean;
  showMetadata?: boolean;
  showTags?: boolean;
  
  // 狀態
  isSelected?: boolean;
  isComparing?: boolean;
  isLoading?: boolean;
  
  // 事件回調
  onSelect?: (version: ImageVersion) => void;
  onEdit?: (version: ImageVersion) => void;
  onDelete?: (version: ImageVersion) => void;
  onDuplicate?: (version: ImageVersion) => void;
  onCompare?: (version: ImageVersion) => void;
  onPreview?: (version: ImageVersion) => void;
  onExport?: (version: ImageVersion) => void;
  
  // 樣式
  className?: string;
  style?: React.CSSProperties;
}

const VersionCard: React.FC<VersionCardProps> = ({
  version,
  mode = 'normal',
  size = 'medium',
  showActions = true,
  showMetadata = true,
  showTags = true,
  isSelected = false,
  isComparing = false,
  isLoading = false,
  onSelect,
  onEdit,
  onDelete: _onDelete,
  onDuplicate: _onDuplicate,
  onCompare,
  onPreview,
  onExport: _onExport,
  className = '',
  style,
}) => {
  // 本地狀態
  const [_isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 獲取卡片尺寸
  const cardSize = useMemo(() => {
    return VERSION_MANAGEMENT_CONSTANTS.CARD_SIZES[size];
  }, [size]);

  // 獲取狀態顏色
  const statusColor = useMemo(() => {
    return VERSION_MANAGEMENT_CONSTANTS.COLORS.status[version.status];
  }, [version.status]);

  // 獲取類型顏色
  const typeColor = useMemo(() => {
    return VERSION_MANAGEMENT_CONSTANTS.COLORS.type[version.type];
  }, [version.type]);

  // 格式化時間
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} 週前`;
    } else {
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }, []);

  // 格式化檔案大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // 處理點擊事件
  const handleCardClick = useCallback(() => {
    if (onSelect) {
      onSelect(version);
    }
  }, [onSelect, version]);

  // 處理圖片載入
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // 處理圖片錯誤
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // 阻止事件冒泡
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // 渲染操作按鈕
  const renderActions = () => {
    if (!showActions || mode === 'compact') return null;

    return (
      <div className={`absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${VERSION_MANAGEMENT_CONSTANTS.ANIMATION_CONFIG.easing}`}>
        {onPreview && (
          <button
            onClick={(e) => { stopPropagation(e); onPreview(version); }}
            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md transition-colors"
            title="預覽"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
        
        {onCompare && (
          <button
            onClick={(e) => { stopPropagation(e); onCompare(version); }}
            className={`p-1.5 rounded-md transition-colors ${
              isComparing 
                ? 'bg-blue-500 text-white' 
                : 'bg-black/60 hover:bg-black/80 text-white'
            }`}
            title="比較"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        )}
        
        {onEdit && (
          <button
            onClick={(e) => { stopPropagation(e); onEdit(version); }}
            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md transition-colors"
            title="編輯"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  // 渲染狀態標籤
  const renderStatusBadge = () => {
    if (mode === 'compact') return null;

    return (
      <div className="absolute top-2 left-2 flex gap-1">
        {/* 版本狀態 */}
        <span
          className="px-2 py-1 text-xs font-medium text-white rounded-full"
          style={{ backgroundColor: statusColor }}
        >
          {version.status === 'active' && '活躍'}
          {version.status === 'archived' && '封存'}
          {version.status === 'deleted' && '已刪除'}
          {version.status === 'draft' && '草稿'}
        </span>
        
        {/* 版本類型 */}
        <span
          className="px-2 py-1 text-xs font-medium text-white rounded-full"
          style={{ backgroundColor: typeColor }}
        >
          {version.type === 'original' && '原始'}
          {version.type === 'revision' && '修訂'}
          {version.type === 'branch' && '分支'}
          {version.type === 'merge' && '合併'}
        </span>
      </div>
    );
  };

  // 渲染標籤
  const renderTags = () => {
    if (!showTags || !version.metadata.tags.length || mode === 'compact') return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {version.metadata.tags.slice(0, 3).map((tag) => (
          <span
            key={tag.id}
            className="px-2 py-1 text-xs rounded-full"
            style={{ 
              backgroundColor: tag.color + '20',
              color: tag.color,
            }}
          >
            {tag.name}
          </span>
        ))}
        {version.metadata.tags.length > 3 && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
            +{version.metadata.tags.length - 3}
          </span>
        )}
      </div>
    );
  };

  // 渲染元資料
  const renderMetadata = () => {
    if (!showMetadata || mode === 'compact') return null;

    return (
      <div className="mt-2 space-y-1">
        {mode === 'detailed' && (
          <>
            <div className="text-xs text-gray-500">
              {version.metadata.dimensions.width} × {version.metadata.dimensions.height}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(version.metadata.fileSize)}
            </div>
            <div className="text-xs text-gray-500">
              {version.metadata.aiParameters.model} ({version.metadata.aiParameters.provider})
            </div>
          </>
        )}
        <div className="text-xs text-gray-500">
          {formatDate(version.metadata.createdAt)}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`group relative bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all ${VERSION_MANAGEMENT_CONSTANTS.ANIMATION_CONFIG.easing} ${
        isSelected 
          ? 'border-blue-500 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      } ${isLoading ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      style={{
        width: cardSize.width,
        ...style,
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 圖片區域 */}
      <div
        className="relative bg-gray-100 rounded-t-lg overflow-hidden"
        style={{ height: cardSize.height * 0.7 }}
      >
        {!imageError ? (
          <img
            src={version.imageUrl}
            alt={version.metadata.title || `版本 ${version.versionNumber}`}
            className={`w-full h-full object-cover transition-opacity ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* 載入覆蓋層 */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* 狀態標籤 */}
        {renderStatusBadge()}
        
        {/* 操作按鈕 */}
        {renderActions()}
        
        {/* 版本號碼 */}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
          v{version.versionNumber}
        </div>
      </div>
      
      {/* 內容區域 */}
      <div className="p-3">
        {/* 標題 */}
        <h4 className="font-medium text-gray-900 text-sm leading-tight mb-1 truncate">
          {version.metadata.title || `版本 ${version.versionNumber}`}
        </h4>
        
        {/* 提示詞預覽 */}
        {mode !== 'compact' && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {version.prompt}
          </p>
        )}
        
        {/* 標籤 */}
        {renderTags()}
        
        {/* 元資料 */}
        {renderMetadata()}
      </div>
      
      {/* 選中指示器 */}
      {isSelected && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-lg"></div>
      )}
      
      {/* 載入覆蓋層 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default VersionCard;