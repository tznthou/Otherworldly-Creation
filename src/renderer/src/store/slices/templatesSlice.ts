import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { NovelTemplate, TemplateType, TemplateFilters, TemplateSortOptions, TemplateState } from '../../types/template';
import { templateService } from '../../services/templateService';

const initialState: TemplateState = {
  templates: [],
  currentTemplate: null,
  loading: false,
  error: null,
  filters: {},
  sortOptions: {
    field: 'name',
    direction: 'asc'
  }
};

// 異步 thunks
export const fetchAllTemplates = createAsyncThunk(
  'templates/fetchAll',
  async () => {
    return templateService.getAllTemplates();
  }
);

export const fetchTemplatesByType = createAsyncThunk(
  'templates/fetchByType',
  async (type: TemplateType) => {
    return templateService.getTemplatesByType(type);
  }
);

export const fetchTemplateById = createAsyncThunk(
  'templates/fetchById',
  async (id: string) => {
    const template = templateService.getTemplateById(id);
    if (!template) {
      throw new Error('找不到指定的模板');
    }
    return template;
  }
);

export const createCustomTemplate = createAsyncThunk(
  'templates/createCustom',
  async (templateData: Omit<NovelTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isCustom'>) => {
    const templateId = templateService.createCustomTemplate(templateData);
    const template = templateService.getTemplateById(templateId);
    if (!template) {
      throw new Error('創建模板後無法找到');
    }
    return template;
  }
);

export const updateTemplate = createAsyncThunk(
  'templates/update',
  async ({ id, updates }: { id: string; updates: Partial<NovelTemplate> }) => {
    const success = templateService.updateTemplate(id, updates);
    if (!success) {
      throw new Error('更新模板失敗');
    }
    const template = templateService.getTemplateById(id);
    if (!template) {
      throw new Error('更新後無法找到模板');
    }
    return template;
  }
);

export const deleteTemplate = createAsyncThunk(
  'templates/delete',
  async (id: string) => {
    const success = templateService.deleteTemplate(id);
    if (!success) {
      throw new Error('刪除模板失敗');
    }
    return id;
  }
);

export const cloneTemplate = createAsyncThunk(
  'templates/clone',
  async ({ id, newName }: { id: string; newName?: string }) => {
    const newTemplateId = templateService.cloneTemplate(id, newName);
    const template = templateService.getTemplateById(newTemplateId);
    if (!template) {
      throw new Error('複製模板後無法找到');
    }
    return template;
  }
);

export const applyTemplateToProject = createAsyncThunk(
  'templates/applyToProject',
  async ({ templateId, projectId }: { templateId: string; projectId: string }) => {
    return await templateService.applyTemplateToProject(templateId, projectId);
  }
);

export const searchTemplates = createAsyncThunk(
  'templates/search',
  async (query: string) => {
    return templateService.searchTemplates(query);
  }
);

export const importTemplate = createAsyncThunk(
  'templates/import',
  async (templateJson: string) => {
    const templateId = templateService.importTemplate(templateJson);
    const template = templateService.getTemplateById(templateId);
    if (!template) {
      throw new Error('導入模板後無法找到');
    }
    return template;
  }
);

// 輔助函數：過濾和排序模板
const filterAndSortTemplates = (
  templates: NovelTemplate[], 
  filters: TemplateFilters, 
  sortOptions: TemplateSortOptions
): NovelTemplate[] => {
  let filtered = [...templates];

  // 應用過濾器
  if (filters.type) {
    filtered = filtered.filter(template => template.type === filters.type);
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm)
    );
  }

  if (filters.isCustom !== undefined) {
    filtered = filtered.filter(template => template.isCustom === filters.isCustom);
  }

  if (filters.isActive !== undefined) {
    filtered = filtered.filter(template => template.isActive === filters.isActive);
  }

  // 應用排序
  filtered.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortOptions.field) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'createdAt':
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case 'updatedAt':
        aValue = a.updatedAt;
        bValue = b.updatedAt;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortOptions.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOptions.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return filtered;
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setCurrentTemplate: (state, action: PayloadAction<NovelTemplate | null>) => {
      state.currentTemplate = action.payload;
    },
    setFilters: (state, action: PayloadAction<TemplateFilters>) => {
      state.filters = action.payload;
    },
    setSortOptions: (state, action: PayloadAction<TemplateSortOptions>) => {
      state.sortOptions = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetTemplateState: (state) => {
      state.currentTemplate = null;
      state.filters = {};
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchAllTemplates
      .addCase(fetchAllTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(fetchAllTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '獲取模板列表失敗';
      })

      // fetchTemplatesByType
      .addCase(fetchTemplatesByType.fulfilled, (state, action) => {
        state.templates = action.payload;
      })

      // fetchTemplateById
      .addCase(fetchTemplateById.fulfilled, (state, action) => {
        state.currentTemplate = action.payload;
      })
      .addCase(fetchTemplateById.rejected, (state, action) => {
        state.error = action.error.message || '獲取模板失敗';
      })

      // createCustomTemplate
      .addCase(createCustomTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.templates.push(action.payload);
        state.currentTemplate = action.payload;
      })
      .addCase(createCustomTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '創建模板失敗';
      })

      // updateTemplate
      .addCase(updateTemplate.fulfilled, (state, action) => {
        const index = state.templates.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
        if (state.currentTemplate?.id === action.payload.id) {
          state.currentTemplate = action.payload;
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.error = action.error.message || '更新模板失敗';
      })

      // deleteTemplate
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter(t => t.id !== action.payload);
        if (state.currentTemplate?.id === action.payload) {
          state.currentTemplate = null;
        }
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.error = action.error.message || '刪除模板失敗';
      })

      // cloneTemplate
      .addCase(cloneTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
      })
      .addCase(cloneTemplate.rejected, (state, action) => {
        state.error = action.error.message || '複製模板失敗';
      })

      // applyTemplateToProject
      .addCase(applyTemplateToProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyTemplateToProject.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(applyTemplateToProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '應用模板失敗';
      })

      // searchTemplates
      .addCase(searchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })

      // importTemplate
      .addCase(importTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
      })
      .addCase(importTemplate.rejected, (state, action) => {
        state.error = action.error.message || '導入模板失敗';
      });
  },
});

export const {
  setCurrentTemplate,
  setFilters,
  setSortOptions,
  clearError,
  resetTemplateState,
} = templatesSlice.actions;

export default templatesSlice.reducer;

// Selectors
export const selectAllTemplates = (state: { templates: TemplateState }) => state.templates.templates;
export const selectCurrentTemplate = (state: { templates: TemplateState }) => state.templates.currentTemplate;
export const selectTemplateLoading = (state: { templates: TemplateState }) => state.templates.loading;
export const selectTemplateError = (state: { templates: TemplateState }) => state.templates.error;
export const selectTemplateFilters = (state: { templates: TemplateState }) => state.templates.filters;
export const selectTemplateSortOptions = (state: { templates: TemplateState }) => state.templates.sortOptions;

export const selectFilteredAndSortedTemplates = (state: { templates: TemplateState }) => {
  return filterAndSortTemplates(
    state.templates.templates,
    state.templates.filters,
    state.templates.sortOptions
  );
};

export const selectTemplatesByType = (type: TemplateType) => (state: { templates: TemplateState }) => {
  return state.templates.templates.filter(template => template.type === type);
};

export const selectDefaultTemplates = (state: { templates: TemplateState }) => {
  return state.templates.templates.filter(template => !template.isCustom);
};

export const selectCustomTemplates = (state: { templates: TemplateState }) => {
  return state.templates.templates.filter(template => template.isCustom);
};

export const selectActiveTemplates = (state: { templates: TemplateState }) => {
  return state.templates.templates.filter(template => template.isActive !== false);
};