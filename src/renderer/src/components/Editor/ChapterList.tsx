import React, { useState, useMemo } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { Chapter, updateChapter, setCurrentChapter, deleteChapter } from '../../store/slices/chaptersSlice';
import { openModal, addNotification } from '../../store/slices/uiSlice';
import { Menu, MenuItem } from '../UI/Menu';
import ChapterBatchActions from './ChapterBatchActions';
import ConfirmDialog from '../UI/ConfirmDialog';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ChapterList');

interface ChapterListProps {
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
  onCreateChapter: () => void;
  onReorderChapters: (chapters: Chapter[]) => void;
}

const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  selectedChapterId,
  onSelectChapter,
  onCreateChapter,
  onReorderChapters,
}) => {
  const dispatch = useAppDispatch();
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; chapter: Chapter | null}>({
    show: false,
    chapter: null
  });

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, chapterId: string) => {
    setDraggedChapterId(chapterId);
    e.dataTransfer.setData('text/plain', chapterId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetChapterId: string) => {
    e.preventDefault();
    
    if (!draggedChapterId || draggedChapterId === targetChapterId) return;
    
    const sourceChapter = chapters.find(c => c.id === draggedChapterId);
    const targetChapter = chapters.find(c => c.id === targetChapterId);
    
    if (!sourceChapter || !targetChapter) return;
    
    // 創建新的章節數組，按照當前順序排序
    const updatedChapters = [...chapters].sort((a, b) => a.order - b.order);
    
    // 移除拖動的章節
    const filteredChapters = updatedChapters.filter(c => c.id !== draggedChapterId);
    
    // 找到目標章節的索引
    const targetIndex = filteredChapters.findIndex(c => c.id === targetChapterId);
    
    // 在目標位置插入拖動的章節
    filteredChapters.splice(targetIndex, 0, sourceChapter);
    
    // 更新所有章節的順序
    const reorderedChapters = filteredChapters.map((c, index) => ({
      ...c,
      order: index + 1,
    }));
    
    // 更新章節順序
    onReorderChapters(reorderedChapters);
    
    setDraggedChapterId(null);
  };

  const handleDragEnd = () => {
    setDraggedChapterId(null);
  };

  const handleEditChapter = (chapter: Chapter) => {
    dispatch(setCurrentChapter(chapter));
    dispatch(openModal('chapterManage'));
  };

  const handleRenameChapter = (chapter: Chapter) => {
    const newTitle = prompt('請輸入新的章節標題：', chapter.title);
    if (newTitle && newTitle !== chapter.title) {
      dispatch(updateChapter({
        ...chapter,
        title: newTitle,
      }));
    }
  };

  const handleDeleteChapter = async (chapter: Chapter) => {
    if (!deleteConfirm.chapter) return;
    
    try {
      await dispatch(deleteChapter(chapter.id)).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        title: '刪除成功',
        message: `章節「${chapter.title}」已成功刪除`,
        duration: 3000,
      }));
      
      setDeleteConfirm({ show: false, chapter: null });
    } catch (error) {
      log.error('刪除章節失敗:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: '刪除失敗',
        message: '刪除章節時發生錯誤，請稍後再試',
      }));
    }
  };
  
  // 過濾章節列表
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    
    return chapters.filter(chapter => 
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.order.toString().includes(searchQuery)
    );
  }, [chapters, searchQuery]);

  return (
    <>
    <div className="h-full flex flex-col">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-warm-gold">章節列表</h2>
          <div className="flex space-x-2">
            {chapters.length > 0 && (
              <ChapterBatchActions 
                chapters={chapters}
                onReorderChapters={onReorderChapters}
              />
            )}
            <button
              onClick={onCreateChapter}
              className="btn-secondary text-sm px-3 py-1"
              title="新增章節"
            >
              ➕ 新增
            </button>
          </div>
        </div>
        
        {chapters.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="搜尋章節..."
                className="w-full bg-bg-light/50 backdrop-blur-sm border border-warm-gold/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-warm-gold/50 text-sm"
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
            
            {searchQuery && (
              <div className="mt-2 text-xs text-gray-400">
                找到 {filteredChapters.length} 個結果
                {filteredChapters.length === 0 && searchQuery && (
                  <div className="mt-2 text-yellow-500">
                    沒有找到符合「{searchQuery}」的章節
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {chapters.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-400 mb-4">還沒有任何章節</p>
            <button
              onClick={onCreateChapter}
              className="btn-primary text-sm"
            >
              創建第一個章節
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...filteredChapters]
              .sort((a, b) => a.order - b.order)
              .map((chapter) => (
                <div
                  key={chapter.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, chapter.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, chapter.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectChapter(chapter.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors relative group ${
                    selectedChapterId === chapter.id
                      ? 'bg-warm-gold/20 border border-warm-gold/30'
                      : 'bg-bg-light/50 backdrop-blur-sm hover:bg-bg-dark/80'
                  } ${draggedChapterId === chapter.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-bg-dark/80 text-xs text-warm-gold mr-2">
                        {chapter.chapterNumber || chapter.order}
                      </span>
                      <h3 className="font-medium text-white truncate pr-6">
                        {chapter.title}
                      </h3>
                    </div>
                    {(chapter.wordCount && chapter.wordCount > 0) && (
                      <span className="text-xs text-gray-400 bg-bg-dark/80 px-2 py-1 rounded-full">
                        {chapter.wordCount} 字
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                    <span className="flex items-center">
                      <span className="mr-1">📅</span>
                      {new Date(chapter.updatedAt).toLocaleDateString('zh-TW')}
                    </span>
                    
                    {/* 章節狀態指示器 - 可以根據需要擴展 */}
                    <div className="flex items-center space-x-1">
                      {(!chapter.wordCount || chapter.wordCount === 0) && (
                        <span title="空白章節" className="text-yellow-500">⚠️</span>
                      )}
                      {new Date(chapter.updatedAt).getTime() > Date.now() - 86400000 && (
                        <span title="最近更新" className="text-warm-gold">🆕</span>
                      )}
                    </div>
                  </div>
                  
                  {/* 拖動提示 */}
                  <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-move">
                    <span className="text-gray-500 text-xs">⋮⋮</span>
                  </div>
                  
                  {/* 操作選單 */}
                  <Menu
                    trigger={
                      <button
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-bg-dark/80 hover:bg-bg-light flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <span className="text-gray-400">⋮</span>
                      </button>
                    }
                    position="bottom-right"
                  >
                    <MenuItem icon="✏️" onClick={() => handleRenameChapter(chapter)}>重命名</MenuItem>
                    <MenuItem icon="⚙️" onClick={() => handleEditChapter(chapter)}>管理章節</MenuItem>
                    <MenuItem icon="📋" onClick={() => navigator.clipboard.writeText(chapter.title)}>複製標題</MenuItem>
                    <MenuItem 
                      icon="🗑️" 
                      onClick={() => {
                        log.debug('刪除按鈕被點擊', chapter);
                        setDeleteConfirm({ show: true, chapter });
                      }}
                      className="text-red-500 hover:text-red-400"
                    >
                      刪除章節
                    </MenuItem>
                  </Menu>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
    
    {/* 刪除確認對話框 */}
    {deleteConfirm.show && (
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="確認刪除"
        message={`確定要刪除章節「${deleteConfirm.chapter?.title}」嗎？此操作將永久刪除所有內容，且無法復原。`}
        confirmText="刪除"
        cancelText="取消"
        onConfirm={() => deleteConfirm.chapter && handleDeleteChapter(deleteConfirm.chapter)}
        onCancel={() => setDeleteConfirm({ show: false, chapter: null })}
      />
    )}
  </>);
};

export default ChapterList;