import React from 'react';
import type { Project } from '../../../../../api/models';
import type { IllustrationHistoryItem } from '../../../../../types/illustration';

interface GalleryHeaderProps {
  currentProject: Project | null;
  filteredIllustrations: IllustrationHistoryItem[];
  selectedImages: Set<string>;
  
  // 搜索和過濾
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterProvider: 'all' | 'pollinations' | 'imagen';
  setFilterProvider: (provider: 'all' | 'pollinations' | 'imagen') => void;
  filterStatus: 'all' | 'completed' | 'failed';
  setFilterStatus: (status: 'all' | 'completed' | 'failed') => void;
  filterVersions: 'all' | 'latest' | 'original' | 'multiple';
  setFilterVersions: (versions: 'all' | 'latest' | 'original' | 'multiple') => void;
  sortBy: 'date' | 'provider' | 'type' | 'version' | 'custom';
  setSortBy: (sort: 'date' | 'provider' | 'type' | 'version' | 'custom') => void;
  
  // 視圖控制
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleSelectAll: () => void;
  
  // 操作按鈕
  isExporting: boolean;
  exportProgress: number;
  onOpenImageNaming: () => void;
  onOpenEbookPreparation: () => void;
  onOpenEbookIntegration: () => void;
  onOpenBatchExport: () => void;
  onDeleteSelected: () => void;
}

const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  currentProject,
  filteredIllustrations,
  selectedImages,
  searchTerm,
  setSearchTerm,
  filterProvider,
  setFilterProvider,
  filterStatus,
  setFilterStatus,
  filterVersions,
  setFilterVersions,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  toggleSelectAll,
  isExporting,
  exportProgress,
  onOpenImageNaming: _onOpenImageNaming,
  onOpenEbookPreparation,
  onOpenEbookIntegration: _onOpenEbookIntegration,
  onOpenBatchExport,
  onDeleteSelected,
}) => {
  return (
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
              placeholder="搜索插畫（提示詞、版本號、標籤）..."
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
            
            {/* 版本篩選器 */}
            <select
              value={filterVersions}
              onChange={(e) => setFilterVersions(e.target.value as 'all' | 'latest' | 'original' | 'multiple')}
              className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
            >
              <option value="all">所有版本</option>
              <option value="latest">僅最新版本</option>
              <option value="original">僅原創版本</option>
              <option value="multiple">有多版本</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'provider' | 'type' | 'version' | 'custom')}
              className="px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
            >
              <option value="date">按日期排序</option>
              <option value="provider">按服務排序</option>
              <option value="type">按模型排序</option>
              <option value="version">按版本排序</option>
              <option value="custom">自定義排序 {sortBy === 'custom' && '✓'}</option>
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
          <span>•</span>
          <span>
            {filteredIllustrations.filter(item => item.totalVersions && item.totalVersions > 1).length} 個多版本圖片
          </span>
          {currentProject && (
            <>
              <span>•</span>
              <span>專案: {currentProject.name}</span>
            </>
          )}
        </div>
        
        {selectedImages.size > 0 && (
          <div className="flex items-center space-x-3">
            {/* 導出說明 */}
            <div className="flex items-center text-xs text-cosmic-400">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              導出位置：手動選擇資料夾
            </div>
            
            {/* 導出按鈕群組 */}
            <div className="flex items-center space-x-2">
              {/* 電子書排版功能 */}
              <div className="flex items-center space-x-2 mr-2 pr-2 border-r border-cosmic-600">
                <button
                  onClick={onOpenEbookPreparation}
                  className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                  title="電子書排版預備 - 智能整理圖片並配置章節排版（包含重命名功能，不影響現有PDF輸出功能）"
                >
                  📚 電子書排版 ({selectedImages.size})
                </button>
              </div>
              
              {/* 導出功能 */}
              <button
                onClick={onOpenBatchExport}
                disabled={isExporting}
                className="px-3 py-1 bg-warm-gold hover:bg-warm-gold disabled:bg-warm-gold/25 text-white rounded text-sm transition-colors flex items-center gap-2"
                title="開啟導出功能，支援快速導出和批次處理"
              >
                {isExporting ? (
                  <>📤 導出中... ({exportProgress}%)</>
                ) : (
                  <>📥 導出 ({selectedImages.size})</>
                )}
              </button>
              <button 
                onClick={onDeleteSelected}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                title="永久刪除選中的圖片，此操作無法復原"
              >
                🗑️ 刪除選中
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryHeader;