import { CSSProperties } from 'react';

// 基礎樣式
export const baseStyles = {
  // 背景漸層
  backgroundGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0A1128 100%)',
  appBackground: 'linear-gradient(135deg, #0A1128 0%, #1a1a2e 50%, #16213e 100%)',
  
  // 顏色
  primaryColor: '#FFD700',
  backgroundColor: '#0A1128',
  textColor: '#ccc',
  successColor: '#90EE90',
  errorColor: '#ff6b6b',
  warningColor: '#FFD700',
  
  // 字體大小
  fontSizeSmall: '12px',
  fontSizeNormal: '14px',
  fontSizeLarge: '16px',
  fontSizeXLarge: '18px',
  fontSizeXXLarge: '20px',
  
  // 邊框
  primaryBorder: '1px solid #FFD700',
  primaryBorderThick: '2px solid #FFD700',
  errorBorder: '1px solid #ff6b6b',
  
  // 圓角
  borderRadiusSmall: '3px',
  borderRadiusMedium: '5px',
  borderRadiusLarge: '8px',
  borderRadiusXLarge: '10px',
  borderRadiusXXLarge: '12px',
  borderRadiusRound: '15px',
  
  // 內距
  paddingSmall: '8px',
  paddingMedium: '10px',
  paddingLarge: '15px',
  paddingXLarge: '20px',
  paddingXXLarge: '30px',
  
  // 外距
  marginSmall: '8px',
  marginMedium: '10px',
  marginLarge: '15px',
  marginXLarge: '20px',
  marginXXLarge: '30px',
};

// 元件樣式
export const componentStyles: Record<string, CSSProperties> = {
  // 模態框遮罩
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  
  // 模態框內容
  modalContent: {
    background: baseStyles.backgroundGradient,
    border: baseStyles.primaryBorderThick,
    borderRadius: baseStyles.borderRadiusRound,
    padding: baseStyles.paddingXXLarge,
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  
  // 輸入框
  input: {
    width: '100%',
    padding: baseStyles.paddingMedium,
    background: 'rgba(255, 215, 0, 0.1)',
    border: baseStyles.primaryBorder,
    borderRadius: baseStyles.borderRadiusMedium,
    color: baseStyles.primaryColor,
    fontSize: baseStyles.fontSizeLarge
  },
  
  // 文字框
  textarea: {
    width: '100%',
    padding: baseStyles.paddingMedium,
    background: 'rgba(255, 215, 0, 0.1)',
    border: baseStyles.primaryBorder,
    borderRadius: baseStyles.borderRadiusMedium,
    color: baseStyles.primaryColor,
    fontSize: baseStyles.fontSizeNormal,
    resize: 'vertical' as const
  },
  
  // 主要按鈕
  primaryButton: {
    background: baseStyles.primaryColor,
    color: baseStyles.backgroundColor,
    border: 'none',
    padding: '12px 24px',
    borderRadius: baseStyles.borderRadiusLarge,
    cursor: 'pointer',
    fontSize: baseStyles.fontSizeLarge,
    fontWeight: 'bold'
  },
  
  // 次要按鈕
  secondaryButton: {
    background: 'transparent',
    color: baseStyles.primaryColor,
    border: baseStyles.primaryBorderThick,
    padding: '12px 24px',
    borderRadius: baseStyles.borderRadiusLarge,
    cursor: 'pointer',
    fontSize: baseStyles.fontSizeLarge
  },
  
  // 卡片
  card: {
    background: 'rgba(255, 215, 0, 0.1)',
    border: baseStyles.primaryBorder,
    borderRadius: baseStyles.borderRadiusXLarge,
    padding: baseStyles.paddingLarge
  },
  
  // 標題
  title: {
    color: baseStyles.primaryColor,
    textAlign: 'center' as const,
    marginBottom: baseStyles.marginXLarge
  },
  
  // 網格佈局
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: baseStyles.marginXLarge
  }
};

// 功能卡片樣式
export const featureCardStyles: Record<string, CSSProperties> = {
  base: {
    background: 'rgba(255, 215, 0, 0.1)',
    border: '2px solid rgba(255, 215, 0, 0.5)',
    color: '#FFD700',
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.3s ease',
    width: '100%',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  
  highlight: {
    background: 'rgba(255, 215, 0, 0.3)',
    border: '2px solid #FFD700'
  },
  
  hover: {
    background: 'rgba(255, 215, 0, 0.2)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
  },
  
  highlightHover: {
    background: 'rgba(255, 215, 0, 0.4)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
  }
};

// 頁面容器樣式
export const pageStyles: Record<string, CSSProperties> = {
  container: {
    padding: '20px'
  },
  
  centerContainer: {
    padding: '40px',
    textAlign: 'center'
  },
  
  title: {
    color: '#FFD700',
    marginBottom: '20px'
  },
  
  subtitle: {
    fontSize: '18px',
    marginBottom: '40px'
  }
};

// 錯誤頁面樣式
export const errorPageStyles: Record<string, CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    background: baseStyles.appBackground,
    color: baseStyles.primaryColor,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  
  errorBox: {
    background: 'rgba(255, 0, 0, 0.2)',
    border: '1px solid #ff6b6b',
    borderRadius: '10px',
    padding: '20px',
    maxWidth: '600px',
    textAlign: 'center'
  }
};