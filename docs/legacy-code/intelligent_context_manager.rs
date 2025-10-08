// 智能上下文管理系統
use crate::database::{get_db, models::*};
use rusqlite::Result as SqliteResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;

pub struct IntelligentContextManager {
    max_tokens: usize,
    compression_strategy: CompressionStrategy,
}

impl IntelligentContextManager {
    pub fn new(max_tokens: usize) -> Self {
        Self {
            max_tokens,
            compression_strategy: CompressionStrategy::default(),
        }
    }

    /// 構建智能上下文
    pub async fn build_intelligent_context(
        &self,
        project_id: &str,
        chapter_id: &str,
        position: usize,
        focus_characters: &[String],
    ) -> Result<IntelligentContext, String> {
        let db = get_db().map_err(|e| e.to_string())?;
        let conn = db.lock().map_err(|e| format!("無法獲取資料庫鎖: {}", e))?;

        // 1. 獲取核心上下文（當前場景）
        let core_context = self.build_core_context(&conn, chapter_id, position)?;
        
        // 2. 構建角色相關上下文
        let character_context = self.build_character_context(
            &conn, 
            project_id, 
            chapter_id, 
            focus_characters
        )?;
        
        // 3. 構建情節相關上下文
        let plot_context = self.build_plot_context(&conn, project_id, chapter_id)?;
        
        // 4. 構建世界設定上下文
        let world_context = self.build_world_context(&conn, project_id)?;
        
        // 5. 構建歷史上下文（之前章節的摘要）
        let historical_context = self.build_historical_context(&conn, project_id, chapter_id)?;
        
        // 6. 計算總token數並進行智能壓縮
        let context = IntelligentContext {
            project_id: project_id.to_string(),
            chapter_id: chapter_id.to_string(),
            position,
            core_context: core_context.clone(),
            character_context: character_context.clone(),
            plot_context: plot_context.clone(),
            world_context: world_context.clone(),
            historical_context: historical_context.clone(),
            total_tokens: self.estimate_tokens(&format!(
                "{}\n{}\n{}\n{}\n{}", 
                core_context, character_context, plot_context, world_context, historical_context
            )),
            compression_ratio: 1.0,
            context_hash: self.calculate_context_hash(&format!(
                "{}\n{}\n{}\n{}\n{}", 
                core_context, character_context, plot_context, world_context, historical_context
            )),
            created_at: chrono::Utc::now(),
        };

        // 如果超過token限制，進行智能壓縮
        if context.total_tokens > self.max_tokens {
            return self.compress_intelligent_context(context).await;
        }

        Ok(context)
    }

    /// 構建核心上下文（當前場景）
    fn build_core_context(
        &self,
        conn: &rusqlite::Connection,
        chapter_id: &str,
        position: usize,
    ) -> Result<String, String> {
        let chapter: Chapter = conn
            .query_row(
                "SELECT * FROM chapters WHERE id = ?",
                [chapter_id],
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

        let mut context = String::new();
        context.push_str("【當前場景】\n");
        context.push_str(&format!("章節：{}\n", chapter.title));

        if let Some(content) = &chapter.content {
            // 智能提取當前場景的關鍵內容
            let scene_content = self.extract_scene_content(content, position)?;
            context.push_str(&format!("內容：\n{}\n", scene_content));
        }

        Ok(context)
    }

    /// 構建角色相關上下文
    fn build_character_context(
        &self,
        conn: &rusqlite::Connection,
        project_id: &str,
        chapter_id: &str,
        focus_characters: &[String],
    ) -> Result<String, String> {
        let mut context = String::new();
        context.push_str("【角色狀態】\n");

        // 獲取當前活躍的角色
        let active_characters = self.get_active_characters(conn, project_id, chapter_id)?;

        for character in active_characters {
            // 優先處理重點角色
            let is_focus = focus_characters.contains(&character.id);
            
            // 獲取角色當前狀態
            let character_state = self.get_character_current_state(conn, &character.id, chapter_id)?;
            
            // 獲取角色語言風格
            let speech_pattern = self.get_character_speech_pattern(conn, &character.id)?;
            
            context.push_str(&format!("◆ {} {}\n", 
                character.name, 
                if is_focus { "(重點角色)" } else { "" }
            ));
            
            if let Some(state) = character_state {
                context.push_str(&format!("  情緒狀態：{}\n", state.emotional_state));
                context.push_str(&format!("  位置：{}\n", 
                    state.location.as_deref().unwrap_or("未知")));
                
                if !state.goals.is_empty() {
                    context.push_str(&format!("  當前目標：{}\n", 
                        state.goals.join("、")));
                }
            }
            
            if let Some(pattern) = speech_pattern {
                if !pattern.catchphrases.is_empty() {
                    context.push_str(&format!("  說話特點：{}\n", 
                        pattern.catchphrases.join("、")));
                }
            }
        }

        Ok(context)
    }

    /// 構建情節相關上下文
    fn build_plot_context(
        &self,
        conn: &rusqlite::Connection,
        project_id: &str,
        chapter_id: &str,
    ) -> Result<String, String> {
        let mut context = String::new();
        context.push_str("【情節要點】\n");

        // 獲取相關的情節點
        let plot_points = self.get_relevant_plot_points(conn, project_id, chapter_id)?;

        for plot_point in plot_points {
            context.push_str(&format!("• {} ({})\n", 
                plot_point.title, 
                plot_point.status
            ));
            
            if plot_point.importance >= 7 {
                context.push_str(&format!("  重要：{}\n", plot_point.description));
            }

            // 如果是伏筆，特別標註
            if plot_point.plot_type == "foreshadowing" && plot_point.status != "resolved" {
                context.push_str("  ⚠️ 未解決的伏筆\n");
            }
        }

        Ok(context)
    }

    /// 構建世界設定上下文
    fn build_world_context(
        &self,
        conn: &rusqlite::Connection,
        project_id: &str,
    ) -> Result<String, String> {
        let mut context = String::new();
        context.push_str("【世界設定】\n");

        // 獲取重要的世界設定
        let world_settings = self.get_important_world_settings(conn, project_id)?;

        for setting in world_settings {
            if setting.importance_level >= 7 {
                context.push_str(&format!("• {} ({})\n", 
                    setting.name, 
                    setting.category
                ));
                context.push_str(&format!("  {}\n", setting.description));
            }
        }

        Ok(context)
    }

    /// 構建歷史上下文
    fn build_historical_context(
        &self,
        conn: &rusqlite::Connection,
        project_id: &str,
        current_chapter_id: &str,
    ) -> Result<String, String> {
        let mut context = String::new();
        context.push_str("【前情回顧】\n");

        // 獲取之前的重要章節
        let previous_chapters = self.get_previous_important_chapters(
            conn, 
            project_id, 
            current_chapter_id
        )?;

        for chapter_summary in previous_chapters {
            context.push_str(&format!("• {}\n", chapter_summary));
        }

        Ok(context)
    }

    /// 智能壓縮上下文
    async fn compress_intelligent_context(
        &self,
        mut context: IntelligentContext,
    ) -> Result<IntelligentContext, String> {
        let target_tokens = self.max_tokens;
        let current_tokens = context.total_tokens;
        let compression_ratio = target_tokens as f32 / current_tokens as f32;

        // 根據壓縮策略分配token
        let core_tokens = (target_tokens as f32 * self.compression_strategy.core_context_ratio) as usize;
        let char_tokens = (target_tokens as f32 * self.compression_strategy.character_context_ratio) as usize;
        let plot_tokens = (target_tokens as f32 * self.compression_strategy.plot_context_ratio) as usize;
        let world_tokens = (target_tokens as f32 * self.compression_strategy.world_context_ratio) as usize;
        let hist_tokens = (target_tokens as f32 * self.compression_strategy.historical_context_ratio) as usize;

        // 智能壓縮各部分
        context.core_context = self.compress_section(&context.core_context, core_tokens);
        context.character_context = self.compress_section(&context.character_context, char_tokens);
        context.plot_context = self.compress_section(&context.plot_context, plot_tokens);
        context.world_context = self.compress_section(&context.world_context, world_tokens);
        context.historical_context = self.compress_section(&context.historical_context, hist_tokens);

        context.total_tokens = target_tokens;
        context.compression_ratio = compression_ratio;

        Ok(context)
    }

    /// 壓縮特定部分
    fn compress_section(&self, content: &str, target_tokens: usize) -> String {
        let current_tokens = self.estimate_tokens(content);
        
        if current_tokens <= target_tokens {
            return content.to_string();
        }

        // 計算需要保留的字符比例
        let char_ratio = (target_tokens as f32 / current_tokens as f32) * 2.0; // 假設2字符=1token
        let target_chars = (content.len() as f32 * char_ratio) as usize;

        // 智能截斷，保留重要內容
        self.intelligent_truncate(content, target_chars)
    }

    /// 智能截斷文本，保留重要內容
    fn intelligent_truncate(&self, content: &str, target_chars: usize) -> String {
        if content.len() <= target_chars {
            return content.to_string();
        }

        let lines: Vec<&str> = content.lines().collect();
        let mut result = String::new();
        let mut current_length = 0;

        // 優先保留標題和重要標記
        for line in lines {
            let line_importance = self.calculate_line_importance(line);
            let line_length = line.len() + 1; // +1 for newline

            if current_length + line_length <= target_chars || line_importance > 0.8 {
                result.push_str(line);
                result.push('\n');
                current_length += line_length;
            }

            if current_length >= target_chars {
                break;
            }
        }

        result
    }

    /// 計算行的重要性
    fn calculate_line_importance(&self, line: &str) -> f32 {
        let mut importance = 0.0;

        // 標題類
        if line.contains("【") || line.contains("】") {
            importance += 0.9;
        }

        // 角色名稱
        if line.contains("◆") {
            importance += 0.8;
        }

        // 重要標記
        if line.contains("重要") || line.contains("⚠️") {
            importance += 0.7;
        }

        // 對話
        if line.contains("「") || line.contains("」") {
            importance += 0.6;
        }

        importance.min(1.0)
    }

    /// 估算token數量
    fn estimate_tokens(&self, text: &str) -> usize {
        // 中文約2字符=1token，英文約4字符=1token
        let chinese_chars = text.chars().filter(|c| {
            *c as u32 > 0x4E00 && *c as u32 < 0x9FFF
        }).count();
        let other_chars = text.len() - chinese_chars;
        
        (chinese_chars / 2) + (other_chars / 4)
    }

    /// 計算上下文雜湊值
    fn calculate_context_hash(&self, content: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        content.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    // 輔助方法（實際實作需要對應的資料庫查詢）
    fn extract_scene_content(&self, content: &str, position: usize) -> Result<String, String> {
        // 智能提取當前場景的關鍵內容
        // 這裡需要實作場景邊界檢測邏輯
        let max_context_chars = 800;
        
        if position >= content.len() {
            return Ok(content.to_string());
        }

        let start_pos = if position > max_context_chars {
            position - max_context_chars
        } else {
            0
        };

        let scene_content = &content[start_pos..position];
        
        // 找到場景開始點（對話或段落開始）
        if let Some(scene_start) = scene_content.rfind('\n') {
            Ok(scene_content[scene_start..].to_string())
        } else {
            Ok(scene_content.to_string())
        }
    }

    // 其他輔助方法的佔位符（需要實際的資料庫查詢實作）
    fn get_active_characters(&self, _conn: &rusqlite::Connection, _project_id: &str, _chapter_id: &str) -> Result<Vec<Character>, String> {
        // TODO: 實作獲取活躍角色的邏輯
        Ok(Vec::new())
    }

    fn get_character_current_state(&self, _conn: &rusqlite::Connection, _character_id: &str, _chapter_id: &str) -> Result<Option<CharacterState>, String> {
        // TODO: 實作獲取角色當前狀態的邏輯
        Ok(None)
    }

    fn get_character_speech_pattern(&self, _conn: &rusqlite::Connection, _character_id: &str) -> Result<Option<CharacterSpeechPattern>, String> {
        // TODO: 實作獲取角色語言模式的邏輯
        Ok(None)
    }

    fn get_relevant_plot_points(&self, _conn: &rusqlite::Connection, _project_id: &str, _chapter_id: &str) -> Result<Vec<PlotPoint>, String> {
        // TODO: 實作獲取相關情節點的邏輯
        Ok(Vec::new())
    }

    fn get_important_world_settings(&self, _conn: &rusqlite::Connection, _project_id: &str) -> Result<Vec<WorldSetting>, String> {
        // TODO: 實作獲取重要世界設定的邏輯
        Ok(Vec::new())
    }

    fn get_previous_important_chapters(&self, _conn: &rusqlite::Connection, _project_id: &str, _current_chapter_id: &str) -> Result<Vec<String>, String> {
        // TODO: 實作獲取重要前文的邏輯
        Ok(Vec::new())
    }
}

impl Default for CompressionStrategy {
    fn default() -> Self {
        Self {
            max_tokens: 4000,
            core_context_ratio: 0.4,    // 40% 給核心上下文
            character_context_ratio: 0.25, // 25% 給角色
            plot_context_ratio: 0.2,    // 20% 給情節
            world_context_ratio: 0.1,   // 10% 給世界設定
            historical_context_ratio: 0.05, // 5% 給歷史
            preserve_dialogue: true,
            preserve_foreshadowing: true,
            min_character_mentions: 2,
        }
    }
}

/// Tauri 命令：使用智能上下文生成
#[command]
pub async fn generate_with_intelligent_context(
    project_id: String,
    chapter_id: String,
    position: usize,
    model: String,
    params: EnhancedGenerateParams,
) -> Result<EnhancedGenerateResponse, String> {
    log::info!("=== 開始智能上下文生成 ===");
    
    // 創建智能上下文管理器
    let max_tokens = params.max_context_tokens.unwrap_or(4000) as usize;
    let context_manager = IntelligentContextManager::new(max_tokens);
    
    // 構建智能上下文
    let focus_characters = params.focus_characters.clone();
    let intelligent_context = context_manager.build_intelligent_context(
        &project_id,
        &chapter_id, 
        position,
        &focus_characters
    ).await?;
    
    // 組合完整上下文
    let full_context = format!(
        "{}\n{}\n{}\n{}\n{}",
        intelligent_context.core_context,
        intelligent_context.character_context,
        intelligent_context.plot_context,
        intelligent_context.world_context,
        intelligent_context.historical_context
    );
    
    log::info!("智能上下文構建完成，token數: {}", intelligent_context.total_tokens);
    
    // 使用Ollama生成文本
    let ollama_service = crate::services::ollama::get_ollama_service();
    let service = ollama_service.lock().await;
    
    let ollama_options = crate::services::ollama::OllamaOptions {
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
        presence_penalty: params.presence_penalty,
        frequency_penalty: params.frequency_penalty,
    };
    
    let result = service.generate_text(&model, &full_context, Some(ollama_options)).await;
    
    if result.success {
        let generated_text = result.response.unwrap_or_default();
        
        // 進行一致性檢查（如果啟用）
        let (consistency_score, issues, suggestions) = if params.consistency_check {
            perform_consistency_check(&generated_text, &intelligent_context).await?
        } else {
            (1.0, Vec::new(), Vec::new())
        };
        
        let response = EnhancedGenerateResponse {
            generated_text,
            consistency_score,
            character_scores: HashMap::new(), // TODO: 實作角色一致性評分
            plot_coherence_score: 0.9, // TODO: 實作情節連貫性評分
            world_consistency_score: 0.9, // TODO: 實作世界一致性評分
            issues,
            suggestions,
            context_utilization: intelligent_context.compression_ratio,
            processing_time: 0, // TODO: 實作時間測量
        };
        
        log::info!("智能生成完成，一致性分數: {}", response.consistency_score);
        Ok(response)
    } else {
        let error_msg = result.error.unwrap_or("生成文本失敗".to_string());
        log::error!("生成文本失敗: {}", error_msg);
        Err(error_msg)
    }
}

/// 執行一致性檢查
async fn perform_consistency_check(
    _generated_text: &str,
    _context: &IntelligentContext,
) -> Result<(f32, Vec<ConsistencyIssue>, Vec<String>), String> {
    // TODO: 實作一致性檢查邏輯
    Ok((0.9, Vec::new(), Vec::new()))
}