import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../store/store';
import type { IllustrationHistoryItem } from '../../../../types/illustration';
import VirtualizedImageGrid from './VirtualizedImageGrid';
import VirtualizedContainer from './VirtualizedContainer';
import { api } from '../../../../api';
import { formatDateTime } from '../../../../utils/dateUtils';

// Redux actions (如果需要的話)
// import { ... } from '../../../../store/slices/visualCreationSlice';

interface GalleryTabProps {
  className?: string;
}

const GalleryTab: React.FC<GalleryTabProps> = ({ className = '' }) => {
  // Redux 狀態 (currently unused)
  // const {} = useSelector((state: RootState) => state.visualCreation);
  
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 本地狀態
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterProvider, setFilterProvider] = useState<'all' | 'pollinations' | 'imagen'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'provider' | 'type'>('date');
  
  // 插畫歷史數據（從API獲取）
  const [illustrationHistory, setIllustrationHistory] = useState<IllustrationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  // 項目角色映射
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

  // 獲取插畫歷史
  const fetchIllustrationHistory = async () => {
    if (!currentProject || loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const history = await api.illustration.getIllustrationHistory(
        currentProject.id,
        undefined, // characterId - 獲取所有角色的插畫
        100, // limit - 獲取最近100張
        0 // offset
      );
      
      setIllustrationHistory(history);
    } catch (err) {
      console.error('獲取插畫歷史失敗:', err);
      setError(err instanceof Error ? err.message : '獲取插畫歷史失敗');
    } finally {
      setLoading(false);
    }
  };

  // 當專案變更時重新獲取數據
  useEffect(() => {
    if (currentProject) {
      fetchIllustrationHistory();
    } else {
      setIllustrationHistory([]);
    }
  }, [currentProject?.id]);

  // 獲取角色名稱
  const getCharacterName = (characterId?: string) => {
    if (!characterId) return '無角色';
    const char = projectCharacters.find(c => c.id === characterId);
    return char?.name || '未知角色';
  };

  // 過濾和排序插畫
  const getFilteredIllustrations = () => {
    const filtered = illustrationHistory.filter(item => {
      // 項目過濾
      if (currentProject && item.project_id !== currentProject.id) return false;
      
      // 提供商過濾
      if (filterProvider !== 'all' && item.provider !== filterProvider) return false;
      
      // 狀態過濾
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      
      // 搜索過濾
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!item.original_prompt.toLowerCase().includes(searchLower) &&
            !(item.enhanced_prompt && item.enhanced_prompt.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'provider':
          return a.provider.localeCompare(b.provider);
        case 'type':
          return a.model.localeCompare(b.model);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredIllustrations = getFilteredIllustrations();

  // 獲取狀態圖標和名稱
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      default: return '❓';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'completed': return '完成';
      case 'failed': return '失敗';
      case 'pending': return '等待';
      case 'processing': return '處理中';
      default: return '未知';
    }
  };

  // 切換圖像選擇
  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedImages.size === filteredIllustrations.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredIllustrations.map(item => item.id)));
    }
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
      hour12: false
    });
  };

  return (
    <div className={`gallery-tab flex flex-col h-full ${className}`}>
      {/* 頂部控制欄 */}
      <div className="flex-shrink-0 bg-cosmic-800/30 rounded-lg p-4 mb-4 border border-cosmic-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 搜索和過濾器 */}
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            {/* 搜索框 */}
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索插畫（提示詞、角色名稱）..."
                className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white placeholder-cosmic-400 text-sm"
              />
            </div>
            
            {/* 過濾器 */}
            <div className="flex gap-2">
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value as 'all' | 'pollinations' | 'imagen')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="all">所有服務</option>
                <option value="pollinations">Pollinations (免費)</option>
                <option value="imagen">Imagen (付費)</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'failed')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="all">所有狀態</option>
                <option value="completed">已完成</option>
                <option value="failed">失敗</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'provider' | 'type')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="date">按日期排序</option>
                <option value="provider">按服務排序</option>
                <option value="type">按模型排序</option>
              </select>
            </div>
          </div>
          
          {/* 視圖控制和操作 */}
          <div className="flex items-center gap-2">
            {/* 視圖模式切換 */}
            <div className="flex bg-cosmic-700 rounded p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-gold-600 text-white' 
                    : 'text-cosmic-300 hover:text-white'
                }`}
              >
                🔳 網格
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-gold-600 text-white' 
                    : 'text-cosmic-300 hover:text-white'
                }`}
              >
                📋 列表
              </button>
            </div>
            
            {/* 選擇控制 */}
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1 bg-cosmic-700 hover:bg-cosmic-600 text-cosmic-200 rounded text-sm transition-colors"
            >
              {selectedImages.size === filteredIllustrations.length ? '取消全選' : '全選'}
            </button>
          </div>
        </div>
        
        {/* 統計信息 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-cosmic-700/50">
          <div className="flex items-center space-x-4 text-sm text-cosmic-400">
            <span>總共 {filteredIllustrations.length} 張插畫</span>
            <span>•</span>
            <span>已選擇 {selectedImages.size} 張</span>
            {currentProject && (
              <>
                <span>•</span>
                <span>專案: {currentProject.name}</span>
              </>
            )}
          </div>
          
          {selectedImages.size > 0 && (
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                📁 導出選中
              </button>
              <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                🗑️ 刪除選中
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="flex-1 bg-cosmic-800/30 rounded-lg border border-cosmic-700 overflow-hidden">
        {filteredIllustrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-6">🖼️</div>
            <h3 className="text-xl font-cosmic text-cosmic-300 mb-2">
              {currentProject ? '尚無插畫' : '請選擇專案'}
            </h3>
            <p className="text-cosmic-400 mb-4">
              {currentProject 
                ? '開始創建您的第一張插畫吧！' 
                : '選擇一個專案後即可查看插畫歷史'
              }
            </p>
            {currentProject && (
              <button className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors">
                🎨 開始創作
              </button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {viewMode === 'grid' ? (
              // 虛擬化網格視圖
              <VirtualizedContainer>
                {({ width, height }) => (
                  <VirtualizedImageGrid
                    illustrations={filteredIllustrations}
                    selectedImages={selectedImages}
                    onToggleSelection={toggleImageSelection}
                    containerWidth={width}
                    containerHeight={height}
                  />
                )}
              </VirtualizedContainer>
            ) : (
              // 列表視圖
              <div className="divide-y divide-cosmic-700">
                {filteredIllustrations.map((item) => (
                  <div
                    key={item.id}
                    className={`
                      p-4 flex items-center space-x-4 hover:bg-cosmic-700/30 transition-colors cursor-pointer
                      ${selectedImages.has(item.id) ? 'bg-gold-900/20' : ''}
                    `}
                    onClick={() => toggleImageSelection(item.id)}
                  >
                    {/* 選擇框 */}
                    <div className={`
                      flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center text-xs
                      ${selectedImages.has(item.id)
                        ? 'bg-gold-500 border-gold-500 text-white'
                        : 'border-cosmic-500 hover:border-gold-400'
                      }
                    `}>
                      {selectedImages.has(item.id) && '✓'}
                    </div>
                    
                    {/* 縮略圖 */}
                    <div className="flex-shrink-0 w-16 h-16 bg-cosmic-700 rounded overflow-hidden">
                      {item.image_url || item.local_file_path ? (
                        <img
                          src={item.image_url || `file://${item.local_file_path}`}
                          alt={item.original_prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cosmic-400 text-xl">
                          {getStatusIcon(item.status)}
                        </div>
                      )}
                    </div>
                    
                    {/* 詳細信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-white truncate">
                          {getStatusName(item.status)} - {item.model}
                        </h4>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs
                          ${item.is_free ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}
                        `}>
                          {item.provider === 'pollinations' ? 'Pollinations' : 'Imagen'}
                        </span>
                      </div>
                      <p className="text-sm text-cosmic-300 truncate mb-1">
                        {item.enhanced_prompt || item.original_prompt}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-cosmic-400">
                        <span>{formatDate(item.created_at)}</span>
                        <span>{item.width}×{item.height}</span>
                        {item.character_id && (
                          <span>角色: {getCharacterName(item.character_id)}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按鈕 */}
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // 預覽圖像
                        }}
                        className="p-1 text-cosmic-400 hover:text-white transition-colors"
                        title="預覽"
                      >
                        👁️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // 下載圖像
                        }}
                        className="p-1 text-cosmic-400 hover:text-white transition-colors"
                        title="下載"
                      >
                        📥
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 使用提示 */}
      <div className="flex-shrink-0 mt-3 text-xs text-cosmic-500">
        <p>💡 <strong>圖庫說明：</strong></p>
        <p>• 點擊圖像可以選擇，支持批量操作（導出、刪除等）</p>
        <p>• 使用搜索和過濾器可以快速找到特定的插畫</p>
        <p>• 切換網格/列表視圖以適應不同的瀏覽需求</p>
      </div>
    </div>
  );
};

export default GalleryTab;