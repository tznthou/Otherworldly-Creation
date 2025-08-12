/**
 * 性能日誌記錄系統
 * 整合所有性能監控數據並提供統一的日誌接口
 */

// import { performanceMonitor } from './performanceMonitor';

export interface PerformanceLog {
  timestamp: number;
  category: 'rendering' | 'navigation' | 'user-interaction' | 'api' | 'database';
  event: string;
  duration?: number;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

class PerformanceLogger {
  private logs: PerformanceLog[] = [];
  private maxLogs = 1000;
  
  // 記錄性能事件
  log(category: PerformanceLog['category'], event: string, options?: {
    duration?: number;
    metadata?: Record<string, any>;
    severity?: PerformanceLog['severity'];
  }) {
    const log: PerformanceLog = {
      timestamp: Date.now(),
      category,
      event,
      duration: options?.duration,
      metadata: options?.metadata,
      severity: options?.severity || 'info'
    };
    
    this.logs.push(log);
    
    // 限制日誌數量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // 在開發環境中輸出到控制台
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(log);
    }
  }
  
  // 獲取性能統計報告
  getPerformanceReport() {
    const now = Date.now();
    const last5Minutes = this.logs.filter(log => now - log.timestamp < 5 * 60 * 1000);
    
    const categoryCounts = last5Minutes.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const averageDurations = last5Minutes
      .filter(log => log.duration !== undefined)
      .reduce((acc, log) => {
        const cat = log.category;
        if (!acc[cat]) {
          acc[cat] = { total: 0, count: 0 };
        }
        acc[cat].total += log.duration!;
        acc[cat].count++;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
    
    const averages = Object.entries(averageDurations).reduce((acc, [cat, data]) => {
      acc[cat] = Math.round(data.total / data.count);
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEvents: last5Minutes.length,
      categoryBreakdown: categoryCounts,
      averageDurations: averages,
      warningCount: last5Minutes.filter(log => log.severity === 'warning').length,
      errorCount: last5Minutes.filter(log => log.severity === 'error').length
    };
  }
  
  // 清空日誌
  clearLogs() {
    this.logs = [];
  }
  
  // 輸出到控制台
  private outputToConsole(log: PerformanceLog) {
    const emoji = {
      'info': '📊',
      'warning': '⚠️',
      'error': '❌'
    }[log.severity];
    
    const duration = log.duration ? ` (${log.duration.toFixed(2)}ms)` : '';
    const metadata = log.metadata ? ` | ${JSON.stringify(log.metadata)}` : '';
    
    console.log(`${emoji} [性能] ${log.category.toUpperCase()}: ${log.event}${duration}${metadata}`);
  }
  
  // 導出日誌到 CSV
  exportToCsv(): string {
    const headers = ['timestamp', 'category', 'event', 'duration', 'severity', 'metadata'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.category,
      log.event,
      log.duration || '',
      log.severity,
      log.metadata ? JSON.stringify(log.metadata) : ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// 創建全局實例
export const performanceLogger = new PerformanceLogger();

// 整合現有的 performanceMonitor
export const integratePerformanceMonitoring = () => {
  // 監控頁面加載性能
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        performanceLogger.log('navigation', 'page-load', {
          duration: navigation.loadEventEnd - navigation.fetchStart,
          metadata: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            resourcesLoaded: navigation.loadEventStart - navigation.fetchStart
          }
        });
      }
    });
  }
};

// 輔助函數：測量函數執行時間
export const measureAsyncFunction = async <T>(
  name: string,
  category: PerformanceLog['category'],
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    performanceLogger.log(category, name, {
      duration,
      severity: duration > 100 ? 'warning' : 'info'
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceLogger.log(category, `${name} (failed)`, {
      duration,
      severity: 'error',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

// 輔助函數：測量同步函數執行時間
export const measureFunction = <T>(
  name: string,
  category: PerformanceLog['category'],
  fn: () => T
): T => {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    
    performanceLogger.log(category, name, {
      duration,
      severity: duration > 50 ? 'warning' : 'info'
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceLogger.log(category, `${name} (failed)`, {
      duration,
      severity: 'error',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

// 開發環境下自動啟用
if (process.env.NODE_ENV === 'development') {
  integratePerformanceMonitoring();
  
  // 每30秒輸出性能報告
  setInterval(() => {
    const report = performanceLogger.getPerformanceReport();
    if (report.totalEvents > 0) {
      console.group('📊 性能報告 (過去5分鐘)');
      console.log('總事件數:', report.totalEvents);
      console.log('分類統計:', report.categoryBreakdown);
      console.log('平均持續時間 (ms):', report.averageDurations);
      console.log('警告數:', report.warningCount);
      console.log('錯誤數:', report.errorCount);
      console.groupEnd();
    }
  }, 30000);
}