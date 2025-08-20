use crate::database::{get_db, models::*};
use serde::{Deserialize, Serialize};
use std::io::Write;
use zip::{ZipWriter, CompressionMethod};
use tempfile::NamedTempFile;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct EPubGenerationOptions {
    pub include_cover: bool,
    pub custom_css: Option<String>,
    pub font_family: String,
    pub chapter_break_style: String,
    pub author: Option<String>,
    // === AI 插畫整合選項 ===
    pub include_illustrations: bool,
    pub illustration_layout: String, // "gallery", "inline", "chapter_start"
    pub illustration_quality: String, // "original", "compressed"
    pub character_filter: Option<Vec<String>>, // 特定角色篩選
}

impl Default for EPubGenerationOptions {
    fn default() -> Self {
        Self {
            include_cover: true,
            custom_css: None,
            font_family: "Noto Sans TC".to_string(),
            chapter_break_style: "page-break".to_string(),
            author: None,
            // AI 插畫預設選項
            include_illustrations: true,
            illustration_layout: "gallery".to_string(),
            illustration_quality: "original".to_string(),
            character_filter: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EPubResult {
    pub file_path: String,
    pub file_size: u64,
    pub chapter_count: usize,
    pub title: String,
    pub success: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EPubExportRecord {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub file_path: String,
    pub file_size: i64,
    pub chapter_count: i32,
    pub format_settings: String, // JSON string
    pub export_status: String,
    pub created_at: String,
    pub downloaded_at: Option<String>,
}

// === AI 插畫相關結構 ===

#[derive(Debug, Clone)]
pub struct IllustrationFile {
    pub file_path: PathBuf,
    pub filename: String,
    #[allow(dead_code)]
    pub character_names: Vec<String>,
    #[allow(dead_code)]
    pub generation_time: Option<String>,
}

/// 掃描專案相關的 AI 插畫檔案
fn scan_project_illustrations(_project_id: &str) -> Result<Vec<IllustrationFile>, String> {
    // 取得插畫儲存目錄
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    let illustrations_dir = data_dir.join("genesis-chronicle").join("generated-images");
    
    if !illustrations_dir.exists() {
        println!("插畫目錄不存在: {:?}", illustrations_dir);
        return Ok(Vec::new());
    }
    
    let mut illustrations = Vec::new();
    
    // 遍歷插畫目錄
    if let Ok(entries) = std::fs::read_dir(&illustrations_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            
            // 只處理圖片檔案
            if let Some(extension) = path.extension() {
                let ext_str = extension.to_string_lossy().to_lowercase();
                if matches!(ext_str.as_str(), "jpg" | "jpeg" | "png" | "webp") {
                    if let Some(filename) = path.file_name() {
                        let filename_str = filename.to_string_lossy().to_string();
                        
                        // 簡單的檔名解析（可以後續改進）
                        // 假設檔名包含角色資訊或專案 ID
                        let illustration = IllustrationFile {
                            file_path: path.clone(),
                            filename: filename_str,
                            character_names: Vec::new(), // 暫時為空，後續可以從檔名或元資料解析
                            generation_time: None,
                        };
                        
                        illustrations.push(illustration);
                    }
                }
            }
        }
    }
    
    println!("掃描到 {} 張插畫檔案", illustrations.len());
    Ok(illustrations)
}

/// 將插畫檔案複製到 EPUB 中並回傳檔名列表
fn add_illustrations_to_epub<W: Write + std::io::Seek>(
    zip: &mut ZipWriter<W>,
    illustrations: &[IllustrationFile],
    options: &EPubGenerationOptions,
) -> Result<Vec<String>, String> {
    let zip_options = zip::write::FileOptions::default()
        .compression_method(CompressionMethod::Deflated);
    
    let mut added_files = Vec::new();
    
    for (index, illustration) in illustrations.iter().enumerate() {
        // 讀取圖片檔案
        let image_data = std::fs::read(&illustration.file_path)
            .map_err(|e| format!("讀取插畫檔案失敗 {}: {}", illustration.filename, e))?;
        
        // 決定檔名（確保在 EPUB 中是唯一的）
        let epub_filename = if illustration.filename.len() > 50 {
            // 如果檔名太長，使用索引
            format!("illustration_{:03}.jpg", index + 1)
        } else {
            illustration.filename.clone()
        };
        
        let epub_path = format!("OEBPS/images/{}", epub_filename);
        
        // 將圖片加入到 ZIP
        zip.start_file(&epub_path, zip_options)
            .map_err(|e| format!("創建插畫檔案失敗 {}: {}", epub_filename, e))?;
        
        // 根據品質設定決定是否壓縮
        let final_data = if options.illustration_quality == "compressed" && image_data.len() > 500_000 {
            // TODO: 實際的圖片壓縮邏輯
            // 目前直接使用原圖
            image_data
        } else {
            image_data
        };
        
        zip.write_all(&final_data)
            .map_err(|e| format!("寫入插畫檔案失敗 {}: {}", epub_filename, e))?;
        
        added_files.push(epub_filename.clone());
        
        println!("已加入插畫: {} ({} bytes)", epub_filename, final_data.len());
    }
    
    Ok(added_files)
}

/// 生成插畫集錦頁面 XHTML
fn generate_illustrations_gallery_xhtml(illustrations: &[String]) -> String {
    let mut html = String::from(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-TW">
<head>
    <title>插畫集錦</title>
    <link rel="stylesheet" href="styles.css" type="text/css"/>
    <style type="text/css">
        .illustration-gallery {
            text-align: center;
            margin: 20px 0;
        }
        .illustration-item {
            page-break-inside: avoid;
            margin-bottom: 40px;
        }
        .illustration-image {
            max-width: 100%;
            max-height: 80vh;
            height: auto;
        }
        .illustration-caption {
            font-size: 0.9em;
            color: #666;
            margin-top: 10px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="chapter">
        <h1>🎨 插畫集錦</h1>
        <div class="illustration-gallery">
"#);

    for (index, filename) in illustrations.iter().enumerate() {
        html.push_str(&format!(r#"
            <div class="illustration-item">
                <img src="images/{}" alt="插畫 {}" class="illustration-image"/>
                <div class="illustration-caption">插畫 {} - {}</div>
            </div>
"#, filename, index + 1, index + 1, filename));
    }

    html.push_str(r#"
        </div>
    </div>
</body>
</html>"#);

    html
}

/// 生成 EPUB 電子書
#[tauri::command]
pub async fn generate_epub(
    #[allow(non_snake_case)]
    projectId: String,
    options: Option<EPubGenerationOptions>,
) -> Result<EPubResult, String> {
    println!("開始生成 EPUB，專案 ID: {}", projectId);
    
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
    
    // 3. 轉換章節內容為 HTML
    let html_chapters = convert_chapters_to_html(&chapters)?;
    
    // 4. 準備 EPUB 生成參數
    let epub_title = project.name.clone();
    let epub_author = options.author.clone()
        .unwrap_or_else(|| "創世紀元用戶".to_string());
    
    // 5. 生成 EPUB 文件
    let epub_result = generate_epub_file(
        &epub_title,
        &epub_author,
        &html_chapters,
        &options,
    ).await?;
    
    // 6. 記錄導出歷史
    let export_id = uuid::Uuid::new_v4().to_string();
    let export_record = EPubExportRecord {
        id: export_id,
        project_id: projectId.clone(),
        title: epub_title.clone(),
        file_path: epub_result.file_path.clone(),
        file_size: epub_result.file_size as i64,
        chapter_count: chapters.len() as i32,
        format_settings: serde_json::to_string(&options)
            .map_err(|e| format!("序列化設定失敗: {}", e))?,
        export_status: "completed".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        downloaded_at: None,
    };
    
    // 保存記錄 (重新連接資料庫)
    {
        let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
        let conn = db.lock().unwrap();
        save_epub_export_record(&*conn, &export_record)?;
    }
    
    println!("EPUB 生成完成: {}", epub_result.file_path);
    
    Ok(epub_result)
}

/// 獲取專案的 EPUB 導出歷史
#[tauri::command]
pub async fn get_epub_exports(
    #[allow(non_snake_case)]
    projectId: String,
) -> Result<Vec<EPubExportRecord>, String> {
    let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let conn = db.lock().unwrap();
    get_epub_export_history(&*conn, &projectId)
}

/// 刪除 EPUB 導出記錄
#[tauri::command]
pub async fn delete_epub_export(
    #[allow(non_snake_case)]
    exportId: String,
) -> Result<(), String> {
    let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let conn = db.lock().unwrap();
    delete_epub_export_record(&*conn, &exportId)
}

// ============ 輔助函數 ============

/// 轉換章節內容為 HTML
fn convert_chapters_to_html(chapters: &[Chapter]) -> Result<Vec<(String, String)>, String> {
    let mut html_chapters = Vec::new();
    
    for chapter in chapters {
        let chapter_title = chapter.title.clone();
        let content_str = chapter.content.as_deref().unwrap_or("[]");
        let html_content = convert_slate_to_html(content_str)?;
        html_chapters.push((chapter_title, html_content));
    }
    
    Ok(html_chapters)
}

/// 轉換 Slate.js JSON 內容為 HTML
fn convert_slate_to_html(slate_json: &str) -> Result<String, String> {
    // 調試日志
    println!("🔍 轉換 Slate.js 內容: {}", slate_json);
    
    // 解析 Slate.js JSON
    let slate_value: serde_json::Value = serde_json::from_str(slate_json)
        .map_err(|e| format!("解析 Slate.js 內容失敗: {}", e))?;
    
    // Slate.js 通常是一個數組格式
    let html = if slate_value.is_array() {
        let array = slate_value.as_array().unwrap();
        if array.is_empty() {
            println!("⚠️ Slate.js 內容為空數組");
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
    
    println!("✅ 生成的 HTML 長度: {} 字符", html.len());
    Ok(html)
}

/// 遞歸轉換 Slate.js 節點為 HTML
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
    
    // 根據節點類型生成 HTML
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

/// 生成真實的 EPUB 文件
async fn generate_epub_file(
    title: &str,
    author: &str,
    chapters: &[(String, String)],
    options: &EPubGenerationOptions,
) -> Result<EPubResult, String> {
    println!("開始生成真實 EPUB 文件: {}", title);
    
    // 生成最終文件路徑
    let downloads_dir = dirs::download_dir()
        .ok_or("無法獲取下載資料夾")?;
    
    let safe_title = title.replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], "_");
    let final_path = downloads_dir.join(format!("{}.epub", safe_title));
    
    // 創建臨時文件
    let temp_file = NamedTempFile::new()
        .map_err(|e| format!("創建臨時文件失敗: {}", e))?;
    
    let mut zip = ZipWriter::new(temp_file.as_file());
    
    // 設置壓縮方法
    let options_zip = zip::write::FileOptions::default()
        .compression_method(CompressionMethod::Deflated);
    
    // 1. 添加 mimetype 文件（必須是第一個，且不壓縮）
    zip.start_file("mimetype", zip::write::FileOptions::default().compression_method(CompressionMethod::Stored))
        .map_err(|e| format!("創建 mimetype 失敗: {}", e))?;
    zip.write_all(b"application/epub+zip")
        .map_err(|e| format!("寫入 mimetype 失敗: {}", e))?;
    
    // 2. 添加 META-INF/container.xml
    zip.start_file("META-INF/container.xml", options_zip)
        .map_err(|e| format!("創建 container.xml 失敗: {}", e))?;
    let container_xml = generate_container_xml();
    zip.write_all(container_xml.as_bytes())
        .map_err(|e| format!("寫入 container.xml 失敗: {}", e))?;
    
    // 3. 預處理 AI 插畫（掃描檔案但先不加入 ZIP）
    let mut illustration_files = Vec::new();
    let mut has_illustrations_page = false;
    if options.include_illustrations {
        println!("🎨 開始掃描 AI 插畫檔案...");
        let illustrations = scan_project_illustrations("dummy_project_id")?; // TODO: 使用實際 project_id
        if !illustrations.is_empty() {
            // 暫存插畫資訊，稍後處理
            for (index, illustration) in illustrations.iter().enumerate() {
                let epub_filename = if illustration.filename.len() > 50 {
                    format!("illustration_{:03}.jpg", index + 1)
                } else {
                    illustration.filename.clone()
                };
                illustration_files.push(epub_filename);
            }
            has_illustrations_page = true;
            println!("📋 預計包含 {} 張插畫", illustration_files.len());
        }
    }
    
    // 4. 添加 OEBPS/content.opf（根據是否包含插畫選擇不同版本）
    zip.start_file("OEBPS/content.opf", options_zip)
        .map_err(|e| format!("創建 content.opf 失敗: {}", e))?;
    
    let content_opf = if has_illustrations_page {
        generate_content_opf_with_illustrations(title, author, chapters, &illustration_files, true)
    } else {
        generate_content_opf(title, author, chapters)
    };
    
    zip.write_all(content_opf.as_bytes())
        .map_err(|e| format!("寫入 content.opf 失敗: {}", e))?;
    
    // 4. 添加 OEBPS/toc.ncx
    zip.start_file("OEBPS/toc.ncx", options_zip)
        .map_err(|e| format!("創建 toc.ncx 失敗: {}", e))?;
    let toc_ncx = generate_toc_ncx(title, chapters);
    zip.write_all(toc_ncx.as_bytes())
        .map_err(|e| format!("寫入 toc.ncx 失敗: {}", e))?;
    
    // 5. 添加樣式文件
    zip.start_file("OEBPS/styles.css", options_zip)
        .map_err(|e| format!("創建 styles.css 失敗: {}", e))?;
    let css_content = generate_epub_css(options);
    zip.write_all(css_content.as_bytes())
        .map_err(|e| format!("寫入 styles.css 失敗: {}", e))?;
    
    // 6. 添加封面頁（如果啟用）
    if options.include_cover {
        zip.start_file("OEBPS/cover.xhtml", options_zip)
            .map_err(|e| format!("創建 cover.xhtml 失敗: {}", e))?;
        let cover_html = generate_cover_xhtml(title, author);
        zip.write_all(cover_html.as_bytes())
            .map_err(|e| format!("寫入 cover.xhtml 失敗: {}", e))?;
    }
    
    // 7. 實際處理 AI 插畫檔案（加入到 EPUB）
    if has_illustrations_page {
        println!("🎨 開始將插畫檔案加入到 EPUB...");
        
        // 重新掃描插畫檔案進行實際處理
        let illustrations = scan_project_illustrations("dummy_project_id")?;
        
        if !illustrations.is_empty() {
            // 將插畫檔案實際加入到 EPUB ZIP
            let _added_files = add_illustrations_to_epub(&mut zip, &illustrations, options)?;
            
            // 根據佈局模式生成插畫頁面
            match options.illustration_layout.as_str() {
                "gallery" => {
                    // 生成插畫集錦頁面
                    zip.start_file("OEBPS/illustrations.xhtml", options_zip)
                        .map_err(|e| format!("創建插畫集錦頁面失敗: {}", e))?;
                    let gallery_html = generate_illustrations_gallery_xhtml(&illustration_files);
                    zip.write_all(gallery_html.as_bytes())
                        .map_err(|e| format!("寫入插畫集錦頁面失敗: {}", e))?;
                    
                    println!("✅ 已生成插畫集錦頁面，包含 {} 張插畫", illustration_files.len());
                }
                "inline" => {
                    // TODO: 實現內嵌模式（將插畫嵌入到章節中）
                    println!("📝 內嵌模式暫未實現，使用集錦模式");
                    
                    // 暫時生成集錦頁面
                    zip.start_file("OEBPS/illustrations.xhtml", options_zip)
                        .map_err(|e| format!("創建插畫集錦頁面失敗: {}", e))?;
                    let gallery_html = generate_illustrations_gallery_xhtml(&illustration_files);
                    zip.write_all(gallery_html.as_bytes())
                        .map_err(|e| format!("寫入插畫集錦頁面失敗: {}", e))?;
                }
                "chapter_start" => {
                    // TODO: 實現章節開頭模式
                    println!("📝 章節開頭模式暫未實現，使用集錦模式");
                    
                    // 暫時生成集錦頁面
                    zip.start_file("OEBPS/illustrations.xhtml", options_zip)
                        .map_err(|e| format!("創建插畫集錦頁面失敗: {}", e))?;
                    let gallery_html = generate_illustrations_gallery_xhtml(&illustration_files);
                    zip.write_all(gallery_html.as_bytes())
                        .map_err(|e| format!("寫入插畫集錦頁面失敗: {}", e))?;
                }
                _ => {
                    println!("⚠️ 未知的插畫佈局模式: {}，使用集錦模式", options.illustration_layout);
                    
                    // 預設生成集錦頁面
                    zip.start_file("OEBPS/illustrations.xhtml", options_zip)
                        .map_err(|e| format!("創建插畫集錦頁面失敗: {}", e))?;
                    let gallery_html = generate_illustrations_gallery_xhtml(&illustration_files);
                    zip.write_all(gallery_html.as_bytes())
                        .map_err(|e| format!("寫入插畫集錦頁面失敗: {}", e))?;
                }
            }
        }
    }
    
    // 8. 添加章節內容
    for (index, (chapter_title, chapter_content)) in chapters.iter().enumerate() {
        let filename = format!("OEBPS/chapter{}.xhtml", index + 1);
        zip.start_file(&filename, options_zip)
            .map_err(|e| format!("創建章節文件失敗: {}", e))?;
        
        let chapter_xhtml = generate_chapter_xhtml(chapter_title, chapter_content);
        zip.write_all(chapter_xhtml.as_bytes())
            .map_err(|e| format!("寫入章節內容失敗: {}", e))?;
    }
    
    // 完成 ZIP 文件
    zip.finish()
        .map_err(|e| format!("完成 EPUB 文件失敗: {}", e))?;
    
    // 移動臨時文件到最終位置
    let temp_path = temp_file.path();
    std::fs::copy(temp_path, &final_path)
        .map_err(|e| format!("複製文件到最終位置失敗: {}", e))?;
    
    let file_size = std::fs::metadata(&final_path)
        .map_err(|e| format!("獲取文件大小失敗: {}", e))?
        .len();
    
    println!("EPUB 文件生成成功: {} (大小: {} bytes)", final_path.display(), file_size);
    
    Ok(EPubResult {
        file_path: final_path.to_string_lossy().to_string(),
        file_size,
        chapter_count: chapters.len(),
        title: title.to_string(),
        success: true,
        error_message: None,
    })
}

/// 保存 EPUB 導出記錄到資料庫
fn save_epub_export_record(conn: &rusqlite::Connection, record: &EPubExportRecord) -> Result<(), String> {
    conn.execute(
        "INSERT INTO epub_exports (
            id, project_id, title, file_path, file_size, chapter_count,
            format_settings, export_status, created_at, downloaded_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            record.id,
            record.project_id,
            record.title,
            record.file_path,
            record.file_size,
            record.chapter_count,
            record.format_settings,
            record.export_status,
            record.created_at,
            record.downloaded_at
        ]
    )
    .map_err(|e| format!("保存 EPUB 導出記錄失敗: {}", e))?;
    
    Ok(())
}

/// 獲取 EPUB 導出歷史
fn get_epub_export_history(conn: &rusqlite::Connection, project_id: &str) -> Result<Vec<EPubExportRecord>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, file_path, file_size, chapter_count,
                   format_settings, export_status, created_at, downloaded_at
            FROM epub_exports 
            WHERE project_id = ?1 
            ORDER BY created_at DESC"
        )
        .map_err(|e| format!("準備查詢語句失敗: {}", e))?;
    
    let export_iter = stmt
        .query_map([project_id], |row| {
            Ok(EPubExportRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                file_path: row.get(3)?,
                file_size: row.get(4)?,
                chapter_count: row.get(5)?,
                format_settings: row.get(6)?,
                export_status: row.get(7)?,
                created_at: row.get(8)?,
                downloaded_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("查詢 EPUB 導出記錄失敗: {}", e))?;
    
    let mut exports = Vec::new();
    for export in export_iter {
        exports.push(export.map_err(|e| format!("處理導出記錄失敗: {}", e))?);
    }
    
    Ok(exports)
}

/// 刪除 EPUB 導出記錄
fn delete_epub_export_record(conn: &rusqlite::Connection, export_id: &str) -> Result<(), String> {
    // 先獲取文件路徑以便刪除實際文件
    let file_path: Result<String, _> = conn.query_row(
        "SELECT file_path FROM epub_exports WHERE id = ?1",
        [export_id],
        |row| row.get(0)
    );
    
    // 刪除資料庫記錄
    let rows_affected = conn
        .execute("DELETE FROM epub_exports WHERE id = ?1", [export_id])
        .map_err(|e| format!("刪除 EPUB 導出記錄失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("EPUB 導出記錄不存在".to_string());
    }
    
    // 嘗試刪除實際文件（如果獲取到路徑）
    if let Ok(path) = file_path {
        if std::path::Path::new(&path).exists() {
            if let Err(e) = std::fs::remove_file(&path) {
                log::warn!("刪除 EPUB 文件失敗: {} ({})", path, e);
                // 不拋出錯誤，因為資料庫記錄已經刪除
            } else {
                log::info!("已刪除 EPUB 文件: {}", path);
            }
        }
    }
    
    Ok(())
}

// ============ EPUB 生成輔助函數 ============

/// 生成 META-INF/container.xml
fn generate_container_xml() -> String {
    r#"<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"#.to_string()
}

/// 生成 OEBPS/content.opf
fn generate_content_opf(title: &str, author: &str, chapters: &[(String, String)]) -> String {
    let mut content = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>{}</dc:title>
    <dc:creator opf:role="aut">{}</dc:creator>
    <dc:language>zh-TW</dc:language>
    <dc:identifier id="BookId" opf:scheme="UUID">{}</dc:identifier>
    <dc:publisher>創世紀元</dc:publisher>
    <meta name="cover" content="cover"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
"#, title, author, uuid::Uuid::new_v4());

    // 添加章節到 manifest
    for i in 0..chapters.len() {
        content.push_str(&format!(
            "    <item id=\"chapter{}\" href=\"chapter{}.xhtml\" media-type=\"application/xhtml+xml\"/>\n",
            i + 1, i + 1
        ));
    }

    content.push_str("  </manifest>\n  <spine toc=\"ncx\">\n    <itemref idref=\"cover\"/>\n");

    // 添加章節到 spine
    for i in 0..chapters.len() {
        content.push_str(&format!("    <itemref idref=\"chapter{}\"/>\n", i + 1));
    }

    content.push_str("  </spine>\n</package>");
    content
}

/// 生成包含插畫的 content.opf
fn generate_content_opf_with_illustrations(
    title: &str, 
    author: &str, 
    chapters: &[(String, String)],
    illustration_files: &[String],
    include_illustrations_page: bool
) -> String {
    let mut content = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>{}</dc:title>
    <dc:creator opf:role="aut">{}</dc:creator>
    <dc:language>zh-TW</dc:language>
    <dc:identifier id="BookId" opf:scheme="UUID">{}</dc:identifier>
    <dc:publisher>創世紀元 AI 智能創作</dc:publisher>
    <meta name="cover" content="cover"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
"#, title, author, uuid::Uuid::new_v4());

    // 如果包含插畫集錦頁面，加入到 manifest
    if include_illustrations_page && !illustration_files.is_empty() {
        content.push_str("    <item id=\"illustrations\" href=\"illustrations.xhtml\" media-type=\"application/xhtml+xml\"/>\n");
    }

    // 添加章節到 manifest
    for i in 0..chapters.len() {
        content.push_str(&format!(
            "    <item id=\"chapter{}\" href=\"chapter{}.xhtml\" media-type=\"application/xhtml+xml\"/>\n",
            i + 1, i + 1
        ));
    }

    // 添加插畫檔案到 manifest
    for (index, filename) in illustration_files.iter().enumerate() {
        // 根據檔案副檔名決定 media-type
        let media_type = if filename.to_lowercase().ends_with(".png") {
            "image/png"
        } else if filename.to_lowercase().ends_with(".jpg") || filename.to_lowercase().ends_with(".jpeg") {
            "image/jpeg"
        } else if filename.to_lowercase().ends_with(".webp") {
            "image/webp"
        } else {
            "image/jpeg" // 預設
        };

        content.push_str(&format!(
            "    <item id=\"illustration{}\" href=\"images/{}\" media-type=\"{}\"/>\n",
            index + 1, filename, media_type
        ));
    }

    content.push_str("  </manifest>\n  <spine toc=\"ncx\">\n    <itemref idref=\"cover\"/>\n");

    // 如果包含插畫集錦，將其加入到 spine（在章節之前）
    if include_illustrations_page && !illustration_files.is_empty() {
        content.push_str("    <itemref idref=\"illustrations\"/>\n");
    }

    // 添加章節到 spine
    for i in 0..chapters.len() {
        content.push_str(&format!("    <itemref idref=\"chapter{}\"/>\n", i + 1));
    }

    content.push_str("  </spine>\n</package>");
    content
}

/// 生成 OEBPS/toc.ncx
fn generate_toc_ncx(title: &str, chapters: &[(String, String)]) -> String {
    let mut content = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN"
   "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="{}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>{}</text>
  </docTitle>
  <navMap>
    <navPoint id="cover" playOrder="1">
      <navLabel>
        <text>封面</text>
      </navLabel>
      <content src="cover.xhtml"/>
    </navPoint>
"#, uuid::Uuid::new_v4(), title);

    // 添加章節導航
    for (i, (chapter_title, _)) in chapters.iter().enumerate() {
        content.push_str(&format!(
            "    <navPoint id=\"chapter{}\" playOrder=\"{}\">\n      <navLabel>\n        <text>{}</text>\n      </navLabel>\n      <content src=\"chapter{}.xhtml\"/>\n    </navPoint>\n",
            i + 1, i + 2, chapter_title, i + 1
        ));
    }

    content.push_str("  </navMap>\n</ncx>");
    content
}

/// 生成 EPUB CSS 樣式
fn generate_epub_css(options: &EPubGenerationOptions) -> String {
    format!(r#"/* 創世紀元 EPUB 樣式 */

body {{
    font-family: "{}", "Microsoft JhengHei", "PingFang TC", serif;
    line-height: 1.8;
    margin: 1em;
    color: #333;
    background: #fff;
    text-align: justify;
}}

h1, h2, h3, h4, h5, h6 {{
    color: #2c5aa0;
    font-weight: 600;
    margin: 1.5em 0 1em 0;
    line-height: 1.4;
}}

h1 {{
    font-size: 1.8em;
    text-align: center;
    border-bottom: 2px solid #D4AF37;
    padding-bottom: 0.5em;
    margin-bottom: 1.5em;
}}

h2 {{
    font-size: 1.5em;
    border-left: 4px solid #D4AF37;
    padding-left: 1em;
}}

h3 {{
    font-size: 1.3em;
}}

p {{
    margin: 0 0 1.2em 0;
    text-indent: 2em;
}}

blockquote {{
    margin: 1em 2em;
    padding: 0.5em 1em;
    border-left: 3px solid #D4AF37;
    background-color: #f9f9f9;
    font-style: italic;
}}

ul, ol {{
    margin: 1em 0;
    padding-left: 2em;
}}

li {{
    margin: 0.5em 0;
}}

.chapter-title {{
    text-align: center;
    font-size: 1.8em;
    font-weight: bold;
    color: #D4AF37;
    margin: 2em 0 1.5em 0;
    {}
}}

.cover-page {{
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2em;
}}

.cover-title {{
    font-size: 3em;
    font-weight: bold;
    margin-bottom: 0.5em;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}}

.cover-author {{
    font-size: 1.5em;
    margin-bottom: 3em;
    border-top: 2px solid rgba(255,255,255,0.5);
    padding-top: 1em;
}}

.cover-generator {{
    font-size: 1em;
    opacity: 0.7;
    position: absolute;
    bottom: 2em;
}}

.generated-by {{
    text-align: center;
    font-size: 0.9em;
    color: #666;
    margin-top: 2em;
    font-style: italic;
}}
"#, 
    options.font_family,
    if options.chapter_break_style == "page-break" { 
        "page-break-before: always;" 
    } else { 
        "" 
    }
    )
}

/// 生成封面 XHTML
fn generate_cover_xhtml(title: &str, author: &str) -> String {
    format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>封面</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    <div class="cover-page">
        <div class="cover-title">{}</div>
        <div class="cover-author">作者：{}</div>
        <div class="cover-generator">由創世紀元生成</div>
    </div>
</body>
</html>"#, title, author)
}

/// 生成章節 XHTML
fn generate_chapter_xhtml(chapter_title: &str, chapter_content: &str) -> String {
    format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>{}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    <div class="chapter-title">{}</div>
    <div class="chapter-content">
        {}
    </div>
    <div class="generated-by">由創世紀元生成</div>
</body>
</html>"#, chapter_title, chapter_title, chapter_content)
}