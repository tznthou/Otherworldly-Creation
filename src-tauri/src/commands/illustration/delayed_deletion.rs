use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use std::thread;
use std::path::{Path, PathBuf};
use std::fs;
use serde_json::Value;
use crate::database::connection::create_connection;

/// 延遲刪除任務
#[derive(Debug, Clone)]
pub struct DeletionTask {
    pub id: String,
    pub file_path: PathBuf,
    pub database_id: String,
    pub created_at: u64,
    pub delay_ms: u64,
    pub retry_count: u8,
    pub reason: Option<String>,
}

/// 延遲刪除隊列管理器
/// 
/// 核心機制：防止WebView正在渲染圖片時刪除檔案導致崩潰
#[derive(Debug)]
pub struct DelayedDeletionQueue {
    tasks: Arc<Mutex<HashMap<String, DeletionTask>>>,
    running: Arc<Mutex<bool>>,
}

impl DelayedDeletionQueue {
    /// 創建新的延遲刪除隊列
    pub fn new() -> Self {
        let queue = Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
            running: Arc::new(Mutex::new(false)),
        };
        
        // 啟動後台處理執行緒
        queue.start_background_processor();
        queue
    }
    
    /// 排程延遲刪除任務
    /// 
    /// # 參數
    /// - `file_path`: 要刪除的檔案路徑
    /// - `database_id`: 資料庫記錄ID
    /// - `delay_ms`: 延遲時間（毫秒）
    /// - `reason`: 刪除原因（可選）
    #[allow(dead_code)]
    pub fn schedule_deletion(
        &self,
        file_path: PathBuf,
        database_id: String,
        delay_ms: u64,
        reason: Option<String>,
    ) -> Result<String, String> {
        let task_id = format!("del_{}", 
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis()
        );
        
        let task = DeletionTask {
            id: task_id.clone(),
            file_path: file_path.clone(),
            database_id,
            created_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            delay_ms,
            retry_count: 0,
            reason,
        };
        
        // 寫入預刪除標記檔案
        self.write_deletion_marker(&task)?;
        
        // 加入隊列
        {
            let mut tasks = self.tasks.lock().unwrap();
            tasks.insert(task_id.clone(), task);
        }
        
        log::info!("[DelayedDeletion] 排程刪除任務: {} -> {:?} (延遲{}ms)", 
            task_id, file_path, delay_ms);
        
        Ok(task_id)
    }
    
    /// 取消延遲刪除任務
    #[allow(dead_code)]
    pub fn cancel_deletion(&self, task_id: &str) -> Result<bool, String> {
        let mut tasks = self.tasks.lock().unwrap();
        if let Some(task) = tasks.remove(task_id) {
            // 移除預刪除標記檔案
            self.remove_deletion_marker(&task).ok();
            log::info!("[DelayedDeletion] 取消刪除任務: {}", task_id);
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    /// 立即執行指定的刪除任務
    #[allow(dead_code)]
    pub fn execute_now(&self, task_id: &str) -> Result<bool, String> {
        let task = {
            let tasks = self.tasks.lock().unwrap();
            tasks.get(task_id).cloned()
        };
        
        if let Some(task) = task {
            self.execute_deletion_task(&task)
        } else {
            Err("任務不存在".to_string())
        }
    }
    
    /// 啟動後台處理執行緒
    fn start_background_processor(&self) {
        let tasks = Arc::clone(&self.tasks);
        let running = Arc::clone(&self.running);
        
        // 標記為運行中
        {
            let mut is_running = running.lock().unwrap();
            *is_running = true;
        }
        
        thread::spawn(move || {
            log::info!("[DelayedDeletion] 後台處理執行緒啟動");
            
            loop {
                // 檢查是否應該停止
                {
                    let is_running = running.lock().unwrap();
                    if !*is_running {
                        log::info!("[DelayedDeletion] 後台處理執行緒停止");
                        break;
                    }
                }
                
                // 處理到期的任務
                let ready_tasks = {
                    let mut tasks_guard = tasks.lock().unwrap();
                    let current_time = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64;
                    
                    let mut ready = Vec::new();
                    let mut to_remove = Vec::new();
                    
                    for (task_id, task) in tasks_guard.iter() {
                        if current_time >= task.created_at + task.delay_ms {
                            ready.push(task.clone());
                            to_remove.push(task_id.clone());
                        }
                    }
                    
                    // 移除已準備執行的任務
                    for task_id in to_remove {
                        tasks_guard.remove(&task_id);
                    }
                    
                    ready
                };
                
                // 執行到期的任務
                for task in ready_tasks {
                    if let Err(e) = Self::execute_deletion_task_static(&task) {
                        log::error!("[DelayedDeletion] 執行刪除任務失敗 {}: {}", task.id, e);
                        
                        // 重試機制
                        if task.retry_count < 3 {
                            let mut retry_task = task.clone();
                            retry_task.retry_count += 1;
                            retry_task.created_at = SystemTime::now()
                                .duration_since(UNIX_EPOCH)
                                .unwrap()
                                .as_millis() as u64;
                            retry_task.delay_ms = 5000; // 重試間隔5秒
                            
                            let mut tasks_guard = tasks.lock().unwrap();
                            tasks_guard.insert(retry_task.id.clone(), retry_task);
                            
                            log::info!("[DelayedDeletion] 排程重試任務: {} (第{}次)", 
                                task.id, task.retry_count + 1);
                        } else {
                            log::error!("[DelayedDeletion] 任務重試次數超限，放棄: {}", task.id);
                        }
                    }
                }
                
                // 等待1秒後檢查下一批任務
                thread::sleep(Duration::from_millis(1000));
            }
        });
    }
    
    /// 執行刪除任務
    fn execute_deletion_task(&self, task: &DeletionTask) -> Result<bool, String> {
        Self::execute_deletion_task_static(task)
    }
    
    /// 靜態方法執行刪除任務
    fn execute_deletion_task_static(task: &DeletionTask) -> Result<bool, String> {
        log::info!("[DelayedDeletion] 開始執行刪除任務: {} -> {:?}", 
            task.id, task.file_path);
        
        // 1. 安全檢查：確保檔案存在
        if !task.file_path.exists() {
            log::warn!("[DelayedDeletion] 檔案已不存在: {:?}", task.file_path);
            // 清理資料庫記錄
            Self::cleanup_database_record(&task.database_id)?;
            return Ok(true);
        }
        
        // 2. 檢查檔案是否被其他進程使用
        if Self::is_file_locked(&task.file_path) {
            return Err("檔案被鎖定，無法刪除".to_string());
        }
        
        // 3. 執行實際刪除
        match fs::remove_file(&task.file_path) {
            Ok(_) => {
                log::info!("[DelayedDeletion] 檔案刪除成功: {:?}", task.file_path);
                
                // 4. 更新資料庫記錄
                Self::cleanup_database_record(&task.database_id)?;
                
                // 5. 移除預刪除標記檔案
                Self::remove_deletion_marker_static(task).ok();
                
                Ok(true)
            }
            Err(e) => {
                log::error!("[DelayedDeletion] 檔案刪除失敗: {:?} - {}", task.file_path, e);
                Err(format!("檔案刪除失敗: {}", e))
            }
        }
    }
    
    /// 檢查檔案是否被鎖定
    fn is_file_locked(file_path: &Path) -> bool {
        // 嘗試以獨佔模式打開檔案
        match std::fs::OpenOptions::new()
            .write(true)
            .open(file_path)
        {
            Ok(_) => false, // 成功打開，沒被鎖定
            Err(_) => true,  // 無法打開，可能被鎖定
        }
    }
    
    /// 清理資料庫記錄
    fn cleanup_database_record(database_id: &str) -> Result<(), String> {
        let conn = create_connection()
            .map_err(|e| format!("資料庫連接失敗: {}", e))?;
        
        conn.execute(
            "UPDATE pollinations_generations SET deleted_at = datetime('now') WHERE id = ?",
            [database_id]
        ).map_err(|e| format!("更新資料庫失敗: {}", e))?;
        
        log::info!("[DelayedDeletion] 資料庫記錄已標記為刪除: {}", database_id);
        Ok(())
    }
    
    /// 寫入預刪除標記檔案
    fn write_deletion_marker(&self, task: &DeletionTask) -> Result<(), String> {
        let marker_path = format!("{}.deletion_pending", task.file_path.to_string_lossy());
        let marker_content = serde_json::json!({
            "task_id": task.id,
            "database_id": task.database_id,
            "original_path": task.file_path,
            "created_at": task.created_at,
            "reason": task.reason
        });
        
        fs::write(&marker_path, marker_content.to_string())
            .map_err(|e| format!("寫入預刪除標記失敗: {}", e))?;
        
        log::debug!("[DelayedDeletion] 預刪除標記已寫入: {}", marker_path);
        Ok(())
    }
    
    /// 移除預刪除標記檔案
    fn remove_deletion_marker(&self, task: &DeletionTask) -> Result<(), String> {
        Self::remove_deletion_marker_static(task)
    }
    
    /// 靜態方法移除預刪除標記檔案
    fn remove_deletion_marker_static(task: &DeletionTask) -> Result<(), String> {
        let marker_path = format!("{}.deletion_pending", task.file_path.to_string_lossy());
        if Path::new(&marker_path).exists() {
            fs::remove_file(&marker_path)
                .map_err(|e| format!("移除預刪除標記失敗: {}", e))?;
            log::debug!("[DelayedDeletion] 預刪除標記已移除: {}", marker_path);
        }
        Ok(())
    }
    
    /// 獲取隊列狀態
    #[allow(dead_code)]
    pub fn get_queue_status(&self) -> Result<Value, String> {
        let tasks = self.tasks.lock().unwrap();
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        let pending_tasks: Vec<_> = tasks.values().map(|task| {
            let remaining_time = if current_time >= task.created_at + task.delay_ms {
                0
            } else {
                task.created_at + task.delay_ms - current_time
            };
            
            serde_json::json!({
                "id": task.id,
                "file_path": task.file_path,
                "database_id": task.database_id,
                "remaining_ms": remaining_time,
                "retry_count": task.retry_count,
                "reason": task.reason
            })
        }).collect();
        
        Ok(serde_json::json!({
            "queue_size": tasks.len(),
            "pending_tasks": pending_tasks
        }))
    }
    
    /// 停止隊列處理
    #[allow(dead_code)]
    pub fn stop(&self) {
        let mut running = self.running.lock().unwrap();
        *running = false;
        log::info!("[DelayedDeletion] 延遲刪除隊列已停止");
    }
}

/// 全局延遲刪除隊列實例
static GLOBAL_DELETION_QUEUE: OnceLock<DelayedDeletionQueue> = OnceLock::new();

/// 獲取全局延遲刪除隊列
pub fn get_deletion_queue() -> &'static DelayedDeletionQueue {
    GLOBAL_DELETION_QUEUE.get_or_init(|| DelayedDeletionQueue::new())
}

/// Tauri命令：排程延遲刪除
#[tauri::command]
#[allow(non_snake_case)]
pub async fn schedule_delayed_deletion(
    filePath: String,
    databaseId: String,
    delayMs: Option<u64>,
    reason: Option<String>,
) -> Result<Value, String> {
    let delay = delayMs.unwrap_or(500); // 預設延遲500ms
    let queue = get_deletion_queue();
    
    let task_id = queue.schedule_deletion(
        PathBuf::from(filePath),
        databaseId,
        delay,
        reason,
    )?;
    
    Ok(serde_json::json!({
        "success": true,
        "task_id": task_id,
        "delay_ms": delay,
        "message": "延遲刪除任務已排程"
    }))
}

/// Tauri命令：取消延遲刪除
#[tauri::command]
#[allow(non_snake_case)]
pub async fn cancel_delayed_deletion(taskId: String) -> Result<Value, String> {
    let queue = get_deletion_queue();
    let cancelled = queue.cancel_deletion(&taskId)?;
    
    Ok(serde_json::json!({
        "success": true,
        "cancelled": cancelled,
        "task_id": taskId
    }))
}

/// Tauri命令：獲取延遲刪除隊列狀態
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_delayed_deletion_status() -> Result<Value, String> {
    let queue = get_deletion_queue();
    queue.get_queue_status()
}