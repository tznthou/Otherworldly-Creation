import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import NotificationContainer from '../UI/NotificationContainer';
import CosmicBackground from '../UI/CosmicBackground';
import { useAppSelector } from '../../hooks/redux';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarCollapsed } = useAppSelector(state => state.ui);

  return (
    <div className="flex h-screen bg-cosmic-950 overflow-hidden relative">
      {/* 宇宙背景 */}
      <CosmicBackground intensity="medium" />
      
      {/* 側邊欄 */}
      <Sidebar />
      
      {/* 主要內容區域 */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* 頂部標題欄 */}
        <Header />
        
        {/* 主要內容 */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
        
        {/* 底部狀態欄 */}
        <Footer />
      </div>
      
      {/* 通知容器 */}
      <NotificationContainer />
    </div>
  );
};

export default Layout;