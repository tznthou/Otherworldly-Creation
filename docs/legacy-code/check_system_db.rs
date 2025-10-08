use std::path::PathBuf;

fn main() {
    // 模擬生產環境的資料庫路徑檢查
    if let Some(data_dir) = dirs::data_dir() {
        let app_dir = data_dir.join("genesis-chronicle");
        let db_path = app_dir.join("genesis-chronicle.db");
        
        println\!("預期的生產資料庫路徑: {:?}", db_path);
        println\!("檔案是否存在: {}", db_path.exists());
        
        if db_path.exists() {
            if let Ok(metadata) = std::fs::metadata(&db_path) {
                println\!("檔案大小: {} bytes", metadata.len());
                println\!("修改時間: {:?}", metadata.modified().unwrap());
            }
        }
    }
}
EOF < /dev/null