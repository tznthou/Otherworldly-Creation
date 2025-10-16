import React from 'react';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('SettingsDebug');

const SettingsDebug: React.FC = () => {
  log.debug('SettingsDebug 組件正在渲染');
  
  return (
    <div className="h-full flex items-center justify-center bg-bg-dark">
      <div className="text-center">
        <h1 className="text-2xl font-serif-tc text-warm-gold mb-4">設定頁面（除錯版）</h1>
        <p className="text-gray-300 mb-4">這是一個簡化的設定頁面，用於測試路由是否正常工作</p>
        <div className="card max-w-md mx-auto">
          <p className="text-sm text-gray-400">
            如果您看到這個頁面，說明路由設定是正確的，問題可能出現在 Settings 組件的內部。
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsDebug;