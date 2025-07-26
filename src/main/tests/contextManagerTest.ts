import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ContextManagerImpl } from '../services/contextManager';

/**
 * 測試上下文管理器
 */
async function testContextManager() {
  console.log('測試上下文管理器...');
  
  // 創建臨時測試資料庫
  const dbPath = path.join(__dirname, 'test-context-manager.db');
  
  // 如果測試資料庫已存在，先刪除
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  // 創建資料庫連接
  const db = new Database(dbPath);
  
  try {
    // 設置測試資料
    setupTestDatabase(db);
    
    // 創建上下文管理器實例
    const contextManager = new ContextManagerImpl(db);
    
    // 1. 測試構建上下文
    console.log('\n1. 測試構建上下文');
    const context = await contextManager.buildContext('project1', 'chapter1', 50);
    console.log('構建的上下文:');
    console.log(context);
    
    // 2. 測試壓縮上下文
    console.log('\n2. 測試壓縮上下文');
    const longContext = '專案：測試專案\n類型：異世界\n描述：這是一個測試專案\n\n' + 
                       '世界觀：異世界\n等級系統：等級與技能系統\n魔法系統：元素魔法\n\n' +
                       '主要角色：\n- 佐藤勇：17歲，男，主角類型\n  外貌：黑髮藍眼\n  性格：勇敢正直\n  背景：原本是地球的普通高中生\n\n' +
                       '當前章節：第一章\n\n' +
                       '這是一個平凡的日子，直到我被卡車撞到。當我醒來時，發現自己身處一個陌生的世界，周圍都是奇幻的生物和魔法。\n' +
                       '「你終於醒了。」一個銀髮精靈少女說道。\n' +
                       '「我在哪裡？」我問道，感到頭痛欲裂。\n' +
                       '「這裡是亞特蘭大陸，你被召喚到這個世界來拯救我們。」她解釋道。\n'.repeat(10);
    
    const compressedContext = contextManager.compressContext(longContext, 100);
    console.log(`原始上下文長度: ${longContext.length}, 壓縮後長度: ${compressedContext.length}`);
    console.log('壓縮後的上下文:');
    console.log(compressedContext);
    
    // 3. 測試整合角色資訊
    console.log('\n3. 測試整合角色資訊');
    const characters = [
      {
        id: 'char1',
        projectId: 'project1',
        name: '測試角色1',
        archetype: '主角',
        age: 17,
        gender: '男',
        appearance: '黑髮藍眼',
        personality: '勇敢正直',
        background: '來自異世界的普通高中生',
        abilities: ['劍術', '魔法'],
        relationships: [
          {
            targetId: 'char2',
            type: '朋友',
            description: '青梅竹馬'
          }
        ]
      }
    ];
    
    const baseContext = '這是基本上下文';
    const integratedContext = contextManager.integrateCharacters(baseContext, characters);
    console.log('整合角色後的上下文:');
    console.log(integratedContext);
    
    // 4. 測試提取相關內容
    console.log('\n4. 測試提取相關內容');
    const fullContent = '這是第一段落，包含了一些基本信息。\n\n' +
                       '這是第二段落，提到了佐藤勇和他的冒險。\n\n' +
                       '這是第三段落，描述了魔法系統和等級。\n\n' +
                       '這是第四段落，講述了佐藤勇和艾莉絲的對話。\n\n' +
                       '這是第五段落，介紹了新的地點和敵人。\n\n' +
                       '這是第六段落，是當前正在寫的內容。';
    
    const position = fullContent.length;
    const relevantContent = contextManager.extractRelevantContent(fullContent, position);
    console.log(`原始內容: ${fullContent}`);
    console.log(`提取位置: ${position}`);
    console.log(`提取結果: ${relevantContent}`);
    
    // 5. 測試上下文品質分析
    console.log('\n5. 測試上下文品質分析');
    const qualityReport = contextManager.analyzeContextQuality(context);
    console.log('上下文品質報告:');
    console.log(JSON.stringify(qualityReport, null, 2));
    
    // 6. 測試獲取相關角色
    console.log('\n6. 測試獲取相關角色');
    const contentWithCharacters = '佐藤勇拿起劍，準備面對敵人。艾莉絲在一旁施展魔法支援。';
    const relevantCharacters = await contextManager.getRelevantCharacters('project1', contentWithCharacters);
    console.log('相關角色:');
    console.log(relevantCharacters);
    
    // 7. 測試檢測新角色
    console.log('\n7. 測試檢測新角色');
    const contentWithNewCharacters = '「你好，我是克拉克。」一個陌生人說道。瑪麗亞笑著回應：「很高興認識你！」';
    const newCharacters = contextManager.detectNewCharacters(contentWithNewCharacters);
    console.log('檢測到的新角色:');
    console.log(newCharacters);
    
    // 8. 測試一致性檢查
    console.log('\n8. 測試一致性檢查');
    const contentWithInconsistency = '佐藤勇非常膽小，不敢面對敵人。艾莉絲說她討厭魔法，再也不想使用了。';
    const consistencyIssues = await contextManager.checkConsistency(contentWithInconsistency, 'project1');
    console.log('一致性問題:');
    console.log(consistencyIssues);
    
    console.log('\n測試完成!');
  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    // 關閉資料庫連接
    db.close();
    
    // 刪除測試資料庫
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  }
}

/**
 * 設置測試資料庫
 */
function setupTestDatabase(db: any) {
  // 啟用外鍵約束
  db.pragma('foreign_keys = ON');
  
  // 創建測試表格
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      settings TEXT
    );
    
    CREATE TABLE chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      order_num INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );
    
    CREATE TABLE characters (
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
    
    CREATE TABLE character_abilities (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
    );
    
    CREATE TABLE character_relationships (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (source_id) REFERENCES characters (id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES characters (id) ON DELETE CASCADE
    );
  `);
  
  // 插入測試資料
  
  // 1. 插入測試專案
  const projectSettings = JSON.stringify({
    aiModel: 'llama3',
    aiParams: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 200,
      presencePenalty: 0,
      frequencyPenalty: 0
    },
    templateSettings: {
      levelSystem: '等級與技能系統',
      magicSystem: '元素魔法',
      reincarnation: '車禍後轉生'
    }
  });
  
  db.prepare(`
    INSERT INTO projects (id, name, type, description, settings)
    VALUES (?, ?, ?, ?, ?)
  `).run('project1', '異世界冒險', 'isekai', '一個普通高中生意外穿越到異世界的冒險故事', projectSettings);
  
  // 2. 插入測試章節
  db.prepare(`
    INSERT INTO chapters (id, project_id, title, content, order_num)
    VALUES (?, ?, ?, ?, ?)
  `).run('chapter1', 'project1', '第一章：異世界的開始', '這是一個平凡的日子，直到我被卡車撞到。當我醒來時，發現自己身處一個陌生的世界，周圍都是奇幻的生物和魔法。', 1);
  
  // 3. 插入測試角色
  db.prepare(`
    INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('char1', 'project1', '佐藤勇', '主角', 17, '男', '黑髮藍眼，身材普通', '勇敢正直，有時衝動', '原本是地球的普通高中生，因車禍穿越到異世界');
  
  db.prepare(`
    INSERT INTO characters (id, project_id, name, archetype, age, gender, appearance, personality, background)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('char2', 'project1', '艾莉絲', '女主角', 16, '女', '金髮綠眼，身材苗條', '聰明機智，略帶傲嬌', '異世界的精靈公主，擁有強大的魔法天賦');
  
  // 4. 插入測試角色能力
  db.prepare(`
    INSERT INTO character_abilities (id, character_id, name, description)
    VALUES (?, ?, ?, ?)
  `).run('ability1', 'char1', '劍術', '基礎劍術技能');
  
  db.prepare(`
    INSERT INTO character_abilities (id, character_id, name, description)
    VALUES (?, ?, ?, ?)
  `).run('ability2', 'char1', '鑑定', '能夠查看物品和生物的屬性');
  
  db.prepare(`
    INSERT INTO character_abilities (id, character_id, name, description)
    VALUES (?, ?, ?, ?)
  `).run('ability3', 'char2', '風系魔法', '操控風元素的魔法');
  
  // 5. 插入測試角色關係
  db.prepare(`
    INSERT INTO character_relationships (id, source_id, target_id, type, description)
    VALUES (?, ?, ?, ?, ?)
  `).run('rel1', 'char1', 'char2', '夥伴', '冒險同伴，互相信任');
  
  db.prepare(`
    INSERT INTO character_relationships (id, source_id, target_id, type, description)
    VALUES (?, ?, ?, ?, ?)
  `).run('rel2', 'char2', 'char1', '夥伴', '被救助者，心存感激');
}

// 執行測試
testContextManager().catch(error => {
  console.error('測試過程中發生錯誤:', error);
});