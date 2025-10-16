import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { Chapter, updateChapter } from '../../store/slices/chaptersSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ChapterNotes');

interface ChapterNotesProps {
  chapter: Chapter;
}

const ChapterNotes: React.FC<ChapterNotesProps> = ({ chapter }) => {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 從章節的 metadata 中提取筆記（如果有的話）
  useEffect(() => {
    try {
      // metadata 是 JSON 字符串，需要解析
      if (chapter.metadata) {
        const parsedMetadata = JSON.parse(chapter.metadata);
        setNotes(parsedMetadata.notes || '');
      } else {
        setNotes('');
      }
    } catch (error) {
      log.error('讀取章節筆記失敗:', error);
      setNotes('');
    }
  }, [chapter]);

  const handleSaveNotes = async () => {
    setIsSaving(true);

    try {
      // 解析現有的 metadata（如果有的話）
      let existingMetadata = {};
      if (chapter.metadata) {
        try {
          existingMetadata = JSON.parse(chapter.metadata);
        } catch (_e) {
          log.warn('無法解析現有 metadata，使用空對象');
        }
      }
      
      // 更新章節的 metadata
      const newMetadata = {
        ...existingMetadata,
        notes,
      };
      
      const updatedChapter = {
        ...chapter,
        metadata: JSON.stringify(newMetadata),
      };

      await dispatch(updateChapter(updatedChapter)).unwrap();

      dispatch(addNotification({
        type: 'success',
        title: '筆記已儲存',
        message: '章節筆記已成功儲存',
        duration: 3000,
      }));
    } catch (error) {
      log.error('儲存章節筆記失敗:', error);
      
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
    <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg overflow-hidden">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-bg-dark/80"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <span className="text-warm-gold mr-2">📝</span>
          <h3 className="font-medium text-warm-gold">章節筆記</h3>
        </div>
        <span className="text-gray-400">
          {isExpanded ? '▼' : '►'}
        </span>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-warm-gold/10">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="在這裡添加章節筆記、大綱或靈感..."
            className="w-full h-32 bg-bg-dark border border-warm-gold/10 rounded-lg p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
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