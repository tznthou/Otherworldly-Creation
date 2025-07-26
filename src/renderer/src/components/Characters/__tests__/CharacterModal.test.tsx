import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterModal } from '../CharacterModal';
import { Character, CharacterFormData } from '../../../types/character';

// Mock the archetype data
jest.mock('../../../data/characterArchetypes', () => ({
  CHARACTER_ARCHETYPE_TEMPLATES: [
    {
      id: 'protagonist',
      name: '主角',
      description: '故事的主要角色',
      defaultPersonality: '勇敢、正義感強烈',
      defaultBackground: '平凡的高中生',
      suggestedAge: { min: 15, max: 18 },
      suggestedGender: ['男', '女'],
      tags: ['主要角色', '正義', '成長']
    },
    {
      id: 'heroine',
      name: '女主角',
      description: '故事中的主要女性角色',
      defaultPersonality: '溫柔善良但內心堅強',
      defaultAppearance: '美麗動人',
      defaultBackground: '特殊的家庭背景',
      suggestedAge: { min: 15, max: 18 },
      suggestedGender: ['女'],
      tags: ['主要角色', '溫柔', '美麗']
    }
  ],
  getArchetypeTemplateByName: (name: string) => {
    const templates = [
      {
        id: 'protagonist',
        name: '主角',
        description: '故事的主要角色',
        defaultPersonality: '勇敢、正義感強烈',
        defaultBackground: '平凡的高中生',
        suggestedAge: { min: 15, max: 18 },
        suggestedGender: ['男', '女'],
        tags: ['主要角色', '正義', '成長']
      }
    ];
    return templates.find(t => t.name === name);
  },
  getRecommendedArchetypes: () => []
}));

// Mock the ArchetypeSelector component
jest.mock('../ArchetypeSelector', () => ({
  ArchetypeSelector: ({ selectedArchetype, onSelect }: any) => (
    <div data-testid="archetype-selector">
      <button onClick={() => onSelect('主角')}>選擇主角</button>
      <span>{selectedArchetype}</span>
    </div>
  )
}));

describe('CharacterModal', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    projectId: 'test-project-id',
    projectType: 'isekai'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create character modal correctly', () => {
    render(<CharacterModal {...defaultProps} />);
    
    expect(screen.getByText('新增角色')).toBeInTheDocument();
    expect(screen.getByLabelText(/角色名稱/)).toBeInTheDocument();
    expect(screen.getByLabelText(/年齡/)).toBeInTheDocument();
    expect(screen.getByLabelText(/性別/)).toBeInTheDocument();
    expect(screen.getByLabelText(/外觀描述/)).toBeInTheDocument();
    expect(screen.getByLabelText(/性格特點/)).toBeInTheDocument();
    expect(screen.getByLabelText(/背景故事/)).toBeInTheDocument();
  });

  it('renders edit character modal correctly', () => {
    const character: Character = {
      id: 'test-char-id',
      projectId: 'test-project-id',
      name: '測試角色',
      archetype: '主角',
      age: 17,
      gender: '男',
      appearance: '黑髮藍眼',
      personality: '勇敢正直',
      background: '普通高中生',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    render(<CharacterModal {...defaultProps} character={character} />);
    
    expect(screen.getByText('編輯角色')).toBeInTheDocument();
    expect(screen.getByDisplayValue('測試角色')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17')).toBeInTheDocument();
    expect(screen.getByDisplayValue('勇敢正直')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<CharacterModal {...defaultProps} />);
    
    const submitButton = screen.getByText('創建');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('角色名稱為必填項目')).toBeInTheDocument();
    });
    
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates field lengths', async () => {
    render(<CharacterModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/角色名稱/);
    const appearanceInput = screen.getByLabelText(/外觀描述/);
    
    // Test name length validation
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });
    
    // Test appearance length validation
    fireEvent.change(appearanceInput, { target: { value: 'a'.repeat(501) } });
    
    const submitButton = screen.getByText('創建');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('角色名稱不能超過 50 個字符')).toBeInTheDocument();
      expect(screen.getByText('外觀描述不能超過 500 個字符')).toBeInTheDocument();
    });
  });

  it('validates age range', async () => {
    render(<CharacterModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/角色名稱/);
    const ageInput = screen.getByLabelText(/年齡/);
    
    fireEvent.change(nameInput, { target: { value: '測試角色' } });
    fireEvent.change(ageInput, { target: { value: '1001' } });
    
    const submitButton = screen.getByText('創建');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('年齡必須在 0-1000 之間')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    mockOnSave.mockResolvedValue(undefined);
    
    render(<CharacterModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/角色名稱/);
    const ageInput = screen.getByLabelText(/年齡/);
    const genderSelect = screen.getByLabelText(/性別/);
    const personalityInput = screen.getByLabelText(/性格特點/);
    
    fireEvent.change(nameInput, { target: { value: '測試角色' } });
    fireEvent.change(ageInput, { target: { value: '17' } });
    fireEvent.change(genderSelect, { target: { value: '男' } });
    fireEvent.change(personalityInput, { target: { value: '勇敢正直' } });
    
    const submitButton = screen.getByText('創建');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        name: '測試角色',
        archetype: '',
        age: 17,
        gender: '男',
        appearance: '',
        personality: '勇敢正直',
        background: ''
      });
    });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows character count for text areas', () => {
    render(<CharacterModal {...defaultProps} />);
    
    expect(screen.getByText('0/500')).toBeInTheDocument(); // appearance counter
    expect(screen.getByText('0/1000')).toBeInTheDocument(); // background counter
  });

  it('closes modal when close button is clicked', () => {
    render(<CharacterModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<CharacterModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('新增角色')).not.toBeInTheDocument();
  });
});