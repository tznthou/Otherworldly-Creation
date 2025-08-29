/// 儲存生成的圖像到本地（統一使用與資料庫相同的路徑策略）
pub fn save_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs;
    
    // 使用與資料庫相同的路徑策略
    let images_dir = dirs::data_dir()
        .ok_or("無法獲取用戶資料目錄")?
        .join("genesis-chronicle")
        .join("images");
    
    fs::create_dir_all(&images_dir)?;
    
    // 生成檔案路徑
    let filename = format!("{}.jpg", image_id);
    let file_path = images_dir.join(&filename);
    
    // 寫入圖像數據
    fs::write(&file_path, image_data)?;
    
    Ok(file_path.to_string_lossy().to_string())
}