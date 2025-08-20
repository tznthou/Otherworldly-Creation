import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchCharactersByProjectId } from '../../store/slices/charactersSlice';
import { api } from '../../api';
import type { Character } from '../../api/models';

export interface UseCharacterSelectionOptions {
  projectId?: string;
  autoLoadOnMount?: boolean;
}

export interface UseCharacterSelectionReturn {
  // 狀態
  selectedCharacters: string[];
  charactersLoading: boolean;
  charactersError: string | null;
  
  // 計算值
  effectiveProjectCharacters: Character[];
  hasSelectedCharacters: boolean;
  selectedCharacterCount: number;
  
  // 函數
  toggleCharacterSelection: (characterId: string) => void;
  selectAllCharacters: () => void;
  clearSelection: () => void;
  setSelectedCharacters: (characterIds: string[]) => void;
  loadCharactersDirectly: () => Promise<void>;
  
  // 實用函數
  isCharacterSelected: (characterId: string) => boolean;
  getSelectedCharactersData: () => Character[];
  getCharacterById: (characterId: string) => Character | undefined;
}

/**
 * 角色選擇管理 Hook
 * 
 * 功能：
 * - 管理角色選擇狀態
 * - 自動載入專案角色
 * - 提供角色過濾和查詢
 * - 錯誤處理和重試機制
 * 
 * @param options 配置選項
 * @returns 角色選擇相關狀態和函數
 */
export const useCharacterSelection = (
  options: UseCharacterSelectionOptions = {}
): UseCharacterSelectionReturn => {
  const { projectId, autoLoadOnMount = true } = options;

  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const reduxCharacters = useSelector((state: RootState) => state.characters.characters);

  // 使用傳入的 projectId 或當前專案 ID
  const effectiveProjectId = projectId || currentProject?.id;

  // 本地狀態
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [charactersError, setCharactersError] = useState<string | null>(null);
  const [directCharacters, setDirectCharacters] = useState<Character[]>([]);

  // 直接載入角色（API fallback）
  const loadCharactersDirectly = useCallback(async () => {
    console.log('🚀 [useCharacterSelection] 開始載入角色');
    
    if (!effectiveProjectId) {
      console.log('❌ 沒有專案 ID，跳過載入');
      setCharactersError('未選擇專案');
      return;
    }

    if (charactersLoading) {
      console.log('⏳ 正在載入中，跳過重複載入');
      return;
    }

    try {
      setCharactersLoading(true);
      setCharactersError(null);
      
      console.log('📡 調用 API 載入角色，專案ID:', effectiveProjectId);
      const apiCharacters = await api.characters.getByProjectId(effectiveProjectId);
      
      console.log('✅ API 載入成功，角色數量:', apiCharacters?.length || 0);
      setDirectCharacters(apiCharacters || []);

      // 同步到 Redux
      console.log('🔄 同步到 Redux...');
      await dispatch(fetchCharactersByProjectId(effectiveProjectId));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '載入角色失敗';
      console.error('❌ 載入角色失敗:', error);
      setCharactersError(errorMessage);
      setDirectCharacters([]);
    } finally {
      setCharactersLoading(false);
    }
  }, [effectiveProjectId, dispatch, charactersLoading]);

  // 計算有效的專案角色列表
  const effectiveProjectCharacters = useMemo(() => {
    // 優先使用直接 API 結果，否則使用 Redux 狀態
    const allCharacters = directCharacters.length > 0 ? directCharacters : reduxCharacters;
    
    if (!effectiveProjectId) return [];

    const filtered = allCharacters.filter(character => {
      const charProjectId = String(character.projectId);
      const currentProjectId = String(effectiveProjectId);
      return charProjectId === currentProjectId;
    });

    console.log(`🎯 [useCharacterSelection] 過濾結果: ${filtered.length}/${allCharacters.length} 個角色`);
    return filtered;
  }, [directCharacters, reduxCharacters, effectiveProjectId]);

  // 計算值
  const hasSelectedCharacters = selectedCharacters.length > 0;
  const selectedCharacterCount = selectedCharacters.length;

  // 角色選擇切換
  const toggleCharacterSelection = useCallback((characterId: string) => {
    setSelectedCharacters(prev => {
      const isSelected = prev.includes(characterId);
      const newSelection = isSelected 
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId];
      
      console.log(`🎭 角色選擇切換: ${characterId} ${isSelected ? '取消' : '選中'}`);
      return newSelection;
    });
  }, []);

  // 選擇所有角色
  const selectAllCharacters = useCallback(() => {
    const allIds = effectiveProjectCharacters.map(char => char.id);
    setSelectedCharacters(allIds);
    console.log('✅ 選擇所有角色:', allIds.length, '個');
  }, [effectiveProjectCharacters]);

  // 清空選擇
  const clearSelection = useCallback(() => {
    setSelectedCharacters([]);
    console.log('🗑️ 清空角色選擇');
  }, []);

  // 實用函數
  const isCharacterSelected = useCallback((characterId: string): boolean => {
    return selectedCharacters.includes(characterId);
  }, [selectedCharacters]);

  const getSelectedCharactersData = useCallback((): Character[] => {
    return selectedCharacters
      .map(id => effectiveProjectCharacters.find(char => char.id === id))
      .filter(Boolean) as Character[];
  }, [selectedCharacters, effectiveProjectCharacters]);

  const getCharacterById = useCallback((characterId: string): Character | undefined => {
    return effectiveProjectCharacters.find(char => char.id === characterId);
  }, [effectiveProjectCharacters]);

  // 自動載入效果
  useEffect(() => {
    if (autoLoadOnMount && effectiveProjectId) {
      console.log('🔄 [useCharacterSelection] 專案變更，自動載入角色');
      loadCharactersDirectly();
    }
  }, [effectiveProjectId, autoLoadOnMount, loadCharactersDirectly]);

  // 調試資訊
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 [useCharacterSelection] Debug Info:');
      console.log('   📂 Project ID:', effectiveProjectId);
      console.log('   📊 Redux characters:', reduxCharacters.length);
      console.log('   🔗 Direct characters:', directCharacters.length);
      console.log('   🎯 Filtered characters:', effectiveProjectCharacters.length);
      console.log('   ✅ Selected characters:', selectedCharacters.length);
      console.log('   ⏳ Loading:', charactersLoading);
      console.log('   ❌ Error:', charactersError);
    }
  }, [
    effectiveProjectId,
    reduxCharacters.length,
    directCharacters.length,
    effectiveProjectCharacters.length,
    selectedCharacters.length,
    charactersLoading,
    charactersError
  ]);

  return {
    // 狀態
    selectedCharacters,
    charactersLoading,
    charactersError,
    
    // 計算值
    effectiveProjectCharacters,
    hasSelectedCharacters,
    selectedCharacterCount,
    
    // 函數
    toggleCharacterSelection,
    selectAllCharacters,
    clearSelection,
    setSelectedCharacters,
    loadCharactersDirectly,
    
    // 實用函數
    isCharacterSelected,
    getSelectedCharactersData,
    getCharacterById,
  };
};

export default useCharacterSelection;