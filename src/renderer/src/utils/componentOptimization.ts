/**
 * React 組件記憶化優化工具
 * 提供 HOC 和 hooks 來優化組件性能
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { shallowEqual, useSelector } from 'react-redux';

// 深度比較函數（僅用於必要時）
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  // 安全類型斷言：已確認 a 和 b 都是非空對象
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }

  return true;
}

// 智能記憶化比較函數
export function smartMemoCompare<T extends Record<string, unknown>>(
  prevProps: T, 
  nextProps: T
): boolean {
  // 快速淺比較
  if (shallowEqual(prevProps, nextProps)) return true;

  // 檢查關鍵屬性
  const criticalProps = ['data', 'characters', 'chapters', 'analysisResult'];
  for (const prop of criticalProps) {
    if (prop in prevProps || prop in nextProps) {
      if (!deepEqual(prevProps[prop], nextProps[prop])) {
        console.log(`🔄 [組件優化] ${prop} 屬性變更，需要重新渲染`); // TODO: 複雜模式，需人工轉換
        return false;
      }
    }
  }

  return true;
}

// HOC：智能記憶化組件
export function withSmartMemo<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  customCompare?: (prevProps: P, nextProps: P) => boolean
) {
  const MemorizedComponent = React.memo(Component, customCompare || smartMemoCompare);
  MemorizedComponent.displayName = `withSmartMemo(${Component.displayName || Component.name})`;
  
  if (process.env.NODE_ENV === 'development') {
    // 開發環境下添加重新渲染計數器 (簡化版)
    console.log(`🎭 [${Component.displayName || Component.name}] 已應用記憶化優化`); // TODO: 複雜模式，需人工轉換
  }
  
  return MemorizedComponent;
}

// Hook：優化的 useSelector，使用淺比較
export function useOptimizedSelector<TState, TResult>(selector: (state: TState) => TResult): TResult {
  return useSelector(selector, shallowEqual);
}

// Hook：穩定的回調函數
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);

  // 檢查依賴是否變化
  const depsChanged = useMemo(() => {
    if (deps.length !== depsRef.current.length) return true;
    return deps.some((dep, index) => dep !== depsRef.current[index]);
  }, [deps]);

  if (depsChanged) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback((...args: unknown[]) => callbackRef.current(...args), []) as T;
}

// Hook：防抖 Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook：節流 Hook
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const callbackRef = useRef(callback);
  
  // 更新回調引用
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callbackRef.current(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [delay] // 只依賴 delay，callback 通過 ref 訪問
  );
}

// Hook：虛擬滾動優化
export function useVirtualization<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  return {
    visibleItems,
    visibleRange,
    totalHeight: items.length * itemHeight,
    setScrollTop,
  };
}

// Hook：組件掛載狀態
export function useIsMounted(): React.MutableRefObject<boolean> {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

// Hook：前一個值
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// 性能監控 HOC (簡化版)
export function withPerformanceTracking<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  trackingName?: string
) {
  const WrappedComponent: React.FC<P> = (props) => {
    const componentName = trackingName || Component.displayName || Component.name;
    const renderStartTime = useRef<number>();
    const renderCount = useRef(0);

    // 記錄渲染開始時間
    renderStartTime.current = performance.now();
    renderCount.current++;

    useEffect(() => {
      // 記錄渲染完成時間
      const renderTime = performance.now() - (renderStartTime.current || 0);
      
      if (renderTime > 16) {
        console.warn(`⚠️ [性能追蹤] ${componentName} 渲染時間較長: ${renderTime.toFixed(2)}ms (第${renderCount.current}次渲染)`); // TODO: 複雜模式，需人工轉換
      }
      
      if (process.env.NODE_ENV === 'development' && renderCount.current % 10 === 0) {
        console.log(`📊 [性能追蹤] ${componentName} 已渲染 ${renderCount.current} 次`); // TODO: 複雜模式，需人工轉換
      }
    });

    return React.createElement(Component, props);
  };
  
  WrappedComponent.displayName = `withPerformanceTracking(${trackingName || Component.displayName || Component.name})`;
  return WrappedComponent;
}

// 批量狀態更新工具
export function useBatchUpdates() {
  const updatesRef = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updateFn: () => void) => {
    updatesRef.current.push(updateFn);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const updates = [...updatesRef.current];
      updatesRef.current = [];
      updates.forEach(update => update());
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return batchUpdate;
}

// 導出性能統計
export const getOptimizationStats = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      timestamp: Date.now(),
      message: '組件優化統計可在瀏覽器 DevTools 中查看詳細日誌'
    };
  }
  return null;
};