import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockProject, createMockCharacter, mockElectronAPI } from '../utils/testUtils';
import CharacterManager from '../../../renderer/src/pages/CharacterManager/CharacterManager';

describe('角色管理工作流程整合測試', () => {
  const mockProject = createMockProject();
  const mockCharacter = createMockCharacter();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 設置基本的 mock 返回值
    mockElectronAPI.projects.getById.mockResolvedValue(mockProject);
    mockElectronAPI.characters.getByProjectId.mockResolvedValue([mockCharacter]);
    
    // 確保 mock 資料有正確的結構
    console.log('Mock project:', mockProject);
    console.log('Mock character:', mockCharacter);
  });

  describe('角色創建流程', () => {
    it('應該能夠創建新角色', async () => {
      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 等待角色管理器載入
      await waitFor(() => {
        expect(screen.getByText('角色列表')).toBeInTheDocument();
      });

      // 等待角色列表載入完成
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
        expect(screen.getByText('新增角色')).toBeInTheDocument();
      }, { timeout: 3000 });

      // 點擊新增角色按鈕
      fireEvent.click(screen.getByText('新增角色'));

      // 等待角色創建對話框出現
      await waitFor(() => {
        expect(screen.getByLabelText('角色名稱')).toBeInTheDocument();
      });

      // 填寫角色基本資訊
      const nameInput = screen.getByLabelText('角色名稱');
      fireEvent.change(nameInput, { target: { value: '艾莉絲' } });

      const archetypeSelect = screen.getByLabelText('角色原型');
      fireEvent.change(archetypeSelect, { target: { value: '法師' } });

      const ageInput = screen.getByLabelText('年齡');
      fireEvent.change(ageInput, { target: { value: '17' } });

      const genderSelect = screen.getByLabelText('性別');
      fireEvent.change(genderSelect, { target: { value: '女' } });

      // 填寫詳細資訊
      const appearanceTextarea = screen.getByLabelText('外貌描述');
      fireEvent.change(appearanceTextarea, { 
        target: { value: '金髮碧眼，身材嬌小，總是穿著藍色的法師袍' } 
      });

      const personalityTextarea = screen.getByLabelText('性格特點');
      fireEvent.change(personalityTextarea, { 
        target: { value: '聰明好學，有些內向，但對朋友很忠誠' } 
      });

      const backgroundTextarea = screen.getByLabelText('背景故事');
      fireEvent.change(backgroundTextarea, { 
        target: { value: '來自魔法學院的優秀學生，擅長水系魔法' } 
      });

      // 模擬角色創建成功
      const newCharacter = createMockCharacter({
        id: 'new-character-id',
        name: '艾莉絲',
        archetype: '法師',
        age: 17,
        gender: '女',
        appearance: '金髮碧眼，身材嬌小，總是穿著藍色的法師袍',
        personality: '聰明好學，有些內向，但對朋友很忠誠',
        background: '來自魔法學院的優秀學生，擅長水系魔法',
      });
      mockElectronAPI.characters.create.mockResolvedValue(newCharacter.id);
      mockElectronAPI.characters.getById.mockResolvedValue(newCharacter);

      // 提交創建
      fireEvent.click(screen.getByText('創建角色'));

      // 驗證角色創建 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.characters.create).toHaveBeenCalledWith({
          projectId: mockProject.id,
          name: '艾莉絲',
          archetype: '法師',
          age: 17,
          gender: '女',
          appearance: '金髮碧眼，身材嬌小，總是穿著藍色的法師袍',
          personality: '聰明好學，有些內向，但對朋友很忠誠',
          background: '來自魔法學院的優秀學生，擅長水系魔法',
        });
      });

      // 驗證新角色出現在列表中
      await waitFor(() => {
        expect(screen.getByText('艾莉絲')).toBeInTheDocument();
      });
    });

    it('應該支援從模板創建角色', async () => {
      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 點擊從模板創建
      fireEvent.click(screen.getByText('從模板創建'));

      // 等待模板選擇器載入
      await waitFor(() => {
        expect(screen.getByText('選擇角色模板')).toBeInTheDocument();
      });

      // 選擇異世界勇者模板
      fireEvent.click(screen.getByText('異世界勇者'));

      // 等待模板應用
      await waitFor(() => {
        expect(screen.getByDisplayValue('勇者')).toBeInTheDocument();
      });

      // 自定義角色名稱
      const nameInput = screen.getByLabelText('角色名稱');
      fireEvent.change(nameInput, { target: { value: '亞瑟' } });

      // 創建角色
      mockElectronAPI.characters.create.mockResolvedValue('template-character-id');
      fireEvent.click(screen.getByText('創建角色'));

      // 驗證使用了模板資料
      await waitFor(() => {
        expect(mockElectronAPI.characters.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '亞瑟',
            archetype: '勇者',
          })
        );
      });
    });
  });

  describe('角色編輯功能', () => {
    it('應該能夠編輯角色資訊', async () => {
      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 等待角色列表載入
      await waitFor(() => {
        expect(screen.getByText(mockCharacter.name)).toBeInTheDocument();
      });

      // 點擊編輯角色
      const editButton = screen.getByLabelText('編輯角色');
      fireEvent.click(editButton);

      // 等待編輯對話框載入
      await waitFor(() => {
        expect(screen.getByText('編輯角色')).toBeInTheDocument();
      });

      // 修改角色資訊
      const personalityTextarea = screen.getByLabelText('性格特點');
      fireEvent.change(personalityTextarea, { 
        target: { value: '勇敢正義，有時衝動，但逐漸變得成熟' } 
      });

      // 儲存修改
      mockElectronAPI.characters.update.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('儲存修改'));

      // 驗證更新 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.characters.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockCharacter.id,
            personality: '勇敢正義，有時衝動，但逐漸變得成熟',
          })
        );
      });
    });

    it('應該能夠管理角色能力', async () => {
      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 進入角色編輯模式
      await waitFor(() => {
        expect(screen.getByText(mockCharacter.name)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('編輯角色'));

      // 切換到能力標籤
      await waitFor(() => {
        expect(screen.getByText('能力')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('能力'));

      // 添加新能力
      fireEvent.click(screen.getByText('添加能力'));

      const abilityNameInput = screen.getByLabelText('能力名稱');
      fireEvent.change(abilityNameInput, { target: { value: '火球術' } });

      const abilityDescInput = screen.getByLabelText('能力描述');
      fireEvent.change(abilityDescInput, { 
        target: { value: '發射火球攻擊敵人，造成火焰傷害' } 
      });

      // 儲存能力
      fireEvent.click(screen.getByText('添加'));

      // 驗證能力被添加到列表
      await waitFor(() => {
        expect(screen.getByText('火球術')).toBeInTheDocument();
      });
    });
  });

  describe('角色關係管理', () => {
    it('應該能夠建立角色關係', async () => {
      const character1 = createMockCharacter({ id: '1', name: '主角' });
      const character2 = createMockCharacter({ id: '2', name: '夥伴' });
      mockElectronAPI.characters.getByProjectId.mockResolvedValue([character1, character2]);

      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 等待角色列表載入
      await waitFor(() => {
        expect(screen.getByText('主角')).toBeInTheDocument();
        expect(screen.getByText('夥伴')).toBeInTheDocument();
      });

      // 點擊主角的關係管理
      fireEvent.click(screen.getByLabelText('管理關係'));

      // 等待關係編輯器載入
      await waitFor(() => {
        expect(screen.getByText('角色關係管理')).toBeInTheDocument();
      });

      // 添加新關係
      fireEvent.click(screen.getByText('添加關係'));

      // 選擇目標角色
      const targetSelect = screen.getByLabelText('目標角色');
      fireEvent.change(targetSelect, { target: { value: '2' } });

      // 選擇關係類型
      const relationshipTypeSelect = screen.getByLabelText('關係類型');
      fireEvent.change(relationshipTypeSelect, { target: { value: '朋友' } });

      // 填寫關係描述
      const descriptionInput = screen.getByLabelText('關係描述');
      fireEvent.change(descriptionInput, { 
        target: { value: '從小一起長大的好朋友，互相信任' } 
      });

      // 儲存關係
      mockElectronAPI.characters.updateRelationships.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('儲存關係'));

      // 驗證關係更新 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.characters.updateRelationships).toHaveBeenCalledWith(
          '1',
          expect.arrayContaining([
            expect.objectContaining({
              targetId: '2',
              type: '朋友',
              description: '從小一起長大的好朋友，互相信任',
            })
          ])
        );
      });
    });

    it('應該能夠可視化角色關係', async () => {
      const characters = [
        createMockCharacter({ id: '1', name: '主角' }),
        createMockCharacter({ id: '2', name: '夥伴' }),
        createMockCharacter({ id: '3', name: '導師' }),
      ];
      mockElectronAPI.characters.getByProjectId.mockResolvedValue(characters);

      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 切換到關係視圖
      fireEvent.click(screen.getByText('關係視圖'));

      // 等待關係圖載入
      await waitFor(() => {
        expect(screen.getByText('角色關係圖')).toBeInTheDocument();
      });

      // 驗證所有角色都顯示在關係圖中
      await waitFor(() => {
        expect(screen.getByText('主角')).toBeInTheDocument();
        expect(screen.getByText('夥伴')).toBeInTheDocument();
        expect(screen.getByText('導師')).toBeInTheDocument();
      });

      // 測試關係線的顯示
      // 這裡需要根據實際的關係圖實現來調整測試
      const relationshipLines = screen.getAllByTestId('relationship-line');
      expect(relationshipLines.length).toBeGreaterThan(0);
    });

    it('應該檢查關係一致性', async () => {
      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 點擊關係一致性檢查
      fireEvent.click(screen.getByText('檢查一致性'));

      // 模擬發現一致性問題
      mockElectronAPI.characters.checkRelationshipConsistency.mockResolvedValue([
        {
          type: 'missing_target',
          sourceId: '1',
          sourceName: '主角',
          targetId: 'invalid-id',
          relationshipType: '朋友',
          message: '角色 "主角" 的關係目標角色不存在',
        }
      ]);

      // 等待檢查結果
      await waitFor(() => {
        expect(screen.getByText('發現關係一致性問題')).toBeInTheDocument();
        expect(screen.getByText('角色 "主角" 的關係目標角色不存在')).toBeInTheDocument();
      });

      // 修復問題
      fireEvent.click(screen.getByText('修復問題'));

      // 驗證修復操作
      await waitFor(() => {
        expect(mockElectronAPI.characters.updateRelationships).toHaveBeenCalled();
      });
    });
  });

  describe('角色搜索和過濾', () => {
    it('應該支援角色搜索功能', async () => {
      const characters = [
        createMockCharacter({ id: '1', name: '亞瑟', archetype: '勇者' }),
        createMockCharacter({ id: '2', name: '艾莉絲', archetype: '法師' }),
        createMockCharacter({ id: '3', name: '鮑勃', archetype: '戰士' }),
      ];
      mockElectronAPI.characters.getByProjectId.mockResolvedValue(characters);

      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 等待角色列表載入
      await waitFor(() => {
        expect(screen.getByText('亞瑟')).toBeInTheDocument();
        expect(screen.getByText('艾莉絲')).toBeInTheDocument();
        expect(screen.getByText('鮑勃')).toBeInTheDocument();
      });

      // 搜索角色
      const searchInput = screen.getByPlaceholderText('搜索角色...');
      fireEvent.change(searchInput, { target: { value: '艾莉絲' } });

      // 驗證搜索結果
      await waitFor(() => {
        expect(screen.getByText('艾莉絲')).toBeInTheDocument();
        expect(screen.queryByText('亞瑟')).not.toBeInTheDocument();
        expect(screen.queryByText('鮑勃')).not.toBeInTheDocument();
      });
    });

    it('應該支援按原型過濾角色', async () => {
      const characters = [
        createMockCharacter({ id: '1', name: '亞瑟', archetype: '勇者' }),
        createMockCharacter({ id: '2', name: '艾莉絲', archetype: '法師' }),
        createMockCharacter({ id: '3', name: '鮑勃', archetype: '戰士' }),
      ];
      mockElectronAPI.characters.getByProjectId.mockResolvedValue(characters);

      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 等待角色列表載入
      await waitFor(() => {
        expect(screen.getByText('亞瑟')).toBeInTheDocument();
      });

      // 選擇法師過濾器
      const archetypeFilter = screen.getByLabelText('按原型過濾');
      fireEvent.change(archetypeFilter, { target: { value: '法師' } });

      // 驗證過濾結果
      await waitFor(() => {
        expect(screen.getByText('艾莉絲')).toBeInTheDocument();
        expect(screen.queryByText('亞瑟')).not.toBeInTheDocument();
        expect(screen.queryByText('鮑勃')).not.toBeInTheDocument();
      });
    });
  });

  describe('角色刪除功能', () => {
    it('應該檢查角色引用後再刪除', async () => {
      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 等待角色載入
      await waitFor(() => {
        expect(screen.getByText(mockCharacter.name)).toBeInTheDocument();
      });

      // 點擊刪除角色
      const deleteButton = screen.getByLabelText('刪除角色');
      fireEvent.click(deleteButton);

      // 模擬檢查角色引用
      mockElectronAPI.characters.checkReferences.mockResolvedValue({
        references: [
          {
            type: 'chapter',
            id: 'chapter-1',
            title: '第一章',
            occurrences: 3,
          }
        ],
        characterName: mockCharacter.name,
        totalReferences: 1,
      });

      // 等待引用檢查結果
      await waitFor(() => {
        expect(screen.getByText('角色引用檢查')).toBeInTheDocument();
        expect(screen.getByText('該角色在以下位置被引用')).toBeInTheDocument();
        expect(screen.getByText('第一章')).toBeInTheDocument();
      });

      // 選擇強制刪除
      fireEvent.click(screen.getByText('強制刪除'));

      // 確認刪除
      await waitFor(() => {
        expect(screen.getByText('確認刪除角色')).toBeInTheDocument();
      });

      mockElectronAPI.characters.delete.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('確認刪除'));

      // 驗證刪除 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.characters.delete).toHaveBeenCalledWith(
          mockCharacter.id,
          true // forceDelete
        );
      });
    });

    it('應該在有引用時阻止刪除', async () => {
      renderWithProviders(<CharacterManager />, {
        initialEntries: ['/characters/test-project-1']
      });

      // 嘗試刪除角色
      const deleteButton = screen.getByLabelText('刪除角色');
      fireEvent.click(deleteButton);

      // 模擬有引用的情況
      mockElectronAPI.characters.checkReferences.mockResolvedValue({
        references: [
          {
            type: 'chapter',
            id: 'chapter-1',
            title: '第一章',
            occurrences: 5,
          }
        ],
        characterName: mockCharacter.name,
        totalReferences: 1,
      });

      // 選擇取消刪除
      await waitFor(() => {
        expect(screen.getByText('取消')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('取消'));

      // 驗證角色沒有被刪除
      await waitFor(() => {
        expect(mockElectronAPI.characters.delete).not.toHaveBeenCalled();
        expect(screen.getByText(mockCharacter.name)).toBeInTheDocument();
      });
    });
  });
});