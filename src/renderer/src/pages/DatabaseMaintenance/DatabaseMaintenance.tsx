import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Progress } from '../../components/UI/Progress';
import { Alert, AlertDescription } from '../../components/UI/Alert';
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
  const [checkResult, setCheckResult] = useState<DatabaseCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [repairResult, setRepairResult] = useState<any>(null);
  const [errorReport, setErrorReport] = useState<string>('');

  useEffect(() => {
    // 頁面載入時自動執行健康檢查
    performHealthCheck();
  }, []);

  const performHealthCheck = async () => {
    setIsChecking(true);
    try {
      const result = await window.electronAPI.database.healthCheck();
      setCheckResult(result);
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
      const result = await window.electronAPI.database.autoRepair(checkResult.issues);
      setRepairResult(result);
      
      // 修復後重新檢查
      if (result.success) {
        await performHealthCheck();
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
      const result = await window.electronAPI.database.optimize();
      if (result.success) {
        // 優化後重新檢查
        await performHealthCheck();
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
      const result = await window.electronAPI.database.export();
      if (result.success) {
        // 顯示成功訊息
      }
    } catch (error) {
      console.error('匯出資料庫失敗:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const importDatabase = async () => {
    setIsImporting(true);
    try {
      const result = await window.electronAPI.database.import();
      if (result.success) {
        // 匯入後重新檢查
        await performHealthCheck();
      }
    } catch (error) {
      console.error('匯入資料庫失敗:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const generateReport = async () => {
    if (!checkResult) return;

    try {
      const report = await window.electronAPI.database.generateReport(checkResult);
      setErrorReport(report);
    } catch (error) {
      console.error('生成報告失敗:', error);
    }
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {checkResult.statistics.totalProjects}
                </div>
                <div className="text-sm text-gray-400">專案</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {checkResult.statistics.totalChapters}
                </div>
                <div className="text-sm text-gray-400">章節</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {checkResult.statistics.totalCharacters}
                </div>
                <div className="text-sm text-gray-400">角色</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {formatBytes(checkResult.statistics.databaseSize)}
                </div>
                <div className="text-sm text-gray-400">資料庫大小</div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>碎片化程度</span>
                <span>{checkResult.statistics.fragmentationLevel.toFixed(1)}%</span>
              </div>
              <Progress 
                value={checkResult.statistics.fragmentationLevel} 
                className="h-2"
              />
            </div>
            
            <div className="mt-2 text-sm text-gray-400">
              上次整理: {checkResult.statistics.lastVacuum ? 
                new Date(checkResult.statistics.lastVacuum).toLocaleString('zh-TW') : 
                '未知'
              }
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
            {repairResult.fixedIssues.length > 0 && (
              <div className="mt-2">
                已修復 {repairResult.fixedIssues.length} 個問題
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
          onClick={() => window.electronAPI.database.vacuum()}
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
    </div>
  );
};

export default DatabaseMaintenance;