import React from 'react';

const SettingsLoadingView: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <p className="text-gray-400">載入設定中...</p>
      </div>
    </div>
  );
};

export default SettingsLoadingView;