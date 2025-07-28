import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descendant } from 'slate';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { 
  fetchChaptersByProjectId, 
  setCurrentChapter, 
  updateCurrentChapterContent,
  createChapter,
  updateChapter,
  Chapter
} from '../../store/slices/chaptersSlice';
import { fetchProjectById } from '../../store/slices/projectsSlice';
import { openModal } from '../../store/slices/uiSlice';
import SlateEditor from '../../components/Editor/SlateEditor';
import EditorToolbar from '../../components/Editor/EditorToolbar';
import EditorSettingsPanel from '../../components/Editor/EditorSettingsPanel';
import ReadingModeOverlay from '../../components/Editor/ReadingModeOverlay';
import ChapterList from '../../components/Editor/ChapterList';
import ChapterNotes from '../../components/Editor/ChapterNotes';
import AIWritingPanel from '../../components/Editor/AIWritingPanel';
import AIStatusIndicator from '../../components/UI/AIStatusIndicator';
import SaveStatusIndicator from '../../components/UI/SaveStatusIndicator';
import SaveStatusPanel from '../../components/UI/SaveStatusPanel';
import { useAutoSave } from '../../hooks/useAutoSave';
import { selectIsSettingsOpen, selectIsReadingMode } from '../../store/slices/editorSlice';
import { ErrorHandler, withErrorBoundary } from '../../utils/errorUtils';
import { useNotification } from '../../components/UI/NotificationSystem';
import { OperationStatus } from '../../components/UI/StatusIndicator';
import { SimpleProgressBar } from '../../components/UI/ProgressIndicator';
import { MiniErrorFallback } from '../../components/UI/ErrorFallback';
import SaveManager from '../../services/saveManager';
import TutorialOverlay, { useTutorial } from '../../components/Tutorial/TutorialOverlay';
import { editorTutorial, aiTutorial } from '../../data/tutorialSteps';

const ProjectEditorContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const notification = useNotification();
  
  const { currentProject } = useAppSelector(state => state.projects);
  const { chapters, currentChapter, loading } = useAppSelector(state => state.chapters);
  const isSettingsOpen = useAppSelector(selectIsSettingsOpen);
  const isReadingMode = useAppSelector(selectIsReadingMode);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // 教學系統
  const {
    isActive: isTutorialActive,
    currentStep,
    currentTutorialId,
    setCurrentStep,
    startTutorial,
    completeTutorial,
    skipTutorial,
    isTutorialCompleted
  } = useTutorial();
  
  // 自動儲存
  const { 
    saveNow, 
    hasUnsavedChanges, 
    isSaving, 
    autoSaveEnabled,
    autoSaveStatus,
    lastSaved 
  } = useAutoSave({
    onSave: () => {
      notification.success('儲存成功', '章節已自動儲存');
    },
    onError: (error) => {
      notification.error('儲存失敗', error.message);
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
  }, [id, dispatch, navigate, notification]);

  // 選擇第一個章節（如果有的話）
  useEffect(() => {
    if (chapters.length > 0 && !selectedChapterId) {
      const firstChapter = chapters[0];
      setSelectedChapterId(firstChapter.id);
      dispatch(setCurrentChapter(firstChapter));
    }
  }, [chapters, selectedChapterId, dispatch]);

  // 處理章節選擇
  const handleChapterSelect = useCallback((chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      setSelectedChapterId(chapterId);
      dispatch(setCurrentChapter(chapter));
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
      
      // 重新獲取章節列表
      if (id) {
        await dispatch(fetchChaptersByProjectId(id)).unwrap();
      }
      
      notification.success('排序完成', '章節順序已更新');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, { action: 'reorder_chapters', projectId: id });
      notification.error('排序失敗', '無法更新章節順序，請重試');
    }
  }, [dispatch, id, notification]);

  // 處理編輯器內容變化
  const handleEditorChange = useCallback((value: Descendant[]) => {
    dispatch(updateCurrentChapterContent(value));
  }, [dispatch]);

  // 創建新章節
  const handleCreateChapter = useCallback(() => {
    dispatch(openModal('createChapter'));
  }, [dispatch]);

  // 處理 AI 續寫
  const handleAIWrite = useCallback(() => {
    setShowAIPanel(!showAIPanel);
  }, [showAIPanel]);

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
    <div className="h-full flex">
      {/* 章節列表側邊欄 */}
      <div className="w-80 bg-cosmic-900 border-r border-cosmic-700 flex flex-col">
        {/* 專案標題 */}
        <div className="p-4 border-b border-cosmic-700">
          <h1 className="text-xl font-cosmic text-gold-500 mb-2">
            {currentProject.name}
          </h1>
          <p className="text-sm text-gray-400">
            {currentProject.type === 'isekai' && '異世界'}
            {currentProject.type === 'school' && '校園'}
            {currentProject.type === 'scifi' && '科幻'}
            {currentProject.type === 'fantasy' && '奇幻'}
          </p>
        </div>

        {/* 章節列表 */}
        <div className="flex-1 overflow-y-auto" data-tutorial="chapter-list">
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
      <div className="flex-1 flex relative">
        {/* 主編輯區 */}
        <div className="flex-1 flex flex-col">
          {currentChapter ? (
            <>
              {/* 工具欄 */}
              <div data-tutorial="editor-toolbar">
                <EditorToolbar
                  onSave={saveNow}
                  onAIWrite={handleAIWrite}
                  isSaving={isSaving}
                  isGenerating={false}
                />
              </div>

              {/* 編輯器 */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1" data-tutorial="writing-area">
                  <SlateEditor
                    value={currentChapter.content}
                    onChange={handleEditorChange}
                    placeholder="開始寫作..."
                    autoFocus={true}
                    onSave={saveNow}
                  />
                </div>
                
                {/* 章節筆記 (可折疊) */}
                <div className="p-4 border-t border-cosmic-700" data-tutorial="chapter-notes">
                  <ChapterNotes chapter={currentChapter} />
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
          <div className="w-96 border-l border-cosmic-700" data-tutorial="ai-panel-btn">
            <AIWritingPanel 
              projectId={id}
              chapterId={currentChapter.id}
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
      {/* 閱讀模式覆蓋層 */}
      <ReadingModeOverlay>
        {editorContent}
      </ReadingModeOverlay>

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