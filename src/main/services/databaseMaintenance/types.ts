/**
 * 資料庫維護相關的型別定義
 */

export interface DatabaseCheckResult {
  isHealthy: boolean;
  issues: DatabaseIssue[];
  statistics: DatabaseStatistics;
  timestamp: string;
}

export interface DatabaseIssue {
  type: 'integrity' | 'orphan' | 'corruption' | 'constraint' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface DatabaseStatistics {
  totalProjects: number;
  totalChapters: number;
  totalCharacters: number;
  totalTemplates: number;
  databaseSize: number;
  lastVacuum: string | null;
  fragmentationLevel: number;
}

export interface RepairResult {
  success: boolean;
  fixedIssues: DatabaseIssue[];
  remainingIssues: DatabaseIssue[];
  message: string;
}

export interface OptimizationResult {
  success: boolean;
  originalSize: number;
  newSize: number;
  savedSpace: number;
  operationsPerformed: string[];
  message: string;
}

export interface BackupResult {
  success: boolean;
  backupPath: string;
  size: number;
  timestamp: string;
  message: string;
}