import React from 'react';
import { TemplateManager } from '../../../components/Templates/TemplateManager';

const TemplateManagementSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-cosmic text-gold-500 mb-2">📋 模板管理</h2>
        <p className="text-gray-300">
          管理您的輕小說創作模板，包括預設模板和自定義模板。您可以在這裡匯入新的模板或編輯現有模板。
        </p>
      </div>
      
      {/* 嵌入完整的 TemplateManager 組件 */}
      <div className="bg-cosmic-900 rounded-lg border border-cosmic-700">
        <TemplateManager />
      </div>
    </div>
  );
};

export default TemplateManagementSettings;