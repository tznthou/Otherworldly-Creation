import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { Chapter } from '../../api/models';
import { addNotification } from '../../store/slices/uiSlice';

interface ChapterBatchActionsProps {
  chapters: Chapter[];
  onReorderChapters: (chapters: Chapter[]) => void;
}

const ChapterBatchActions: React.FC<ChapterBatchActionsProps> = ({
  chapters,
  onReorderChapters,
}) => {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);

  const handleSortByTitle = () => {
    if (chapters.length <= 1) {
      dispatch(addNotification({
        type: 'info',
        title: '無法排序',
        message: '需要至少兩個章節才能進行排序',
        duration: 3000,
      }));
      return;
    }

    const sortedChapters = [...chapters]
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))
      .map((chapter, index) => ({
        ...chapter,
        order: index + 1,
      }));

    onReorderChapters(sortedChapters);
    setIsOpen(false);
    
    dispatch(addNotification({
      type: 'success',
      title: '排序完成',
      message: '章節已按標題字母順序排序',
      duration: 3000,
    }));
  };

  const handleSortByDate = () => {
    if (chapters.length <= 1) {
      dispatch(addNotification({
        type: 'info',
        title: '無法排序',
        message: '需要至少兩個章節才能進行排序',
        duration: 3000,
      }));
      return;
    }

    const sortedChapters = [...chapters]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((chapter, index) => ({
        ...chapter,
        order: index + 1,
      }));

    onReorderChapters(sortedChapters);
    setIsOpen(false);
    
    dispatch(addNotification({
      type: 'success',
      title: '排序完成',
      message: '章節已按創建日期排序',
      duration: 3000,
    }));
  };

  const handleReverseOrder = () => {
    if (chapters.length <= 1) {
      dispatch(addNotification({
        type: 'info',
        title: '無法反轉',
        message: '需要至少兩個章節才能反轉順序',
        duration: 3000,
      }));
      return;
    }

    const sortedChapters = [...chapters]
      .sort((a, b) => a.order - b.order) // 先確保按當前順序排序
      .reverse() // 反轉順序
      .map((chapter, index) => ({
        ...chapter,
        order: index + 1,
      }));

    onReorderChapters(sortedChapters);
    setIsOpen(false);
    
    dispatch(addNotification({
      type: 'success',
      title: '順序已反轉',
      message: '章節順序已成功反轉',
      duration: 3000,
    }));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary text-sm px-3 py-1 flex items-center"
        title="批次操作"
      >
        <span>⚙️</span>
        <span className="ml-1">批次</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg shadow-lg z-10 w-48">
          <div className="p-2">
            <button
              onClick={handleSortByTitle}
              className="w-full text-left px-3 py-2 hover:bg-bg-dark/80 rounded text-sm flex items-center"
            >
              <span className="mr-2">🔤</span>
              按標題排序
            </button>
            <button
              onClick={handleSortByDate}
              className="w-full text-left px-3 py-2 hover:bg-bg-dark/80 rounded text-sm flex items-center"
            >
              <span className="mr-2">📅</span>
              按創建日期排序
            </button>
            <button
              onClick={handleReverseOrder}
              className="w-full text-left px-3 py-2 hover:bg-bg-dark/80 rounded text-sm flex items-center"
            >
              <span className="mr-2">🔄</span>
              反轉章節順序
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterBatchActions;