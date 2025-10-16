import React from 'react';
import { updateShortcut } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps, SHORTCUT_LABELS } from '../types';

const ShortcutsSettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif-tc text-warm-gold">快捷鍵設定</h2>
      
      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg p-6">
        <h3 className="text-lg font-medium text-warm-gold mb-4">自訂快捷鍵</h3>
        <div className="space-y-4">
          {Object.entries(settings.shortcuts).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-gray-300 w-32">{SHORTCUT_LABELS[key] || key}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => dispatch(updateShortcut({ key, value: e.target.value }))}
                className="w-48 bg-bg-dark/80 border border-warm-gold/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="按下快捷鍵..."
              />
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-bg-dark/80 rounded-lg">
          <p className="text-sm text-gray-400">
            點擊輸入框並按下您想要的快捷鍵組合。支援 Ctrl、Alt、Shift 等修飾鍵。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsSettings;