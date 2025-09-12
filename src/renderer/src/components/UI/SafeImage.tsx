// 安全圖片組件 - 繞過 CSP 限制
import React, { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface SafeImageProps {
  imageUrl?: string;
  localFilePath?: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  fallbackIcon?: string;
}

export const SafeImage: React.FC<SafeImageProps> = React.memo(({
  imageUrl,
  localFilePath,
  alt,
  className = '',
  onLoad,
  onError,
  loading = 'lazy',
  fallbackIcon = '🖼️'
}) => {
  const [src, setSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // 🚨 調試日誌已清理，提高性能

  // 🚨 已移除在渲染期間執行的狀態更新代碼，防止無限重新渲染

  useEffect(() => {
    let isMounted = true;

    async function loadImage() {
      if (!isMounted) {
        return;
      }
      
      setIsLoading(true);
      setHasError(false);
      setSrc('');

      try {
        // 檢查網路圖片
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          setSrc(imageUrl);
          setIsLoading(false);
          return;
        }

        // 檢查本地文件路徑
        if (localFilePath && typeof localFilePath === 'string' && localFilePath.trim() !== '') {
          console.log('🔍 [SafeImageDebug] 處理本地檔案路徑:', {
            originalPath: localFilePath,
            pathType: typeof localFilePath,
            pathLength: localFilePath.length
          });
          
          // 統一路徑格式處理（Windows/Mac兼容）
          let cleanPath = localFilePath.replace(/^file:\/\//, '');
          cleanPath = cleanPath.replace(/\\/g, '/');
          
          console.log('🔧 [SafeImageDebug] 清理後路徑:', cleanPath);
          
          try {
            const assetUrl = convertFileSrc(cleanPath);
            console.log('✅ [SafeImageDebug] convertFileSrc 成功:', assetUrl);
            setSrc(assetUrl);
            setIsLoading(false);
          } catch (error) {
            console.error('❌ [SafeImageDebug] convertFileSrc 失敗:', error);
            setHasError(true);
            setIsLoading(false);
          }
          return;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('SafeImage: Image loading error', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }
      }
    }

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, localFilePath, onError]);

  // 載入中
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-cosmic-700 ${className}`}>
        <div className="text-cosmic-400 animate-pulse">
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (hasError || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-cosmic-700 text-cosmic-400 ${className}`}>
        <div className="text-2xl mb-1">{fallbackIcon}</div>
        <div className="text-xs opacity-60">載入失敗</div>
      </div>
    );
  }

  // 正常顯示圖片
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={onLoad}
      onError={() => {
        setHasError(true);
        onError?.();
      }}
    />
  );
}, (prevProps, nextProps) => {
  // 只有當 imageUrl 和 localFilePath 都相同時才認為組件相同
  return prevProps.imageUrl === nextProps.imageUrl && 
         prevProps.localFilePath === nextProps.localFilePath &&
         prevProps.alt === nextProps.alt;
});