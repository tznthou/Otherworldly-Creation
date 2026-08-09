use crate::database::{get_db, models::*};
use serde::{Deserialize, Serialize};
use std::io::Write;
use zip::{ZipWriter, CompressionMethod};
use tempfile::NamedTempFile;
use std::path::PathBuf;

/// 內嵌字型：Noto Serif TC 的 Big5 全集子集，已 instancing 至 wght=400。
///
/// 由 `scripts/subset-epub-font.py` 產生，換字型或改字集範圍時重跑該腳本。
/// 來源為可變字型且 wght 軸預設值是 200（ExtraLight），不 instancing 會得到
/// 極細字重；腳本的驗收斷言擋著這件事。
const EMBEDDED_FONT: &[u8] = include_bytes!("../../assets/fonts/GenesisSerifTC-Regular.ttf");

/// SIL Open Font License 1.1 全文。
///
/// OFL 條款 2) 要求每份散布副本都附上授權，故 EPUB 內另外打包一份。
const EMBEDDED_FONT_LICENSE: &[u8] = include_bytes!("../../assets/fonts/OFL.txt");

/// 內嵌字型的家族名，必須與 `generate_epub_css` 的 `@font-face` 及子集化腳本
/// 的 `--family` 三處一致。子集版只含 Big5，改名是為了不與使用者系統上的
/// 同名完整版字型互搶。
const EMBEDDED_FONT_FAMILY: &str = "Genesis Serif TC";

/// EPUB 內的字型路徑，相對於 OEBPS/。同時用於 ZIP entry 與 manifest href，
/// 兩邊共用同一個常數，避免出現宣告與實體對不上的情形。
const EMBEDDED_FONT_HREF: &str = "fonts/GenesisSerifTC-Regular.ttf";
const EMBEDDED_FONT_LICENSE_HREF: &str = "fonts/OFL.txt";

/// EPUB 2 的 OPF 對字型沿用 `application/vnd.ms-opentype`。
///
/// 本專案產出的是 `<package version="2.0">` 搭 toc.ncx，不是 EPUB 3，
/// 所以不用 EPUB 3 才定義的 `font/ttf`。
const FONT_MEDIA_TYPE: &str = "application/vnd.ms-opentype";

/// EPUB 產生選項。
///
/// 整個 struct 標 `#[serde(default)]`：前端送來的形狀不只一種，缺欄位就整個
/// 反序列化失敗、連帶匯出功能全壞。`api/tauri.ts` 的 fallback 只送
/// `include_cover` / `font_family` / `chapter_break_style` 三個欄位，
/// `epubService.ts` 送七個，兩邊都少於這裡的欄位數。缺的部分一律取
/// `Default` 的值，與下方 `impl Default` 是同一份定義。
#[derive(Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct EPubGenerationOptions {
    pub include_cover: bool,
    pub custom_css: Option<String>,
    pub font_family: String,
    pub chapter_break_style: String,
    pub author: Option<String>,
    /// 是否把內文字型嵌進 EPUB
    pub embed_font: bool,
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
            embed_font: true,
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

/// 把 EPUB 的完整內容寫進任意 ZIP 目標。
///
/// 與 `generate_epub_file` 分開的理由是可測性：後者要決定下載目錄並把成品
/// 落到磁碟，測試一呼叫就會寫進使用者真正的下載資料夾。組裝邏輯獨立出來後，
/// 測試能寫進記憶體緩衝區，manifest 宣告與 ZIP 實際內容之間的落差才驗得到——
/// 這裡有兩份幾乎重複的 content.opf，正是最容易漏改一處的地方。
///
/// 插畫掃描留在呼叫端：它要讀資料庫與磁碟，留在這裡會讓整個組裝流程無法測試。
fn write_epub_archive<W: Write + std::io::Seek>(
    zip: &mut ZipWriter<W>,
    title: &str,
    author: &str,
    chapters: &[(String, String)],
    options: &EPubGenerationOptions,
    scanned_illustrations: &[IllustrationFile],
    illustration_files: &[String],
) -> Result<(), String> {
    let has_illustrations_page = !illustration_files.is_empty();

    
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
    
    // 4. 添加 OEBPS/content.opf（根據是否包含插畫選擇不同版本）
    zip.start_file("OEBPS/content.opf", options_zip)
        .map_err(|e| format!("建立 content.opf 失敗: {}", e))?;

    let content_opf = if has_illustrations_page {
        generate_content_opf_with_illustrations(
            title,
            author,
            chapters,
            illustration_files,
            true,
            options.include_cover,
            options.embed_font,
        )
    } else {
        generate_content_opf(
            title,
            author,
            chapters,
            options.include_cover,
            options.embed_font,
        )
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

    // 5.1 內嵌字型與其授權條款
    //
    // 路徑與 manifest 共用 EMBEDDED_FONT_HREF，兩邊不會各寫各的。
    // OFL 條款 2) 要求每份散布副本都附授權，故 OFL.txt 一起打包。
    if options.embed_font {
        let font_path = format!("OEBPS/{}", EMBEDDED_FONT_HREF);
        zip.start_file(&font_path, options_zip)
            .map_err(|e| format!("建立內嵌字型失敗: {}", e))?;
        zip.write_all(EMBEDDED_FONT)
            .map_err(|e| format!("寫入內嵌字型失敗: {}", e))?;

        let license_path = format!("OEBPS/{}", EMBEDDED_FONT_LICENSE_HREF);
        zip.start_file(&license_path, options_zip)
            .map_err(|e| format!("建立字型授權檔失敗: {}", e))?;
        zip.write_all(EMBEDDED_FONT_LICENSE)
            .map_err(|e| format!("寫入字型授權檔失敗: {}", e))?;

        log::info!(
            "已內嵌字型 {} ({} 位元組)",
            EMBEDDED_FONT_FAMILY,
            EMBEDDED_FONT.len()
        );
    }

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
        let _added_files = add_illustrations_to_epub(zip, scanned_illustrations)?;

        // 內嵌與章節開頭模式尚未實作，一律回退為集錦模式
        if !matches!(options.illustration_layout.as_str(), "gallery") {
            log::info!(
                "插畫佈局模式 {} 尚未實作，改用集錦模式",
                options.illustration_layout
            );
        }

        zip.start_file("OEBPS/illustrations.xhtml", options_zip)
            .map_err(|e| format!("建立插畫集錦頁面失敗: {}", e))?;
        let gallery_html = generate_illustrations_gallery_xhtml(illustration_files);
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

    Ok(())
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

    // 預處理 AI 插畫（掃描檔案但先不加入 ZIP）
    //
    // 只掃描一次並保留結果：過去在這裡與實際寫入時各掃一次，兩次之間若有圖片
    // 新增或刪除，manifest 宣告的檔名就會與 ZIP 內容對不上。
    let mut illustration_files = Vec::new();
    let mut scanned_illustrations: Vec<IllustrationFile> = Vec::new();
    if options.include_illustrations {
        log::info!("開始掃描 AI 插畫檔案...");
        let illustrations = scan_project_illustrations(project_id)?;
        if !illustrations.is_empty() {
            for (index, illustration) in illustrations.iter().enumerate() {
                illustration_files.push(epub_image_filename(illustration, index));
            }
            scanned_illustrations = illustrations;
            log::info!("預計包含 {} 張插畫", illustration_files.len());
        }
    }

    let mut zip = ZipWriter::new(temp_file.as_file());
    write_epub_archive(
        &mut zip,
        title,
        author,
        chapters,
        options,
        &scanned_illustrations,
        &illustration_files,
    )?;

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
/// 產生內嵌字型的 manifest item。
///
/// 底下兩份 content.opf 是幾乎重複的實作，加資源就得記得改兩處，漏一處
/// EPUB 打不開。這裡把字型宣告收成單一來源，兩邊各自呼叫，讓「宣告內容」
/// 至少只有一份定義；「兩邊都確實呼叫到」則由 manifest ↔ ZIP 的雙向斷言守著。
fn font_manifest_items(embed_font: bool) -> String {
    if !embed_font {
        return String::new();
    }

    format!(
        "    <item id=\"embedded-font\" href=\"{}\" media-type=\"{}\"/>\n    <item id=\"embedded-font-license\" href=\"{}\" media-type=\"text/plain\"/>\n",
        EMBEDDED_FONT_HREF, FONT_MEDIA_TYPE, EMBEDDED_FONT_LICENSE_HREF,
    )
}

fn generate_content_opf(
    title: &str,
    author: &str,
    chapters: &[(String, String)],
    include_cover: bool,
    embed_font: bool,
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

    content.push_str(&font_manifest_items(embed_font));

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
    embed_font: bool,
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

    content.push_str(&font_manifest_items(embed_font));

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
    // 內嵌字型排在堆疊最前面，其後保留原本的 fallback 鏈：閱讀器不支援
    // 內嵌字型（或使用者關掉發布者字型）時仍走既有設定，不會直接掉到泛型 serif。
    // 子集只涵蓋 Big5，落在字集外的字元也是由後面這幾層接住。
    let (font_face, font_stack) = if options.embed_font {
        (
            format!(
                "@font-face {{\n    \
                 font-family: \"{family}\";\n    \
                 src: url(\"{href}\");\n    \
                 font-weight: normal;\n    \
                 font-style: normal;\n\
                 }}\n\n",
                family = EMBEDDED_FONT_FAMILY,
                href = EMBEDDED_FONT_HREF,
            ),
            format!(r#""{}", "{}""#, EMBEDDED_FONT_FAMILY, options.font_family),
        )
    } else {
        (String::new(), format!(r#""{}""#, options.font_family))
    };

    format!(r#"/* 創世紀元 EPUB 樣式 */

{}body {{
    font-family: {}, "Microsoft JhengHei", "PingFang TC", serif;
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
    font_face,
    font_stack,
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
    use std::io::{Cursor, Read};
    use std::path::PathBuf;
    use zip::ZipArchive;

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
            false,
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
            false,
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
        let opf = generate_content_opf(&"書名", "作者", &sample_chapters(), false, false);
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

    // === 內嵌字型 ===

    #[test]
    fn every_options_shape_the_frontend_sends_deserializes() {
        // 前端有兩個呼叫點，送出的形狀不同，兩邊的欄位數都少於 struct。
        // 任何一種反序列化失敗，該路徑的 EPUB 匯出就整個壞掉而且無從察覺——
        // 只驗其中一種形狀會漏掉另一條路徑。

        // 形狀一：epubService.ts 組出的七個欄位，沒有 embed_font
        let from_service = r#"{
            "include_cover": true,
            "font_family": "Noto Sans TC",
            "chapter_break_style": "page-break",
            "custom_css": "body { margin: 0; }",
            "include_illustrations": true,
            "illustration_layout": "gallery",
            "illustration_quality": "original"
        }"#;

        let options: EPubGenerationOptions =
            serde_json::from_str(from_service).expect("epubService.ts 的形狀必須能反序列化");
        assert!(
            options.embed_font,
            "欄位缺席時應預設開啟內嵌，否則新功能對現有前端形同不存在"
        );
        // 確認不是整個 struct 都走了預設值——那樣上面那條斷言就沒有意義
        assert_eq!(options.font_family, "Noto Sans TC");
        assert!(options.include_illustrations);

        // 形狀二：api/tauri.ts 在呼叫端沒給 options 時使用的 fallback，只有三個欄位。
        // 三個插畫欄位都不在裡面，少了 struct 層級的 serde default 這條路徑會直接失敗。
        let fallback = r#"{
            "include_cover": true,
            "font_family": "Noto Sans TC",
            "chapter_break_style": "page-break"
        }"#;

        let options: EPubGenerationOptions =
            serde_json::from_str(fallback).expect("tauri.ts 的 fallback 形狀必須能反序列化");
        assert!(options.embed_font);
        assert_eq!(
            options.illustration_layout, "gallery",
            "缺席欄位要取 Default 的值"
        );
        assert_eq!(
            options.chapter_break_style, "page-break",
            "有給的欄位不能被預設值蓋掉"
        );
    }

    /// 解析 manifest 宣告的所有 href
    ///
    /// 與 `parse_opf` 分工不同：那個看 id 與 spine 的對應關係，這個取出資源
    /// 路徑，用來跟 ZIP 的實際內容對帳。
    fn parse_manifest_hrefs(xml: &str) -> HashSet<String> {
        let mut reader = Reader::from_str(xml);
        let mut hrefs = HashSet::new();

        loop {
            match reader.read_event() {
                Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                    if e.name().as_ref() == b"item" {
                        let href = e.attributes().flatten().find_map(|a| {
                            (a.key.as_ref() == b"href")
                                .then(|| String::from_utf8_lossy(a.value.as_ref()).into_owned())
                        });
                        if let Some(href) = href {
                            hrefs.insert(href);
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => panic!("OPF 不是合法 XML: {e}"),
                _ => {}
            }
        }

        hrefs
    }

    fn read_zip_entry<R: std::io::Read + std::io::Seek>(
        archive: &mut ZipArchive<R>,
        name: &str,
    ) -> String {
        let mut entry = archive
            .by_name(name)
            .unwrap_or_else(|_| panic!("ZIP 內找不到 {name}"));
        let mut contents = String::new();
        entry
            .read_to_string(&mut contents)
            .unwrap_or_else(|e| panic!("讀取 {name} 失敗: {e}"));
        contents
    }

    struct BuiltEpub {
        file_names: Vec<String>,
        content_opf: String,
        styles_css: String,
    }

    /// 在記憶體裡組一份 EPUB
    ///
    /// 走的是正式匯出用的同一個組裝函式，但不碰下載目錄：直接呼叫
    /// `generate_epub_file` 會把測試產物寫進使用者真正的下載資料夾。
    fn build_epub_in_memory(options: &EPubGenerationOptions) -> BuiltEpub {
        let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
        write_epub_archive(
            &mut zip,
            "書名",
            "作者",
            &sample_chapters(),
            options,
            &[],
            &[],
        )
        .expect("EPUB 組裝失敗");
        let cursor = zip.finish().expect("ZIP 收尾失敗");

        let mut archive = ZipArchive::new(cursor).expect("產出的不是合法 ZIP");
        let file_names: Vec<String> = archive.file_names().map(str::to_string).collect();
        let content_opf = read_zip_entry(&mut archive, "OEBPS/content.opf");
        let styles_css = read_zip_entry(&mut archive, "OEBPS/styles.css");

        BuiltEpub {
            file_names,
            content_opf,
            styles_css,
        }
    }

    fn embedded_font_options() -> EPubGenerationOptions {
        EPubGenerationOptions {
            embed_font: true,
            include_illustrations: false,
            ..Default::default()
        }
    }

    #[test]
    fn manifest_and_zip_agree_in_both_directions() {
        let epub = build_epub_in_memory(&embedded_font_options());
        let hrefs = parse_manifest_hrefs(&epub.content_opf);

        // 方向一：ZIP 裡的資源都要有人宣告。沒宣告的資源部分閱讀器直接忽略，
        // 字型就這麼靜靜地不生效，而檔案本身明明在。
        for name in &epub.file_names {
            let relative = match name.strip_prefix("OEBPS/") {
                Some(rest) => rest,
                None => continue,
            };
            if relative == "content.opf" {
                continue; // OPF 不列進自己的 manifest
            }
            assert!(
                hrefs.contains(relative),
                "ZIP 內的 {name} 沒有在 manifest 宣告"
            );
        }

        // 方向二：宣告了卻沒打包進去，嚴格的閱讀器會拒開整本書
        for href in &hrefs {
            assert!(
                epub.file_names.contains(&format!("OEBPS/{href}")),
                "manifest 宣告了 {href}，ZIP 內卻找不到"
            );
        }

        // 上面兩個迴圈在集合為空時同樣會通過，補一組正面斷言確認真的驗到字型
        assert!(
            hrefs.contains(EMBEDDED_FONT_HREF),
            "manifest 應宣告內嵌字型"
        );
        assert!(epub
            .file_names
            .contains(&format!("OEBPS/{EMBEDDED_FONT_HREF}")));
    }

    #[test]
    fn both_content_opf_variants_declare_the_embedded_font() {
        // 兩份 content.opf 是幾乎重複的實作，只改一處另一處就會宣告不足。
        // 這是本次改動最容易出錯的地方，兩份都要驗。
        let without_illustrations =
            generate_content_opf("書名", "作者", &sample_chapters(), true, true);
        let with_illustrations = generate_content_opf_with_illustrations(
            "書名",
            "作者",
            &sample_chapters(),
            &["illustration_001.png".to_string()],
            true,
            true,
            true,
        );

        for (label, opf) in [
            ("無插畫版", without_illustrations),
            ("插畫版", with_illustrations),
        ] {
            let hrefs = parse_manifest_hrefs(&opf);
            assert!(
                hrefs.contains(EMBEDDED_FONT_HREF),
                "{label}的 manifest 沒宣告字型"
            );
            assert!(
                hrefs.contains(EMBEDDED_FONT_LICENSE_HREF),
                "{label}的 manifest 沒宣告字型授權"
            );
        }
    }

    #[test]
    fn embedded_font_leaves_no_trace_when_disabled() {
        let options = EPubGenerationOptions {
            embed_font: false,
            include_illustrations: false,
            ..Default::default()
        };
        let epub = build_epub_in_memory(&options);

        assert!(
            !epub
                .file_names
                .iter()
                .any(|name| name.starts_with("OEBPS/fonts/")),
            "關閉內嵌時不該有 fonts/ 目錄，實際內容：{:?}",
            epub.file_names
        );
        assert!(
            !epub.content_opf.contains(EMBEDDED_FONT_HREF),
            "關閉內嵌時 manifest 不該宣告字型"
        );
        assert!(
            !epub.styles_css.contains("@font-face"),
            "關閉內嵌時 CSS 不該有 @font-face"
        );

        // 純負面斷言在「整個功能根本沒實作」時也會通過，故確認正常內容仍在
        assert!(
            epub.styles_css.contains("font-family:"),
            "關閉內嵌只是不嵌字型，字型堆疊本身仍該存在"
        );
        assert!(epub.file_names.contains(&"OEBPS/styles.css".to_string()));
    }

    #[test]
    fn css_font_face_points_at_the_path_actually_written_into_the_zip() {
        // url() 相對於 styles.css 所在的 OEBPS/。指錯路徑時閱讀器會靜默回退到
        // 系統字型，而 manifest 與 ZIP 的結構檢查全部照樣通過。
        let epub = build_epub_in_memory(&embedded_font_options());

        assert!(
            epub.styles_css
                .contains(&format!("src: url(\"{EMBEDDED_FONT_HREF}\")")),
            "@font-face 應指向 {EMBEDDED_FONT_HREF}，實際 CSS：{}",
            epub.styles_css
        );
        assert!(
            epub.styles_css
                .contains(&format!("font-family: \"{EMBEDDED_FONT_FAMILY}\"")),
            "@font-face 與內文堆疊必須用同一個家族名，否則宣告了也不會被選用"
        );
        assert!(
            epub.file_names
                .contains(&format!("OEBPS/{EMBEDDED_FONT_HREF}")),
            "CSS 指到的檔案必須真的在 ZIP 內"
        );
    }

    #[test]
    fn epub_ships_the_font_license_next_to_the_font() {
        // OFL 條款 2)：每份散布副本都要附上授權，缺了授權即失效
        let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
        write_epub_archive(
            &mut zip,
            "書名",
            "作者",
            &sample_chapters(),
            &embedded_font_options(),
            &[],
            &[],
        )
        .expect("EPUB 組裝失敗");
        let cursor = zip.finish().expect("ZIP 收尾失敗");
        let mut archive = ZipArchive::new(cursor).expect("產出的不是合法 ZIP");

        let license = read_zip_entry(&mut archive, &format!("OEBPS/{EMBEDDED_FONT_LICENSE_HREF}"));
        assert!(
            license.contains("SIL OPEN FONT LICENSE"),
            "打包的應是 OFL 全文"
        );
        assert!(license.contains("Copyright"), "授權檔應含版權聲明");
    }

    /// 產生兩份真的 EPUB，供人眼在實際閱讀器上比對
    ///
    /// 上面幾個測試驗的都是結構：manifest 宣告齊全、檔案確實在 ZIP 內、CSS 指對
    /// 路徑。但結構全對，閱讀器依然可能不採用內嵌字型——Kindle 的「發布者字型」
    /// 開關、轉檔時替換字型都會造成這種結果。那件事只有打開來看才知道。
    ///
    /// 預設不執行（產物是給人看的，不是斷言）：
    ///     cargo test --manifest-path src-tauri/Cargo.toml -- --ignored --nocapture font_sample
    ///
    /// 判讀：內嵌生效時內文是明體（襯線、橫細豎粗）；沒生效會落到 fallback 鏈
    /// 尾端的系統字型，macOS 上是 PingFang TC 黑體，兩者一眼可辨。plain 那份
    /// 就是「沒生效」長什麼樣的對照組。
    #[test]
    #[ignore]
    fn font_sample_epubs_for_manual_reader_check() {
        let chapters = vec![(
            "第一章　內嵌字型驗證".to_string(),
            concat!(
                "<p>這一段用來確認閱讀器有沒有採用內嵌字型。明體的橫畫細、豎畫粗，",
                "筆畫收尾帶三角形襯線；黑體粗細一致而且沒有襯線，兩者一眼可辨。</p>",
                "<p>標點的形狀也會跟著變，這裡放常見的：，。！？「」《》（）——。</p>",
                "<p>Big5 字集內的罕用字：魑魅魍魎、饕餮、鬱、黌、纛、龘。",
                "這些字應該與前面的內文是同一套字型。</p>",
                "<p>Big5 字集外的字：鱻、靐、飝。這三個不在子集裡，會落到系統字型，",
                "跟上一行看起來不一樣才是正常的。</p>",
            )
            .to_string(),
        )];

        let out_dir = std::env::temp_dir().join("genesis-font-check");
        std::fs::create_dir_all(&out_dir).expect("建立輸出目錄失敗");

        for (label, embed_font) in [("embedded", true), ("plain", false)] {
            let options = EPubGenerationOptions {
                embed_font,
                include_illustrations: false,
                ..Default::default()
            };

            let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
            write_epub_archive(
                &mut zip,
                "內嵌字型驗證",
                "創世紀元",
                &chapters,
                &options,
                &[],
                &[],
            )
            .expect("EPUB 組裝失敗");
            let cursor = zip.finish().expect("ZIP 收尾失敗");

            let path = out_dir.join(format!("font-check-{label}.epub"));
            std::fs::write(&path, cursor.into_inner()).expect("寫入 EPUB 失敗");
            println!("{label}: {}", path.display());
        }
    }
}
