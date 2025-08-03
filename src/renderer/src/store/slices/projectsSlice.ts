import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../api';

export interface Project {
  id: string;
  name: string;
  type: 'isekai' | 'school' | 'scifi' | 'fantasy';
  description: string;
  createdAt: string; // 改為字符串以符合 Redux 序列化要求
  updatedAt: string; // 改為字符串以符合 Redux 序列化要求
  settings: {
    aiModel?: string;
    aiParams?: {
      temperature: number;
      topP: number;
      maxTokens: number;
    };
  };
}

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
};

// 異步 thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async () => {
    const projects = await api.projects.getAll();
    // 確保日期是字符串格式
    return projects.map((project: { id: string; name: string; type: string; description: string; createdAt: Date | string; updatedAt: Date | string; settings?: Record<string, unknown> }) => ({
      ...project,
      createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
      updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : project.updatedAt,
    }));
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const projectId = await api.projects.create(projectData);
    const project = await api.projects.getById(projectId);
    // 確保日期是字符串格式
    return {
      ...project,
      createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
      updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : project.updatedAt,
    };
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async (project: Project) => {
    await api.projects.update(project);
    return project;
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId: string) => {
    await api.projects.delete(projectId);
    return projectId;
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId: string) => {
    const project = await api.projects.getById(projectId);
    return project;
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProjects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '獲取專案列表失敗';
      })
      
      // createProject
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.unshift(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '創建專案失敗';
      })
      
      // updateProject
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
      })
      
      // deleteProject
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload);
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null;
        }
      })
      
      // fetchProjectById
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.currentProject = action.payload;
      });
  },
});

export const { setCurrentProject, clearError } = projectsSlice.actions;
export default projectsSlice.reducer;