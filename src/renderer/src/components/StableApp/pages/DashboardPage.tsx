import React from 'react';
import { PageType } from '../types';
import FeatureCard from '../components/FeatureCard';
import { pageStyles, baseStyles } from '../styles';

interface DashboardPageProps {
  onPageChange: (page: PageType) => void;
  onOpenCreateProject: () => void;
  onOpenCharacterManager: () => void;
  onOpenTemplateManager: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  onPageChange,
  onOpenCreateProject,
  onOpenCharacterManager,
  onOpenTemplateManager
}) => {
  return (
    <div style={pageStyles.centerContainer}>
      <h2>🏠 歡迎來到創世紀元</h2>
      <p style={{ 
        fontSize: baseStyles.fontSizeXLarge, 
        marginBottom: '40px' 
      }}>
        用 AI 之力編織你的異世界傳說
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: baseStyles.marginXLarge,
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <FeatureCard
          title="🌟 創世神模式"
          description="創建新的異世界創作專案"
          onClick={onOpenCreateProject}
        />
        <FeatureCard
          title="⚔️ 英靈召喚"
          description="AI 輔助角色創造與管理"
          onClick={onOpenCharacterManager}
        />
        <FeatureCard
          title="🎭 輕小說模板"
          description="異世界、校園、科幻、奇幻模板"
          onClick={onOpenTemplateManager}
        />
        <FeatureCard
          title="🔮 預言書寫"
          description="智能續寫與劇情建議"
          onClick={() => alert('🔮 AI 續寫功能即將推出！\n\n將提供：\n- 智能文本續寫\n- 劇情發展建議\n- 角色對話優化\n- 場景描述輔助\n\n敬請期待！')}
        />
        <FeatureCard
          title="📝 開始創作"
          description="進入編輯器開始寫作"
          onClick={() => onPageChange('editor')}
          highlight={true}
        />
        <FeatureCard
          title="💾 資料管理"
          description="資料庫維護、備份還原"
          onClick={() => onPageChange('data')}
        />
        <FeatureCard
          title="📥 匯入專案"
          description="從備份檔案匯入現有專案"
          onClick={() => {
            if (confirm('匯入專案功能現已整合到「資料管理」中。\n是否前往資料管理頁面？')) {
              onPageChange('data');
            }
          }}
        />
        <FeatureCard
          title="⚙️ 系統設定"
          description="配置 AI 引擎和應用程式設定"
          onClick={() => onPageChange('settings')}
        />
        <FeatureCard
          title="📊 創作統計"
          description="字數統計、寫作時間和進度追蹤"
          onClick={() => onPageChange('stats')}
        />
        <FeatureCard
          title="❓ 使用說明"
          description="查看使用教學和常見問題"
          onClick={() => onPageChange('help')}
        />
      </div>
    </div>
  );
};

export default DashboardPage;