import React from 'react';
import { Icon } from '../../../components/UI/Icon';

const SettingsLoadingView: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center bg-bg-dark">
      <div className="text-center">
        <div className="animate-spin mb-4 flex justify-center">
          <Icon name="Cog6Tooth" variant="outline" className="w-10 h-10 text-warm-gold" />
        </div>
        <p className="font-sans-tc text-text-secondary">載入設定中...</p>
      </div>
    </div>
  );
};

export default SettingsLoadingView;