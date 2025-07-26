import { ipcMain, dialog } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../database/database';
import { setupAIHandlers } from './aiHandlers';
import { setupProjectHandlers, setupChapterHandlers } from './handlers';
import { getDatabaseMaintenanceService } from '../services/databaseMaintenance';
// TODO: 其他處理器將逐步從原檔案遷移到獨立模組

export function setupIpcHandlers(): void {
  const db = getDatabase();
  
  // 已模組化的處理器
  setupProjectHandlers(db);
  setupChapterHandlers(db);
  
  // TODO: 待模組化的處理器
  setupCharacterHandlers(db);
  setupContextHandlers();
  setupSystemHandlers();
  setupSettingsHandlers();
  setupDatabaseMaintenanceHandlers();
  
  // AI 引擎 IPC 處理器（已獨立）
  setupAIHandlers();
}

// 資料完整性檢查函數
function validateProjectExists(db: any, projectId: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE id = ?');
  const result = stmt.get(projectId) as { count: number };
  return result.count > 0;
}

function setupCharacterHandlers(db: any): void {
  // 根據專案 ID 獲取角色（包含關係）
  ipcMain.handle('characters:getByProjectId', async (_, projectId) => {
    try {
      const stmt = db.prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY created_at');
      const characters = stmt.all(projectId);
      
      // 獲取每個角色的關係
      const relationshipStmt = db.prepare('SELECT * FROM character_relationships WHERE source_id = ?');
      
      return characters.map((character: any) => {
        const relationships = relationshipStmt.all(character.id);
        
        return {
          ...character,
          relationships: relationships.map((rel: any) => ({
            ...rel,
            createdAt: new Date(rel.created_at),
            updatedAt: new Date(rel.updated_at),
          })),
          createdAt: new Date(character.created_at),
          updatedAt: new Date(character.updated_at),
        };
      });
    } catch (error) {
      console.error('獲取角色列表失敗:', error);
      throw error;
    }
  });
  
  // 創建角色
  ipcMain.handle('characters:create', async (_, character) => {
    try {
      // 檢查專案是否存在
      if (!validateProjectExists(db, character.projectId)) {
        throw new Error('專案不存在');
      }
      
      const characterId = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO characters (id, project_id, name, age, gender, description, personality, background, appearance, relationships, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        characterId,
        character.projectId,
        character.name,
        character.age || null,
        character.gender || null,
        character.description || '',
        character.personality || '',
        character.background || '',
        character.appearance || '',
        JSON.stringify(character.relationships || []),
        JSON.stringify(character.tags || [])
      );
      
      return characterId;
    } catch (error) {
      console.error('創建角色失敗:', error);
      throw error;
    }
  });
  
  // 更新角色
  ipcMain.handle('characters:update', async (_, character) => {
    try {
      const stmt = db.prepare(`
        UPDATE characters
        SET name = ?, age = ?, gender = ?, description = ?, personality = ?, background = ?, appearance = ?, relationships = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        character.name,
        character.age || null,
        character.gender || null,
        character.description || '',
        character.personality || '',
        character.background || '',
        character.appearance || '',
        JSON.stringify(character.relationships || []),
        JSON.stringify(character.tags || []),
        character.id
      );
    } catch (error) {
      console.error('更新角色失敗:', error);
      throw error;
    }
  });
  
  // 刪除角色
  ipcMain.handle('characters:delete', async (_, id) => {
    try {
      const stmt = db.prepare('DELETE FROM characters WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      console.error('刪除角色失敗:', error);
      throw error;
    }
  });
  
  // 獲取角色詳情
  ipcMain.handle('characters:getById', async (_, id) => {
    try {
      const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
      const character = stmt.get(id);
      
      if (!character) {
        throw new Error('角色不存在');
      }
      
      return {
        ...character,
        relationships: character.relationships ? JSON.parse(character.relationships) : [],
        tags: character.tags ? JSON.parse(character.tags) : [],
        createdAt: new Date(character.created_at),
        updatedAt: new Date(character.updated_at),
      };
    } catch (error) {
      console.error('獲取角色詳情失敗:', error);
      throw error;
    }
  });
  
  // 建立角色關係
  ipcMain.handle('characters:createRelationship', async (_, relationship) => {
    try {
      const relationshipId = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO character_relationships (id, source_id, target_id, relationship_type, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        relationshipId,
        relationship.sourceId,
        relationship.targetId,
        relationship.type,
        relationship.description || ''
      );
      
      return relationshipId;
    } catch (error) {
      console.error('創建角色關係失敗:', error);
      throw error;
    }
  });
  
  // 更新角色關係
  ipcMain.handle('characters:updateRelationship', async (_, relationship) => {
    try {
      const stmt = db.prepare(`
        UPDATE character_relationships
        SET relationship_type = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        relationship.type,
        relationship.description || '',
        relationship.id
      );
    } catch (error) {
      console.error('更新角色關係失敗:', error);
      throw error;
    }
  });
  
  // 刪除角色關係
  ipcMain.handle('characters:deleteRelationship', async (_, id) => {
    try {
      const stmt = db.prepare('DELETE FROM character_relationships WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      console.error('刪除角色關係失敗:', error);
      throw error;
    }
  });
  
  // 獲取角色關係圖
  ipcMain.handle('characters:getRelationshipMap', async (_, projectId) => {
    try {
      // 檢查專案是否存在
      if (!validateProjectExists(db, projectId)) {
        throw new Error('專案不存在');
      }
      
      const charactersStmt = db.prepare('SELECT id, name FROM characters WHERE project_id = ?');
      const characters = charactersStmt.all(projectId);
      
      const relationshipsStmt = db.prepare(`
        SELECT cr.*, c1.name as source_name, c2.name as target_name
        FROM character_relationships cr
        JOIN characters c1 ON cr.source_id = c1.id
        JOIN characters c2 ON cr.target_id = c2.id
        WHERE c1.project_id = ?
      `);
      const relationships = relationshipsStmt.all(projectId);
      
      return {
        characters,
        relationships
      };
    } catch (error) {
      console.error('獲取角色關係圖失敗:', error);
      throw error;
    }
  });
}

function setupSystemHandlers(): void {
  // 獲取應用版本資訊
  ipcMain.handle('system:getVersion', async () => {
    try {
      const packageJson = require('../../../package.json');
      return packageJson.version;
    } catch (error) {
      return '未知版本';
    }
  });
}

function setupContextHandlers(): void {
  // 獲取 AI 寫作上下文
  ipcMain.handle('context:getWritingContext', async (_, params) => {
    try {
      const db = getDatabase();
      const { projectId, chapterId, includeCharacters = true, includeProject = true } = params;
      
      let context = '';
      
      if (includeProject && projectId) {
        const projectStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
        const project = projectStmt.get(projectId);
        
        if (project) {
          context += `專案：${project.name}\n`;
          context += `類型：${project.type}\n`;
          context += `描述：${project.description}\n\n`;
        }
      }
      
      if (includeCharacters && projectId) {
        const charactersStmt = db.prepare('SELECT * FROM characters WHERE project_id = ?');
        const characters = charactersStmt.all(projectId);
        
        if (characters.length > 0) {
          context += '主要角色：\n';
          characters.forEach((character: any) => {
            context += `- ${character.name}：${character.description}\n`;
          });
          context += '\n';
        }
      }
      
      if (chapterId) {
        const chapterStmt = db.prepare('SELECT * FROM chapters WHERE id = ?');
        const chapter = chapterStmt.get(chapterId);
        
        if (chapter) {
          context += `目前章節：${chapter.name}\n`;
          context += `內容：${chapter.content}\n`;
        }
      }
      
      return context;
    } catch (error) {
      console.error('獲取寫作上下文失敗:', error);
      throw error;
    }
  });
  
  // 獲取專案統計資訊
  ipcMain.handle('context:getProjectStats', async (_, projectId) => {
    try {
      const db = getDatabase();
      
      // 檢查專案是否存在
      if (!validateProjectExists(db, projectId)) {
        throw new Error('專案不存在');
      }
      
      const chaptersCountStmt = db.prepare('SELECT COUNT(*) as count FROM chapters WHERE project_id = ?');
      const charactersCountStmt = db.prepare('SELECT COUNT(*) as count FROM characters WHERE project_id = ?');
      const totalWordsStmt = db.prepare('SELECT SUM(LENGTH(content)) as total FROM chapters WHERE project_id = ?');
      
      const chaptersCount = chaptersCountStmt.get(projectId)?.count || 0;
      const charactersCount = charactersCountStmt.get(projectId)?.count || 0;
      const totalWords = totalWordsStmt.get(projectId)?.total || 0;
      
      return {
        chaptersCount,
        charactersCount,
        totalWords: Math.round(totalWords / 2) // 估算中文字數
      };
    } catch (error) {
      console.error('獲取專案統計失敗:', error);
      throw error;
    }
  });
}

function setupSettingsHandlers(): void {
  // 獲取設定
  ipcMain.handle('settings:get', async () => {
    try {
      const settingsPath = path.join(__dirname, '../../settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(settingsData);
      }
      
      // 返回預設設定
      return {
        theme: 'dark',
        language: 'zh-TW',
        autoSave: true,
        aiModel: 'llama3.2',
        fontSize: 16
      };
    } catch (error) {
      console.error('獲取設定失敗:', error);
      throw error;
    }
  });
  
  // 儲存設定
  ipcMain.handle('settings:save', async (_, settings) => {
    try {
      const settingsPath = path.join(__dirname, '../../settings.json');
      const settingsDir = path.dirname(settingsPath);
      
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error('儲存設定失敗:', error);
      throw error;
    }
  });
  
  // 重設設定
  ipcMain.handle('settings:reset', async () => {
    try {
      const settingsPath = path.join(__dirname, '../../settings.json');
      
      const defaultSettings = {
        theme: 'dark',
        language: 'zh-TW',
        autoSave: true,
        aiModel: 'llama3.2',
        fontSize: 16
      };
      
      const settingsDir = path.dirname(settingsPath);
      
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      
      return defaultSettings;
    } catch (error) {
      console.error('重設設定失敗:', error);
      throw error;
    }
  });
  
  // 檢查設定檔案是否存在
  ipcMain.handle('settings:exists', async () => {
    const settingsPath = path.join(__dirname, '../../settings.json');
    return fs.existsSync(settingsPath);
  });
  
  // 獲取設定檔案路徑
  ipcMain.handle('settings:getPath', async () => {
    return path.join(__dirname, '../../settings.json');
  });
  
  // 匯入設定
  ipcMain.handle('settings:import', async (_, settingsData) => {
    try {
      const settingsPath = path.join(__dirname, '../../settings.json');
      const settingsDir = path.dirname(settingsPath);
      
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
      
      return true;
    } catch (error) {
      console.error('匯入設定失敗:', error);
      throw error;
    }
  });
  
  // 匯出設定
  ipcMain.handle('settings:export', async () => {
    try {
      const settingsPath = path.join(__dirname, '../../settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf-8');
        return JSON.parse(settingsData);
      }
      
      return null;
    } catch (error) {
      console.error('匯出設定失敗:', error);
      throw error;
    }
  });
  
  // 備份設定
  ipcMain.handle('settings:backup', async (_, backupPath) => {
    try {
      const settingsPath = path.join(__dirname, '../../settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf-8');
        const backupDir = path.dirname(backupPath);
        
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        fs.writeFileSync(backupPath, settingsData);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('備份設定失敗:', error);
      throw error;
    }
  });
}

function setupDatabaseMaintenanceHandlers(): void {
  // 資料庫健康檢查
  ipcMain.handle('database:healthCheck', async () => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.performHealthCheck();
    } catch (error) {
      console.error('資料庫健康檢查失敗:', error);
      throw error;
    }
  });
  
  // 修復資料庫問題
  ipcMain.handle('database:repairIssues', async (_, issues) => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.repairIssues(issues);
    } catch (error) {
      console.error('修復資料庫問題失敗:', error);
      throw error;
    }
  });
  
  // 優化資料庫性能
  ipcMain.handle('database:optimizePerformance', async (_, checkResult) => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.optimizePerformance(checkResult);
    } catch (error) {
      console.error('優化資料庫性能失敗:', error);
      throw error;
    }
  });
  
  // 資料庫備份
  ipcMain.handle('database:backup', async () => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.createBackup();
    } catch (error) {
      console.error('資料庫備份失敗:', error);
      throw error;
    }
  });
  
  // 匯出專案
  ipcMain.handle('projects:export', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: '匯出專案',
        defaultPath: `project-export-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON 檔案', extensions: ['json'] }
        ]
      });
      
      if (!result.canceled) {
        const db = getDatabase();
        
        // 匯出所有資料
        const projects = db.prepare('SELECT * FROM projects').all();
        const chapters = db.prepare('SELECT * FROM chapters').all();
        const characters = db.prepare('SELECT * FROM characters').all();
        const relationships = db.prepare('SELECT * FROM character_relationships').all();
        
        const exportData = {
          projects,
          chapters,
          characters,
          relationships,
          exportDate: new Date().toISOString()
        };
        
        fs.writeFileSync(result.filePath!, JSON.stringify(exportData, null, 2));
        
        return result.filePath;
      }
      
      return null;
    } catch (error) {
      console.error('匯出專案失敗:', error);
      throw error;
    }
  });
  
  // 匯入專案
  ipcMain.handle('projects:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '匯入專案',
        filters: [
          { name: 'JSON 檔案', extensions: ['json'] }
        ],
        properties: ['openFile']
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const importData = JSON.parse(fileContent);
        
        // 驗證資料格式
        if (!importData.projects || !Array.isArray(importData.projects)) {
          throw new Error('無效的匯入檔案格式');
        }
        
        // 這裡應該實作更詳細的匯入邏輯
        // 目前只是驗證檔案格式
        
        return {
          success: true,
          projectCount: importData.projects.length,
          chapterCount: importData.chapters?.length || 0,
          characterCount: importData.characters?.length || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('匯入專案失敗:', error);
      throw error;
    }
  });
  
  // 資料庫統計
  ipcMain.handle('database:getStats', async () => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.getDatabaseStats();
    } catch (error) {
      console.error('獲取資料庫統計失敗:', error);
      throw error;
    }
  });
  
  // 清理暫存資料
  ipcMain.handle('database:cleanup', async () => {
    try {
      // 實作清理暫存資料的邏輯
      return true;
    } catch (error) {
      console.error('清理暫存資料失敗:', error);
      throw error;
    }
  });
  
  // 重建索引
  ipcMain.handle('database:rebuildIndexes', async () => {
    try {
      // 實作重建索引的邏輯
      return true;
    } catch (error) {
      console.error('重建索引失敗:', error);
      throw error;
    }
  });
  
  // 檢查資料庫一致性
  ipcMain.handle('database:checkIntegrity', async () => {
    try {
      // 實作檢查資料庫一致性的邏輯
      return true;
    } catch (error) {
      console.error('檢查資料庫一致性失敗:', error);
      throw error;
    }
  });
}