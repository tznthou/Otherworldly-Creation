import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';

const SettingsSimple: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: '一般設定', icon: '⚙️' },
    { id: 'ai', name: 'AI 設定', icon: '🤖' },
    { id: 'editor', name: '編輯器', icon: '📝' },
    { id: 'ui', name: '界面', icon: '🎨' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-serif-tc text-warm-gold">一般設定</h2>
            <div className="card">
              <h3 className="font-medium mb-4">語言設定</h3>
              <select className="w-full bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg px-4 py-2 text-white">
                <option value="zh-TW">繁體中文</option>
                <option value="zh-CN">簡體中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="card">
              <h3 className="font-medium mb-4">自動儲存</h3>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                啟用自動儲存
              </label>
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-serif-tc text-warm-gold">AI 設定</h2>
            <div className="card">
              <h3 className="font-medium mb-4">AI 引擎設定</h3>
              <button 
                onClick={() => dispatch(openModal('aiSettings'))}
                className="btn-primary"
              >
                開啟 AI 設定
              </button>
            </div>
          </div>
        );
      case 'editor':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-serif-tc text-warm-gold">編輯器設定</h2>
            <div className="card">
              <h3 className="font-medium mb-4">字體設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">字體大小</label>
                  <input 
                    type="range" 
                    min="12" 
                    max="24" 
                    defaultValue="16" 
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">行高</label>
                  <input 
                    type="range" 
                    min="1.2" 
                    max="2.0" 
                    step="0.1" 
                    defaultValue="1.6" 
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'ui':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-serif-tc text-warm-gold">界面設定</h2>
            <div className="card">
              <h3 className="font-medium mb-4">外觀</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  啟用動畫效果
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  顯示狀態欄
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  顯示小地圖
                </label>
              </div>
            </div>
          </div>
        );
      default:
        return <div>頁面內容</div>;
    }
  };

  return (
    <div className="h-full flex bg-bg-dark">
      {/* 側邊欄 */}
      <div className="w-64 bg-bg-dark border-r border-warm-gold/10 p-4">
        <h1 className="text-xl font-serif-tc text-warm-gold mb-6">系統設定 [SIMPLE DEBUG]</h1>
        <nav className="space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-warm-gold/50 text-text-primary'
                  : 'text-gray-300 hover:bg-bg-light/50 backdrop-blur-sm'
              }`}
            >
              <span className="text-lg mr-3">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 主內容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsSimple;