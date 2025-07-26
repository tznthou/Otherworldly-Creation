import React, { useState } from 'react';
import { Character } from '../types';
import { CHARACTER_ARCHETYPES } from '../constants';
import { componentStyles, baseStyles } from '../styles';
import { storage, generateId } from '../utils';

interface CharacterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewCharacterData {
  name: string;
  age: string;
  gender: 'male' | 'female';
  archetype: string;
  description: string;
}

const initialCharacterData: NewCharacterData = {
  name: '',
  age: '',
  gender: 'male',
  archetype: 'hero',
  description: ''
};

const CharacterManagerModal: React.FC<CharacterManagerModalProps> = ({ isOpen, onClose }) => {
  const [characters, setCharacters] = useState<Character[]>(() => storage.getCharacters());
  const [isCreating, setIsCreating] = useState(false);
  const [newCharacter, setNewCharacter] = useState<NewCharacterData>(initialCharacterData);

  if (!isOpen) return null;

  const handleCreateCharacter = () => {
    if (!newCharacter.name.trim()) {
      alert('請輸入角色名稱');
      return;
    }

    const character: Character = {
      id: generateId(),
      ...newCharacter,
      createdAt: new Date().toISOString()
    };

    const updatedCharacters = [...characters, character];
    setCharacters(updatedCharacters);
    storage.saveCharacters(updatedCharacters);

    alert(`✅ 角色「${newCharacter.name}」創建成功！`);
    setNewCharacter(initialCharacterData);
    setIsCreating(false);
  };

  const handleDeleteCharacter = (id: string) => {
    if (confirm('確定要刪除這個角色嗎？')) {
      const updatedCharacters = characters.filter(c => c.id !== id);
      setCharacters(updatedCharacters);
      storage.saveCharacters(updatedCharacters);
    }
  };

  const renderCharacterList = () => (
    <div style={{ marginBottom: baseStyles.marginXLarge }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: baseStyles.marginLarge 
      }}>
        <h3 style={{ color: baseStyles.primaryColor, margin: 0 }}>
          角色列表 ({characters.length})
        </h3>
        <button
          onClick={() => setIsCreating(true)}
          style={{
            background: baseStyles.primaryColor,
            color: baseStyles.backgroundColor,
            border: 'none',
            padding: '8px 16px',
            borderRadius: baseStyles.borderRadiusMedium,
            cursor: 'pointer',
            fontSize: baseStyles.fontSizeNormal
          }}
        >
          ➕ 新增角色
        </button>
      </div>

      {characters.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(255, 215, 0, 0.1)',
          borderRadius: baseStyles.borderRadiusXLarge,
          border: '1px dashed #FFD700'
        }}>
          <div style={{ fontSize: '48px', marginBottom: baseStyles.marginLarge }}>👥</div>
          <div style={{ color: baseStyles.primaryColor, marginBottom: baseStyles.marginMedium }}>
            還沒有任何角色
          </div>
          <div style={{ color: baseStyles.textColor, fontSize: baseStyles.fontSizeNormal }}>
            點擊「新增角色」開始創建你的角色吧！
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: baseStyles.marginLarge 
        }}>
          {characters.map(character => {
            const archetype = CHARACTER_ARCHETYPES.find(a => a.id === character.archetype);
            return (
              <div key={character.id} style={componentStyles.card}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: baseStyles.marginMedium 
                }}>
                  <h4 style={{ color: baseStyles.primaryColor, margin: 0 }}>
                    {character.name}
                  </h4>
                  <button
                    onClick={() => handleDeleteCharacter(character.id)}
                    style={{
                      background: 'transparent',
                      color: baseStyles.errorColor,
                      border: `1px solid ${baseStyles.errorColor}`,
                      borderRadius: baseStyles.borderRadiusSmall,
                      padding: '2px 6px',
                      cursor: 'pointer',
                      fontSize: baseStyles.fontSizeSmall
                    }}
                  >
                    🗑️
                  </button>
                </div>
                <div style={{ 
                  color: baseStyles.textColor, 
                  fontSize: '13px', 
                  lineHeight: '1.4' 
                }}>
                  <div><strong>類型：</strong>{archetype?.name}</div>
                  <div><strong>年齡：</strong>{character.age}</div>
                  <div><strong>性別：</strong>{character.gender === 'male' ? '男' : '女'}</div>
                  {character.description && (
                    <div style={{ marginTop: baseStyles.marginSmall }}>
                      <strong>描述：</strong>{character.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderCharacterForm = () => (
    <>
      <h3 style={{ color: baseStyles.primaryColor, marginBottom: baseStyles.marginXLarge }}>
        創建新角色
      </h3>
      
      <div style={{ marginBottom: baseStyles.marginLarge }}>
        <label style={{ 
          display: 'block', 
          color: baseStyles.primaryColor, 
          marginBottom: '5px' 
        }}>
          角色名稱 *
        </label>
        <input
          type="text"
          value={newCharacter.name}
          onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
          placeholder="輸入角色名稱..."
          style={{ ...componentStyles.input, fontSize: baseStyles.fontSizeNormal }}
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: baseStyles.marginLarge, 
        marginBottom: baseStyles.marginLarge 
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            color: baseStyles.primaryColor, 
            marginBottom: '5px' 
          }}>
            年齡
          </label>
          <input
            type="text"
            value={newCharacter.age}
            onChange={(e) => setNewCharacter({ ...newCharacter, age: e.target.value })}
            placeholder="例: 17"
            style={{ ...componentStyles.input, fontSize: baseStyles.fontSizeNormal }}
          />
        </div>
        <div>
          <label style={{ 
            display: 'block', 
            color: baseStyles.primaryColor, 
            marginBottom: '5px' 
          }}>
            性別
          </label>
          <select
            value={newCharacter.gender}
            onChange={(e) => setNewCharacter({ 
              ...newCharacter, 
              gender: e.target.value as 'male' | 'female' 
            })}
            style={{ ...componentStyles.input, fontSize: baseStyles.fontSizeNormal }}
          >
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: baseStyles.marginLarge }}>
        <label style={{ 
          display: 'block', 
          color: baseStyles.primaryColor, 
          marginBottom: '5px' 
        }}>
          角色類型
        </label>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: baseStyles.marginSmall 
        }}>
          {CHARACTER_ARCHETYPES.map(archetype => (
            <button
              key={archetype.id}
              onClick={() => setNewCharacter({ ...newCharacter, archetype: archetype.id })}
              style={{
                background: newCharacter.archetype === archetype.id 
                  ? 'rgba(255, 215, 0, 0.3)' 
                  : 'rgba(255, 215, 0, 0.1)',
                border: `2px solid ${newCharacter.archetype === archetype.id 
                  ? '#FFD700' 
                  : 'rgba(255, 215, 0, 0.5)'}`,
                borderRadius: baseStyles.borderRadiusMedium,
                padding: baseStyles.paddingMedium,
                color: baseStyles.primaryColor,
                cursor: 'pointer',
                fontSize: baseStyles.fontSizeSmall,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: baseStyles.fontSizeLarge, marginBottom: '3px' }}>
                {archetype.icon}
              </div>
              <div style={{ fontWeight: 'bold' }}>{archetype.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: baseStyles.marginXLarge }}>
        <label style={{ 
          display: 'block', 
          color: baseStyles.primaryColor, 
          marginBottom: '5px' 
        }}>
          角色描述 (選填)
        </label>
        <textarea
          value={newCharacter.description}
          onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
          placeholder="描述角色的外貌、性格、背景..."
          style={{ ...componentStyles.textarea, height: '60px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: baseStyles.marginMedium, justifyContent: 'center' }}>
        <button
          onClick={handleCreateCharacter}
          style={{
            ...componentStyles.primaryButton,
            padding: '10px 20px',
            fontSize: baseStyles.fontSizeNormal
          }}
        >
          ✨ 創建角色
        </button>
        <button
          onClick={() => setIsCreating(false)}
          style={{
            ...componentStyles.secondaryButton,
            padding: '10px 20px',
            fontSize: baseStyles.fontSizeNormal
          }}
        >
          返回列表
        </button>
      </div>
    </>
  );

  return (
    <div style={componentStyles.modalOverlay}>
      <div style={{ ...componentStyles.modalContent, maxWidth: '800px' }}>
        <h2 style={componentStyles.title}>
          ⚔️ 英靈召喚 - 角色管理
        </h2>

        {!isCreating ? renderCharacterList() : renderCharacterForm()}

        <div style={{ marginTop: baseStyles.marginXLarge, textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              ...componentStyles.secondaryButton,
              padding: '10px 20px',
              fontSize: baseStyles.fontSizeNormal
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterManagerModal;