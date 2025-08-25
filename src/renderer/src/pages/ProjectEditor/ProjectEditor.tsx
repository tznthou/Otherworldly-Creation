import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Descendant, Editor } from 'slate';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  fetchChaptersByProjectId, 
  setCurrentChapter, 
  updateCurrentChapterContent,
  updateChapter,
  Chapter
} from '../../store/slices/chaptersSlice';
import { fetchProjectById } from '../../store/slices/projectsSlice';
import { openModal } from '../../store/slices/uiSlice';
import { updateEditorStats, setCurrentChapterTitle, setEditorActive } from '../../store/slices/editorStatsSlice';
import { useEditorStats } from '../../hooks/useEditorStats';
import SlateEditor from '../../components/Editor/SlateEditor';
import EditorSettingsPanel from '../../components/Editor/EditorSettingsPanel';
import ReadingModeOverlay from '../../components/Editor/ReadingModeOverlay';
import FocusWritingModeOverlay from '../../components/Editor/FocusWritingModeOverlay';
import ChapterList from '../../components/Editor/ChapterList';
import ChapterNotes from '../../components/Editor/ChapterNotes';
import AIWritingPanel from '../../components/Editor/AIWritingPanel';
import { PlotAnalysisPanel } from '../../components/AI/PlotAnalysisPanel';
import type { PlotSuggestion } from '../../services/plotAnalysisService';
import LazyCharacterAnalysisPanel from '../../components/AI/LazyCharacterAnalysisPanel';
import AIStatusIndicator from '../../components/UI/AIStatusIndicator';
import SaveStatusIndicator from '../../components/UI/SaveStatusIndicator';
import SaveStatusPanel from '../../components/UI/SaveStatusPanel';
import { useAutoSave } from '../../hooks/useAutoSave';
import { selectIsSettingsOpen, selectIsReadingMode, selectIsFocusWritingMode } from '../../store/slices/editorSlice';
import { ErrorHandler, withErrorBoundary } from '../../utils/errorUtils';
import { useNotification } from '../../components/UI/NotificationSystem';
import { OperationStatus } from '../../components/UI/StatusIndicator';
import { SimpleProgressBar } from '../../components/UI/ProgressIndicator';
import { MiniErrorFallback } from '../../components/UI/ErrorFallback';
import TutorialOverlay, { useTutorial } from '../../components/Tutorial/TutorialOverlay';
import { editorTutorial, aiTutorial } from '../../data/tutorialSteps';

const ProjectEditorContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const notification = useNotification();
  
  const { currentProject } = useAppSelector(state => state.projects);
  const { chapters, currentChapter, loading } = useAppSelector(state => state.chapters);
  const { generating: isGenerating } = useAppSelector(state => state.ai);
  const isSettingsOpen = useAppSelector(selectIsSettingsOpen);
  const _isReadingMode = useAppSelector(selectIsReadingMode);
  const _isFocusWritingMode = useAppSelector(selectIsFocusWritingMode);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(currentChapter?.id || null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showPlotAnalysisPanel, setShowPlotAnalysisPanel] = useState(false);
  const [showCharacterAnalysisPanel, setShowCharacterAnalysisPanel] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentEditor, setCurrentEditor] = useState<Editor | undefined>(undefined); // 新增：存儲當前編輯器實例
  
  // 編輯器統計數據
  const editorStats = useEditorStats(currentEditor, currentChapter?.content);
  
  // 同步編輯器統計數據到 Redux store
  useEffect(() => {
    dispatch(updateEditorStats(editorStats));
  }, [dispatch, editorStats]);
  
  // 同步當前章節標題到 Redux store
  useEffect(() => {
    dispatch(setCurrentChapterTitle(currentChapter?.title));
  }, [dispatch, currentChapter?.title]);
  
  // 設置編輯器活動狀態
  useEffect(() => {
    dispatch(setEditorActive(true));
    
    return () => {
      dispatch(setEditorActive(false));
    };
  }, [dispatch]);
  
  // 教學系統
  const {
    isActive: isTutorialActive,
    currentStep,
    currentTutorialId,
    setCurrentStep,
    completeTutorial,
    skipTutorial
  } = useTutorial();
  
  // 添加調試日誌
  console.log('ProjectEditor tutorial state:', { 
    isTutorialActive, 
    currentTutorialId, 
    currentStep,
    editorActive: isTutorialActive && currentTutorialId === 'editor',
    aiActive: isTutorialActive && currentTutorialId === 'ai'
  });
  
  // 自動儲存回調函數（移除 notification 依賴項避免無限重新渲染）
  const handleAutoSaveSuccess = useCallback(() => {
    notification.success('儲存成功', '章節已自動儲存');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // notification 方法是穩定的，不需要作為依賴項

  const handleAutoSaveError = useCallback((error: Error) => {
    notification.error('儲存失敗', error.message);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // notification 方法是穩定的，不需要作為依賴項

  // Editor selection 狀態管理
  const editorSelectionRef = useRef<{
    saveCurrentSelection?: () => void;
    restoreSelection?: () => void;
    hasStoredSelection?: () => boolean;
  }>({});
  
  // 自動儲存
  const { 
    saveNow, 
    hasUnsavedChanges: _hasUnsavedChanges, 
    isSaving, 
    autoSaveEnabled: _autoSaveEnabled,
    autoSaveStatus: _autoSaveStatus,
    lastSaved: _lastSaved 
  } = useAutoSave({
    onSave: handleAutoSaveSuccess,
    onError: handleAutoSaveError,
    onBeforeSave: () => {
      // 在自動保存前保存selection狀態
      editorSelectionRef.current.saveCurrentSelection?.();
    },
    onAfterSave: () => {
      // 在自動保存後恢復selection狀態
      if (editorSelectionRef.current.hasStoredSelection?.()) {
        editorSelectionRef.current.restoreSelection?.();
      }
    }
  });

  // 載入專案和章節資料
  useEffect(() => {
    const loadProjectData = async () => {
      if (!id) return;
      
      try {
        setLoadingProgress(20);
        
        // 載入專案資料
        await dispatch(fetchProjectById(id)).unwrap();
        setLoadingProgress(60);
        
        // 載入章節資料
        await dispatch(fetchChaptersByProjectId(id)).unwrap();
        setLoadingProgress(100);
        
        notification.success('專案載入完成', '專案資料已成功載入');
      } catch (error) {
        ErrorHandler.handleDatabaseError(error, { projectId: id });
        notification.error('載入失敗', '無法載入專案資料，請重試');
        
        // 如果載入失敗，返回首頁
        setTimeout(() => navigate('/'), 3000);
      }
    };

    loadProjectData();
    // 移除 notification 依賴項，避免因為 notification 對象變化導致重複載入
  }, [id, dispatch, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // 選擇章節：優先使用 currentChapter，否則選擇第一個章節
  useEffect(() => {
    if (chapters.length > 0) {
      // 如果有 currentChapter 但 selectedChapterId 不匹配，同步它們
      if (currentChapter && currentChapter.id !== selectedChapterId) {
        setSelectedChapterId(currentChapter.id);
      }
      // 如果沒有 currentChapter 也沒有 selectedChapterId，選擇第一個章節
      else if (!currentChapter && !selectedChapterId) {
        const firstChapter = chapters[0];
        setSelectedChapterId(firstChapter.id);
        dispatch(setCurrentChapter(firstChapter));
      }
    }
  }, [chapters, currentChapter, selectedChapterId, dispatch]);

  // 檢查 URL 參數，自動開啟劇情分析面板
  useEffect(() => {
    const shouldOpenPlotAnalysis = searchParams.get('plotAnalysis') === 'true';
    if (shouldOpenPlotAnalysis && !showPlotAnalysisPanel && currentChapter) {
      setShowPlotAnalysisPanel(true);
      setShowAIPanel(false);
      notification.info('劇情分析', '正在為您開啟劇情分析面板...');
      
      // 清除 URL 參數，避免重複觸發
      searchParams.delete('plotAnalysis');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showPlotAnalysisPanel, currentChapter, notification]);

  // 處理章節選擇
  const handleChapterSelect = useCallback((chapterId: string) => {
    console.log('🔍 [ProjectEditor] 用戶選擇章節:', chapterId);
    console.log('🔍 [ProjectEditor] 可用章節列表:', chapters.map(c => ({
      id: c.id,
      title: c.title,
      contentType: typeof c.content,
      contentLength: Array.isArray(c.content) ? c.content.length : 'not array'
    })));
    
    const chapter = chapters.find(c => c.id === chapterId);
    console.log('🔍 [ProjectEditor] 找到的章節:', chapter ? {
      id: chapter.id,
      title: chapter.title,
      contentType: typeof chapter.content,
      contentLength: Array.isArray(chapter.content) ? chapter.content.length : 'not array',
      contentPreview: Array.isArray(chapter.content) && chapter.content.length > 0
        ? JSON.stringify(chapter.content[0]).substring(0, 100) + '...'
        : 'empty or invalid'
    } : 'NOT FOUND');
    
    if (chapter) {
      setSelectedChapterId(chapterId);
      console.log('🔍 [ProjectEditor] 更新 selectedChapterId 為:', chapterId);
      dispatch(setCurrentChapter(chapter));
      console.log('🔍 [ProjectEditor] 已分派 setCurrentChapter action');
    }
  }, [chapters, dispatch]);
  
  // 處理章節重新排序
  const handleReorderChapters = useCallback(async (reorderedChapters: Chapter[]) => {
    try {
      notification.info('重新排序中', '正在更新章節順序...');
      
      // 更新所有章節的順序
      for (const chapter of reorderedChapters) {
        await dispatch(updateChapter(chapter)).unwrap();
      }
      
      // 移除重新獲取章節列表的調用，避免無限循環
      // 章節順序已通過 updateChapter 在 Redux 中更新
      
      notification.success('排序完成', '章節順序已更新');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, { action: 'reorder_chapters', projectId: id });
      notification.error('排序失敗', '無法更新章節順序，請重試');
    }
  }, [dispatch, id, notification]);

  // 處理編輯器內容變化
  const handleEditorChange = useCallback((value: Descendant[]) => {
    // 立即更新當前章節內容 (Redux 狀態)
    dispatch(updateCurrentChapterContent(value));
    
    // 同步更新 chapters 數組中的對應章節
    if (currentChapter) {
      const updatedChapter = {
        ...currentChapter,
        content: value, // 保持物件格式，API 層會處理序列化
      };
      
      // 異步更新數據庫
      dispatch(updateChapter(updatedChapter)).catch((error) => {
        console.error('章節內容同步失敗:', error);
      });
    }
  }, [dispatch, currentChapter]);

  // 創建新章節
  const handleCreateChapter = useCallback(() => {
    dispatch(openModal('createChapter'));
  }, [dispatch]);

  // 處理編輯器就緒回調
  const handleEditorReady = useCallback((editor: Editor, selectionMethods?: {
    saveCurrentSelection: () => void;
    restoreSelection: () => void;
    hasStoredSelection: () => boolean;
  }) => {
    setCurrentEditor(editor);
    // 保存selection管理方法的引用
    if (selectionMethods) {
      editorSelectionRef.current = selectionMethods;
    }
    console.log('編輯器已準備好:', editor);
  }, []);

  // 處理 AI 續寫 - 開啟 AI 面板
  const handleAIWrite = useCallback(() => {
    if (!showAIPanel) {
      setShowAIPanel(true);
      setShowPlotAnalysisPanel(false); // 關閉劇情分析面板
      setShowCharacterAnalysisPanel(false); // 關閉角色分析面板
      notification.info('AI 續寫', '請在右側面板中設定參數並生成續寫內容');
    } else {
      setShowAIPanel(false);
    }
  }, [showAIPanel, notification]);

  // 處理劇情分析 - 開啟劇情分析面板
  const handlePlotAnalysis = useCallback(() => {
    if (!showPlotAnalysisPanel) {
      setShowPlotAnalysisPanel(true);
      setShowAIPanel(false); // 關閉AI續寫面板
      setShowCharacterAnalysisPanel(false); // 關閉角色分析面板
      notification.info('劇情分析', '準備開始深度分析您的故事劇情');
    } else {
      setShowPlotAnalysisPanel(false);
    }
  }, [showPlotAnalysisPanel, notification]);

  // 處理角色分析 - 開啟角色分析面板
  const handleCharacterAnalysis = useCallback(() => {
    if (!showCharacterAnalysisPanel) {
      setShowCharacterAnalysisPanel(true);
      setShowAIPanel(false); // 關閉AI續寫面板
      setShowPlotAnalysisPanel(false); // 關閉劇情分析面板
      notification.info('角色分析', '準備開始深度分析您的角色特徵');
    } else {
      setShowCharacterAnalysisPanel(false);
    }
  }, [showCharacterAnalysisPanel, notification]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-bounce">📚</div>
            <h2 className="text-2xl font-cosmic text-gold-500 mb-2">載入專案中</h2>
            <p className="text-gray-400">正在載入專案資料...</p>
          </div>
          
          <SimpleProgressBar 
            progress={loadingProgress} 
            label="載入進度"
            className="mb-4"
          />
          
          <OperationStatus
            isLoading={loading}
            loadingText="載入專案資料中..."
          />
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <MiniErrorFallback
        error={new Error('專案不存在或載入失敗')}
        resetError={() => navigate('/')}
        title="專案不存在"
      />
    );
  }

  const editorContent = (
    <div className="min-h-full flex" style={{ overflowX: 'auto' }}>
      {/* 章節列表側邊欄 */}
      <div className="w-80 bg-cosmic-900 border-r border-cosmic-700 flex flex-col">
        {/* 專案標題 */}
        <div className="p-4 border-b border-cosmic-700">
          <h1 className="text-xl font-cosmic text-gold-500 mb-2">
            {currentProject.name}
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {currentProject.type === 'isekai' && '異世界'}
              {currentProject.type === 'school' && '校園'}
              {currentProject.type === 'scifi' && '科幻'}
              {currentProject.type === 'fantasy' && '奇幻'}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2 py-1 rounded-full bg-cosmic-800 text-gold-400" style={{ backgroundColor: '#2a2139' }}>
                {currentProject?.novelLength === 'short' && '短篇'}
                {currentProject?.novelLength === 'medium' && '中篇'}
                {currentProject?.novelLength === 'long' && '長篇'}
                {!currentProject?.novelLength && '中篇'}
              </span>
            </div>
          </div>
        </div>

        {/* 章節列表 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" data-tutorial="chapter-list">
          <ChapterList
            chapters={chapters}
            selectedChapterId={selectedChapterId}
            onSelectChapter={handleChapterSelect}
            onCreateChapter={handleCreateChapter}
            onReorderChapters={handleReorderChapters}
          />
        </div>

        {/* 狀態欄 */}
        <div className="p-4 border-t border-cosmic-700">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>共 {chapters.length} 章節</span>
            <button
              onClick={() => setShowSavePanel(true)}
              className="text-xs text-gray-400 hover:text-gold-400 transition-colors"
              title="查看儲存狀態"
            >
              儲存管理
            </button>
          </div>
          
          {/* 儲存狀態指示器 */}
          <div className="mb-2">
            <SaveStatusIndicator size="small" />
          </div>
          
          <AIStatusIndicator />
        </div>
      </div>

      {/* 編輯器區域 */}
      <div className="flex-1 flex relative" style={{ minWidth: '800px' }}>
        {/* 主編輯區 */}
        <div className="flex-1 flex flex-col">
          {(() => {
            // 調試：記錄當前要渲染的章節
            if (currentChapter) {
              console.log('🔍 [ProjectEditor] 準備渲染章節:', {
                id: currentChapter.id,
                title: currentChapter.title,
                contentType: typeof currentChapter.content,
                contentLength: Array.isArray(currentChapter.content) ? currentChapter.content.length : 'not array',
                contentPreview: Array.isArray(currentChapter.content) && currentChapter.content.length > 0
                  ? JSON.stringify(currentChapter.content[0]).substring(0, 120) + '...'
                  : 'empty or invalid',
                selectedChapterId: selectedChapterId
              });
            }
            return null;
          })()}
          {currentChapter ? (
            <>
              {/* 章節標題欄 */}
              <div className="bg-cosmic-800 border-b border-cosmic-700 px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#2a2139', borderColor: '#3d3557', zIndex: 10 }}>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gold-500 text-cosmic-900 flex items-center justify-center font-bold text-sm mr-3">
                    {currentChapter?.chapterNumber || currentChapter?.order || '1'}
                  </div>
                  <div>
                    <h2 className="text-lg font-cosmic text-gold-400">
                      第 {currentChapter?.chapterNumber || currentChapter?.order || '1'} 章
                    </h2>
                    <h3 className="text-white font-medium">
                      {currentChapter?.title || '章節標題'}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-xs text-gray-400">
                    {currentChapter?.wordCount ? `${currentChapter.wordCount} 字` : '未統計'}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* 劇情分析按鈕 */}
                    <button
                      onClick={handlePlotAnalysis}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 ${
                        showPlotAnalysisPanel
                          ? 'bg-purple-600 text-white'
                          : 'bg-cosmic-700 hover:bg-purple-600/20 text-purple-300 hover:text-purple-200'
                      }`}
                      title="劇情分析"
                    >
                      <span>🎭</span>
                      <span>劇情</span>
                    </button>
                    
                    {/* 角色分析按鈕 */}
                    <button
                      onClick={handleCharacterAnalysis}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 ${
                        showCharacterAnalysisPanel
                          ? 'bg-blue-600 text-white'
                          : 'bg-cosmic-700 hover:bg-blue-600/20 text-blue-300 hover:text-blue-200'
                      }`}
                      title="角色分析"
                    >
                      <span>👥</span>
                      <span>角色</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log('上一章按鈕點擊', chapters, currentChapter);
                        const currentIndex = chapters.findIndex(c => c.id === currentChapter?.id);
                        if (currentIndex > 0) {
                          handleChapterSelect(chapters[currentIndex - 1].id);
                        }
                      }}
                      disabled={chapters.findIndex(c => c.id === currentChapter?.id) === 0}
                      className="w-8 h-8 rounded-full bg-cosmic-700 hover:bg-cosmic-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gold-400 text-sm"
                      title="上一章"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => {
                        console.log('下一章按鈕點擊', chapters, currentChapter);
                        const currentIndex = chapters.findIndex(c => c.id === currentChapter?.id);
                        if (currentIndex < chapters.length - 1) {
                          handleChapterSelect(chapters[currentIndex + 1].id);
                        }
                      }}
                      disabled={chapters.findIndex(c => c.id === currentChapter?.id) === chapters.length - 1}
                      className="w-8 h-8 rounded-full bg-cosmic-700 hover:bg-cosmic-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gold-400 text-sm"
                      title="下一章"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              {/* 編輯器區域 */}
              <div className="flex-1 flex overflow-hidden" style={{ maxHeight: '60vh' }} data-tutorial="writing-area">
                {/* 主編輯器 */}
                <div className="flex-1 overflow-auto">
                  {(() => {
                    console.log('🔍 [ProjectEditor] 準備傳遞給 SlateEditor 的數據:', {
                      chapterId: currentChapter.id,
                      contentType: typeof currentChapter.content,
                      isArray: Array.isArray(currentChapter.content),
                      contentLength: currentChapter.content ? 
                        (Array.isArray(currentChapter.content) ? currentChapter.content.length : 'not array') : 
                        'null/undefined',
                      rawContent: currentChapter.content
                    });
                    
                    const editorValue = currentChapter.content || [{ type: 'paragraph', children: [{ text: '' }] }];
                    console.log('🔍 [ProjectEditor] 處理後的 editorValue:', editorValue);
                    
                    return (
                      <SlateEditor
                        key={`editor-${currentChapter.id}`} // 強制重新渲染
                        value={editorValue}
                        onChange={handleEditorChange}
                        placeholder="開始寫作..."
                        onSave={saveNow}
                        onAIWrite={handleAIWrite}
                        onEditorReady={handleEditorReady}
                        isSaving={isSaving}
                        isGenerating={isGenerating}
                        showToolbar={true}
                      />
                    );
                  })()}
                  
                  {/* 章節筆記 (可折疊) */}
                  <div className="p-4 border-t border-cosmic-700" data-tutorial="chapter-notes">
                    <ChapterNotes chapter={currentChapter} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-6">📝</div>
                <h2 className="text-2xl font-cosmic text-gold-500 mb-4">
                  選擇一個章節開始寫作
                </h2>
                <p className="text-gray-400 mb-8">
                  從左側選擇章節，或創建新的章節
                </p>
                <button
                  onClick={handleCreateChapter}
                  className="btn-primary"
                >
                  創建新章節
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI 續寫面板 */}
        {showAIPanel && currentChapter && id && (
          <div className="w-96 border-l border-cosmic-700 flex-shrink-0" style={{ minWidth: '384px' }} data-tutorial="ai-panel-btn">
            <AIWritingPanel 
              projectId={id} 
              chapterId={currentChapter.id}
              editor={currentEditor} // 新增：傳遞編輯器實例
            />
          </div>
        )}

        {/* 劇情分析面板 */}
        {showPlotAnalysisPanel && currentChapter && id && (
          <div className="w-96 border-l border-cosmic-700 flex-shrink-0 overflow-y-auto" style={{ minWidth: '384px' }}>
            <PlotAnalysisPanel
              _projectId={id}
              chapters={chapters}
              currentChapter={currentChapter}
              _onSuggestionApply={(suggestion: PlotSuggestion) => {
                notification.info('建議應用', `正在應用建議：${suggestion.title}`);
                // 這裡可以添加具體的建議應用邏輯
              }}
            />
          </div>
        )}

        {/* 角色分析面板 */}
        {showCharacterAnalysisPanel && currentChapter && id && (
          <div className="w-96 border-l border-cosmic-700 flex-shrink-0 overflow-y-auto" style={{ minWidth: '384px' }}>
            <LazyCharacterAnalysisPanel
              projectId={id}
              chapters={chapters.map(chapter => ({
                ...chapter,
                content: JSON.stringify(chapter.content)
              }))}
              currentChapter={currentChapter ? {
                ...currentChapter,
                content: JSON.stringify(currentChapter.content)
              } : null}
              _onSuggestionApply={(suggestion: string) => {
                notification.info('建議應用', `正在應用建議：${suggestion}`);
                // 這裡可以添加具體的建議應用邏輯
              }}
            />
          </div>
        )}

        {/* 編輯器設定面板 */}
        {isSettingsOpen && (
          <div className="absolute top-16 right-4 z-50 w-96">
            <EditorSettingsPanel />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 專注寫作模式覆蓋層 */}
      <FocusWritingModeOverlay 
        currentChapter={currentChapter}
        onSave={saveNow}
        onEditorReady={handleEditorReady}
        onEditorChange={handleEditorChange}
        isSaving={isSaving}
      >
        {/* 閱讀模式覆蓋層 */}
        <ReadingModeOverlay currentChapter={currentChapter}>
          {editorContent}
        </ReadingModeOverlay>
      </FocusWritingModeOverlay>

      {/* 儲存狀態面板 */}
      <SaveStatusPanel 
        isOpen={showSavePanel}
        onClose={() => setShowSavePanel(false)}
      />

      {/* 編輯器教學覆蓋層 */}
      <TutorialOverlay
        steps={editorTutorial}
        isActive={isTutorialActive && currentTutorialId === 'editor'}
        currentStepIndex={currentStep}
        onStepChange={setCurrentStep}
        onComplete={() => completeTutorial('editor')}
        onSkip={() => skipTutorial('editor')}
      />

      {/* AI 輔助教學覆蓋層 */}
      <TutorialOverlay
        steps={aiTutorial}
        isActive={isTutorialActive && currentTutorialId === 'ai'}
        currentStepIndex={currentStep}
        onStepChange={setCurrentStep}
        onComplete={() => completeTutorial('ai')}
        onSkip={() => skipTutorial('ai')}
      />

      {/* 章節管理模態框已移至 ModalContainer 中統一管理 */}
    </>
  );
};

// 使用錯誤邊界包裝的 ProjectEditor 組件
const ProjectEditor = withErrorBoundary(ProjectEditorContent, MiniErrorFallback);

export default ProjectEditor;