use crate::database::{get_db, models::*};
use crate::utils::language_purity::LanguagePurityEnforcer;
use rusqlite::Result as SqliteResult;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::command;

/// 從章節內容中提取筆記
fn extract_chapter_notes(content_json: &str) -> Option<String> {
    // 嘗試解析章節內容的 JSON
    if let Ok(content) = serde_json::from_str::<Value>(content_json) {
        // 查找 metadata.notes
        if let Some(obj) = content.as_object() {
            if let Some(metadata) = obj.get("metadata") {
                if let Some(notes) = metadata.get("notes") {
                    if let Some(notes_str) = notes.as_str() {
                        if !notes_str.trim().is_empty() {
                            log::info!("✅ 找到章節筆記，長度: {} 字符", notes_str.len());
                            return Some(notes_str.to_string());
                        }
                    }
                }
            }
        }
        
        // 如果是陣列格式，檢查每個元素
        if let Some(array) = content.as_array() {
            for item in array {
                if let Some(obj) = item.as_object() {
                    if let Some(metadata) = obj.get("metadata") {
                        if let Some(notes) = metadata.get("notes") {
                            if let Some(notes_str) = notes.as_str() {
                                if !notes_str.trim().is_empty() {
                                    log::info!("✅ 在陣列中找到章節筆記，長度: {} 字符", notes_str.len());
                                    return Some(notes_str.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    log::debug!("🔍 未找到章節筆記");
    None
}

/// 字符清理函數 - 保留合法的文字字符，包括中文
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ContextStats {
    pub total_characters: usize,
    pub estimated_tokens: usize,
    pub chapter_count: usize,
    pub character_count: usize,
}

/// 系統提示建構器 - 分離固定指令以節省 token（簡化版）
#[derive(Debug, Clone)]
pub struct SystemPromptBuilder {
    pub project_type: Option<String>,
}

impl SystemPromptBuilder {
    pub fn new(project_type: Option<String>) -> Self {
        Self { project_type }
    }

    /// 建構系統提示，專注於繁體中文小說續寫
    pub fn build_system_prompt(&self) -> String {
        let enforcer = LanguagePurityEnforcer::new();
        
        let base_instructions = "你是一個專業的中文小說續寫助手。你的任務是根據提供的上下文資訊，在指定位置插入合適的續寫內容。

核心要求:
- 在 [CONTINUE HERE] 標記處插入續寫內容
- **重要**：絕對不要重複、複製或重寫現有內容
- **重要**：只提供全新的續寫內容，延續故事情節
- **重要**：如果看到現有內容已經完整，請提供下一個情節發展
- 保持角色一致性和對話風格
- 確保情節連貫和細節一致
- CRITICAL: 嚴格使用繁體中文，絕對不允許混雜任何英文單詞或簡體字
- 所有描述、動作、對話都必須使用純正繁體中文
- 禁止使用英文拼音、英文縮寫或任何英文表達
- 只提供續寫文本，無需解釋或評論

續寫指導原則:
- 如果現有內容已經結束在對話或動作，請續寫下一個場景或反應
- 如果現有內容是描述性文字，請續寫角色的想法、對話或新動作
- 推進情節發展，不要停留在已描述的內容上
- 每次續寫應該帶來新的信息或推進故事";

        let genre_specific = if let Some(project_type) = &self.project_type {
            let is_light_novel = project_type.to_lowercase().contains("輕小說") || 
                               project_type.to_lowercase().contains("轻小说") ||
                               project_type.to_lowercase().contains("light novel");
            
            if is_light_novel {
                "

輕小說風格要求:
- 適當加入角色內心獨白
- 保持節奏明快，對話生動
- 可以適當使用擬聲詞和表情描寫
- 嚴禁使用英文單詞或簡體字"
            } else {
                ""
            }
        } else {
            ""
        };

        // 使用語言純度增強器生成強化的系統提示
        let enhanced_prompt = format!("{}{}", base_instructions, genre_specific);
        enforcer.generate_enhanced_system_prompt(&enhanced_prompt)
    }
}

/// 用戶上下文建構器 - 精簡的內容上下文
#[derive(Debug)]
pub struct UserContextBuilder {
    pub project: Project,
    pub chapter: Chapter,
    pub characters: Vec<Character>,
    pub position: usize,
}

impl UserContextBuilder {
    pub fn new(project: Project, chapter: Chapter, characters: Vec<Character>, position: usize) -> Self {
        Self { project, chapter, characters, position }
    }

    /// 建構精簡的用戶上下文
    pub fn build_user_context(&self) -> String {
        let mut context = String::new();
        
        // 項目基本信息 - 使用極簡標籤
        context.push_str(&format!("Title: {}\n", clean_text(&self.project.name)));
        
        if let Some(desc) = &self.project.description {
            let short_desc = clean_text(desc).chars().take(150).collect::<String>();
            context.push_str(&format!("Summary: {}\n", short_desc));
        }
        
        if let Some(project_type) = &self.project.r#type {
            context.push_str(&format!("Genre: {}\n", clean_text(project_type)));
        }
        
        // 角色信息 - 只保留核心屬性
        if !self.characters.is_empty() {
            context.push_str("\nCharacters:\n");
            for character in &self.characters {
                let char_desc = character.description.as_deref().unwrap_or("")
                    .chars().take(80).collect::<String>(); // 限制每個角色描述為80字符
                context.push_str(&format!("- {}: {}\n", character.name, char_desc));
                
                // 簡化屬性顯示
                if let Some(attrs) = &character.attributes {
                    if let Ok(attrs_json) = serde_json::from_str::<serde_json::Value>(attrs) {
                        if let Some(obj) = attrs_json.as_object() {
                            let mut key_attrs = Vec::new();
                            for (key, value) in obj.iter().take(3) { // 最多顯示3個屬性
                                if let Some(v) = value.as_str() {
                                    if !v.is_empty() && v.len() < 30 {
                                        key_attrs.push(format!("{}:{}", key, v));
                                    }
                                }
                            }
                            if !key_attrs.is_empty() {
                                context.push_str(&format!("  ({})\n", key_attrs.join(", ")));
                            }
                        }
                    }
                }
            }
        }
        
        // 當前章節內容
        context.push_str(&format!("\nChapter: {}\n", clean_text(&self.chapter.title)));
        context.push_str("Content:\n");
        context.push_str(&self.extract_relevant_content());
        context.push_str("\n[CONTINUE HERE]");
        
        context
    }
    
    /// 智能提取相關內容
    fn extract_relevant_content(&self) -> String {
        if let Some(content) = &self.chapter.content {
            let content_chars: Vec<char> = content.chars().collect();
            let char_len = content_chars.len();
            let char_position = self.position.min(char_len);
            
            // 分割內容
            let before_cursor: String = content_chars[..char_position].iter().collect();
            let after_cursor: String = content_chars[char_position..].iter().collect();
            
            let mut result = String::new();
            
            // 處理游標前的內容 - 動態調整長度
            let cleaned_before = clean_text(&before_cursor);
            const MAX_BEFORE_CHARS: usize = 800; // 減少到800字符
            
            if cleaned_before.chars().count() > MAX_BEFORE_CHARS {
                let before_chars: Vec<char> = cleaned_before.chars().collect();
                let total_chars = before_chars.len();
                let start_pos = total_chars.saturating_sub(MAX_BEFORE_CHARS);
                
                // 找到合適的開始點（句子邊界）
                let remaining_text: String = before_chars[start_pos..].iter().collect();
                let adjusted_start = remaining_text
                    .find(|c| c == '.' || c == '!' || c == '?' || c == '\n' || c == '。' || c == '！' || c == '？')
                    .map(|i| i + 1)
                    .unwrap_or(0);
                
                result.push_str("...(前文省略)...
");
                let final_chars: Vec<char> = remaining_text.chars().collect();
                let final_text: String = final_chars[adjusted_start.min(final_chars.len())..].iter().collect();
                result.push_str(&final_text);
            } else {
                result.push_str(&cleaned_before);
            }
            
            // 添加明確的續寫標記 - 更加突出
            result.push_str("

>>> [續寫位置：請在此處繼續故事，不要重複上述內容] <<<

");
            
            // 處理游標後的內容 - 如果有後續內容，明確標示這是「未來內容」
            if !after_cursor.is_empty() {
                let cleaned_after = clean_text(&after_cursor);
                const MAX_AFTER_CHARS: usize = 100; // 減少到100字符
                
                if cleaned_after.chars().count() > MAX_AFTER_CHARS {
                    let after_chars: Vec<char> = cleaned_after.chars().collect();
                    let truncated_chars: Vec<char> = after_chars[..MAX_AFTER_CHARS].to_vec();
                    let truncated_after: String = truncated_chars.iter().collect();
                    
                    let end_pos = truncated_after
                        .rfind(|c| c == '.' || c == '!' || c == '?' || c == '\n' || c == '。' || c == '！' || c == '？')
                        .unwrap_or(truncated_after.len());
                    
                    result.push_str("[注意：以下是已存在的後續內容，請不要重複或修改：]
");
                    let final_chars: Vec<char> = truncated_after.chars().collect();
                    let final_text: String = final_chars[..end_pos.min(final_chars.len())].iter().collect();
                    result.push_str(&final_text);
                    result.push_str("
...(後續內容繼續)...");
                } else if cleaned_after.len() > 10 { // 只有在有意義的內容時才顯示
                    result.push_str("[注意：以下是已存在的後續內容，請不要重複或修改：]
");
                    result.push_str(&cleaned_after);
                }
            }
            
            result
        } else {
            String::new()
        }
    }
}

/// 構建 AI 續寫的上下文（簡化版 - 向後兼容）
#[command]
pub async fn build_context(
    project_id: String,
    chapter_id: String,
    position: usize,
    _language: Option<String>,
) -> Result<String, String> {
    log::info!("構建上下文 - 專案: {}, 章節: {}, 位置: {} (簡化版)", project_id, chapter_id, position);
    
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
            "SELECT id, name, description, type, novel_length, settings, created_at, updated_at FROM projects WHERE id = ?",
            [&project_id],
            |row| Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                r#type: row.get(3)?,
                novel_length: row.get(4)?,
                settings: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        )
        .map_err(|e| format!("獲取專案失敗: {}", e))?;
    
    // 2. 獲取當前章節內容
    let chapter: Chapter = conn
        .query_row(
            "SELECT id, project_id, title, content, order_index, chapter_number, metadata, created_at, updated_at FROM chapters WHERE id = ?",
            [&chapter_id],
            |row| Ok(Chapter {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                order_index: row.get(4)?,
                chapter_number: row.get(5)?,
                metadata: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
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
    
    // 5. 提取章節筆記
    let chapter_notes = if let Some(content) = &chapter.content {
        extract_chapter_notes(content)
    } else {
        None
    };
    
    // 6. 構建上下文
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
    
    // 使用簡化的繁體中文標籤
    let labels = (
        "【故事背景】",           // story_background
        "書名：",                // book_name
        "簡介：",                // description
        "類型：",                // genre
        "【角色設定】",          // character_settings
        "  描述：",              // character_description
        "【角色關係】",          // character_relationships
        "【當前章節】",          // current_chapter
        "章節標題：",            // chapter_title
        "內容：",                // content
        "...（前文省略）...",     // previous_content_omitted
        "【請在此處續寫，CRITICAL: 嚴格使用繁體中文，絕對禁止任何英文單詞或簡體字】", // insert_continuation_here
        "【游標後的現有內容：】", // existing_content_after
        "...（後續內容繼續）...", // remaining_content_continues
        "【續寫要求】",          // writing_instructions
    );
    
    // 添加專案背景
    context.push_str(labels.0); // story_background
    context.push_str("\n");
    context.push_str(&format!("{}{}\n", labels.1, clean_text(&project.name))); // book_name
    if let Some(desc) = &project.description {
        context.push_str(&format!("{}{}\n", labels.2, clean_text(desc))); // description
    }
    if let Some(project_type) = &project.r#type {
        context.push_str(&format!("{}{}\n", labels.3, clean_text(project_type))); // genre
    }
    context.push_str("\n");
    
    // 添加角色設定
    if !characters.is_empty() {
        context.push_str(labels.4); // character_settings
        context.push_str("\n");
        for character in &characters {
            context.push_str(&format!("◆ {}\n", character.name));
            if let Some(desc) = &character.description {
                context.push_str(&format!("{}{}\n", labels.5, desc)); // character_description
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
            context.push_str("\n");
            context.push_str(labels.6); // character_relationships
            context.push_str("\n");
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
    context.push_str(labels.7); // current_chapter
    context.push_str("\n");
    context.push_str(&format!("{}{}\n", labels.8, clean_text(&chapter.title))); // chapter_title
    context.push_str(labels.9); // content
    context.push_str("\n");
    
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
            
            context.push_str(labels.10); // previous_content_omitted
            context.push_str("\n\n");
            // 安全地截取調整後的內容
            let final_chars: Vec<char> = remaining_text.chars().collect();
            let final_text: String = final_chars[adjusted_start.min(final_chars.len())..].iter().collect();
            context.push_str(&final_text);
        } else {
            context.push_str(&cleaned_before);
        }
        
        // 添加游標位置標記
        context.push_str("\n\n");
        context.push_str(labels.11); // insert_continuation_here
        context.push_str("\n\n");
        
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
                
                context.push_str(labels.12); // existing_content_after
                context.push_str("\n");
                // 安全地截取到 end_pos
                let final_chars: Vec<char> = truncated_after.chars().collect();
                let final_text: String = final_chars[..end_pos.min(final_chars.len())].iter().collect();
                context.push_str(&final_text);
                context.push_str("\n");
                context.push_str(labels.13); // remaining_content_continues
                context.push_str("\n");
            } else {
                context.push_str(labels.12); // existing_content_after
                context.push_str("\n");
                context.push_str(&cleaned_after);
            }
        }
    }
    
    // 🔥 新增：添加章節筆記到上下文
    if let Some(notes) = chapter_notes {
        context.push_str("\n\n【章節筆記】\n");
        context.push_str("作者筆記：");
        context.push_str(&clean_text(&notes));
        context.push_str("\n");
        log::info!("✅ 章節筆記已添加到上下文，長度: {} 字符", notes.len());
    }
    
    // 添加續寫指示
    context.push_str("\n\n");
    context.push_str(labels.14); // writing_instructions
    context.push_str("\n");
    
    // 添加繁體中文續寫要求（簡化版）
    context.push_str("重要：在標記的位置插入續寫內容。\n");
    context.push_str("不要重複或重寫插入點前後的現有內容。\n");
    context.push_str("你的回應應該只包含要插入的新文本。\n\n");
    context.push_str("要求：\n");
    context.push_str("1. 保持角色一致性和對話風格\n");
    context.push_str("2. 從插入點平滑地繼續當前情節發展\n");
    context.push_str("3. 保持相同的寫作風格和敘事視角\n");
    context.push_str("4. 確保細節一致性（時間、地點、角色狀態）\n");
    context.push_str("5. 只寫續寫文本，不要任何元評論或解釋\n");
    context.push_str("6. 確保你的續寫與插入點前後的文本自然銜接\n");
    context.push_str("7. CRITICAL: 嚴格使用繁體中文寫作，絕對不允許混雜任何英文單詞或簡體字\n");
    
    // 如果是輕小說類型，添加特定提示（簡化版）
    if let Some(project_type) = &project.r#type {
        let is_light_novel = project_type.to_lowercase().contains("輕小說") || 
                           project_type.to_lowercase().contains("轻小说") ||
                           project_type.to_lowercase().contains("light novel");
        
        if is_light_novel {
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

/// 構建分離的上下文（系統提示 + 用戶上下文）- 簡化版
#[command]
pub async fn build_separated_context(
    project_id: String,
    chapter_id: String,
    position: usize,
) -> Result<(String, String), String> {
    log::info!("構建分離上下文 - 專案: {}, 章節: {}, 位置: {}", project_id, chapter_id, position);
    
    let db = get_db().map_err(|e| e.to_string())?;
    
    // 處理 poisoned lock 錯誤
    let conn = match db.lock() {
        Ok(conn) => conn,
        Err(poisoned) => {
            log::error!("資料庫鎖被 poisoned，嘗試恢復: {}", poisoned);
            poisoned.into_inner()
        }
    };
    
    // 1. 獲取專案資訊
    let project: Project = conn
        .query_row(
            "SELECT id, name, description, type, novel_length, settings, created_at, updated_at FROM projects WHERE id = ?",
            [&project_id],
            |row| Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                r#type: row.get(3)?,
                novel_length: row.get(4)?,
                settings: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        )
        .map_err(|e| format!("獲取專案失敗: {}", e))?;
    
    // 2. 獲取當前章節內容
    let chapter: Chapter = conn
        .query_row(
            "SELECT id, project_id, title, content, order_index, chapter_number, metadata, created_at, updated_at FROM chapters WHERE id = ?",
            [&chapter_id],
            |row| Ok(Chapter {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                order_index: row.get(4)?,
                chapter_number: row.get(5)?,
                metadata: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
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
    
    // 4. 構建系統提示
    let system_prompt_builder = SystemPromptBuilder::new(project.r#type.clone());
    let system_prompt = system_prompt_builder.build_system_prompt();
    
    // 5. 構建用戶上下文
    let user_context_builder = UserContextBuilder::new(project, chapter, characters, position);
    let user_context = user_context_builder.build_user_context();
    
    log::info!("上下文構建完成 - 系統提示: {} 字符, 用戶上下文: {} 字符", 
              system_prompt.chars().count(), 
              user_context.chars().count());
    
    Ok((system_prompt, user_context))
}

/// 估算分離上下文的 token 使用情況
#[command]
pub async fn estimate_separated_context_tokens(project_id: String) -> Result<SeparatedContextStats, String> {
    let db = get_db().map_err(|e| e.to_string())?;
    
    let conn = match db.lock() {
        Ok(conn) => conn,
        Err(poisoned) => {
            log::error!("資料庫鎖被 poisoned，嘗試恢復: {}", poisoned);
            poisoned.into_inner()
        }
    };
    
    // 獲取專案類型用於系統提示估算
    let project_type: Option<String> = conn
        .query_row(
            "SELECT type FROM projects WHERE id = ?",
            [&project_id],
            |row| Ok(row.get(0)?)
        )
        .map_err(|e| format!("獲取專案類型失敗: {}", e))?;
    
    // 統計用戶內容（用於日誌記錄）
    let _total_chars: usize = conn
        .query_row(
            "SELECT COALESCE(SUM(LENGTH(content)), 0) FROM chapters WHERE project_id = ?",
            [&project_id],
            |row| row.get(0)
        )
        .map_err(|e| e.to_string())?;
    
    let character_count: usize = conn
        .query_row(
            "SELECT COUNT(*) FROM characters WHERE project_id = ?",
            [&project_id],
            |row| row.get(0)
        )
        .map_err(|e| e.to_string())?;
    
    // 估算系統提示 token（相對固定）
    let system_prompt_builder = SystemPromptBuilder::new(project_type);
    let system_prompt = system_prompt_builder.build_system_prompt();
    let system_prompt_tokens = system_prompt.chars().count() / 2; // 中文約 2 字符 = 1 token
    
    // 估算用戶上下文 token（動態）
    let estimated_user_context_chars = 200 + // 項目信息
        (character_count * 100) + // 角色信息（簡化）
        1000; // 章節內容（截斷後）
    let user_context_tokens = estimated_user_context_chars / 2;
    
    let total_tokens = system_prompt_tokens + user_context_tokens;
    let efficiency = (user_context_tokens as f32 / total_tokens as f32) * 100.0;
    
    Ok(SeparatedContextStats {
        system_prompt_tokens,
        user_context_tokens,
        total_tokens,
        efficiency_percentage: efficiency,
        character_count,
        estimated_savings_vs_legacy: 40.0, // 預估節省 40%
    })
}

/// 檢測文本的語言純度
#[command]
pub async fn analyze_text_purity(text: String) -> Result<PurityAnalysisResult, String> {
    let enforcer = LanguagePurityEnforcer::new();
    let analysis = enforcer.analyze_purity(&text);
    
    Ok(PurityAnalysisResult {
        is_pure: analysis.is_pure,
        purity_score: analysis.purity_score,
        issues: analysis.issues.into_iter().map(|issue| PurityIssueResult {
            issue_type: match issue.issue_type {
                crate::utils::language_purity::IssueType::EnglishWords => "english_words".to_string(),
                crate::utils::language_purity::IssueType::SimplifiedChinese => "simplified_chinese".to_string(),
                crate::utils::language_purity::IssueType::ForbiddenPattern => "forbidden_pattern".to_string(),
            },
            content: issue.content,
            severity: match issue.severity {
                crate::utils::language_purity::Severity::High => "high".to_string(),
                crate::utils::language_purity::Severity::Medium => "medium".to_string(),
                crate::utils::language_purity::Severity::Low => "low".to_string(),
            },
        }).collect(),
    })
}

/// 生成增強的 AI 生成參數
#[command]
pub async fn enhance_generation_parameters(
    base_parameters: serde_json::Value
) -> Result<serde_json::Value, String> {
    let enforcer = LanguagePurityEnforcer::new();
    
    if let Some(params_obj) = base_parameters.as_object() {
        let enhanced = enforcer.enhance_generation_options(params_obj.clone());
        Ok(serde_json::Value::Object(enhanced))
    } else {
        Err("參數必須是 JSON 物件".to_string())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurityAnalysisResult {
    pub is_pure: bool,
    pub purity_score: f64,
    pub issues: Vec<PurityIssueResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurityIssueResult {
    pub issue_type: String,
    pub content: String,
    pub severity: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SeparatedContextStats {
    pub system_prompt_tokens: usize,
    pub user_context_tokens: usize,
    pub total_tokens: usize,
    pub efficiency_percentage: f32,
    pub character_count: usize,
    pub estimated_savings_vs_legacy: f32,
}