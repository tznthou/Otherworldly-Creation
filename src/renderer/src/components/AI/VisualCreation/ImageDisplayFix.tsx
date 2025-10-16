import React, { useState, useEffect } from 'react';
import { createLogger } from '../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ImageDisplayFix');

interface ImageDisplayFixProps {
  imagePath: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * 解決 CSP 阻擋問題的圖片顯示組件
 * 使用 base64 編碼方式繞過 asset:// 協議限制
 */
const ImageDisplayFix: React.FC<ImageDisplayFixProps> = ({ 
  imagePath, 
  alt = '', 
  className = '', 
  style,
  onError 
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!imagePath) return;

    const loadImageAsBase64 = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // 嘗試使用 Tauri invoke 讀取文件並轉換為 base64
        const { invoke } = await import('@tauri-apps/api/core');
        
        // 直接使用文件路徑創建 data URL（簡化版本）
        // 讀取文件為 base64 字串
        const base64String = await invoke<string>('read_file_as_base64', { path: imagePath });
        
        // 創建 data URL（假設是 JPEG 格式）
        const dataUrl = `data:image/jpeg;base64,${base64String}`;
        setImageSrc(dataUrl);
        
      } catch (error) {
        log.error('❌ 圖片載入失敗:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImageAsBase64();
  }, [imagePath]);

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-bg-dark/80/30 ${className}`}
        style={style}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-2 border-warm-gold border-t-transparent rounded-full animate-spin"></div>
          <span className="text-text-secondary/80 text-xs">載入中...</span>
        </div>
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return (
      <div 
        className={`flex items-center justify-center bg-bg-dark/80/30 ${className}`}
        style={style}
      >
        <div className="flex flex-col items-center space-y-2 text-text-secondary/80">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">載入失敗</span>
        </div>
      </div>
    );
  }

  return (
    <img 
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
    />
  );
};

export default ImageDisplayFix;