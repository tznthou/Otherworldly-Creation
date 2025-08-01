use crate::database::{get_db, models::*};
use rusqlite::Result as SqliteResult;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ContextStats {
    pub total_characters: usize,
    pub estimated_tokens: usize,
    pub chapter_count: usize,
    pub character_count: usize,
}

/// 構建 AI 續寫的上下文
#[command]
pub async fn build_context(
    project_id: String,
    chapter_id: String,
    position: usize,
) -> Result<String, String> {
    log::info!("構建上下文 - 專案: {}, 章節: {}, 位置: {}", project_id, chapter_id, position);
    
    let db = get_db().map_err(|e| e.to_string())?;
    
    // 更好地處理 poisoned lock 錯誤
    let conn = match db.lock() {
        Ok(conn) => conn,
        Err(poisoned) => {
            log::error!("資料庫鎖被 poisoned，嘗試恢復: {}", poisoned);
            // 嘗試恢復 poisoned lock
            poisoned.into_inner()
        }
    };
    
    // 1. 獲取專案資訊
    let project: Project = conn
        .query_row(
            "SELECT id, name, description, type, settings, created_at, updated_at FROM projects WHERE id = ?",
            [&project_id],
            |row| Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                r#type: row.get(3)?,
                settings: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        )
        .map_err(|e| format!("獲取專案失敗: {}", e))?;
    
    // 2. 獲取當前章節內容
    let chapter: Chapter = conn
        .query_row(
            "SELECT id, project_id, title, content, order_index, created_at, updated_at FROM chapters WHERE id = ?",
            [&chapter_id],
            |row| Ok(Chapter {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                order_index: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        )
        .map_err(|e| format!("獲取章節失敗: {}", e))?;
    
    // 3. 獲取專案的所有角色
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, description, attributes, avatar_url, created_at, updated_at FROM characters WHERE project_id = ?")
        .map_err(|e| e.to_string())?;
    
    let characters: Vec<Character> = stmt
        .query_map([&project_id], |row| {
            Ok(Character {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                attributes: row.get(4)?,
                avatar_url: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    // 4. 獲取角色關係
    let mut stmt = conn
        .prepare("
            SELECT cr.*, c1.name as from_name, c2.name as to_name 
            FROM character_relationships cr
            JOIN characters c1 ON cr.from_character_id = c1.id
            JOIN characters c2 ON cr.to_character_id = c2.id
            WHERE c1.project_id = ?
        ")
        .map_err(|e| e.to_string())?;
    
    let relationships: Vec<(String, String, String, Option<String>)> = stmt
        .query_map([&project_id], |row| {
            Ok((
                row.get::<_, String>("from_name")?,
                row.get::<_, String>("to_name")?,
                row.get::<_, String>("relationship_type")?,
                row.get::<_, Option<String>>("description")?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    
    // 5. 構建上下文
    let mut context = String::new();
    
    // 字符清理函數
    fn clean_text(text: &str) -> String {
        text.chars()
            .filter(|c| {
                // 保留所有合法的文字字符，包括中文
                c.is_alphanumeric() || // 包括中文字符
                c.is_whitespace() ||   // 空白字符
                ".,!?;:\"'()[]{}「」『』，。！？；：（）【】《》〈〉".contains(*c) || 
                *c == '-' || *c == '_' || *c == '/' || *c == '\\' || 
                *c == '=' || *c == '+' || *c == '*' || *c == '&' ||
                *c == '%' || *c == '$' || *c == '#' || *c == '@'
            })
            .collect()
    }
    
    // 添加專案背景
    context.push_str("[Story Background]\n");
    context.push_str(&format!("Title: {}\n", clean_text(&project.name)));
    if let Some(desc) = &project.description {
        context.push_str(&format!("Description: {}\n", clean_text(desc)));
    }
    if let Some(project_type) = &project.r#type {
        context.push_str(&format!("Genre: {}\n", clean_text(project_type)));
    }
    context.push_str("\n");
    
    // 添加角色設定
    if !characters.is_empty() {
        context.push_str("【角色設定】\n");
        for character in &characters {
            context.push_str(&format!("◆ {}\n", character.name));
            if let Some(desc) = &character.description {
                context.push_str(&format!("  描述：{}\n", desc));
            }
            if let Some(attrs) = &character.attributes {
                // 解析 JSON 屬性
                if let Ok(attrs_json) = serde_json::from_str::<serde_json::Value>(attrs) {
                    if let Some(obj) = attrs_json.as_object() {
                        for (key, value) in obj {
                            if let Some(v) = value.as_str() {
                                if !v.is_empty() {
                                    context.push_str(&format!("  {}：{}\n", key, v));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 添加角色關係
        if !relationships.is_empty() {
            context.push_str("\n【角色關係】\n");
            for (from, to, rel_type, desc) in &relationships {
                context.push_str(&format!("- {} 與 {} 的關係：{}", from, to, rel_type));
                if let Some(d) = desc {
                    context.push_str(&format!("（{}）", d));
                }
                context.push_str("\n");
            }
        }
        context.push_str("\n");
    }
    
    // 添加當前章節內容（包含游標前後的內容）
    context.push_str("[Current Chapter]\n");
    context.push_str(&format!("Chapter Title: {}\n", clean_text(&chapter.title)));
    context.push_str("Content:\n");
    
    if let Some(content) = &chapter.content {
        let content_chars: Vec<char> = content.chars().collect();
        let char_len = content_chars.len();
        let char_position = position.min(char_len); // 確保位置不超過字符長度
        
        // 安全地分割內容為游標前和游標後（按字符而非字節）
        let before_cursor: String = content_chars[..char_position].iter().collect();
        let after_cursor: String = content_chars[char_position..].iter().collect();
        
        // 處理游標前的內容
        let cleaned_before = clean_text(&before_cursor);
        const MAX_CONTEXT_CHARS: usize = 1000;
        
        if cleaned_before.chars().count() > MAX_CONTEXT_CHARS {
            let before_chars: Vec<char> = cleaned_before.chars().collect();
            let total_chars = before_chars.len();
            let start_pos = total_chars.saturating_sub(MAX_CONTEXT_CHARS);
            
            // 安全地截取後面的字符
            let remaining_chars: Vec<char> = before_chars[start_pos..].to_vec();
            let remaining_text: String = remaining_chars.iter().collect();
            
            // 找到最近的句號或換行符，避免從句子中間開始
            let adjusted_start = remaining_text
                .find(|c| c == '.' || c == '!' || c == '?' || c == '\n')
                .map(|i| i + 1)
                .unwrap_or(0);
            
            context.push_str("...(previous content omitted)...\n\n");
            // 安全地截取調整後的內容
            let final_chars: Vec<char> = remaining_text.chars().collect();
            let final_text: String = final_chars[adjusted_start.min(final_chars.len())..].iter().collect();
            context.push_str(&final_text);
        } else {
            context.push_str(&cleaned_before);
        }
        
        // 添加游標位置標記
        context.push_str("\n\n[[[INSERT CONTINUATION HERE]]]\n\n");
        
        // 處理游標後的內容（如果有的話，顯示一小部分讓 AI 知道後續內容）
        if !after_cursor.is_empty() {
            let cleaned_after = clean_text(&after_cursor);
            const MAX_AFTER_CHARS: usize = 200; // 只顯示後面 200 字
            
            if cleaned_after.chars().count() > MAX_AFTER_CHARS {
                // 安全地截取前 MAX_AFTER_CHARS 個字符
                let after_chars: Vec<char> = cleaned_after.chars().collect();
                let truncated_chars: Vec<char> = after_chars[..MAX_AFTER_CHARS].to_vec();
                let truncated_after: String = truncated_chars.iter().collect();
                
                // 找到最近的句號，避免在句子中間截斷
                let end_pos = truncated_after
                    .rfind(|c| c == '.' || c == '!' || c == '?' || c == '\n')
                    .unwrap_or(truncated_after.len());
                
                context.push_str("[Existing content after cursor:]\n");
                // 安全地截取到 end_pos
                let final_chars: Vec<char> = truncated_after.chars().collect();
                let final_text: String = final_chars[..end_pos.min(final_chars.len())].iter().collect();
                context.push_str(&final_text);
                context.push_str("\n...(remaining content continues)...\n");
            } else {
                context.push_str("[Existing content after cursor:]\n");
                context.push_str(&cleaned_after);
            }
        }
    }
    
    // 添加續寫指示
    context.push_str("\n\n[Writing Instructions]\n");
    context.push_str("IMPORTANT: Insert your continuation at the position marked with [[[INSERT CONTINUATION HERE]]].\n");
    context.push_str("Do NOT repeat or rewrite the existing content before or after the insertion point.\n");
    context.push_str("Your response should ONLY contain the new text to be inserted.\n\n");
    context.push_str("Requirements:\n");
    context.push_str("1. Maintain character consistency and dialogue style\n");
    context.push_str("2. Continue the current plot development smoothly from the insertion point\n");
    context.push_str("3. Keep the same writing style and narrative perspective\n");
    context.push_str("4. Ensure detail consistency (time, place, character states)\n");
    context.push_str("5. Write only the continuation text, without any meta-comments or explanations\n");
    context.push_str("6. Make sure your continuation flows naturally with both the text before and after the insertion point\n");
    
    // 如果是輕小說類型，添加特定提示
    if let Some(project_type) = &project.r#type {
        if project_type.contains("輕小說") || project_type.contains("light novel") {
            context.push_str("\n輕小說風格提示：\n");
            context.push_str("- 適當加入角色內心獨白\n");
            context.push_str("- 保持節奏明快，對話生動\n");
            context.push_str("- 可以適當使用擬聲詞和表情描寫\n");
        }
    }
    
    Ok(context)
}

/// 壓縮上下文以適應 token 限制
#[command]
pub async fn compress_context(
    context: String,
    max_tokens: usize,
) -> Result<String, String> {
    // 簡單的壓縮策略：估算 token 數並截斷
    // 中文大約 1.5-2 字符 = 1 token
    let estimated_tokens = context.chars().count() / 2;
    
    if estimated_tokens <= max_tokens {
        return Ok(context);
    }
    
    // 需要壓縮，優先保留：
    // 1. 續寫要求（最後部分）
    // 2. 當前章節內容（盡可能多）
    // 3. 角色設定（重要）
    // 4. 故事背景（次要）
    
    let sections: Vec<&str> = context.split("【").collect();
    let mut compressed = String::new();
    
    // 保留續寫要求
    if let Some(requirements) = sections.iter().find(|s| s.starts_with("續寫要求】")) {
        compressed = format!("【{}\n\n", requirements);
    }
    
    // 計算剩餘可用 token
    let requirements_tokens = compressed.chars().count() / 2;
    let remaining_tokens = max_tokens.saturating_sub(requirements_tokens);
    
    // 優先添加當前章節內容
    if let Some(chapter) = sections.iter().find(|s| s.starts_with("當前章節】")) {
        let chapter_content = format!("【{}", chapter);
        let chapter_tokens = chapter_content.chars().count() / 2;
        
        if chapter_tokens <= remaining_tokens {
            compressed = format!("{}【{}\n\n", chapter_content, compressed);
        } else {
            // 截斷章節內容
            let max_chars = remaining_tokens * 2;
            let truncated = chapter_content.chars().take(max_chars).collect::<String>();
            compressed = format!("{}\n...(內容已截斷)...\n\n{}", truncated, compressed);
        }
    }
    
    Ok(compressed)
}

/// 獲取上下文統計信息
#[command]
pub async fn get_context_stats(project_id: String) -> Result<ContextStats, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    
    // 更好地處理 poisoned lock 錯誤
    let conn = match db.lock() {
        Ok(conn) => conn,
        Err(poisoned) => {
            log::error!("資料庫鎖被 poisoned，嘗試恢復: {}", poisoned);
            // 嘗試恢復 poisoned lock
            poisoned.into_inner()
        }
    };
    
    // 統計章節數量
    let chapter_count: usize = conn
        .query_row(
            "SELECT COUNT(*) FROM chapters WHERE project_id = ?",
            [&project_id],
            |row| row.get(0)
        )
        .map_err(|e| e.to_string())?;
    
    // 統計角色數量
    let character_count: usize = conn
        .query_row(
            "SELECT COUNT(*) FROM characters WHERE project_id = ?",
            [&project_id],
            |row| row.get(0)
        )
        .map_err(|e| e.to_string())?;
    
    // 統計總字數
    let total_chars: usize = conn
        .query_row(
            "SELECT COALESCE(SUM(LENGTH(content)), 0) FROM chapters WHERE project_id = ?",
            [&project_id],
            |row| row.get(0)
        )
        .map_err(|e| e.to_string())?;
    
    // 估算 token 數（中文約 1.5-2 字符 = 1 token）
    let estimated_tokens = total_chars / 2;
    
    Ok(ContextStats {
        total_characters: total_chars,
        estimated_tokens,
        chapter_count,
        character_count,
    })
}