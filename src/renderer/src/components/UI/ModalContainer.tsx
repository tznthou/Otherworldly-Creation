import React, { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { updateChapter, Chapter } from '../../store/slices/chaptersSlice';
import CreateProjectModal from '../Modals/CreateProjectModal';
import ProjectManageModal from '../Modals/ProjectManageModal';
import ImportProjectModal from '../Modals/ImportProjectModal';
import DeleteProjectModal from '../Modals/DeleteProjectModal';
import ChapterManageModal from '../Modals/ChapterManageModal';
import CreateChapterModal from '../Modals/CreateChapterModal';
import AISettingsModal from '../Modals/AISettingsModal';
import TemplateManagerModal from '../Modals/TemplateManagerModal';
import TemplateApplicationModal from '../Modals/TemplateApplicationModal';
import SelectProjectForCharactersModal from '../Modals/SelectProjectForCharactersModal';
import SelectProjectForPlotAnalysisModal from '../Modals/SelectProjectForPlotAnalysisModal';
import BackupManagerModal from '../Modals/BackupManagerModal';
import HelpCenterModal from '../Modals/HelpCenterModal';
import UpdateManagerModal from '../Modals/UpdateManagerModal';
import EPubGenerationModal from '../Modals/EPubGenerationModal';

const ModalContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { modals, selectedTemplate } = useAppSelector(state => state.ui);
  const { currentProject } = useAppSelector(state => state.projects);
  const { currentChapter, chapters } = useAppSelector(state => state.chapters);

  // 章節重新排序處理函數（使用 useCallback 避免無限重新渲染）
  const handleReorderChapters = useCallback(async (reorderedChapters: Chapter[]) => {
    try {
      // 更新所有章節的順序
      for (const chapter of reorderedChapters) {
        await dispatch(updateChapter(chapter)).unwrap();
      }
      
      // 移除重新獲取章節列表的調用，避免無限循環
      // Redux state 已經通過 updateChapter 更新了
      
    } catch (error) {
      console.error('重新排序章節失敗:', error);
    }
  }, [dispatch]);

  return (
    <>
      {modals.createProject && <CreateProjectModal />}
      {modals.projectManage && currentProject && <ProjectManageModal project={currentProject} />}
      {modals.importProject && <ImportProjectModal />}
      {modals.deleteProject && <DeleteProjectModal />}
      {modals.chapterManage && currentChapter && (
        <ChapterManageModal 
          chapter={currentChapter} 
          allChapters={chapters}
          onReorder={handleReorderChapters}
        />
      )}
      {modals.createChapter && currentProject && (
        <CreateChapterModal 
          projectId={currentProject.id}
          chaptersCount={chapters.length}
        />
      )}
      {modals.aiSettings && <AISettingsModal />}
      {modals.templateManager && <TemplateManagerModal />}
      {modals.templateApplication && selectedTemplate && <TemplateApplicationModal template={selectedTemplate} />}
      {modals.selectProjectForCharacters && <SelectProjectForCharactersModal />}
      {modals.selectProjectForPlotAnalysis && <SelectProjectForPlotAnalysisModal />}
      {modals.backupManager && <BackupManagerModal />}
      {modals.helpCenter && <HelpCenterModal />}
      {modals.updateManager && <UpdateManagerModal />}
      {modals.epubGeneration && <EPubGenerationModal />}
    </>
  );
};

export default ModalContainer;