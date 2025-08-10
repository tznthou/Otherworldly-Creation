import { useState } from 'react';
import { useAppDispatch } from './redux';
import { createProject } from '../store/slices/projectsSlice';
import { NovelTemplate } from '../types/template';
import api from '../api';

export interface TemplateApplicationOptions {
  projectName: string;
  projectDescription?: string;
  applyWorldSetting: boolean;
  createCharacters: boolean;
  selectedArchetypes: string[]; // 選中的角色原型 ID
}

export const useTemplateApplication = () => {
  const dispatch = useAppDispatch();
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTemplateToProject = async (
    template: NovelTemplate,
    options: TemplateApplicationOptions
  ) => {
    setIsApplying(true);
    setError(null);

    try {
      // 準備專案數據 - 符合 Project 接口
      const projectData = {
        name: options.projectName,
        type: template.type as 'isekai' | 'school' | 'scifi' | 'fantasy', // 添加 type 字段
        description: options.projectDescription || template.description,
        novelLength: 'medium' as const,
        settings: {
          // 只保留 Project 接口支援的屬性
          aiModel: 'llama3.2', // 預設模型
          aiParams: {
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 600 // 🔥 增加到 600 tokens，適合中文小說段落
          }
        },
        // 將模板資訊儲存為額外屬性（如果需要的話）
        templateMetadata: {
          templateId: template.id,
          templateName: template.name,
          worldSetting: options.applyWorldSetting ? template.worldSetting : undefined,
          writingGuidelines: template.writingGuidelines,
          aiPromptTemplate: template.aiPromptTemplate
        }
      };

      // 創建專案
      const result = await dispatch(createProject(projectData)).unwrap();
      const projectId = result.id; // 從返回的 project 對象中獲取 id

      // 如果選擇創建角色，則創建選中的角色原型
      if (options.createCharacters && options.selectedArchetypes.length > 0) {
        for (const archetypeIndex of options.selectedArchetypes) {
          const archetype = template.characterArchetypes[parseInt(archetypeIndex)];
          if (archetype) {
            try {
              await api.characters.create({
                projectId: projectId,
                name: archetype.name,
                background: archetype.description,
                personality: archetype.personality,
                appearance: archetype.appearance || '',
                age: archetype.suggestedAge ? Math.round((archetype.suggestedAge.min + archetype.suggestedAge.max) / 2) : undefined,
                gender: archetype.suggestedGender?.[0] || '未設定',
                archetype: archetype.name
              });
            } catch (charError) {
              console.warn('創建角色失敗:', charError);
            }
          }
        }
      }

      // 如果有範例內容，創建第一章
      if (template.sampleContent?.opening) {
        try {
          await api.chapters.create({
            projectId: projectId,
            title: '第一章：開始的故事',
            content: [{
              type: 'paragraph' as const,
              children: [{ text: template.sampleContent.opening }]
            }],
            order: 1
          });
        } catch (chapterError) {
          console.warn('創建範例章節失敗:', chapterError);
        }
      }

      return {
        success: true,
        projectId,
        message: `成功應用「${template.name}」模板創建專案`
      };

    } catch (err) {
      let errorMessage = '應用模板失敗';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as { message: string }).message;
      }
      
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsApplying(false);
    }
  };

  const getTemplatePreview = (template: NovelTemplate) => {
    return {
      name: template.name,
      description: template.description,
      type: template.type,
      characterCount: template.characterArchetypes.length,
      hasWorldSetting: !!template.worldSetting,
      hasSampleContent: !!template.sampleContent?.opening,
      themes: template.writingGuidelines.themes,
      style: template.writingGuidelines.style
    };
  };

  return {
    applyTemplateToProject,
    getTemplatePreview,
    isApplying,
    error,
    clearError: () => setError(null)
  };
};

export default useTemplateApplication;