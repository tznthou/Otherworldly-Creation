import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { Chapter, updateChapter } from '../../store/slices/chaptersSlice';
import { addNotification } from '../../store/slices/uiSlice';

interface ChapterNotesProps {
  chapter: Chapter;
}

const ChapterNotes: React.FC<ChapterNotesProps> = ({ chapter }) => {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 從章節的 content 中提取筆記（如果有的話）
  useEffect(() => {
    try {
      // 假設筆記存儲在章節的 metadata 中
      const metadata = chapter.metadata || {};
      setNotes(metadata.notes || '');
    } catch (error) {
      console.error('讀取章節筆記失敗:', error);
      setNotes('');
    }
  }, [chapter]);

  const handleSaveNotes = async () => {
    setIsSaving(true);

    try {
      // 更新章節的 metadata
      const updatedChapter = {
        ...chapter,
        metadata: {
          ...(chapter.metadata || {}),
          notes,
        },
      };

      await dispatch(updateChapter(updatedChapter)).unwrap();

      dispatch(addNotification({
        type: 'success',
        title: '筆記已儲存',
        message: '章節筆記已成功儲存',
        duration: 3000,
      }));
    } catch (error) {
      console.error('儲存章節筆記失敗:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: '儲存失敗',
        message: '儲存章節筆記時發生錯誤',
        duration: 3000,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg overflow-hidden">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-cosmic-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <span className="text-gold-400 mr-2">📝</span>
          <h3 className="font-medium text-gold-400">章節筆記</h3>
        </div>
        <span className="text-gray-400">
          {isExpanded ? '▼' : '►'}
        </span>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-cosmic-700">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="在這裡添加章節筆記、大綱或靈感..."
            className="w-full h-32 bg-cosmic-900 border border-cosmic-700 rounded-lg p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="btn-primary text-sm"
            >
              {isSaving ? '儲存中...' : '儲存筆記'}
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <p>提示：章節筆記僅供參考，不會顯示在正文中。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterNotes;