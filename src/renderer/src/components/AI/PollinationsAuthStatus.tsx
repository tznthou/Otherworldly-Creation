import React, { useEffect, useState } from 'react';
import { api } from '../../api/tauri';

// 認證層級類型
export type AuthTier = 'anonymous' | 'seed' | 'flower' | 'nectar';

// 認證狀態信息
export interface AuthStatus {
  tier: AuthTier;
  hasToken: boolean;
  tokenInfo?: {
    user_name: string;
    token_tier: string;
    created_at: string;
  };
}

// 層級配置
const TIER_CONFIG = {
  anonymous: {
    label: '訪客',
    color: 'text-gray-400',
    bgColor: 'bg-gray-700',
    borderColor: 'border-gray-600',
    icon: '👤',
    rateLimit: '15秒',
    models: ['GptImage', 'SDXL'],
    description: '基礎模型存取'
  },
  seed: {
    label: 'Seed',
    color: 'text-green-400',
    bgColor: 'bg-green-700',
    borderColor: 'border-green-600',
    icon: '🌱',
    rateLimit: '5秒',
    models: ['GptImage', 'SDXL', 'Kontext'],
    description: '標準模型 + 圖像轉換'
  },
  flower: {
    label: 'Flower',
    color: 'text-purple-400',
    bgColor: 'bg-purple-700',
    borderColor: 'border-purple-600',
    icon: '🌸',
    rateLimit: '3秒',
    models: ['所有高級模型'],
    description: '高級模型 + 無限使用'
  },
  nectar: {
    label: 'Nectar',
    color: 'text-gold-400',
    bgColor: 'bg-gold-700',
    borderColor: 'border-gold-600',
    icon: '🍯',
    rateLimit: '無限制',
    models: ['所有高級模型'],
    description: '企業級 + 收益分成'
  }
};

interface PollinationsAuthStatusProps {
  className?: string;
  showDetails?: boolean;
  onClick?: () => void;
}

const PollinationsAuthStatus: React.FC<PollinationsAuthStatusProps> = ({
  className = '',
  showDetails = false,
  onClick
}) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    tier: 'anonymous',
    hasToken: false
  });
  const [loading, setLoading] = useState(true);

  // 檢查認證狀態
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // 檢查是否有 token
        const tokenInfo = await api.invoke('get_pollinations_token_info') as {
          user_name: string;
          token_tier: string;
          created_at: string;
        } | null;
        
        if (tokenInfo) {
          const tier = tokenInfo.token_tier?.toLowerCase() as AuthTier || 'seed';
          setAuthStatus({
            tier,
            hasToken: true,
            tokenInfo: tokenInfo
          });
        } else {
          setAuthStatus({
            tier: 'anonymous',
            hasToken: false
          });
        }
      } catch (error) {
        console.warn('[PollinationsAuthStatus] 檢查認證狀態失敗:', error);
        setAuthStatus({
          tier: 'anonymous',
          hasToken: false
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const config = TIER_CONFIG[authStatus.tier];

  if (loading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-500">檢查中...</span>
      </div>
    );
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`flex items-center space-x-2 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
      title={showDetails ? undefined : `Pollinations 認證層級: ${config.label} (${config.description})`}
    >
      {/* 認證徽章 */}
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-md border ${config.bgColor}/20 ${config.borderColor}/50`}>
        <span className="text-sm">{config.icon}</span>
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>

      {/* 詳細資訊 */}
      {showDetails && (
        <div className="flex flex-col text-xs text-cosmic-300">
          <div className="flex items-center space-x-1">
            <span>速率:</span>
            <span className={config.color}>{config.rateLimit}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>模型:</span>
            <span className="text-cosmic-400">{config.models.join(', ')}</span>
          </div>
        </div>
      )}

      {/* 升級提示 (僅限訪客) */}
      {authStatus.tier === 'anonymous' && onClick && (
        <div className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
          ✨ 升級
        </div>
      )}
    </div>
  );
};

export default PollinationsAuthStatus;