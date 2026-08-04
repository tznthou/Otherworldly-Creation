# Genesis Chronicle 網站設計指南

> 最後更新：2025-10-16
> 版本：v1.0

本文件詳細記錄 Genesis Chronicle 創世紀元網站的完整設計系統，包含色彩、字體、排版、組件、動畫等所有設計決策。供未來維護、擴展或創建新頁面時參考。

---

## 目錄

1. [設計理念](#設計理念)
2. [色彩系統](#色彩系統)
3. [字體系統](#字體系統)
4. [間距與佈局](#間距與佈局)
5. [組件設計](#組件設計)
6. [動畫系統](#動畫系統)
7. [響應式設計](#響應式設計)
8. [互動設計](#互動設計)
9. [最佳實踐](#最佳實踐)

---

## 設計理念

### 核心概念

**人文溫度 × 科技輔助**

- **人文第一**：設計強調文字的溫度和創作的情感，避免過度科技感
- **克制優雅**：使用溫暖的大地色系而非科技冷色調，傳達「AI 是輔助而非主導」的核心價值
- **書卷氣息**：融入紙張、羽毛筆、書本等傳統創作元素，呼應文學創作的本質
- **直觀簡潔**：界面設計簡潔直觀，讓創作者專注於內容本身

### 設計關鍵詞

- 溫暖、優雅、人文
- 簡潔、直觀、專注
- 傳統與現代的融合
- 克制而不冷漠

---

## 色彩系統

### 主色調

採用**溫暖的大地色系**，傳達人文溫度和創作氛圍。

```css
/* Tailwind 配色定義 */
colors: {
  'warm-gold': '#d4a574',      /* 溫暖金 - 主要強調色 */
  'clay-orange': '#c17d5a',    /* 陶土橙 - 次要強調色 */
  'wood-brown': '#8b7355',     /* 木質棕 - 輔助色 */
  'bg-dark': '#1a1612',        /* 深色背景 - 主背景 */
  'bg-light': '#2a2420',       /* 淺色背景 - 次背景/卡片 */
  'text-primary': '#e8e3da',   /* 主文字色 - 高對比 */
  'text-secondary': '#b8afa4', /* 次文字色 - 中對比 */
}
```

### 色彩使用規則

#### 主色 (warm-gold: #d4a574)
- **用途**：品牌識別、主要 CTA、標題強調、連結 hover、圖示強調
- **禁止**：大面積背景、正文文字
- **範例**：Logo、「立即開始寫作」按鈕、章節標題、sidebar active 狀態

#### 次色 (clay-orange: #c17d5a)
- **用途**：漸層配色、次要 CTA、警告訊息、輔助強調
- **禁止**：單獨作為主色使用
- **範例**：按鈕漸層 `from-warm-gold to-clay-orange`、warning-box 邊框

#### 輔助色 (wood-brown: #8b7355)
- **用途**：深層次的視覺元素、裝飾細節
- **範例**：插圖細節、羽毛筆筆桿

#### 背景色系統
- **bg-dark (#1a1612)**：全局主背景、深色卡片
- **bg-light (#2a2420)**：次級背景、卡片背景、側邊欄

#### 文字色系統
- **text-primary (#e8e3da)**：標題、重要文字、高對比場景
- **text-secondary (#b8afa4)**：正文、說明文字、次要資訊

### 透明度使用

常用透明度層級：

```css
/* 邊框 */
border-warm-gold/10   /* 10% - 微弱分隔線 */
border-warm-gold/20   /* 20% - 常規邊框 */
border-warm-gold/30   /* 30% - 強調邊框 */

/* 背景 */
bg-warm-gold/10       /* 10% - hover 狀態、info-box */
bg-warm-gold/15       /* 15% - code 背景 */
bg-warm-gold/20       /* 20% - 裝飾元素 */

/* 漸層光暈 */
bg-warm-gold rounded-full blur-3xl opacity-5
```

### 特殊模板配色

部分區塊可使用**情境色彩**（Templates Section）：

- **異世界模板**：warm-gold/clay-orange（維持主色）
- **校園戀愛模板**：pink-500/rose-400（粉紅系）
- **科幻冒險模板**：blue-500/cyan-400（藍青系）
- **奇幻冒險模板**：purple-500/violet-400（紫羅蘭系）

**使用原則**：僅用於對應模板卡片，保持 20% 透明度以維持整體色調和諧。

---

## 字體系統

### 字體家族

```css
fontFamily: {
  'serif-tc': ['"Noto Serif TC"', 'serif'],     /* 繁中襯線 - 標題/品牌 */
  'sans-tc': ['"Noto Sans TC"', 'sans-serif'],  /* 繁中無襯線 - 正文 */
  'inter': ['Inter', 'sans-serif'],             /* 英文無襯線 - 輔助 */
  'crimson': ['"Crimson Text"', 'serif'],       /* 英文襯線 - 裝飾 */
}
```

### 字體使用規則

#### Noto Serif TC（serif-tc）
- **用途**：品牌 Logo、大標題、章節標題
- **字重**：400 (Regular)、700 (Bold)、900 (Black)
- **特性**：優雅、正式、具人文氣質
- **範例**：
  ```html
  <h1 class="font-serif-tc font-black">Genesis Chronicle</h1>
  <h2 class="font-serif-tc font-bold">快速開始</h2>
  ```

#### Noto Sans TC（sans-tc）
- **用途**：正文、說明文字、導航選單、UI 元件
- **字重**：300 (Light)、400 (Regular)、500 (Medium)、700 (Bold)
- **特性**：清晰、易讀、現代
- **範例**：
  ```html
  <body class="font-sans-tc">
  <p class="font-sans-tc font-light">創作是孤獨的旅程...</p>
  ```

#### Inter
- **用途**：英文關鍵字、數字、代碼
- **字重**：400、500、600、700
- **特性**：幾何美感、優秀螢幕顯示
- **範例**：
  ```html
  <code class="font-inter">Genesis-Chronicle-macos.dmg</code>
  ```

#### Crimson Text
- **用途**：裝飾性英文標題（較少使用）
- **字重**：400、600、700

### 字體大小階層

使用 Tailwind 標準尺寸，常用規格：

| 元素類型 | 類別 | 尺寸 | 使用場景 |
|---------|------|------|---------|
| 超大標題 | `text-7xl` | 72px | Hero 區主標題（桌面） |
| 大標題 | `text-6xl` | 60px | Hero 區主標題（手機） |
| 一級標題 | `text-5xl` | 48px | Section 主標題 |
| 二級標題 | `text-4xl` | 36px | 次要標題 |
| 三級標題 | `text-3xl` | 30px | 文檔章節標題 |
| 四級標題 | `text-2xl` | 24px | 卡片標題 |
| 五級標題 | `text-xl` | 20px | 小標題 |
| 正文大 | `text-lg` | 18px | 重要說明 |
| 正文 | `text-base` | 16px | 預設正文 |
| 正文小 | `text-sm` | 14px | 輔助說明 |
| 註釋 | `text-xs` | 12px | 標籤、版本號 |

### 行高與字距

```css
/* 標題 */
leading-tight      /* 1.25 - 超大標題 */
leading-relaxed    /* 1.625 - 一般標題 */

/* 正文 */
leading-normal     /* 1.5 - 預設 */
leading-relaxed    /* 1.625 - 需要更好閱讀性的段落 */

/* 字距 */
tracking-tight     /* -0.025em - 大標題 */
tracking-normal    /* 0 - 正文 */
tracking-wider     /* 0.05em - 副標題、小標題 */
tracking-widest    /* 0.1em - 強調用關鍵字 */
```

### 字重使用指南

```css
font-light    /* 300 - 優雅的描述文字 */
font-normal   /* 400 - 正文 */
font-medium   /* 500 - 次要標題、按鈕 */
font-semibold /* 600 - 強調文字 */
font-bold     /* 700 - 標題 */
font-black    /* 900 - 品牌/超大標題 */
```

---

## 間距與佈局

### 容器系統

```html
<!-- 標準內容容器 -->
<div class="max-w-7xl mx-auto px-6 lg:px-8">
  <!-- 內容 -->
</div>

<!-- 窄內容容器（文檔、文章） -->
<div class="max-w-4xl mx-auto px-6 lg:px-12">
  <!-- 內容 -->
</div>

<!-- 中寬容器（對話框、卡片組） -->
<div class="max-w-2xl mx-auto">
  <!-- 內容 -->
</div>
```

### 響應式間距

| 類別 | 手機 (sm) | 平板 (md) | 桌面 (lg) |
|------|----------|----------|----------|
| 頁面內邊距 | `px-6` | `px-6` | `px-8` |
| Section 垂直間距 | `py-20` | `py-20` | `py-32` |
| 卡片內邊距 | `p-6` | `p-8` | `p-8` |
| 元素間距（小） | `space-y-2` | `space-y-2` | `space-y-2` |
| 元素間距（中） | `space-y-4` | `space-y-6` | `space-y-6` |
| 元素間距（大） | `space-y-8` | `space-y-12` | `space-y-12` |

### 網格系統

```html
<!-- 2欄（平板）/ 3欄（桌面） -->
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- 響應式雙欄 -->
<div class="grid lg:grid-cols-2 gap-12 items-center">

<!-- 自適應卡片網格 -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
```

### Z-index 層級系統

```css
z-0        /* 基礎層 */
z-10       /* 內容層 */
z-20       /* 浮動元素 */
z-50       /* 導航欄 */
z-1000     /* Back to Top 按鈕 */
z-9999     /* Lightbox / Modal */
```

---

## 組件設計

### 導航欄 (Navigation)

**設計特點**：
- 固定頂部（`fixed top-0`）
- 半透明背景 + 毛玻璃效果（`bg-bg-dark/95 backdrop-blur-sm`）
- 微弱下邊框（`border-b border-warm-gold/10`）
- 高度 80px（`h-20`）

**結構**：
```html
<nav class="fixed top-0 left-0 right-0 z-50 bg-bg-dark/95 backdrop-blur-sm border-b border-warm-gold/10">
  <div class="max-w-7xl mx-auto px-6 lg:px-8">
    <div class="flex items-center justify-between h-20">
      <!-- Logo -->
      <span class="text-2xl font-serif-tc font-bold text-warm-gold">Genesis Chronicle</span>

      <!-- Menu -->
      <div class="hidden md:flex items-center space-x-12">
        <a href="#" class="text-text-secondary hover:text-warm-gold transition-colors duration-300">
          使用指南
        </a>
      </div>

      <!-- CTA -->
      <a href="#download" class="px-6 py-2.5 bg-gradient-to-r from-warm-gold to-clay-orange text-bg-dark font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
        立即開始寫作
      </a>
    </div>
  </div>
</nav>
```

**互動狀態**：
- 連結預設：`text-text-secondary`
- 連結 hover：`text-warm-gold`（300ms 過渡）
- CTA hover：陰影提升 + 向上平移 0.5px

### 按鈕系統

#### 主要 CTA 按鈕
```html
<a href="#" class="px-8 py-4 bg-gradient-to-r from-warm-gold to-clay-orange text-bg-dark font-medium text-lg rounded-full hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
  用文字，述說你的溫度
  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
  </svg>
</a>
```

**特點**：
- 金色到橙色漸層背景
- 完全圓角（`rounded-full`）
- Hover 時陰影加深 + 向上平移
- 可選配右側箭頭圖示

#### 次要按鈕
```html
<a href="#" class="px-8 py-4 border-2 border-warm-gold text-warm-gold font-medium text-lg rounded-full hover:bg-warm-gold/10 transition-all duration-300">
  了解如何開始
</a>
```

**特點**：
- 透明背景 + 金色邊框
- Hover 時淺金色背景（10% 透明度）

### 卡片系統

#### 標準特色卡片
```html
<div class="card-hover bg-bg-light/50 backdrop-blur-sm rounded-3xl p-8 border border-warm-gold/10">
  <div class="w-16 h-16 rounded-2xl bg-warm-gold/10 flex items-center justify-center mb-6">
    <!-- Icon SVG -->
  </div>
  <h3 class="text-2xl font-serif-tc font-bold text-text-primary mb-4">
    標題
  </h3>
  <p class="text-text-secondary leading-relaxed">
    描述文字...
  </p>
  <div class="pt-6 border-t border-warm-gold/10">
    <span class="text-sm text-warm-gold font-medium">行動提示</span>
  </div>
</div>
```

**特點**：
- 半透明背景 + 毛玻璃效果
- 大圓角（`rounded-3xl` = 24px）
- Hover 效果由 `.card-hover` 提供（向上浮動 + 陰影）
- 頂部圖示區、內容區、底部分隔行動提示

#### 模板卡片
```html
<div class="group card-hover bg-bg-dark/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-warm-gold/20 cursor-pointer">
  <!-- 縮圖區 -->
  <div class="aspect-video bg-gradient-to-br from-warm-gold/20 to-clay-orange/10 rounded-xl mb-4 flex items-center justify-center">
    <span class="text-3xl">👑</span>
  </div>

  <!-- 內容 -->
  <h3 class="text-xl font-serif-tc font-bold text-text-primary mb-2 group-hover:text-warm-gold transition-colors">
    模板標題
  </h3>
  <p class="text-sm text-text-secondary mb-2 font-medium">分類標籤</p>
  <p class="text-sm text-text-secondary mb-4">描述...</p>

  <!-- 標籤 -->
  <div class="flex items-center gap-2 text-xs text-warm-gold flex-wrap">
    <span class="px-2 py-1 bg-warm-gold/10 rounded-full">標籤1</span>
    <span class="px-2 py-1 bg-warm-gold/10 rounded-full">標籤2</span>
  </div>

  <!-- 版本號 -->
  <div class="mt-4 pt-4 border-t border-warm-gold/10 text-xs text-text-secondary">
    v1.0.0
  </div>
</div>
```

**特點**：
- `group` + `group-hover` 實現整體聯動 hover
- 16:9 縮圖區
- 多標籤系統
- 版本號顯示

### 訊息框系統

#### Info Box（資訊提示）
```html
<div class="info-box">
  <p class="text-text-primary">
    <strong>提示標題：</strong>內容描述...
  </p>
</div>
```

**CSS 定義**：
```css
.info-box {
  background: rgba(212, 165, 116, 0.1);
  border-left: 4px solid #d4a574;
  padding: 16px 20px;
  border-radius: 4px;
  margin: 20px 0;
}
```

#### Warning Box（警告提示）
```html
<div class="warning-box">
  <p class="text-text-primary leading-relaxed">
    <strong>重要提醒：</strong>警告內容...
  </p>
</div>
```

**CSS 定義**：
```css
.warning-box {
  background: rgba(193, 125, 90, 0.1);
  border-left: 4px solid #c17d5a;
  padding: 16px 20px;
  border-radius: 4px;
  margin: 20px 0;
}
```

### 表格系統

**文檔專用表格**：

```html
<table class="doc-table">
  <thead>
    <tr>
      <th>欄位1</th>
      <th>欄位2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>內容1</td>
      <td>內容2</td>
    </tr>
  </tbody>
</table>
```

**CSS 定義**：
```css
.doc-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid rgba(212, 165, 116, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.doc-table th {
  background: rgba(212, 165, 116, 0.1);
  color: #d4a574;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid rgba(212, 165, 116, 0.3);
}

.doc-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(212, 165, 116, 0.1);
}

.doc-table tr:last-child td {
  border-bottom: none;
}

.doc-table tr:hover {
  background: rgba(212, 165, 116, 0.05);
}
```

### 步驟序號

```html
<div class="flex items-start">
  <span class="step-number">1</span>
  <div>
    <p class="font-semibold text-text-primary mb-2">步驟標題</p>
    <p>步驟說明...</p>
  </div>
</div>
```

**CSS 定義**：
```css
.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #d4a574, #c17d5a);
  color: #1a1612;
  border-radius: 50%;
  font-weight: 700;
  margin-right: 12px;
  flex-shrink: 0; /* 防止被壓縮 */
}
```

### 側邊欄（文檔頁）

```html
<aside class="hidden lg:block fixed left-0 top-20 bottom-0 w-64 bg-bg-light/50 border-r border-warm-gold/10 overflow-y-auto">
  <nav class="p-6 space-y-1">
    <h3 class="text-warm-gold font-bold mb-4 text-sm uppercase tracking-wider">目錄</h3>

    <a href="#section" class="sidebar-link block py-2 px-4 text-text-secondary hover:text-warm-gold border-l-2 border-transparent">
      章節標題
    </a>

    <!-- 子項目 -->
    <div class="pl-4 space-y-1">
      <a href="#subsection" class="sidebar-link block py-1.5 px-4 text-sm text-text-secondary hover:text-warm-gold border-l-2 border-transparent">
        子章節
      </a>
    </div>
  </nav>
</aside>
```

**Active 狀態 CSS**：
```css
.sidebar-link {
  transition: all 0.2s ease;
}

.sidebar-link.active {
  color: #d4a574;
  border-left-color: #d4a574;
  background: rgba(212, 165, 116, 0.1);
}
```

**JavaScript 聯動**：滾動時自動高亮當前章節連結。

### Back to Top 按鈕

```html
<button id="backToTop" class="back-to-top">
  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
  </svg>
</button>
```

**CSS 定義**：
```css
.back-to-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #d4a574 0%, #c17d5a 100%);
  color: #1a1612;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(212, 165, 116, 0.4);
  opacity: 0;
  visibility: hidden;
  transform: translateY(100px);
  transition: all 0.4s ease;
}

.back-to-top.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.back-to-top:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(212, 165, 116, 0.6);
}
```

**行為**：
- 預設隱藏
- 向下滾動超過 300px 時顯示（加上 `.show` class）
- 點擊平滑滾動回頂部

---

## 動畫系統

### Keyframes 定義

```css
/* 淡入 - 從左 */
@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 淡入 - 從右 */
@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 淡入 - 從下 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 浮動動畫 */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 慢速浮動 + 輕微旋轉 */
@keyframes floatSlow {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-15px) rotate(2deg);
  }
}

/* 文字粒子浮動 */
@keyframes floatText {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-20px);
    opacity: 0.6;
  }
}
```

### 動畫應用類別

```css
[data-animate="fade-in-left"] {
  animation: fadeInLeft 0.8s ease-out forwards;
}

[data-animate="fade-in-right"] {
  animation: fadeInRight 1.2s ease-out forwards;
}

[data-animate="fade-in-up"] {
  animation: fadeInUp 0.6s ease-out forwards;
}

[data-animate="float"] {
  animation: float 3s ease-in-out infinite;
}

[data-animate="float-delayed"] {
  animation: float 3s ease-in-out infinite 0.5s;
}

[data-animate="float-slow"] {
  animation: floatSlow 4s ease-in-out infinite;
}

[data-animate="float-text"] {
  animation: floatText 5s ease-in-out infinite;
}

[data-animate="float-text-delayed"] {
  animation: floatText 5s ease-in-out infinite 1s;
}

[data-animate="float-text-slow"] {
  animation: floatText 6s ease-in-out infinite 2s;
}
```

### 使用方式

**進場動畫**（頁面載入時觸發）：
```html
<div data-animate="fade-in-left">左側淡入</div>
<div data-animate="fade-in-right">右側淡入</div>
<div data-animate="fade-in-up">向上淡入</div>
```

**持續浮動動畫**（裝飾元素）：
```html
<div data-animate="float">標準浮動</div>
<div data-animate="float-delayed">延遲 0.5s 浮動</div>
<div data-animate="float-slow">慢速浮動 + 旋轉</div>
<div data-animate="float-text">文字粒子浮動</div>
```

### Hover 動畫

#### 卡片 Hover
```css
.card-hover {
  transition: all 0.3s ease;
}

.card-hover:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(212, 165, 116, 0.2);
}
```

#### 按鈕 Ripple 效果
```css
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn-ripple:active::after {
  width: 300px;
  height: 300px;
}
```

### Scroll Reveal（滾動顯示）

**文檔頁章節動畫**：
```css
.doc-section {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}
```

**JavaScript Intersection Observer**：
```javascript
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.doc-section').forEach(section => {
  observer.observe(section);
});
```

---

## 響應式設計

### 斷點系統

使用 Tailwind 預設斷點：

```css
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

**常用模式**：

```html
<!-- 手機單欄、平板雙欄、桌面三欄 -->
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- 手機隱藏、桌面顯示 -->
<div class="hidden md:block">

<!-- 手機顯示、桌面隱藏 -->
<div class="md:hidden">

<!-- 響應式文字大小 -->
<h1 class="text-6xl lg:text-7xl">

<!-- 響應式間距 -->
<div class="px-6 lg:px-8 py-20 lg:py-32">
```

### 手機端優化

#### 導航選單

桌面版：橫向選單
```html
<div class="hidden md:flex items-center space-x-12">
  <a href="#">連結1</a>
  <a href="#">連結2</a>
</div>
```

手機版：漢堡選單 + 折疊面板
```html
<!-- 觸發按鈕 -->
<button id="mobile-menu-btn" class="md:hidden">
  <svg>...</svg>
</button>

<!-- 折疊選單 -->
<div id="mobile-menu" class="hidden md:hidden bg-bg-light/95 backdrop-blur-sm">
  <div class="px-6 py-4 space-y-4">
    <a href="#" class="block">連結1</a>
    <a href="#" class="block">連結2</a>
  </div>
</div>
```

#### 按鈕堆疊

桌面版：橫向排列
```html
<div class="flex flex-col sm:flex-row gap-4">
  <a href="#">按鈕1</a>
  <a href="#">按鈕2</a>
</div>
```

手機版：自動改為垂直堆疊

#### Back to Top 按鈕縮小

```css
@media (max-width: 640px) {
  .back-to-top {
    bottom: 20px;
    right: 20px;
    width: 45px;
    height: 45px;
  }
}
```

### 響應式字體

```css
@media (max-width: 640px) {
  h1 {
    font-size: 3rem; /* 48px，縮小自 72px */
  }
  h2 {
    font-size: 2rem; /* 32px，縮小自 48px */
  }
}
```

---

## 互動設計

### Smooth Scrolling（平滑滾動）

**錨點連結**自動平滑滾動：

```javascript
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
```

### Sidebar Active State（側邊欄活躍狀態）

**滾動時自動高亮當前章節**：

```javascript
const sections = document.querySelectorAll('.doc-content');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

function updateActiveLink() {
  let currentSection = '';

  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    if (window.pageYOffset >= sectionTop - 150) {
      currentSection = section.getAttribute('id');
    }
  });

  sidebarLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + currentSection) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', updateActiveLink);
updateActiveLink(); // 初始執行
```

### Image Lightbox（圖片放大查看）

**觸發元素**：
```html
<img src="image.jpg" class="image-zoomable" alt="說明">
```

**CSS**：
```css
.image-zoomable {
  cursor: zoom-in;
  transition: all 0.3s ease;
}

.image-zoomable:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

/* Lightbox 容器 */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(26, 22, 18, 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  cursor: zoom-out;
}

.lightbox.active {
  opacity: 1;
  visibility: visible;
}
```

**JavaScript**：點擊圖片時插入 Lightbox 並顯示。

### 自定義滾動條

```css
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #1a1612;
}

::-webkit-scrollbar-thumb {
  background: #d4a574;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #c17d5a;
}
```

### 文字選取樣式

```css
::selection {
  background: #d4a574;
  color: #1a1612;
}
```

### Focus 樣式

```css
*:focus-visible {
  outline: 2px solid #d4a574;
  outline-offset: 2px;
}
```

---

## 最佳實踐

### 1. 色彩使用

✅ **應該做**：
- 使用預設的 6 個主要顏色變數
- 大面積使用深色背景（bg-dark、bg-light）
- 金色系作為強調色，不大面積使用
- 適當使用透明度（/10、/20 等）營造層次

❌ **不應該做**：
- 不要使用未定義的顏色（如 `#fff`、`#000`）
- 避免金色做正文文字（可讀性差）
- 避免過多彩色（除模板卡片情境色外）

### 2. 字體使用

✅ **應該做**：
- 中文標題用 `font-serif-tc`
- 中文正文用 `font-sans-tc`
- 英文關鍵字、代碼用 `font-inter`
- 保持一致的字重階層

❌ **不應該做**：
- 不要混用襯線和無襯線（除非刻意對比）
- 避免在一個元素內使用超過 2 種字體
- 不要用過輕的字重（<300）做小尺寸文字

### 3. 間距使用

✅ **應該做**：
- 使用 Tailwind 預設間距（4px 倍數）
- 保持一致的容器寬度（max-w-7xl、max-w-4xl）
- Section 間距統一為 py-20 lg:py-32
- 響應式調整間距

❌ **不應該做**：
- 避免使用任意值（如 `p-[13px]`）
- 不要每個 section 使用不同間距規則

### 4. 動畫使用

✅ **應該做**：
- 進場動畫 duration 0.6-1.2s
- Hover 動畫 duration 0.3s
- 使用 `ease-out` 或 `ease-in-out`
- 裝飾性浮動動畫用 `infinite`

❌ **不應該做**：
- 避免過快動畫（<200ms）
- 不要給所有元素加動畫（會眼花）
- 避免使用 `linear`（太生硬）

### 5. 響應式設計

✅ **應該做**：
- Mobile First：先寫手機版，再用 md:、lg: 擴展
- 確保所有互動元素在觸控螢幕上可點擊（最小 44x44px）
- 測試手機版導航選單
- 圖片使用 `loading="lazy"`

❌ **不應該做**：
- 不要只設計桌面版
- 避免過度依賴 hover（手機無 hover）
- 不要在手機版顯示過多列（最多 2 欄）

### 6. 效能優化

✅ **應該做**：
- 圖片壓縮並使用 WebP 格式
- 使用 `backdrop-blur-sm` 而非 `backdrop-blur-xl`
- 限制同時執行的動畫數量
- 使用 Intersection Observer 延遲載入

❌ **不應該做**：
- 避免大尺寸未壓縮圖片
- 不要在低階裝置上使用大量 blur 效果
- 避免全頁面同時觸發動畫

### 7. 可訪問性

✅ **應該做**：
- 所有圖片加 `alt` 屬性
- 使用語意化 HTML（`<nav>`, `<section>`, `<article>`）
- 確保足夠的對比度（WCAG AA）
- 鍵盤可操作（tab、enter）

❌ **不應該做**：
- 不要只用顏色傳達資訊
- 避免純 `<div>` 做按鈕（用 `<button>`）
- 不要移除 focus 樣式

### 8. 代碼組織

✅ **應該做**：
- 共用樣式定義在 `styles.css`
- 頁面特定樣式寫在該頁 `<style>` 內
- 使用註釋標記區塊
- Tailwind class 按順序（佈局 → 外觀 → 互動）

❌ **不應該做**：
- 避免內聯 style（除非動態計算）
- 不要重複定義相同樣式
- 避免過深的 class 巢狀

---

## 檔案結構

```
Genesis Chronicle 網站/
├── index.html              # 首頁
├── docs.html               # 使用指南頁
├── css/
│   └── styles.css          # 全域樣式
├── assets/
│   └── images/
│       └── hero.webp       # 主視覺圖
└── favicon.ico             # 網站圖示
```

---

## 技術棧

### CSS 框架
- **Tailwind CSS 3.x**（透過 CDN：`https://cdn.tailwindcss.com`）
- 內聯配置於 HTML `<script>` 標籤

### 字體來源
- **Noto Serif TC**：Google Fonts
- **Noto Sans TC**：Google Fonts
- **Inter**：Google Fonts
- **Crimson Text**：Google Fonts

### 圖示系統
- **Heroicons**：SVG 圖示（內嵌於 HTML）
- **Emoji**：用於模板卡片裝飾（👑🎭🚀🗡️）

### JavaScript
- 原生 JavaScript（無框架）
- 用於：平滑滾動、側邊欄狀態、選單切換、Scroll Reveal

---

## 維護建議

### 新增頁面時
1. 複製 `index.html` 或 `docs.html` 作為範本
2. 保持導航欄結構一致
3. 使用既有的組件樣式
4. 測試響應式表現

### 修改樣式時
1. 優先使用 Tailwind utility classes
2. 需要複用的樣式定義在 `styles.css`
3. 遵循既有的命名規則（如 `.card-hover`, `.info-box`）
4. 保持色彩系統一致性

### 效能監控
- 定期檢查 PageSpeed Insights
- 監控圖片載入時間
- 測試慢速網路環境
- 確保首屏內容快速渲染

---

## 版本歷史

- **v1.0**（2025-10-16）：初版設計文件建立

---

**本文件由 Claude（分分）協助整理，基於網站現有設計系統。**

如有疑問或需要更新，請聯繫：tznthou@gmail.com
