import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Character, CharacterFormData } from '../../types/character';
import { 
  CharacterList, 
  CharacterModal, 
  CharacterDetailModal,
  RelationshipVisualization
} from '../../components/Characters';

const CharacterManager: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [projectType, setProjectType] = useState<string>('');
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [showRelationshipView, setShowRelationshipView] = useState(false);
  const [consistencyIssues, setConsistencyIssues] = useState<any[]>([]);

  // 載入專案資訊和角色列表
  useEffect(() => {
    const loadProjectData = async () => {
      if (projectId) {
        try {
          // 載入專案資訊
          const project = await window.electronAPI.projects.getById(projectId);
          if (project) {
            setProjectType(project.type);
          }
          
          // 載入角色列表
          const characters = await window.electronAPI.characters.getByProjectId(projectId);
          setAllCharacters(characters);
          
          // 檢查關係一致性
          const issues = await window.electronAPI.characters.checkRelationshipConsistency(projectId);
          setConsistencyIssues(issues);
        } catch (error) {
          console.error('載入專案資料失敗:', error);
        }
      }
    };
    
    loadProjectData();
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">錯誤</h2>
          <p className="text-gray-600">無效的專案 ID</p>
        </div>
      </div>
    );
  }

  const handleCreateCharacter = () => {
    setSelectedCharacter(null);
    setIsCreateModalOpen(true);
  };

  const handleEditCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setIsEditModalOpen(true);
  };

  const handleViewCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setIsDetailModalOpen(true);
  };

  const handleDeleteCharacter = (character: Character) => {
    setSelectedCharacter(character);
    // 刪除邏輯在 CharacterList 組件中處理
  };

  const handleSaveCharacter = async (formData: CharacterFormData) => {
    try {
      if (selectedCharacter) {
        // 更新現有角色
        await window.electronAPI.characters.update({
          ...selectedCharacter,
          ...formData,
        });
        
        // 如果有關係資料，更新關係
        if (formData.relationships) {
          await window.electronAPI.characters.updateRelationships(
            selectedCharacter.id,
            formData.relationships
          );
        }
      } else {
        // 創建新角色
        const characterId = await window.electronAPI.characters.create({
          ...formData,
          projectId,
        });
        
        // 如果有關係資料，創建關係
        if (formData.relationships && formData.relationships.length > 0) {
          await window.electronAPI.characters.updateRelationships(
            characterId,
            formData.relationships
          );
        }
      }
      
      // 重新載入角色列表
      const updatedCharacters = await window.electronAPI.characters.getByProjectId(projectId);
      setAllCharacters(updatedCharacters);
      
      // 重新檢查關係一致性
      const issues = await window.electronAPI.characters.checkRelationshipConsistency(projectId);
      setConsistencyIssues(issues);
      
      // 關閉模態框
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedCharacter(null);
    } catch (error) {
      console.error('儲存角色失敗:', error);
      throw error;
    }
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDetailModalOpen(false);
    setSelectedCharacter(null);
  };

  const handleCharacterClickInVisualization = (character: Character) => {
    setSelectedCharacter(character);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="h-full bg-cosmic-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 視圖切換按鈕 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowRelationshipView(false)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                !showRelationshipView
                  ? 'bg-gold-500 text-cosmic-950'
                  : 'bg-cosmic-800 text-gray-300 border border-cosmic-700 hover:bg-cosmic-700'
              }`}
            >
              角色列表
            </button>
            <button
              onClick={() => setShowRelationshipView(true)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                showRelationshipView
                  ? 'bg-gold-500 text-cosmic-950'
                  : 'bg-cosmic-800 text-gray-300 border border-cosmic-700 hover:bg-cosmic-700'
              }`}
            >
              關係圖
            </button>
          </div>
          
          {/* 一致性問題提示 */}
          {consistencyIssues.length > 0 && (
            <div className="flex items-center space-x-2 text-gold-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium">
                {consistencyIssues.length} 個關係一致性問題
              </span>
            </div>
          )}
        </div>

        {/* 內容區域 */}
        {showRelationshipView ? (
          <div className="space-y-6">
            <RelationshipVisualization
              characters={allCharacters}
              onCharacterClick={handleCharacterClickInVisualization}
              selectedCharacterId={selectedCharacter?.id}
            />
            
            {/* 一致性問題列表 */}
            {consistencyIssues.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-medium text-gold-400 mb-4">關係一致性問題</h3>
                <div className="space-y-3">
                  {consistencyIssues.map((issue, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        issue.severity === 'warning'
                          ? 'bg-cosmic-800/50 border-gold-500'
                          : 'bg-cosmic-800/50 border-red-500'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {issue.severity === 'warning' ? (
                            <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm ${
                            issue.severity === 'warning' ? 'text-gold-300' : 'text-red-300'
                          }`}>
                            {issue.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <CharacterList
            projectId={projectId}
            onCreateCharacter={handleCreateCharacter}
            onEditCharacter={handleEditCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onViewCharacter={handleViewCharacter}
          />
        )}
      </div>

      {/* 創建角色模態框 */}
      <CharacterModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveCharacter}
        projectId={projectId}
        projectType={projectType}
        allCharacters={allCharacters}
      />

      {/* 編輯角色模態框 */}
      <CharacterModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveCharacter}
        character={selectedCharacter}
        projectId={projectId}
        projectType={projectType}
        allCharacters={allCharacters}
      />

      {/* 角色詳情模態框 */}
      <CharacterDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseModals}
        character={selectedCharacter}
        onEdit={handleEditCharacter}
        onDelete={handleDeleteCharacter}
        allCharacters={allCharacters}
      />
    </div>
  );
};

export default CharacterManager;