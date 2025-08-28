import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { convertFileSrc } from '@tauri-apps/api/core';
import { RootState } from '../../../store/store';
import { api } from '../../../api';

interface BatchHistorySectionProps {
  className?: string;
}

interface IllustrationItem {
  id: string;
  original_prompt: string;
  enhanced_prompt: string;
  local_file_path?: string;
  model: string;
  width: number;
  height: number;
  status: string;
  created_at: string;
  generation_time_ms?: number;
  is_favorite: boolean;
}

const BatchHistorySection: React.FC<BatchHistorySectionProps> = ({
  className = ''
}) => {
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const [illustrations, setIllustrations] = useState<IllustrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 載入插畫歷史
  useEffect(() => {
    const loadHistory = async () => {
      if (!currentProject?.id) {
        console.log('[BatchHistorySection] 沒有當前專案，跳過載入');
        setLoading(false);
        return;
      }

      try {
        console.log('[BatchHistorySection] 開始載入插畫歷史，專案ID:', currentProject.id);
        setLoading(true);
        setError('');
        
        const response = await api.illustration.getIllustrationHistory(
          currentProject.id,
          undefined, // characterId
          50, // limit
          0   // offset
        );

        console.log('[BatchHistorySection] API 回應:', response);

        if (response && response.length >= 0) {
          console.log('[BatchHistorySection] 成功載入', response.length, '張插畫');
          setIllustrations(response.map(item => ({ ...item, enhanced_prompt: item.enhanced_prompt || '' })));
        } else {
          console.error('[BatchHistorySection] API 回應失敗或無資料');
          setError('載入插畫歷史失敗');
        }
      } catch (err) {
        console.error('[BatchHistorySection] 載入插畫歷史錯誤:', err);
        setError(`載入插畫歷史時發生錯誤: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [currentProject?.id]);

  if (loading) {
    return (
      <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">插畫歷史</h3>
        <div className="text-center py-8 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">插畫歷史</h3>
        <div className="text-center py-8 text-red-400">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (illustrations.length === 0) {
    return (
      <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">插畫歷史</h3>
        <div className="text-center py-8 text-gray-400">
          <p>🎨 還沒有生成過插畫</p>
          <p className="text-sm mt-2">切換到「創建批次」開始生成你的第一張插畫吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">插畫歷史</h3>
        <span className="text-sm text-gray-400">{illustrations.length} 張圖片</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {illustrations.map((item) => (
          <div key={item.id} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors">
            {/* 圖片預覽區域 */}
            <div className="aspect-square bg-gray-900 rounded-lg mb-3 overflow-hidden">
              {item.local_file_path ? (
                <img
                  src={convertFileSrc(item.local_file_path)}
                  alt={item.original_prompt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    // 如果載入失敗，顯示佔位符
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              
              {/* 圖片載入失敗或不存在時的佔位符 */}
              <div className={`w-full h-full flex items-center justify-center text-gray-500 ${item.local_file_path ? 'hidden' : ''}`}>
                <div className="text-center">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="text-xs">預覽不可用</p>
                  {item.local_file_path && (
                    <p className="text-xs mt-1 text-gray-600 truncate max-w-32" title={item.local_file_path}>
                      {item.local_file_path.split('/').pop()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 圖片信息 */}
            <div className="space-y-2">
              <div className="text-sm text-white font-medium line-clamp-2" title={item.original_prompt}>
                {item.original_prompt}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className={`px-2 py-1 rounded ${
                  item.status === 'completed' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {item.status === 'completed' ? '✅ 已完成' : '❌ 失敗'}
                </span>
                <span>{item.model}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{item.width}×{item.height}</span>
                {item.generation_time_ms && (
                  <span>{(item.generation_time_ms / 1000).toFixed(1)}秒</span>
                )}
              </div>
              
              <div className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString('zh-TW')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchHistorySection;