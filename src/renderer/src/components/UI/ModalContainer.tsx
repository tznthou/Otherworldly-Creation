import React from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { updateChapter, fetchChaptersByProjectId, Chapter } from '../../store/slices/chaptersSlice';
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
import BackupManagerModal from '../Modals/BackupManagerModal';
import HelpCenterModal from '../Modals/HelpCenterModal';
import UpdateManagerModal from '../Modals/UpdateManagerModal';

const ModalContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { modals, selectedTemplate } = useAppSelector(state => state.ui);
  
  // 調試：監控 modal 狀態變化
  console.log('ModalContainer render - modals state:', modals);
  

  const { currentProject } = useAppSelector(state => state.projects);
  const { currentChapter, chapters } = useAppSelector(state => state.chapters);

  // 章節重新排序處理函數
  const handleReorderChapters = async (reorderedChapters: Chapter[]) => {
    try {
      // 更新所有章節的順序
      for (const chapter of reorderedChapters) {
        await dispatch(updateChapter(chapter)).unwrap();
      }
      
      // 重新獲取章節列表
      if (currentProject) {
        dispatch(fetchChaptersByProjectId(currentProject.id));
      }
    } catch (error) {
      console.error('重新排序章節失敗:', error);
    }
  };

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
      {modals.backupManager && <BackupManagerModal />}
      {modals.helpCenter && <HelpCenterModal />}
      {modals.updateManager && <UpdateManagerModal />}
    </>
  );
};

export default ModalContainer;