import React, { useState } from 'react';
import { Template } from '../types';
import { NovelTemplate } from '../../../types/template';
import { STORY_TEMPLATES } from '../constants';
import { componentStyles, baseStyles } from '../styles';
import { storage } from '../utils';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({ isOpen, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyTemplate = (template: Template) => {
    const confirmation = confirm(
      `確定要套用「${template.name}」模板嗎？\n\n這將會：\n- 設定故事大綱\n- 創建基礎章節結構\n- 提供寫作建議`
    );
    
    if (confirmation) {
      // 轉換 Template 為 NovelTemplate 格式
      const templateData: NovelTemplate = {
        id: template.id,
        name: template.name,
        type: template.type as 'isekai' | 'school' | 'scifi' | 'fantasy', // 明確指定類型轉換
        description: template.description,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        worldSetting: {
          era: 'modern',
          technology: 'contemporary',
          society: 'modern',
          specialElements: [],
          geography: template.description,
        },
        characterArchetypes: [],
        plotFramework: [],
        writingGuidelines: {
          tone: 'neutral',
          style: 'descriptive',
          pacing: 'moderate',
          themes: [],
          commonTropes: [],
          avoidances: []
        },
        aiPromptTemplate: {
          context: '',
          characterPrompts: [],
          worldPrompts: [],
          stylePrompts: [],
          continuationPrompts: []
        },
        sampleContent: {
          opening: '',
          dialogue: [],
          description: []
        },
        isCustom: false,
        isActive: true
      };
      
      storage.saveAppliedTemplate(templateData);
      
      // 同時設定初始內容
      const initialContent = `${template.name}\n\n${template.description}\n\n章節大綱：\n${template.outline.map((chapter, index) => `${index + 1}. ${chapter}`).join('\n')}\n\n開始寫作：\n\n`;
      storage.saveContent(initialContent);
      
      alert(`✅ 模板「${template.name}」套用成功！\n現在可以開始寫作了。`);
      onClose();
    }
  };

  const getTemplateTypeColor = (type: string): string => {
    switch (type) {
      case 'isekai':
        return '#9c27b0, #e91e63';
      case 'school':
        return '#2196f3, #00bcd4';
      case 'scifi':
        return '#4caf50, #009688';
      case 'fantasy':
      default:
        return '#ff9800, #f44336';
    }
  };

  const getTemplateTypeName = (type: string): string => {
    switch (type) {
      case 'isekai':
        return '異世界';
      case 'school':
        return '校園';
      case 'scifi':
        return '科幻';
      case 'fantasy':
      default:
        return '奇幻';
    }
  };

  return (
    <div style={componentStyles.modalOverlay}>
      <div style={{ ...componentStyles.modalContent, maxWidth: '900px' }}>
        <h2 style={componentStyles.title}>
          🎭 輕小說模板庫
        </h2>
        
        <p style={{ 
          color: baseStyles.textColor, 
          textAlign: 'center', 
          marginBottom: baseStyles.marginXXLarge 
        }}>
          選擇一個模板來快速開始你的創作之旅
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: baseStyles.marginXLarge 
        }}>
          {STORY_TEMPLATES.map(template => (
            <div
              key={template.id}
              style={{
                background: selectedTemplate === template.id 
                  ? 'rgba(255, 215, 0, 0.2)' 
                  : 'rgba(255, 215, 0, 0.1)',
                border: `2px solid ${selectedTemplate === template.id 
                  ? '#FFD700' 
                  : 'rgba(255, 215, 0, 0.5)'}`,
                borderRadius: baseStyles.borderRadiusXXLarge,
                padding: baseStyles.paddingXLarge,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: baseStyles.marginLarge 
              }}>
                <div style={{ 
                  fontSize: '32px', 
                  marginRight: baseStyles.marginLarge 
                }}>
                  {template.icon}
                </div>
                <div>
                  <h3 style={{ 
                    color: baseStyles.primaryColor, 
                    margin: '0 0 5px 0', 
                    fontSize: baseStyles.fontSizeXLarge 
                  }}>
                    {template.name}
                  </h3>
                  <div style={{ 
                    background: `linear-gradient(45deg, ${getTemplateTypeColor(template.type)})`,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: baseStyles.borderRadiusXXLarge,
                    fontSize: baseStyles.fontSizeSmall,
                    fontWeight: 'bold',
                    display: 'inline-block'
                  }}>
                    {getTemplateTypeName(template.type)}
                  </div>
                </div>
              </div>

              <p style={{ 
                color: baseStyles.textColor, 
                fontSize: baseStyles.fontSizeNormal, 
                lineHeight: '1.4', 
                marginBottom: baseStyles.marginLarge 
              }}>
                {template.description}
              </p>

              <div style={{ marginBottom: baseStyles.marginLarge }}>
                <h4 style={{ 
                  color: baseStyles.primaryColor, 
                  fontSize: baseStyles.fontSizeNormal, 
                  marginBottom: baseStyles.marginSmall 
                }}>
                  📖 章節大綱預覽：
                </h4>
                <ul style={{ 
                  color: baseStyles.textColor, 
                  fontSize: '13px', 
                  lineHeight: '1.3', 
                  paddingLeft: baseStyles.paddingXLarge, 
                  margin: 0 
                }}>
                  {template.outline.slice(0, 3).map((chapter, index) => (
                    <li key={index} style={{ marginBottom: '3px' }}>
                      {chapter}
                    </li>
                  ))}
                  {template.outline.length > 3 && (
                    <li style={{ opacity: 0.6 }}>
                      ...等共 {template.outline.length} 章
                    </li>
                  )}
                </ul>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyTemplate(template);
                }}
                style={{
                  background: selectedTemplate === template.id 
                    ? baseStyles.primaryColor 
                    : 'rgba(255, 215, 0, 0.8)',
                  color: baseStyles.backgroundColor,
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: baseStyles.borderRadiusMedium,
                  cursor: 'pointer',
                  fontSize: baseStyles.fontSizeNormal,
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                ✨ 套用此模板
              </button>
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: baseStyles.marginXXLarge, 
          textAlign: 'center' 
        }}>
          <button
            onClick={onClose}
            style={componentStyles.secondaryButton}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateManagerModal;