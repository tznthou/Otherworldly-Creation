import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import CosmicBackground from '../UI/CosmicBackground';
import ModalContainer from '../UI/ModalContainer';
import { useAppSelector } from '../../hooks/redux';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarCollapsed } = useAppSelector(state => state.ui);
  const location = useLocation();
  
  // 檢測是否為編輯器頁面，允許外層滾動
  const isEditorPage = location.pathname.includes('/project/');
  const mainOverflowClass = isEditorPage ? 'overflow-auto' : 'overflow-hidden';

  return (
    <div className="flex h-screen bg-cosmic-950 relative">
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
        <main className={`flex-1 ${mainOverflowClass} relative`}>
          {children}
        </main>
        
        {/* 底部狀態欄 */}
        <Footer />
      </div>
      
    </div>
  );
};

export default Layout;