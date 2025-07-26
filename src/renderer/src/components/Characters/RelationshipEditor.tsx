import React, { useState, useEffect } from 'react';
import { Character, Relationship, RelationshipFormData, RELATIONSHIP_TYPES, RelationshipValidationError } from '../../types/character';

interface RelationshipEditorProps {
  character: Character;
  allCharacters: Character[];
  onSave: (relationships: Relationship[]) => Promise<void>;
  onCancel: () => void;
}

export const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  character,
  allCharacters,
  onSave,
  onCancel,
}) => {
  const [relationships, setRelationships] = useState<Relationship[]>(character.relationships || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<RelationshipFormData>({
    targetId: '',
    type: '',
    description: '',
  });
  const [errors, setErrors] = useState<RelationshipValidationError[]>([]);
  const [loading, setLoading] = useState(false);

  // 過濾掉當前角色，避免自己與自己建立關係
  const availableCharacters = allCharacters.filter(c => c.id !== character.id);

  useEffect(() => {
    setRelationships(character.relationships || []);
  }, [character.relationships]);

  const validateForm = (): boolean => {
    const newErrors: RelationshipValidationError[] = [];

    if (!formData.targetId) {
      newErrors.push({ field: 'targetId', message: '請選擇目標角色' });
    }

    if (!formData.type) {
      newErrors.push({ field: 'type', message: '請選擇關係類型' });
    }

    if (!formData.description.trim()) {
      newErrors.push({ field: 'description', message: '請輸入關係描述' });
    } else if (formData.description.trim().length > 200) {
      newErrors.push({ field: 'description', message: '關係描述不能超過 200 個字符' });
    }

    // 檢查是否已存在相同的關係
    const existingRelationship = relationships.find(
      (rel, index) => 
        rel.targetId === formData.targetId && 
        rel.type === formData.type && 
        index !== editingIndex
    );

    if (existingRelationship) {
      newErrors.push({ field: 'targetId', message: '與該角色的此類型關係已存在' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAddRelationship = () => {
    setEditingIndex(null);
    setFormData({
      targetId: '',
      type: '',
      description: '',
    });
    setErrors([]);
  };

  const handleEditRelationship = (index: number) => {
    const relationship = relationships[index];
    setEditingIndex(index);
    setFormData({
      targetId: relationship.targetId,
      type: relationship.type,
      description: relationship.description,
    });
    setErrors([]);
  };

  const handleSaveRelationship = () => {
    if (!validateForm()) {
      return;
    }

    const newRelationship: Relationship = {
      targetId: formData.targetId,
      type: formData.type,
      description: formData.description,
    };

    let updatedRelationships: Relationship[];
    if (editingIndex !== null) {
      // 編輯現有關係
      updatedRelationships = [...relationships];
      updatedRelationships[editingIndex] = newRelationship;
    } else {
      // 添加新關係
      updatedRelationships = [...relationships, newRelationship];
    }

    setRelationships(updatedRelationships);
    setEditingIndex(null);
    setFormData({
      targetId: '',
      type: '',
      description: '',
    });
    setErrors([]);
  };

  const handleDeleteRelationship = (index: number) => {
    const updatedRelationships = relationships.filter((_, i) => i !== index);
    setRelationships(updatedRelationships);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setFormData({
      targetId: '',
      type: '',
      description: '',
    });
    setErrors([]);
  };

  const handleSaveAll = async () => {
    try {
      setLoading(true);
      await onSave(relationships);
    } catch (error) {
      console.error('儲存關係失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCharacterName = (characterId: string): string => {
    const character = availableCharacters.find(c => c.id === characterId);
    return character?.name || '未知角色';
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  const isEditing = editingIndex !== null;

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {character.name} 的角色關係
        </h3>
        <div className="text-sm text-gray-500">
          {relationships.length} 個關係
        </div>
      </div>

      {/* 關係列表 */}
      <div className="space-y-3">
        {relationships.map((relationship, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {getCharacterName(relationship.targetId)}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {relationship.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {relationship.description}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleEditRelationship(index)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDeleteRelationship(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        ))}

        {relationships.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">👥</div>
            <p>尚未建立任何角色關係</p>
            <p className="text-sm">點擊下方按鈕開始添加關係</p>
          </div>
        )}
      </div>

      {/* 關係編輯表單 */}
      {(editingIndex !== null || formData.targetId || formData.type || formData.description) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-blue-900 mb-4">
            {isEditing ? '編輯關係' : '添加新關係'}
          </h4>
          
          <div className="space-y-4">
            {/* 目標角色選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目標角色 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.targetId}
                onChange={(e) => setFormData(prev => ({ ...prev, targetId: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('targetId') ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">選擇角色</option>
                {availableCharacters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
              {getFieldError('targetId') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('targetId')}</p>
              )}
            </div>

            {/* 關係類型選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                關係類型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('type') ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">選擇關係類型</option>
                {RELATIONSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {getFieldError('type') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('type')}</p>
              )}
            </div>

            {/* 關係描述 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  關係描述 <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">
                  {formData.description.length}/200
                </span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={200}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getFieldError('description') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="描述兩個角色之間的關係..."
              />
              {getFieldError('description') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('description')}</p>
              )}
            </div>

            {/* 表單按鈕 */}
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveRelationship}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isEditing ? '更新關係' : '添加關係'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加關係按鈕 */}
      {editingIndex === null && !formData.targetId && !formData.type && !formData.description && (
        <button
          onClick={handleAddRelationship}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>添加新關係</span>
          </div>
        </button>
      )}

      {/* 底部按鈕 */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '儲存中...' : '儲存所有關係'}
        </button>
      </div>
    </div>
  );
};