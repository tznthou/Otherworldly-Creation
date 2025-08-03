import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  selectEditorSettings,
  selectCurrentTheme,
  selectCustomThemes,
  setFontFamily,
  setFontSize,
  setFontWeight,
  setLineHeight,
  setLetterSpacing,
  setParagraphSpacing,
  setTextAlign,
  setTheme,
  setReadingModeWidth,
  toggleAutoSave,
  setAutoSaveInterval,
  toggleSpellCheck,
  toggleWordWrap,
  toggleLineNumbers,
  resetSettings,
  toggleSettings
} from '../../store/slices/editorSlice';
import { FONT_OPTIONS, THEME_OPTIONS } from '../../types/editor';
import CosmicButton from '../UI/CosmicButton';

interface EditorSettingsPanelProps {
  className?: string;
}

const EditorSettingsPanel: React.FC<EditorSettingsPanelProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectEditorSettings);
  const currentTheme = useAppSelector(selectCurrentTheme);
  const customThemes = useAppSelector(selectCustomThemes);
  
  const [activeTab, setActiveTab] = useState<'font' | 'layout' | 'theme' | 'behavior'>('font');

  const handleClose = () => {
    dispatch(toggleSettings());
  };

  const handleReset = () => {
    if (confirm('確定要重置所有編輯器設定嗎？')) {
      dispatch(resetSettings());
    }
  };

  const renderFontSettings = () => (
    <div className="space-y-6">
      {/* 字體選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">字體</label>
        <div className="grid grid-cols-1 gap-2">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.value}
              onClick={() => dispatch(setFontFamily(font.value))}
              className={`p-3 rounded-lg border text-left transition-all ${
                settings.fontFamily === font.value
                  ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                  : 'border-cosmic-600 bg-cosmic-800 text-gray-300 hover:border-cosmic-500'
              }`}
            >
              <div className="font-medium mb-1" style={{ fontFamily: font.value }}>
                {font.name}
              </div>
              <div className="text-xs text-gray-400">{font.preview}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 字體大小 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          字體大小：{settings.fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="32"
          value={settings.fontSize}
          onChange={(e) => dispatch(setFontSize(parseInt(e.target.value)))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>12px</span>
          <span>32px</span>
        </div>
      </div>

      {/* 字體粗細 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">字體粗細</label>
        <div className="grid grid-cols-4 gap-2">
          {(['normal', 'medium', 'semibold', 'bold'] as const).map((weight) => (
            <button
              key={weight}
              onClick={() => dispatch(setFontWeight(weight))}
              className={`p-2 rounded-lg border text-sm transition-all ${
                settings.fontWeight === weight
                  ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                  : 'border-cosmic-600 bg-cosmic-800 text-gray-300 hover:border-cosmic-500'
              }`}
              style={{ fontWeight: weight }}
            >
              {weight === 'normal' ? '正常' : 
               weight === 'medium' ? '中等' :
               weight === 'semibold' ? '半粗' : '粗體'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLayoutSettings = () => (
    <div className="space-y-6">
      {/* 行高 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          行高：{settings.lineHeight.toFixed(1)}
        </label>
        <input
          type="range"
          min="1.0"
          max="3.0"
          step="0.1"
          value={settings.lineHeight}
          onChange={(e) => dispatch(setLineHeight(parseFloat(e.target.value)))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>緊密</span>
          <span>寬鬆</span>
        </div>
      </div>

      {/* 字間距 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          字間距：{settings.letterSpacing}px
        </label>
        <input
          type="range"
          min="-2"
          max="5"
          value={settings.letterSpacing}
          onChange={(e) => dispatch(setLetterSpacing(parseInt(e.target.value)))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>緊密</span>
          <span>寬鬆</span>
        </div>
      </div>

      {/* 段落間距 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          段落間距：{settings.paragraphSpacing}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={settings.paragraphSpacing}
          onChange={(e) => dispatch(setParagraphSpacing(parseInt(e.target.value)))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>無間距</span>
          <span>大間距</span>
        </div>
      </div>

      {/* 文字對齊 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">文字對齊</label>
        <div className="grid grid-cols-4 gap-2">
          {(['left', 'center', 'right', 'justify'] as const).map((align) => (
            <button
              key={align}
              onClick={() => dispatch(setTextAlign(align))}
              className={`p-2 rounded-lg border text-sm transition-all ${
                settings.textAlign === align
                  ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                  : 'border-cosmic-600 bg-cosmic-800 text-gray-300 hover:border-cosmic-500'
              }`}
            >
              {align === 'left' ? '左對齊' :
               align === 'center' ? '置中' :
               align === 'right' ? '右對齊' : '兩端對齊'}
            </button>
          ))}
        </div>
      </div>

      {/* 閱讀模式寬度 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          閱讀模式寬度：{settings.readingModeWidth}px
        </label>
        <input
          type="range"
          min="600"
          max="1200"
          value={settings.readingModeWidth}
          onChange={(e) => dispatch(setReadingModeWidth(parseInt(e.target.value)))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>窄</span>
          <span>寬</span>
        </div>
      </div>
    </div>
  );

  const renderThemeSettings = () => (
    <div className="space-y-6">
      {/* 預設主題 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">主題</label>
        <div className="grid grid-cols-1 gap-2">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.value}
              onClick={() => dispatch(setTheme(theme.value))}
              className={`p-3 rounded-lg border text-left transition-all ${
                currentTheme.value === theme.value
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-cosmic-600 bg-cosmic-800 hover:border-cosmic-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-600"
                    style={{ backgroundColor: theme.colors.background }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-600"
                    style={{ backgroundColor: theme.colors.text }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-600"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                </div>
                <div>
                  <div className="font-medium text-white">{theme.name}</div>
                  <div className="text-xs text-gray-400">{theme.preview}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 自定義主題 */}
      {customThemes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">自定義主題</label>
          <div className="space-y-2">
            {customThemes.map((theme) => (
              <div
                key={theme.name}
                className="p-3 rounded-lg border border-cosmic-600 bg-cosmic-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: theme.colors.background }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: theme.colors.text }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                    <span className="text-white">{theme.name}</span>
                  </div>
                  <button className="text-red-400 hover:text-red-300 text-sm">
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderBehaviorSettings = () => (
    <div className="space-y-6">
      {/* 自動儲存 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-300">自動儲存</div>
          <div className="text-sm text-gray-400">自動儲存編輯內容</div>
        </div>
        <button
          onClick={() => dispatch(toggleAutoSave())}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.autoSave ? 'bg-gold-500' : 'bg-cosmic-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.autoSave ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 自動儲存間隔 */}
      {settings.autoSave && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            自動儲存間隔：{settings.autoSaveInterval / 1000}秒
          </label>
          <input
            type="range"
            min="1000"
            max="30000"
            step="1000"
            value={settings.autoSaveInterval}
            onChange={(e) => dispatch(setAutoSaveInterval(parseInt(e.target.value)))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1秒</span>
            <span>30秒</span>
          </div>
        </div>
      )}

      {/* 拼字檢查 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-300">拼字檢查</div>
          <div className="text-sm text-gray-400">檢查拼字錯誤</div>
        </div>
        <button
          onClick={() => dispatch(toggleSpellCheck())}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.spellCheck ? 'bg-gold-500' : 'bg-cosmic-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.spellCheck ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 自動換行 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-300">自動換行</div>
          <div className="text-sm text-gray-400">長行自動換行</div>
        </div>
        <button
          onClick={() => dispatch(toggleWordWrap())}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.wordWrap ? 'bg-gold-500' : 'bg-cosmic-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.wordWrap ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 顯示行號 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-300">顯示行號</div>
          <div className="text-sm text-gray-400">在編輯器左側顯示行號</div>
        </div>
        <button
          onClick={() => dispatch(toggleLineNumbers())}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.showLineNumbers ? 'bg-gold-500' : 'bg-cosmic-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.showLineNumbers ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'font', label: '字體', icon: '🔤' },
    { id: 'layout', label: '排版', icon: '📐' },
    { id: 'theme', label: '主題', icon: '🎨' },
    { id: 'behavior', label: '行為', icon: '⚙️' }
  ] as const;

  return (
    <div className={`bg-cosmic-900 border border-cosmic-700 rounded-lg shadow-xl ${className}`}>
      {/* 標題欄 */}
      <div className="flex items-center justify-between p-4 border-b border-cosmic-700">
        <h3 className="text-lg font-cosmic text-gold-500">編輯器設定</h3>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 標籤頁 */}
      <div className="flex border-b border-cosmic-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-gold-400 border-b-2 border-gold-500 bg-cosmic-800'
                : 'text-gray-400 hover:text-gray-300 hover:bg-cosmic-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 內容區域 */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'font' && renderFontSettings()}
        {activeTab === 'layout' && renderLayoutSettings()}
        {activeTab === 'theme' && renderThemeSettings()}
        {activeTab === 'behavior' && renderBehaviorSettings()}
      </div>

      {/* 底部按鈕 */}
      <div className="flex items-center justify-between p-4 border-t border-cosmic-700">
        <CosmicButton
          variant="secondary"
          size="small"
          onClick={handleReset}
        >
          重置設定
        </CosmicButton>
        
        <CosmicButton
          variant="primary"
          size="small"
          onClick={handleClose}
        >
          完成
        </CosmicButton>
      </div>
    </div>
  );
};

export default EditorSettingsPanel;