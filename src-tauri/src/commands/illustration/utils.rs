/// 儲存生成的圖像到本地
pub fn save_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs;
    
    // 確保圖像目錄存在（使用與EPUB/PDF相同的路徑）
    let images_dir = dirs::home_dir()
        .ok_or("無法獲取用戶目錄")?
        .join("Library")
        .join("Application Support")
        .join("genesis-chronicle")
        .join("generated-images");
    
    fs::create_dir_all(&images_dir)?;
    
    // 生成檔案路徑
    let filename = format!("{}.jpg", image_id);
    let file_path = images_dir.join(&filename);
    
    // 寫入圖像數據
    fs::write(&file_path, image_data)?;
    
    Ok(file_path.to_string_lossy().to_string())
}