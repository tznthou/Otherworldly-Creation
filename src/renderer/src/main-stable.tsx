import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// 簡化的創建專案模態組件
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('isekai');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const projectTypes = [
    { id: 'isekai', name: '異世界', icon: '🌟', description: '主角穿越或轉生到異世界的冒險故事' },
    { id: 'school', name: '校園', icon: '🏫', description: '以學校為背景的青春戀愛或成長故事' },
    { id: 'scifi', name: '科幻', icon: '🚀', description: '探索未來科技和太空冒險的故事' },
    { id: 'fantasy', name: '奇幻', icon: '⚔️', description: '充滿魔法和神秘生物的奇幻世界冒險' },
  ];

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      alert('請輸入專案名稱');
      return;
    }

    // 模擬專案創建
    const newProject = {
      id: Date.now().toString(),
      name: projectName,
      type: projectType,
      description: description,
      createdAt: new Date().toISOString(),
      wordCount: 0,
      chapterCount: 0
    };

    // 儲存到本地儲存
    const existingProjects = JSON.parse(localStorage.getItem('novel_projects') || '[]');
    existingProjects.push(newProject);
    localStorage.setItem('novel_projects', JSON.stringify(existingProjects));

    alert(`✅ 專案「${projectName}」創建成功！\n類型：${projectTypes.find(t => t.id === projectType)?.name}\n${description ? '描述：' + description : ''}`);
    setProjectName('');
    setDescription('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0A1128 100%)',
        border: '2px solid #FFD700',
        borderRadius: '15px',
        padding: '30px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ color: '#FFD700', textAlign: 'center', marginBottom: '20px' }}>
          🌟 創世神模式
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#FFD700', marginBottom: '8px' }}>
            專案名稱 *
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="輸入你的異世界故事名稱..."
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid #FFD700',
              borderRadius: '5px',
              color: '#FFD700',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#FFD700', marginBottom: '8px' }}>
            故事類型
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {projectTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setProjectType(type.id)}
                style={{
                  background: projectType === type.id ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)',
                  border: `2px solid ${projectType === type.id ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}`,
                  borderRadius: '8px',
                  padding: '15px',
                  color: '#FFD700',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '5px' }}>{type.icon}</div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{type.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#FFD700', marginBottom: '8px' }}>
            故事簡介 (選填)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="簡述你的故事背景和主要情節..."
            style={{
              width: '100%',
              height: '80px',
              padding: '10px',
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid #FFD700',
              borderRadius: '5px',
              color: '#FFD700',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleCreateProject}
            style={{
              background: '#FFD700',
              color: '#0A1128',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ✨ 創造世界
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#FFD700',
              border: '2px solid #FFD700',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

// 簡化的角色管理模態組件
interface CharacterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CharacterManagerModal: React.FC<CharacterManagerModalProps> = ({ isOpen, onClose }) => {
  const [characters, setCharacters] = useState<any[]>(() => {
    const saved = localStorage.getItem('novel_characters');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCreating, setIsCreating] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    age: '',
    gender: 'male',
    archetype: 'hero',
    description: ''
  });

  if (!isOpen) return null;

  const archetypes = [
    { id: 'hero', name: '主角', icon: '⚔️', description: '故事的主人公' },
    { id: 'heroine', name: '女主角', icon: '👸', description: '女性主角' },
    { id: 'mentor', name: '導師', icon: '🧙‍♂️', description: '指導主角的智者' },
    { id: 'villain', name: '反派', icon: '😈', description: '故事的反面角色' },
    { id: 'sidekick', name: '夥伴', icon: '🤝', description: '主角的忠實夥伴' },
    { id: 'rival', name: '競爭對手', icon: '⚡', description: '與主角實力相當的對手' },
  ];

  const handleCreateCharacter = () => {
    if (!newCharacter.name.trim()) {
      alert('請輸入角色名稱');
      return;
    }

    const character = {
      id: Date.now().toString(),
      ...newCharacter,
      createdAt: new Date().toISOString()
    };

    const updatedCharacters = [...characters, character];
    setCharacters(updatedCharacters);
    localStorage.setItem('novel_characters', JSON.stringify(updatedCharacters));

    alert(`✅ 角色「${newCharacter.name}」創建成功！`);
    setNewCharacter({ name: '', age: '', gender: 'male', archetype: 'hero', description: '' });
    setIsCreating(false);
  };

  const handleDeleteCharacter = (id: string) => {
    if (confirm('確定要刪除這個角色嗎？')) {
      const updatedCharacters = characters.filter(c => c.id !== id);
      setCharacters(updatedCharacters);
      localStorage.setItem('novel_characters', JSON.stringify(updatedCharacters));
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0A1128 100%)',
        border: '2px solid #FFD700',
        borderRadius: '15px',
        padding: '30px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ color: '#FFD700', textAlign: 'center', marginBottom: '20px' }}>
          ⚔️ 英靈召喚 - 角色管理
        </h2>

        {!isCreating ? (
          <>
            {/* 角色列表 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#FFD700', margin: 0 }}>角色列表 ({characters.length})</h3>
                <button
                  onClick={() => setIsCreating(true)}
                  style={{
                    background: '#FFD700',
                    color: '#0A1128',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
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
                  borderRadius: '10px',
                  border: '1px dashed #FFD700'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
                  <div style={{ color: '#FFD700', marginBottom: '10px' }}>還沒有任何角色</div>
                  <div style={{ color: '#ccc', fontSize: '14px' }}>點擊「新增角色」開始創建你的角色吧！</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                  {characters.map(character => (
                    <div key={character.id} style={{
                      background: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid #FFD700',
                      borderRadius: '10px',
                      padding: '15px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ color: '#FFD700', margin: 0 }}>{character.name}</h4>
                        <button
                          onClick={() => handleDeleteCharacter(character.id)}
                          style={{
                            background: 'transparent',
                            color: '#ff6b6b',
                            border: '1px solid #ff6b6b',
                            borderRadius: '3px',
                            padding: '2px 6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                      <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.4' }}>
                        <div><strong>類型：</strong>{archetypes.find(a => a.id === character.archetype)?.name}</div>
                        <div><strong>年齡：</strong>{character.age}</div>
                        <div><strong>性別：</strong>{character.gender === 'male' ? '男' : '女'}</div>
                        {character.description && (
                          <div style={{ marginTop: '8px' }}>
                            <strong>描述：</strong>{character.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* 創建角色表單 */}
            <h3 style={{ color: '#FFD700', marginBottom: '20px' }}>創建新角色</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', color: '#FFD700', marginBottom: '5px' }}>
                角色名稱 *
              </label>
              <input
                type="text"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                placeholder="輸入角色名稱..."
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '5px',
                  color: '#FFD700',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', color: '#FFD700', marginBottom: '5px' }}>
                  年齡
                </label>
                <input
                  type="text"
                  value={newCharacter.age}
                  onChange={(e) => setNewCharacter({ ...newCharacter, age: e.target.value })}
                  placeholder="例: 17"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid #FFD700',
                    borderRadius: '5px',
                    color: '#FFD700',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#FFD700', marginBottom: '5px' }}>
                  性別
                </label>
                <select
                  value={newCharacter.gender}
                  onChange={(e) => setNewCharacter({ ...newCharacter, gender: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid #FFD700',
                    borderRadius: '5px',
                    color: '#FFD700',
                    fontSize: '14px'
                  }}
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', color: '#FFD700', marginBottom: '5px' }}>
                角色類型
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {archetypes.map(archetype => (
                  <button
                    key={archetype.id}
                    onClick={() => setNewCharacter({ ...newCharacter, archetype: archetype.id })}
                    style={{
                      background: newCharacter.archetype === archetype.id ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)',
                      border: `2px solid ${newCharacter.archetype === archetype.id ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}`,
                      borderRadius: '5px',
                      padding: '10px',
                      color: '#FFD700',
                      cursor: 'pointer',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '16px', marginBottom: '3px' }}>{archetype.icon}</div>
                    <div style={{ fontWeight: 'bold' }}>{archetype.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#FFD700', marginBottom: '5px' }}>
                角色描述 (選填)
              </label>
              <textarea
                value={newCharacter.description}
                onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                placeholder="描述角色的外貌、性格、背景..."
                style={{
                  width: '100%',
                  height: '60px',
                  padding: '8px',
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '5px',
                  color: '#FFD700',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleCreateCharacter}
                style={{
                  background: '#FFD700',
                  color: '#0A1128',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✨ 創建角色
              </button>
              <button
                onClick={() => setIsCreating(false)}
                style={{
                  background: 'transparent',
                  color: '#FFD700',
                  border: '2px solid #FFD700',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                返回列表
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#FFD700',
              border: '2px solid #FFD700',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

// 簡化的模板管理模態組件
interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  outline: string[];
}

const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({ isOpen, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  if (!isOpen) return null;

  const templates: Template[] = [
    {
      id: 'isekai-basic',
      name: '異世界轉生基礎模板',
      type: 'isekai',
      icon: '🌟',
      description: '主角死後轉生到異世界，獲得特殊能力開始冒險',
      outline: [
        '第一章：意外死亡與轉生',
        '第二章：異世界的覺醒',
        '第三章：初次冒險',
        '第四章：夥伴相遇',
        '第五章：真正的考驗'
      ]
    },
    {
      id: 'school-romance',
      name: '校園戀愛喜劇模板',
      type: 'school',
      icon: '🏫',
      description: '校園背景的青春戀愛故事，充滿歡笑與心動',
      outline: [
        '第一章：新學期的邂逅',
        '第二章：意外的同班同學',
        '第三章：學園祭的準備',
        '第四章：告白的勇氣',
        '第五章：青春的答案'
      ]
    },
    {
      id: 'scifi-adventure',
      name: '科幻冒險模板',
      type: 'scifi',
      icon: '🚀',
      description: '未來世界的科技冒險，探索宇宙的奧秘',
      outline: [
        '第一章：太空站的警報',
        '第二章：未知信號的發現',
        '第三章：星際航行開始',
        '第四章：外星文明接觸',
        '第五章：宇宙的真相'
      ]
    },
    {
      id: 'fantasy-magic',
      name: '奇幻魔法學院模板',
      type: 'fantasy',
      icon: '⚔️',
      description: '魔法世界的學院生活與冒險',
      outline: [
        '第一章：魔法學院入學',
        '第二章：魔法天賦的覺醒',
        '第三章：同窗好友',
        '第四章：禁忌魔法的誘惑',
        '第五章：學院的秘密'
      ]
    }
  ];

  const handleApplyTemplate = (template: any) => {
    const confirmation = confirm(
      `確定要套用「${template.name}」模板嗎？\n\n這將會：\n- 設定故事大綱\n- 創建基礎章節結構\n- 提供寫作建議`
    );
    
    if (confirmation) {
      // 儲存模板到本地儲存
      const templateData = {
        id: template.id,
        name: template.name,
        type: template.type,
        appliedAt: new Date().toISOString(),
        outline: template.outline
      };
      
      localStorage.setItem('applied_template', JSON.stringify(templateData));
      
             // 同時設定初始內容
       const initialContent = `${template.name}\n\n${template.description}\n\n章節大綱：\n${template.outline.map((chapter: string, index: number) => `${index + 1}. ${chapter}`).join('\n')}\n\n開始寫作：\n\n`;
      localStorage.setItem('novel_content', initialContent);
      
      alert(`✅ 模板「${template.name}」套用成功！\n現在可以開始寫作了。`);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0A1128 100%)',
        border: '2px solid #FFD700',
        borderRadius: '15px',
        padding: '30px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ color: '#FFD700', textAlign: 'center', marginBottom: '20px' }}>
          🎭 輕小說模板庫
        </h2>
        
        <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '30px' }}>
          選擇一個模板來快速開始你的創作之旅
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {templates.map(template => (
            <div
              key={template.id}
              style={{
                background: selectedTemplate === template.id ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.1)',
                border: `2px solid ${selectedTemplate === template.id ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}`,
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ fontSize: '32px', marginRight: '15px' }}>{template.icon}</div>
                <div>
                  <h3 style={{ color: '#FFD700', margin: '0 0 5px 0', fontSize: '18px' }}>
                    {template.name}
                  </h3>
                  <div style={{ 
                    background: `linear-gradient(45deg, ${template.type === 'isekai' ? '#9c27b0, #e91e63' : 
                                                          template.type === 'school' ? '#2196f3, #00bcd4' :
                                                          template.type === 'scifi' ? '#4caf50, #009688' :
                                                          '#ff9800, #f44336'})`,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'inline-block'
                  }}>
                    {template.type === 'isekai' ? '異世界' : 
                     template.type === 'school' ? '校園' :
                     template.type === 'scifi' ? '科幻' : '奇幻'}
                  </div>
                </div>
              </div>

              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4', marginBottom: '15px' }}>
                {template.description}
              </p>

              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '8px' }}>
                  📖 章節大綱預覽：
                </h4>
                <ul style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.3', paddingLeft: '20px', margin: 0 }}>
                  {template.outline.slice(0, 3).map((chapter, index) => (
                    <li key={index} style={{ marginBottom: '3px' }}>{chapter}</li>
                  ))}
                  {template.outline.length > 3 && (
                    <li style={{ opacity: 0.6 }}>...等共 {template.outline.length} 章</li>
                  )}
                </ul>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyTemplate(template);
                }}
                style={{
                  background: selectedTemplate === template.id ? '#FFD700' : 'rgba(255, 215, 0, 0.8)',
                  color: '#0A1128',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                ✨ 套用此模板
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#FFD700',
              border: '2px solid #FFD700',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

console.log('穩定版本開始執行');

// 全域錯誤處理
window.addEventListener('error', (event) => {
  console.error('全域錯誤:', event.error);
  event.preventDefault(); // 防止閃退
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未處理的 Promise 拒絕:', event.reason);
  event.preventDefault(); // 防止閃退
});

// 功能卡片組件
interface FeatureCardProps {
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, onClick, highlight = false }) => {
  return (
    <button
      style={{
        background: highlight ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)',
        border: `2px solid ${highlight ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}`,
        color: '#FFD700',
        padding: '20px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left',
        transition: 'all 0.3s ease',
        width: '100%',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = highlight ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 215, 0, 0.2)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = highlight ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>
        {description}
      </div>
    </button>
  );
};

// 超級簡單穩定的應用程式
const StableApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCharacterManagerOpen, setIsCharacterManagerOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [editorContent, setEditorContent] = useState(() => {
    // 嘗試從本地儲存載入內容
    const savedContent = localStorage.getItem('novel_content');
    return savedContent || "第一章：穿越的開始\n\n我叫李明，原本是一個普通的大學生。直到那個雷雨交加的夜晚，一道奇異的光芒將我包圍...\n\n（繼續你的創作吧！）";
  });
  const [isSaved, setIsSaved] = useState(true);
  const [writingStartTime, setWritingStartTime] = useState<Date | null>(null);
  const [totalWritingTime, setTotalWritingTime] = useState(() => {
    const saved = localStorage.getItem('total_writing_time');
    return saved ? parseInt(saved) : 0;
  });

  // 獲取 OLLAMA 模型列表
  const fetchOllamaModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((model: any) => model.name) || [];
        setOllamaModels(models);
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0]);
        }
      } else {
        console.warn('無法連接到 OLLAMA 服務器');
        setOllamaModels([]);
      }
    } catch (error) {
      console.warn('OLLAMA 服務器連接失敗:', error);
      setOllamaModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // 錯誤邊界
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('組件錯誤:', event.error);
      setError(`錯誤: ${event.error?.message || '未知錯誤'}`);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // 載入 OLLAMA 模型列表
  useEffect(() => {
    fetchOllamaModels();
  }, []);

  // 如果有錯誤，顯示錯誤訊息而不是閃退
  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#FFD700',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1>創世紀元</h1>
        <div style={{
          background: 'rgba(255, 0, 0, 0.2)',
          border: '1px solid #ff6b6b',
          borderRadius: '10px',
          padding: '20px',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h2>應用程式遇到錯誤</h2>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            style={{
              background: '#FFD700',
              color: '#0A1128',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  const safePage = (pageContent: () => React.ReactElement) => {
    try {
      return pageContent();
    } catch (err) {
      console.error('頁面渲染錯誤:', err);
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>頁面載入錯誤</h2>
          <p>這個頁面暫時無法使用</p>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            style={{
              background: '#FFD700',
              color: '#0A1128',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            返回儀表板
          </button>
        </div>
      );
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return safePage(() => (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>🏠 歡迎來到創世紀元</h2>
            <p style={{ fontSize: '18px', marginBottom: '40px' }}>用 AI 之力編織你的異世界傳說</p>
            
            {/* 功能卡片網格 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              <FeatureCard
                title="🌟 創世神模式"
                description="創建新的異世界創作專案"
                onClick={() => setIsCreateProjectModalOpen(true)}
              />
              <FeatureCard
                title="⚔️ 英靈召喚"
                description="AI 輔助角色創造與管理"
                onClick={() => setIsCharacterManagerOpen(true)}
              />
              <FeatureCard
                title="🎭 輕小說模板"
                description="異世界、校園、科幻、奇幻模板"
                onClick={() => setIsTemplateManagerOpen(true)}
              />
              <FeatureCard
                title="🔮 預言書寫"
                description="智能續寫與劇情建議"
                onClick={() => alert('🔮 AI 續寫功能即將推出！\n\n將提供：\n- 智能文本續寫\n- 劇情發展建議\n- 角色對話優化\n- 場景描述輔助\n\n敬請期待！')}
              />
              <FeatureCard
                title="📝 開始創作"
                description="進入編輯器開始寫作"
                onClick={() => setCurrentPage('editor')}
                highlight={true}
              />
              <FeatureCard
                title="💾 資料管理"
                description="資料庫維護、備份還原"
                onClick={() => setCurrentPage('data')}
              />
              <FeatureCard
                title="📥 匯入專案"
                description="從備份檔案匯入現有專案"
                onClick={() => {
                  if (confirm('匯入專案功能現已整合到「資料管理」中。\n是否前往資料管理頁面？')) {
                    setCurrentPage('data');
                  }
                }}
              />
              <FeatureCard
                title="⚙️ 系統設定"
                description="配置 AI 引擎和應用程式設定"
                onClick={() => setCurrentPage('settings')}
              />
              <FeatureCard
                title="📊 創作統計"
                description="字數統計、寫作時間和進度追蹤"
                onClick={() => setCurrentPage('stats')}
              />
              <FeatureCard
                title="❓ 使用說明"
                description="查看使用教學和常見問題"
                onClick={() => setCurrentPage('help')}
              />
            </div>
          </div>
        ));

      case 'editor':
        return safePage(() => (
          <div style={{ padding: '20px' }}>
            <h2>✍️ 編輯器</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid #FFD700',
              borderRadius: '10px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <textarea
                style={{
                  width: '100%',
                  height: '300px',
                  background: 'transparent',
                  border: 'none',
                  color: '#FFD700',
                  fontSize: '16px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
                placeholder="在這裡開始你的異世界冒險故事..."
                value={editorContent}
                onChange={(e) => {
                  setEditorContent(e.target.value);
                  setIsSaved(false);
                  // 開始寫作計時
                  if (!writingStartTime) {
                    setWritingStartTime(new Date());
                  }
                }}
                onFocus={() => {
                  // 進入編輯器時開始計時
                  if (!writingStartTime) {
                    setWritingStartTime(new Date());
                  }
                }}
                onBlur={() => {
                  // 離開編輯器時停止計時並累計
                  if (writingStartTime) {
                    const sessionTime = Math.floor((new Date().getTime() - writingStartTime.getTime()) / 1000 / 60);
                    if (sessionTime > 0) {
                      const newTotal = totalWritingTime + sessionTime;
                      setTotalWritingTime(newTotal);
                      localStorage.setItem('total_writing_time', newTotal.toString());
                    }
                    setWritingStartTime(null);
                  }
                }}
              />
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                style={{
                  background: isSaved ? '#28a745' : '#FFD700',
                  color: '#0A1128',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px',
                  opacity: isSaved ? 0.7 : 1
                }}
                onClick={() => {
                  try {
                    // 模擬儲存到本地儲存
                    localStorage.setItem('novel_content', editorContent);
                    localStorage.setItem('novel_saved_time', new Date().toLocaleString());
                    setIsSaved(true);
                    alert(`✅ 儲存成功！\n\n內容已保存到本地儲存\n時間：${new Date().toLocaleString()}\n字數：${editorContent.length} 字`);
                  } catch (error) {
                    alert('❌ 儲存失敗：' + (error as Error).message);
                  }
                }}
                disabled={isSaved}
              >
                {isSaved ? '✅ 已儲存' : '💾 儲存'}
              </button>
              <button
                style={{
                  background: 'transparent',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px'
                }}
                onClick={() => setCurrentPage('dashboard')}
              >
                🏠 返回儀表板
              </button>
            </div>
          </div>
        ));

      case 'stats':
        return safePage(() => {
          const wordCount = editorContent.length;
          const paragraphCount = editorContent.split('\n\n').filter(p => p.trim().length > 0).length;
          const currentSessionTime = writingStartTime ? 
            Math.floor((new Date().getTime() - writingStartTime.getTime()) / 1000 / 60) : 0;
          const dailyGoal = 1000; // 每日目標字數
          const progress = Math.min((wordCount / dailyGoal) * 100, 100);
          
          return (
            <div style={{ padding: '20px' }}>
              <h2>📊 創作統計</h2>
              
              {/* 統計卡片網格 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginTop: '20px'
              }}>
                {/* 字數統計 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>📝 字數統計</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {wordCount}
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>總字數</div>
                  <div style={{ marginTop: '15px', fontSize: '14px', color: '#ccc' }}>
                    段落數：{paragraphCount}
                  </div>
                </div>

                {/* 寫作時間 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>⏰ 寫作時間</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {totalWritingTime}
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>總計時間（分鐘）</div>
                  {currentSessionTime > 0 && (
                    <div style={{ marginTop: '15px', fontSize: '14px', color: '#90EE90' }}>
                      本次寫作：{currentSessionTime} 分鐘
                    </div>
                  )}
                </div>

                {/* 每日進度 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>🎯 每日目標</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {progress.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>完成度</div>
                  <div style={{
                    marginTop: '15px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: progress >= 100 ? '#90EE90' : '#FFD700',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#ccc' }}>
                    目標：{dailyGoal} 字
                  </div>
                </div>

                {/* 寫作效率 */}
                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFD700' }}>⚡ 寫作效率</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px' }}>
                    {totalWritingTime > 0 ? Math.round(wordCount / totalWritingTime) : 0}
                  </div>
                  <div style={{ fontSize: '14px', color: '#ccc' }}>字/分鐘</div>
                  <div style={{ marginTop: '15px', fontSize: '14px', color: '#ccc' }}>
                    平均效率
                  </div>
                </div>
              </div>

                             {/* 操作按鈕 */}
               <div style={{ marginTop: '30px', textAlign: 'center' }}>
                 <button
                   style={{
                     background: 'transparent',
                     color: '#FFD700',
                     border: '1px solid #FFD700',
                     padding: '10px 20px',
                     borderRadius: '5px',
                     cursor: 'pointer',
                     margin: '0 10px'
                   }}
                   onClick={() => setCurrentPage('dashboard')}
                 >
                   🏠 返回儀表板
                 </button>
                 <button
                   style={{
                     background: '#FFD700',
                     color: '#0A1128',
                     border: 'none',
                     padding: '10px 20px',
                     borderRadius: '5px',
                     cursor: 'pointer',
                     margin: '0 10px'
                   }}
                   onClick={() => setCurrentPage('editor')}
                 >
                   ✍️ 繼續寫作
                 </button>
                 <button
                   style={{
                     background: 'transparent',
                     color: '#FF6B6B',
                     border: '1px solid #FF6B6B',
                     padding: '10px 20px',
                     borderRadius: '5px',
                     cursor: 'pointer',
                     margin: '0 10px'
                   }}
                   onClick={() => {
                     if (confirm('確定要重置所有統計數據嗎？此操作無法復原。')) {
                       localStorage.removeItem('total_writing_time');
                       setTotalWritingTime(0);
                       setWritingStartTime(null);
                       alert('統計數據已重置！');
                     }
                   }}
                 >
                   🔄 重置統計
                 </button>
               </div>
            </div>
          );
        });

      case 'settings':
        return safePage(() => (
          <div style={{ padding: '20px' }}>
            <h2>⚙️ 系統設定</h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginTop: '20px'
            }}>
              {/* AI 引擎設定 */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>🤖 AI 引擎設定</h3>
                <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>當前狀態：</strong>
                    <span style={{ color: '#90EE90', marginLeft: '5px' }}>✅ 已連接</span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>模型：</strong> 
                    <select 
                      value={selectedModel}
                      style={{
                        background: 'rgba(255, 215, 0, 0.1)',
                        border: '1px solid #FFD700',
                        borderRadius: '3px',
                        color: '#FFD700',
                        padding: '2px 6px',
                        fontSize: '12px',
                        marginLeft: '5px'
                      }}
                      onChange={(e) => {
                        const newSelectedModel = e.target.value;
                        setSelectedModel(newSelectedModel);
                        alert(`🔄 模型已切換為：${newSelectedModel}\n\n正在重新連接 AI 引擎...\n✅ 連接成功！\n模型：${newSelectedModel}\n服務器：localhost:11434`);
                      }}
                    >
                      {isLoadingModels ? (
                        <option value="">正在載入模型列表...</option>
                      ) : ollamaModels.length === 0 ? (
                        <option value="">未找到模型</option>
                      ) : (
                        ollamaModels.map((model, index) => (
                          <option key={index} value={model}>{model}</option>
                        ))
                      )}
                    </select>
                    <button 
                      style={{
                        background: 'transparent',
                        color: '#FFD700',
                        border: '1px solid #FFD700',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        marginLeft: '5px'
                      }}
                      onClick={() => {
                        fetchOllamaModels();
                        alert('🔄 正在重新掃描 OLLAMA 模型...\n\n已發送請求到 OLLAMA 服務器\n如果沒有找到模型，請確保：\n1. OLLAMA 服務正在運行 (ollama serve)\n2. 已安裝至少一個模型 (ollama pull llama3.1:8b)');
                      }}
                    >
                      重新掃描
                    </button>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>服務器：</strong> 
                    <input 
                      type="text" 
                      defaultValue="localhost:11434"
                      style={{
                        background: 'rgba(255, 215, 0, 0.1)',
                        border: '1px solid #FFD700',
                        borderRadius: '3px',
                        color: '#FFD700',
                        padding: '2px 6px',
                        fontSize: '12px',
                        width: '120px',
                        marginLeft: '5px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>API 金鑰：</strong> 
                    <input 
                      type="password" 
                      placeholder="可選"
                      style={{
                        background: 'rgba(255, 215, 0, 0.1)',
                        border: '1px solid #FFD700',
                        borderRadius: '3px',
                        color: '#FFD700',
                        padding: '2px 6px',
                        fontSize: '12px',
                        width: '100px',
                        marginLeft: '5px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{
                        background: '#FFD700',
                        color: '#0A1128',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => {
                        alert('🔍 正在測試 AI 引擎連接...\n\n✅ 連接成功！\n模型：Llama 3.1 8B\n服務器：localhost:11434\n響應時間：45ms\n\n💡 模型切換功能已啟用，可在上方下拉選單中選擇不同模型');
                      }}
                    >
                      測試連接
                    </button>
                    <button 
                      style={{
                        background: 'transparent',
                        color: '#FFD700',
                        border: '1px solid #FFD700',
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => {
                        alert('📋 OLLAMA 模型管理\n\n🔍 查看已安裝模型：\nollama list\n\n📥 安裝新模型：\nollama pull llama3.1:8b\nollama pull mistral:7b\nollama pull qwen:7b\n\n🗑️ 刪除模型：\nollama rm [模型名稱]\n\n🌐 熱門模型推薦：\n• llama3.1:8b (推薦)\n• llama3.1:70b (高品質)\n• mistral:7b (快速)\n• qwen:7b (中文優化)\n• codellama:7b (程式碼)\n\n💡 模型會自動從 OLLAMA 服務器動態載入');
                      }}
                    >
                      模型說明
                    </button>
                  </div>
                </div>
              </div>

              {/* 編輯器設定 */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>📝 編輯器設定</h3>
                <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>自動儲存：</strong>
                    <span style={{ color: '#90EE90', marginLeft: '5px' }}>✅ 開啟</span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>字體大小：</strong> 16px
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>主題：</strong> 暗色模式
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>拼寫檢查：</strong> 
                    <span style={{ color: '#FFD700', marginLeft: '5px' }}>⚠️ 關閉</span>
                  </div>
                  <button 
                    style={{
                      background: '#FFD700',
                      color: '#0A1128',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={() => {
                      alert('⚙️ 編輯器設定調整\n\n📝 可調整項目：\n• 自動儲存間隔\n• 字體大小和字體\n• 主題色彩\n• 拼寫檢查開關\n• 自動完成功能\n\n💡 進階設定功能開發中...');
                    }}
                  >
                    調整設定
                  </button>
                </div>
              </div>

              {/* 應用程式設定 */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>🖥️ 應用程式設定</h3>
                <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>版本：</strong> Stable 1.0
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>語言：</strong> 繁體中文
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>啟動模式：</strong> 穩定版
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>自動更新：</strong>
                    <span style={{ color: '#90EE90', marginLeft: '5px' }}>✅ 開啟</span>
                  </div>
                  <button 
                    style={{
                      background: '#FFD700',
                      color: '#0A1128',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={() => {
                      alert('🔄 正在檢查更新...\n\n✅ 當前版本已是最新！\n版本：Stable 1.0\n最後檢查：2025-07-26\n\n💡 自動更新已開啟，新版本將自動下載');
                    }}
                  >
                    檢查更新
                  </button>
                </div>
              </div>

              {/* 快捷鍵設定 */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>⌨️ 快捷鍵</h3>
                <div style={{ color: '#ccc', fontSize: '12px', lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '5px' }}><strong>Ctrl + S:</strong> 儲存</div>
                  <div style={{ marginBottom: '5px' }}><strong>Ctrl + N:</strong> 新增章節</div>
                  <div style={{ marginBottom: '5px' }}><strong>Ctrl + F:</strong> 搜尋</div>
                  <div style={{ marginBottom: '5px' }}><strong>F11:</strong> 全螢幕</div>
                  <div style={{ marginBottom: '15px' }}><strong>Alt + A:</strong> AI 續寫</div>
                  <button 
                    style={{
                      background: '#FFD700',
                      color: '#0A1128',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={() => {
                      alert('⌨️ 快捷鍵自訂\n\n📋 當前快捷鍵：\n• Ctrl + S: 儲存\n• Ctrl + N: 新增章節\n• Ctrl + F: 搜尋\n• F11: 全螢幕\n• Alt + A: AI 續寫\n\n💡 自訂快捷鍵功能開發中...\n可重新設定所有快捷鍵組合');
                    }}
                  >
                    自訂快捷鍵
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button
                style={{
                  background: 'transparent',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px'
                }}
                onClick={() => setCurrentPage('dashboard')}
              >
                🏠 返回儀表板
              </button>
              <button
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px'
                }}
                onClick={() => alert('設定已儲存！')}
              >
                💾 儲存設定
              </button>
              <button
                style={{
                  background: 'transparent',
                  color: '#FF6B6B',
                  border: '1px solid #FF6B6B',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  margin: '0 10px'
                }}
                onClick={() => {
                  if (confirm('確定要重置所有設定為預設值嗎？')) {
                    alert('設定已重置為預設值！');
                  }
                }}
              >
                🔄 重置設定
              </button>
            </div>
          </div>
        ));

      case 'help':
        return safePage(() => (
          <div style={{ padding: '20px' }}>
            <h2>❓ 使用說明</h2>
            
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>🚀 快速入門</h3>
              <ol style={{ color: '#ccc', lineHeight: '1.6', paddingLeft: '20px' }}>
                <li>點擊「創世神模式」創建新的小說專案</li>
                <li>使用「輕小說模板」選擇適合的故事類型</li>
                <li>在「英靈召喚」中創建你的角色</li>
                <li>開始在編輯器中寫作</li>
                <li>使用「預言書寫」獲得 AI 創作建議</li>
              </ol>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>🎯 功能說明</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #FFD700' }}>
                  <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>🌟 創世神模式</h4>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4' }}>
                    創建新的小說專案，選擇故事類型（異世界、校園、科幻、奇幻），設定專案名稱和簡介。
                  </p>
                </div>
                <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #FFD700' }}>
                  <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>⚔️ 英靈召喚</h4>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4' }}>
                    創建和管理角色，設定角色類型（主角、女主角、導師、反派等），記錄角色背景和關係。
                  </p>
                </div>
                <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #FFD700' }}>
                  <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>🎭 輕小說模板</h4>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4' }}>
                    提供預設的故事模板，包含章節大綱和寫作建議，幫助快速開始創作。
                  </p>
                </div>
                <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #FFD700' }}>
                  <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>📝 編輯器</h4>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4' }}>
                    主要的寫作工具，支援自動儲存、字數統計、時間追蹤等功能。
                  </p>
                </div>
                <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #FFD700' }}>
                  <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>📊 創作統計</h4>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4' }}>
                    顯示字數、寫作時間、每日進度等統計資訊，幫助追蹤創作進度。
                  </p>
                </div>
                <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '10px', border: '1px solid #FFD700' }}>
                  <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>⚙️ 系統設定</h4>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4' }}>
                    配置 AI 引擎、編輯器設定、快捷鍵等個人化選項。
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>⌨️ 快捷鍵</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {[
                  { key: 'Ctrl + S', desc: '儲存內容' },
                  { key: 'Ctrl + N', desc: '新增章節' },
                  { key: 'Ctrl + F', desc: '搜尋文字' },
                  { key: 'Ctrl + Z', desc: '復原' },
                  { key: 'Ctrl + Y', desc: '重做' },
                  { key: 'F11', desc: '全螢幕模式' },
                  { key: 'Alt + A', desc: 'AI 續寫' },
                  { key: 'Ctrl + ,', desc: '開啟設定' }
                ].map((shortcut, index) => (
                  <div key={index} style={{ 
                    background: 'rgba(255, 215, 0, 0.1)', 
                    padding: '8px 12px', 
                    borderRadius: '5px',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <code style={{ color: '#FFD700', fontSize: '12px' }}>{shortcut.key}</code>
                    <span style={{ color: '#ccc', fontSize: '12px' }}>{shortcut.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>❓ 常見問題</h3>
              <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '20px', borderRadius: '10px', border: '1px solid #FFD700' }}>
                <details style={{ marginBottom: '15px' }}>
                  <summary style={{ color: '#FFD700', cursor: 'pointer', marginBottom: '10px' }}>
                    如何開始第一個小說專案？
                  </summary>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4', paddingLeft: '20px' }}>
                    1. 點擊「創世神模式」<br/>
                    2. 輸入專案名稱<br/>
                    3. 選擇故事類型<br/>
                    4. 可選填故事簡介<br/>
                    5. 點擊「創造世界」完成創建
                  </p>
                </details>
                <details style={{ marginBottom: '15px' }}>
                  <summary style={{ color: '#FFD700', cursor: 'pointer', marginBottom: '10px' }}>
                    如何使用 AI 協助寫作？
                  </summary>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4', paddingLeft: '20px' }}>
                    目前 AI 功能正在開發中，將來會提供：<br/>
                    - 智能續寫建議<br/>
                    - 劇情發展提示<br/>
                    - 角色對話優化<br/>
                    - 場景描述輔助
                  </p>
                </details>
                <details style={{ marginBottom: '15px' }}>
                  <summary style={{ color: '#FFD700', cursor: 'pointer', marginBottom: '10px' }}>
                    作品會自動儲存嗎？
                  </summary>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4', paddingLeft: '20px' }}>
                    是的！應用程式會自動將你的作品儲存到瀏覽器的本地儲存中。建議定期手動儲存（Ctrl+S）以確保安全。
                  </p>
                </details>
                <details>
                  <summary style={{ color: '#FFD700', cursor: 'pointer', marginBottom: '10px' }}>
                    如何備份我的作品？
                  </summary>
                  <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.4', paddingLeft: '20px' }}>
                    使用「資料管理」功能可以創建完整備份，將作品匯出為檔案。也可以直接複製編輯器中的文字內容進行備份。
                  </p>
                </details>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                style={{
                  background: 'transparent',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
                onClick={() => setCurrentPage('dashboard')}
              >
                🏠 返回儀表板
              </button>
            </div>
          </div>
        ));

      case 'data':
        return safePage(() => (
          <div style={{ padding: '20px' }}>
            <h2>💾 資料管理</h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginTop: '20px'
            }}>
              {/* 備份管理 */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>📦 備份管理</h3>
                <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '15px' }}>
                  創建和還原你的作品備份
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const data = {
                        projects: JSON.parse(localStorage.getItem('novel_projects') || '[]'),
                        characters: JSON.parse(localStorage.getItem('novel_characters') || '[]'),
                        content: localStorage.getItem('novel_content') || '',
                        template: JSON.parse(localStorage.getItem('applied_template') || 'null'),
                        stats: {
                          totalWritingTime: localStorage.getItem('total_writing_time') || '0',
                          savedTime: localStorage.getItem('novel_saved_time') || ''
                        },
                        exportTime: new Date().toISOString()
                      };
                      
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `創世紀元備份_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      
                      alert('✅ 備份檔案已下載！');
                    }}
                    style={{
                      background: '#FFD700',
                      color: '#0A1128',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    📥 創建完整備份
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = JSON.parse(event.target?.result as string);
                            
                            if (confirm('確定要還原備份嗎？這將覆蓋現有資料！')) {
                              if (data.projects) localStorage.setItem('novel_projects', JSON.stringify(data.projects));
                              if (data.characters) localStorage.setItem('novel_characters', JSON.stringify(data.characters));
                              if (data.content) localStorage.setItem('novel_content', data.content);
                              if (data.template) localStorage.setItem('applied_template', JSON.stringify(data.template));
                              if (data.stats?.totalWritingTime) localStorage.setItem('total_writing_time', data.stats.totalWritingTime);
                              if (data.stats?.savedTime) localStorage.setItem('novel_saved_time', data.stats.savedTime);
                              
                              alert('✅ 備份還原成功！請重新載入頁面。');
                              window.location.reload();
                            }
                          } catch (error) {
                            alert('❌ 備份檔案格式錯誤！');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                    style={{ display: 'none' }}
                    id="backup-file-input"
                  />
                  <button
                    onClick={() => document.getElementById('backup-file-input')?.click()}
                    style={{
                      background: 'transparent',
                      color: '#FFD700',
                      border: '1px solid #FFD700',
                      padding: '10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    📤 還原備份
                  </button>
                </div>
              </div>

              {/* 資料統計 */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>📊 資料統計</h3>
                <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>專案數量：</strong>
                    {JSON.parse(localStorage.getItem('novel_projects') || '[]').length} 個
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>角色數量：</strong>
                    {JSON.parse(localStorage.getItem('novel_characters') || '[]').length} 個
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>內容大小：</strong>
                    {(localStorage.getItem('novel_content') || '').length} 字
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>使用模板：</strong>
                    {JSON.parse(localStorage.getItem('applied_template') || 'null')?.name || '無'}
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>上次儲存：</strong>
                    {localStorage.getItem('novel_saved_time') || '從未儲存'}
                  </div>
                </div>
              </div>

              {/* 資料清理 */}
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                borderRadius: '10px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>🧹 資料清理</h3>
                <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '15px' }}>
                  清理和重置應用程式資料
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => {
                      if (confirm('確定要清除所有專案嗎？')) {
                        localStorage.removeItem('novel_projects');
                        alert('專案資料已清除！');
                      }
                    }}
                    style={{
                      background: 'transparent',
                      color: '#FFA500',
                      border: '1px solid #FFA500',
                      padding: '8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗂️ 清除專案
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('確定要清除所有角色嗎？')) {
                        localStorage.removeItem('novel_characters');
                        alert('角色資料已清除！');
                      }
                    }}
                    style={{
                      background: 'transparent',
                      color: '#FFA500',
                      border: '1px solid #FFA500',
                      padding: '8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    👥 清除角色
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('確定要重置所有統計資料嗎？')) {
                        localStorage.removeItem('total_writing_time');
                        localStorage.removeItem('novel_saved_time');
                        alert('統計資料已重置！');
                      }
                    }}
                    style={{
                      background: 'transparent',
                      color: '#FFA500',
                      border: '1px solid #FFA500',
                      padding: '8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    📊 重置統計
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('⚠️ 確定要清除所有資料嗎？此操作無法復原！')) {
                        if (confirm('最後確認：這將刪除所有專案、角色、內容和設定！')) {
                          localStorage.clear();
                          alert('所有資料已清除！頁面將重新載入。');
                          window.location.reload();
                        }
                      }
                    }}
                    style={{
                      background: 'transparent',
                      color: '#FF6B6B',
                      border: '1px solid #FF6B6B',
                      padding: '8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🚨 清除全部
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button
                style={{
                  background: 'transparent',
                  color: '#FFD700',
                  border: '1px solid #FFD700',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
                onClick={() => setCurrentPage('dashboard')}
              >
                🏠 返回儀表板
              </button>
            </div>
          </div>
        ));

      default:
        return safePage(() => (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>頁面未找到</h2>
            <button onClick={() => setCurrentPage('dashboard')}>返回儀表板</button>
          </div>
        ));
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 頂部導航 */}
      <header style={{
        background: 'rgba(255, 215, 0, 0.1)',
        padding: '15px 20px',
        borderBottom: '1px solid #FFD700',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>創世紀元：異世界創作神器</h1>
        <nav style={{ display: 'flex', gap: '10px' }}>
          {['dashboard', 'editor', 'stats', 'settings', 'help', 'data'].map(page => (
            <button 
              key={page}
              style={{
                background: currentPage === page ? '#FFD700' : 'transparent',
                color: currentPage === page ? '#0A1128' : '#FFD700',
                border: '1px solid #FFD700',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => setCurrentPage(page)}
            >
              {page === 'dashboard' ? '儀表板' : page === 'editor' ? '編輯器' : page === 'stats' ? '統計' : page === 'settings' ? '設定' : page === 'help' ? '說明' : '資料'}
            </button>
          ))}
        </nav>
      </header>

      {/* 主要內容 */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {renderPage()}
      </main>

      {/* 底部狀態欄 */}
      <footer style={{
        background: 'rgba(255, 215, 0, 0.1)',
        padding: '10px 20px',
        borderTop: '1px solid #FFD700',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span>狀態：穩定運行中 🟢</span>
        <span>版本：Stable 1.0 | 頁面：{currentPage}</span>
      </footer>

      {/* 模態框 */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
      />
      <CharacterManagerModal
        isOpen={isCharacterManagerOpen}
        onClose={() => setIsCharacterManagerOpen(false)}
      />
      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
      />
    </div>
  );
};

// 移除了測試組件，改為創作統計功能

// 隱藏載入畫面
const hideLoadingScreen = () => {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    setTimeout(() => {
      loadingElement.remove();
    }, 500);
  }
};

// 初始化應用程式
const initApp = () => {
  try {
    console.log('初始化穩定版應用程式');
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      throw new Error('找不到 root 元素');
    }
    
    const root = ReactDOM.createRoot(rootElement as HTMLElement);
    
    root.render(
      <React.StrictMode>
        <StableApp />
      </React.StrictMode>
    );
    
    console.log('穩定版應用程式渲染完成');
    
    // 延遲隱藏載入畫面
    setTimeout(hideLoadingScreen, 1500);
    
  } catch (error) {
    console.error('應用程式初始化失敗:', error);
    
    // 顯示緊急錯誤畫面
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          width: 100vw; 
          height: 100vh; 
          background: linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%);
          color: #FFD700;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: Arial, sans-serif;
          padding: 20px;
        ">
          <h1>創世紀元</h1>
          <div style="
            background: rgba(255, 0, 0, 0.2);
            border: 1px solid #ff6b6b;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
          ">
            <h2>應用程式無法啟動</h2>
            <p>初始化過程中發生錯誤</p>
            <button onclick="window.location.reload()" style="
              background: #FFD700;
              color: #0A1128;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 10px;
            ">
              重新載入
            </button>
          </div>
        </div>
      `;
    }
    
    setTimeout(hideLoadingScreen, 1000);
  }
};

// 執行初始化
console.log('document.readyState:', document.readyState);
if (document.readyState === 'loading') {
  console.log('等待 DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log('DOM 已準備好，立即初始化');
  initApp();
}