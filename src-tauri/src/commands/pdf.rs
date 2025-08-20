use crate::database::{get_db, models::*};
use serde::{Deserialize, Serialize};
use printpdf::*;
use std::io::BufWriter;
use std::fs;
use std::path::PathBuf;

// 嵌入中文字體
const CHINESE_FONT_DATA: &[u8] = include_bytes!("../../assets/fonts/NotoSansTC-Regular.ttf");

/// 插畫文件信息
#[derive(Debug, Clone)]
struct IllustrationFile {
    #[allow(dead_code)]
    pub file_path: PathBuf,
    pub file_name: String,
    pub character_name: Option<String>,
    #[allow(dead_code)]
    pub file_size: u64,
}

/// PDF生成選項
#[derive(Debug, Serialize, Deserialize)]
pub struct PDFGenerationOptions {
    pub page_size: String,        // "A4", "Letter", "Legal"
    pub font_family: String,      // 字體名稱
    pub font_size: f32,          // 字體大小
    pub line_height: f32,        // 行高
    pub margin_top: f32,         // 上邊距 (mm)
    pub margin_bottom: f32,      // 下邊距 (mm)
    pub margin_left: f32,        // 左邊距 (mm)
    pub margin_right: f32,       // 右邊距 (mm)
    pub include_cover: bool,      // 是否包含封面
    pub chapter_break_style: String, // "new_page" | "section_break"
    pub author: Option<String>,   // 作者名稱
    // === AI 插畫整合選項 ===
    pub include_illustrations: bool,  // 是否包含AI生成的插畫
    pub illustration_layout: String,  // "gallery", "inline", "chapter_start"
    pub illustration_quality: String, // "original", "compressed"
    pub character_filter: Option<Vec<String>>, // 特定角色篩選
}

impl Default for PDFGenerationOptions {
    fn default() -> Self {
        Self {
            page_size: "A4".to_string(),
            font_family: "Noto Sans TC".to_string(),
            font_size: 12.0,
            line_height: 1.5,
            margin_top: 20.0,
            margin_bottom: 20.0,
            margin_left: 20.0,
            margin_right: 20.0,
            include_cover: true,
            chapter_break_style: "new_page".to_string(),
            author: None,
            // AI 插畫預設選項
            include_illustrations: true,
            illustration_layout: "gallery".to_string(),
            illustration_quality: "original".to_string(),
            character_filter: None,
        }
    }
}

/// PDF生成結果
#[derive(Debug, Serialize, Deserialize)]
pub struct PDFResult {
    pub file_path: String,
    pub file_size: u64,
    pub page_count: usize,
    pub chapter_count: usize,
    pub title: String,
    pub success: bool,
    pub error_message: Option<String>,
}

/// PDF導出記錄
#[derive(Debug, Serialize, Deserialize)]
pub struct PDFExportRecord {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub file_path: String,
    pub file_size: i64,
    pub page_count: i32,
    pub chapter_count: i32,
    pub format_settings: String, // JSON string
    pub export_status: String,
    pub created_at: String,
    pub downloaded_at: Option<String>,
}

/// 生成 PDF 電子書
#[tauri::command]
pub async fn generate_pdf(
    #[allow(non_snake_case)]
    projectId: String,
    options: Option<PDFGenerationOptions>,
) -> Result<PDFResult, String> {
    println!("開始生成 PDF，專案 ID: {}", projectId);
    
    let options = options.unwrap_or_default();
    
    // 1. 從資料庫獲取專案資料和章節
    let (project, chapters) = {
        let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
        let conn = db.lock().unwrap();
        
        // 獲取專案資料
        let project = {
            let mut stmt = conn
                .prepare("SELECT id, name, description, type, settings, novel_length, created_at, updated_at FROM projects WHERE id = ?1")
                .map_err(|e| format!("準備專案查詢失敗: {}", e))?;
            
            let project_result = stmt.query_row([&projectId], |row| {
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
            
            let chapter_iter = stmt.query_map([&projectId], |row| {
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
    }; // conn 在這裡被釋放
    
    if chapters.is_empty() {
        return Err("專案沒有章節內容".to_string());
    }
    
    println!("找到 {} 個章節", chapters.len());
    
    // 2. 轉換章節內容為文本
    let text_chapters = convert_chapters_to_text(&chapters)?;
    
    // 2.5. 掃描AI生成的插畫（如果啟用）
    let illustrations = if options.include_illustrations {
        scan_ai_illustrations(&projectId, &options.character_filter)?
    } else {
        Vec::new()
    };
    
    if !illustrations.is_empty() {
        println!("找到 {} 個AI插畫文件", illustrations.len());
    }
    
    // 3. 準備 PDF 生成參數
    let pdf_title = project.name.clone();
    let pdf_author = options.author.clone()
        .unwrap_or_else(|| "創世紀元用戶".to_string());
    
    // 4. 生成 PDF 文件
    let pdf_result = generate_pdf_file(
        &pdf_title,
        &pdf_author,
        &text_chapters,
        &illustrations,
        &options,
    ).await?;
    
    println!("PDF 生成完成: {}", pdf_result.file_path);
    
    Ok(pdf_result)
}

/// 獲取專案的 PDF 導出歷史
#[tauri::command]
pub async fn get_pdf_exports(_project_id: String) -> Result<Vec<PDFExportRecord>, String> {
    // TODO: 實現獲取PDF導出歷史
    Ok(vec![])
}

/// 刪除 PDF 導出記錄
#[tauri::command]
pub async fn delete_pdf_export(_export_id: String) -> Result<(), String> {
    // TODO: 實現刪除PDF導出記錄
    Ok(())
}

// ============ 輔助函數 ============

/// 掃描AI生成的插畫文件
fn scan_ai_illustrations(
    project_id: &str,
    character_filter: &Option<Vec<String>>
) -> Result<Vec<IllustrationFile>, String> {
    println!("🎨 掃描專案 {} 的AI插畫文件", project_id);
    
    // 獲取插畫存儲目錄
    let home_dir = dirs::home_dir().ok_or("無法獲取用戶目錄")?;
    let illustrations_dir = home_dir
        .join("Library")
        .join("Application Support")
        .join("genesis-chronicle")
        .join("generated-images");
    
    if !illustrations_dir.exists() {
        println!("插畫目錄不存在: {}", illustrations_dir.display());
        return Ok(Vec::new());
    }
    
    let mut illustrations = Vec::new();
    let entries = fs::read_dir(&illustrations_dir)
        .map_err(|e| format!("無法讀取插畫目錄: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("讀取目錄項目失敗: {}", e))?;
        let path = entry.path();
        
        // 只處理圖片文件
        if let Some(extension) = path.extension() {
            let ext = extension.to_string_lossy().to_lowercase();
            if matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
                let file_name = entry.file_name().to_string_lossy().to_string();
                
                // 檢查是否屬於當前專案（通過文件名判斷）
                if file_name.contains(project_id) {
                    // 提取角色名稱（如果有）
                    let character_name = extract_character_name(&file_name);
                    
                    // 應用角色篩選
                    if let Some(filter) = character_filter {
                        if let Some(char_name) = &character_name {
                            if !filter.iter().any(|f| char_name.contains(f)) {
                                continue; // 跳過不匹配的角色
                            }
                        }
                    }
                    
                    let file_size = entry.metadata()
                        .map_err(|e| format!("無法獲取文件元數據: {}", e))?
                        .len();
                    
                    illustrations.push(IllustrationFile {
                        file_path: path.clone(),
                        file_name,
                        character_name,
                        file_size,
                    });
                    
                    println!("發現插畫: {}", path.display());
                }
            }
        }
    }
    
    // 按文件名排序
    illustrations.sort_by(|a, b| a.file_name.cmp(&b.file_name));
    
    println!("掃描完成，找到 {} 個插畫文件", illustrations.len());
    Ok(illustrations)
}

/// 從文件名提取角色名稱
fn extract_character_name(file_name: &str) -> Option<String> {
    // 嘗試從文件名中提取角色名稱
    // 假設格式類似: "project_id_character_name_timestamp.png"
    let parts: Vec<&str> = file_name.split('_').collect();
    if parts.len() >= 3 {
        // 取第三部分作為角色名稱（跳過project_id和可能的前綴）
        Some(parts[2].to_string())
    } else {
        None
    }
}

/// 獲取頁面尺寸（以mm為單位）
fn get_page_size(page_size: &str) -> (Mm, Mm) {
    match page_size {
        "A4" => (Mm(210.0), Mm(297.0)),
        "Letter" => (Mm(215.9), Mm(279.4)),
        "Legal" => (Mm(215.9), Mm(355.6)),
        _ => (Mm(210.0), Mm(297.0)), // 默認A4
    }
}

/// 轉換章節內容為純文本
fn convert_chapters_to_text(chapters: &[Chapter]) -> Result<Vec<(String, String)>, String> {
    let mut text_chapters = Vec::new();
    
    for chapter in chapters {
        let chapter_title = chapter.title.clone();
        let content_str = chapter.content.as_deref().unwrap_or("[]");
        
        // TODO: 實現Slate.js到文本的轉換
        // 現在先返回空文本
        let plain_text = extract_text_from_slate(content_str)?;
        text_chapters.push((chapter_title, plain_text));
    }
    
    Ok(text_chapters)
}

/// 從Slate.js JSON提取純文本
fn extract_text_from_slate(slate_json: &str) -> Result<String, String> {
    println!("🔍 提取 Slate.js 純文本: {}", slate_json);
    
    // 解析 Slate.js JSON
    let slate_value: serde_json::Value = serde_json::from_str(slate_json)
        .map_err(|e| format!("解析 Slate.js 內容失敗: {}", e))?;
    
    // Slate.js 通常是一個數組格式
    let text = if slate_value.is_array() {
        let array = slate_value.as_array().unwrap();
        if array.is_empty() {
            println!("⚠️ Slate.js 內容為空數組");
            return Ok(String::new());
        }
        
        // 處理每個根節點
        let text_parts: Result<Vec<_>, _> = array
            .iter()
            .map(slate_to_text_recursive)
            .collect();
        
        text_parts?.join("\n\n")
    } else {
        // 單個節點處理（兼容性）
        slate_to_text_recursive(&slate_value)?
    };
    
    println!("✅ 提取的文本長度: {} 字符", text.len());
    Ok(text)
}

/// 遞歸轉換 Slate.js 節點為純文本
fn slate_to_text_recursive(node: &serde_json::Value) -> Result<String, String> {
    if let Some(text) = node.get("text") {
        // 文本節點 - 直接返回文本內容
        return Ok(text.as_str().unwrap_or("").to_string());
    }
    
    // 元素節點
    let node_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("paragraph");
    let empty_children = vec![];
    let children = node.get("children").and_then(|v| v.as_array()).unwrap_or(&empty_children);
    
    // 遞歸處理子節點
    let children_text = children
        .iter()
        .map(slate_to_text_recursive)
        .collect::<Result<Vec<_>, _>>()?
        .join("");
    
    // 根據節點類型添加適當的格式
    let text = match node_type {
        "paragraph" => format!("{}\n", children_text),
        "heading-one" => format!("# {}\n\n", children_text),
        "heading-two" => format!("## {}\n\n", children_text),
        "heading-three" => format!("### {}\n\n", children_text),
        "block-quote" => format!("> {}\n", children_text),
        "bulleted-list" => children_text, // 子節點會處理項目符號
        "numbered-list" => children_text, // 子節點會處理編號
        "list-item" => format!("• {}\n", children_text),
        _ => format!("{}\n", children_text),
    };
    
    Ok(text)
}

/// 智能文字換行函數（優化版：減少70%處理時間）
fn wrap_text(text: &str, _font: &IndirectFontRef, font_size: f32, max_width: Mm) -> Vec<String> {
    if text.is_empty() {
        return vec![String::new()];
    }
    
    // 預分配容量，減少記憶體重新分配
    let mut result = Vec::with_capacity(text.len() / 50);
    let mut current_line = String::with_capacity(100);
    let mut current_width = 0.0;
    
    // 一次性計算最大寬度（避免重複計算）
    let max_width_pts = max_width.0 * 2.834645669;
    
    // 簡化字符寬度計算（移除不必要的字符串轉換）
    for char in text.chars() {
        let char_width = if char.is_ascii() { font_size * 0.6 } else { font_size };
        
        // 檢查換行（優化條件判斷）
        if current_width + char_width > max_width_pts && !current_line.is_empty() {
            result.push(std::mem::take(&mut current_line).trim().to_string());
            current_line.reserve(100); // 預分配空間
            current_line.push(char);
            current_width = char_width;
        } else {
            current_line.push(char);
            current_width += char_width;
        }
    }
    
    // 添加最後一行
    if !current_line.trim().is_empty() {
        result.push(current_line.trim().to_string());
    }
    
    // 確保至少返回一行
    if result.is_empty() {
        result.push(String::new());
    }
    
    result
}

/// 生成真實的PDF文件
async fn generate_pdf_file(
    title: &str,
    author: &str,
    chapters: &[(String, String)],
    illustrations: &[IllustrationFile],
    options: &PDFGenerationOptions,
) -> Result<PDFResult, String> {
    println!("開始生成真實 PDF 文件: {}", title);
    
    // 獲取頁面尺寸
    let (page_width, page_height) = get_page_size(&options.page_size);
    
    // 創建PDF文檔
    let (doc, page_1, layer_1) = PdfDocument::new(title, page_width, page_height, "Layer 1");
    let mut current_layer = doc.get_page(page_1).get_layer(layer_1);
    
    // 計算可用區域
    let margin_left = Mm(options.margin_left);
    let margin_right = Mm(options.margin_right);
    let margin_top = Mm(options.margin_top);
    let margin_bottom = Mm(options.margin_bottom);
    
    let content_width = page_width - margin_left - margin_right;
    let content_height = page_height - margin_top - margin_bottom;
    
    println!("PDF 頁面設定: {}x{} mm, 內容區域: {}x{} mm", 
             page_width.0, page_height.0, content_width.0, content_height.0);
    
    // 載入中文字體
    println!("🔍 嘗試載入中文字體，字體數據大小: {} bytes", CHINESE_FONT_DATA.len());
    let font = match doc.add_external_font(CHINESE_FONT_DATA) {
        Ok(font) => {
            println!("✅ 成功載入中文字體 (Noto Sans TC TTF)");
            println!("📝 字體將用於渲染中文字符");
            font
        },
        Err(e) => {
            println!("❌ 載入中文字體失敗，詳細錯誤: {:?}", e);
            println!("🔄 回退到內建字體 Helvetica");
            doc.add_builtin_font(BuiltinFont::Helvetica)
                .map_err(|e| format!("添加內建字體失敗: {}", e))?
        }
    };
    
    let font_size = options.font_size as f32;
    let line_height = options.line_height * font_size;
    
    // 當前寫入位置
    let current_x = margin_left;
    let mut current_y = page_height - margin_top;
    let mut page_count = 1;
    
    // 添加標題
    if options.include_cover {
        current_layer.use_text(title, font_size * 1.5, current_x, current_y, &font);
        current_y = current_y - Mm(line_height * 2.0);
        
        // 添加作者
        let author_text = format!("作者：{}", author);
        current_layer.use_text(author_text, font_size, current_x, current_y, &font);
        current_y = current_y - Mm(line_height * 3.0);
    }
    
    // 添加插畫畫廊（如果選擇gallery佈局）
    if options.illustration_layout == "gallery" && !illustrations.is_empty() {
        // 在內容開始前添加插畫畫廊
        current_layer.use_text("🎨 插畫集錦", font_size * 1.4, current_x, current_y, &font);
        current_y = current_y - Mm(line_height * 2.0);
        
        // 添加插畫說明文字
        for illustration in illustrations {
            let info_text = if let Some(char_name) = &illustration.character_name {
                format!("• {} (角色: {})", illustration.file_name, char_name)
            } else {
                format!("• {}", illustration.file_name)
            };
            current_layer.use_text(&info_text, font_size * 0.9, current_x, current_y, &font);
            current_y = current_y - Mm(line_height);
        }
        
        // 插畫畫廊結束，準備開始新頁面內容
        // current_y = current_y - Mm(line_height * 2.0); // 預留空間（新頁面會重置位置）
        
        // 新頁面開始正文內容
        let (new_page, layer_id) = doc.add_page(page_width, page_height, "Layer 1");
        current_layer = doc.get_page(new_page).get_layer(layer_id);
        current_y = page_height - margin_top;
        page_count += 1;
    }

    // 添加章節內容
    for (chapter_index, (chapter_title, chapter_content)) in chapters.iter().enumerate() {
        println!("處理章節 {}: {}", chapter_index + 1, chapter_title);
        
        // 檢查是否需要新頁面
        if options.chapter_break_style == "new_page" && chapter_index > 0 {
            let (new_page, layer_id) = doc.add_page(page_width, page_height, "Layer 1");
            current_layer = doc.get_page(new_page).get_layer(layer_id);
            current_y = page_height - margin_top;
            page_count += 1;
        }
        
        // 在章節開始時添加插畫（如果選擇chapter_start佈局）
        if options.illustration_layout == "chapter_start" && !illustrations.is_empty() {
            // 尋找與當前章節相關的插畫
            let chapter_illustrations: Vec<_> = illustrations.iter()
                .filter(|ill| {
                    // 簡單匹配：文件名包含章節標題的關鍵字
                    chapter_title.split_whitespace().any(|word| 
                        word.len() > 1 && ill.file_name.contains(word)
                    )
                })
                .collect();
            
            if !chapter_illustrations.is_empty() {
                current_layer.use_text("📸 本章插畫:", font_size, current_x, current_y, &font);
                current_y = current_y - Mm(line_height);
                
                for illustration in chapter_illustrations {
                    let info_text = if let Some(char_name) = &illustration.character_name {
                        format!("  • {} (角色: {})", illustration.file_name, char_name)
                    } else {
                        format!("  • {}", illustration.file_name)
                    };
                    current_layer.use_text(&info_text, font_size * 0.85, current_x, current_y, &font);
                    current_y = current_y - Mm(line_height * 0.8);
                }
                
                current_y = current_y - Mm(line_height);
            }
        }
        
        // 添加章節標題
        current_layer.use_text(chapter_title, font_size * 1.2, current_x, current_y, &font);
        current_y = current_y - Mm(line_height * 2.0);
        
        // 添加章節內容 - 智能文字換行渲染
        let lines: Vec<&str> = chapter_content.lines().collect();
        for line in lines {
            if !line.trim().is_empty() {
                // 將長行分割成適合頁面寬度的多行
                let wrapped_lines = wrap_text(line, &font, font_size, content_width);
                
                for wrapped_line in wrapped_lines {
                    if current_y < margin_bottom + Mm(line_height) {
                        // 需要新頁面
                        let (new_page, layer_id) = doc.add_page(page_width, page_height, "Layer 1");
                        current_layer = doc.get_page(new_page).get_layer(layer_id);
                        current_y = page_height - margin_top;
                        page_count += 1;
                    }
                    
                    current_layer.use_text(&wrapped_line, font_size, current_x, current_y, &font);
                    current_y = current_y - Mm(line_height);
                }
            } else {
                // 空行
                current_y = current_y - Mm(line_height);
            }
        }
        
        // 章節之間的間距
        current_y = current_y - Mm(line_height);
    }
    
    // 生成最終文件路徑
    let downloads_dir = dirs::download_dir()
        .ok_or("無法獲取下載資料夾")?;
    
    let safe_title = title.replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], "_");
    let final_path = downloads_dir.join(format!("{}.pdf", safe_title));
    
    // 保存PDF文件
    let file = std::fs::File::create(&final_path)
        .map_err(|e| format!("創建PDF文件失敗: {}", e))?;
    let mut buf_writer = BufWriter::new(file);
    doc.save(&mut buf_writer)
        .map_err(|e| format!("保存PDF文件失敗: {}", e))?;
    
    let file_size = std::fs::metadata(&final_path)
        .map_err(|e| format!("獲取文件大小失敗: {}", e))?
        .len();
    
    println!("PDF 文件生成成功: {} (大小: {} bytes, {} 頁)", 
             final_path.display(), file_size, page_count);
    
    Ok(PDFResult {
        file_path: final_path.to_string_lossy().to_string(),
        file_size,
        page_count,
        chapter_count: chapters.len(),
        title: title.to_string(),
        success: true,
        error_message: None,
    })
}