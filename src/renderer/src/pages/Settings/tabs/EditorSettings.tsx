import React from 'react';
import { updateEditorSettings, resetEditorSettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';

const EditorSettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-cosmic text-gold-500">編輯器設定</h2>
      <button
        onClick={() => dispatch(resetEditorSettings())}
        className="btn-secondary text-sm"
      >
        重置編輯器設定
      </button>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">外觀</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">主題</label>
          <select
            value={settings.editor.theme}
            onChange={(e) => dispatch(updateEditorSettings({ theme: e.target.value as 'cosmic' | 'light' | 'dark' | 'sepia' }))}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="cosmic">宇宙深藍</option>
            <option value="light">純淨白色</option>
            <option value="dark">經典黑色</option>
            <option value="sepia">復古棕褐</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">字體</label>
          <select
            value={settings.editor.fontFamily}
            onChange={(e) => dispatch(updateEditorSettings({ fontFamily: e.target.value }))}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value='"Noto Sans TC", sans-serif'>思源黑體</option>
            <option value='"Noto Serif TC", serif'>思源宋體</option>
            <option value='Inter, sans-serif'>Inter</option>
            <option value='Georgia, serif'>Georgia</option>
            <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">字體大小</label>
          <input
            type="number"
            value={settings.editor.fontSize}
            onChange={(e) => dispatch(updateEditorSettings({ fontSize: parseInt(e.target.value) }))}
            min="12"
            max="32"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">行高</label>
          <input
            type="number"
            value={settings.editor.lineHeight}
            onChange={(e) => dispatch(updateEditorSettings({ lineHeight: parseFloat(e.target.value) }))}
            min="1.0"
            max="3.0"
            step="0.1"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">編輯器行為</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showLineNumbers"
            checked={settings.editor.showLineNumbers}
            onChange={(e) => dispatch(updateEditorSettings({ showLineNumbers: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="showLineNumbers" className="text-gray-300">顯示行號</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="wordWrap"
            checked={settings.editor.wordWrap}
            onChange={(e) => dispatch(updateEditorSettings({ wordWrap: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="wordWrap" className="text-gray-300">自動換行</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="spellCheck"
            checked={settings.editor.spellCheck}
            onChange={(e) => dispatch(updateEditorSettings({ spellCheck: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="spellCheck" className="text-gray-300">拼字檢查</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableVimMode"
            checked={settings.editor.enableVimMode}
            onChange={(e) => dispatch(updateEditorSettings({ enableVimMode: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableVimMode" className="text-gray-300">Vim 模式</label>
        </div>
      </div>
    </div>
  </div>
);

export default EditorSettings;