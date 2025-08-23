use tauri::command;
use std::process::Command;
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::database::get_db;
use html_escape;

// PDF生成選項 (保持與現有V2選項兼容)
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct PdfOptionsChrome {
    pub page_size: Option<String>,
    pub font_size: Option<f64>,
    pub margins: Option<String>,
    pub include_cover: Option<bool>,
}

impl Default for PdfOptionsChrome {
    fn default() -> Self {
        Self {
            page_size: Some("A4".to_string()),
            font_size: Some(12.0),
            margins: Some("20mm".to_string()),
            include_cover: Some(true),
        }
    }
}

#[derive(Serialize)]
pub struct PdfGenerationResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<u64>,
    pub generation_time: Option<u64>,
    pub page_count: Option<u32>,
    pub error_message: Option<String>,
}

/// 檢測系統Chrome瀏覽器路徑
fn detect_chrome_path() -> Result<PathBuf, String> {
    let possible_paths = if cfg!(target_os = "macos") {
        vec![
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
    } else if cfg!(target_os = "windows") {
        vec![
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Users\\{}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
        ]
    } else {
        vec![
            "/usr/bin/google-chrome",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/snap/bin/chromium",
        ]
    };

    for path_str in possible_paths {
        let path = PathBuf::from(path_str);
        if path.exists() {
            println!("🌐 找到Chrome路徑: {}", path.display());
            return Ok(path);
        }
    }

    Err("未找到Chrome或Chromium瀏覽器，請安裝Google Chrome以使用PDF功能".to_string())
}

/// 將Slate.js JSON內容提取為純文字
#[allow(dead_code)]
fn extract_text_from_slate(slate_content: &Value) -> Result<String, String> {
    fn extract_text_recursive(node: &Value) -> String {
        match node {
            Value::Object(obj) => {
                // 提取文字內容
                if let Some(text) = obj.get("text") {
                    if let Some(text_str) = text.as_str() {
                        return text_str.to_string();
                    }
                }
                
                // 遞歸處理子節點
                if let Some(children) = obj.get("children") {
                    if let Some(children_array) = children.as_array() {
                        return children_array
                            .iter()
                            .map(extract_text_recursive)
                            .collect::<Vec<_>>()
                            .join("");
                    }
                }
            }
            Value::Array(arr) => {
                return arr
                    .iter()
                    .map(extract_text_recursive)
                    .collect::<Vec<_>>()
                    .join("\n");
            }
            _ => {}
        }
        String::new()
    }

    if let Some(content_array) = slate_content.as_array() {
        let text = content_array
            .iter()
            .map(extract_text_recursive)
            .collect::<Vec<_>>()
            .join("\n\n");
        
        Ok(text)
    } else {
        Ok(extract_text_recursive(slate_content))
    }
}

// AI插畫結構
#[derive(Debug)]
#[allow(dead_code)]
struct AIIllustration {
    pub file_name: String,
    pub file_path: String,
    pub character_names: Vec<String>,
}

/// 掃描專案AI插畫
fn scan_project_illustrations(_project_id: &str) -> Result<Vec<AIIllustration>, String> {
    let illustrations_dir = dirs::data_local_dir()
        .ok_or("無法獲取本地數據目錄")?
        .join("genesis-chronicle")
        .join("generated-images");
    
    let mut illustrations = Vec::new();
    
    if illustrations_dir.exists() {
        // 掃描目錄中的圖片檔案
        let entries = std::fs::read_dir(&illustrations_dir)
            .map_err(|e| format!("讀取插畫目錄失敗: {}", e))?;
        
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if let Some(extension) = path.extension() {
                    if ["jpg", "jpeg", "png", "webp"].contains(&extension.to_str().unwrap_or("").to_lowercase().as_str()) {
                        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                            illustrations.push(AIIllustration {
                                file_name: file_name.to_string(),
                                file_path: path.to_string_lossy().to_string(),
                                character_names: vec![], // TODO: 從檔案名或metadata解析角色名
                            });
                        }
                    }
                }
            }
        }
    }
    
    println!("🎨 掃描到 {} 個AI插畫檔案", illustrations.len());
    Ok(illustrations)
}

/// 創建HTML模板
fn create_html_content(title: &str, chapters: &[Chapter], options: &PdfOptionsChrome, project_id: &str) -> Result<String, String> {
    let font_size = options.font_size.unwrap_or(12.0);
    let margins = options.margins.as_deref().unwrap_or("20mm");
    
    // 掃描AI插畫
    let illustrations = scan_project_illustrations(project_id).unwrap_or_default();
    
    let mut chapters_html = String::new();
    for (index, chapter) in chapters.iter().enumerate() {
        // 轉換Slate.js內容為HTML
        let content_str = chapter.content.as_deref().unwrap_or("[]");
        let chapter_html = convert_slate_to_html(content_str)?;
        
        // 為每章添加一張AI插畫 (如果有的話)
        let chapter_illustration = if !illustrations.is_empty() && index < illustrations.len() {
            format!(r#"
            <div class="chapter-illustration">
                <img src="file://{}" alt="章節插畫" style="max-width: 80%; height: auto; margin: 20px auto; display: block; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            </div>
            "#, illustrations[index].file_path)
        } else {
            String::new()
        };
        
        chapters_html.push_str(&format!(
            r#"
            <div class="chapter" style="page-break-before: {};">
                <h1 class="chapter-title">{}</h1>
                {}
                <div class="chapter-content">
                    {}
                </div>
            </div>
            "#,
            if index == 0 { "auto" } else { "always" },
            html_escape::encode_text(&chapter.title),
            chapter_illustration,
            chapter_html
        ));
    }

    let cover_display = if options.include_cover.unwrap_or(true) { 
        format!(r#"
        <div class="cover">
            <h1>{}</h1>
            <p>Genesis Chronicle 創世紀年史</p>
        </div>
        "#, html_escape::encode_text(title))
    } else { 
        String::new() 
    };

    let html_content = format!(
        r#"<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{}</title>
    <style>
        @page {{
            size: A4;
            margin: {};
        }}
        
        body {{
            font-family: "Noto Sans TC", "Microsoft YaHei", "PingFang TC", "Heiti TC", sans-serif;
            font-size: {}px;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }}
        
        .cover {{
            page-break-after: always;
            text-align: center;
            margin-top: 200px;
        }}
        
        .cover h1 {{
            font-size: 36px;
            margin-bottom: 50px;
            color: #2c3e50;
        }}
        
        .chapter {{
            margin-bottom: 40px;
        }}
        
        .chapter-title {{
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }}
        
        .chapter-content {{
            text-align: justify;
            text-indent: 2em;
        }}
        
        .chapter-content p {{
            margin-bottom: 1em;
            text-indent: 2em;
        }}
        
        .chapter-content h1, 
        .chapter-content h2, 
        .chapter-content h3 {{
            text-indent: 0;
            margin-top: 20px;
            margin-bottom: 10px;
        }}
        
        .chapter-illustration {{
            text-align: center;
            margin: 30px 0;
            page-break-inside: avoid;
        }}
        
        .chapter-illustration img {{
            max-width: 70% !important;
            height: auto !important;
            margin: 20px auto !important;
            display: block !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }}
        
        @media print {{
            .chapter-illustration {{
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }}
        }}
    </style>
</head>
<body>
    {}
    {}
</body>
</html>"#,
        html_escape::encode_text(title),
        margins,
        font_size,
        cover_display,
        chapters_html
    );

    Ok(html_content)
}

// 章節結構 (與資料庫一致)
#[derive(Debug)]
#[allow(dead_code)]
struct Chapter {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub content: Option<String>,
    pub order_index: i32,
    pub chapter_number: Option<i32>,
    pub metadata: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// 專案結構
#[derive(Debug)]
#[allow(dead_code)]
struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub settings: Option<String>,
    pub novel_length: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 轉換Slate.js JSON內容為HTML
fn convert_slate_to_html(slate_json: &str) -> Result<String, String> {
    println!("🔍 轉換Slate.js內容: {}", slate_json);
    
    // 解析Slate.js JSON
    let slate_value: serde_json::Value = serde_json::from_str(slate_json)
        .map_err(|e| format!("解析Slate.js內容失敗: {}", e))?;
    
    // Slate.js通常是一個數組格式
    let html = if slate_value.is_array() {
        let array = slate_value.as_array().unwrap();
        if array.is_empty() {
            println!("⚠️ Slate.js內容為空數組");
            return Ok(String::new());
        }
        
        // 處理每個根節點
        let html_parts: Result<Vec<_>, _> = array
            .iter()
            .map(slate_to_html_recursive)
            .collect();
        
        html_parts?.join("")
    } else {
        // 單個節點處理（兼容性）
        slate_to_html_recursive(&slate_value)?
    };
    
    println!("✅ 生成的HTML長度: {} 字符", html.len());
    Ok(html)
}

/// 遞歸轉換Slate.js節點為HTML
fn slate_to_html_recursive(node: &serde_json::Value) -> Result<String, String> {
    if let Some(text) = node.get("text") {
        // 文本節點
        let mut html = html_escape::encode_text(&text.as_str().unwrap_or("")).to_string();
        
        // 處理格式化
        if node.get("bold").and_then(|v| v.as_bool()).unwrap_or(false) {
            html = format!("<strong>{}</strong>", html);
        }
        if node.get("italic").and_then(|v| v.as_bool()).unwrap_or(false) {
            html = format!("<em>{}</em>", html);
        }
        if node.get("underline").and_then(|v| v.as_bool()).unwrap_or(false) {
            html = format!("<u>{}</u>", html);
        }
        
        return Ok(html);
    }
    
    // 元素節點
    let node_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("paragraph");
    let empty_children = vec![];
    let children = node.get("children").and_then(|v| v.as_array()).unwrap_or(&empty_children);
    
    // 遞歸處理子節點
    let children_html = children
        .iter()
        .map(slate_to_html_recursive)
        .collect::<Result<Vec<_>, _>>()?
        .join("");
    
    // 根據節點類型生成HTML
    let html = match node_type {
        "paragraph" => format!("<p>{}</p>", children_html),
        "heading-one" => format!("<h1>{}</h1>", children_html),
        "heading-two" => format!("<h2>{}</h2>", children_html),
        "heading-three" => format!("<h3>{}</h3>", children_html),
        "block-quote" => format!("<blockquote>{}</blockquote>", children_html),
        "bulleted-list" => format!("<ul>{}</ul>", children_html),
        "numbered-list" => format!("<ol>{}</ol>", children_html),
        "list-item" => format!("<li>{}</li>", children_html),
        _ => format!("<div>{}</div>", children_html),
    };
    
    Ok(html)
}

#[command]
pub async fn generate_pdf_chrome(
    project_id: String,
    options: Option<PdfOptionsChrome>,
) -> Result<PdfGenerationResult, String> {
    let start_time = std::time::Instant::now();
    let options = options.unwrap_or_default();
    
    println!("🚀 開始Chrome Headless PDF生成，專案ID: {}", project_id);
    
    // 檢測Chrome路徑
    let chrome_path = detect_chrome_path()
        .map_err(|e| format!("Chrome檢測失敗: {}", e))?;
    
    // 從資料庫獲取專案和章節數據
    let (project, chapters) = {
        let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
        let conn = db.lock().unwrap();
        
        // 1. 獲取專案資料
        let project = {
            let mut stmt = conn
                .prepare("SELECT id, name, description, type, settings, novel_length, created_at, updated_at FROM projects WHERE id = ?1")
                .map_err(|e| format!("準備專案查詢失敗: {}", e))?;
            
            let project_result = stmt.query_row([&project_id], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get::<_, Option<String>>(2)?,
                    r#type: row.get::<_, Option<String>>(3)?,
                    settings: row.get::<_, Option<String>>(4)?,
                    novel_length: row.get::<_, Option<String>>(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            });
            
            match project_result {
                Ok(project) => project,
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    return Err("專案不存在".to_string());
                }
                Err(e) => {
                    return Err(format!("獲取專案失敗: {}", e));
                }
            }
        };
        
        // 2. 獲取專案的所有章節
        let chapters = {
            let mut stmt = conn
                .prepare("SELECT id, project_id, title, content, order_index, chapter_number, metadata, created_at, updated_at FROM chapters WHERE project_id = ?1 ORDER BY order_index")
                .map_err(|e| format!("準備章節查詢失敗: {}", e))?;
            
            let chapter_iter = stmt.query_map([&project_id], |row| {
                Ok(Chapter {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    content: row.get::<_, Option<String>>(3)?,
                    order_index: row.get(4)?,
                    chapter_number: row.get::<_, Option<i32>>(5)?,
                    metadata: row.get::<_, Option<String>>(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            }).map_err(|e| format!("查詢章節失敗: {}", e))?;
            
            let mut chapters = Vec::new();
            for chapter in chapter_iter {
                chapters.push(chapter.map_err(|e| format!("處理章節資料失敗: {}", e))?);
            }
            chapters
        };
        
        (project, chapters)
    }; // conn在這裡被釋放
    
    if chapters.is_empty() {
        return Err("專案沒有章節內容".to_string());
    }
    
    println!("找到 {} 個章節", chapters.len());
    
    // 創建HTML內容
    let html_content = create_html_content(&project.name, &chapters, &options, &project_id)?;
    
    // 創建臨時HTML文件
    let temp_dir = std::env::temp_dir();
    let html_path = temp_dir.join(format!("genesis_pdf_{}.html", project_id));
    let pdf_path = temp_dir.join(format!("genesis_pdf_{}.pdf", project_id));
    
    // 寫入HTML文件
    fs::write(&html_path, html_content)
        .map_err(|e| format!("HTML文件創建失敗: {}", e))?;
    
    println!("📄 HTML模板已創建: {}", html_path.display());
    
    // 調用Chrome Headless生成PDF
    let output = Command::new(&chrome_path)
        .args(&[
            "--headless",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--disable-web-security",
            "--hide-scrollbars",
            "--disable-extensions",
            "--no-pdf-header-footer",
            "--virtual-time-budget=10000",
            "--run-all-compositor-stages-before-draw",
            &format!("--print-to-pdf={}", pdf_path.display()),
            &format!("file://{}", html_path.display()),
        ])
        .output()
        .map_err(|e| format!("Chrome命令執行失敗: {}", e))?;
    
    println!("🌐 Chrome命令輸出: {}", String::from_utf8_lossy(&output.stdout));
    if !output.stderr.is_empty() {
        println!("⚠️  Chrome錯誤: {}", String::from_utf8_lossy(&output.stderr));
    }
    
    // 檢查PDF是否生成成功
    if !pdf_path.exists() {
        return Ok(PdfGenerationResult {
            success: false,
            file_path: None,
            file_name: None,
            file_size: None,
            generation_time: Some(start_time.elapsed().as_millis() as u64),
            page_count: None,
            error_message: Some("PDF檔案生成失敗，請檢查Chrome是否正確安裝".to_string()),
        });
    }
    
    // 獲取文件資訊
    let file_size = fs::metadata(&pdf_path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    // 移動PDF到下載目錄
    let downloads_dir = dirs::download_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap());
    
    let safe_title = project.name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let final_filename = format!("{}_PDF導出_{}.pdf", 
        safe_title, 
        chrono::Utc::now().format("%Y%m%d_%H%M%S")
    );
    let final_path = downloads_dir.join(&final_filename);
    
    fs::copy(&pdf_path, &final_path)
        .map_err(|e| format!("PDF文件移動失敗: {}", e))?;
    
    // 清理臨時文件
    let _ = fs::remove_file(&html_path);
    let _ = fs::remove_file(&pdf_path);
    
    let generation_time = start_time.elapsed().as_millis() as u64;
    
    println!("✅ Chrome Headless PDF生成成功！");
    println!("📁 文件路徑: {}", final_path.display());
    println!("⏱️  生成時間: {}ms", generation_time);
    
    Ok(PdfGenerationResult {
        success: true,
        file_path: Some(final_path.to_string_lossy().to_string()),
        file_name: Some(final_filename),
        file_size: Some(file_size),
        generation_time: Some(generation_time),
        page_count: Some(1), // TODO: 實現頁數計算
        error_message: None,
    })
}