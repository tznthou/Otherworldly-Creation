import { scan } from 'react-scan';

// React Scan 開發工具配置
export const initReactScan = () => {
  // 只在開發環境中啟用
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 啟動 React Scan 性能分析工具...');
    
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
      onRender: (fiber: any, renders: any) => {
        // 記錄長時間渲染的組件
        const renderTime = renders.reduce((total: number, render: any) => total + (render.time || 0), 0);
        if (renderTime > 16) { // 超過一個幀的時間（16ms）
          console.warn(`⚠️ 組件 "${fiber.type?.name || 'Unknown'}" 渲染時間較長: ${renderTime.toFixed(2)}ms`);
        }
      },
      // 當開始繪製輪廓時的回調
      onPaintStart: (outlines) => {
        if (outlines.length > 10) {
          console.warn(`⚠️ 同時渲染的組件過多: ${outlines.length} 個組件`);
        }
      },
    });

    console.log('✅ React Scan 已啟動，開啟工具列進行性能監控');
    console.log('🎯 重點監控：AI插畫面板、角色分析圖表、Slate.js編輯器');
  }
};

// 為特定組件添加性能監控
export const monitorComponent = (Component: React.ComponentType<any>, componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onRender } = require('react-scan');
    onRender(Component, (fiber: any, render: any) => {
      console.log(`📊 [${componentName}] 渲染時間: ${render.time ? render.time.toFixed(2) : '0'}ms`);
      
      // 特別關注的組件
      const criticalComponents = [
        'CharacterAnalysisPanel',
        'BatchIllustrationPanel', 
        'SlateEditor',
        'PersonalityRadarChart',
        'EmotionTrendChart'
      ];
      
      if (criticalComponents.includes(componentName) && render.time > 16) {
        console.warn(`🚨 關鍵組件 ${componentName} 渲染時間過長: ${render.time.toFixed(2)}ms`);
      }
    });
  }
};