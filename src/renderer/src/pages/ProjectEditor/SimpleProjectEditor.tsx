import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProjectById } from '../../store/slices/projectsSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../api';
import SimpleAIWritingPanel from '../../components/Editor/SimpleAIWritingPanel';
import { Chapter } from '../../api/models';
import { Descendant } from 'slate';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('SimpleProjectEditor');

const SimpleProjectEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentProject } = useAppSelector(state => state.projects);
  
  const [content, setContent] = useState<Descendant[]>([{
    type: 'paragraph',
    children: [{ text: '' }]
  }]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [_chapters, _setChapters] = useState<Chapter[]>([]);
  const [isSaved, setIsSaved] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // 載入專案和章節資料
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        log.debug('No project ID provided');
        setIsLoading(false);
        return;
      }
      
      log.debug('開始載入專案資料, ID:', id);
      setIsLoading(true);
      
      try {
        // 載入專案資訊
        log.debug('載入專案資訊...');
        await dispatch(fetchProjectById(id));
        log.debug('專案資訊載入完成');
        
        // 載入章節列表
        log.debug('載入章節列表...');
        const chapterList = await api.chapters.getByProjectId(id);
        log.debug('章節列表載入完成, 章節數量:', chapterList.length);
        _setChapters(chapterList);
        
        // 如果有章節，載入第一個章節
        if (chapterList.length > 0) {
          const firstChapter = chapterList[0];
          log.debug('載入第一個章節:', firstChapter.title);
          setCurrentChapter(firstChapter);
          setContent(firstChapter.content || [{
            type: 'paragraph',
            children: [{ text: '' }]
          }]);
          log.debug('章節內容載入完成');
        } else {
          log.debug('沒有章節，創建第一個章節...');
          // 如果沒有章節，創建第一個章節
          const _newChapter = await api.chapters.create({
            projectId: id,
            title: '第一章',
            content: [
              {
                type: 'paragraph',
                children: [{ text: '開始你的創作...' }]
              },
              {
                type: 'paragraph',
                children: [{ text: '' }]
              },
              {
                type: 'paragraph',
                children: [{ text: '第一章：穿越的開始' }]
              },
              {
                type: 'paragraph',
                children: [{ text: '' }]
              },
              {
                type: 'paragraph',
                children: [{ text: '我叫李明，原本是一個普通的大學生。直到那個雷雨交加的夜晚，一道奇異的光芒將我包圍...' }]
              },
              {
                type: 'paragraph',
                children: [{ text: '' }]
              },
              {
                type: 'paragraph',
                children: [{ text: '（繼續你的創作吧！）' }]
              }
            ],
            order: 1
          });
          
          log.debug('新章節創建完成');
          
          // 重新載入章節列表
          const updatedChapters = await api.chapters.getByProjectId(id);
          _setChapters(updatedChapters);
          
          if (updatedChapters.length > 0) {
            const newChapterData = updatedChapters[0];
            setCurrentChapter(newChapterData);
            setContent(newChapterData.content || [{
              type: 'paragraph',
              children: [{ text: '' }]
            }]);
            log.debug('新創建章節載入完成');
          }
        }
        
        log.debug('所有載入完成，設置 isLoading = false');
        
      } catch (error) {
        log.error('載入資料失敗:', error);
      } finally {
        // 確保 isLoading 一定會被設為 false
        log.debug('執行 finally 區塊，設置 isLoading = false');
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, dispatch]);

  // 自動儲存到 SQLite
  useEffect(() => {
    if (!currentChapter || isSaved || isLoading) return;
    
    const timer = setTimeout(async () => {
      // 保存當前游標位置（靜默自動儲存）
      const savedCursorPosition = textAreaRef.current?.selectionStart;
      const wasTextAreaFocused = document.activeElement === textAreaRef.current;
      
      try {
        await api.chapters.update({
          ...currentChapter,
          content: content
        });
        setIsSaved(true);
        log.debug('自動儲存成功');
        
        // 如果 textarea 之前有焦點，恢復游標位置
        if (wasTextAreaFocused && savedCursorPosition !== undefined) {
          setTimeout(() => {
            if (textAreaRef.current) {
              textAreaRef.current.focus();
              textAreaRef.current.setSelectionRange(savedCursorPosition, savedCursorPosition);
            }
          }, 10);
        }
      } catch (error) {
        log.error('自動儲存失敗:', error);
      }
    }, 2000); // 2秒後自動儲存

    return () => clearTimeout(timer);
  }, [content, isSaved, currentChapter, isLoading]);

  const handleSave = async () => {
    if (!currentChapter) return;
    
    // 保存當前游標位置
    const savedCursorPosition = textAreaRef.current?.selectionStart || cursorPosition;
    
    try {
      // 不設置 isLoading，避免隱藏 textarea 導致游標丟失
      await api.chapters.update({
        ...currentChapter,
        content: content
      });
      setIsSaved(true);
      log.debug('手動儲存成功');
      
      // 恢復游標位置
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
          textAreaRef.current.setSelectionRange(savedCursorPosition, savedCursorPosition);
        }
      }, 10);
      
      // 顯示儲存成功提示
      dispatch(addNotification({ 
        type: 'success', 
        title: '儲存成功', 
        message: `章節「${currentChapter.title}」已成功儲存到資料庫`,
        duration: 3000
      }));
    } catch (error) {
      log.error('儲存失敗:', error);
      
      // 顯示儲存失敗提示
      dispatch(addNotification({ 
        type: 'error', 
        title: '儲存失敗', 
        message: `無法儲存章節「${currentChapter.title}」，請檢查連線並重試`,
        duration: 5000
      }));
    }
  };

  const handleAIWrite = async () => {
    if (!currentChapter) {
      dispatch(addNotification({
        type: 'warning',
        title: '無法使用 AI 續寫',
        message: '請先選擇或創建一個章節',
        duration: 3000,
      }));
      return;
    }
    
    // 切換 AI 面板顯示狀態
    setShowAIPanel(!showAIPanel);
  };
  
  // 處理 AI 生成的文本插入
  const handleAITextInsert = (text: string) => {
    // 將文本轉換為 Descendant[] 格式
    const textParagraphs = text.split('\n').map(line => ({
      type: 'paragraph' as const,
      children: [{ text: line }]
    }));
    
    // 將新內容加到現有內容的末尾
    setContent(prev => [...prev, ...textParagraphs]);
    setIsSaved(false);
  };
  
  // 更新游標位置
  const handleTextAreaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // 將字符串轉換為 Descendant[] 格式
    const paragraphs = text.split('\n').map(line => ({
      type: 'paragraph' as const,
      children: [{ text: line }]
    }));
    
    setContent(paragraphs);
    setCursorPosition(e.target.selectionStart);
    setIsSaved(false);
  };
  
  const handleTextAreaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
  };
  
  const handleTextAreaKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
  };

  // Debug 資訊
  log.debug('SimpleProjectEditor render', { isLoading, chapterTitle: currentChapter?.title });

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
            <span className="text-sm text-warm-gold">📖 載入中...</span>
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
            disabled={isLoading || !currentChapter}
            className={`btn-primary ${(isLoading || !currentChapter) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            💾 {isSaved ? '已儲存' : '儲存至資料庫'}
          </button>
          <button 
            onClick={handleAIWrite}
            disabled={isLoading || !currentChapter}
            className={`btn-secondary ${(isLoading || !currentChapter) ? 'opacity-50 cursor-not-allowed' : ''} ${showAIPanel ? 'bg-gold-600' : ''}`}
          >
            🤖 {showAIPanel ? '關閉 AI 面板' : 'AI 續寫'}
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
                <p className="text-xs text-gray-500 mt-2">Debug: isLoading = {isLoading.toString()}</p>
              </div>
            </div>
          ) : (
            <textarea
              ref={textAreaRef}
              value={content.map(node => 
                'type' in node && node.type === 'paragraph' && 'children' in node
                  ? node.children.map((child: { text: string }) => child.text).join('')
                  : ''
              ).join('\n')}
              onChange={handleTextAreaInput}
              onClick={handleTextAreaClick}
              onKeyUp={handleTextAreaKeyUp}
              disabled={!currentChapter}
              className="w-full h-96 bg-cosmic-950 border border-cosmic-600 rounded p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono disabled:opacity-50"
              placeholder={currentChapter ? "開始你的創作..." : "載入中..."}
            />
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-400 flex justify-between">
          <span>字數: {content.map(node => 
            'type' in node && node.type === 'paragraph' && 'children' in node
              ? node.children.map((child: { text: string }) => child.text).join('')
              : ''
          ).join('').length}</span>
          <span>行數: {content.length}</span>
        </div>
      </div>
      
      {/* AI 續寫面板 */}
      {showAIPanel && currentChapter && id && (
        <div className="mt-6">
          <SimpleAIWritingPanel 
            projectId={id} 
            chapterId={currentChapter.id}
            currentPosition={cursorPosition}
            onInsertText={handleAITextInsert}
          />
        </div>
      )}
    </div>
  );
};

export default SimpleProjectEditor;