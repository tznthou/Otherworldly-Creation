// 角色相關類型定義

export interface Relationship {
  id?: string;
  targetId: string;
  type: string;
  description: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  archetype?: string;
  age?: number;
  gender?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  relationships?: Relationship[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterFormData {
  name: string;
  archetype?: string;
  age?: number;
  gender?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  relationships?: Relationship[];
}

export interface CharacterFilters {
  search?: string;
  archetype?: string;
  gender?: string;
}

export interface CharacterSortOptions {
  field: 'name' | 'archetype' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

// 角色原型定義（保持向後兼容）
export const CHARACTER_ARCHETYPES = [
  '主角',
  '女主角',
  '傲嬌',
  '天然呆',
  '冷美人',
  '競爭對手',
  '導師',
  '反派',
  '夥伴',
  '配角',
] as const;

export type CharacterArchetype = typeof CHARACTER_ARCHETYPES[number];

// 性別選項
export const GENDER_OPTIONS = [
  '男',
  '女',
  '其他',
  '未設定',
] as const;

export type Gender = typeof GENDER_OPTIONS[number];

// 角色關係類型定義
export const RELATIONSHIP_TYPES = [
  '朋友',
  '戀人',
  '家人',
  '師父',
  '弟子',
  '競爭對手',
  '敵人',
  '同事',
  '上司',
  '下屬',
  '鄰居',
  '同學',
  '其他',
] as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[number];

// 關係管理相關介面
export interface RelationshipFormData {
  targetId: string;
  type: string;
  description: string;
}

export interface RelationshipValidationError {
  field: string;
  message: string;
}