/**
 * 性能監控工具
 * 用於建立性能基準和監控應用程式的性能指標
 */

import React from 'react';
import { createLogger } from './/logger';

// 創建模組專用 logger
const log = createLogger('performanceMonitor');

// 性能指標接口
interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  timestamp: number;
}

// 性能監控器類
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private renderStartTimes: Map<string, number> = new Map();
  private enabled: boolean = false;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
    if (this.enabled) {
      this.setupPerformanceObserver();
      this.startPeriodicReporting();
      log.debug('🔍 性能監控器已啟動');
    }
  }

  /**
   * 設置 Performance Observer 監控長任務
   */
  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        // 監控長任務（超過50ms的任務）
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn(`⚠️ 檢測到長任務: ${entry.duration.toFixed(2)}ms`, { // TODO: 複雜模式，需人工轉換
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration
              });
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // 監控導航性能
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const navEntry = entry as PerformanceNavigationTiming;
            log.debug('📊 導航性能:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              totalTime: navEntry.loadEventEnd - navEntry.fetchStart
            });
          }
        });

        navigationObserver.observe({ entryTypes: ['navigation'] });

      } catch (error) {
        log.warn('Performance Observer 設置失敗:', error);
      }
    }
  }

  /**
   * 記錄組件開始渲染
   */
  startRender(componentName: string) {
    if (!this.enabled) return;
    
    this.renderStartTimes.set(componentName, performance.now());
  }

  /**
   * 記錄組件完成渲染
   */
  endRender(componentName: string) {
    if (!this.enabled) return;

    const startTime = this.renderStartTimes.get(componentName);
    if (!startTime) return;

    const renderTime = performance.now() - startTime;
    this.renderStartTimes.delete(componentName);

    // 更新或創建指標
    const existing = this.metrics.get(componentName);
    if (existing) {
      existing.renderCount++;
      existing.totalRenderTime += renderTime;
      existing.averageRenderTime = existing.totalRenderTime / existing.renderCount;
      existing.lastRenderTime = renderTime;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(componentName, {
        componentName,
        renderCount: 1,
        totalRenderTime: renderTime,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        timestamp: Date.now()
      });
    }

    // 如果渲染時間過長，發出警告
    if (renderTime > 16) {
      console.warn(`🚨 組件 "${componentName}" 渲染時間過長: ${renderTime.toFixed(2)}ms`); // TODO: 複雜模式，需人工轉換
    }
  }

  /**
   * 獲取性能報告
   */
  getPerformanceReport(): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime);
  }

  /**
   * 獲取最慢的組件
   */
  getSlowestComponents(count: number = 5): PerformanceMetrics[] {
    return this.getPerformanceReport().slice(0, count);
  }

  /**
   * 獲取渲染最頻繁的組件
   */
  getMostRenderedComponents(count: number = 5): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.renderCount - a.renderCount)
      .slice(0, count);
  }

  /**
   * 清除所有指標
   */
  clearMetrics() {
    this.metrics.clear();
    this.renderStartTimes.clear();
    log.debug('📊 性能指標已清除');
  }

  /**
   * 導出性能報告為JSON
   */
  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.getPerformanceReport(),
      summary: {
        totalComponents: this.metrics.size,
        slowestComponent: this.getSlowestComponents(1)[0],
        mostRenderedComponent: this.getMostRenderedComponents(1)[0]
      },
      memoryUsage: this.getMemoryUsage(),
      timing: this.getPageTiming()
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 獲取記憶體使用情況
   */
  private getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      if (memory) {
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
    }
    return null;
  }

  /**
   * 獲取頁面時序信息
   */
  private getPageTiming() {
    const timing = performance.timing;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      pageLoad: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domComplete - timing.navigationStart
    };
  }

  /**
   * 定期報告性能狀況
   */
  private startPeriodicReporting() {
    setInterval(() => {
      const report = this.getPerformanceReport();
      if (report.length > 0) {
        console.groupCollapsed('📊 性能報告 (最近60秒)');
        
        log.debug('🐌 最慢組件:', this.getSlowestComponents(3));
        log.debug('🔄 最頻繁渲染:', this.getMostRenderedComponents(3));
        
        const memoryUsage = this.getMemoryUsage();
        if (memoryUsage) {
          const usedMB = (memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1);
          console.log(`💾 記憶體使用: ${usedMB}MB`); // TODO: 複雜模式，需人工轉換
        }
        
        console.groupEnd();
      }
    }, 60000); // 每60秒報告一次
  }

  /**
   * 檢查是否有性能問題
   */
  detectPerformanceIssues(): string[] {
    const issues: string[] = [];
    const metrics = this.getPerformanceReport();

    // 檢查慢組件
    const slowComponents = metrics.filter(m => m.averageRenderTime > 16);
    if (slowComponents.length > 0) {
      issues.push(`發現 ${slowComponents.length} 個慢組件 (平均渲染時間 > 16ms)`);
    }

    // 檢查頻繁渲染
    const frequentComponents = metrics.filter(m => m.renderCount > 50);
    if (frequentComponents.length > 0) {
      issues.push(`發現 ${frequentComponents.length} 個頻繁渲染組件 (渲染次數 > 50)`);
    }

    // 檢查記憶體使用
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage && memoryUsage.usedJSHeapSize > memoryUsage.jsHeapSizeLimit * 0.8) {
      issues.push('記憶體使用量接近限制');
    }

    return issues;
  }
}

// 創建全局性能監控器實例
export const performanceMonitor = new PerformanceMonitor();

// React 組件性能監控 HOC (簡化版)
export function withPerformanceMonitoring<T extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
) {
  const MonitoredComponent: React.FC<T> = (props) => {
    React.useEffect(() => {
      performanceMonitor.startRender(componentName);
      
      return () => {
        performanceMonitor.endRender(componentName);
      };
    });

    return React.createElement(WrappedComponent, props);
  };

  MonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return MonitoredComponent;
}

// 導出到全局用於調試
if (typeof window !== 'undefined') {
  (window as Window & { __PERFORMANCE_MONITOR__?: unknown }).__PERFORMANCE_MONITOR__ = performanceMonitor;
  log.debug('🔍 性能監控器已掛載到 window.__PERFORMANCE_MONITOR__');
}

export default performanceMonitor;