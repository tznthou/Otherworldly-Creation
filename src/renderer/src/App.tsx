import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 極簡測試頁面

const App: React.FC = () => {
  console.log('🔥 極簡App載入 - 當前時間:', new Date().toISOString());
  
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div style={{ padding: '20px', backgroundColor: '#1a1d29', minHeight: '100vh', color: 'white' }}>
        <h1 style={{ color: '#d4af37', marginBottom: '20px' }}>🚀 極簡路由測試</h1>
        <Routes>
          <Route path="/" element={
            <div>
              <h2>🏠 首頁測試成功！</h2>
              <p>路徑: {window.location.pathname}</p>
            </div>
          } />
          <Route path="/chapter-status/:projectId" element={
            <div>
              <h2>✅ 章節管理測試成功！</h2>
              <p>路徑: {window.location.pathname}</p>
              <p>專案ID: {window.location.pathname.split('/')[2]}</p>
            </div>
          } />
          <Route path="*" element={
            <div>
              <h2>❌ 未匹配路由</h2>
              <p>路徑: {window.location.pathname}</p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;