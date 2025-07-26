import React, { useState } from 'react';
import { Project } from '../types';
import { PROJECT_TYPES } from '../constants';
import { componentStyles, baseStyles } from '../styles';
import { storage, generateId } from '../utils';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('isekai');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      alert('請輸入專案名稱');
      return;
    }

    const newProject: Project = {
      id: generateId(),
      name: projectName,
      type: projectType,
      description: description,
      createdAt: new Date().toISOString(),
      wordCount: 0,
      chapterCount: 0
    };

    // 儲存到本地儲存
    const existingProjects = storage.getProjects();
    existingProjects.push(newProject);
    storage.saveProjects(existingProjects);

    const selectedType = PROJECT_TYPES.find(t => t.id === projectType);
    alert(`✅ 專案「${projectName}」創建成功！\n類型：${selectedType?.name}\n${description ? '描述：' + description : ''}`);
    
    // 重置表單
    setProjectName('');
    setDescription('');
    onClose();
  };

  return (
    <div style={componentStyles.modalOverlay}>
      <div style={{ ...componentStyles.modalContent, maxWidth: '600px' }}>
        <h2 style={componentStyles.title}>
          🌟 創世神模式
        </h2>
        
        <div style={{ marginBottom: baseStyles.marginXLarge }}>
          <label style={{ display: 'block', color: baseStyles.primaryColor, marginBottom: baseStyles.marginSmall }}>
            專案名稱 *
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="輸入你的異世界故事名稱..."
            style={componentStyles.input}
          />
        </div>

        <div style={{ marginBottom: baseStyles.marginXLarge }}>
          <label style={{ display: 'block', color: baseStyles.primaryColor, marginBottom: baseStyles.marginSmall }}>
            故事類型
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: baseStyles.marginMedium }}>
            {PROJECT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setProjectType(type.id)}
                style={{
                  background: projectType === type.id ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)',
                  border: `2px solid ${projectType === type.id ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}`,
                  borderRadius: baseStyles.borderRadiusLarge,
                  padding: baseStyles.paddingLarge,
                  color: baseStyles.primaryColor,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ fontSize: baseStyles.fontSizeXLarge, marginBottom: '5px' }}>{type.icon}</div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{type.name}</div>
                <div style={{ fontSize: baseStyles.fontSizeSmall, opacity: 0.8 }}>{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: baseStyles.marginXLarge }}>
          <label style={{ display: 'block', color: baseStyles.primaryColor, marginBottom: baseStyles.marginSmall }}>
            故事簡介 (選填)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="簡述你的故事背景和主要情節..."
            style={{ ...componentStyles.textarea, height: '80px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: baseStyles.marginMedium, justifyContent: 'center' }}>
          <button
            onClick={handleCreateProject}
            style={componentStyles.primaryButton}
          >
            ✨ 創造世界
          </button>
          <button
            onClick={onClose}
            style={componentStyles.secondaryButton}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;