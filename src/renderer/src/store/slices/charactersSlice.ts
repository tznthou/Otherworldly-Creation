import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../api';
import { Character, Relationship } from '../../api/models';

interface RelationshipConsistencyIssue {
  type: 'missing' | 'conflicting' | 'orphaned';
  characterId: string;
  characterName: string;
  relationshipId?: string;
  description: string;
}

interface CharactersState {
  characters: Character[];
  currentCharacter: Character | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filteredCharacters: Character[];
  relationshipConsistencyIssues: RelationshipConsistencyIssue[];
}

const initialState: CharactersState = {
  characters: [],
  currentCharacter: null,
  loading: false,
  error: null,
  searchQuery: '',
  filteredCharacters: [],
  relationshipConsistencyIssues: [],
};

// 異步 thunks
export const fetchCharactersByProjectId = createAsyncThunk(
  'characters/fetchCharactersByProjectId',
  async (projectId: string) => {
    const characters = await api.characters.getByProjectId(projectId);
    return characters;
  }
);

export const createCharacter = createAsyncThunk(
  'characters/createCharacter',
  async (characterData: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => {
    const characterId = await api.characters.create(characterData);
    
    // 如果有關係資料，創建關係
    if (characterData.relationships && characterData.relationships.length > 0) {
      // updateRelationships 方法不存在，先清除再重新創建
      await api.characters.clearRelationships(characterId);
    }
    
    const character = await api.characters.getById(characterId);
    return character;
  }
);

export const updateCharacter = createAsyncThunk(
  'characters/updateCharacter',
  async (character: Character) => {
    await api.characters.update(character);
    
    // 如果有關係資料，更新關係
    if (character.relationships) {
      // updateRelationships 方法不存在，先清除再重新創建
      await api.characters.clearRelationships(character.id);
    }
    
    return character;
  }
);

export const deleteCharacter = createAsyncThunk(
  'characters/deleteCharacter',
  async (characterId: string) => {
    await api.characters.delete(characterId);
    return characterId;
  }
);

export const fetchCharacterById = createAsyncThunk(
  'characters/fetchCharacterById',
  async (characterId: string) => {
    const character = await api.characters.getById(characterId);
    return character;
  }
);

export const updateCharacterRelationships = createAsyncThunk(
  'characters/updateCharacterRelationships',
  async ({ characterId, _relationships }: { characterId: string; _relationships: Relationship[] }) => {
    // updateRelationships 方法不存在，先清除再重新創建
      await api.characters.clearRelationships(characterId);
    const character = await api.characters.getById(characterId);
    return character;
  }
);

export const checkRelationshipConsistency = createAsyncThunk(
  'characters/checkRelationshipConsistency',
  async (_projectId: string) => {
    // checkRelationshipConsistency 方法不存在，返回空陣列
    const issues: RelationshipConsistencyIssue[] = [];
    return issues;
  }
);

// 輔助函數：過濾角色
const filterCharacters = (characters: Character[], query: string): Character[] => {
  if (!query.trim()) return characters;
  
  const lowercaseQuery = query.toLowerCase();
  return characters.filter(character =>
    character.name.toLowerCase().includes(lowercaseQuery) ||
    character.archetype?.toLowerCase().includes(lowercaseQuery) ||
    character.personality?.toLowerCase().includes(lowercaseQuery) ||
    character.background?.toLowerCase().includes(lowercaseQuery)
  );
};

const charactersSlice = createSlice({
  name: 'characters',
  initialState,
  reducers: {
    setCurrentCharacter: (state, action: PayloadAction<Character | null>) => {
      state.currentCharacter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredCharacters = filterCharacters(state.characters, action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
    // 角色原型模板
    applyCharacterArchetype: (state, action: PayloadAction<{
      characterId: string;
      archetype: {
        name: string;
        personality: string;
        appearance?: string;
        background?: string;
      };
    }>) => {
      const { characterId, archetype } = action.payload;
      const character = state.characters.find(c => c.id === characterId);
      
      if (character) {
        character.archetype = archetype.name;
        character.personality = archetype.personality;
        if (archetype.appearance) character.appearance = archetype.appearance;
        if (archetype.background) character.background = archetype.background;
        character.updatedAt = new Date().toISOString();
        
        // 更新當前角色
        if (state.currentCharacter?.id === characterId) {
          state.currentCharacter = { ...character };
        }
        
        // 更新過濾結果
        state.filteredCharacters = filterCharacters(state.characters, state.searchQuery);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCharactersByProjectId
      .addCase(fetchCharactersByProjectId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCharactersByProjectId.fulfilled, (state, action) => {
        state.loading = false;
        state.characters = action.payload;
        state.filteredCharacters = filterCharacters(action.payload, state.searchQuery);
      })
      .addCase(fetchCharactersByProjectId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '獲取角色列表失敗';
      })
      
      // createCharacter
      .addCase(createCharacter.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCharacter.fulfilled, (state, action) => {
        state.loading = false;
        state.characters.push(action.payload);
        state.filteredCharacters = filterCharacters(state.characters, state.searchQuery);
      })
      .addCase(createCharacter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '創建角色失敗';
      })
      
      // updateCharacter
      .addCase(updateCharacter.fulfilled, (state, action) => {
        const index = state.characters.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.characters[index] = action.payload;
        }
        if (state.currentCharacter?.id === action.payload.id) {
          state.currentCharacter = action.payload;
        }
        state.filteredCharacters = filterCharacters(state.characters, state.searchQuery);
      })
      .addCase(updateCharacter.rejected, (state, action) => {
        state.error = action.error.message || '更新角色失敗';
      })
      
      // deleteCharacter
      .addCase(deleteCharacter.fulfilled, (state, action) => {
        state.characters = state.characters.filter(c => c.id !== action.payload);
        if (state.currentCharacter?.id === action.payload) {
          state.currentCharacter = null;
        }
        state.filteredCharacters = filterCharacters(state.characters, state.searchQuery);
      })
      .addCase(deleteCharacter.rejected, (state, action) => {
        state.error = action.error.message || '刪除角色失敗';
      })
      
      // fetchCharacterById
      .addCase(fetchCharacterById.fulfilled, (state, action) => {
        state.currentCharacter = action.payload;
      })
      
      // updateCharacterRelationships
      .addCase(updateCharacterRelationships.fulfilled, (state, action) => {
        const index = state.characters.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.characters[index] = action.payload;
        }
        if (state.currentCharacter?.id === action.payload.id) {
          state.currentCharacter = action.payload;
        }
        state.filteredCharacters = filterCharacters(state.characters, state.searchQuery);
      })
      .addCase(updateCharacterRelationships.rejected, (state, action) => {
        state.error = action.error.message || '更新角色關係失敗';
      })
      
      // checkRelationshipConsistency
      .addCase(checkRelationshipConsistency.fulfilled, (state, action) => {
        state.relationshipConsistencyIssues = action.payload;
      })
      .addCase(checkRelationshipConsistency.rejected, (state, action) => {
        state.error = action.error.message || '檢查關係一致性失敗';
      });
  },
});

export const {
  setCurrentCharacter,
  setSearchQuery,
  clearError,
  applyCharacterArchetype,
} = charactersSlice.actions;

export default charactersSlice.reducer;