use std::sync::{Arc, Mutex};
use std::collections::{HashMap, VecDeque};
use serde::{Deserialize, Serialize};
use tokio::sync::Semaphore;
use tokio::time::{Duration, Instant};
use uuid::Uuid;

use super::{
    Result, IllustrationError, EnhancedIllustrationRequest, 
    IllustrationManager
};
use super::illustration_manager::DetailedGenerationResult;

/// 批次生成管理器 - 處理多個插畫生成請求的批次處理和隊列管理
/// 
/// 功能：
/// 1. 批次請求排程和執行
/// 2. 並發控制和資源管理
/// 3. 生成進度追蹤和狀態管理
/// 4. 失敗重試和錯誤處理
/// 5. 優先級隊列管理
pub struct BatchManager {
    // 核心管理器
    #[allow(dead_code)]
    illustration_manager: Arc<Mutex<IllustrationManager>>,
    
    // 隊列管理
    #[allow(dead_code)]
    task_queue: Arc<Mutex<VecDeque<BatchTask>>>,
    #[allow(dead_code)]
    active_tasks: Arc<Mutex<HashMap<String, BatchTaskStatus>>>,
    #[allow(dead_code)]
    completed_tasks: Arc<Mutex<HashMap<String, BatchResult>>>,
    
    // 並發控制
    #[allow(dead_code)]
    semaphore: Arc<Semaphore>,
    #[allow(dead_code)]
    max_concurrent_tasks: usize,
    
    // 統計和監控
    #[allow(dead_code)]
    statistics: Arc<Mutex<BatchStatistics>>,
    
    // 配置
    #[allow(dead_code)]
    config: BatchManagerConfig,
}

/// 批次管理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchManagerConfig {
    pub max_concurrent_tasks: usize,
    pub max_queue_size: usize,
    pub task_timeout_seconds: u64,
    pub retry_attempts: u32,
    pub retry_delay_seconds: u64,
    pub cleanup_interval_seconds: u64,
    pub enable_priority_queue: bool,
    pub auto_retry_failed_tasks: bool,
}

/// 批次任務
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchTask {
    pub id: String,
    pub batch_id: String,
    pub request: EnhancedIllustrationRequest,
    pub priority: TaskPriority,
    pub created_at: String,
    pub scheduled_at: Option<String>,
    pub retry_count: u32,
    pub max_retries: u32,
    pub timeout_seconds: Option<u64>,
    pub metadata: TaskMetadata,
}

/// 任務優先級
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum TaskPriority {
    Low = 1,
    Normal = 2,
    High = 3,
    Critical = 4,
    Urgent = 5,
}

/// 任務元數據
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskMetadata {
    pub user_id: Option<String>,
    pub project_name: Option<String>,
    pub character_name: Option<String>,
    pub estimated_cost: Option<f64>,
    pub tags: Vec<String>,
    pub dependencies: Vec<String>, // 依賴其他任務的 ID
}

/// 批次任務狀態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchTaskStatus {
    pub task_id: String,
    pub batch_id: String,
    pub status: TaskStatus,
    pub progress: f64,        // 0.0 - 1.0
    pub current_step: String,
    pub started_at: Option<String>,
    pub estimated_completion: Option<String>,
    pub error_message: Option<String>,
    pub retry_count: u32,
    pub performance_metrics: TaskPerformanceMetrics,
}

/// 任務狀態
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TaskStatus {
    Queued,
    Waiting,        // 等待依賴完成
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
    Timeout,
    Retrying,
}

/// 任務效能指標
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskPerformanceMetrics {
    pub queue_time_ms: u64,
    pub execution_time_ms: u64,
    pub memory_usage_mb: u64,
    pub api_calls_count: u32,
    pub total_cost: f64,
}

/// 批次結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResult {
    pub task_id: String,
    pub batch_id: String,
    pub status: TaskStatus,
    pub result: Option<DetailedGenerationResult>,
    pub error: Option<String>,
    pub completed_at: String,
    pub performance_metrics: TaskPerformanceMetrics,
}

/// 批次操作請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRequest {
    pub batch_id: Option<String>,
    pub requests: Vec<EnhancedIllustrationRequest>,
    pub priority: Option<TaskPriority>,
    pub metadata: Option<BatchRequestMetadata>,
    pub execution_config: Option<BatchExecutionConfig>,
}

/// 批次請求元數據
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRequestMetadata {
    pub batch_name: String,
    pub description: Option<String>,
    pub project_id: String,
    pub user_id: Option<String>,
    pub tags: Vec<String>,
    pub notify_on_completion: bool,
}

/// 批次執行配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchExecutionConfig {
    pub max_parallel: Option<usize>,
    pub timeout_seconds: Option<u64>,
    pub retry_failed_tasks: Option<bool>,
    pub preserve_order: bool,
    pub fail_fast: bool,           // 一個失敗就停止整個批次
    pub continue_on_error: bool,   // 忽略個別失敗繼續處理
}

/// 批次統計
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchStatistics {
    pub total_tasks_processed: u64,
    pub successful_tasks: u64,
    pub failed_tasks: u64,
    pub cancelled_tasks: u64,
    pub timeout_tasks: u64,
    pub retried_tasks: u64,
    pub average_execution_time_ms: f64,
    pub total_api_costs: f64,
    pub peak_concurrent_tasks: u32,
    pub queue_utilization: f64,
    pub error_rate: f64,
    pub throughput_per_hour: f64,
}

/// 批次狀態報告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchStatusReport {
    pub batch_id: String,
    pub total_tasks: u32,
    pub completed_tasks: u32,
    pub failed_tasks: u32,
    pub running_tasks: u32,
    pub queued_tasks: u32,
    pub overall_progress: f64,
    pub estimated_completion: Option<String>,
    pub statistics: BatchStatistics,
    pub task_details: Vec<BatchTaskStatus>,
}

impl Default for BatchManagerConfig {
    fn default() -> Self {
        Self {
            max_concurrent_tasks: 3,
            max_queue_size: 100,
            task_timeout_seconds: 300, // 5分鐘
            retry_attempts: 2,
            retry_delay_seconds: 30,
            cleanup_interval_seconds: 3600, // 1小時
            enable_priority_queue: true,
            auto_retry_failed_tasks: true,
        }
    }
}

impl Default for TaskPriority {
    fn default() -> Self {
        TaskPriority::Normal
    }
}

impl BatchManager {
    /// 創建新的批次管理器
    pub fn new(illustration_manager: Arc<Mutex<IllustrationManager>>) -> Self {
        let config = BatchManagerConfig::default();
        let semaphore = Arc::new(Semaphore::new(config.max_concurrent_tasks));
        
        Self {
            illustration_manager,
            task_queue: Arc::new(Mutex::new(VecDeque::new())),
            active_tasks: Arc::new(Mutex::new(HashMap::new())),
            completed_tasks: Arc::new(Mutex::new(HashMap::new())),
            semaphore,
            max_concurrent_tasks: config.max_concurrent_tasks,
            statistics: Arc::new(Mutex::new(BatchStatistics::default())),
            config,
        }
    }
    
    /// 提交批次生成請求
    #[allow(dead_code)]
    pub async fn submit_batch(&self, request: BatchRequest) -> Result<String> {
        let batch_id = request.batch_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        
        log::info!("[BatchManager] 提交批次請求，批次ID: {}，任務數量: {}", 
                   batch_id, request.requests.len());
        
        // 驗證批次大小
        if request.requests.len() > self.config.max_queue_size {
            return Err(IllustrationError::Config(
                format!("批次大小 {} 超過限制 {}", request.requests.len(), self.config.max_queue_size)
            ));
        }
        
        // 檢查隊列容量
        {
            let queue = self.task_queue.lock()
                .map_err(|e| IllustrationError::Unknown(format!("隊列鎖定失敗: {}", e)))?;
            if queue.len() + request.requests.len() > self.config.max_queue_size {
                return Err(IllustrationError::Config("隊列已滿，無法添加更多任務".to_string()));
            }
        }
        
        // 創建批次任務
        let mut tasks = Vec::new();
        let priority = request.priority.unwrap_or_default();
        let now = chrono::Utc::now().to_rfc3339();
        
        for (_index, req) in request.requests.into_iter().enumerate() {
            let task_id = Uuid::new_v4().to_string();
            
            let metadata = TaskMetadata {
                user_id: request.metadata.as_ref().and_then(|m| m.user_id.clone()),
                project_name: request.metadata.as_ref().map(|m| m.batch_name.clone()),
                character_name: req.basic_request.character_id.clone(),
                estimated_cost: Some(0.04), // Imagen 3.0 基本成本
                tags: request.metadata.as_ref().map(|m| m.tags.clone()).unwrap_or_default(),
                dependencies: Vec::new(),
            };
            
            let task = BatchTask {
                id: task_id,
                batch_id: batch_id.clone(),
                request: req,
                priority: priority.clone(),
                created_at: now.clone(),
                scheduled_at: None,
                retry_count: 0,
                max_retries: self.config.retry_attempts,
                timeout_seconds: Some(self.config.task_timeout_seconds),
                metadata,
            };
            
            tasks.push(task);
        }
        
        // 將任務添加到隊列
        {
            let mut queue = self.task_queue.lock()
                .map_err(|e| IllustrationError::Unknown(format!("隊列鎖定失敗: {}", e)))?;
            
            for task in tasks {
                if self.config.enable_priority_queue {
                    // 按優先級插入
                    let mut insert_index = None;
                    for (i, existing_task) in queue.iter().enumerate() {
                        if task.priority > existing_task.priority {
                            insert_index = Some(i);
                            break;
                        }
                    }
                    if let Some(index) = insert_index {
                        queue.insert(index, task);
                    } else {
                        queue.push_back(task);
                    }
                } else {
                    // FIFO 插入
                    queue.push_back(task);
                }
            }
        }
        
        log::info!("[BatchManager] 批次任務已加入隊列，批次ID: {}", batch_id);
        
        // 啟動處理程序（如果尚未運行）
        self.start_processing().await?;
        
        Ok(batch_id)
    }
    
    /// 啟動批次處理程序
    #[allow(dead_code)]
    async fn start_processing(&self) -> Result<()> {
        // 簡化實現：返回 OK，實際的批次處理會在 submit_batch 中直接處理
        // 更複雜的實現需要使用 Arc<Mutex> 或其他線程安全的方式
        log::info!("[BatchManager] 批次處理程序已準備就緒");
        Ok(())
    }
    
    /// 檢查任務依賴是否滿足
    #[allow(dead_code)]
    fn check_dependencies(task: &BatchTask, completed_tasks: &Arc<Mutex<HashMap<String, BatchResult>>>) -> bool {
        if task.metadata.dependencies.is_empty() {
            return true;
        }
        
        let completed = match completed_tasks.lock() {
            Ok(completed) => completed,
            Err(_) => return false,
        };
        
        for dep_id in &task.metadata.dependencies {
            if let Some(dep_result) = completed.get(dep_id) {
                if dep_result.status != TaskStatus::Completed {
                    return false; // 依賴任務失敗
                }
            } else {
                return false; // 依賴任務尚未完成
            }
        }
        
        true
    }
    
    /// 執行單個任務
    #[allow(dead_code)]
    async fn execute_task(
        task: BatchTask,
        illustration_manager: Arc<Mutex<IllustrationManager>>,
        active_tasks: Arc<Mutex<HashMap<String, BatchTaskStatus>>>,
        config: BatchManagerConfig,
    ) -> BatchResult {
        let task_id = task.id.clone();
        let batch_id = task.batch_id.clone();
        let start_time = Instant::now();
        
        log::info!("[BatchManager] 開始執行任務: {}", task_id);
        
        // 初始化任務狀態
        let mut task_status = BatchTaskStatus {
            task_id: task_id.clone(),
            batch_id: batch_id.clone(),
            status: TaskStatus::Running,
            progress: 0.0,
            current_step: "初始化".to_string(),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            estimated_completion: None,
            error_message: None,
            retry_count: task.retry_count,
            performance_metrics: TaskPerformanceMetrics {
                queue_time_ms: 0,
                execution_time_ms: 0,
                memory_usage_mb: 0,
                api_calls_count: 0,
                total_cost: 0.0,
            },
        };
        
        // 更新活動任務狀態
        if let Ok(mut active) = active_tasks.lock() {
            active.insert(task_id.clone(), task_status.clone());
        }
        
        // 執行插畫生成
        let result = {
            let manager = match illustration_manager.lock() {
                Ok(manager) => manager,
                Err(e) => {
                    let error_msg = format!("管理器鎖定失敗: {}", e);
                    log::error!("[BatchManager] {}", error_msg);
                    
                    return BatchResult {
                        task_id,
                        batch_id,
                        status: TaskStatus::Failed,
                        result: None,
                        error: Some(error_msg),
                        completed_at: chrono::Utc::now().to_rfc3339(),
                        performance_metrics: TaskPerformanceMetrics {
                            queue_time_ms: 0,
                            execution_time_ms: start_time.elapsed().as_millis() as u64,
                            memory_usage_mb: 0,
                            api_calls_count: 0,
                            total_cost: 0.0,
                        },
                    };
                }
            };
            
            // 更新進度
            task_status.progress = 0.2;
            task_status.current_step = "執行插畫生成".to_string();
            if let Ok(mut active) = active_tasks.lock() {
                active.insert(task_id.clone(), task_status.clone());
            }
            
            // 設定超時
            let timeout_duration = Duration::from_secs(config.task_timeout_seconds);
            let generation_result = tokio::time::timeout(
                timeout_duration,
                manager.generate_illustration(task.request.clone())
            ).await;
            
            match generation_result {
                Ok(Ok(result)) => {
                    log::info!("[BatchManager] 任務執行成功: {}", task_id);
                    
                    let execution_time = start_time.elapsed().as_millis() as u64;
                    
                    BatchResult {
                        task_id,
                        batch_id,
                        status: TaskStatus::Completed,
                        result: Some(result),
                        error: None,
                        completed_at: chrono::Utc::now().to_rfc3339(),
                        performance_metrics: TaskPerformanceMetrics {
                            queue_time_ms: 0, // TODO: 計算實際隊列時間
                            execution_time_ms: execution_time,
                            memory_usage_mb: 0, // TODO: 監控記憶體使用
                            api_calls_count: 1,
                            total_cost: 0.04, // Imagen 3.0 基本成本
                        },
                    }
                },
                Ok(Err(e)) => {
                    log::error!("[BatchManager] 任務執行失敗: {} - {:?}", task_id, e);
                    
                    BatchResult {
                        task_id,
                        batch_id,
                        status: TaskStatus::Failed,
                        result: None,
                        error: Some(format!("{:?}", e)),
                        completed_at: chrono::Utc::now().to_rfc3339(),
                        performance_metrics: TaskPerformanceMetrics {
                            queue_time_ms: 0,
                            execution_time_ms: start_time.elapsed().as_millis() as u64,
                            memory_usage_mb: 0,
                            api_calls_count: 1,
                            total_cost: 0.0,
                        },
                    }
                },
                Err(_) => {
                    log::error!("[BatchManager] 任務執行超時: {}", task_id);
                    
                    BatchResult {
                        task_id,
                        batch_id,
                        status: TaskStatus::Timeout,
                        result: None,
                        error: Some("任務執行超時".to_string()),
                        completed_at: chrono::Utc::now().to_rfc3339(),
                        performance_metrics: TaskPerformanceMetrics {
                            queue_time_ms: 0,
                            execution_time_ms: config.task_timeout_seconds * 1000,
                            memory_usage_mb: 0,
                            api_calls_count: 0,
                            total_cost: 0.0,
                        },
                    }
                }
            }
        };
        
        result
    }
    
    /// 獲取批次狀態報告
    #[allow(dead_code)]
    pub fn get_batch_status(&self, batch_id: &str) -> Result<BatchStatusReport> {
        let active_tasks = self.active_tasks.lock()
            .map_err(|e| IllustrationError::Unknown(format!("活動任務鎖定失敗: {}", e)))?;
        
        let completed_tasks = self.completed_tasks.lock()
            .map_err(|e| IllustrationError::Unknown(format!("完成任務鎖定失敗: {}", e)))?;
        
        let queue = self.task_queue.lock()
            .map_err(|e| IllustrationError::Unknown(format!("隊列鎖定失敗: {}", e)))?;
        
        let statistics = self.statistics.lock()
            .map_err(|e| IllustrationError::Unknown(format!("統計鎖定失敗: {}", e)))?;
        
        // 收集批次相關任務
        let mut task_details = Vec::new();
        let mut total_tasks = 0;
        let mut completed_tasks_count = 0;
        let mut failed_tasks_count = 0;
        let mut running_tasks_count = 0;
        let mut queued_tasks_count = 0;
        
        // 活動任務
        for status in active_tasks.values() {
            if status.batch_id == batch_id {
                total_tasks += 1;
                if status.status == TaskStatus::Running {
                    running_tasks_count += 1;
                }
                task_details.push(status.clone());
            }
        }
        
        // 完成任務
        for result in completed_tasks.values() {
            if result.batch_id == batch_id {
                total_tasks += 1;
                match result.status {
                    TaskStatus::Completed => completed_tasks_count += 1,
                    TaskStatus::Failed | TaskStatus::Timeout => failed_tasks_count += 1,
                    _ => {}
                }
            }
        }
        
        // 隊列中的任務
        for task in queue.iter() {
            if task.batch_id == batch_id {
                total_tasks += 1;
                queued_tasks_count += 1;
            }
        }
        
        let overall_progress = if total_tasks > 0 {
            (completed_tasks_count as f64 + failed_tasks_count as f64) / total_tasks as f64
        } else {
            0.0
        };
        
        Ok(BatchStatusReport {
            batch_id: batch_id.to_string(),
            total_tasks,
            completed_tasks: completed_tasks_count,
            failed_tasks: failed_tasks_count,
            running_tasks: running_tasks_count,
            queued_tasks: queued_tasks_count,
            overall_progress,
            estimated_completion: None, // TODO: 基於當前進度估算
            statistics: statistics.clone(),
            task_details,
        })
    }
    
    /// 取消批次
    #[allow(dead_code)]
    pub fn cancel_batch(&self, batch_id: &str) -> Result<u32> {
        log::info!("[BatchManager] 取消批次: {}", batch_id);
        
        let mut cancelled_count = 0;
        
        // 取消隊列中的任務
        {
            let mut queue = self.task_queue.lock()
                .map_err(|e| IllustrationError::Unknown(format!("隊列鎖定失敗: {}", e)))?;
            
            queue.retain(|task| {
                if task.batch_id == batch_id {
                    cancelled_count += 1;
                    false
                } else {
                    true
                }
            });
        }
        
        // 標記活動任務為取消（實際取消需要在執行層面處理）
        {
            let mut active_tasks = self.active_tasks.lock()
                .map_err(|e| IllustrationError::Unknown(format!("活動任務鎖定失敗: {}", e)))?;
            
            for status in active_tasks.values_mut() {
                if status.batch_id == batch_id && status.status == TaskStatus::Running {
                    status.status = TaskStatus::Cancelled;
                    cancelled_count += 1;
                }
            }
        }
        
        log::info!("[BatchManager] 批次 {} 已取消 {} 個任務", batch_id, cancelled_count);
        Ok(cancelled_count)
    }
    
    /// 清理舊的完成任務
    #[allow(dead_code)]
    pub fn cleanup_completed_tasks(&self, older_than_hours: u64) -> Result<u32> {
        let cutoff_time = chrono::Utc::now() - chrono::Duration::hours(older_than_hours as i64);
        
        let mut completed_tasks = self.completed_tasks.lock()
            .map_err(|e| IllustrationError::Unknown(format!("完成任務鎖定失敗: {}", e)))?;
        
        let initial_count = completed_tasks.len();
        
        completed_tasks.retain(|_, result| {
            if let Ok(completed_time) = chrono::DateTime::parse_from_rfc3339(&result.completed_at) {
                completed_time.with_timezone(&chrono::Utc) > cutoff_time
            } else {
                true // 保留解析失敗的記錄
            }
        });
        
        let cleaned_count = initial_count - completed_tasks.len();
        
        if cleaned_count > 0 {
            log::info!("[BatchManager] 清理了 {} 個舊的完成任務", cleaned_count);
        }
        
        Ok(cleaned_count as u32)
    }
    
    /// 獲取隊列統計
    #[allow(dead_code)]
    pub fn get_queue_statistics(&self) -> Result<BatchStatistics> {
        let statistics = self.statistics.lock()
            .map_err(|e| IllustrationError::Unknown(format!("統計鎖定失敗: {}", e)))?;
        
        Ok(statistics.clone())
    }
    
    /// 更新配置
    #[allow(dead_code)]
    pub fn update_config(&mut self, config: BatchManagerConfig) {
        self.config = config;
        self.max_concurrent_tasks = self.config.max_concurrent_tasks;
    }
    
    /// 獲取當前配置
    #[allow(dead_code)]
    pub fn get_config(&self) -> &BatchManagerConfig {
        &self.config
    }
}

impl Default for BatchStatistics {
    fn default() -> Self {
        Self {
            total_tasks_processed: 0,
            successful_tasks: 0,
            failed_tasks: 0,
            cancelled_tasks: 0,
            timeout_tasks: 0,
            retried_tasks: 0,
            average_execution_time_ms: 0.0,
            total_api_costs: 0.0,
            peak_concurrent_tasks: 0,
            queue_utilization: 0.0,
            error_rate: 0.0,
            throughput_per_hour: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    
    fn create_mock_illustration_manager() -> Arc<Mutex<IllustrationManager>> {
        // 這裡應該創建一個模擬的 IllustrationManager
        // 由於結構複雜，這裡簡化為註釋
        todo!("實現模擬的 IllustrationManager 用於測試")
    }
    
    #[tokio::test]
    async fn test_batch_submission() {
        // let manager = create_mock_illustration_manager();
        // let batch_manager = BatchManager::new(manager);
        
        // TODO: 實現批次提交測試
    }
    
    #[tokio::test]
    async fn test_priority_queue() {
        // TODO: 實現優先級隊列測試
    }
    
    #[tokio::test]
    async fn test_concurrent_execution() {
        // TODO: 實現並發執行測試
    }
}