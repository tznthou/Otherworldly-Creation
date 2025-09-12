import React, { useState, useMemo } from 'react';
import { IllustrationHistoryItem } from '../../../../types/illustration';
import { SafeImage } from '../../../UI/SafeImage';
import { DeleteIllustrationRequest } from '../../../../api/types';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  selectedImages: IllustrationHistoryItem[];
  onClose: () => void;
  onConfirm: (request: DeleteIllustrationRequest) => void;
  isDeleting?: boolean;
  className?: string;
}

type DeleteType = 'soft' | 'permanent';

/**
 * 專業的圖片刪除確認對話框
 * 提供軟刪除和永久刪除選項，圖片預覽和詳細說明
 */
export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  selectedImages,
  onClose,
  onConfirm,
  isDeleting = false,
  className = ''
}) => {
  const [deleteType, setDeleteType] = useState<DeleteType>('soft');
  const [deleteReason, setDeleteReason] = useState('');
  const [preserveMetadata, setPreserveMetadata] = useState(true);

  // 計算統計資訊
  const stats = useMemo(() => {
    const totalSize = selectedImages.reduce((acc, img) => {
      return acc + (img.file_size_bytes || 0);
    }, 0);

    const byProvider = selectedImages.reduce((acc, img) => {
      const provider = img.provider || 'unknown';
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      count: selectedImages.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(1),
      byProvider,
      hasVersions: selectedImages.some(img => img.totalVersions && img.totalVersions > 1)
    };
  }, [selectedImages]);

  // 處理確認刪除
  const handleConfirm = () => {
    const request: DeleteIllustrationRequest = {
      imageIds: selectedImages.map(img => img.id),
      deleteType,
      preserveMetadata,
      reason: deleteReason || undefined
    };
    onConfirm(request);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className={`bg-cosmic-800/95 border border-cosmic-700 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="flex items-center justify-between p-4 border-b border-cosmic-700 bg-red-900/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-200">確認刪除圖片</h3>
              <p className="text-sm text-red-300">
                即將刪除 {stats.count} 張圖片 ({stats.totalSizeMB} MB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 text-cosmic-400 hover:text-cosmic-200 hover:bg-cosmic-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {/* 統計資訊 */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-cosmic-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.count}</div>
                <div className="text-sm text-cosmic-400">張圖片</div>
              </div>
              <div className="bg-cosmic-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">{stats.totalSizeMB} MB</div>
                <div className="text-sm text-cosmic-400">檔案大小</div>
              </div>
              <div className="bg-cosmic-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{Object.keys(stats.byProvider).length}</div>
                <div className="text-sm text-cosmic-400">個提供商</div>
              </div>
              <div className="bg-cosmic-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {stats.hasVersions ? '有' : '無'}
                </div>
                <div className="text-sm text-cosmic-400">多版本</div>
              </div>
            </div>

            {/* 提供商分佈 */}
            <div className="flex items-center space-x-4 text-sm text-cosmic-400 mb-4">
              <span>提供商分佈:</span>
              {Object.entries(stats.byProvider).map(([provider, count]) => (
                <span key={provider} className="px-2 py-1 bg-cosmic-700/50 rounded">
                  {provider}: {count}張
                </span>
              ))}
            </div>
          </div>

          {/* 圖片預覽網格 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-cosmic-300 mb-3">將要刪除的圖片:</h4>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
              {selectedImages.map((image, index) => (
                <div key={image.id} className="relative group">
                  <div className="w-16 h-16 bg-cosmic-700 rounded overflow-hidden relative">
                    {image.image_url || image.image_path ? (
                      <SafeImage
                        imageUrl={image.image_url}
                        localFilePath={image.image_path}
                        alt={image.original_prompt}
                        className="w-full h-full object-cover"
                        fallbackIcon="🗑️"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cosmic-400 text-xs">
                        No Image
                      </div>
                    )}
                    
                    {/* 索引標籤 */}
                    <div className="absolute top-0.5 right-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                      {index + 1}
                    </div>
                    
                    {/* 提供商標籤 */}
                    <div className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                      {image.provider === 'pollinations' ? '🌸' : image.provider === 'imagen' ? '🎨' : '❓'}
                    </div>
                  </div>
                  
                  {/* 懸停顯示詳細資訊 */}
                  <div className="absolute bottom-full left-0 mb-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="bg-black text-white text-xs p-2 rounded whitespace-nowrap max-w-48">
                      <div className="truncate">{image.original_prompt}</div>
                      <div className="text-gray-400">
                        {image.model} • {image.width}×{image.height}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 刪除類型選擇 */}
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-medium text-cosmic-300">刪除類型:</h4>
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="deleteType"
                  value="soft"
                  checked={deleteType === 'soft'}
                  onChange={(e) => setDeleteType(e.target.value as DeleteType)}
                  className="mt-1 w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 focus:ring-gold-500"
                />
                <div>
                  <div className="font-medium text-green-400">軟刪除 (建議)</div>
                  <div className="text-sm text-cosmic-400">
                    將圖片移動到垃圾桶資料夾，可以隨時恢復
                  </div>
                  <div className="text-xs text-green-500 mt-1">
                    📁 ~/Library/Application Support/genesis-chronicle/deleted-images/
                  </div>
                </div>
              </label>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="deleteType"
                  value="permanent"
                  checked={deleteType === 'permanent'}
                  onChange={(e) => setDeleteType(e.target.value as DeleteType)}
                  className="mt-1 w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 focus:ring-gold-500"
                />
                <div>
                  <div className="font-medium text-red-400">永久刪除</div>
                  <div className="text-sm text-cosmic-400">
                    直接刪除圖片檔案，無法恢復
                  </div>
                  <div className="text-xs text-red-500 mt-1">
                    ⚠️ 此操作不可撤銷，請謹慎選擇
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 進階選項 */}
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-medium text-cosmic-300">進階選項:</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preserveMetadata}
                  onChange={(e) => setPreserveMetadata(e.target.checked)}
                  className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                />
                <div>
                  <span className="text-sm text-cosmic-300">保留圖片元數據</span>
                  <div className="text-xs text-cosmic-500">保留提示詞、生成參數等資訊用於未來參考</div>
                </div>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cosmic-300 mb-2">
                刪除原因 (可選):
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="例如: 品質不佳、不符合需求、重複圖片..."
                className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 text-cosmic-100 placeholder-cosmic-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                disabled={isDeleting}
              />
            </div>
          </div>

          {/* 警告提示 */}
          {deleteType === 'permanent' && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="font-medium text-red-300">永久刪除警告</div>
                  <div className="text-sm text-red-400 mt-1">
                    您選擇了永久刪除，這將直接從磁碟中刪除圖片檔案，此操作無法撤銷。
                    建議您先嘗試軟刪除，確認不需要這些圖片後再進行永久刪除。
                  </div>
                </div>
              </div>
            </div>
          )}

          {stats.hasVersions && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-6">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="font-medium text-blue-300">版本管理提醒</div>
                  <div className="text-sm text-blue-400 mt-1">
                    部分圖片具有多個版本。刪除操作將影響所有相關版本。
                    請確認您要刪除整個版本樹，還是只刪除當前選中的版本。
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作區 */}
        <div className="border-t border-cosmic-700 p-4 bg-cosmic-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-cosmic-400">
              {deleteType === 'soft' 
                ? `圖片將移動到垃圾桶，可隨時恢復` 
                : `圖片將被永久刪除，無法恢復`
              }
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 text-cosmic-300 hover:text-cosmic-100 hover:bg-cosmic-700 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 ${
                  deleteType === 'soft'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>刪除中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>
                      {deleteType === 'soft' ? '移至垃圾桶' : '永久刪除'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;