import React from 'react';
import { updateUISettings, resetUISettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';

const UISettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => (
  <div className="max-w-4xl space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-cosmic text-gold-500">界面設定</h2>
      <button
        onClick={() => dispatch(resetUISettings())}
        className="btn-secondary text-sm"
        title="將所有界面設定恢復到預設值"
      >
        重置界面設定
      </button>
    </div>

    {/* 開發狀態概覽 */}
    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
      <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
        <span className="mr-2">🚀</span>
        開發狀態概覽
      </h3>
      <div className="grid grid-cols-1 gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span className="text-gray-300">✅ 已實現：狀態欄、音效系統、動畫效果、通知系統</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        所有界面功能已完成開發並可正常使用！您可以根據需要自由開啟或關閉這些功能。
      </p>
    </div>

    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">顯示選項</h3>
      <p className="text-gray-400 text-sm mb-4">
        自訂界面元件的顯示和行為，提升您的寫作體驗
      </p>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showStatusBar"
            checked={settings.ui.showStatusBar}
            onChange={(e) => dispatch(updateUISettings({ showStatusBar: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <div className="flex-1">
            <label htmlFor="showStatusBar" className="text-gray-300 cursor-pointer flex items-center">
              顯示狀態欄
              <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                ✅ 已實現
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              在應用程式底部顯示狀態欄，包含字數統計、光標位置等資訊
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="animationsEnabled"
            checked={settings.ui.animationsEnabled}
            onChange={(e) => dispatch(updateUISettings({ animationsEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <div className="flex-1">
            <label htmlFor="animationsEnabled" className="text-gray-300 cursor-pointer flex items-center">
              啟用動畫效果
              <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                ✅ 已實現
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              啟用界面切換和互動的平滑動畫效果，提升使用體驗但可能影響性能
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="soundEnabled"
            checked={settings.ui.soundEnabled}
            onChange={(e) => dispatch(updateUISettings({ soundEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <div className="flex-1">
            <label htmlFor="soundEnabled" className="text-gray-300 cursor-pointer flex items-center">
              啟用音效
              <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                ✅ 已實現
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              為操作提供聲音反饋，如按鈕點擊、通知提醒等音效
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="notificationsEnabled"
            checked={settings.ui.notificationsEnabled}
            onChange={(e) => dispatch(updateUISettings({ notificationsEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <div className="flex-1">
            <label htmlFor="notificationsEnabled" className="text-gray-300 cursor-pointer flex items-center">
              啟用通知
              <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                ✅ 已實現
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              接收應用程式通知，如自動保存完成、AI 生成完成等提醒
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-cosmic-900 border border-cosmic-600 rounded-lg">
        <h4 className="text-sm font-medium text-gold-400 mb-2">
          <span className="mr-2">💡</span>
          使用建議
        </h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• 關閉動畫效果可在低配置設備上提升性能</li>
          <li>• 狀態欄提供即時的編輯統計資訊，建議保持開啟</li>
          <li>• 音效功能為操作提供聲音反饋，提升使用體驗</li>
          <li>• 通知功能幫助您了解 AI 生成和自動保存狀態</li>
        </ul>
      </div>
    </div>
  </div>
);

export default UISettings;