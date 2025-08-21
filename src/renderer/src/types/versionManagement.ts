import { TempImageData } from '../store/slices/visualCreationSlice';

// 版本狀態枚舉
export type VersionStatus = 'active' | 'archived' | 'deleted' | 'draft';

// 版本類型枚舉
export type VersionType = 'original' | 'revision' | 'branch' | 'merge';

// 版本比較差異類型
export type DifferenceType = 'prompt' | 'parameters' | 'metadata' | 'visual';

// 版本標籤介面
export interface VersionTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

// 版本元資料介面
export interface VersionMetadata {
  // 基本資訊
  title?: string;
  description?: string;
  tags: VersionTag[];
  
  // 技術資訊
  generationTime: number; // 生成時間 (ms)
  fileSize: number; // 檔案大小 (bytes)
  dimensions: {
    width: number;
    height: number;
  };
  
  // AI 參數
  aiParameters: {
    model: string;
    provider: string;
    seed?: number;
    guidance?: number;
    steps?: number;
    sampler?: string;
    enhance?: boolean;
    style?: string;
  };
  
  // 使用統計
  viewCount: number;
  likeCount: number;
  exportCount: number;
  
  // 時間戳記
  createdAt: string;
  updatedAt: string;
}

// 單個圖片版本介面
export interface ImageVersion {
  // 基本識別
  id: string;
  versionNumber: number;
  status: VersionStatus;
  type: VersionType;
  
  // 關係資訊
  parentVersionId?: string; // 父版本 ID
  childVersionIds: string[]; // 子版本 ID 列表
  rootVersionId: string; // 根版本 ID
  branchName?: string; // 分支名稱
  
  // 內容資訊
  prompt: string;
  originalPrompt: string;
  imageUrl: string;
  tempPath?: string;
  
  // 專案關聯
  projectId?: string;
  characterId?: string;
  
  // 元資料
  metadata: VersionMetadata;
  
  // 基於 TempImageData 的相容性
  tempImageData?: TempImageData;
}

// 版本差異記錄
export interface VersionDifference {
  type: DifferenceType;
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

// 版本比較結果
export interface VersionComparison {
  id: string;
  version1: ImageVersion;
  version2: ImageVersion;
  differences: VersionDifference[];
  similarity: number; // 相似度 0-1
  comparedAt: string;
  comparisonType: 'manual' | 'auto';
}

// 版本分支介面
export interface VersionBranch {
  id: string;
  name: string;
  description?: string;
  rootVersionId: string;
  headVersionId: string; // 分支最新版本
  versionIds: string[];
  createdAt: string;
  isActive: boolean;
  color?: string; // 分支顏色標識
}

// 版本樹節點
export interface VersionTreeNode {
  version: ImageVersion;
  children: VersionTreeNode[];
  depth: number;
  isExpanded: boolean;
  branchInfo?: VersionBranch;
}

// 版本樹結構
export interface VersionTree {
  rootVersion: ImageVersion;
  tree: VersionTreeNode;
  branches: VersionBranch[];
  totalVersions: number;
  maxDepth: number;
}

// 版本過濾選項
export interface VersionFilter {
  // 時間範圍
  dateRange?: {
    start: string;
    end: string;
  };
  
  // 狀態過濾
  statuses?: VersionStatus[];
  
  // 類型過濾
  types?: VersionType[];
  
  // 標籤過濾
  tags?: string[];
  
  // 分支過濾
  branches?: string[];
  
  // 搜尋關鍵字
  searchKeyword?: string;
  
  // 提示詞相似度
  promptSimilarity?: {
    referencePrompt: string;
    threshold: number; // 0-1
  };
  
  // 參數篩選
  parameterFilters?: {
    model?: string;
    provider?: string;
    minFileSize?: number;
    maxFileSize?: number;
  };
}

// 版本歷史記錄
export interface VersionHistory {
  imageId: string; // 關聯的圖片 ID
  versions: ImageVersion[];
  tree: VersionTree;
  comparisons: VersionComparison[];
  
  // 統計資訊
  stats: {
    totalVersions: number;
    activeBranches: number;
    lastModified: string;
    averageGenerationTime: number;
    totalFileSize: number;
  };
  
  // 設定
  settings: {
    maxVersionsToKeep?: number; // 最大保留版本數
    autoCleanup: boolean; // 自動清理舊版本
    defaultBranchName: string;
  };
}

// 版本操作結果
export interface VersionOperationResult {
  success: boolean;
  message: string;
  versionId?: string;
  error?: {
    code: string;
    details: string;
  };
}

// 版本匯出選項
export interface VersionExportOptions {
  versionIds: string[];
  format: 'json' | 'csv' | 'zip';
  includeImages: boolean;
  includeMetadata: boolean;
  includeComparisons: boolean;
  outputPath?: string;
}

// 版本匯入選項
export interface VersionImportOptions {
  source: 'file' | 'url' | 'clipboard';
  sourceData: string | File;
  mergeStrategy: 'replace' | 'append' | 'merge';
  validateData: boolean;
}

// 版本統計資訊
export interface VersionStatistics {
  // 基本統計
  totalVersions: number;
  activeVersions: number;
  archivedVersions: number;
  
  // 分支統計
  totalBranches: number;
  activeBranches: number;
  averageVersionsPerBranch: number;
  
  // 時間統計
  averageGenerationTime: number;
  totalGenerationTime: number;
  creationFrequency: { // 按時間段的創建頻率
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  
  // 使用統計
  mostViewedVersions: ImageVersion[];
  mostLikedVersions: ImageVersion[];
  mostExportedVersions: ImageVersion[];
  
  // 技術統計
  modelUsage: Record<string, number>; // 模型使用統計
  providerUsage: Record<string, number>; // 提供商使用統計
  averageFileSize: number;
  totalStorageUsed: number;
}

// Hook 返回類型
export interface UseVersionManagerReturn {
  // 資料
  versions: ImageVersion[];
  currentVersion?: ImageVersion | null;
  
  // 狀態
  loading: boolean;
  error: string | null;
  
  // 操作
  createVersion: (data: Partial<ImageVersion>) => Promise<VersionOperationResult>;
  updateVersion: (id: string, data: Partial<ImageVersion>) => Promise<VersionOperationResult>;
  deleteVersion: (id: string) => Promise<VersionOperationResult>;
  duplicateVersion: (id: string) => Promise<VersionOperationResult>;
  
  // 分支操作
  createBranch: (versionId: string, branchName: string) => Promise<VersionOperationResult>;
  switchToBranch: (branchId: string) => Promise<VersionOperationResult>;
  mergeBranch: (sourceBranchId: string, targetBranchId: string) => Promise<VersionOperationResult>;
  
  // 查詢
  getVersionById: (id: string) => ImageVersion | undefined;
  getVersionsByFilter: (filter: VersionFilter) => ImageVersion[];
  
  // 工具
  buildVersionTree: () => VersionTree;
  exportVersions: (options: VersionExportOptions) => Promise<string>;
  importVersions: (options: VersionImportOptions) => Promise<VersionOperationResult>;
}

export interface UseVersionComparisonReturn {
  // 資料
  comparisons: VersionComparison[];
  currentComparison?: VersionComparison;
  
  // 狀態
  isComparing: boolean;
  error: string | null;
  
  // 操作
  compareVersions: (version1Id: string, version2Id: string) => Promise<VersionComparison>;
  saveComparison: (comparison: VersionComparison) => Promise<VersionOperationResult>;
  deleteComparison: (comparisonId: string) => Promise<VersionOperationResult>;
  
  // 分析
  calculateSimilarity: (version1: ImageVersion, version2: ImageVersion) => number;
  findDifferences: (version1: ImageVersion, version2: ImageVersion) => VersionDifference[];
  generateComparisonReport: (comparison: VersionComparison) => string;
}

export interface UseVersionHistoryReturn {
  // 資料
  history: VersionHistory[];
  currentHistory?: VersionHistory;
  statistics: VersionStatistics;
  
  // 狀態
  isLoading: boolean;
  error: string | null;
  
  // 操作
  loadHistory: (imageId: string) => Promise<VersionHistory>;
  updateHistory: (imageId: string, data: Partial<VersionHistory>) => Promise<VersionOperationResult>;
  clearHistory: (imageId: string) => Promise<VersionOperationResult>;
  
  // 篩選和搜尋
  applyFilter: (filter: VersionFilter) => void;
  clearFilter: () => void;
  searchVersions: (keyword: string) => ImageVersion[];
  
  // 統計
  generateStatistics: () => VersionStatistics;
  exportStatistics: (format: 'json' | 'csv') => Promise<string>;
}

export interface UseVersionBranchingReturn {
  // 資料
  branches: VersionBranch[];
  currentBranch?: VersionBranch;
  
  // 狀態
  isLoading: boolean;
  error: string | null;
  
  // 操作
  createBranch: (name: string, sourceVersionId: string) => Promise<VersionOperationResult>;
  deleteBranch: (branchId: string) => Promise<VersionOperationResult>;
  renameBranch: (branchId: string, newName: string) => Promise<VersionOperationResult>;
  switchBranch: (branchId: string) => Promise<VersionOperationResult>;
  
  // 合併
  mergeBranches: (sourceBranchId: string, targetBranchId: string) => Promise<VersionOperationResult>;
  checkMergeConflicts: (sourceBranchId: string, targetBranchId: string) => Promise<VersionDifference[]>;
  
  // 查詢
  getBranchById: (id: string) => VersionBranch | undefined;
  getActiveBranches: () => VersionBranch[];
  getBranchHistory: (branchId: string) => ImageVersion[];
}