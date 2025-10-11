/**
 * 性能基準測試工具
 * 專門用於測試 Genesis Chronicle 關鍵組件的性能基準
 */

import { performanceMonitor } from './performanceMonitor';
import { createLogger } from './/logger';

// 創建模組專用 logger
const log = createLogger('performanceBenchmark');

// 關鍵組件列表
const CRITICAL_COMPONENTS = [
  'CharacterAnalysisPanel',
  'BatchIllustrationPanel',
  'SlateEditor',
  'PersonalityRadarChart',
  'EmotionTrendChart',
  'ConsistencyScoreChart',
  'Dashboard',
  'ProjectEditor'
];

// 性能基準標準
const PERFORMANCE_BENCHMARKS = {
  // 渲染時間基準（毫秒）
  renderTime: {
    excellent: 8,    // 優秀：< 8ms
    good: 16,        // 良好：< 16ms (一幀時間)
    acceptable: 32,  // 可接受：< 32ms
    poor: 100        // 差：> 100ms
  },
  // 記憶體使用基準（MB）
  memoryUsage: {
    low: 50,         // 低：< 50MB
    medium: 100,     // 中等：< 100MB
    high: 200,       // 高：< 200MB
    critical: 500    // 危險：> 500MB
  },
  // 渲染頻率基準（次數/分鐘）
  renderFrequency: {
    low: 10,         // 低頻：< 10次/分鐘
    medium: 30,      // 中頻：< 30次/分鐘
    high: 60,        // 高頻：< 60次/分鐘
    excessive: 120   // 過度：> 120次/分鐘
  }
};

/**
 * 性能基準測試類
 */
export class PerformanceBenchmark {
  private testResults: Map<string, unknown> = new Map();
  private startTime: number = 0;

  /**
   * 開始基準測試
   */
  startBenchmark() {
    log.debug('🏁 開始 Genesis Chronicle 性能基準測試...');
    this.startTime = performance.now();
    
    // 清除之前的指標
    performanceMonitor.clearMetrics();
    
    // 設置測試環境
    this.setupTestEnvironment();
    
    log.debug('📊 基準測試已啟動，請與應用程式互動以收集性能資料...');
    log.debug('💡 建議操作：');
    log.debug('  1. 打開角色分析面板');
    log.debug('  2. 切換不同的分析標籤');
    log.debug('  3. 開啟 AI 插畫生成面板');
    log.debug('  4. 在 Slate.js 編輯器中編輯文字');
    log.debug('  5. 查看統計圖表');
    
    return this;
  }

  /**
   * 設置測試環境
   */
  private setupTestEnvironment() {
    // 在控制台添加快捷指令
    if (typeof window !== 'undefined') {
      (window as Window & { __BENCHMARK__?: unknown }).__BENCHMARK__ = {
        start: () => this.startBenchmark(),
        stop: () => this.stopBenchmark(),
        report: () => this.generateReport(),
        export: () => this.exportResults()
      };
      
      log.debug('🛠️ 基準測試指令已安裝：');
      log.debug('  __BENCHMARK__.start() - 開始測試');
      log.debug('  __BENCHMARK__.stop() - 停止測試');  
      log.debug('  __BENCHMARK__.report() - 產生報告');
      log.debug('  __BENCHMARK__.export() - 導出結果');
    }
  }

  /**
   * 停止基準測試並生成報告
   */
  stopBenchmark() {
    const testDuration = performance.now() - this.startTime;
    log.debug(`⏱️ 基準測試完成，總時長: ${(testDuration / 1000).toFixed(2)}秒`);
    
    return this.generateReport();
  }

  /**
   * 生成性能基準報告
   */
  generateReport() {
    log.debug('📈 生成 Genesis Chronicle 性能基準報告...');
    
    const metrics = performanceMonitor.getPerformanceReport();
    const memoryUsage = this.getMemoryUsage();
    const issues = performanceMonitor.detectPerformanceIssues();
    
    // 分析關鍵組件性能
    const criticalComponentsAnalysis = this.analyzeCriticalComponents(metrics);
    
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: (performance.now() - this.startTime) / 1000,
      totalComponents: metrics.length,
      criticalComponents: criticalComponentsAnalysis,
      performanceIssues: issues,
      memoryUsage,
      recommendations: this.generateRecommendations(metrics, issues),
      detailedMetrics: metrics
    };

    log.debug('🎯 關鍵組件性能分析:');
    console.table(criticalComponentsAnalysis);
    
    if (issues.length > 0) {
      log.warn('⚠️ 發現的性能問題:');
      issues.forEach(issue => log.warn(`  • ${issue}`));
    } else {
      log.debug('✅ 未發現明顯的性能問題');
    }
    
    log.debug('💡 性能優化建議:');
    report.recommendations.forEach(rec => 
      log.debug(`  ${rec.priority === 'high' ? '🚨' : rec.priority === 'medium' ? '⚠️' : 'ℹ️'} ${rec.message}`)
    );

    return report;
  }

  /**
   * 分析關鍵組件性能
   */
  private analyzeCriticalComponents(metrics: unknown[]) {
    return CRITICAL_COMPONENTS.map(componentName => {
      const metric = metrics.find(m => 
        typeof m === 'object' && m !== null && 
        'componentName' in m && 
        (m as { componentName: unknown }).componentName === componentName
      );
      
      if (!metric) {
        return {
          component: componentName,
          status: '未測試',
          renderTime: 'N/A',
          renderCount: 0,
          rating: 'unknown'
        };
      }
      
      // 類型守衛確保 metric 具有必要的屬性
      const averageRenderTime = typeof metric === 'object' && metric !== null && 'averageRenderTime' in metric && typeof (metric as { averageRenderTime: unknown }).averageRenderTime === 'number' 
        ? (metric as { averageRenderTime: number }).averageRenderTime 
        : 0;
      const renderCount = typeof metric === 'object' && metric !== null && 'renderCount' in metric && typeof (metric as { renderCount: unknown }).renderCount === 'number' 
        ? (metric as { renderCount: number }).renderCount 
        : 0;
      
      const rating = this.getRatingForRenderTime(averageRenderTime);
      const frequencyRating = this.getRatingForFrequency(renderCount);
      
      return {
        component: componentName,
        status: '已測試',
        renderTime: `${averageRenderTime.toFixed(2)}ms`,
        renderCount: renderCount,
        rating,
        frequencyRating,
        needsOptimization: rating === 'poor' || frequencyRating === 'excessive'
      };
    });
  }

  /**
   * 根據渲染時間評級
   */
  private getRatingForRenderTime(renderTime: number): string {
    if (renderTime < PERFORMANCE_BENCHMARKS.renderTime.excellent) return 'excellent';
    if (renderTime < PERFORMANCE_BENCHMARKS.renderTime.good) return 'good';
    if (renderTime < PERFORMANCE_BENCHMARKS.renderTime.acceptable) return 'acceptable';
    return 'poor';
  }

  /**
   * 根據渲染頻率評級
   */
  private getRatingForFrequency(renderCount: number): string {
    const perMinute = renderCount / ((performance.now() - this.startTime) / 60000);
    
    if (perMinute < PERFORMANCE_BENCHMARKS.renderFrequency.low) return 'low';
    if (perMinute < PERFORMANCE_BENCHMARKS.renderFrequency.medium) return 'medium';
    if (perMinute < PERFORMANCE_BENCHMARKS.renderFrequency.high) return 'high';
    return 'excessive';
  }

  /**
   * 生成優化建議
   */
  private generateRecommendations(metrics: unknown[], _issues: string[]) {
    const recommendations: Array<{priority: string; message: string}> = [];
    
    // 檢查慢組件
    const slowComponents = metrics.filter(m => 
      typeof m === 'object' && m !== null && 
      'averageRenderTime' in m && 
      typeof (m as { averageRenderTime: unknown }).averageRenderTime === 'number' &&
      (m as { averageRenderTime: number }).averageRenderTime > 16
    );
    if (slowComponents.length > 0) {
      recommendations.push({
        priority: 'high',
        message: `優先優化渲染緩慢的組件: ${slowComponents.map(c => (c as { componentName: string }).componentName).join(', ')}`
      });
    }
    
    // 檢查頻繁渲染
    const frequentComponents = metrics.filter(m => 
      typeof m === 'object' && m !== null && 
      'renderCount' in m && 
      typeof (m as { renderCount: unknown }).renderCount === 'number' &&
      (m as { renderCount: number }).renderCount > 50
    );
    if (frequentComponents.length > 0) {
      recommendations.push({
        priority: 'medium',
        message: `考慮使用 React.memo 或 useMemo 優化頻繁渲染的組件: ${frequentComponents.map(c => (c as { componentName: string }).componentName).join(', ')}`
      });
    }
    
    // 檢查圖表組件
    const chartComponents = metrics.filter(m => 
      typeof m === 'object' && m !== null && 
      'componentName' in m && 
      typeof (m as { componentName: unknown }).componentName === 'string' &&
      (m as { componentName: string }).componentName.includes('Chart')
    );
    if (chartComponents.some(c => 
      typeof c === 'object' && c !== null && 
      'averageRenderTime' in c && 
      typeof (c as { averageRenderTime: unknown }).averageRenderTime === 'number' &&
      (c as { averageRenderTime: number }).averageRenderTime > 32
    )) {
      recommendations.push({
        priority: 'medium',
        message: '圖表組件渲染較慢，考慮實現資料虛擬化或延遲載入'
      });
    }
    
    // 檢查編輯器組件
    const editorMetric = metrics.find(m => 
      typeof m === 'object' && m !== null && 
      'componentName' in m && 
      (m as { componentName: unknown }).componentName === 'SlateEditor'
    );
    if (editorMetric && 
        typeof editorMetric === 'object' && editorMetric !== null &&
        'averageRenderTime' in editorMetric && 
        typeof (editorMetric as { averageRenderTime: unknown }).averageRenderTime === 'number' &&
        (editorMetric as { averageRenderTime: number }).averageRenderTime > 16) {
      recommendations.push({
        priority: 'high',
        message: 'Slate.js 編輯器性能需要優化，考慮減少不必要的重新渲染'
      });
    }
    
    // 通用建議
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        message: '組件性能良好，可以考慮進一步的程式碼分割和懶載入優化'
      });
    }
    
    return recommendations;
  }

  /**
   * 獲取記憶體使用情況
   */
  private getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        
        return {
          used: `${usedMB.toFixed(1)}MB`,
          total: `${totalMB.toFixed(1)}MB`,
          limit: `${limitMB.toFixed(1)}MB`,
          usage: `${((usedMB / limitMB) * 100).toFixed(1)}%`,
          rating: this.getRatingForMemoryUsage(usedMB)
        };
      }
    }
    return null;
  }

  /**
   * 根據記憶體使用量評級
   */
  private getRatingForMemoryUsage(usedMB: number): string {
    if (usedMB < PERFORMANCE_BENCHMARKS.memoryUsage.low) return 'low';
    if (usedMB < PERFORMANCE_BENCHMARKS.memoryUsage.medium) return 'medium';  
    if (usedMB < PERFORMANCE_BENCHMARKS.memoryUsage.high) return 'high';
    return 'critical';
  }

  /**
   * 導出測試結果
   */
  exportResults() {
    const report = this.generateReport();
    const exportData = JSON.stringify(report, null, 2);
    
    // 在瀏覽器中下載檔案
    if (typeof window !== 'undefined') {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genesis-chronicle-performance-report-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      log.debug('📁 性能報告已導出為 JSON 文件');
    }
    
    return exportData;
  }
}

// 創建全局基準測試實例
export const performanceBenchmark = new PerformanceBenchmark();

// 自動啟動基準測試（僅開發環境）
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    log.debug('🚀 自動啟動性能基準測試...');
    log.debug('💡 使用 __BENCHMARK__.stop() 查看結果');
    performanceBenchmark.startBenchmark();
  }, 2000);
}