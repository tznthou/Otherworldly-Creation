// 角色原型模板定義
export interface CharacterArchetypeTemplate {
  id: string;
  name: string;
  description: string;
  defaultPersonality: string;
  defaultAppearance?: string;
  defaultBackground?: string;
  suggestedAge?: {
    min: number;
    max: number;
  };
  suggestedGender?: string[];
  tags: string[];
}

// 輕小說常見角色原型模板
export const CHARACTER_ARCHETYPE_TEMPLATES: CharacterArchetypeTemplate[] = [
  {
    id: 'protagonist',
    name: '主角',
    description: '故事的主要角色，通常是讀者視角的中心',
    defaultPersonality: '勇敢、正義感強烈、有責任心，面對困難不輕易放棄。雖然有時會迷茫，但總能在關鍵時刻做出正確的選擇。',
    defaultBackground: '平凡的高中生/大學生，因為某個契機而捲入不平凡的事件中。擁有隱藏的潛力或特殊能力。',
    suggestedAge: { min: 15, max: 18 },
    suggestedGender: ['男', '女'],
    tags: ['主要角色', '正義', '成長']
  },
  {
    id: 'heroine',
    name: '女主角',
    description: '故事中的主要女性角色，通常是主角的重要夥伴或戀愛對象',
    defaultPersonality: '溫柔善良但內心堅強，聰明機智，對主角有特殊的理解和支持。有時會展現出意外的一面。',
    defaultAppearance: '美麗動人，有著令人印象深刻的特徵（如特殊的髮色或眼色）。穿著得體，氣質優雅。',
    defaultBackground: '可能來自特殊的家庭背景，或擁有某種特殊身份。與主角的相遇往往不是偶然。',
    suggestedAge: { min: 15, max: 18 },
    suggestedGender: ['女'],
    tags: ['主要角色', '溫柔', '美麗']
  },
  {
    id: 'tsundere',
    name: '傲嬌',
    description: '表面冷淡或強勢，內心溫柔的角色類型',
    defaultPersonality: '表面上態度冷淡、說話尖銳，但內心其實很關心他人。不坦率，經常口是心非，但在關鍵時刻會展現溫柔的一面。',
    defaultAppearance: '通常有著精緻的外貌，可能是雙馬尾或短髮。表情經常帶有一絲傲氣，但偶爾會露出可愛的表情。',
    defaultBackground: '可能來自富裕家庭或有著優秀的成績，因此養成了高傲的性格。但內心可能有著不為人知的脆弱。',
    suggestedAge: { min: 15, max: 17 },
    suggestedGender: ['女'],
    tags: ['傲嬌', '可愛', '反差']
  },
  {
    id: 'airhead',
    name: '天然呆',
    description: '天真無邪、有些迷糊但純真可愛的角色',
    defaultPersonality: '天真爛漫，思考方式與眾不同，經常做出令人意外的行為。雖然有時顯得迷糊，但擁有純真的心靈和獨特的智慧。',
    defaultAppearance: '可愛的外表，眼神清澈純真。可能有著柔軟的髮質和溫和的表情，給人親近感。',
    defaultBackground: '可能生活在相對單純的環境中，對世界保持著純真的看法。家庭溫暖和睦。',
    suggestedAge: { min: 14, max: 16 },
    suggestedGender: ['女'],
    tags: ['天然', '可愛', '純真']
  },
  {
    id: 'cool_beauty',
    name: '冷美人',
    description: '外表冷酷美麗，內心深藏情感的角色',
    defaultPersonality: '表面冷靜沉著，不輕易表露情感。理性思考，行事果斷。雖然看似冷漠，但對重要的人會展現出溫柔的一面。',
    defaultAppearance: '擁有冷豔的美貌，氣質高雅。可能是長直髮，眼神銳利但美麗。穿著簡潔而有品味。',
    defaultBackground: '可能有著複雜的過去或特殊的身份，因此養成了冷靜的性格。可能是學生會長或優等生。',
    suggestedAge: { min: 16, max: 18 },
    suggestedGender: ['女'],
    tags: ['冷酷', '美麗', '神秘']
  },
  {
    id: 'rival',
    name: '競爭對手',
    description: '與主角實力相當，既是對手也是朋友的角色',
    defaultPersonality: '自信而有實力，對主角既認可又不服輸。有著強烈的競爭意識和上進心，但同時也尊重對手。',
    defaultBackground: '通常有著優秀的能力或特殊的訓練背景，與主角在某個領域形成競爭關係。',
    suggestedAge: { min: 15, max: 18 },
    suggestedGender: ['男', '女'],
    tags: ['競爭', '實力', '成長']
  },
  {
    id: 'mentor',
    name: '導師',
    description: '指導和幫助主角成長的智者角色',
    defaultPersonality: '智慧深邃，經驗豐富。對主角既嚴格又關愛，能在關鍵時刻給予正確的指導。有時會故意保持神秘。',
    defaultBackground: '擁有豐富的人生經歷和深厚的知識或技能。可能是前輩、老師或神秘的智者。',
    suggestedAge: { min: 25, max: 50 },
    suggestedGender: ['男', '女'],
    tags: ['智慧', '指導', '經驗']
  },
  {
    id: 'villain',
    name: '反派',
    description: '與主角對立的角色，通常是故事的主要障礙',
    defaultPersonality: '可能是純粹的邪惡，也可能有著複雜的動機。通常聰明狡猾，有著強大的力量或影響力。',
    defaultBackground: '可能有著悲慘的過去導致黑化，或者天生就有著扭曲的價值觀。通常擁有與主角相對的力量。',
    suggestedAge: { min: 18, max: 40 },
    suggestedGender: ['男', '女'],
    tags: ['對立', '強大', '複雜']
  },
  {
    id: 'sidekick',
    name: '夥伴',
    description: '主角的重要夥伴，提供支持和協助',
    defaultPersonality: '忠誠可靠，願意為朋友付出。可能有著互補主角的特殊技能或性格特點。',
    defaultBackground: '與主角有著深厚的友誼或共同的目標，願意一起面對困難和挑戰。',
    suggestedAge: { min: 15, max: 18 },
    suggestedGender: ['男', '女'],
    tags: ['忠誠', '支持', '友誼']
  },
  {
    id: 'supporting',
    name: '配角',
    description: '為故事增添色彩的次要角色',
    defaultPersonality: '有著鮮明的個性特點，雖然不是主要角色，但在特定場景中發揮重要作用。',
    defaultBackground: '有著自己的生活和故事，與主角有一定的關聯但不是核心關係。',
    suggestedAge: { min: 15, max: 25 },
    suggestedGender: ['男', '女'],
    tags: ['個性', '輔助', '豐富']
  }
];

// 根據專案類型獲取推薦的角色原型
export function getRecommendedArchetypes(projectType: string): CharacterArchetypeTemplate[] {
  const baseArchetypes = CHARACTER_ARCHETYPE_TEMPLATES;
  
  switch (projectType) {
    case 'isekai':
      // 異世界類型推薦的角色原型
      return baseArchetypes.filter(archetype => 
        ['protagonist', 'heroine', 'mentor', 'rival', 'sidekick'].includes(archetype.id)
      );
    
    case 'school':
      // 校園類型推薦的角色原型
      return baseArchetypes.filter(archetype => 
        ['protagonist', 'heroine', 'tsundere', 'airhead', 'cool_beauty', 'rival'].includes(archetype.id)
      );
    
    case 'scifi':
      // 科幻類型推薦的角色原型
      return baseArchetypes.filter(archetype => 
        ['protagonist', 'heroine', 'mentor', 'villain', 'sidekick'].includes(archetype.id)
      );
    
    case 'fantasy':
      // 奇幻類型推薦的角色原型
      return baseArchetypes.filter(archetype => 
        ['protagonist', 'heroine', 'mentor', 'villain', 'rival', 'sidekick'].includes(archetype.id)
      );
    
    default:
      return baseArchetypes;
  }
}

// 根據原型 ID 獲取模板
export function getArchetypeTemplate(archetypeId: string): CharacterArchetypeTemplate | undefined {
  return CHARACTER_ARCHETYPE_TEMPLATES.find(template => template.id === archetypeId);
}

// 根據原型名稱獲取模板
export function getArchetypeTemplateByName(archetypeName: string): CharacterArchetypeTemplate | undefined {
  return CHARACTER_ARCHETYPE_TEMPLATES.find(template => template.name === archetypeName);
}