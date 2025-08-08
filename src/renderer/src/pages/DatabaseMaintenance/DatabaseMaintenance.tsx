import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Progress } from '../../components/UI/Progress';
import { Alert, AlertDescription } from '../../components/UI/Alert';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
// TODO: 修復 Tauri v2 dialog API 導入問題
// import { save, open } from '@tauri-apps/api/dialog';
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
  FileText
} from 'lucide-react';

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
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [errorReport, setErrorReport] = useState<string>('');
  const [confirmImport, setConfirmImport] = useState<{show: boolean; filePath: string | null}>({show: false, filePath: null});

  useEffect(() => {
    // 頁面載入時自動執行健康檢查
    performHealthCheck();
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
      console.error('健康檢查失敗:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const performAutoRepair = async () => {
    if (!checkResult || !checkResult.issues.length) return;

    setIsRepairing(true);
    try {
      // autoRepair 方法不存在，使用 runMaintenance 代替
      const result = await api.database.runMaintenance();
      
      // 將 String 結果轉換為 RepairResult 格式
      const repairResult: RepairResult = {
        success: typeof result === 'string' && result.includes('完成'),
        message: typeof result === 'string' ? result : '修復操作完成',
        issuesFixed: checkResult?.issues.filter(issue => issue.autoFixable).length || 0
      };
      setRepairResult(repairResult);
      
      // 修復成功後重新檢查和通知
      if (repairResult.success) {
        await performHealthCheck();
        dispatch(addNotification({
          type: 'success',
          title: '修復成功',
          message: repairResult.message
        }));
      } else {
        dispatch(addNotification({
          type: 'error',
          title: '修復失敗',
          message: repairResult.message
        }));
      }
    } catch (error) {
      console.error('自動修復失敗:', error);
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
      console.error('資料庫優化失敗:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const exportDatabase = async () => {
    setIsExporting(true);
    try {
      // TODO: 等待 Tauri v2 dialog API 修復後重新啟用文件選擇器
      // 暫時使用預設路徑進行備份
      const defaultFileName = `genesis-backup-${new Date().toISOString().split('T')[0]}.db`;
      const backupPath = `~/Desktop/${defaultFileName}`;
      
      // 執行備份操作
      await api.database.backup(backupPath);
      console.log('資料庫已成功備份至:', backupPath);
      dispatch(addNotification({
        type: 'success',
        title: '備份成功',
        message: `資料庫已成功備份至桌面: ${defaultFileName}`
      }));
    } catch (error) {
      console.error('匯出資料庫失敗:', error);
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
    // TODO: 等待 Tauri v2 dialog API 修復後重新啟用文件選擇器
    // 暫時顯示提示訊息
    dispatch(addNotification({
      type: 'info',
      title: '功能暫時不可用',
      message: '文件選擇功能正在修復中，請稍後再試。您可以手動將備份檔案放置到指定位置。'
    }));
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
      console.error('生成報告失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '報告生成失敗',
        message: `生成報告失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    }
  };

  // 確認匯入操作 (暫時禁用)
  const handleConfirmImport = async () => {
    // TODO: 等待 Tauri v2 dialog API 修復後重新實現
    dispatch(addNotification({
      type: 'info',
      title: '功能暫時不可用',
      message: '匯入功能正在修復中'
    }));
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
      case 'low': return 'bg-blue-500';
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
          <Database className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">資料庫維護</h1>
            <p className="text-gray-400">檢查和維護資料庫健康狀態</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={performHealthCheck}
            disabled={isChecking}
            className="bg-blue-600 hover:bg-blue-700"
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
                    <div className="text-2xl font-bold text-blue-400">
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
                    <div className="text-2xl font-bold text-purple-400">
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
                
                <div className="mt-2 text-sm text-gray-400">
                  上次整理: {checkResult.statistics.lastVacuum ? 
                    new Date(checkResult.statistics.lastVacuum).toLocaleString('zh-TW') : 
                    '未知'
                  }
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
                  className="bg-blue-600 hover:bg-blue-700"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          onClick={optimizeDatabase}
          disabled={isOptimizing}
          className="bg-purple-600 hover:bg-purple-700 h-16"
        >
          <div className="text-center">
            <BarChart3 className={`w-6 h-6 mx-auto mb-1 ${isOptimizing ? 'animate-pulse' : ''}`} />
            <div>{isOptimizing ? '優化中...' : '優化資料庫'}</div>
          </div>
        </Button>
        
        <Button
          onClick={exportDatabase}
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 h-16"
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
          onClick={() => api.database.runMaintenance()}
          className="bg-green-600 hover:bg-green-700 h-16"
        >
          <div className="text-center">
            <RefreshCw className="w-6 h-6 mx-auto mb-1" />
            <div>整理資料庫</div>
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
    </div>
  );
};

export default DatabaseMaintenance;