import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  StyleTemplate, 
  StyleCategory,
  StyleTemplateFilter,
  StyleTemplateSortBy,
  CreateStyleTemplateRequest,
  UpdateStyleTemplateRequest
} from '../../types/styleTemplate';
import { BUILT_IN_TEMPLATES, STYLE_CATEGORIES } from '../../types/styleTemplate';

// 風格模板 Hook 選項
export interface UseStyleTemplatesOptions {
  /** 初始過濾器 */
  initialFilter?: StyleTemplateFilter;
  /** 初始排序方式 */
  initialSortBy?: StyleTemplateSortBy;
  /** 是否自動載入內建模板 */
  loadBuiltInTemplates?: boolean;
}

// 風格模板 Hook 返回值
export interface UseStyleTemplatesReturn {
  // === 模板資料 ===
  /** 所有可用模板 */
  templates: StyleTemplate[];
  /** 已過濾的模板列表 */
  filteredTemplates: StyleTemplate[];
  /** 當前選中的模板 */
  selectedTemplate: StyleTemplate | null;
  /** 模板類別列表 */
  categories: typeof STYLE_CATEGORIES;
  
  // === 過濾和排序 ===
  /** 當前過濾器 */
  filter: StyleTemplateFilter;
  /** 當前排序方式 */
  sortBy: StyleTemplateSortBy;
  
  // === 載入狀態 ===
  /** 是否正在載入 */
  loading: boolean;
  /** 錯誤信息 */
  error: string | null;
  
  // === 基本操作 ===
  /** 選擇模板 */
  selectTemplate: (template: StyleTemplate | null) => void;
  /** 設置過濾器 */
  setFilter: (filter: StyleTemplateFilter) => void;
  /** 設置排序方式 */
  setSortBy: (sortBy: StyleTemplateSortBy) => void;
  /** 重置過濾器 */
  resetFilter: () => void;
  /** 刷新模板列表 */
  refreshTemplates: () => Promise<void>;
  
  // === 模板管理 ===
  /** 創建新模板 */
  createTemplate: (template: CreateStyleTemplateRequest) => Promise<StyleTemplate>;
  /** 更新模板 */
  updateTemplate: (template: UpdateStyleTemplateRequest) => Promise<StyleTemplate>;
  /** 刪除模板 */
  deleteTemplate: (templateId: string) => Promise<void>;
  /** 複製模板 */
  duplicateTemplate: (templateId: string, newName: string) => Promise<StyleTemplate>;
  
  // === 實用功能 ===
  /** 根據類別獲取模板 */
  getTemplatesByCategory: (category: StyleCategory) => StyleTemplate[];
  /** 搜索模板 */
  searchTemplates: (searchTerm: string) => StyleTemplate[];
  /** 獲取相似模板 */
  getSimilarTemplates: (template: StyleTemplate, limit?: number) => StyleTemplate[];
  /** 驗證模板 */
  validateTemplate: (template: Partial<StyleTemplate>) => { isValid: boolean; errors: string[] };
}

// 模擬 API 函數（實際項目中應該調用真實 API）
const mockStyleTemplateAPI = {
  // 載入所有模板
  loadTemplates: async (): Promise<StyleTemplate[]> => {
    // 模擬異步載入
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 從內建模板創建模板實例
    const builtInTemplates: StyleTemplate[] = BUILT_IN_TEMPLATES.map((template, index) => ({
      ...template,
      id: `built-in-${index}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usage: {
        count: Math.floor(Math.random() * 100),
        lastUsed: new Date().toISOString(),
        rating: Math.floor(Math.random() * 5) + 1
      }
    }));
    
    // 模擬從 localStorage 載入用戶自定義模板
    const customTemplatesJson = localStorage.getItem('custom-style-templates');
    const customTemplates: StyleTemplate[] = customTemplatesJson 
      ? JSON.parse(customTemplatesJson) 
      : [];
    
    return [...builtInTemplates, ...customTemplates];
  },
  
  // 保存模板到本地存儲
  saveCustomTemplates: async (templates: StyleTemplate[]): Promise<void> => {
    const customTemplates = templates.filter(t => !t.isBuiltIn);
    localStorage.setItem('custom-style-templates', JSON.stringify(customTemplates));
  },
  
  // 創建新模板
  createTemplate: async (request: CreateStyleTemplateRequest): Promise<StyleTemplate> => {
    const newTemplate: StyleTemplate = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...request,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usage: {
        count: 0,
        rating: 5
      }
    };
    
    return newTemplate;
  }
};

// 默認過濾器
const DEFAULT_FILTER: StyleTemplateFilter = {
  category: undefined,
  provider: undefined,
  isBuiltIn: undefined,
  tags: undefined,
  searchTerm: ''
};

/**
 * 風格模板管理 Hook
 */
export const useStyleTemplates = (
  options: UseStyleTemplatesOptions = {}
): UseStyleTemplatesReturn => {
  const {
    initialFilter = DEFAULT_FILTER,
    initialSortBy = 'name',
    loadBuiltInTemplates = true
  } = options;
  
  // 狀態管理
  const [templates, setTemplates] = useState<StyleTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<StyleTemplate | null>(null);
  const [filter, setFilter] = useState<StyleTemplateFilter>(initialFilter);
  const [sortBy, setSortBy] = useState<StyleTemplateSortBy>(initialSortBy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 載入模板
  const refreshTemplates = useCallback(async () => {
    if (!loadBuiltInTemplates) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const loadedTemplates = await mockStyleTemplateAPI.loadTemplates();
      setTemplates(loadedTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入模板失敗');
    } finally {
      setLoading(false);
    }
  }, [loadBuiltInTemplates]);
  
  // 初始化載入模板
  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);
  
  // 過濾和排序模板
  const filteredTemplates = useMemo(() => {
    let result = [...templates];
    
    // 應用過濾器
    if (filter.category) {
      result = result.filter(t => t.category === filter.category);
    }
    
    if (filter.provider) {
      result = result.filter(t => t.supportedProviders.includes(filter.provider!));
    }
    
    if (filter.isBuiltIn !== undefined) {
      result = result.filter(t => t.isBuiltIn === filter.isBuiltIn);
    }
    
    if (filter.tags && filter.tags.length > 0) {
      result = result.filter(t => 
        filter.tags!.some(tag => t.tags.includes(tag))
      );
    }
    
    if (filter.searchTerm && filter.searchTerm.trim()) {
      const searchLower = filter.searchTerm.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // 應用排序
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'usage':
          return b.usage.count - a.usage.count;
        case 'rating':
          return (b.usage.rating || 0) - (a.usage.rating || 0);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [templates, filter, sortBy]);
  
  // 選擇模板
  const selectTemplate = useCallback((template: StyleTemplate | null) => {
    setSelectedTemplate(template);
  }, []);
  
  // 重置過濾器
  const resetFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, []);
  
  // 創建模板
  const createTemplate = useCallback(async (request: CreateStyleTemplateRequest): Promise<StyleTemplate> => {
    try {
      const newTemplate = await mockStyleTemplateAPI.createTemplate(request);
      
      // 更新本地狀態
      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      
      // 保存到本地存儲
      await mockStyleTemplateAPI.saveCustomTemplates(updatedTemplates);
      
      return newTemplate;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '創建模板失敗');
    }
  }, [templates]);
  
  // 更新模板
  const updateTemplate = useCallback(async (request: UpdateStyleTemplateRequest): Promise<StyleTemplate> => {
    try {
      const existingTemplate = templates.find(t => t.id === request.id);
      if (!existingTemplate) {
        throw new Error('模板不存在');
      }
      
      if (existingTemplate.isBuiltIn) {
        throw new Error('無法修改內建模板');
      }
      
      const updatedTemplate: StyleTemplate = {
        ...existingTemplate,
        ...request,
        updatedAt: new Date().toISOString()
      };
      
      // 更新本地狀態
      const updatedTemplates = templates.map(t => 
        t.id === request.id ? updatedTemplate : t
      );
      setTemplates(updatedTemplates);
      
      // 保存到本地存儲
      await mockStyleTemplateAPI.saveCustomTemplates(updatedTemplates);
      
      return updatedTemplate;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '更新模板失敗');
    }
  }, [templates]);
  
  // 刪除模板
  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error('模板不存在');
      }
      
      if (template.isBuiltIn) {
        throw new Error('無法刪除內建模板');
      }
      
      // 更新本地狀態
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);
      
      // 如果刪除的是選中的模板，清除選擇
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
      
      // 保存到本地存儲
      await mockStyleTemplateAPI.saveCustomTemplates(updatedTemplates);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '刪除模板失敗');
    }
  }, [templates, selectedTemplate]);
  
  // 複製模板
  const duplicateTemplate = useCallback(async (templateId: string, newName: string): Promise<StyleTemplate> => {
    try {
      const sourceTemplate = templates.find(t => t.id === templateId);
      if (!sourceTemplate) {
        throw new Error('原模板不存在');
      }
      
      const duplicateRequest: CreateStyleTemplateRequest = {
        name: newName,
        category: sourceTemplate.category,
        description: `${sourceTemplate.description} (複製)`,
        parameters: { ...sourceTemplate.parameters },
        tags: [...sourceTemplate.tags],
        supportedProviders: [...sourceTemplate.supportedProviders]
      };
      
      return await createTemplate(duplicateRequest);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '複製模板失敗');
    }
  }, [templates, createTemplate]);
  
  // 根據類別獲取模板
  const getTemplatesByCategory = useCallback((category: StyleCategory): StyleTemplate[] => {
    return templates.filter(t => t.category === category);
  }, [templates]);
  
  // 搜索模板
  const searchTemplates = useCallback((searchTerm: string): StyleTemplate[] => {
    if (!searchTerm.trim()) return templates;
    
    const searchLower = searchTerm.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(searchLower) ||
      t.description.toLowerCase().includes(searchLower) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }, [templates]);
  
  // 獲取相似模板
  const getSimilarTemplates = useCallback((template: StyleTemplate, limit = 5): StyleTemplate[] => {
    // 簡單的相似度算法：基於類別、標籤和提供商
    const similar = templates
      .filter(t => t.id !== template.id)
      .map(t => {
        let similarity = 0;
        
        // 類別匹配
        if (t.category === template.category) similarity += 3;
        
        // 標籤匹配
        const commonTags = t.tags.filter(tag => template.tags.includes(tag));
        similarity += commonTags.length;
        
        // 提供商匹配
        const commonProviders = t.supportedProviders.filter(p => template.supportedProviders.includes(p));
        similarity += commonProviders.length;
        
        return { template: t, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.template);
    
    return similar;
  }, [templates]);
  
  // 驗證模板
  const validateTemplate = useCallback((template: Partial<StyleTemplate>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!template.name || template.name.trim().length < 2) {
      errors.push('模板名稱至少需要2個字符');
    }
    
    if (!template.category) {
      errors.push('必須選擇模板類別');
    }
    
    if (!template.description || template.description.trim().length < 10) {
      errors.push('模板描述至少需要10個字符');
    }
    
    if (!template.supportedProviders || template.supportedProviders.length === 0) {
      errors.push('必須支援至少一個插畫提供商');
    }
    
    if (!template.parameters) {
      errors.push('必須設定模板參數');
    } else {
      if (!template.parameters.positivePrompts || template.parameters.positivePrompts.length === 0) {
        errors.push('必須設定至少一個正面提示詞');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);
  
  return {
    // 資料
    templates,
    filteredTemplates,
    selectedTemplate,
    categories: STYLE_CATEGORIES,
    
    // 狀態
    filter,
    sortBy,
    loading,
    error,
    
    // 基本操作
    selectTemplate,
    setFilter,
    setSortBy,
    resetFilter,
    refreshTemplates,
    
    // 模板管理
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    
    // 實用功能
    getTemplatesByCategory,
    searchTemplates,
    getSimilarTemplates,
    validateTemplate
  };
};