/// 儲存生成的圖像到本地（統一使用 PathManager 路徑策略）
pub fn save_generated_image(image_data: &[u8], image_id: &str) -> Result<String, Box<dyn std::error::Error>> {
    use std::fs;
    
    // === 舊邏輯（註解保留）===
    // let images_dir = dirs::data_dir()
    //     .ok_or("無法獲取用戶資料目錄")?
    //     .join("genesis-chronicle")
    //     .join("images");
    
    // === 新邏輯：使用 PathManager 統一路徑管理 ===
    let images_dir = crate::utils::PathManager::get_images_dir()?;
    // PathManager 已經處理目錄創建，無需重複調用
    
    // 生成檔案路徑
    let filename = format!("{}.jpg", image_id);
    let file_path = images_dir.join(&filename);
    
    // 寫入圖像數據
    fs::write(&file_path, image_data)?;
    
    Ok(file_path.to_string_lossy().to_string())
}