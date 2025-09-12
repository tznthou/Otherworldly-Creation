/// 儲存生成的圖像到本地（統一使用 PathManager 路徑策略）
pub fn save_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs;
    
    // === 舊邏輯（註解保留）===
    // let images_dir = dirs::data_dir()
    //     .ok_or("無法獲取用戶資料目錄")?
    //     .join("genesis-chronicle")
    //     .join("images");
    
    // === 新邏輯：使用 path_utils 統一路徑管理 ===
    let images_dir = crate::utils::path_utils::get_images_base_dir()?;
    
    // 確保目錄存在
    fs::create_dir_all(&images_dir)?;
    
    // 生成檔案路徑
    let filename = format!("{}.jpg", image_id);
    let file_path = images_dir.join(&filename);
    
    // 寫入圖像數據
    fs::write(&file_path, image_data)?;
    
    // 返回資料庫儲存用的相對路徑格式
    Ok(crate::utils::path_utils::to_relative_path(&file_path, image_id))
}