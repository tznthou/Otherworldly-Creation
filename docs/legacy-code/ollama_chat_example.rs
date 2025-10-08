// 新的 Chat API 結構
#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaChatMessage {
    pub role: String,  // "system", "user", "assistant"
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<OllamaChatMessage>,
    pub stream: bool,
    pub options: Option<OllamaOptions>,
}

// 使用方式
pub async fn generate_with_chat(&self, model: &str, system_prompt: &str, user_content: &str, options: Option<OllamaOptions>) -> OllamaResult {
    let messages = vec![
        OllamaChatMessage {
            role: "system".to_string(),
            content: system_prompt.to_string(),  // 不計入 token！
        },
        OllamaChatMessage {
            role: "user".to_string(),
            content: user_content.to_string(),   // 只有這個計入 token
        }
    ];

    let request = OllamaChatRequest {
        model: model.to_string(),
        messages,
        stream: false,
        options,
    };

    // 發送到 /api/chat 而不是 /api/generate
    let response: OllamaChatResponse = self.client
        .post(&format!("{}/api/chat", self.base_url))
        .json(&request)
        .send()
        .await?
        .json()
        .await?;

    Ok(OllamaResult {
        success: true,
        response: Some(response.message.content),
        error: None,
    })
}

// Context 建構的改變
pub async fn build_context_optimized(
    project_id: String,
    chapter_id: String,
    position: usize,
    language: String,
) -> Result<(String, String), String> {  // 返回 (system_prompt, user_context)
    
    // System Prompt - 不佔用對話 token
    let system_prompt = build_system_prompt(&language);
    
    // User Context - 只包含純故事內容
    let user_context = format!(
        "Title: {}\nGenre: {}\n\nCharacters:\n{}\n\nCurrent: {}\nContent:\n{}\n\n[CONTINUE]",
        project.name,
        project.r#type.unwrap_or_default(),
        format_characters_compact(&characters),
        chapter.title,
        extract_context_around_cursor(&chapter.content, position)
    );
    
    Ok((system_prompt, user_context))
}

fn build_system_prompt(language: &str) -> String {
    match language {
        "zh-TW" => "你是專業的輕小說續寫助手。請在 [CONTINUE] 位置插入續寫內容。要求：使用純中文，保持角色一致性，自然銜接前後文。".to_string(),
        "zh-CN" => "你是专业的轻小说续写助手。请在 [CONTINUE] 位置插入续写内容。要求：使用纯中文，保持角色一致性，自然衔接前后文。".to_string(),
        "en" => "You are a professional light novel writing assistant. Insert continuation at [CONTINUE]. Requirements: Use English only, maintain character consistency, ensure natural flow.".to_string(),
        "ja" => "あなたはプロのライトノベル執筆アシスタントです。[CONTINUE]の位置に続きを挿入してください。要件：日本語のみ使用、キャラクターの一貫性保持、自然な流れ。".to_string(),
        _ => build_system_prompt("zh-TW")
    }
}