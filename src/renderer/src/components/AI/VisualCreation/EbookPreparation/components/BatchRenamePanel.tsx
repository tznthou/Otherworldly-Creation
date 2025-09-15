import React, { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store/store';
import { IllustrationHistoryItem } from '../../../../../types/illustration';

interface BatchRenamePanelProps {
  selectedImages: IllustrationHistoryItem[];
  onRename?: (imageId: string, newName: string) => void;
}

interface RenamingRule {
  id: string;
  type: 'prefix' | 'suffix' | 'numbering' | 'category' | 'chapter';
  value: string;
  enabled: boolean;
}

interface RenamingTemplate {
  id: string;
  name: string;
  description: string;
  rules: RenamingRule[];
}

const BatchRenamePanel: React.FC<BatchRenamePanelProps> = ({
  selectedImages,
  onRename
}) => {
  const [activeTemplate, setActiveTemplate] = useState<string>('custom');

  // 從 Redux 獲取電子書虛擬檔名設定
  const ebookVirtualNaming = useSelector((state: RootState) => state.settings.settings.ebookVirtualNaming);
  const [customRules, setCustomRules] = useState<RenamingRule[]>([
    {
      id: 'category',
      type: 'category',
      value: 'illustration',
      enabled: true
    },
    {
      id: 'numbering',
      type: 'numbering',
      value: 'sequential',
      enabled: true
    }
  ]);

  // 內建範本
  const templates: RenamingTemplate[] = useMemo(() => [
    {
      id: 'chapter-covers',
      name: '章節封面',
      description: '適用於章節封面圖片：chapter-01-cover.jpg',
      rules: [
        { id: '1', type: 'prefix', value: 'chapter', enabled: true },
        { id: '2', type: 'numbering', value: 'sequential', enabled: true },
        { id: '3', type: 'suffix', value: 'cover', enabled: true }
      ]
    },
    {
      id: 'character-portraits',
      name: '人物肖像',
      description: '適用於人物肖像圖片：character-name-portrait.jpg',
      rules: [
        { id: '1', type: 'prefix', value: 'character', enabled: true },
        { id: '2', type: 'category', value: 'portrait', enabled: true }
      ]
    },
    {
      id: 'scene-illustrations',
      name: '場景插圖',
      description: '適用於場景插圖：scene-chapter-01.jpg',
      rules: [
        { id: '1', type: 'prefix', value: 'scene', enabled: true },
        { id: '2', type: 'chapter', value: 'auto', enabled: true }
      ]
    },
    {
      id: 'custom',
      name: '自定義規則',
      description: '使用自定義的重命名規則',
      rules: customRules
    }
  ], [customRules]);

  // 生成預覽名稱
  const generatePreviewName = useCallback((image: IllustrationHistoryItem, templateId: string, index: number): string => {
    const template = templates.find(t => t.id === templateId);
    // 從多個可能的檔案路徑中提取檔案名稱
    const originalFilename = image.local_file_path?.split('/').pop() ||
                           image.image_path?.split('/').pop() ||
                           `image-${index + 1}`;
    if (!template) return originalFilename;

    let newName = '';
    const parts: string[] = [];

    template.rules.forEach(rule => {
      if (!rule.enabled) return;

      switch (rule.type) {
        case 'prefix':
          parts.push(rule.value);
          break;
        case 'suffix':
          // suffix 會在最後處理
          break;
        case 'numbering':
          if (rule.value === 'sequential') {
            parts.push((index + 1).toString().padStart(2, '0'));
          }
          break;
        case 'category':
          parts.push(rule.value);
          break;
        case 'chapter':
          if (rule.value === 'auto') {
            // 嘗試從 prompt 或檔名推斷章節
            const chapterMatch = (image.original_prompt || originalFilename || '').match(/第?(\d+)章|chapter[_\s-]*(\d+)/i);
            if (chapterMatch) {
              const chapterNum = chapterMatch[1] || chapterMatch[2];
              parts.push(`ch${chapterNum.padStart(2, '0')}`);
            } else {
              parts.push('ch01');
            }
          } else {
            parts.push(rule.value);
          }
          break;
      }
    });

    newName = parts.join('-');

    // 處理後綴
    const suffixRule = template.rules.find(r => r.type === 'suffix' && r.enabled);
    if (suffixRule) {
      newName += `-${suffixRule.value}`;
    }

    // 添加副檔名
    const originalExtension = originalFilename.split('.').pop() || 'jpg';
    return `${newName}.${originalExtension}`;
  }, [templates]);

  // 生成所有預覽
  const previews = useMemo(() => {
    return selectedImages.map((image, index) => {
      const oldName = image.local_file_path?.split('/').pop() ||
                     image.image_path?.split('/').pop() ||
                     `image-${index + 1}`;
      return {
        image,
        oldName,
        newName: generatePreviewName(image, activeTemplate, index)
      };
    });
  }, [selectedImages, activeTemplate, generatePreviewName]);

  // 更新自定義規則
  const updateCustomRule = (ruleId: string, updates: Partial<RenamingRule>) => {
    setCustomRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  };

  // 添加自定義規則
  const addCustomRule = () => {
    const newRule: RenamingRule = {
      id: Date.now().toString(),
      type: 'prefix',
      value: '',
      enabled: true
    };
    setCustomRules(prev => [...prev, newRule]);
  };

  // 移除自定義規則
  const removeCustomRule = (ruleId: string) => {
    setCustomRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  // 應用重命名（虛擬命名或傳統重命名）
  const handleApplyRename = () => {
    if (!onRename) return;

    if (ebookVirtualNaming) {
      // 虛擬檔名模式：儲存到資料庫，不修改原始檔案
      previews.forEach(({ image, newName }) => {
        // TODO: 實作虛擬檔名儲存到 ebook_mappings 表
        console.log('📚 [虛擬檔名]', {
          imageId: image.id,
          physicalId: image.id,
          sourceTable: image.provider === 'pollinations' ? 'pollinations_generations' : 'illustration_generations',
          virtualFilename: newName,
          category: 'illustration'
        });
        onRename(image.id, newName);
      });
    } else {
      // 傳統重命名模式：直接修改檔案名稱（原有邏輯）
      previews.forEach(({ image, newName }) => {
        onRename(image.id, newName);
      });
    }
  };

  const ruleTypeOptions = [
    { value: 'prefix', label: '前綴' },
    { value: 'suffix', label: '後綴' },
    { value: 'numbering', label: '編號' },
    { value: 'category', label: '分類' },
    { value: 'chapter', label: '章節' }
  ];

  return (
    <div className="space-y-6">
      {/* 功能狀態提醒 */}
      <div className={`border rounded-lg p-4 ${
        ebookVirtualNaming
          ? 'border-green-700/50 bg-green-900/20'
          : 'border-yellow-700/50 bg-yellow-900/20'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            ebookVirtualNaming ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {ebookVirtualNaming ? (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <div>
            <p className={`text-sm font-medium ${
              ebookVirtualNaming ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {ebookVirtualNaming ? '🟢 虛擬檔名模式已啟用' : '⚠️ 虛擬檔名模式未啟用'}
            </p>
            <p className={`text-xs mt-1 ${
              ebookVirtualNaming ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {ebookVirtualNaming ? (
                '重命名將儲存為虛擬檔名，原始檔案保持不變。適合電子書導出使用。'
              ) : (
                '目前使用傳統重命名模式，會直接修改檔案名稱。建議啟用虛擬檔名以保護原始檔案。'
              )}
            </p>
            {!ebookVirtualNaming && (
              <p className="text-xs mt-2 text-yellow-200">
                💡 在<strong>設定 → 一般設定 → 電子書功能設定</strong>中啟用「電子書虛擬檔名對應系統」
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 範本選擇 */}
      <div className="bg-cosmic-800 rounded-lg p-4">
        <h4 className="text-base font-medium text-cosmic-100 mb-4 flex items-center">
          <span className="text-xl mr-2">🏷️</span>
          重命名範本
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(template => (
            <div
              key={template.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeTemplate === template.id
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-cosmic-600 bg-cosmic-750 hover:border-cosmic-500'
              }`}
              onClick={() => setActiveTemplate(template.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className={`font-medium ${
                  activeTemplate === template.id ? 'text-gold-400' : 'text-cosmic-200'
                }`}>
                  {template.name}
                </h5>
                {activeTemplate === template.id && (
                  <span className="text-gold-400">✓</span>
                )}
              </div>
              <p className="text-sm text-cosmic-400">{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 自定義規則編輯 */}
      {activeTemplate === 'custom' && (
        <div className="bg-cosmic-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-medium text-cosmic-100 flex items-center">
              <span className="text-xl mr-2">⚙️</span>
              自定義規則
            </h4>
            <button
              onClick={addCustomRule}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              添加規則
            </button>
          </div>

          <div className="space-y-3">
            {customRules.map((rule, _index) => (
              <div key={rule.id} className="flex items-center gap-3 p-3 bg-cosmic-750 rounded">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateCustomRule(rule.id, { enabled: e.target.checked })}
                  className="w-4 h-4"
                />

                <select
                  value={rule.type}
                  onChange={(e) => updateCustomRule(rule.id, { type: e.target.value as RenamingRule['type'] })}
                  className="px-2 py-1 bg-cosmic-700 text-cosmic-100 rounded text-sm"
                >
                  {ruleTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {rule.type === 'numbering' ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateCustomRule(rule.id, { value: e.target.value })}
                    className="flex-1 px-2 py-1 bg-cosmic-700 text-cosmic-100 rounded text-sm"
                  >
                    <option value="sequential">順序編號</option>
                    <option value="roman">羅馬數字</option>
                  </select>
                ) : rule.type === 'chapter' ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateCustomRule(rule.id, { value: e.target.value })}
                    className="flex-1 px-2 py-1 bg-cosmic-700 text-cosmic-100 rounded text-sm"
                  >
                    <option value="auto">自動偵測</option>
                    <option value="ch01">固定章節</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateCustomRule(rule.id, { value: e.target.value })}
                    placeholder="輸入規則值"
                    className="flex-1 px-2 py-1 bg-cosmic-700 text-cosmic-100 rounded text-sm"
                  />
                )}

                <button
                  onClick={() => removeCustomRule(rule.id)}
                  className="text-red-400 hover:text-red-300 text-sm p-1"
                  title="移除規則"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 預覽結果 */}
      <div className="bg-cosmic-800 rounded-lg p-4">
        <h4 className="text-base font-medium text-cosmic-100 mb-4 flex items-center">
          <span className="text-xl mr-2">👁️</span>
          重命名預覽 ({previews.length} 張圖片)
        </h4>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {previews.map(({ image, oldName, newName }, index) => (
            <div key={image.id} className="flex items-center justify-between p-2 bg-cosmic-750 rounded text-sm">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-cosmic-400 w-6 text-center">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-cosmic-300 truncate">{oldName}</div>
                  <div className="text-gold-400 truncate font-medium">→ {newName}</div>
                </div>
              </div>
              {oldName === newName && (
                <span className="text-cosmic-500 text-xs">無變化</span>
              )}
            </div>
          ))}
        </div>

        {/* 統計信息 */}
        <div className="mt-4 p-3 bg-cosmic-700 rounded flex justify-between text-sm">
          <div>
            <span className="text-cosmic-400">總計：</span>
            <span className="text-cosmic-200">{previews.length} 張圖片</span>
          </div>
          <div>
            <span className="text-cosmic-400">將變更：</span>
            <span className="text-green-400">
              {previews.filter(p => p.oldName !== p.newName).length} 張
            </span>
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleApplyRename}
          disabled={previews.filter(p => p.oldName !== p.newName).length === 0}
          className="px-6 py-2 bg-gold-600 text-black font-medium rounded-lg hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          <span>
            {ebookVirtualNaming ? '📚 應用虛擬檔名' : '🏷️ 應用重命名'}
          </span>
          <span>({previews.filter(p => p.oldName !== p.newName).length})</span>
        </button>
      </div>
    </div>
  );
};

export default BatchRenamePanel;