import { ipcMain, dialog, app } from 'electron';
import { getDatabase } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import { getContextManager } from '../services/contextManager';
import { setupAIHandlers } from './aiHandlers';
import { getDatabaseMaintenanceService } from '../services/databaseMaintenance';
import * as fs from 'fs';
import * as path from 'path';

export function setupIpcHandlers(): void {
  const db = getDatabase();
  
  // 專案管理 IPC 處理器
  setupProjectHandlers(db);
  
  // 章節管理 IPC 處理器
  setupChapterHandlers(db);
  
  // 角色管理 IPC 處理器
  setupCharacterHandlers(db);
  
  // 上下文管理 IPC 處理器
  setupContextHandlers();
  
  // AI 引擎 IPC 處理器
  setupAIHandlers();
  
  // 系統功能 IPC 處理器
  setupSystemHandlers();
  
  // 設定管理 IPC 處理器
  setupSettingsHandlers();
  
  // 資料庫維護 IPC 處理器
  setupDatabaseMaintenanceHandlers();
}

// 資料完整性檢查函數
function validateProjectExists(db: any, projectId: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE id = ?');
  const result = stmt.get(projectId) as { count: number };
  return result.count > 0;
}

function setupProjectHandlers(db: any): void {
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

function setupChapterHandlers(db: any): void {
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
            id: rel.id,
            targetId: rel.target_id,
            type: rel.type,
            description: rel.description,
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
        throw new Error('指定的專案不存在');
      }
      
      const characterId = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        characterId,
        character.projectId,
        character.name,
        character.archetype || '',
        character.age || null,
        character.gender || '',
        character.appearance || '',
        character.personality || '',
        character.background || ''
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
        SET name = ?, archetype = ?, age = ?, gender = ?, appearance = ?, personality = ?, background = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        character.name,
        character.archetype || '',
        character.age || null,
        character.gender || '',
        character.appearance || '',
        character.personality || '',
        character.background || '',
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
  
  // 根據 ID 獲取角色（包含關係）
  ipcMain.handle('characters:getById', async (_, id) => {
    try {
      const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
      const character = stmt.get(id);
      
      if (!character) return null;
      
      // 獲取角色的關係
      const relationshipStmt = db.prepare('SELECT * FROM character_relationships WHERE source_id = ?');
      const relationships = relationshipStmt.all(id);
      
      return {
        ...character,
        relationships: relationships.map((rel: any) => ({
          id: rel.id,
          targetId: rel.target_id,
          type: rel.type,
          description: rel.description,
        })),
        createdAt: new Date(character.created_at),
        updatedAt: new Date(character.updated_at),
      };
    } catch (error) {
      console.error('獲取角色失敗:', error);
      throw error;
    }
  });

  // 更新角色關係
  ipcMain.handle('characters:updateRelationships', async (_, characterId, relationships) => {
    try {
      const transaction = db.transaction(() => {
        // 刪除現有關係
        const deleteStmt = db.prepare('DELETE FROM character_relationships WHERE source_id = ?');
        deleteStmt.run(characterId);
        
        // 插入新關係
        const insertStmt = db.prepare(`
          INSERT INTO character_relationships (id, source_id, target_id, type, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        relationships.forEach((relationship: any) => {
          const relationshipId = uuidv4();
          insertStmt.run(
            relationshipId,
            characterId,
            relationship.targetId,
            relationship.type,
            relationship.description
          );
        });
        
        // 更新角色的 updated_at
        const updateCharacterStmt = db.prepare('UPDATE characters SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        updateCharacterStmt.run(characterId);
      });
      
      transaction();
    } catch (error) {
      console.error('更新角色關係失敗:', error);
      throw error;
    }
  });

  // 獲取角色關係
  ipcMain.handle('characters:getRelationships', async (_, characterId) => {
    try {
      const stmt = db.prepare('SELECT * FROM character_relationships WHERE source_id = ?');
      const relationships = stmt.all(characterId);
      
      return relationships.map((rel: any) => ({
        id: rel.id,
        targetId: rel.target_id,
        type: rel.type,
        description: rel.description,
      }));
    } catch (error) {
      console.error('獲取角色關係失敗:', error);
      throw error;
    }
  });

  // 檢查角色關係一致性
  ipcMain.handle('characters:checkRelationshipConsistency', async (_, projectId) => {
    try {
      const issues: any[] = [];
      
      // 檢查關係目標是否存在
      const relationshipStmt = db.prepare(`
        SELECT cr.*, c1.name as source_name, c2.name as target_name
        FROM character_relationships cr
        JOIN characters c1 ON cr.source_id = c1.id
        LEFT JOIN characters c2 ON cr.target_id = c2.id
        WHERE c1.project_id = ?
      `);
      
      const relationships = relationshipStmt.all(projectId);
      
      relationships.forEach((rel: any) => {
        if (!rel.target_name) {
          issues.push({
            type: 'missing_target',
            sourceId: rel.source_id,
            sourceName: rel.source_name,
            targetId: rel.target_id,
            relationshipType: rel.type,
            message: `角色 "${rel.source_name}" 的關係目標角色不存在`,
          });
        }
      });
      
      // 檢查雙向關係一致性（可選）
      const bidirectionalCheck = db.prepare(`
        SELECT cr1.*, c1.name as source_name, c2.name as target_name
        FROM character_relationships cr1
        JOIN characters c1 ON cr1.source_id = c1.id
        JOIN characters c2 ON cr1.target_id = c2.id
        LEFT JOIN character_relationships cr2 ON cr1.target_id = cr2.source_id AND cr1.source_id = cr2.target_id
        WHERE c1.project_id = ? AND cr2.id IS NULL
      `);
      
      const unidirectionalRelationships = bidirectionalCheck.all(projectId);
      
      unidirectionalRelationships.forEach((rel: any) => {
        issues.push({
          type: 'unidirectional_relationship',
          sourceId: rel.source_id,
          sourceName: rel.source_name,
          targetId: rel.target_id,
          targetName: rel.target_name,
          relationshipType: rel.type,
          message: `角色 "${rel.source_name}" 與 "${rel.target_name}" 的關係是單向的`,
          severity: 'warning',
        });
      });
      
      return issues;
    } catch (error) {
      console.error('檢查角色關係一致性失敗:', error);
      throw error;
    }
  });

  // 檢查角色引用
  ipcMain.handle('characters:checkReferences', async (_, characterId) => {
    try {
      const references: any[] = [];
      
      // 檢查章節內容中的引用
      const chapterStmt = db.prepare(`
        SELECT c.id, c.title, c.content, p.name as project_name
        FROM chapters c
        JOIN characters ch ON c.project_id = ch.project_id
        JOIN projects p ON c.project_id = p.id
        WHERE ch.id = ?
      `);
      
      const characterStmt = db.prepare('SELECT name, project_id FROM characters WHERE id = ?');
      const character = characterStmt.get(characterId);
      
      if (!character) {
        return { references: [], characterName: null };
      }
      
      const chapters = chapterStmt.all(characterId);
      
      // 檢查每個章節的內容是否包含角色名稱
      chapters.forEach((chapter: any) => {
        if (chapter.content && chapter.content.includes(character.name)) {
          // 計算出現次數
          const occurrences = (chapter.content.match(new RegExp(character.name, 'g')) || []).length;
          references.push({
            type: 'chapter',
            id: chapter.id,
            title: chapter.title,
            projectName: chapter.project_name,
            occurrences,
            preview: chapter.content.substring(0, 200) + (chapter.content.length > 200 ? '...' : '')
          });
        }
      });
      
      // 檢查角色關係中的引用
      const relationshipStmt = db.prepare(`
        SELECT cr.*, c1.name as source_name, c2.name as target_name
        FROM character_relationships cr
        JOIN characters c1 ON cr.source_id = c1.id
        JOIN characters c2 ON cr.target_id = c2.id
        WHERE cr.source_id = ? OR cr.target_id = ?
      `);
      
      const relationships = relationshipStmt.all(characterId, characterId);
      
      relationships.forEach((rel: any) => {
        const isSource = rel.source_id === characterId;
        references.push({
          type: 'relationship',
          id: rel.id,
          relationshipType: rel.type,
          relatedCharacter: isSource ? rel.target_name : rel.source_name,
          description: rel.description,
          direction: isSource ? 'outgoing' : 'incoming'
        });
      });
      
      return {
        references,
        characterName: character.name,
        totalReferences: references.length
      };
    } catch (error) {
      console.error('檢查角色引用失敗:', error);
      throw error;
    }
  });

  // 刪除角色（帶引用檢查）
  ipcMain.handle('characters:delete', async (_, id, forceDelete = false) => {
    try {
      // 如果不是強制刪除，先檢查引用
      if (!forceDelete) {
        // 直接調用檢查函數而不是通過 IPC
        const checkReferencesStmt = db.prepare(`
          SELECT c.id, c.title, c.content, p.name as project_name
          FROM chapters c
          JOIN characters ch ON c.project_id = ch.project_id
          JOIN projects p ON c.project_id = p.id
          WHERE ch.id = ?
        `);
        
        const characterStmt = db.prepare('SELECT name, project_id FROM characters WHERE id = ?');
        const character = characterStmt.get(id);
        
        if (character) {
          const chapters = checkReferencesStmt.all(id);
          let hasReferences = false;
          
          chapters.forEach((chapter: any) => {
            if (chapter.content && chapter.content.includes(character.name)) {
              hasReferences = true;
            }
          });
          
          // 檢查關係引用
          const relationshipStmt = db.prepare(`
            SELECT COUNT(*) as count FROM character_relationships 
            WHERE source_id = ? OR target_id = ?
          `);
          const relationshipCount = relationshipStmt.get(id, id) as { count: number };
          
          if (hasReferences || relationshipCount.count > 0) {
            throw new Error('CHARACTER_HAS_REFERENCES');
          }
        }
      }
      
      const transaction = db.transaction(() => {
        // 刪除與該角色相關的所有關係
        const deleteRelationshipsStmt = db.prepare('DELETE FROM character_relationships WHERE source_id = ? OR target_id = ?');
        deleteRelationshipsStmt.run(id, id);
        
        // 刪除角色能力
        const deleteAbilitiesStmt = db.prepare('DELETE FROM character_abilities WHERE character_id = ?');
        deleteAbilitiesStmt.run(id);
        
        // 刪除角色
        const deleteCharacterStmt = db.prepare('DELETE FROM characters WHERE id = ?');
        deleteCharacterStmt.run(id);
      });
      
      transaction();
    } catch (error) {
      console.error('刪除角色失敗:', error);
      throw error;
    }
  });
}

// AI 處理程序已移至 aiHandlers.ts

function setupSystemHandlers(): void {
  // 獲取應用程式版本
  ipcMain.handle('system:getVersion', async () => {
    return app.getVersion();
  });
  
  // 顯示訊息框
  ipcMain.handle('system:showMessageBox', async (_, options) => {
    return await dialog.showMessageBox(options);
  });
}

function setupContextHandlers(): void {
  // 構建上下文
  ipcMain.handle('context:build', async (_, projectId, chapterId, position) => {
    try {
      const contextManager = getContextManager();
      return await contextManager.buildContext(projectId, chapterId, position);
    } catch (error) {
      console.error('構建上下文失敗:', error);
      throw error;
    }
  });
  
  // 壓縮上下文
  ipcMain.handle('context:compress', async (_, context, maxTokens) => {
    try {
      const contextManager = getContextManager();
      return contextManager.compressContext(context, maxTokens);
    } catch (error) {
      console.error('壓縮上下文失敗:', error);
      throw error;
    }
  });
  
  // 整合角色資訊到上下文
  ipcMain.handle('context:integrateCharacters', async (_, context, characters) => {
    try {
      const contextManager = getContextManager();
      return contextManager.integrateCharacters(context, characters);
    } catch (error) {
      console.error('整合角色資訊失敗:', error);
      throw error;
    }
  });
  
  // 提取相關內容
  ipcMain.handle('context:extractRelevantContent', async (_, content, position) => {
    try {
      const contextManager = getContextManager();
      return contextManager.extractRelevantContent(content, position);
    } catch (error) {
      console.error('提取相關內容失敗:', error);
      throw error;
    }
  });
  
  // 獲取 AI 續寫的上下文
  ipcMain.handle('context:getAIWritingContext', async (_, projectId, chapterId, position, maxTokens) => {
    try {
      const contextManager = getContextManager();
      
      // 1. 構建基本上下文
      const context = await contextManager.buildContext(projectId, chapterId, position);
      
      // 2. 如果提供了 maxTokens，則壓縮上下文
      if (maxTokens && maxTokens > 0) {
        return contextManager.compressContext(context, maxTokens);
      }
      
      return context;
    } catch (error) {
      console.error('獲取 AI 續寫上下文失敗:', error);
      throw error;
    }
  });
  
  // 分析上下文品質
  ipcMain.handle('context:analyzeQuality', async (_, context) => {
    try {
      const contextManager = getContextManager();
      return contextManager.analyzeContextQuality(context);
    } catch (error) {
      console.error('分析上下文品質失敗:', error);
      throw error;
    }
  });
  
  // 獲取相關角色
  ipcMain.handle('context:getRelevantCharacters', async (_, projectId, content) => {
    try {
      const contextManager = getContextManager();
      return await contextManager.getRelevantCharacters(projectId, content);
    } catch (error) {
      console.error('獲取相關角色失敗:', error);
      throw error;
    }
  });
  
  // 檢測新角色
  ipcMain.handle('context:detectNewCharacters', async (_, content) => {
    try {
      const contextManager = getContextManager();
      return contextManager.detectNewCharacters(content);
    } catch (error) {
      console.error('檢測新角色失敗:', error);
      throw error;
    }
  });
  
  // 檢查一致性
  ipcMain.handle('context:checkConsistency', async (_, content, projectId) => {
    try {
      const contextManager = getContextManager();
      return await contextManager.checkConsistency(content, projectId);
    } catch (error) {
      console.error('檢查一致性失敗:', error);
      throw error;
    }
  });
  
  // 獲取優化的 AI 續寫上下文
  ipcMain.handle('context:getOptimizedAIWritingContext', async (_, projectId, chapterId, position, maxTokens) => {
    try {
      const contextManager = getContextManager();
      
      // 1. 構建基本上下文
      const context = await contextManager.buildContext(projectId, chapterId, position);
      
      // 2. 獲取相關角色
      const content = contextManager.extractRelevantContent(context, position);
      const relevantCharacters = await contextManager.getRelevantCharacters(projectId, content);
      
      // 3. 壓縮上下文
      let compressedContext = context;
      if (maxTokens && maxTokens > 0) {
        compressedContext = contextManager.compressContext(context, maxTokens);
      }
      
      // 4. 分析上下文品質
      const qualityReport = contextManager.analyzeContextQuality(compressedContext);
      
      // 5. 檢查一致性
      const consistencyIssues = await contextManager.checkConsistency(content, projectId);
      
      return {
        context: compressedContext,
        relevantCharacters,
        qualityReport,
        consistencyIssues,
      };
    } catch (error) {
      console.error('獲取優化的 AI 續寫上下文失敗:', error);
      throw error;
    }
  });
}
function setupSettingsHandlers(): void {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  
  // 載入設定
  ipcMain.handle('settings:load', async () => {
    try {
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(settingsData);
      }
      return null; // 返回 null 表示沒有儲存的設定
    } catch (error) {
      console.error('載入設定失敗:', error);
      return null;
    }
  });
  
  // 儲存設定
  ipcMain.handle('settings:save', async (_, settings) => {
    try {
      // 確保設定目錄存在
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      // 儲存設定到檔案
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      
      console.log('設定已儲存至:', settingsPath);
    } catch (error) {
      console.error('儲存設定失敗:', error);
      throw error;
    }
  });
  
  // 重置設定
  ipcMain.handle('settings:reset', async () => {
    try {
      if (fs.existsSync(settingsPath)) {
        fs.unlinkSync(settingsPath);
        console.log('設定檔案已刪除:', settingsPath);
      }
    } catch (error) {
      console.error('重置設定失敗:', error);
      throw error;
    }
  });
  
  // 更新設定（與儲存相同，但提供語義上的區別）
  ipcMain.handle('settings:update', async (_, settings) => {
    try {
      // 載入現有設定
      let existingSettings = {};
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        existingSettings = JSON.parse(settingsData);
      }
      
      // 合併設定
      const mergedSettings = { ...existingSettings, ...settings };
      
      // 儲存合併後的設定
      const settingsDir = path.dirname(settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      fs.writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2), 'utf8');
      
      console.log('設定已更新至:', settingsPath);
    } catch (error) {
      console.error('更新設定失敗:', error);
      throw error;
    }
  });
  
  // 獲取設定檔案路徑（用於除錯）
  ipcMain.handle('settings:getPath', async () => {
    return settingsPath;
  });
  
  // 檢查設定檔案是否存在
  ipcMain.handle('settings:exists', async () => {
    return fs.existsSync(settingsPath);
  });
  
  // 備份設定
  ipcMain.handle('settings:backup', async () => {
    try {
      if (!fs.existsSync(settingsPath)) {
        throw new Error('設定檔案不存在');
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        path.dirname(settingsPath),
        `settings-backup-${timestamp}.json`
      );
      
      fs.copyFileSync(settingsPath, backupPath);
      
      return backupPath;
    } catch (error) {
      console.error('備份設定失敗:', error);
      throw error;
    }
  });
  
  // 從備份還原設定
  ipcMain.handle('settings:restore', async (_, backupPath) => {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('備份檔案不存在');
      }
      
      // 驗證備份檔案格式
      const backupData = fs.readFileSync(backupPath, 'utf8');
      JSON.parse(backupData); // 驗證 JSON 格式
      
      // 備份當前設定
      if (fs.existsSync(settingsPath)) {
        // 創建備份文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const currentBackupPath = path.join(path.dirname(settingsPath), `settings-backup-${timestamp}.json`);
        console.log('當前設定已備份至:', currentBackupPath);
      }
      
      // 還原設定
      fs.copyFileSync(backupPath, settingsPath);
      
      console.log('設定已從備份還原:', backupPath);
    } catch (error) {
      console.error('還原設定失敗:', error);
      throw error;
    }
  });
}

function setupDatabaseMaintenanceHandlers(): void {
  // 執行資料庫健康檢查
  ipcMain.handle('database:healthCheck', async () => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.performHealthCheck();
    } catch (error) {
      console.error('資料庫健康檢查失敗:', error);
      throw error;
    }
  });
  
  // 執行自動修復
  ipcMain.handle('database:autoRepair', async (_, issues) => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.performAutoRepair(issues);
    } catch (error) {
      console.error('自動修復失敗:', error);
      throw error;
    }
  });
  
  // 生成錯誤報告
  ipcMain.handle('database:generateReport', async (_, checkResult) => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.generateErrorReport(checkResult);
    } catch (error) {
      console.error('生成錯誤報告失敗:', error);
      throw error;
    }
  });
  
  // 執行資料庫優化
  ipcMain.handle('database:optimize', async () => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      return await maintenanceService.optimizeDatabase();
    } catch (error) {
      console.error('資料庫優化失敗:', error);
      throw error;
    }
  });
  
  // 匯出資料庫資料
  ipcMain.handle('database:export', async () => {
    try {
      const db = getDatabase();
      
      // 匯出所有資料
      const exportData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          projects: db.prepare('SELECT * FROM projects').all(),
          chapters: db.prepare('SELECT * FROM chapters').all(),
          characters: db.prepare('SELECT * FROM characters').all(),
          character_abilities: db.prepare('SELECT * FROM character_abilities').all(),
          character_relationships: db.prepare('SELECT * FROM character_relationships').all(),
          templates: db.prepare('SELECT * FROM templates').all()
        }
      };
      
      // 顯示儲存對話框
      const result = await dialog.showSaveDialog({
        title: '匯出資料庫',
        defaultPath: `genesis-chronicle-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON 檔案', extensions: ['json'] },
          { name: '所有檔案', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');
        return { success: true, filePath: result.filePath };
      }
      
      return { success: false, message: '使用者取消匯出' };
    } catch (error) {
      console.error('匯出資料庫失敗:', error);
      return { success: false, message: error instanceof Error ? error.message : '未知錯誤' };
    }
  });
  
  // 匯入資料庫資料
  ipcMain.handle('database:import', async () => {
    try {
      // 顯示開啟對話框
      const result = await dialog.showOpenDialog({
        title: '匯入資料庫',
        filters: [
          { name: 'JSON 檔案', extensions: ['json'] },
          { name: '所有檔案', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || !result.filePaths.length) {
        return { success: false, message: '使用者取消匯入' };
      }
      
      const filePath = result.filePaths[0];
      const importData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // 驗證匯入資料格式
      if (!importData.version || !importData.data) {
        throw new Error('無效的備份檔案格式');
      }
      
      const db = getDatabase();
      
      // 在事務中執行匯入
      const transaction = db.transaction(() => {
        // 清空現有資料（可選，根據需求決定）
        const confirmClear = dialog.showMessageBoxSync({
          type: 'warning',
          title: '確認匯入',
          message: '匯入將會覆蓋現有資料，是否繼續？',
          buttons: ['取消', '繼續'],
          defaultId: 0,
          cancelId: 0
        });
        
        if (confirmClear === 0) {
          throw new Error('使用者取消匯入');
        }
        
        // 清空資料表
        db.prepare('DELETE FROM character_relationships').run();
        db.prepare('DELETE FROM character_abilities').run();
        db.prepare('DELETE FROM characters').run();
        db.prepare('DELETE FROM chapters').run();
        db.prepare('DELETE FROM projects').run();
        db.prepare('DELETE FROM templates WHERE id NOT LIKE "%-default"').run(); // 保留預設模板
        
        // 匯入資料
        const insertProject = db.prepare(`
          INSERT INTO projects (id, name, type, description, created_at, updated_at, settings)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertChapter = db.prepare(`
          INSERT INTO chapters (id, project_id, title, content, order_num, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertCharacter = db.prepare(`
          INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertAbility = db.prepare(`
          INSERT INTO character_abilities (id, character_id, name, description)
          VALUES (?, ?, ?, ?)
        `);
        
        const insertRelationship = db.prepare(`
          INSERT INTO character_relationships (id, source_id, target_id, type, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        const insertTemplate = db.prepare(`
          INSERT OR REPLACE INTO templates (id, name, type, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        // 匯入專案
        if (importData.data.projects) {
          importData.data.projects.forEach((project: any) => {
            insertProject.run(
              project.id, project.name, project.type, project.description,
              project.created_at, project.updated_at, project.settings
            );
          });
        }
        
        // 匯入章節
        if (importData.data.chapters) {
          importData.data.chapters.forEach((chapter: any) => {
            insertChapter.run(
              chapter.id, chapter.project_id, chapter.title, chapter.content,
              chapter.order_num, chapter.created_at, chapter.updated_at
            );
          });
        }
        
        // 匯入角色
        if (importData.data.characters) {
          importData.data.characters.forEach((character: any) => {
            insertCharacter.run(
              character.id, character.project_id, character.name, character.archetype,
              character.age, character.gender, character.appearance, character.personality,
              character.background, character.created_at, character.updated_at
            );
          });
        }
        
        // 匯入角色能力
        if (importData.data.character_abilities) {
          importData.data.character_abilities.forEach((ability: any) => {
            insertAbility.run(
              ability.id, ability.character_id, ability.name, ability.description
            );
          });
        }
        
        // 匯入角色關係
        if (importData.data.character_relationships) {
          importData.data.character_relationships.forEach((relationship: any) => {
            insertRelationship.run(
              relationship.id, relationship.source_id, relationship.target_id,
              relationship.type, relationship.description
            );
          });
        }
        
        // 匯入模板
        if (importData.data.templates) {
          importData.data.templates.forEach((template: any) => {
            insertTemplate.run(
              template.id, template.name, template.type, template.content, template.created_at
            );
          });
        }
      });
      
      transaction();
      
      return { success: true, message: '資料匯入成功' };
    } catch (error) {
      console.error('匯入資料庫失敗:', error);
      return { success: false, message: error instanceof Error ? error.message : '未知錯誤' };
    }
  });
  
  // 獲取資料庫統計資訊
  ipcMain.handle('database:getStatistics', async () => {
    try {
      const maintenanceService = getDatabaseMaintenanceService();
      const checkResult = await maintenanceService.performHealthCheck();
      return checkResult.statistics;
    } catch (error) {
      console.error('獲取資料庫統計資訊失敗:', error);
      throw error;
    }
  });
  
  // 檢查資料庫完整性
  ipcMain.handle('database:checkIntegrity', async () => {
    try {
      const db = getDatabase();
      const result = db.prepare('PRAGMA integrity_check').all();
      
      return {
        isHealthy: result.length === 1 && result[0].integrity_check === 'ok',
        issues: result.filter((row: any) => row.integrity_check !== 'ok')
      };
    } catch (error) {
      console.error('檢查資料庫完整性失敗:', error);
      throw error;
    }
  });
  
  // 執行 VACUUM 操作
  ipcMain.handle('database:vacuum', async () => {
    try {
      const db = getDatabase();
      db.exec('VACUUM');
      
      // 記錄 VACUUM 時間
      try {
        db.prepare(`
          INSERT OR REPLACE INTO app_settings (key, value) 
          VALUES ('last_vacuum', ?)
        `).run(new Date().toISOString());
      } catch {
        // 如果沒有設定表，創建一個
        db.exec(`
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        db.prepare(`
          INSERT INTO app_settings (key, value) 
          VALUES ('last_vacuum', ?)
        `).run(new Date().toISOString());
      }
      
      return { success: true, message: '資料庫整理完成' };
    } catch (error) {
      console.error('執行 VACUUM 失敗:', error);
      return { success: false, message: error instanceof Error ? error.message : '未知錯誤' };
    }
  });
  
  // 執行 ANALYZE 操作
  ipcMain.handle('database:analyze', async () => {
    try {
      const db = getDatabase();
      db.exec('ANALYZE');
      
      return { success: true, message: '資料庫統計資訊更新完成' };
    } catch (error) {
      console.error('執行 ANALYZE 失敗:', error);
      return { success: false, message: error instanceof Error ? error.message : '未知錯誤' };
    }
  });
}