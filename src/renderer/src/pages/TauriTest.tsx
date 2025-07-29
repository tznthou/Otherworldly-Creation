import React, { useState, useEffect } from 'react';
import { api, isElectron, isTauri } from '../api';

const TauriTest: React.FC = () => {
  const [version, setVersion] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');

  useEffect(() => {
    // 檢測運行環境
    if (isElectron()) {
      setEnvironment('Electron');
    } else if (isTauri()) {
      setEnvironment('Tauri');
    } else {
      setEnvironment('Web');
    }

    // 獲取應用版本
    api.system.getAppVersion()
      .then(setVersion)
      .catch(err => console.error('獲取版本失敗:', err));
  }, []);

  const handleQuit = () => {
    api.system.quitApp().catch(err => console.error('退出應用失敗:', err));
  };

  const handleReload = () => {
    api.system.reloadApp().catch(err => console.error('重載應用失敗:', err));
  };

  return (
    <div className="p-8 bg-cosmic-900 min-h-screen text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gold-400">
          Tauri 遷移測試頁面
        </h1>
        
        <div className="space-y-4">
          <div className="bg-cosmic-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">環境信息</h2>
            <p>運行環境: <span className="text-gold-400">{environment}</span></p>
            <p>應用版本: <span className="text-gold-400">{version || '獲取中...'}</span></p>
          </div>

          <div className="bg-cosmic-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">功能測試</h2>
            <div className="space-x-4">
              <button
                onClick={handleReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                重載應用
              </button>
              <button
                onClick={handleQuit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                退出應用
              </button>
            </div>
          </div>

          <div className="bg-cosmic-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">遷移進度</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Tauri 專案結構創建完成
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                基本 Tauri commands 實現
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                前端 API 適配層創建
              </li>
              <li className="flex items-center">
                <span className="text-yellow-400 mr-2">⏳</span>
                數據庫層遷移 (待實現)
              </li>
              <li className="flex items-center">
                <span className="text-yellow-400 mr-2">⏳</span>
                Ollama 服務整合 (待實現)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TauriTest;