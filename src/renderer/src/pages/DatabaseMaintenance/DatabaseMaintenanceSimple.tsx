import React from 'react';

const DatabaseMaintenanceSimple: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center bg-cosmic-950">
      <div className="text-center">
        <h1 className="text-2xl font-cosmic text-gold-500 mb-4">💾 資料管理</h1>
        <p className="text-gray-300 mb-4">資料庫維護、備份還原功能</p>
        <div className="card max-w-md mx-auto">
          <p className="text-sm text-gray-400">
            這是資料管理頁面的簡化版本。所有資料庫維護、備份還原功能都會在這裡提供。
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
          <div className="card text-center p-4">
            <div className="text-3xl mb-2">🔧</div>
            <h3 className="font-medium text-gold-400 mb-2">資料庫維護</h3>
            <p className="text-sm text-gray-400 mb-3">
              檢查和維護資料庫健康狀態
            </p>
            <button className="btn-primary w-full">
              開始維護
            </button>
          </div>
          <div className="card text-center p-4">
            <div className="text-3xl mb-2">💿</div>
            <h3 className="font-medium text-gold-400 mb-2">備份還原</h3>
            <p className="text-sm text-gray-400 mb-3">
              管理專案資料備份檔案
            </p>
            <button className="btn-secondary w-full">
              管理備份
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseMaintenanceSimple;