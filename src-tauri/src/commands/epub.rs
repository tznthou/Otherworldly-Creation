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

/// 將字串跳脫為可安全插入 XML/XHTML 的文字
///
/// EPUB 的 OPF、NCX、XHTML 都是嚴格 XML，書名或章節標題只要含 `&` `<` `>` 就會
/// 讓整份檔案無法解析。章節內文早已在 `slate_to_html_recursive` 做過跳脫，
/// 標題類欄位過去卻是裸插值，這裡補上統一入口。
fn xml_text(value: &str) -> String {
    html_escape::encode_text(value).into_owned()
}

/// 決定插畫在 EPUB 內的檔名
///
/// 一律使用自產的 ASCII 檔名並保留原副檔名：原始檔名可能含 `&` `"` 等字元，
/// 直接當成 ZIP entry 名稱與 OPF 的 href 屬性會破壞 manifest。
/// 固定由索引產生也確保 manifest 宣告與實際寫入 ZIP 的名稱必然一致。
fn epub_image_filename(illustration: &IllustrationFile, index: usize) -> String {
    let ext = illustration
        .file_path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .filter(|e| matches!(e.as_str(), "jpg" | "jpeg" | "png" | "webp"))
        .unwrap_or_else(|| "jpg".to_string());
    format!("illustration_{:03}.{}", index + 1, ext)
}

/// 由副檔名決定 EPUB manifest 用的 media-type
fn image_media_type(filename: &str) -> &'static str {
    let lower = filename.to_lowercase();
    if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else {
        "image/jpeg"
    }
}

/// 取得指定專案的插畫檔名集合
///
/// 插畫分散在兩張表：Gemini / OpenAI 等寫入 `illustration_generations`，
/// Pollinations 免費生成寫入 `pollinations_generations`。兩者的檔名欄位不同
/// （`image_url` 與 `local_file_path`），但實體檔案共用同一個扁平目錄，
/// 因此必須靠資料庫記錄做專案隔離，且兩張表都要查。
///
/// 篩選條件刻意與畫廊的查詢（`free_generation.rs` 的 `get_illustration_history`）
/// 對齊，確保「畫廊看得到的圖，匯出就收得到」。軟刪除是寫入 `deleted_at`，
/// 不是 `is_deleted`——後者在整個 codebase 中從未被設值。
fn project_illustration_filenames(project_id: &str) -> Result<std::collections::HashSet<String>, String> {
    let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let conn = db
        .lock()
        .map_err(|_| "資料庫鎖定狀態異常，請重新啟動應用程式".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT image_url AS filename FROM illustration_generations \
             WHERE project_id = ?1 AND deleted_at IS NULL AND is_permanently_deleted = 0 \
               AND image_url IS NOT NULL \
             UNION \
             SELECT local_file_path AS filename FROM pollinations_generations \
             WHERE project_id = ?1 AND deleted_at IS NULL \
               AND local_file_path IS NOT NULL",
        )
        .map_err(|e| format!("查詢專案插畫失敗: {}", e))?;

    let rows = stmt
        .query_map([project_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("查詢專案插畫失敗: {}", e))?;

    let mut filenames = std::collections::HashSet::new();
    for row in rows {
        let image_url = row.map_err(|e| format!("讀取插畫記錄失敗: {}", e))?;
        // 只取最後一段，同時相容於歷史資料可能存成完整路徑的情況
        let name = image_url
            .rsplit(['/', '\\'])
            .next()
            .unwrap_or(&image_url)
            .to_string();
        if !name.is_empty() {
            filenames.insert(name);
        }
    }

    Ok(filenames)
}

/// 判斷目錄中的一個檔案是否應該收進本專案的 EPUB，是的話回傳它的檔名
///
/// 所有專案的圖片共用一個扁平目錄，這裡是「不夾帶別人作品插畫」的唯一守門點，
/// 因此與檔案系統掃描分離成純函式，讓過濾規則本身能被測試涵蓋。
fn illustration_export_name(
    path: &std::path::Path,
    allowed: &std::collections::HashSet<String>,
) -> Option<String> {
    let extension = path.extension()?.to_string_lossy().to_lowercase();
    if !matches!(extension.as_str(), "jpg" | "jpeg" | "png" | "webp") {
        return None;
    }

    let filename = path.file_name()?.to_string_lossy().to_string();
    if !allowed.contains(&filename) {
        return None;
    }

    Some(filename)
}

/// 掃描專案相關的 AI 插畫檔案
fn scan_project_illustrations(project_id: &str) -> Result<Vec<IllustrationFile>, String> {
    // === 新邏輯：使用 path_utils 統一路徑管理 ===
    let illustrations_dir = crate::utils::path_utils::get_images_base_dir()
        .map_err(|e| format!("無法取得圖片目錄: {}", e))?;

    log::info!("EPUB 掃描插畫目錄: {:?}", illustrations_dir);

    if !illustrations_dir.exists() {
        log::warn!("插畫目錄不存在: {:?}", illustrations_dir);
        return Ok(Vec::new());
    }

    // 所有專案的圖片共用一個扁平目錄，必須靠資料庫記錄篩出屬於本專案的檔案，
    // 否則匯出任一本書都會夾帶其他作品尚未公開的插畫。
    let allowed = project_illustration_filenames(project_id)?;
    if allowed.is_empty() {
        log::info!("專案 {} 沒有插畫記錄", project_id);
        return Ok(Vec::new());
    }

    let mut illustrations = Vec::new();

    // 讀取失敗必須往上拋：靜默回傳空清單會讓使用者拿到缺插畫的成品卻毫無警示
    let entries = std::fs::read_dir(&illustrations_dir)
        .map_err(|e| format!("讀取插畫目錄失敗 {:?}: {}", illustrations_dir, e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("讀取插畫目錄項目失敗: {}", e))?;
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let Some(filename_str) = illustration_export_name(&path, &allowed) else {
            continue;
        };

        illustrations.push(IllustrationFile {
            file_path: path.clone(),
            filename: filename_str,
            character_names: Vec::new(), // 暫時為空，後續可以從檔名或元資料解析
            generation_time: None,
        });
    }

    // 固定排序，讓同一份資料每次匯出的插畫順序一致
    illustrations.sort_by(|a, b| a.filename.cmp(&b.filename));

    log::info!(
        "專案 {} 掃描到 {} 張插畫檔案",
        project_id,
        illustrations.len()
    );
    Ok(illustrations)
}

/// 將插畫檔案複製到 EPUB 中並回傳檔名列表
fn add_illustrations_to_epub<W: Write + std::io::Seek>(
    zip: &mut ZipWriter<W>,
    illustrations: &[IllustrationFile],
) -> Result<Vec<String>, String> {
    let zip_options = zip::write::FileOptions::default()
        .compression_method(CompressionMethod::Deflated);
    
    let mut added_files = Vec::new();
    
    for (index, illustration) in illustrations.iter().enumerate() {
        // 讀取圖片檔案
        let image_data = std::fs::read(&illustration.file_path)
            .map_err(|e| format!("讀取插畫檔案失敗 {}: {}", illustration.filename, e))?;

        // 檔名由索引產生，與 manifest 使用同一個函式以確保兩邊必然一致
        let epub_filename = epub_image_filename(illustration, index);

        let epub_path = format!("OEBPS/images/{}", epub_filename);

        // 將圖片加入到 ZIP
        zip.start_file(&epub_path, zip_options)
            .map_err(|e| format!("建立插畫檔案失敗 {}: {}", epub_filename, e))?;

        // 圖片壓縮尚未實作，illustration_quality 目前不影響輸出內容
        zip.write_all(&image_data)
            .map_err(|e| format!("寫入插畫檔案失敗 {}: {}", epub_filename, e))?;

        added_files.push(epub_filename.clone());

        log::debug!("已加入插畫: {} ({} 位元組)", epub_filename, image_data.len());
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
    log::info!("開始生成 EPUB，專案 ID: {}", projectId);
    
    let options = options.unwrap_or_default();
    
    // 1. 從資料庫取得專案資料和章節
    let (project, chapters) = {
        let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
        let conn = db.lock().map_err(|_| "資料庫鎖定狀態異常，請重新啟動應用程式".to_string())?;
        
        // 取得專案資料
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
                    return Err(format!("取得專案失敗: {}", e));
                }
            }
        };
        
        // 2. 取得專案的所有章節
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
    
    log::info!("找到 {} 個章節", chapters.len());
    
    // 3. 轉換章節內容為 HTML
    let html_chapters = convert_chapters_to_html(&chapters)?;
    
    // 4. 準備 EPUB 生成參數
    let epub_title = project.name.clone();
    let epub_author = options.author.clone()
        .unwrap_or_else(|| "創世紀元用戶".to_string());
    
    // 5. 生成 EPUB 檔案
    // 匯出識別碼需在產生檔案前決定：檔名會帶上它，避免重複匯出互相覆寫
    let export_id = uuid::Uuid::new_v4().to_string();

    let epub_result = generate_epub_file(
        &projectId,
        &export_id,
        &epub_title,
        &epub_author,
        &html_chapters,
        &options,
    ).await?;

    // 6. 記錄匯出歷史
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
    
    // 儲存記錄 (重新連接資料庫)
    {
        let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
        let conn = db.lock().map_err(|_| "資料庫鎖定狀態異常，請重新啟動應用程式".to_string())?;
        save_epub_export_record(&*conn, &export_record)?;
    }
    
    log::info!("EPUB 生成完成: {}", epub_result.file_path);
    
    Ok(epub_result)
}

/// 取得專案的 EPUB 匯出歷史
#[tauri::command]
pub async fn get_epub_exports(
    #[allow(non_snake_case)]
    projectId: String,
) -> Result<Vec<EPubExportRecord>, String> {
    let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let conn = db.lock().map_err(|_| "資料庫鎖定狀態異常，請重新啟動應用程式".to_string())?;
    get_epub_export_history(&*conn, &projectId)
}

/// 刪除 EPUB 匯出記錄
#[tauri::command]
pub async fn delete_epub_export(
    #[allow(non_snake_case)]
    exportId: String,
) -> Result<(), String> {
    let db = get_db().map_err(|e| format!("資料庫連接失敗: {}", e))?;
    let conn = db.lock().map_err(|_| "資料庫鎖定狀態異常，請重新啟動應用程式".to_string())?;
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
    // 偵錯日誌
    log::debug!("轉換 Slate.js 內容，長度 {} 位元組", slate_json.len());
    
    // 解析 Slate.js JSON
    let slate_value: serde_json::Value = serde_json::from_str(slate_json)
        .map_err(|e| format!("解析 Slate.js 內容失敗: {}", e))?;
    
    // Slate.js 通常是一個陣列格式
    let html = if slate_value.is_array() {
        let array = slate_value.as_array().unwrap();
        if array.is_empty() {
            log::debug!("Slate.js 內容為空陣列");
            return Ok(String::new());
        }
        
        // 處理每個根節點
        let html_parts: Result<Vec<_>, _> = array
            .iter()
            .map(slate_to_html_recursive)
            .collect();
        
        html_parts?.join("")
    } else {
        // 單個節點處理（相容性）
        slate_to_html_recursive(&slate_value)?
    };
    
    log::debug!("生成的 HTML 長度: {} 字元", html.len());
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

/// 生成真實的 EPUB 檔案
async fn generate_epub_file(
    project_id: &str,
    export_id: &str,
    title: &str,
    author: &str,
    chapters: &[(String, String)],
    options: &EPubGenerationOptions,
) -> Result<EPubResult, String> {
    log::info!("開始生成 EPUB 檔案: {}", title);

    // === 新邏輯：使用 PathManager 統一路徑管理 ===
    let downloads_dir = crate::utils::PathManager::get_downloads_dir()
        .map_err(|e| format!("無法取得下載目錄: {}", e))?;

    let safe_title = title.replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], "_");
    // 檔名帶上匯出識別碼：路徑只由標題決定時，第二次匯出會無聲蓋掉前一份成品，
    // 且匯出歷史的多筆記錄會全部指向同一個實體檔案。
    let short_id: String = export_id.chars().take(8).collect();

    // 單一路徑元件多數檔案系統上限為 255 bytes，扣掉 `-{8碼}.epub` 需保留 14 bytes。
    // 依 UTF-8 字元邊界截斷，避免長書名把整個匯出打成 ENAMETOOLONG。
    const MAX_TITLE_BYTES: usize = 255 - 14;
    let mut truncated_title = String::new();
    for ch in safe_title.chars() {
        if truncated_title.len() + ch.len_utf8() > MAX_TITLE_BYTES {
            break;
        }
        truncated_title.push(ch);
    }
    if truncated_title.trim().is_empty() {
        truncated_title = "untitled".to_string();
    }

    let final_path = downloads_dir.join(format!("{}-{}.epub", truncated_title, short_id));
    
    // 建立臨時檔案
    let temp_file = NamedTempFile::new()
        .map_err(|e| format!("建立臨時檔案失敗: {}", e))?;
    
    let mut zip = ZipWriter::new(temp_file.as_file());
    
    // 設置壓縮方法
    let options_zip = zip::write::FileOptions::default()
        .compression_method(CompressionMethod::Deflated);
    
    // 1. 添加 mimetype 檔案（必須是第一個，且不壓縮）
    zip.start_file("mimetype", zip::write::FileOptions::default().compression_method(CompressionMethod::Stored))
        .map_err(|e| format!("建立 mimetype 失敗: {}", e))?;
    zip.write_all(b"application/epub+zip")
        .map_err(|e| format!("寫入 mimetype 失敗: {}", e))?;
    
    // 2. 添加 META-INF/container.xml
    zip.start_file("META-INF/container.xml", options_zip)
        .map_err(|e| format!("建立 container.xml 失敗: {}", e))?;
    let container_xml = generate_container_xml();
    zip.write_all(container_xml.as_bytes())
        .map_err(|e| format!("寫入 container.xml 失敗: {}", e))?;
    
    // 3. 預處理 AI 插畫（掃描檔案但先不加入 ZIP）
    //
    // 只掃描一次並保留結果：過去在這裡與實際寫入時各掃一次，兩次之間若有圖片
    // 新增或刪除，manifest 宣告的檔名就會與 ZIP 內容對不上。
    let mut illustration_files = Vec::new();
    let mut scanned_illustrations: Vec<IllustrationFile> = Vec::new();
    let mut has_illustrations_page = false;
    if options.include_illustrations {
        log::info!("開始掃描 AI 插畫檔案...");
        let illustrations = scan_project_illustrations(project_id)?;
        if !illustrations.is_empty() {
            for (index, illustration) in illustrations.iter().enumerate() {
                illustration_files.push(epub_image_filename(illustration, index));
            }
            scanned_illustrations = illustrations;
            has_illustrations_page = true;
            log::info!("預計包含 {} 張插畫", illustration_files.len());
        }
    }

    // 4. 添加 OEBPS/content.opf（根據是否包含插畫選擇不同版本）
    zip.start_file("OEBPS/content.opf", options_zip)
        .map_err(|e| format!("建立 content.opf 失敗: {}", e))?;

    let content_opf = if has_illustrations_page {
        generate_content_opf_with_illustrations(
            title,
            author,
            chapters,
            &illustration_files,
            true,
            options.include_cover,
        )
    } else {
        generate_content_opf(title, author, chapters, options.include_cover)
    };

    zip.write_all(content_opf.as_bytes())
        .map_err(|e| format!("寫入 content.opf 失敗: {}", e))?;

    // 4. 添加 OEBPS/toc.ncx
    zip.start_file("OEBPS/toc.ncx", options_zip)
        .map_err(|e| format!("建立 toc.ncx 失敗: {}", e))?;
    let toc_ncx = generate_toc_ncx(title, chapters, options.include_cover);
    zip.write_all(toc_ncx.as_bytes())
        .map_err(|e| format!("寫入 toc.ncx 失敗: {}", e))?;
    
    // 5. 添加樣式檔案
    zip.start_file("OEBPS/styles.css", options_zip)
        .map_err(|e| format!("建立 styles.css 失敗: {}", e))?;
    let css_content = generate_epub_css(options);
    zip.write_all(css_content.as_bytes())
        .map_err(|e| format!("寫入 styles.css 失敗: {}", e))?;
    
    // 6. 添加封面頁（如果啟用）
    if options.include_cover {
        zip.start_file("OEBPS/cover.xhtml", options_zip)
            .map_err(|e| format!("建立 cover.xhtml 失敗: {}", e))?;
        let cover_html = generate_cover_xhtml(title, author);
        zip.write_all(cover_html.as_bytes())
            .map_err(|e| format!("寫入 cover.xhtml 失敗: {}", e))?;
    }
    
    // 7. 實際處理 AI 插畫檔案（加入到 EPUB）
    if has_illustrations_page {
        log::info!("開始將插畫檔案加入到 EPUB...");

        // 沿用步驟 3 的掃描結果，確保與 manifest 宣告的檔名完全一致
        let _added_files = add_illustrations_to_epub(&mut zip, &scanned_illustrations)?;

        // 內嵌與章節開頭模式尚未實作，一律回退為集錦模式
        if !matches!(options.illustration_layout.as_str(), "gallery") {
            log::info!(
                "插畫佈局模式 {} 尚未實作，改用集錦模式",
                options.illustration_layout
            );
        }

        zip.start_file("OEBPS/illustrations.xhtml", options_zip)
            .map_err(|e| format!("建立插畫集錦頁面失敗: {}", e))?;
        let gallery_html = generate_illustrations_gallery_xhtml(&illustration_files);
        zip.write_all(gallery_html.as_bytes())
            .map_err(|e| format!("寫入插畫集錦頁面失敗: {}", e))?;

        log::info!("已生成插畫集錦頁面，包含 {} 張插畫", illustration_files.len());
    }
    
    // 8. 添加章節內容
    for (index, (chapter_title, chapter_content)) in chapters.iter().enumerate() {
        let filename = format!("OEBPS/chapter{}.xhtml", index + 1);
        zip.start_file(&filename, options_zip)
            .map_err(|e| format!("建立章節檔案失敗: {}", e))?;
        
        let chapter_xhtml = generate_chapter_xhtml(chapter_title, chapter_content);
        zip.write_all(chapter_xhtml.as_bytes())
            .map_err(|e| format!("寫入章節內容失敗: {}", e))?;
    }
    
    // 完成 ZIP 檔案
    zip.finish()
        .map_err(|e| format!("完成 EPUB 檔案失敗: {}", e))?;
    
    // 移動臨時檔案到最終位置
    let temp_path = temp_file.path();
    std::fs::copy(temp_path, &final_path)
        .map_err(|e| format!("複製檔案到最終位置失敗: {}", e))?;
    
    let file_size = std::fs::metadata(&final_path)
        .map_err(|e| format!("取得檔案大小失敗: {}", e))?
        .len();
    
    log::info!("EPUB 檔案生成成功: {} (大小: {} 位元組)", final_path.display(), file_size);
    
    Ok(EPubResult {
        file_path: final_path.to_string_lossy().to_string(),
        file_size,
        chapter_count: chapters.len(),
        title: title.to_string(),
        success: true,
        error_message: None,
    })
}

/// 儲存 EPUB 匯出記錄到資料庫
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
    .map_err(|e| format!("儲存 EPUB 匯出記錄失敗: {}", e))?;
    
    Ok(())
}

/// 取得 EPUB 匯出歷史
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
        .map_err(|e| format!("查詢 EPUB 匯出記錄失敗: {}", e))?;
    
    let mut exports = Vec::new();
    for export in export_iter {
        exports.push(export.map_err(|e| format!("處理匯出記錄失敗: {}", e))?);
    }
    
    Ok(exports)
}

/// 刪除 EPUB 匯出記錄
fn delete_epub_export_record(conn: &rusqlite::Connection, export_id: &str) -> Result<(), String> {
    // 先取得檔案路徑以便刪除實際檔案
    let file_path: Result<String, _> = conn.query_row(
        "SELECT file_path FROM epub_exports WHERE id = ?1",
        [export_id],
        |row| row.get(0)
    );
    
    // 刪除資料庫記錄
    let rows_affected = conn
        .execute("DELETE FROM epub_exports WHERE id = ?1", [export_id])
        .map_err(|e| format!("刪除 EPUB 匯出記錄失敗: {}", e))?;
    
    if rows_affected == 0 {
        return Err("EPUB 匯出記錄不存在".to_string());
    }
    
    // 嘗試刪除實際檔案（如果取得到路徑）
    if let Ok(path) = file_path {
        if std::path::Path::new(&path).exists() {
            if let Err(e) = std::fs::remove_file(&path) {
                log::warn!("刪除 EPUB 檔案失敗: {} ({})", path, e);
                // 不拋出錯誤，因為資料庫記錄已經刪除
            } else {
                log::info!("已刪除 EPUB 檔案: {}", path);
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
fn generate_content_opf(
    title: &str,
    author: &str,
    chapters: &[(String, String)],
    include_cover: bool,
) -> String {
    let mut content = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>{}</dc:title>
    <dc:creator opf:role="aut">{}</dc:creator>
    <dc:language>zh-TW</dc:language>
    <dc:identifier id="BookId" opf:scheme="UUID">{}</dc:identifier>
    <dc:publisher>創世紀元</dc:publisher>
{}  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
{}"#,
        xml_text(title),
        xml_text(author),
        uuid::Uuid::new_v4(),
        if include_cover { "    <meta name=\"cover\" content=\"cover\"/>\n" } else { "" },
        if include_cover { "    <item id=\"cover\" href=\"cover.xhtml\" media-type=\"application/xhtml+xml\"/>\n" } else { "" },
    );

    // 添加章節到 manifest
    for i in 0..chapters.len() {
        content.push_str(&format!(
            "    <item id=\"chapter{}\" href=\"chapter{}.xhtml\" media-type=\"application/xhtml+xml\"/>\n",
            i + 1, i + 1
        ));
    }

    content.push_str("  </manifest>\n  <spine toc=\"ncx\">\n");
    if include_cover {
        content.push_str("    <itemref idref=\"cover\"/>\n");
    }

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
    include_illustrations_page: bool,
    include_cover: bool,
) -> String {
    let mut content = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>{}</dc:title>
    <dc:creator opf:role="aut">{}</dc:creator>
    <dc:language>zh-TW</dc:language>
    <dc:identifier id="BookId" opf:scheme="UUID">{}</dc:identifier>
    <dc:publisher>創世紀元 AI 智能創作</dc:publisher>
{}  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
{}"#,
        xml_text(title),
        xml_text(author),
        uuid::Uuid::new_v4(),
        if include_cover { "    <meta name=\"cover\" content=\"cover\"/>\n" } else { "" },
        if include_cover { "    <item id=\"cover\" href=\"cover.xhtml\" media-type=\"application/xhtml+xml\"/>\n" } else { "" },
    );

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
        content.push_str(&format!(
            "    <item id=\"illustration{}\" href=\"images/{}\" media-type=\"{}\"/>\n",
            index + 1,
            filename,
            image_media_type(filename)
        ));
    }

    content.push_str("  </manifest>\n  <spine toc=\"ncx\">\n");
    if include_cover {
        content.push_str("    <itemref idref=\"cover\"/>\n");
    }

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
fn generate_toc_ncx(title: &str, chapters: &[(String, String)], include_cover: bool) -> String {
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
{}"#,
        uuid::Uuid::new_v4(),
        xml_text(title),
        if include_cover {
            "    <navPoint id=\"cover\" playOrder=\"1\">\n      <navLabel>\n        <text>封面</text>\n      </navLabel>\n      <content src=\"cover.xhtml\"/>\n    </navPoint>\n"
        } else {
            ""
        },
    );

    // 添加章節導航（playOrder 需連續，沒有封面時從 1 開始）
    let play_order_offset = if include_cover { 2 } else { 1 };
    for (i, (chapter_title, _)) in chapters.iter().enumerate() {
        content.push_str(&format!(
            "    <navPoint id=\"chapter{}\" playOrder=\"{}\">\n      <navLabel>\n        <text>{}</text>\n      </navLabel>\n      <content src=\"chapter{}.xhtml\"/>\n    </navPoint>\n",
            i + 1,
            i + play_order_offset,
            xml_text(chapter_title),
            i + 1
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
</html>"#, xml_text(title), xml_text(author))
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
</html>"#, xml_text(chapter_title), xml_text(chapter_title), chapter_content)
}
#[cfg(test)]
mod tests {
    use super::*;
    use quick_xml::events::Event;
    use quick_xml::Reader;
    use std::collections::HashSet;
    use std::path::PathBuf;

    /// 解析 OPF，回傳 (manifest 宣告的 id, spine 引用的 idref)
    ///
    /// 用真的 XML parser 而非字串比對：未跳脫的 `&` 讓整份 manifest 無法解析，
    /// 但字串檢查照樣通過——那正是這組測試要擋的失效模式。
    fn parse_opf(xml: &str) -> (HashSet<String>, Vec<String>) {
        let mut reader = Reader::from_str(xml);
        let mut manifest_ids = HashSet::new();
        let mut spine_idrefs = Vec::new();

        loop {
            match reader.read_event() {
                Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                    let name = e.name().as_ref().to_vec();
                    let attr_of = |key: &[u8]| -> Option<String> {
                        e.attributes().flatten().find_map(|a| {
                            (a.key.as_ref() == key)
                                .then(|| String::from_utf8_lossy(a.value.as_ref()).into_owned())
                        })
                    };

                    match name.as_slice() {
                        b"item" => {
                            if let Some(id) = attr_of(b"id") {
                                manifest_ids.insert(id);
                            }
                        }
                        b"itemref" => {
                            if let Some(idref) = attr_of(b"idref") {
                                spine_idrefs.push(idref);
                            }
                        }
                        _ => {}
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => panic!("OPF 不是合法 XML: {e}"),
                _ => {}
            }
        }

        (manifest_ids, spine_idrefs)
    }

    fn sample_chapters() -> Vec<(String, String)> {
        vec![
            ("第一章".to_string(), "<p>內文</p>".to_string()),
            ("第二章".to_string(), "<p>內文</p>".to_string()),
        ]
    }

    #[test]
    fn opf_stays_valid_xml_when_metadata_contains_markup_characters() {
        // 書名含 & 與角括號是實際會發生的事（「A & B <特別篇>」），
        // 裸插值會讓整份 OPF 無法解析，連帶整本書打不開
        let opf = generate_content_opf_with_illustrations(
            "貓 & 狗 <特別篇>",
            "作者 <匿名> & 友人",
            &sample_chapters(),
            &[],
            false,
            true,
        );

        // 解析失敗會直接 panic，這行本身就是斷言
        let (manifest_ids, _) = parse_opf(&opf);
        assert!(manifest_ids.contains("chapter1"));

        // 跳脫過的內容不該留下裸 & 或裸角括號在文字節點
        assert!(opf.contains("&amp;"), "& 應該被跳脫");
        assert!(opf.contains("&lt;"), "< 應該被跳脫");
    }

    #[test]
    fn every_spine_reference_is_declared_in_manifest() {
        let opf = generate_content_opf_with_illustrations(
            "書名",
            "作者",
            &sample_chapters(),
            &["illustration_001.png".to_string()],
            true,
            true,
        );

        let (manifest_ids, spine_idrefs) = parse_opf(&opf);

        assert!(!spine_idrefs.is_empty(), "spine 不應為空");
        for idref in &spine_idrefs {
            assert!(
                manifest_ids.contains(idref),
                "spine 引用了 manifest 未宣告的 {idref}"
            );
        }
        assert!(spine_idrefs.contains(&"illustrations".to_string()));
        assert!(spine_idrefs.contains(&"cover".to_string()));
    }

    #[test]
    fn illustrations_page_is_omitted_from_both_manifest_and_spine_when_there_are_no_images() {
        // 使用者勾了「附插畫集錦」但這本書一張插畫都沒有：
        // manifest 與 spine 的省略條件只要有一邊漏掉，spine 就會指向不存在的檔案
        let opf = generate_content_opf_with_illustrations(
            "書名",
            "作者",
            &sample_chapters(),
            &[],
            true,
            false,
        );

        let (manifest_ids, spine_idrefs) = parse_opf(&opf);

        assert!(!manifest_ids.contains("illustrations"));
        assert!(!spine_idrefs.contains(&"illustrations".to_string()));
        for idref in &spine_idrefs {
            assert!(
                manifest_ids.contains(idref),
                "spine 引用了 manifest 未宣告的 {idref}"
            );
        }
    }

    #[test]
    fn cover_is_omitted_from_both_manifest_and_spine_when_disabled() {
        let opf = generate_content_opf(&"書名", "作者", &sample_chapters(), false);
        let (manifest_ids, spine_idrefs) = parse_opf(&opf);

        assert!(!manifest_ids.contains("cover"));
        assert!(!spine_idrefs.contains(&"cover".to_string()));
    }

    #[test]
    fn manifest_href_matches_the_filename_written_into_the_zip() {
        // manifest 的 href 與實際寫入 ZIP 的名稱由同一個函式產生，
        // 這裡把兩邊都跑一次確認沒有分岔——分岔的 EPUB 會開起來缺圖
        let files: Vec<IllustrationFile> = vec![
            IllustrationFile {
                file_path: PathBuf::from("/tmp/圖 & 片.PNG"),
                filename: "圖 & 片.PNG".to_string(),
                character_names: Vec::new(),
                generation_time: None,
            },
            IllustrationFile {
                file_path: PathBuf::from("/tmp/b.webp"),
                filename: "b.webp".to_string(),
                character_names: Vec::new(),
                generation_time: None,
            },
        ];

        let names: Vec<String> = files
            .iter()
            .enumerate()
            .map(|(i, f)| epub_image_filename(f, i))
            .collect();

        assert_eq!(names, vec!["illustration_001.png", "illustration_002.webp"]);

        let opf = generate_content_opf_with_illustrations(
            "書名",
            "作者",
            &sample_chapters(),
            &names,
            true,
            false,
        );

        for name in &names {
            assert!(
                opf.contains(&format!("href=\"images/{name}\"")),
                "manifest 少了 {name}"
            );
        }
        assert!(opf.contains("media-type=\"image/png\""));
        assert!(opf.contains("media-type=\"image/webp\""));
    }

    #[test]
    fn export_name_only_accepts_images_recorded_for_this_project() {
        let allowed: HashSet<String> = ["mine.png".to_string(), "mine.jpg".to_string()]
            .into_iter()
            .collect();

        // 屬於本專案且格式受支援
        assert_eq!(
            illustration_export_name(&PathBuf::from("/imgs/mine.png"), &allowed),
            Some("mine.png".to_string())
        );

        // 同一個扁平目錄裡別的作品的插畫，絕不能夾帶進來
        assert_eq!(
            illustration_export_name(&PathBuf::from("/imgs/other-project.png"), &allowed),
            None
        );

        // 有記錄但不是支援的圖片格式
        let allowed_txt: HashSet<String> = ["notes.txt".to_string()].into_iter().collect();
        assert_eq!(
            illustration_export_name(&PathBuf::from("/imgs/notes.txt"), &allowed_txt),
            None
        );

        // 沒有副檔名
        assert_eq!(
            illustration_export_name(&PathBuf::from("/imgs/noext"), &allowed),
            None
        );
    }

    #[test]
    fn media_type_follows_the_extension() {
        assert_eq!(image_media_type("a.png"), "image/png");
        assert_eq!(image_media_type("a.PNG"), "image/png");
        assert_eq!(image_media_type("a.webp"), "image/webp");
        assert_eq!(image_media_type("a.jpg"), "image/jpeg");
        assert_eq!(image_media_type("a.jpeg"), "image/jpeg");
    }
}
