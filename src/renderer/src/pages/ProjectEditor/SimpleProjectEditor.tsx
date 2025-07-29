import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProjectById } from '../../store/slices/projectsSlice';
import { api } from '../../api';

interface Chapter {
  id: string;
  title: string;
  content: string;
  order_num: number;
}

const SimpleProjectEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentProject } = useAppSelector(state => state.projects);
  
  const [content, setContent] = useState('');
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isSaved, setIsSaved] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 載入專案和章節資料
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        // 載入專案資訊
        await dispatch(fetchProjectById(id));
        
        // 載入章節列表
        const chapterList = await api.chapters.getByProjectId(id);
        setChapters(chapterList);
        
        // 如果有章節，載入第一個章節
        if (chapterList.length > 0) {
          const firstChapter = chapterList[0];
          setCurrentChapter(firstChapter);
          setContent(firstChapter.content || '');
        } else {
          // 如果沒有章節，創建第一個章節
          const newChapter = await api.chapters.create({
            projectId: id,
            title: '第一章',
            content: `開始你的創作...

第一章：穿越的開始

我叫李明，原本是一個普通的大學生。直到那個雷雨交加的夜晚，一道奇異的光芒將我包圍...

（繼續你的創作吧！）`,
            order: 1
          });
          
          // 重新載入章節列表
          const updatedChapters = await api.chapters.getByProjectId(id);
          setChapters(updatedChapters);
          
          if (updatedChapters.length > 0) {
            const newChapterData = updatedChapters[0];
            setCurrentChapter(newChapterData);
            setContent(newChapterData.content || '');
          }
        }
      } catch (error) {
        console.error('載入資料失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, dispatch]);

  // 自動儲存到 SQLite
  useEffect(() => {
    if (!currentChapter || isSaved || isLoading) return;
    
    const timer = setTimeout(async () => {
      try {
        await api.chapters.update({
          id: currentChapter.id,
          title: currentChapter.title,
          content: content,
          order: currentChapter.order_num
        });
        setIsSaved(true);
        console.log('自動儲存成功');
      } catch (error) {
        console.error('自動儲存失敗:', error);
      }
    }, 2000); // 2秒後自動儲存

    return () => clearTimeout(timer);
  }, [content, isSaved, currentChapter, isLoading]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!currentChapter) return;
    
    try {
      await api.chapters.update({
        id: currentChapter.id,
        title: currentChapter.title,
        content: content,
        order: currentChapter.order_num
      });
      setIsSaved(true);
      console.log('手動儲存成功');
    } catch (error) {
      console.error('儲存失敗:', error);
    }
  };

  const handleAIWrite = async () => {
    // TODO: 實現 AI 續寫功能
    setContent(prev => prev + '\n\n[AI 續寫功能開發中...]');
    setIsSaved(false);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gold-400">寫作編輯器</h1>
          {currentProject && (
            <p className="text-gray-400 mt-1">{currentProject.name}</p>
          )}
          {currentChapter && (
            <p className="text-gray-300 mt-1 font-medium">{currentChapter.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-sm text-blue-400">📖 載入中...</span>
          ) : (
            <span className={`text-sm ${isSaved ? 'text-green-400' : 'text-yellow-400'}`}>
              {isSaved ? '✓ 已儲存至資料庫' : '● 未儲存'}
            </span>
          )}
        </div>
      </div>

      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <div className="mb-4 flex gap-2">
          <button 
            onClick={handleSave}
            disabled={isSaved || isLoading || !currentChapter}
            className={`btn-primary ${(isSaved || isLoading || !currentChapter) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            💾 儲存至資料庫
          </button>
          <button 
            onClick={handleAIWrite}
            disabled={isLoading || !currentChapter}
            className={`btn-secondary ${(isLoading || !currentChapter) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            🤖 AI 續寫
          </button>
          <button 
            disabled={isLoading || !currentChapter}
            className={`btn-secondary ${(isLoading || !currentChapter) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            📖 預覽
          </button>
        </div>

        <div className="bg-cosmic-900 border border-cosmic-600 rounded-lg p-4">
          {isLoading ? (
            <div className="w-full h-96 bg-cosmic-950 border border-cosmic-600 rounded p-3 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">📖</div>
                <p className="text-gray-300">載入章節內容中...</p>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={handleContentChange}
              disabled={!currentChapter}
              className="w-full h-96 bg-cosmic-950 border border-cosmic-600 rounded p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono disabled:opacity-50"
              placeholder={currentChapter ? "開始你的創作..." : "載入中..."}
            />
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-400 flex justify-between">
          <span>字數: {content.length}</span>
          <span>行數: {content.split('\n').length}</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleProjectEditor;