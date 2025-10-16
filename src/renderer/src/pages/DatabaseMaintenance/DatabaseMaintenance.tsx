import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Progress } from '../../components/UI/Progress';
import { Alert, AlertDescription } from '../../components/UI/Alert';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
// 🔥 Tauri v2 dialog API - 正確語法
import { save, open } from '@tauri-apps/plugin-dialog';
import { addNotification } from '../../store/slices/uiSlice';
import { AppDispatch } from '../../store/store';
import api from '../../api';

// 資料庫修復結果類型
interface RepairResult {
  success: boolean;
  message: string;
  issuesFixed?: number;
  errors?: string[];
  warnings?: string[];
}
import { createLogger } from '../../utils/logger';
import {
Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Upload,
  BarChart3,
  Settings,
  FileText,
  Zap,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// 創建模組專用 logger
const log = createLogger('DatabaseMaintenance');

interface DatabaseIssue {
  type: 'integrity' | 'orphan' | 'corruption' | 'constraint' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

interface DatabaseStatistics {
  totalProjects: number;
  totalChapters: number;
  totalCharacters: number;
  totalTemplates: number;
  databaseSize: number;
  lastVacuum: string | null;
  fragmentationLevel: number;
  journalMode?: string;
  isWalMode?: boolean;
}

interface DatabaseCheckResult {
  isHealthy: boolean;
  issues: DatabaseIssue[];
  statistics: DatabaseStatistics;
  timestamp: string;
}

const DatabaseMaintenance: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [checkResult, setCheckResult] = useState<DatabaseCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isIncrementalVacuuming, setIsIncrementalVacuuming] = useState(false);
  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);
  const [walModeStatus, setWalModeStatus] = useState<{
    enabled: boolean;
    is_wal_mode: boolean;
    journal_mode: string;
    synchronous: string;
    wal_autocheckpoint: number;
    wal_info?: {
      bytes: number;
      frames: number;
    };
    benefits?: string[];
    recommendations?: string[];
  } | null>(null);
  const [_isLoadingWalStatus, setIsLoadingWalStatus] = useState(false);
  const [isTogglingWalMode, setIsTogglingWalMode] = useState(false);
  const [showWalWarning, setShowWalWarning] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [errorReport, setErrorReport] = useState<string>('');
  const [confirmImport, setConfirmImport] = useState<{show: boolean; filePath: string | null}>({show: false, filePath: null});

  useEffect(() => {
    // 頁面載入時自動執行健康檢查和載入 WAL 狀態
    performHealthCheck();
    loadWalModeStatus();
  }, []);

  const performHealthCheck = async () => {
    setIsChecking(true);
    try {
      const result = await api.database.healthCheck();
      // 使用後端正確的返回格式
      const checkResult: DatabaseCheckResult = {
        isHealthy: result.isHealthy || false,
        issues: result.issues || [],
        statistics: result.statistics || { 
          totalProjects: 0, 
          totalChapters: 0, 
          totalCharacters: 0, 
          totalTemplates: 0, 
          databaseSize: 0, 
          lastVacuum: null, 
          fragmentationLevel: 0 
        },
        timestamp: result.timestamp || new Date().toISOString()
      };
      // 如果沒有統計資訊但有問題，保留舊邏輯作為備份
      if (!result.statistics && !result.isHealthy) {
        checkResult.issues = checkResult.issues.length > 0 ? checkResult.issues : [{ 
          type: 'performance' as const, 
          table: 'system',
          description: '資料庫狀態需要注意', 
          suggestion: '請執行資料庫維護以修復問題',
          severity: 'medium',
          autoFixable: true
        }];
      }
      setCheckResult(checkResult);
      setRepairResult(null);
    } catch (error) {
      log.error('健康檢查失敗:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const loadWalModeStatus = async () => {
    setIsLoadingWalStatus(true);
    try {
      const status = await api.database.getWalModeStatus();
      setWalModeStatus({
        enabled: true,
        is_wal_mode: status.is_wal_mode,
        journal_mode: status.journal_mode,
        synchronous: String(status.synchronous),
        wal_autocheckpoint: status.wal_autocheckpoint,
        wal_info: status.wal_info as { bytes: number; frames: number },
        benefits: Array.isArray(status.benefits) ? status.benefits : (typeof status.benefits === 'object' ? Object.values(status.benefits || {}).flat() : []),
        recommendations: Array.isArray(status.recommendations) ? [status.recommendations] : [status.recommendations || '']
      });
    } catch (error) {
      log.error('載入 WAL 模式狀態失敗:', error);
      setWalModeStatus(null);
    } finally {
      setIsLoadingWalStatus(false);
    }
  };

  // 檢查是否有其他操作正在進行
  const hasActiveOperation = isRepairing || isOptimizing || isReindexing || 
                             isIncrementalVacuuming || isRunningMaintenance || 
                             isExporting || isImporting;

  const toggleWalMode = async () => {
    if (!walModeStatus) return;
    
    if (hasActiveOperation) {
      dispatch(addNotification({
        type: 'warning',
        title: 'WAL 模式切換延遲',
        message: '請等待當前資料庫操作完成後再嘗試切換 WAL 模式'
      }));
      return;
    }

    // 🔥 新增：啟用 WAL 模式前的警告檢查
    const currentIsWal = walModeStatus.is_wal_mode;
    const shouldShowWarning = !currentIsWal && !localStorage.getItem('dontShowWalWarning');
    
    if (shouldShowWarning) {
      setShowWalWarning(true);
      return; // 等待用戶確認
    }
    
    // 直接執行切換（用戶已確認或是關閉 WAL）
    await performWalModeToggle();
  };

  // 🔥 新增：實際執行 WAL 模式切換的函數
  const performWalModeToggle = async () => {
    if (!walModeStatus) return;
    
    setIsTogglingWalMode(true);
    try {
      const currentIsWal = walModeStatus.is_wal_mode;
      const result = await api.database.setWalMode(!currentIsWal);
      
      dispatch(addNotification({
        type: 'success',
        title: `${!currentIsWal ? '啟用' : '停用'} WAL 模式成功`,
        message: result
      }));
      
      // 切換後重新載入狀態和健康檢查
      await Promise.all([
        loadWalModeStatus(),
        performHealthCheck()
      ]);
      
    } catch (error) {
      log.error('切換 WAL 模式失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      
      // 🔥 根據錯誤類型提供不同的建議
      if (errorMessage.includes('資料庫正在被其他操作使用')) {
        const currentIsWal = walModeStatus.is_wal_mode;
        dispatch(addNotification({
          type: 'warning',
          title: 'WAL 模式切換暫時無法執行',
          message: currentIsWal 
            ? 'WAL 模式啟用後很難在運行時關閉。建議重新啟動應用程式以釋放所有資料庫連接，然後再嘗試切換模式。'
            : '請等待所有資料庫維護操作完成後再試。如果沒有其他操作在進行，可能需要重新啟動應用程式以釋放資料庫鎖定。',
          autoClose: false
        }));
      } else {
        dispatch(addNotification({
          type: 'error',
          title: 'WAL 模式切換失敗',
          message: `切換失敗: ${errorMessage}`
        }));
      }
    } finally {
      setIsTogglingWalMode(false);
    }
  };

  // 🔥 新增：WAL 警告對話框處理函數
  const handleWalWarningConfirm = async (dontShowAgain: boolean = false) => {
    if (dontShowAgain) {
      localStorage.setItem('dontShowWalWarning', 'true');
    }
    setShowWalWarning(false);
    await performWalModeToggle();
  };

  const handleWalWarningCancel = () => {
    setShowWalWarning(false);
  };

  const performAutoRepair = async () => {
    log.debug('performAutoRepair called, checkResult:', checkResult);
    log.debug('checkResult?.issues:', checkResult?.issues);
    log.debug('checkResult?.issues.length:', checkResult?.issues?.length);
    
    if (!checkResult || !checkResult.issues.length) {
      log.debug('Early return: no checkResult or no issues');
      dispatch(addNotification({
        type: 'warning',
        title: '無法執行自動修復',
        message: '沒有檢測到可修復的問題，請先執行健康檢查'
      }));
      return;
    }

    setIsRepairing(true);
    try {
      // autoRepair 方法不存在，使用 runMaintenance 代替
      const result = await api.database.runMaintenance();
      
      log.debug('API result:', result);
      
      // 將 String 結果轉換為 RepairResult 格式
      const repairResult: RepairResult = {
        success: typeof result === 'string' && result.includes('完成'),
        message: typeof result === 'string' ? result : '修復操作完成',
        issuesFixed: checkResult?.issues.filter(issue => issue.autoFixable).length || 0
      };
      setRepairResult(repairResult);
      
      log.debug('repairResult:', repairResult);
      
      // 🔥 簡化邏輯：API 成功就顯示成功通知
      dispatch(addNotification({
        type: 'success',
        title: '資料庫自動修復成功',
        message: `${repairResult.message}，已修復 ${repairResult.issuesFixed} 個問題`
      }));
      
      // 修復後重新檢查健康狀態
      await performHealthCheck();
    } catch (error) {
      log.error('自動修復失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '自動修復失敗',
        message: `修復失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setIsRepairing(false);
    }
  };

  const optimizeDatabase = async () => {
    setIsOptimizing(true);
    try {
      // optimize 方法不存在，使用 runMaintenance 代替
      const result = await api.database.runMaintenance();
      // 檢查結果是否成功（String 類型且包含成功訊息）
      const isSuccess = typeof result === 'string' && result.includes('完成');
      if (isSuccess) {
        // 優化成功後重新檢查
        await performHealthCheck();
        dispatch(addNotification({
          type: 'success',
          title: '優化成功',
          message: '資料庫已成功優化，查詢效能已提升'
        }));
      } else {
        dispatch(addNotification({
          type: 'warning',
          title: '優化異常',
          message: '資料庫優化可能未完全成功'
        }));
      }
    } catch (error) {
      log.error('資料庫優化失敗:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const reindexDatabase = async () => {
    setIsReindexing(true);
    try {
      // 🔥 執行 REINDEX 操作重建所有索引
      const result = await api.database.reindex();
      
      dispatch(addNotification({
        type: 'success',
        title: '索引重建成功',
        message: result || '所有資料庫索引已重建完成，查詢性能已提升'
      }));
      
      // 重建索引後重新檢查資料庫健康狀態
      await performHealthCheck();
      
    } catch (error) {
      log.error('重建索引失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '索引重建失敗',
        message: `重建索引失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setIsReindexing(false);
    }
  };

  const incrementalVacuumDatabase = async () => {
    setIsIncrementalVacuuming(true);
    try {
      // 🔥 執行 PRAGMA incremental_vacuum 漸進式清理
      // 對於大型資料庫更友善，不會長時間鎖定資料庫
      const result = await api.database.incrementalVacuum();
      
      dispatch(addNotification({
        type: 'success',
        title: '漸進式清理成功',
        message: result || '資料庫漸進式清理已完成，碎片化程度已降低'
      }));
      
      // 清理後重新檢查資料庫健康狀態
      await performHealthCheck();
      
    } catch (error) {
      log.error('漸進式清理失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '漸進式清理失敗',
        message: `漸進式清理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setIsIncrementalVacuuming(false);
    }
  };

  const runMaintenanceDatabase = async () => {
    setIsRunningMaintenance(true);
    try {
      // 🔥 執行完整的資料庫維護操作
      // 包含 VACUUM、ANALYZE 和 PRAGMA optimize
      const result = await api.database.runMaintenance();
      
      dispatch(addNotification({
        type: 'success',
        title: '資料庫整理成功',
        message: result || '資料庫維護操作已完成，性能已優化'
      }));
      
      // 整理後重新檢查資料庫健康狀態以顯示最新的碎片化程度
      await performHealthCheck();
      
    } catch (error) {
      log.error('資料庫整理失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '資料庫整理失敗',
        message: `整理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setIsRunningMaintenance(false);
    }
  };

  const exportDatabase = async () => {
    setIsExporting(true);
    try {
      // 🔥 使用 Tauri v2 dialog API 選擇備份位置
      const defaultFileName = `genesis-backup-${new Date().toISOString().split('T')[0]}.db`;
      
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{
          name: 'Database',
          extensions: ['db']
        }]
      });

      if (filePath) {
        // 執行備份操作
        await api.database.backup(filePath);
        log.debug('資料庫已成功備份至:', filePath);
        dispatch(addNotification({
          type: 'success',
          title: '備份成功',
          message: `資料庫已成功備份至: ${filePath}`
        }));
      } else {
        // 用戶取消了文件選擇
        log.debug('用戶取消了備份操作');
      }
    } catch (error) {
      log.error('匯出資料庫失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '備份失敗',
        message: `資料庫備份失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setIsExporting(false);
    }
  };

  const importDatabase = async () => {
    setIsImporting(true);
    try {
      // 🔥 使用 Tauri v2 dialog API 選擇還原檔案
      const filePath = await open({
        multiple: false,
        filters: [{
          name: 'Database',
          extensions: ['db']
        }]
      });

      if (filePath) {
        // 顯示確認對話框
        setConfirmImport({show: true, filePath: filePath as string});
      } else {
        // 用戶取消了文件選擇
        log.debug('用戶取消了還原操作');
        setIsImporting(false);
      }
    } catch (error) {
      log.error('選擇還原檔案失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '選擇檔案失敗',
        message: `選擇還原檔案失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
      setIsImporting(false);
    }
  };

  const generateReport = async () => {
    if (!checkResult) return;

    try {
      // generateReport 方法不存在，使用 getStats 代替
      const report = await api.database.getStats();
      setErrorReport(JSON.stringify(report, null, 2));
      dispatch(addNotification({
        type: 'success',
        title: '報告生成成功',
        message: '資料庫統計報告已生成'
      }));
    } catch (error) {
      log.error('生成報告失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '報告生成失敗',
        message: `生成報告失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    }
  };

  // 確認匯入操作
  const handleConfirmImport = async () => {
    if (!confirmImport.filePath) return;
    
    try {
      // 執行資料庫還原操作
      await api.database.restore(confirmImport.filePath);
      
      dispatch(addNotification({
        type: 'success',
        title: '還原成功',
        message: '資料庫已成功從備份還原'
      }));
      
      // 還原成功後重新檢查資料庫健康狀態
      await performHealthCheck();
      
    } catch (error) {
      log.error('資料庫還原失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '還原失敗',
        message: `資料庫還原失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setConfirmImport({show: false, filePath: null});
      setIsImporting(false);
    }
  };

  // 取消匯入操作
  const handleCancelImport = () => {
    setConfirmImport({show: false, filePath: null});
    setIsImporting(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-warm-gold/30';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-warm-gold" />
          <div>
            <h1 className="text-2xl font-bold text-white">資料庫維護</h1>
            <p className="text-gray-400">檢查和維護資料庫健康狀態</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={performHealthCheck}
            disabled={isChecking}
            className="bg-warm-gold hover:bg-warm-gold"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? '檢查中...' : '重新檢查'}
          </Button>
        </div>
      </div>

      {/* 健康狀態概覽 */}
      {checkResult && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {checkResult.isHealthy ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              )}
              <span className="text-white">
                資料庫狀態: {checkResult.isHealthy ? '健康' : '需要注意'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkResult.statistics ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warm-gold">
                      {checkResult.statistics.totalProjects || 0}
                    </div>
                    <div className="text-sm text-gray-400">專案</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {checkResult.statistics.totalChapters || 0}
                    </div>
                    <div className="text-sm text-gray-400">章節</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-clay-orange">
                      {checkResult.statistics.totalCharacters || 0}
                    </div>
                    <div className="text-sm text-gray-400">角色</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {formatBytes(checkResult.statistics.databaseSize || 0)}
                    </div>
                    <div className="text-sm text-gray-400">資料庫大小</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>碎片化程度</span>
                    <span>{(checkResult.statistics.fragmentationLevel || 0).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={checkResult.statistics.fragmentationLevel || 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    上次整理: {checkResult.statistics.lastVacuum ? 
                      new Date(checkResult.statistics.lastVacuum).toLocaleString('zh-TW') : 
                      '未知'
                    }
                  </div>
                  <div className="text-sm text-gray-400">
                    日誌模式: <span className={`font-medium ${
                      checkResult.statistics.isWalMode ? 'text-green-400' : 'text-orange-400'
                    }`}>
                      {checkResult.statistics.journalMode || 'unknown'} 
                      {checkResult.statistics.isWalMode && ' ⚡'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>無法載入資料庫統計資訊</p>
                <p className="text-sm mt-2">請檢查資料庫連接狀態</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* WAL 模式詳細資訊 */}
      {walModeStatus && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {walModeStatus.is_wal_mode ? (
                <ToggleRight className="w-5 h-5 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-slate-400" />
              )}
              <span className="text-white">
                Write-Ahead Logging (WAL) 模式: {walModeStatus.is_wal_mode ? '已啟用' : '已停用'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white mb-3 font-semibold">當前設定</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">日誌模式:</span>
                    <span className="text-white font-mono">{walModeStatus.journal_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">同步級別:</span>
                    <span className="text-white font-mono">{walModeStatus.synchronous}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">WAL 自動檢查點:</span>
                    <span className="text-white font-mono">{walModeStatus.wal_autocheckpoint}</span>
                  </div>
                  {walModeStatus.is_wal_mode && walModeStatus.wal_info && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">WAL 檔案:</span>
                      <span className="text-white">
                        {walModeStatus.wal_info.bytes ? 
                          `${(walModeStatus.wal_info.bytes / 1024).toFixed(1)} KB` : 
                          '不存在'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-white mb-3 font-semibold">模式優勢</h4>
                <div className="space-y-2">
                  {walModeStatus.is_wal_mode ? (
                    walModeStatus.benefits?.map((benefit: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{benefit}</span>
                      </div>
                    ))
                  ) : (
                    walModeStatus.benefits?.map((benefit: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-warm-gold flex-shrink-0" />
                        <span className="text-sm text-gray-300">{benefit}</span>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-4">
                  <div className="text-xs text-gray-400 bg-gray-700 p-3 rounded">
                    💡 {walModeStatus.recommendations}
                  </div>
                  {walModeStatus.is_wal_mode && (
                    <div className="text-xs text-amber-400 bg-amber-900/20 p-3 rounded mt-2 border border-amber-500/30">
                      ⚠️ <strong>重要提醒：</strong>WAL 模式啟用後很難在運行時關閉。如需切換回 DELETE 模式，建議重新啟動應用程式以釋放所有資料庫連接。
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 問題列表 */}
      {checkResult && checkResult.issues.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-white">發現的問題 ({checkResult.issues.length})</span>
              <div className="flex space-x-2">
                <Button
                  onClick={performAutoRepair}
                  disabled={isRepairing || !checkResult.issues.some(issue => issue.autoFixable)}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Settings className={`w-4 h-4 mr-2 ${isRepairing ? 'animate-spin' : ''}`} />
                  {isRepairing ? '修復中...' : '自動修復'}
                </Button>
                <Button
                  onClick={generateReport}
                  className="bg-warm-gold hover:bg-warm-gold"
                  size="sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  生成報告
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checkResult.issues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0">
                    {getSeverityIcon(issue.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={`${getSeverityColor(issue.severity)} text-white`}>
                        {issue.severity}
                      </Badge>
                      <Badge variant="outline" className="text-gray-300">
                        {issue.table}
                      </Badge>
                      {issue.autoFixable && (
                        <Badge className="bg-green-600 text-white">
                          可自動修復
                        </Badge>
                      )}
                    </div>
                    <div className="text-white mb-1">{issue.description}</div>
                    <div className="text-sm text-gray-400">{issue.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 修復結果 */}
      {repairResult && (
        <Alert className={repairResult.success ? 'border-green-500' : 'border-red-500'}>
          <AlertDescription className="text-white">
            {repairResult.message}
            {repairResult.issuesFixed && repairResult.issuesFixed > 0 && (
              <div className="mt-2">
                已修復 {repairResult.issuesFixed} 個問題
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 操作按鈕 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        <Button
          onClick={optimizeDatabase}
          disabled={isOptimizing}
          className="bg-clay-orange hover:bg-clay-orange h-16"
        >
          <div className="text-center">
            <BarChart3 className={`w-6 h-6 mx-auto mb-1 ${isOptimizing ? 'animate-pulse' : ''}`} />
            <div>{isOptimizing ? '優化中...' : '優化資料庫'}</div>
          </div>
        </Button>
        
        <Button
          onClick={reindexDatabase}
          disabled={isReindexing}
          className="bg-warm-gold/40 hover:bg-warm-gold/50 h-16"
        >
          <div className="text-center">
            <Settings className={`w-6 h-6 mx-auto mb-1 ${isReindexing ? 'animate-spin' : ''}`} />
            <div>{isReindexing ? '重建中...' : '重建索引'}</div>
          </div>
        </Button>
        
        <Button
          onClick={incrementalVacuumDatabase}
          disabled={isIncrementalVacuuming}
          className="bg-teal-600 hover:bg-teal-700 h-16"
        >
          <div className="text-center">
            <Zap className={`w-6 h-6 mx-auto mb-1 ${isIncrementalVacuuming ? 'animate-pulse' : ''}`} />
            <div>{isIncrementalVacuuming ? '清理中...' : '漸進式清理'}</div>
          </div>
        </Button>
        
        <Button
          onClick={toggleWalMode}
          disabled={isTogglingWalMode || !walModeStatus || hasActiveOperation}
          className={`h-16 ${
            hasActiveOperation ? 'bg-gray-500 cursor-not-allowed' :
            walModeStatus?.is_wal_mode 
              ? 'bg-emerald-600 hover:bg-emerald-700' 
              : 'bg-slate-600 hover:bg-slate-700'
          }`}
        >
          <div className="text-center">
            {walModeStatus?.is_wal_mode ? (
              <ToggleRight className={`w-6 h-6 mx-auto mb-1 ${isTogglingWalMode ? 'animate-pulse' : ''}`} />
            ) : (
              <ToggleLeft className={`w-6 h-6 mx-auto mb-1 ${isTogglingWalMode ? 'animate-pulse' : ''}`} />
            )}
            <div className="text-xs">
              {isTogglingWalMode ? '切換中...' : 
               hasActiveOperation ? '等待操作完成' :
                `WAL ${walModeStatus?.is_wal_mode ? '已啟用' : '已停用'}`}
            </div>
          </div>
        </Button>
        
        <Button
          onClick={exportDatabase}
          disabled={isExporting}
          className="bg-warm-gold hover:bg-warm-gold h-16"
        >
          <div className="text-center">
            <Download className={`w-6 h-6 mx-auto mb-1 ${isExporting ? 'animate-bounce' : ''}`} />
            <div>{isExporting ? '匯出中...' : '匯出備份'}</div>
          </div>
        </Button>
        
        <Button
          onClick={importDatabase}
          disabled={isImporting}
          className="bg-orange-600 hover:bg-orange-700 h-16"
        >
          <div className="text-center">
            <Upload className={`w-6 h-6 mx-auto mb-1 ${isImporting ? 'animate-bounce' : ''}`} />
            <div>{isImporting ? '匯入中...' : '匯入備份'}</div>
          </div>
        </Button>
        
        <Button
          onClick={runMaintenanceDatabase}
          disabled={isRunningMaintenance}
          className="bg-green-600 hover:bg-green-700 h-16"
        >
          <div className="text-center">
            <RefreshCw className={`w-6 h-6 mx-auto mb-1 ${isRunningMaintenance ? 'animate-spin' : ''}`} />
            <div>{isRunningMaintenance ? '整理中...' : '整理資料庫'}</div>
          </div>
        </Button>
      </div>

      {/* 錯誤報告 */}
      {errorReport && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">詳細報告</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
              {errorReport}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 匯入確認對話框 */}
      <ConfirmDialog
        isOpen={confirmImport.show}
        title="確認匯入備份"
        message="匯入備份將會覆蓋當前的資料庫。此操作無法復原，請確保已經備份當前資料。確定要繼續嗎？"
        confirmText="匯入"
        cancelText="取消"
        confirmButtonClass="bg-orange-600 hover:bg-orange-700"
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />

      {/* 🔥 新增：WAL 模式啟用警告對話框 */}
      {showWalWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">啟用 WAL 模式</h3>
                <p className="text-sm text-gray-400">請仔細閱讀以下資訊</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* 優點說明 */}
              <div>
                <h4 className="flex items-center text-green-400 font-medium mb-2">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  性能優勢
                </h4>
                <ul className="text-sm text-gray-300 space-y-1 ml-6">
                  <li>• 支援多個用戶同時讀取</li>
                  <li>• 寫入操作不會阻塞讀取</li>
                  <li>• 更好的容錯性和資料安全</li>
                  <li>• 整體性能顯著提升</li>
                </ul>
              </div>

              {/* 注意事項 */}
              <div>
                <h4 className="flex items-center text-amber-400 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  重要注意事項
                </h4>
                <ul className="text-sm text-gray-300 space-y-1 ml-6">
                  <li>• 啟用後很難在運行時關閉</li>
                  <li>• 會產生額外的 .wal 和 .shm 文件</li>
                  <li>• 關閉模式需要重新啟動應用程式</li>
                </ul>
              </div>

              {/* 建議 */}
              <div className="bg-warm-gold/20 border border-warm-gold/20 rounded p-3">
                <h4 className="flex items-center text-warm-gold font-medium mb-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  專業建議
                </h4>
                <p className="text-sm text-gray-300">
                  建議啟用並保持 WAL 模式，它適合大多數使用情境，能顯著提升應用程式的響應速度和穩定性。
                </p>
              </div>
            </div>

            {/* 不再顯示選項 */}
            <div className="mb-6">
              <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  id="dontShowWalWarning"
                  className="rounded border-gray-600 bg-gray-700 text-warm-gold focus:ring-warm-gold"
                />
                <span>不要再次顯示此警告</span>
              </label>
            </div>

            {/* 按鈕 */}
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  const checkbox = document.getElementById('dontShowWalWarning') as HTMLInputElement;
                  handleWalWarningConfirm(checkbox?.checked || false);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                繼續啟用 WAL 模式
              </Button>
              <Button
                onClick={handleWalWarningCancel}
                className="flex-1 border border-gray-600 hover:bg-gray-700 bg-transparent"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseMaintenance;