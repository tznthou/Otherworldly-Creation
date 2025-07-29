// 重新導出模組化的資料庫維護服務
export { 
  DatabaseMaintenanceService,
  getDatabaseMaintenanceService
} from './databaseMaintenance/index';

export type {
  DatabaseCheckResult,
  DatabaseIssue,
  DatabaseStatistics,
  RepairResult,
  OptimizationResult,
  BackupResult
} from './databaseMaintenance/index';