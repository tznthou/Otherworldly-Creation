import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export function setupProjectHandlers(db: any): void {
  // 獲取所有專案
  ipcMain.handle('projects:getAll', async () => {
    try {
      const stmt = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
      const projects = stmt.all();
      
      return projects.map((project: any) => ({
        ...project,
        settings: project.settings ? JSON.parse(project.settings) : {},
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
      }));
    } catch (error) {
      console.error('獲取專案列表失敗:', error);
      throw error;
    }
  });
  
  // 創建專案
  ipcMain.handle('projects:create', async (_, project) => {
    try {
      const projectId = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO projects (id, name, type, description, settings)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        projectId,
        project.name,
        project.type,
        project.description || '',
        JSON.stringify(project.settings || {})
      );
      
      return projectId;
    } catch (error) {
      console.error('創建專案失敗:', error);
      throw error;
    }
  });
  
  // 更新專案
  ipcMain.handle('projects:update', async (_, project) => {
    try {
      const stmt = db.prepare(`
        UPDATE projects
        SET name = ?, type = ?, description = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        project.name,
        project.type,
        project.description || '',
        JSON.stringify(project.settings || {}),
        project.id
      );
    } catch (error) {
      console.error('更新專案失敗:', error);
      throw error;
    }
  });
  
  // 刪除專案
  ipcMain.handle('projects:delete', async (_, id) => {
    try {
      const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      console.error('刪除專案失敗:', error);
      throw error;
    }
  });
  
  // 根據 ID 獲取專案
  ipcMain.handle('projects:getById', async (_, id) => {
    try {
      const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
      const project = stmt.get(id);
      
      if (!project) return null;
      
      return {
        ...project,
        settings: project.settings ? JSON.parse(project.settings) : {},
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
      };
    } catch (error) {
      console.error('獲取專案失敗:', error);
      throw error;
    }
  });
}