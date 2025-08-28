// 視覺創建數據管理 Hook
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { 
  initializeVisualCreation, 
  clearError 
} from '../../store/slices/visualCreationSlice';
import { fetchCharactersByProjectId } from '../../store/slices/charactersSlice';

export const useVisualCreationData = () => {
  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  const visualCreationState = useSelector((state: RootState) => state.visualCreation);

  // 初始化組件 - 載入角色資料
  useEffect(() => {
    if (currentProject) {
      console.log('🎨 [VisualCreationCenter] 初始化，專案ID:', currentProject.id);
      dispatch(clearError());
      dispatch(initializeVisualCreation(currentProject.id));
      
      // 載入角色資料到 Redux
      console.log('📊 [VisualCreationCenter] 載入角色資料...');
      dispatch(fetchCharactersByProjectId(currentProject.id));
    }
  }, [currentProject, dispatch]);

  // 調試：監控角色狀態變化
  useEffect(() => {
    console.log('🎨 [VisualCreationCenter] 角色狀態更新:');
    console.log('   📊 角色總數:', characters.length);
    if (characters.length > 0) {
      console.log('   🎭 角色列表:', characters.map(c => ({
        id: c.id,
        name: c.name,
        projectId: c.projectId
      })));
    }
    
    if (currentProject) {
      const projectCharacters = characters.filter(c => String(c.projectId) === String(currentProject.id));
      console.log('   🎯 專案角色數:', projectCharacters.length);
    }
  }, [characters, currentProject]);

  return {
    currentProject,
    characters,
    ...visualCreationState
  };
};