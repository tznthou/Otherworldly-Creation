import React, { useMemo } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import { IllustrationHistoryItem } from '../../../../types/illustration';
import { SafeImage } from '../../../UI/SafeImage';
import { formatDateTime } from '../../../../utils/dateUtils';

interface VirtualizedImageGridProps {
  illustrations: IllustrationHistoryItem[];
  selectedImages: Set<string>;
  onToggleSelection: (imageId: string) => void;
  containerHeight: number;
  containerWidth: number;
}

interface ItemData {
  illustrations: IllustrationHistoryItem[];
  columnCount: number;
  selectedImages: Set<string>;
  onToggleSelection: (imageId: string) => void;
}

const ITEM_SIZE = 200; // 每個圖像項目的大小
const PADDING = 16; // 間距

// 計算列數的函數
const calculateColumnCount = (containerWidth: number): number => {
  const availableWidth = containerWidth - PADDING * 2;
  return Math.max(1, Math.floor((availableWidth + 16) / (ITEM_SIZE + 16)));
};

// 格式化日期 - JavaScript 自動處理 UTC 到本地時區的轉換
const formatDate = (dateString: string) => {
  return formatDateTime(dateString, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // 使用24小時制避免上午/下午顯示問題
  });
};

// 獲取狀態圖標
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'pending': return '⏳';
    case 'processing': return '🔄';
    default: return '❓';
  }
};

// 獲取狀態名稱
const getStatusName = (status: string) => {
  switch (status) {
    case 'completed': return '完成';
    case 'failed': return '失敗';
    case 'pending': return '等待';
    case 'processing': return '處理中';
    default: return '未知';
  }
};

// 網格項目組件
const GridItem: React.FC<GridChildComponentProps<ItemData>> = ({
  columnIndex,
  rowIndex,
  style,
  data
}) => {
  const { illustrations, columnCount, selectedImages, onToggleSelection } = data;
  const itemIndex = rowIndex * columnCount + columnIndex;
  
  // 如果超出數據範圍，渲染空項目
  if (itemIndex >= illustrations.length) {
    return <div style={style}></div>;
  }
  
  const item = illustrations[itemIndex];
  
  return (
    <div
      style={{
        ...style,
        left: Number(style.left) + 8,
        top: Number(style.top) + 8,
        width: Number(style.width) - 16,
        height: Number(style.height) - 16,
      }}
    >
      <div
        className={`
          relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all h-full
          ${selectedImages.has(item.id) 
            ? 'border-gold-500 ring-2 ring-gold-500/50' 
            : 'border-cosmic-600 hover:border-cosmic-500'
          }
        `}
        onClick={() => onToggleSelection(item.id)}
      >
        {/* 圖像縮略圖 */}
        <div className="w-full h-full bg-cosmic-700 flex items-center justify-center">
          {item.image_url || item.local_file_path ? (
            <SafeImage
              imageUrl={item.image_url}
              localFilePath={item.local_file_path}
              alt={item.original_prompt}
              className="w-full h-full object-cover"
              loading="lazy"
              fallbackIcon="🎨"
            />
          ) : (
            <div className="text-cosmic-400 text-xl">
              {getStatusIcon(item.status)}
            </div>
          )}
        </div>
        
        {/* 選擇指示器 */}
        <div className={`
          absolute top-2 left-2 w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-all
          ${selectedImages.has(item.id)
            ? 'bg-gold-500 border-gold-500 text-white'
            : 'bg-black/50 border-white/50 text-white opacity-0 group-hover:opacity-100'
          }
        `}>
          {selectedImages.has(item.id) && '✓'}
        </div>
        
        {/* 服務標籤 */}
        <div className={`
          absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity
          ${item.is_free 
            ? 'bg-green-600 text-white' 
            : 'bg-blue-600 text-white'
          }
        `}>
          {item.is_free ? '免費' : '付費'}
        </div>
        
        {/* 懸停信息 */}
        <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs truncate font-medium">
            {getStatusName(item.status)} - {item.model}
          </p>
          <p className="text-xs truncate text-gray-300">
            {formatDate(item.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

const VirtualizedImageGrid: React.FC<VirtualizedImageGridProps> = ({
  illustrations,
  selectedImages,
  onToggleSelection,
  containerHeight,
  containerWidth
}) => {
  const columnCount = useMemo(() => 
    calculateColumnCount(containerWidth), [containerWidth]
  );
  
  const rowCount = useMemo(() => 
    Math.ceil(illustrations.length / columnCount), [illustrations.length, columnCount]
  );
  
  const itemData: ItemData = useMemo(() => ({
    illustrations,
    columnCount,
    selectedImages,
    onToggleSelection,
  }), [illustrations, columnCount, selectedImages, onToggleSelection]);
  
  // 如果沒有數據，顯示空狀態
  if (illustrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-6xl mb-6">🖼️</div>
        <h3 className="text-xl font-cosmic text-cosmic-300 mb-2">
          尚無插畫
        </h3>
        <p className="text-cosmic-400 mb-4">
          開始創建您的第一張插畫吧！
        </p>
        <button className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors">
          🎨 開始創作
        </button>
      </div>
    );
  }
  
  return (
    <Grid
      columnCount={columnCount}
      columnWidth={ITEM_SIZE + 16}
      height={containerHeight}
      rowCount={rowCount}
      rowHeight={ITEM_SIZE + 16}
      width={containerWidth}
      itemData={itemData}
    >
      {GridItem}
    </Grid>
  );
};

export default VirtualizedImageGrid;