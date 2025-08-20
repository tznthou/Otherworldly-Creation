import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../store/store';

// Redux actions (如果需要的話)
// import { ... } from '../../../../store/slices/visualCreationSlice';

interface GalleryTabProps {
  className?: string;
}

// 模擬的插畫歷史數據類型
interface IllustrationHistoryItem {
  id: string;
  projectId: string;
  imagePath: string;
  thumbnailPath?: string;
  prompt: string;
  originalPrompt: string;
  provider: 'pollinations' | 'imagen';
  isFree: boolean;
  createdAt: string;
  characterIds: string[];
  sceneType: 'portrait' | 'scene' | 'interaction';
  parameters: {
    model: string;
    style?: string;
    width: number;
    height: number;
  };
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
  const [filterSceneType, setFilterSceneType] = useState<'all' | 'portrait' | 'scene' | 'interaction'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'provider' | 'type'>('date');
  
  // 模擬的插畫歷史數據（實際應該從API獲取）
  const [illustrationHistory] = useState<IllustrationHistoryItem[]>([]);

  // 項目角色映射
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

  // 獲取角色名稱
  const getCharacterNames = (characterIds: string[]) => {
    return characterIds.map(id => {
      const char = projectCharacters.find(c => c.id === id);
      return char?.name || '未知角色';
    }).join('、');
  };

  // 過濾和排序插畫
  const getFilteredIllustrations = () => {
    const filtered = illustrationHistory.filter(item => {
      // 項目過濾
      if (currentProject && item.projectId !== currentProject.id) return false;
      
      // 提供商過濾
      if (filterProvider !== 'all' && item.provider !== filterProvider) return false;
      
      // 場景類型過濾
      if (filterSceneType !== 'all' && item.sceneType !== filterSceneType) return false;
      
      // 搜索過濾
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!item.prompt.toLowerCase().includes(searchLower) &&
            !item.originalPrompt.toLowerCase().includes(searchLower) &&
            !getCharacterNames(item.characterIds).toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'provider':
          return a.provider.localeCompare(b.provider);
        case 'type':
          return a.sceneType.localeCompare(b.sceneType);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredIllustrations = getFilteredIllustrations();

  // 場景類型圖標和名稱
  const getSceneTypeIcon = (type: string) => {
    switch (type) {
      case 'portrait': return '👤';
      case 'interaction': return '👥';
      case 'scene': return '🏞️';
      default: return '🎨';
    }
  };

  const getSceneTypeName = (type: string) => {
    switch (type) {
      case 'portrait': return '肖像';
      case 'interaction': return '互動';
      case 'scene': return '場景';
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

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW');
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
                value={filterSceneType}
                onChange={(e) => setFilterSceneType(e.target.value as 'all' | 'portrait' | 'scene' | 'interaction')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="all">所有類型</option>
                <option value="portrait">肖像</option>
                <option value="interaction">互動</option>
                <option value="scene">場景</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'provider' | 'type')}
                className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
              >
                <option value="date">按日期排序</option>
                <option value="provider">按服務排序</option>
                <option value="type">按類型排序</option>
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
              // 網格視圖
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
                {filteredIllustrations.map((item) => (
                  <div
                    key={item.id}
                    className={`
                      relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                      ${selectedImages.has(item.id) 
                        ? 'border-gold-500 ring-2 ring-gold-500/50' 
                        : 'border-cosmic-600 hover:border-cosmic-500'
                      }
                    `}
                    onClick={() => toggleImageSelection(item.id)}
                  >
                    {/* 圖像縮略圖 */}
                    <div className="aspect-square bg-cosmic-700 flex items-center justify-center">
                      {item.thumbnailPath || item.imagePath ? (
                        <img
                          src={`file://${item.thumbnailPath || item.imagePath}`}
                          alt={item.prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-cosmic-400 text-xl">
                          {getSceneTypeIcon(item.sceneType)}
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
                      ${item.isFree 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 text-white'
                      }
                    `}>
                      {item.isFree ? '免費' : '付費'}
                    </div>
                    
                    {/* 懸停信息 */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs truncate font-medium">
                        {getSceneTypeName(item.sceneType)}
                      </p>
                      <p className="text-xs truncate text-gray-300">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
                      {item.thumbnailPath || item.imagePath ? (
                        <img
                          src={`file://${item.thumbnailPath || item.imagePath}`}
                          alt={item.prompt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cosmic-400 text-xl">
                          {getSceneTypeIcon(item.sceneType)}
                        </div>
                      )}
                    </div>
                    
                    {/* 詳細信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-white truncate">
                          {getSceneTypeName(item.sceneType)} - {item.parameters.model}
                        </h4>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs
                          ${item.isFree ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}
                        `}>
                          {item.provider === 'pollinations' ? 'Pollinations' : 'Imagen'}
                        </span>
                      </div>
                      <p className="text-sm text-cosmic-300 truncate mb-1">
                        {item.prompt}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-cosmic-400">
                        <span>{formatDate(item.createdAt)}</span>
                        <span>{item.parameters.width}×{item.parameters.height}</span>
                        {item.characterIds.length > 0 && (
                          <span>角色: {getCharacterNames(item.characterIds)}</span>
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