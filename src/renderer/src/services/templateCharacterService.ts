// 模板角色原型創建服務
import { CharacterArchetypeTemplate, NovelTemplate } from '../types/template';
import { Character, CharacterFormData } from '../types/character';
import { api } from '../api';

export interface TemplateCharacterCreationResult {
  success: boolean;
  createdCharacters: Character[];
  errors: string[];
}

export class TemplateCharacterService {
  
  /**
   * 從模板角色原型創建角色
   */
  async createCharactersFromTemplate(
    template: NovelTemplate, 
    projectId: string,
    selectedArchetypes?: string[] // 可選：只創建選中的原型
  ): Promise<TemplateCharacterCreationResult> {
    const result: TemplateCharacterCreationResult = {
      success: true,
      createdCharacters: [],
      errors: []
    };

    try {
      const archetypesToCreate = selectedArchetypes 
        ? template.characterArchetypes.filter(arch => selectedArchetypes.includes(arch.name))
        : template.characterArchetypes;

      for (const archetype of archetypesToCreate) {
        try {
          const character = await this.createCharacterFromArchetype(archetype, projectId, template);
          result.createdCharacters.push(character);
        } catch (error) {
          const errorMessage = `創建角色「${archetype.name}」失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
          result.errors.push(errorMessage);
          console.error(errorMessage, error);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`批量創建角色失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }

    return result;
  }

  /**
   * 從單個角色原型創建角色
   */
  private async createCharacterFromArchetype(
    archetype: CharacterArchetypeTemplate,
    projectId: string,
    template: NovelTemplate
  ): Promise<Character> {
    // 構建角色資料
    const characterData: CharacterFormData = {
      name: archetype.name,
      archetype: archetype.name,
      age: this.generateAgeFromArchetype(archetype),
      gender: this.selectGenderFromArchetype(archetype),
      appearance: archetype.appearance || this.generateAppearanceFromArchetype(archetype, template),
      personality: archetype.personality,
      background: archetype.background || this.generateBackgroundFromArchetype(archetype, template),
      relationships: [] // 初始沒有關係，後續可以建立
    };

    // 驗證角色資料
    this.validateCharacterData(characterData);

    // 調用角色創建 API
    const characterId = await api.characters.create({
      projectId,
      name: characterData.name,
      archetype: characterData.archetype || '',
      age: characterData.age,
      gender: characterData.gender || '',
      appearance: characterData.appearance || '',
      personality: characterData.personality || '',
      background: characterData.background || '',
      relationships: characterData.relationships || []
    });

    // 獲取創建的角色
    const character = await api.characters.getById(characterId);
    if (!character) {
      throw new Error('創建角色後無法獲取角色資料');
    }

    return character;
  }

  /**
   * 從原型生成年齡
   */
  private generateAgeFromArchetype(archetype: CharacterArchetypeTemplate): number | undefined {
    if (archetype.suggestedAge) {
      const { min, max } = archetype.suggestedAge;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return undefined;
  }

  /**
   * 從原型選擇性別
   */
  private selectGenderFromArchetype(archetype: CharacterArchetypeTemplate): string {
    if (archetype.suggestedGender && archetype.suggestedGender.length > 0) {
      const randomIndex = Math.floor(Math.random() * archetype.suggestedGender.length);
      return archetype.suggestedGender[randomIndex];
    }
    return '';
  }

  /**
   * 從原型生成外觀描述
   */
  private generateAppearanceFromArchetype(
    archetype: CharacterArchetypeTemplate,
    template: NovelTemplate
  ): string {
    if (archetype.appearance) {
      return archetype.appearance;
    }

    // 根據模板類型和角色標籤生成基本外觀描述
    const baseDescriptions: Record<string, string[]> = {
      isekai: [
        '擁有現代人的氣質，在異世界顯得與眾不同',
        '眼神中透露著來自另一個世界的智慧',
        '穿著異世界的服裝，但保持著現代人的習慣'
      ],
      school: [
        '清爽的學生氣質，穿著整潔的校服',
        '青春洋溢的外表，充滿活力',
        '符合高中生年齡的可愛外貌'
      ],
      scifi: [
        '未來感的外表，可能有科技改造的痕跡',
        '精幹的外表，適應太空環境',
        '現代化的服裝和裝備'
      ],
      fantasy: [
        '帶有奇幻色彩的外表特徵',
        '符合種族特色的外貌',
        '古典奇幻風格的服裝'
      ]
    };

    const descriptions = baseDescriptions[template.type] || baseDescriptions.isekai;
    const randomIndex = Math.floor(Math.random() * descriptions.length);
    return descriptions[randomIndex];
  }

  /**
   * 從原型生成背景故事
   */
  private generateBackgroundFromArchetype(
    archetype: CharacterArchetypeTemplate,
    template: NovelTemplate
  ): string {
    if (archetype.background) {
      return archetype.background;
    }

    // 根據角色類型和模板生成基本背景
    const roleBasedBackgrounds: Record<string, string> = {
      '主角': `作為${template.name.replace('模板', '')}世界的主角，擁有特殊的命運和使命。`,
      '女主角': `在${template.name.replace('模板', '')}的世界中，是重要的女性角色，與主角有著特殊的關係。`,
      '夥伴': `主角的重要夥伴，在冒險中提供支援和友情。`,
      '導師': `經驗豐富的指導者，為主角提供知識和指導。`,
      '反派': `故事的對立角色，有著複雜的動機和目標。`
    };

    // 根據角色的典型角色來生成背景
    if (archetype.typicalRoles && archetype.typicalRoles.length > 0) {
      const primaryRole = archetype.typicalRoles[0];
      return roleBasedBackgrounds[primaryRole] || `${archetype.name}在故事中扮演重要角色。`;
    }

    return `${archetype.name}是${template.name.replace('模板', '')}世界中的重要角色。`;
  }

  /**
   * 驗證角色資料
   */
  private validateCharacterData(characterData: CharacterFormData): void {
    if (!characterData.name || characterData.name.trim().length === 0) {
      throw new Error('角色名稱不能為空');
    }

    if (characterData.name.length > 50) {
      throw new Error('角色名稱不能超過 50 個字符');
    }

    if (characterData.appearance && characterData.appearance.length > 500) {
      throw new Error('外觀描述不能超過 500 個字符');
    }

    if (characterData.personality && characterData.personality.length > 500) {
      throw new Error('性格描述不能超過 500 個字符');
    }

    if (characterData.background && characterData.background.length > 1000) {
      throw new Error('背景故事不能超過 1000 個字符');
    }

    if (characterData.age !== undefined && (characterData.age < 0 || characterData.age > 1000)) {
      throw new Error('年齡必須在 0-1000 之間');
    }
  }

  /**
   * 為已創建的角色建立關係
   */
  async establishCharacterRelationships(
    characters: Character[],
    template: NovelTemplate
  ): Promise<void> {
    if (characters.length < 2) {
      return; // 需要至少兩個角色才能建立關係
    }

    try {
      // 根據模板類型建立典型關係
      const relationshipPatterns = this.getRelationshipPatterns(template.type);
      
      for (const pattern of relationshipPatterns) {
        const sourceChar = characters.find(c => 
          template.characterArchetypes.find(arch => 
            arch.name === c.archetype && arch.typicalRoles.includes(pattern.sourceRole)
          )
        );
        
        const targetChar = characters.find(c => 
          template.characterArchetypes.find(arch => 
            arch.name === c.archetype && arch.typicalRoles.includes(pattern.targetRole)
          )
        );

        if (sourceChar && targetChar && sourceChar.id !== targetChar.id) {
          const relationships = [
            {
              targetId: targetChar.id,
              type: pattern.relationType,
              description: pattern.description
            }
          ];

          // 創建角色關係 - 由於 API 不支援批量關係更新，需要逐一創建
          for (const relationship of relationships) {
            try {
              await api.characters.createRelationship({
                fromCharacterId: sourceChar.id,
                toCharacterId: relationship.targetId,
                relationshipType: relationship.type,
                description: relationship.description
              });
            } catch (error) {
              console.warn(`建立角色關係失敗: ${sourceChar.name} -> ${relationship.targetId}`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('建立角色關係失敗:', error);
      // 不拋出錯誤，因為關係建立失敗不應該影響角色創建
    }
  }

  /**
   * 獲取不同模板類型的關係模式
   */
  private getRelationshipPatterns(templateType: string) {
    const patterns: Record<string, Array<{
      sourceRole: string;
      targetRole: string;
      relationType: string;
      description: string;
    }>> = {
      isekai: [
        {
          sourceRole: '主角',
          targetRole: '女主角',
          relationType: '戀人',
          description: '在異世界冒險中逐漸產生的感情'
        },
        {
          sourceRole: '主角',
          targetRole: '夥伴',
          relationType: '朋友',
          description: '一起冒險的可靠夥伴'
        },
        {
          sourceRole: '主角',
          targetRole: '導師',
          relationType: '師父',
          description: '指導主角成長的導師'
        }
      ],
      school: [
        {
          sourceRole: '主角',
          targetRole: '女主角',
          relationType: '戀人',
          description: '校園中的青春戀愛'
        },
        {
          sourceRole: '主角',
          targetRole: '青梅竹馬',
          relationType: '朋友',
          description: '從小一起長大的好朋友'
        }
      ],
      scifi: [
        {
          sourceRole: '主角',
          targetRole: '夥伴',
          relationType: '同事',
          description: '共同執行任務的戰友'
        }
      ],
      fantasy: [
        {
          sourceRole: '主角',
          targetRole: '導師',
          relationType: '師父',
          description: '傳授魔法和戰鬥技巧的導師'
        },
        {
          sourceRole: '主角',
          targetRole: '夥伴',
          relationType: '朋友',
          description: '冒險路上的忠實夥伴'
        }
      ]
    };

    return patterns[templateType] || patterns.isekai;
  }

  /**
   * 獲取模板推薦的角色組合
   */
  getRecommendedCharacterCombination(template: NovelTemplate): {
    essential: CharacterArchetypeTemplate[];
    optional: CharacterArchetypeTemplate[];
  } {
    const essential: CharacterArchetypeTemplate[] = [];
    const optional: CharacterArchetypeTemplate[] = [];

    template.characterArchetypes.forEach(archetype => {
      if (archetype.typicalRoles.includes('主角') || archetype.typicalRoles.includes('女主角')) {
        essential.push(archetype);
      } else {
        optional.push(archetype);
      }
    });

    return { essential, optional };
  }

  /**
   * 預覽角色創建結果
   */
  previewCharacterCreation(
    template: NovelTemplate,
    selectedArchetypes?: string[]
  ): Array<{
    archetype: CharacterArchetypeTemplate;
    previewData: Partial<CharacterFormData>;
  }> {
    const archetypesToPreview = selectedArchetypes 
      ? template.characterArchetypes.filter(arch => selectedArchetypes.includes(arch.name))
      : template.characterArchetypes;

    return archetypesToPreview.map(archetype => ({
      archetype,
      previewData: {
        name: archetype.name,
        archetype: archetype.name,
        age: this.generateAgeFromArchetype(archetype),
        gender: this.selectGenderFromArchetype(archetype),
        appearance: archetype.appearance || this.generateAppearanceFromArchetype(archetype, template),
        personality: archetype.personality,
        background: archetype.background || this.generateBackgroundFromArchetype(archetype, template)
      }
    }));
  }
}

// 創建單例實例
export const templateCharacterService = new TemplateCharacterService();