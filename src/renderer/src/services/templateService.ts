// 模板管理服務
import { NovelTemplate, TemplateType, TemplateApplicationResult, TemplateValidationError, WorldSetting } from '../types/template';
import { defaultTemplates } from '../data/defaultTemplates';
import { api } from '../api';

export class TemplateService {
  private templates: Map<string, NovelTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * 初始化預設模板
   */
  private initializeDefaultTemplates(): void {
    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 獲取所有模板
   */
  getAllTemplates(): NovelTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 根據類型獲取模板
   */
  getTemplatesByType(type: TemplateType): NovelTemplate[] {
    return this.getAllTemplates().filter(template => template.type === type);
  }

  /**
   * 根據 ID 獲取模板
   */
  getTemplateById(id: string): NovelTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * 獲取預設模板
   */
  getDefaultTemplates(): NovelTemplate[] {
    return this.getAllTemplates().filter(template => !template.isCustom);
  }

  /**
   * 獲取自定義模板
   */
  getCustomTemplates(): NovelTemplate[] {
    return this.getAllTemplates().filter(template => template.isCustom);
  }

  /**
   * 獲取啟用的模板
   */
  getActiveTemplates(): NovelTemplate[] {
    return this.getAllTemplates().filter(template => template.isActive !== false);
  }

  /**
   * 驗證模板資料
   */
  validateTemplate(template: Partial<NovelTemplate>): TemplateValidationError[] {
    const errors: TemplateValidationError[] = [];

    // 基本欄位驗證
    if (!template.name || template.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: '模板名稱不能為空',
        severity: 'error'
      });
    }

    if (!template.type) {
      errors.push({
        field: 'type',
        message: '必須選擇模板類型',
        severity: 'error'
      });
    }

    if (!template.description || template.description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: '模板描述不能為空',
        severity: 'error'
      });
    }

    // 世界觀設定驗證
    if (!template.worldSetting) {
      errors.push({
        field: 'worldSetting',
        message: '世界觀設定不能為空',
        severity: 'error'
      });
    } else {
      if (!template.worldSetting.era) {
        errors.push({
          field: 'worldSetting.era',
          message: '時代背景不能為空',
          severity: 'error'
        });
      }

      if (!template.worldSetting.technology) {
        errors.push({
          field: 'worldSetting.technology',
          message: '科技水平不能為空',
          severity: 'error'
        });
      }

      if (!template.worldSetting.society) {
        errors.push({
          field: 'worldSetting.society',
          message: '社會結構不能為空',
          severity: 'error'
        });
      }

      if (!template.worldSetting.specialElements || template.worldSetting.specialElements.length === 0) {
        errors.push({
          field: 'worldSetting.specialElements',
          message: '特殊元素至少需要一個',
          severity: 'warning'
        });
      }
    }

    // 角色原型驗證
    if (!template.characterArchetypes || template.characterArchetypes.length === 0) {
      errors.push({
        field: 'characterArchetypes',
        message: '至少需要一個角色原型',
        severity: 'warning'
      });
    } else {
      template.characterArchetypes.forEach((archetype, index) => {
        if (!archetype.name) {
          errors.push({
            field: `characterArchetypes[${index}].name`,
            message: `角色原型 ${index + 1} 的名稱不能為空`,
            severity: 'error'
          });
        }

        if (!archetype.personality) {
          errors.push({
            field: `characterArchetypes[${index}].personality`,
            message: `角色原型 ${index + 1} 的性格描述不能為空`,
            severity: 'error'
          });
        }
      });
    }

    // 劇情框架驗證
    if (!template.plotFramework || template.plotFramework.length === 0) {
      errors.push({
        field: 'plotFramework',
        message: '至少需要一個劇情階段',
        severity: 'warning'
      });
    }

    // 寫作指導驗證
    if (!template.writingGuidelines) {
      errors.push({
        field: 'writingGuidelines',
        message: '寫作指導不能為空',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * 創建自定義模板
   */
  createCustomTemplate(templateData: Omit<NovelTemplate, 'id' | 'createdAt' | 'updatedAt'>): string {
    const errors = this.validateTemplate(templateData);
    const criticalErrors = errors.filter(error => error.severity === 'error');
    
    if (criticalErrors.length > 0) {
      throw new Error(`模板驗證失敗: ${criticalErrors.map(e => e.message).join(', ')}`);
    }

    const templateId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const template: NovelTemplate = {
      ...templateData,
      id: templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString().toISOString(),
      isCustom: true,
      isActive: true
    };

    this.templates.set(templateId, template);
    return templateId;
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<NovelTemplate>): boolean {
    const existingTemplate = this.templates.get(id);
    if (!existingTemplate) {
      return false;
    }

    // 不允許修改預設模板的核心屬性
    if (!existingTemplate.isCustom) {
      const allowedUpdates = ['isActive', 'customSettings'];
      const updateKeys = Object.keys(updates);
      const invalidUpdates = updateKeys.filter(key => !allowedUpdates.includes(key));
      
      if (invalidUpdates.length > 0) {
        throw new Error(`不能修改預設模板的以下屬性: ${invalidUpdates.join(', ')}`);
      }
    }

    const updatedTemplate = {
      ...existingTemplate,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const errors = this.validateTemplate(updatedTemplate);
    const criticalErrors = errors.filter(error => error.severity === 'error');
    
    if (criticalErrors.length > 0) {
      throw new Error(`模板驗證失敗: ${criticalErrors.map(e => e.message).join(', ')}`);
    }

    this.templates.set(id, updatedTemplate);
    return true;
  }

  /**
   * 刪除自定義模板
   */
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }

    if (!template.isCustom) {
      throw new Error('不能刪除預設模板');
    }

    return this.templates.delete(id);
  }

  /**
   * 複製模板
   */
  cloneTemplate(id: string, newName?: string): string {
    const originalTemplate = this.templates.get(id);
    if (!originalTemplate) {
      throw new Error('找不到要複製的模板');
    }

    const { id: _originalId, createdAt: _createdAt, updatedAt: _updatedAt, ...clonedTemplate } = {
      ...originalTemplate,
      name: newName || `${originalTemplate.name} (副本)`,
      isCustom: true
    };

    return this.createCustomTemplate(clonedTemplate);
  }

  /**
   * 應用模板到專案
   */
  async applyTemplateToProject(
    templateId: string, 
    projectId: string,
    options?: {
      createCharacters?: boolean;
      selectedArchetypes?: string[];
      updateProjectSettings?: boolean;
    }
  ): Promise<TemplateApplicationResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        message: '找不到指定的模板',
        appliedSettings: {
          worldSetting: {} as WorldSetting,
          createdCharacters: [],
          projectSettings: {}
        }
      };
    }

    try {
      const results: TemplateApplicationResult = {
        success: true,
        message: `成功應用模板「${template.name}」`,
        appliedSettings: {
          worldSetting: template.worldSetting,
          createdCharacters: [],
          projectSettings: {}
        }
      };

      // 1. 更新專案設定
      if (options?.updateProjectSettings !== false) {
        const projectSettings = {
          templateId: template.id,
          templateType: template.type,
          templateName: template.name,
          worldSetting: template.worldSetting,
          writingGuidelines: template.writingGuidelines,
          aiPromptTemplate: template.aiPromptTemplate,
          appliedAt: new Date().toISOString()
        };

        try {
          // 獲取當前專案並更新設定
          const currentProject = await api.projects.getById(projectId);
          if (currentProject) {
            await api.projects.update({
              ...currentProject,
              settings: {
                aiModel: 'llama3.2',
                aiParams: {
                  temperature: 0.7,
                  topP: 0.9,
                  maxTokens: 400
                }
              }
            });
          }

          results.appliedSettings.projectSettings = projectSettings;
        } catch (error) {
          console.error('更新專案設定失敗:', error);
          results.errors = results.errors || [];
          results.errors.push('更新專案設定失敗');
        }
      }

      // 2. 創建角色（如果需要）
      if (options?.createCharacters !== false) {
        try {
          const { templateCharacterService } = await import('./templateCharacterService');
          const characterResult = await templateCharacterService.createCharactersFromTemplate(
            template,
            projectId,
            options?.selectedArchetypes
          );

          if (characterResult.success) {
            results.appliedSettings.createdCharacters = characterResult.createdCharacters.map(c => c.id);
            
            // 建立角色關係
            if (characterResult.createdCharacters.length > 1) {
              await templateCharacterService.establishCharacterRelationships(
                characterResult.createdCharacters,
                template
              );
            }
          } else {
            results.errors = results.errors || [];
            results.errors.push(...characterResult.errors);
          }
        } catch (error) {
          console.error('創建角色失敗:', error);
          results.errors = results.errors || [];
          results.errors.push(`創建角色失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      }

      // 3. 檢查是否有錯誤
      if (results.errors && results.errors.length > 0) {
        results.success = false;
        results.message = `模板應用部分成功，但有 ${results.errors.length} 個錯誤`;
      }

      return results;
    } catch (error) {
      return {
        success: false,
        message: `應用模板失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        appliedSettings: {
          worldSetting: {} as WorldSetting,
          createdCharacters: [],
          projectSettings: {}
        },
        errors: [error instanceof Error ? error.message : '未知錯誤']
      };
    }
  }

  /**
   * 搜索模板
   */
  searchTemplates(query: string): NovelTemplate[] {
    if (!query.trim()) {
      return this.getAllTemplates();
    }

    const searchTerm = query.toLowerCase();
    return this.getAllTemplates().filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.worldSetting.era.toLowerCase().includes(searchTerm) ||
      template.worldSetting.specialElements.some(element => 
        element.toLowerCase().includes(searchTerm)
      )
    );
  }

  /**
   * 獲取模板統計資訊
   */
  getTemplateStats() {
    const allTemplates = this.getAllTemplates();
    const stats = {
      total: allTemplates.length,
      byType: {} as Record<TemplateType, number>,
      custom: this.getCustomTemplates().length,
      active: this.getActiveTemplates().length
    };

    // 統計各類型模板數量
    allTemplates.forEach(template => {
      stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 導出模板
   */
  exportTemplate(id: string): string {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error('找不到要導出的模板');
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * 導入模板
   */
  importTemplate(templateJson: string): string {
    try {
      const templateData = JSON.parse(templateJson) as NovelTemplate;
      
      // 移除 ID 和時間戳，讓系統重新生成
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...importData } = templateData;
      
      return this.createCustomTemplate(importData);
    } catch (error) {
      throw new Error(`導入模板失敗: ${error instanceof Error ? error.message : '無效的 JSON 格式'}`);
    }
  }
}

// 創建單例實例
export const templateService = new TemplateService();