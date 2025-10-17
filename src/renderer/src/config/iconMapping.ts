/**
 * Emoji 到 Heroicons 的映射配置
 *
 * 此文件定義了所有 emoji 到 Heroicons 的對應關係
 * 用於批量替換專案中的 emoji 為專業的 SVG 圖標
 */

export interface IconConfig {
  name: string; // Heroicons 圖標名稱 (不含 "Icon" 後綴)
  variant: 'outline' | 'solid';
  defaultColor?: string; // 預設顏色 className
  defaultSize?: string; // 預設大小 className
}

export const emojiToIcon: Record<string, IconConfig> = {
  // ==================== 狀態指示類 ====================
  '✅': { name: 'CheckCircle', variant: 'solid', defaultColor: 'text-green-500', defaultSize: 'w-5 h-5' },
  '❌': { name: 'XCircle', variant: 'solid', defaultColor: 'text-red-500', defaultSize: 'w-5 h-5' },
  '⚠️': {
    name: 'ExclamationTriangle',
    variant: 'solid',
    defaultColor: 'text-yellow-500',
    defaultSize: 'w-5 h-5',
  },
  'ℹ️': {
    name: 'InformationCircle',
    variant: 'outline',
    defaultColor: 'text-warm-gold',
    defaultSize: 'w-5 h-5',
  },
  '🔔': { name: 'Bell', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },

  // ==================== 功能/工具類 ====================
  '🎨': { name: 'PaintBrush', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '📊': { name: 'ChartBar', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '📝': { name: 'DocumentText', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '📖': { name: 'BookOpen', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '📚': { name: 'BookOpen', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '📁': { name: 'Folder', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🔧': { name: 'Wrench', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '⚙️': { name: 'Cog6Tooth', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🔍': { name: 'MagnifyingGlass', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🔑': { name: 'Key', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },

  // ==================== 導航/行動類 ====================
  '🚀': { name: 'RocketLaunch', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🎯': { name: 'Target', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-6 h-6' },
  '🏆': { name: 'Trophy', variant: 'solid', defaultColor: 'text-warm-gold', defaultSize: 'w-6 h-6' },
  '💡': { name: 'LightBulb', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🎁': { name: 'Gift', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },

  // ==================== 人物/社交類 ====================
  '👥': { name: 'Users', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🎭': { name: 'Sparkles', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' }, // 戲劇面具用 Sparkles 代替
  '✍️': { name: 'PencilSquare', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },

  // ==================== 慶祝/強調類 ====================
  '🎉': { name: 'Sparkles', variant: 'solid', defaultColor: 'text-warm-gold', defaultSize: 'w-6 h-6' },
  '✨': { name: 'Sparkles', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🌟': { name: 'Star', variant: 'solid', defaultColor: 'text-warm-gold', defaultSize: 'w-6 h-6' },
  '⭐': { name: 'Star', variant: 'solid', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '💯': { name: 'CheckBadge', variant: 'solid', defaultColor: 'text-warm-gold', defaultSize: 'w-6 h-6' },

  // ==================== 自然/世界類 ====================
  '🌍': { name: 'GlobeAlt', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🌙': { name: 'Moon', variant: 'solid', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },

  // ==================== AI/科技類 ====================
  '🤖': { name: 'Sparkles', variant: 'solid', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '🔮': { name: 'Sparkles', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
  '💬': {
    name: 'ChatBubbleLeftRight',
    variant: 'outline',
    defaultColor: 'text-warm-gold',
    defaultSize: 'w-5 h-5',
  },
  '📢': { name: 'Megaphone', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },

  // ==================== 實驗/測試類 ====================
  '🧪': { name: 'Beaker', variant: 'outline', defaultColor: 'text-warm-gold', defaultSize: 'w-5 h-5' },
};

/**
 * 根據 emoji 獲取對應的圖標配置
 */
export function getIconConfig(emoji: string): IconConfig | undefined {
  return emojiToIcon[emoji];
}

/**
 * 獲取所有支援的 emoji 列表
 */
export function getSupportedEmojis(): string[] {
  return Object.keys(emojiToIcon);
}

/**
 * 檢查 emoji 是否有對應的圖標
 */
export function hasIconMapping(emoji: string): boolean {
  return emoji in emojiToIcon;
}
