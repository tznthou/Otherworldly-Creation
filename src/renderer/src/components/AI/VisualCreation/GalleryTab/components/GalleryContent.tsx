import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SafeImage } from '../../../../UI/SafeImage';
import type { IllustrationHistoryItem } from '../../../../../types/illustration';
import VirtualizedImageGrid from '../VirtualizedImageGrid';
import { formatDateTime } from '../../../../../utils/dateUtils';
import { createLogger } from '../../../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('GalleryContent');

interface GalleryContentProps {
  illustrations: IllustrationHistoryItem[];
  selectedImages: Set<string>;
  onToggleSelection: (imageId: string) => void;
  deletingImages?: Set<string>;
  viewMode?: 'grid' | 'list';
  sortBy?: 'newest' | 'oldest' | 'rating' | 'size';
  isCollectionView?: boolean;
  searchQuery?: string;
  selectedProvider?: string;
  selectedStatus?: string;
  selectedVersion?: string;
  selectedPeriod?: string;
}

export const GalleryContent: React.FC<GalleryContentProps> = ({
  illustrations,
  selectedImages,
  onToggleSelection,
  deletingImages = new Set(),
  viewMode = 'grid',
  sortBy = 'newest',
  isCollectionView: _isCollectionView = false,
  searchQuery = '',
  selectedProvider,
  selectedStatus,
  selectedVersion,
  selectedPeriod
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isObserverReady, setIsObserverReady] = useState(false);

  // 📐 超激進尺寸設置 - 立即生效，不等待ResizeObserver
  useEffect(() => {
    log.debug('🚀 [GalleryContent] 超激進尺寸設置開始...');
    
    // 立即設置合理的默認尺寸，不等待任何條件
    const immediateSize = {
      width: Math.max(window.innerWidth - 400, 800),
      height: Math.max(window.innerHeight - 300, 600)
    };
    
    log.debug('⚡ [GalleryContent] 立即設置預設尺寸:', immediateSize);
    setDimensions(immediateSize);
    setIsObserverReady(true);
    
    if (!containerRef.current) {
      log.warn('❌ [GalleryContent] containerRef.current 不存在，但已設置預設尺寸');
      return;
    }

    const container = containerRef.current;
    log.debug('📦 [GalleryContent] 容器元素檢查:', {
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight,
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      scrollWidth: container.scrollWidth,
      scrollHeight: container.scrollHeight,
      className: container.className,
      computedStyles: {
        width: getComputedStyle(container).width,
        height: getComputedStyle(container).height,
        position: getComputedStyle(container).position,
        display: getComputedStyle(container).display
      }
    });

    // 智能備用尺寸計算
    const smartFallback = {
      width: Math.max(
        container.clientWidth,
        container.offsetWidth,
        immediateSize.width
      ),
      height: Math.max(
        container.clientHeight, 
        container.offsetHeight,
        immediateSize.height
      )
    };
    
    log.debug('🎯 [GalleryContent] 智能備用尺寸:', smartFallback);

    // 立即更新為智能尺寸（如果更大的話）
    if (smartFallback.width > immediateSize.width || smartFallback.height > immediateSize.height) {
      log.debug('📈 [GalleryContent] 更新為智能尺寸');
      setDimensions(smartFallback);
    }

    // 設置ResizeObserver（但不依賴它）
    const resizeObserver = new ResizeObserver((entries) => {
      log.debug('📏 [GalleryContent] ResizeObserver 觸發, entries數量:', entries.length);
      
      for (const entry of entries) {
        const observedDimensions = {
          width: Math.max(entry.contentRect.width, 300),
          height: Math.max(entry.contentRect.height, 200),
        };
        
        log.debug('✅ [GalleryContent] ResizeObserver新尺寸:', observedDimensions);
        setDimensions(observedDimensions);
      }
    });

    try {
      resizeObserver.observe(container);
      log.debug('🔄 [GalleryContent] ResizeObserver 已啟動（作為輔助）');
    } catch (error) {
      log.error('❌ [GalleryContent] ResizeObserver 錯誤（但不影響顯示）:', error);
    }

    return () => {
      log.debug('🧹 [GalleryContent] 清理ResizeObserver');
      resizeObserver.disconnect();
    };
  }, []);
  
  // 尺寸變化調試
  useEffect(() => {
    log.debug('📊 [GalleryContent] 尺寸狀態更新:', {
      dimensions,
      isObserverReady,
      shouldRender: dimensions.width > 0 && dimensions.height > 0,
      illustrations: illustrations.length
    });
  }, [dimensions, isObserverReady, illustrations.length]);

  // 過濾和排序邏輯
  const filteredAndSortedIllustrations = useMemo(() => {
    let filtered = [...illustrations];

    // 搜尋過濾
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.original_prompt?.toLowerCase().includes(query) ||
        item.enhanced_prompt?.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }

    // 服務商過濾
    if (selectedProvider) {
      filtered = filtered.filter(item => {
        // 根據不同的服務商字段判斷
        const provider = item.provider || 
                        (item.model?.includes('flux') ? 'pollinations' : 'unknown');
        return provider === selectedProvider;
      });
    }

    // 狀態過濾
    if (selectedStatus) {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    // 版本過濾（這裡可以根據模型或其他字段）
    if (selectedVersion) {
      filtered = filtered.filter(item => 
        item.model?.toLowerCase().includes(selectedVersion.toLowerCase())
      );
    }

    // 時間段過濾
    if (selectedPeriod) {
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= startDate;
      });
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'rating':
          return (b.user_rating || 0) - (a.user_rating || 0);
        case 'size':
          return (b.file_size_bytes || 0) - (a.file_size_bytes || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [illustrations, searchQuery, selectedProvider, selectedStatus, selectedVersion, selectedPeriod, sortBy]);

  if (filteredAndSortedIllustrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-cosmic-400">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg mb-2">沒有找到符合條件的圖片</p>
        <p className="text-sm opacity-60">
          {searchQuery ? '嘗試調整搜尋條件' : '開始生成一些精美的插畫吧'}
        </p>
      </div>
    );
  }

  // 📊 激進渲染策略 - 總是嘗試渲染
  const shouldRender = true; // 總是渲染，使用最小保護尺寸
  const isLoading = false; // 不再顯示載入狀態
  const safeWidth = Math.max(dimensions.width, 300);
  const safeHeight = Math.max(dimensions.height, 200);

  log.debug('🎬 [GalleryContent] 激進渲染決策:', {
    shouldRender,
    isLoading,
    originalDimensions: dimensions,
    safeDimensions: { width: safeWidth, height: safeHeight },
    isObserverReady,
    filteredLength: filteredAndSortedIllustrations.length,
    windowSize: { width: window.innerWidth, height: window.innerHeight }
  });

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {shouldRender ? (
        <>
          {viewMode === 'grid' ? (
            <VirtualizedImageGrid
              illustrations={filteredAndSortedIllustrations}
              selectedImages={selectedImages}
              onToggleSelection={onToggleSelection}
              containerWidth={safeWidth}
              containerHeight={safeHeight}
              deletingImages={deletingImages}
            />
          ) : (
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              {filteredAndSortedIllustrations.map((item) => {
                const isSelected = selectedImages.has(item.id);
                const isDeleting = deletingImages.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`
                      flex bg-cosmic-800 rounded-lg p-4 transition-all duration-200
                      ${isSelected ? 'ring-2 ring-primary-500 bg-primary-500/10' : 'hover:bg-cosmic-700'}
                      ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
                    `}
                    onClick={() => !isDeleting && onToggleSelection(item.id)}
                  >
                    <div className="relative w-32 h-32 flex-shrink-0 mr-4">
                      {item.image_url || item.image_path || item.full_path ? (
                        <>
                          <SafeImage
                            key={`safe-image-list-${item.id}`}
                            imageUrl={item.image_url && item.image_url.startsWith('http') ? item.image_url : undefined}
                            localFilePath={item.full_path || item.image_path}
                            alt={item.original_prompt}
                            className="w-full h-full object-cover rounded"
                            loading="lazy"
                            fallbackIcon="🎨"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary-500/20 rounded flex items-center justify-center">
                              <svg className="w-8 h-8 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {isDeleting && (
                            <div className="absolute inset-0 bg-red-500/20 rounded flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400"></div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-cosmic-700 rounded flex items-center justify-center">
                          <span className="text-2xl text-cosmic-500">🎨</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-cosmic-100 mb-2 truncate">
                        {item.original_prompt || '未命名插畫'}
                      </h3>
                      
                      <div className="space-y-1 text-xs text-cosmic-400">
                        <div className="flex items-center justify-between">
                          <span>模型: {item.model || 'unknown'}</span>
                          <span>{item.width || 0}×{item.height || 0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>狀態: {item.status === 'completed' ? '完成' : item.status}</span>
                          <span>
                            {item.file_size_bytes 
                              ? `${Math.round(item.file_size_bytes / 1024)} KB` 
                              : '未知大小'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span>{formatDateTime(item.created_at)}</span>
                          {item.user_rating && (
                            <div className="flex items-center">
                              <span>⭐</span>
                              <span className="ml-1">{item.user_rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // ❌ 備用錯誤狀態
        <div className="flex flex-col items-center justify-center h-full text-cosmic-400">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-lg mb-2">容器尺寸計算失敗</p>
          <p className="text-sm opacity-60">請重新整理頁面或檢查瀏覽器開發者工具</p>
          <p className="text-xs mt-2">調試: {JSON.stringify({dimensions, isObserverReady})}</p>
        </div>
      )}
    </div>
  );
};