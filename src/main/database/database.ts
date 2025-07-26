import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { setContextManager } from '../services/contextManager';

let db: any;

const DB_VERSION = 1;

export async function initDatabase(): Promise<void> {
  try {
    // 獲取用戶數據目錄
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'genesis-chronicle.db');

    console.log('初始化資料庫:', dbPath);

    // 創建資料庫連接
    db = new Database(dbPath);

    // 啟用外鍵約束
    db.pragma('foreign_keys = ON');

    // 檢查並執行資料庫遷移
    await runMigrations();

    console.log('資料庫初始化完成');
    
    // 初始化上下文管理器
    setContextManager(db);
    console.log('上下文管理器初始化完成');
  } catch (error) {
    console.error('資料庫初始化失敗:', error);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  // 創建版本表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 獲取當前資料庫版本
  const versionResult = db.prepare('SELECT version FROM db_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
  const currentVersion = versionResult?.version || 0;

  console.log(`當前資料庫版本: ${currentVersion}, 目標版本: ${DB_VERSION}`);

  // 執行遷移
  if (currentVersion < DB_VERSION) {
    console.log('執行資料庫遷移...');

    // 在事務中執行遷移
    const transaction = db.transaction(() => {
      if (currentVersion < 1) {
        // 版本 1: 創建基本表格
        createTables();

        // 記錄版本
        db.prepare('INSERT INTO db_version (version) VALUES (?)').run(1);
        console.log('遷移到版本 1 完成');
      }

      // 未來的遷移可以在這裡添加
      // if (currentVersion < 2) { ... }
    });

    transaction();
    console.log('資料庫遷移完成');
  } else {
    console.log('資料庫已是最新版本');
  }
}

function createTables(): void {
  // 創建專案表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      settings TEXT
    );
  `);

  // 創建章節表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      order_num INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
  `);

  // 創建角色表
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      archetype TEXT,
      age INTEGER,
      gender TEXT,
      appearance TEXT,
      personality TEXT,
      background TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
  `);

  // 創建角色能力表
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_abilities (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
    );
  `);

  // 創建角色關係表
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_relationships (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (source_id) REFERENCES characters (id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES characters (id) ON DELETE CASCADE
    );
  `);

  // 創建模板表
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 插入預設模板（如果不存在）
  insertDefaultTemplates();
}

function insertDefaultTemplates(): void {
  const checkTemplate = db.prepare('SELECT COUNT(*) as count FROM templates WHERE type = ?');
  const insertTemplate = db.prepare(`
    INSERT INTO templates (id, name, type, content)
    VALUES (?, ?, ?, ?)
  `);

  // 異世界模板
  const isekaiResult = checkTemplate.get('isekai') as { count: number } | undefined;
  if (isekaiResult && isekaiResult.count === 0) {
    insertTemplate.run(
      'isekai-default',
      '異世界轉生模板',
      'isekai',
      JSON.stringify({
        worldSetting: {
          era: '中世紀奇幻',
          technology: '魔法與劍',
          society: '王國制度',
          specialElements: ['等級系統', '技能樹', '魔法學院', '冒險者公會']
        },
        characterArchetypes: [
          { name: '轉生勇者', personality: '正義感強烈，但有現代人的常識' },
          { name: '精靈法師', personality: '高傲但善良，擅長魔法' },
          { name: '獸人戰士', personality: '豪爽直率，重視友情' },
          { name: '魔王', personality: '複雜的動機，非純粹邪惡' }
        ],
        plotFramework: [
          '轉生到異世界',
          '發現特殊能力',
          '結識夥伴',
          '面對危機',
          '拯救世界'
        ]
      })
    );
  }

  // 校園模板
  const schoolResult = checkTemplate.get('school') as { count: number } | undefined;
  if (schoolResult && schoolResult.count === 0) {
    insertTemplate.run(
      'school-default',
      '校園戀愛喜劇模板',
      'school',
      JSON.stringify({
        worldSetting: {
          era: '現代',
          location: '日式高中',
          society: '學生生活',
          specialElements: ['社團活動', '文化祭', '修學旅行', '考試']
        },
        characterArchetypes: [
          { name: '平凡男主角', personality: '普通但善良，容易捲入麻煩' },
          { name: '傲嬌女主角', personality: '外表冷漠內心溫柔，雙馬尾' },
          { name: '青梅竹馬', personality: '活潑開朗，從小認識主角' },
          { name: '學生會長', personality: '完美主義者，暗藏秘密' }
        ],
        plotFramework: [
          '新學期開始',
          '意外相遇',
          '誤會產生',
          '加深了解',
          '戀愛成長'
        ]
      })
    );
  }

  // 科幻模板
  const scifiResult = checkTemplate.get('scifi') as { count: number } | undefined;
  if (scifiResult && scifiResult.count === 0) {
    insertTemplate.run(
      'scifi-default',
      '科幻冒險模板',
      'scifi',
      JSON.stringify({
        worldSetting: {
          era: '未來世界',
          technology: '高科技與AI',
          society: '太空殖民時代',
          specialElements: ['機甲戰鬥', 'AI夥伴', '太空旅行', '賽博朋克']
        },
        characterArchetypes: [
          { name: '機師主角', personality: '冷靜理性，擅長駕駛機甲' },
          { name: '駭客天才', personality: '聰明機智，精通網路技術' },
          { name: 'AI助手', personality: '邏輯思維，逐漸發展情感' },
          { name: '企業反派', personality: '野心勃勃，利用科技控制' }
        ],
        plotFramework: [
          '任務接受',
          '遭遇困難',
          '團隊合作',
          '科技升級',
          '最終勝利'
        ]
      })
    );
  }

  // 奇幻模板
  const fantasyResult = checkTemplate.get('fantasy') as { count: number } | undefined;
  if (fantasyResult && fantasyResult.count === 0) {
    insertTemplate.run(
      'fantasy-default',
      '奇幻冒險模板',
      'fantasy',
      JSON.stringify({
        worldSetting: {
          era: '中古奇幻',
          technology: '劍與魔法',
          society: '多種族共存',
          specialElements: ['魔法學院', '地下城探索', '龍與寶藏', '古老預言']
        },
        characterArchetypes: [
          { name: '見習魔法師', personality: '好奇心強，渴望學習魔法' },
          { name: '精靈弓手', personality: '優雅敏捷，與自然親近' },
          { name: '矮人戰士', personality: '勇敢堅毅，重視榮譽' },
          { name: '龍族少女', personality: '高傲神秘，擁有強大力量' }
        ],
        plotFramework: [
          '學習成長',
          '冒險試煉',
          '遇見夥伴',
          '面對強敵',
          '成為英雄'
        ]
      })
    );
  }
}

export function getDatabase(): any {
  if (!db) {
    throw new Error('資料庫尚未初始化');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

// 專案管理函數
export function getAllProjects() {
  if (!db) throw new Error('資料庫未初始化');
  return db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
}

export function createProject(project: any) {
  if (!db) throw new Error('資料庫未初始化');
  const id = require('uuid').v4();
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, type, description, settings)
    VALUES (?, ?, ?, ?, ?)
  `);
  const settings = JSON.stringify({
    genre: project.genre || '奇幻',
    status: 'active',
    word_count: 0
  });
  stmt.run(id, project.title, project.type || 'novel', project.description || '', settings);
  return id;
}

export function getProjectById(id: string) {
  if (!db) throw new Error('資料庫未初始化');
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

export function updateProject(project: any) {
  if (!db) throw new Error('資料庫未初始化');
  const stmt = db.prepare(`
    UPDATE projects 
    SET name = ?, type = ?, description = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const settings = JSON.stringify({
    genre: project.genre || '奇幻',
    status: project.status || 'active',
    word_count: project.word_count || 0
  });
  stmt.run(project.title, project.type || 'novel', project.description, settings, project.id);
}

export function deleteProject(id: string) {
  if (!db) throw new Error('資料庫未初始化');
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(id);
}

// 章節管理函數
export function getChaptersByProjectId(projectId: string) {
  if (!db) throw new Error('資料庫未初始化');
  return db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_num').all(projectId);
}

export function createChapter(chapter: any) {
  if (!db) throw new Error('資料庫未初始化');
  const id = require('uuid').v4();
  const stmt = db.prepare(`
    INSERT INTO chapters (id, project_id, title, content, order_num)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, chapter.project_id, chapter.title, chapter.content || '', chapter.order_num || 1);
  return id;
}

export function getChapterById(id: string) {
  if (!db) throw new Error('資料庫未初始化');
  return db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);
}

export function updateChapter(chapter: any) {
  if (!db) throw new Error('資料庫未初始化');
  const stmt = db.prepare(`
    UPDATE chapters 
    SET title = ?, content = ?, order_num = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(chapter.title, chapter.content, chapter.order_num, chapter.id);
}

export function deleteChapter(id: string) {
  if (!db) throw new Error('資料庫未初始化');
  const stmt = db.prepare('DELETE FROM chapters WHERE id = ?');
  stmt.run(id);
}