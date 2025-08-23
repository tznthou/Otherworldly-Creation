import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

// 首頁組件
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div>
      <h2>🏠 歡迎使用創世紀元</h2>
      <div>
        <button 
          data-testid="create-project-btn"
          onClick={() => navigate('/create-project')}
        >
          創建新專案
        </button>
        <button data-testid="open-project-btn">打開專案</button>
      </div>
    </div>
  );
};

// 創建專案頁面組件
const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 模擬創建專案成功後導航到專案編輯器
    navigate('/project/test-project-1');
  };

  return (
    <div>
      <h2>📝 創建新專案</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="projectName">專案名稱</label>
          <input 
            id="projectName" 
            type="text" 
            data-testid="project-name-input"
            placeholder="輸入專案名稱"
          />
        </div>
        <div>
          <label htmlFor="projectType">專案類型</label>
          <select id="projectType" data-testid="project-type-select">
            <option value="isekai">異世界穿越</option>
            <option value="fantasy">奇幻冒險</option>
            <option value="romance">校園戀愛</option>
            <option value="scifi">科幻冒險</option>
          </select>
        </div>
        <div>
          <label htmlFor="projectDescription">專案描述</label>
          <textarea 
            id="projectDescription"
            data-testid="project-description-textarea"
            placeholder="描述您的故事概念"
          />
        </div>
        <div>
          <button type="submit" data-testid="confirm-create-btn">確認創建</button>
          <button 
            type="button" 
            data-testid="cancel-create-btn"
            onClick={() => navigate('/')}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
};

// 測試專用的App組件，不包含Router，由測試工具提供
const TestApp: React.FC = () => {
  console.log('🧪 測試App載入 - 當前時間:', new Date().toISOString());
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1d29', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ color: '#d4af37', marginBottom: '20px' }}>創世紀元：異世界創作神器</h1>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-project" element={<CreateProjectPage />} />
        <Route path="/project/:projectId" element={
          <div>
            <h2>📝 我的異世界冒險</h2>
            <div>
              <h3>章節列表</h3>
              <div>
                <button data-testid="add-chapter-btn">新增章節</button>
                <button data-testid="add-character-btn">新增角色</button>
                <button data-testid="ai-writing-btn">AI 續寫</button>
              </div>
              <div>
                <p>第一章：穿越異世界</p>
              </div>
            </div>
          </div>
        } />
        <Route path="/chapter-status/:projectId" element={
          <div>
            <h2>✅ 章節管理</h2>
            <p>章節狀態管理界面</p>
          </div>
        } />
        <Route path="*" element={
          <div>
            <h2>⚠️ 專案不存在</h2>
            <p>專案不存在或載入失敗</p>
            <button data-testid="retry-btn">重試</button>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default TestApp;