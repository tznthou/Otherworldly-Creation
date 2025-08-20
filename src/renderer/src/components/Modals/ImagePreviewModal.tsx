import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { api } from '../../api';
// import { convertFileSrc } from '@tauri-apps/api/core';

interface TempImageData {
  id: string;
  prompt: string;
  temp_path: string;
  image_url?: string;
  parameters: {
    model: string;
    width: number;
    height: number;
    seed?: number;
    enhance: boolean;
    style?: string;
  };
  file_size_bytes: number;
  generation_time_ms: number;
  provider: string;
  is_free: boolean;
  is_temp: boolean;
  project_id?: string;
  character_id?: string;
  original_prompt: string;
}

interface ImagePreviewModalProps {
  tempImages: TempImageData[];
  onSaveConfirmed: (savedImages: TempImageData[]) => void;
  onDeleteAll: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  tempImages,
  onSaveConfirmed,
  onDeleteAll,
}) => {
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleClose = useCallback(() => {
    dispatch(closeModal('imagePreview'));
  }, [dispatch]);

  const handleSaveSelected = useCallback(async () => {
    if (selectedImages.size === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const selectedImagesData = tempImages.filter(img => selectedImages.has(img.id));
      const savedImages: TempImageData[] = [];

      for (const imageData of selectedImagesData) {
        try {
          const result = await api.illustration.confirmTempImageSave(imageData);
          if (result.success) {
            savedImages.push(imageData);
            console.log(`✅ 成功保存圖像: ${imageData.id}`);
          } else {
            console.error(`❌ 保存圖像失敗: ${imageData.id}`, result.message);
          }
        } catch (error) {
          console.error(`❌ 保存圖像異常: ${imageData.id}`, error);
        }
      }

      // 刪除未選中的臨時圖像
      const unselectedImages = tempImages.filter(img => !selectedImages.has(img.id));
      for (const imageData of unselectedImages) {
        try {
          await api.illustration.deleteTempImage(imageData.temp_path);
          console.log(`🗑️ 成功刪除未選中的臨時圖像: ${imageData.id}`);
        } catch (error) {
          console.error(`❌ 刪除臨時圖像失敗: ${imageData.id}`, error);
        }
      }

      onSaveConfirmed(savedImages);
      handleClose();
    } catch (error) {
      console.error('保存選中圖像失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedImages, tempImages, onSaveConfirmed, handleClose]);

  // 初始化時全選
  useEffect(() => {
    setSelectedImages(new Set(tempImages.map(img => img.id)));
  }, [tempImages]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft':
          setCurrentIndex(prev => prev > 0 ? prev - 1 : tempImages.length - 1);
          break;
        case 'ArrowRight':
          setCurrentIndex(prev => prev < tempImages.length - 1 ? prev + 1 : 0);
          break;
        case 'Enter':
          if (event.ctrlKey || event.metaKey) {
            handleSaveSelected();
          }
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleImageSelection(tempImages[currentIndex].id);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, tempImages]);

  const currentImage = tempImages[currentIndex];

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedImages(new Set(tempImages.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const handleDeleteAll = async () => {
    setIsLoading(true);
    try {
      for (const imageData of tempImages) {
        try {
          await api.illustration.deleteTempImage(imageData.temp_path);
          console.log(`🗑️ 成功刪除臨時圖像: ${imageData.id}`);
        } catch (error) {
          console.error(`❌ 刪除臨時圖像失敗: ${imageData.id}`, error);
        }
      }

      onDeleteAll();
      handleClose();
    } catch (error) {
      console.error('刪除所有臨時圖像失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    // 關閉預覽模態框，返回生成面板
    handleClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!currentImage) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-[calc(100vw-160px)] max-w-6xl max-h-[95vh] overflow-hidden ml-32 mr-8 my-4">
        {/* 標題欄 */}
        <div className="p-4 border-b border-cosmic-700 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-cosmic text-gold-500">
              🎨 圖像預覽 ({currentIndex + 1}/{tempImages.length})
            </h2>
            <span className="text-sm text-gray-400">
              已選擇 {selectedImages.size}/{tempImages.length} 張
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1 bg-cosmic-800 hover:bg-cosmic-700 text-gray-300 rounded-md transition-colors text-sm"
            >
              {showDetails ? '隱藏詳情' : '顯示詳情'}
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[calc(95vh-80px)]">
          {/* 主圖像區域 */}
          <div className="flex-1 flex flex-col">
            {/* 圖像顯示 */}
            <div className="flex-1 flex items-center justify-center bg-black/20 relative">
              {/* 導航按鈕 */}
              {tempImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : tempImages.length - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors z-10"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentIndex(prev => prev < tempImages.length - 1 ? prev + 1 : 0)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors z-10"
                  >
                    →
                  </button>
                </>
              )}

              {/* 圖像 */}
              <img
                ref={imageRef}
                src={`file://${currentImage.temp_path}`}
                alt={currentImage.prompt}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              />

              {/* 選擇指示器 */}
              <div 
                className={`absolute top-4 left-4 w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  selectedImages.has(currentImage.id) 
                    ? 'bg-gold-500 border-gold-500 text-white' 
                    : 'bg-transparent border-gray-400 hover:border-gold-400'
                }`}
                onClick={() => toggleImageSelection(currentImage.id)}
              >
                {selectedImages.has(currentImage.id) && '✓'}
              </div>
            </div>

            {/* 圖像縮略圖導航 */}
            {tempImages.length > 1 && (
              <div className="p-4 border-t border-cosmic-700">
                <div className="flex space-x-2 overflow-x-auto">
                  {tempImages.map((image, index) => (
                    <div
                      key={image.id}
                      className={`relative flex-shrink-0 cursor-pointer ${
                        index === currentIndex ? 'ring-2 ring-gold-500' : ''
                      }`}
                      onClick={() => setCurrentIndex(index)}
                    >
                      <img
                        src={`file://${image.temp_path}`}
                        alt={`Image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border border-cosmic-600"
                      />
                      {selectedImages.has(image.id) && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center text-xs text-white">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 側邊詳情面板 */}
          {showDetails && (
            <div className="w-80 border-l border-cosmic-700 bg-cosmic-800/50 p-4 overflow-y-auto">
              <h3 className="font-medium text-gold-400 mb-4">圖像詳情</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-gray-400 block">提示詞</label>
                  <p className="text-white bg-cosmic-900 p-2 rounded text-xs max-h-20 overflow-y-auto">
                    {currentImage.original_prompt}
                  </p>
                </div>

                <div>
                  <label className="text-gray-400 block">增強提示詞</label>
                  <p className="text-white bg-cosmic-900 p-2 rounded text-xs max-h-20 overflow-y-auto">
                    {currentImage.prompt}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 block">模型</label>
                    <p className="text-white">{currentImage.parameters.model}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 block">風格</label>
                    <p className="text-white">{currentImage.parameters.style || 'default'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 block">尺寸</label>
                    <p className="text-white">{currentImage.parameters.width}×{currentImage.parameters.height}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 block">檔案大小</label>
                    <p className="text-white">{formatFileSize(currentImage.file_size_bytes)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 block">生成時間</label>
                    <p className="text-white">{formatTime(currentImage.generation_time_ms)}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 block">種子值</label>
                    <p className="text-white">{currentImage.parameters.seed || 'auto'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block">服務提供者</label>
                  <p className="text-white flex items-center">
                    {currentImage.provider} 
                    {currentImage.is_free && <span className="ml-2 text-green-400 text-xs">免費</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作欄 */}
        <div className="p-4 border-t border-cosmic-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={selectAll}
              className="px-3 py-1 bg-cosmic-800 hover:bg-cosmic-700 text-gray-300 rounded-md transition-colors text-sm"
              disabled={selectedImages.size === tempImages.length}
            >
              全選
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 bg-cosmic-800 hover:bg-cosmic-700 text-gray-300 rounded-md transition-colors text-sm"
              disabled={selectedImages.size === 0}
            >
              取消全選
            </button>
            <span className="text-xs text-gray-500">
              提示：Ctrl+D 切換當前圖像選擇
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRegenerate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              🔄 重新生成
            </button>
            <button
              onClick={handleDeleteAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              🗑️ 全部刪除
            </button>
            <button
              onClick={handleSaveSelected}
              className="px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              disabled={isLoading || selectedImages.size === 0}
            >
              {isLoading ? '保存中...' : `💾 保存選中 (${selectedImages.size})`}
            </button>
          </div>
        </div>

        {/* 快捷鍵說明 */}
        <div className="px-4 py-2 bg-cosmic-800/30 border-t border-cosmic-700/50 text-xs text-gray-500">
          快捷鍵：ESC 關閉 | ← → 切換圖像 | Ctrl+Enter 保存選中 | Ctrl+D 切換選擇
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;