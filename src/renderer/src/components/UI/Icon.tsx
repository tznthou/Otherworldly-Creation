import React from 'react';
import * as HeroIcons from '@heroicons/react/24/outline';
import * as HeroIconsSolid from '@heroicons/react/24/solid';

interface IconProps {
  name: string;
  variant?: 'outline' | 'solid';
  className?: string;
  onClick?: () => void;
  title?: string;
}

/**
 * Icon 組件 - 統一的圖標介面
 *
 * 使用 Heroicons 作為圖標來源,提供統一的 API
 *
 * @example
 * // Outline 風格(預設)
 * <Icon name="Check" className="w-5 h-5 text-green-500" />
 *
 * // Solid 風格
 * <Icon name="CheckCircle" variant="solid" className="w-6 h-6 text-warm-gold" />
 *
 * // 可點擊圖標
 * <Icon name="X" onClick={handleClose} className="w-4 h-4 cursor-pointer hover:text-red-500" />
 */
export const Icon: React.FC<IconProps> = ({
  name,
  variant = 'outline',
  className = 'w-5 h-5',
  onClick,
  title,
}) => {
  // 根據 variant 選擇圖標集
  const icons = variant === 'solid' ? HeroIconsSolid : HeroIcons;

  // 構建圖標組件名稱 (例如: "Check" -> "CheckIcon")
  const iconName = `${name}Icon`;
  const IconComponent = icons[iconName as keyof typeof icons] as React.ComponentType<{
    className?: string;
    onClick?: () => void;
    title?: string;
  }>;

  // 如果找不到圖標,顯示警告並返回 null
  if (!IconComponent) {
    console.warn(`[Icon] Icon "${name}" not found in Heroicons ${variant} set`);
    return null;
  }

  return <IconComponent className={className} onClick={onClick} title={title} />;
};

// 常用圖標的便捷導出
export const CheckIcon = (props: Omit<IconProps, 'name'>) => <Icon name="Check" {...props} />;
export const XIcon = (props: Omit<IconProps, 'name'>) => <Icon name="XMark" {...props} />;
export const AlertIcon = (props: Omit<IconProps, 'name'>) => <Icon name="ExclamationTriangle" {...props} />;
export const InfoIcon = (props: Omit<IconProps, 'name'>) => <Icon name="InformationCircle" {...props} />;
export const SettingsIcon = (props: Omit<IconProps, 'name'>) => <Icon name="Cog6Tooth" {...props} />;
