import React from 'react';
import { updateUISettings, resetUISettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';

const UISettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => (
  <div className="space-y-6">
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
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">布局</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">
            側邊欄寬度 
            <span className="text-gray-500 text-sm ml-2">(200-500 像素)</span>
          </label>
          <input
            type="number"
            value={settings.ui.sidebarWidth}
            onChange={(e) => dispatch(updateUISettings({ sidebarWidth: parseInt(e.target.value) }))}
            min="200"
            max="500"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            title="設定左側導航欄的寬度，適合不同螢幕尺寸和使用偏好"
            placeholder="輸入側邊欄寬度 (預設: 280)"
          />
          <p className="text-xs text-gray-400 mt-1">
            調整左側導航欄的顯示寬度，較窄的設定可提供更多編輯空間
          </p>
        </div>
      </div>
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
              <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                🚧 開發中
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              在應用程式底部顯示狀態欄，包含字數統計、光標位置等資訊
            </p>
            <p className="text-xs text-orange-400 mt-1 italic">
              ⚠️ 此功能設定已完成，UI組件開發中，敬請期待
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showMinimap"
            checked={settings.ui.showMinimap}
            onChange={(e) => dispatch(updateUISettings({ showMinimap: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <div className="flex-1">
            <label htmlFor="showMinimap" className="text-gray-300 cursor-pointer flex items-center">
              顯示小地圖
              <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                🚧 開發中
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              在編輯器右側顯示文檔的縮略圖，方便快速導航長篇內容
            </p>
            <p className="text-xs text-orange-400 mt-1 italic">
              ⚠️ 此功能設定已完成，UI組件開發中，敬請期待
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
              <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                🚧 開發中
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              為操作提供聲音反饋，如按鈕點擊、通知提醒等音效
            </p>
            <p className="text-xs text-orange-400 mt-1 italic">
              ⚠️ 此功能設定已完成，音效系統開發中，敬請期待
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
          <li>• 較小的螢幕建議將側邊欄寬度設為 220-250 像素</li>
          <li>• 關閉動畫效果可在低配置設備上提升性能</li>
          <li>• 小地圖適合處理超過 1000 行的長篇小說</li>
          <li>• 狀態欄提供即時的編輯統計資訊，建議保持開啟</li>
        </ul>
      </div>
      
      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-400 mb-2">
          <span className="mr-2">🚀</span>
          開發狀態說明
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="text-gray-300">✅ 已實現：動畫效果、通知系統</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
            <span className="text-gray-300">🚧 開發中：狀態欄、小地圖、音效</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          所有設定選項均可正常保存和生效，部分UI組件正在開發中，完成後會自動啟用對應功能
        </p>
      </div>
    </div>
  </div>
);

export default UISettings;