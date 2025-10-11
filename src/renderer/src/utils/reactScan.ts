import { scan } from 'react-scan';
import { createLogger } from './/logger';

// 創建模組專用 logger
const log = createLogger('reactScan');

// React Scan 開發工具配置
export const initReactScan = () => {
  // 只在開發環境中啟用
  if (process.env.NODE_ENV === 'development') {
    log.debug('🔍 啟動 React Scan 性能分析工具...');
    
    scan({
      enabled: true,
      // 顯示工具列
      showToolbar: true,
      // 動畫速度設定為快速
      animationSpeed: 'fast',
      // 追蹤不必要的重新渲染
      trackUnnecessaryRenders: true,
      // 記錄渲染到控制台（謹慎使用，可能會影響性能）
      log: false,
      // 當檢測到渲染時的回調
      onRender: (fiber: unknown, renders: unknown[]) => {
        // 記錄長時間渲染的組件
        const renderTime = Array.isArray(renders) ? renders.reduce((total: number, render: unknown) => {
          const time = typeof render === 'object' && render !== null && 'time' in render ? (render as { time: unknown }).time : 0;
          return total + (typeof time === 'number' ? time : 0);
        }, 0) : 0;
        if (renderTime > 16) { // 超過一個幀的時間（16ms）
          const fiberType = typeof fiber === 'object' && fiber !== null && 'type' in fiber ? (fiber as { type: unknown }).type : null;
          const componentName = typeof fiberType === 'object' && fiberType !== null && 'name' in fiberType ? (fiberType as { name: unknown }).name : 'Unknown';
          log.warn(`⚠️ 組件 "${componentName}" 渲染時間較長: ${renderTime.toFixed(2)}ms`);
        }
      },
      // 當開始繪製輪廓時的回調
      onPaintStart: (outlines) => {
        if (outlines.length > 10) {
          log.warn(`⚠️ 同時渲染的組件過多: ${outlines.length} 個組件`);
        }
      },
    });

    log.debug('✅ React Scan 已啟動，開啟工具列進行性能監控');
    log.debug('🎯 重點監控：AI插畫面板、角色分析圖表、Slate.js編輯器');
  }
};

// 為特定組件添加性能監控
export const monitorComponent = (Component: React.ComponentType<unknown>, componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onRender } = require('react-scan');
    onRender(Component, (fiber: unknown, render: unknown) => {
      const renderTime = typeof render === 'object' && render !== null && 'time' in render ? (render as { time: unknown }).time : null;
      const timeMs = typeof renderTime === 'number' ? renderTime.toFixed(2) : '0';
      log.debug(`📊 [${componentName}] 渲染時間: ${timeMs}ms`);
      
      // 特別關注的組件
      const criticalComponents = [
        'CharacterAnalysisPanel',
        'BatchIllustrationPanel', 
        'SlateEditor',
        'PersonalityRadarChart',
        'EmotionTrendChart'
      ];
      
      const renderTimeNum = typeof renderTime === 'number' ? renderTime : 0;
      if (criticalComponents.includes(componentName) && renderTimeNum > 16) {
        log.warn(`🚨 關鍵組件 ${componentName} 渲染時間過長: ${renderTimeNum.toFixed(2)}ms`);
      }
    });
  }
};