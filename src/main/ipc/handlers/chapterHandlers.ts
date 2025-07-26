import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';

// 資料完整性檢查函數
function validateProjectExists(db: any, projectId: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE id = ?');
  const result = stmt.get(projectId) as { count: number };
  return result.count > 0;
}

export function setupChapterHandlers(db: any): void {
  // 根據專案 ID 獲取章節
  ipcMain.handle('chapters:getByProjectId', async (_, projectId) => {
    try {
      const stmt = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_num');
      const chapters = stmt.all(projectId);
      
      return chapters.map((chapter: any) => ({
        ...chapter,
        createdAt: new Date(chapter.created_at),
        updatedAt: new Date(chapter.updated_at),
      }));
    } catch (error) {
      console.error('獲取章節列表失敗:', error);
      throw error;
    }
  });
  
  // 創建章節
  ipcMain.handle('chapters:create', async (_, chapter) => {
    try {
      // 檢查專案是否存在
      if (!validateProjectExists(db, chapter.projectId)) {
        throw new Error('指定的專案不存在');
      }
      
      const chapterId = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO chapters (id, project_id, title, content, order_num)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        chapterId,
        chapter.projectId,
        chapter.title,
        chapter.content || '',
        chapter.order || 0
      );
      
      return chapterId;
    } catch (error) {
      console.error('創建章節失敗:', error);
      throw error;
    }
  });
  
  // 更新章節
  ipcMain.handle('chapters:update', async (_, chapter) => {
    try {
      const stmt = db.prepare(`
        UPDATE chapters
        SET title = ?, content = ?, order_num = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        chapter.title,
        chapter.content || '',
        chapter.order || 0,
        chapter.id
      );
    } catch (error) {
      console.error('更新章節失敗:', error);
      throw error;
    }
  });
  
  // 刪除章節
  ipcMain.handle('chapters:delete', async (_, id) => {
    try {
      const stmt = db.prepare('DELETE FROM chapters WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      console.error('刪除章節失敗:', error);
      throw error;
    }
  });
  
  // 根據 ID 獲取章節
  ipcMain.handle('chapters:getById', async (_, id) => {
    try {
      const stmt = db.prepare('SELECT * FROM chapters WHERE id = ?');
      const chapter = stmt.get(id);
      
      if (!chapter) return null;
      
      return {
        ...chapter,
        createdAt: new Date(chapter.created_at),
        updatedAt: new Date(chapter.updated_at),
      };
    } catch (error) {
      console.error('獲取章節失敗:', error);
      throw error;
    }
  });
}