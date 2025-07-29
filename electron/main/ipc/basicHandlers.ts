import { ipcMain } from 'electron';
import { 
  createProject, 
  getAllProjects, 
  getProjectById, 
  updateProject,
  deleteProject,
  createChapter,
  getChaptersByProjectId,
  getChapterById,
  updateChapter,
  deleteChapter
} from '../database/database';

// 專案管理 IPC 處理程序
ipcMain.handle('projects:getAll', async () => {
  try {
    console.log('IPC: 獲取所有專案');
    return await getAllProjects();
  } catch (error) {
    console.error('獲取專案失敗:', error);
    throw error;
  }
});

ipcMain.handle('projects:create', async (event, project) => {
  try {
    console.log('IPC: 創建專案', project.title);
    return await createProject(project);
  } catch (error) {
    console.error('創建專案失敗:', error);
    throw error;
  }
});

ipcMain.handle('projects:getById', async (event, id) => {
  try {
    console.log('IPC: 獲取專案', id);
    return await getProjectById(id);
  } catch (error) {
    console.error('獲取專案失敗:', error);
    throw error;
  }
});

ipcMain.handle('projects:update', async (event, project) => {
  try {
    console.log('IPC: 更新專案', project.id);
    return await updateProject(project);
  } catch (error) {
    console.error('更新專案失敗:', error);
    throw error;
  }
});

ipcMain.handle('projects:delete', async (event, id) => {
  try {
    console.log('IPC: 刪除專案', id);
    return await deleteProject(id);
  } catch (error) {
    console.error('刪除專案失敗:', error);
    throw error;
  }
});

// 章節管理 IPC 處理程序
ipcMain.handle('chapters:getByProjectId', async (event, projectId) => {
  try {
    console.log('IPC: 獲取專案章節', projectId);
    return await getChaptersByProjectId(projectId);
  } catch (error) {
    console.error('獲取章節失敗:', error);
    throw error;
  }
});

ipcMain.handle('chapters:create', async (event, chapter) => {
  try {
    console.log('IPC: 創建章節', chapter.title);
    return await createChapter(chapter);
  } catch (error) {
    console.error('創建章節失敗:', error);
    throw error;
  }
});

ipcMain.handle('chapters:getById', async (event, id) => {
  try {
    console.log('IPC: 獲取章節', id);
    return await getChapterById(id);
  } catch (error) {
    console.error('獲取章節失敗:', error);
    throw error;
  }
});

ipcMain.handle('chapters:update', async (event, chapter) => {
  try {
    console.log('IPC: 更新章節', chapter.id);
    return await updateChapter(chapter);
  } catch (error) {
    console.error('更新章節失敗:', error);
    throw error;
  }
});

ipcMain.handle('chapters:delete', async (event, id) => {
  try {
    console.log('IPC: 刪除章節', id);
    return await deleteChapter(id);
  } catch (error) {
    console.error('刪除章節失敗:', error);
    throw error;
  }
});

console.log('基本 IPC 處理程序已註冊');