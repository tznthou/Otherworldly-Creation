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

export const SafeImage: React.FC<SafeImageProps> = ({
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

  useEffect(() => {
    let isMounted = true;

    async function loadImage() {
      if (!isMounted) return;
      
      setIsLoading(true);
      setHasError(false);
      setSrc('');

      try {
        if (imageUrl) {
          // 網路圖片直接使用
          console.log('🌐 SafeImage: 載入網路圖片', imageUrl);
          setSrc(imageUrl);
          setIsLoading(false);
          return;
        }

        if (localFilePath) {
          // 統一路徑格式處理（Windows/Mac兼容）
          let cleanPath = localFilePath.replace(/^file:\/\//, '');
          // 處理Windows路徑中的反斜槓
          cleanPath = cleanPath.replace(/\\/g, '/');
          
          const assetUrl = convertFileSrc(cleanPath);
          setSrc(assetUrl);
          setIsLoading(false);
          console.log('🖼️ SafeImage: 本地圖片轉換', {
            original: localFilePath,
            cleaned: cleanPath,
            assetUrl: assetUrl
          });
          return;
        }

        // 沒有圖片源
        console.warn('⚠️ SafeImage: 沒有提供圖片源');
        setIsLoading(false);
      } catch (error) {
        console.error('❌ SafeImage: 圖片載入錯誤', {
          error,
          imageUrl,
          localFilePath
        });
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
};