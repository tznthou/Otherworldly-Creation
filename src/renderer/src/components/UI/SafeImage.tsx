// 安全圖片組件 - 繞過 CSP 限制
import React, { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface SafeImageProps {
  imageUrl?: string;
  localFilePath?: string;
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  fallback?: string;
  fallbackIcon?: string;
}

export const SafeImage: React.FC<SafeImageProps> = React.memo(({
  imageUrl,
  localFilePath,
  src: externalSrc,
  alt,
  className = '',
  style,
  onLoad,
  onError,
  loading = 'lazy',
  fallback = '載入失敗',
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
        // 檢查外部src參數
        if (externalSrc && typeof externalSrc === 'string' && externalSrc.trim() !== '') {
          setSrc(externalSrc);
          setIsLoading(false);
          return;
        }

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
            pathLength: localFilePath.length,
            isProduction: process.env.NODE_ENV === 'production'
          });

          // 統一路徑格式處理（Windows/Mac兼容）
          let cleanPath = localFilePath.replace(/^file:\/\//, '');

          // 🔧 修復：處理 Windows 反斜杠和 URL 編碼
          cleanPath = cleanPath.replace(/\\/g, '/');
          cleanPath = decodeURIComponent(cleanPath);

          console.log('🔧 [SafeImageDebug] 清理後路徑:', cleanPath);
          console.log('🔧 [SafeImageDebug] 路徑處理步驟:', {
            step1_removedFileProtocol: localFilePath.replace(/^file:\/\//, ''),
            step2_normalizedSlashes: cleanPath.replace(/\\/g, '/'),
            step3_decoded: cleanPath,
            isAbsolutePath: cleanPath.startsWith('/') || cleanPath.match(/^[a-zA-Z]:/),
            pathContainsGeneratedImages: cleanPath.includes('generated-images'),
            pathContainsGenesisChronicle: cleanPath.includes('genesis-chronicle')
          });

          // 🔧 修復：如果只是檔案名，手動構建完整路徑
          if (!cleanPath.startsWith('/') && !cleanPath.match(/^[a-zA-Z]:/) && !cleanPath.includes('generated-images')) {
            // 檢查是否為 UUID 格式的檔案名（如 abc123.jpg）
            const isUuidFilename = /^[a-f0-9-]{36}\.jpg$/i.test(cleanPath);
            if (isUuidFilename) {
              if (process.env.NODE_ENV === 'development') {
                // 開發環境：手動構建路徑
                cleanPath = `/Users/tznthou/Documents/Practice/6 novel writing/src-tauri/generated-images/${cleanPath}`;
                console.log('🔧 [SafeImageDebug] 開發環境路徑:', cleanPath);
              } else {
                // 生產環境：使用相對路徑讓 Tauri 自動解析
                console.log('🔧 [SafeImageDebug] 生產環境，使用原始路徑:', cleanPath);
              }
            }
          }

          try {
            const assetUrl = convertFileSrc(cleanPath);
            console.log('✅ [SafeImageDebug] convertFileSrc 成功:', {
              inputPath: cleanPath,
              outputUrl: assetUrl,
              isProduction: process.env.NODE_ENV === 'production'
            });
            setSrc(assetUrl);
            setIsLoading(false);
          } catch (error) {
            console.error('❌ [SafeImageDebug] convertFileSrc 失敗:', {
              error,
              inputPath: cleanPath,
              isProduction: process.env.NODE_ENV === 'production'
            });
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
  }, [imageUrl, localFilePath, externalSrc, onError]);

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
      <div className={`flex flex-col items-center justify-center bg-cosmic-700 text-cosmic-400 ${className}`} style={style}>
        <div className="text-2xl mb-1">{fallbackIcon}</div>
        <div className="text-xs opacity-60">{fallback}</div>
      </div>
    );
  }

  // 正常顯示圖片
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onLoad={onLoad}
      onError={() => {
        setHasError(true);
        onError?.();
      }}
    />
  );
}, (prevProps, nextProps) => {
  // 只有當關鍵props都相同時才認為組件相同
  return prevProps.imageUrl === nextProps.imageUrl &&
         prevProps.localFilePath === nextProps.localFilePath &&
         prevProps.src === nextProps.src &&
         prevProps.alt === nextProps.alt;
});