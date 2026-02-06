# 电子书排版功能 P1 实现计划

## 📋 目标概览

完成电子书排版功能的 **P1 优先级任务**：
1. **章节配置功能** (configure 标签)
2. **排版预览功能** (preview 标签)

---

## 🎯 任务 1: 章节配置功能

### 1.1 功能需求

#### 核心功能
- 显示项目的所有章节列表
- 支持将图片分配到特定章节
- 为每张图片设置在章节中的位置（开头/结尾/文中/全页等）
- 配置图片显示顺序
- 支持多张图片配置到同一章节的不同位置

#### 用户交互流程
```
1. 用户进入 EbookPreparationPanel → configure 标签
2. 左侧显示"未分配图片"区域
3. 右侧显示"章节列表"
4. 用户通过拖放方式将图片分配到章节的特定位置区域
5. 可以点击展开章节查看详细配置
6. 调整图片顺序
7. 保存配置到 Redux store
```

### 1.2 组件设计

#### 新建组件
**文件**: `src/renderer/src/components/AI/VisualCreation/EbookPreparation/components/ChapterConfigurationPanel.tsx`

**组件结构**:
```typescript
interface ChapterConfigurationPanelProps {
  selectedImages: IllustrationHistoryItem[];
  projectId: string;
}

interface ChapterImageConfig {
  chapterId: string;
  images: {
    imageId: string;
    position: EbookImagePosition;  // 章节开头、结尾、文中、全页等
    order: number;                 // 在该位置的显示顺序
    customSize?: { width: number; height: number };
    caption?: string;              // 图片说明
    altText?: string;              // 无障碍文字
  }[];
}
```

**UI 布局**:
```
┌─────────────────────────────────────────────────────────┐
│ 📊 配置统计                                             │
│ ┌───────┬───────┬───────┬───────┐                      │
│ │总图片│已分配│未分配│已配章│                           │
│ └───────┴───────┴───────┴───────┘                      │
├─────────────────────────────────────────────────────────┤
│ 💡 使用说明                                             │
├─────────────┬───────────────────────────────────────────┤
│             │                                           │
│ 🖼️ 未分配  │ 📚 章节列表                               │
│    图片     │                                           │
│  (拖动源)   │ ┌─────────────────────────────────────┐  │
│             │ │ 📖 第1章：命运的邂逅              ▼ │  │
│ ┌─────┐    │ ├─────────────────────────────────────┤  │
│ │图片1│    │ │ 📖 章节开头 | 📄 章节结尾          │  │
│ └─────┘    │ │ 🖼️ 文中插图 | 🎨 全页插图          │  │
│            │ └─────────────────────────────────────┘  │
│ ┌─────┐    │                                           │
│ │图片2│    │ ┌─────────────────────────────────────┐  │
│ └─────┘    │ │ 📖 第2章：暗流涌动              ▶ │  │
│            │ └─────────────────────────────────────┘  │
│            │                                           │
└─────────────┴───────────────────────────────────────────┘
```

### 1.3 状态管理

#### Redux State 扩展
已有的 `ebookPreparationSlice.ts` 需要确保包含：
- `chapterConfigurations: EbookChapterConfiguration[]`
- Actions: `addImageToCategory`, `removeImageFromCategory`, `addChapterConfiguration`

#### 本地状态
```typescript
const [chapterConfigs, setChapterConfigs] = useState<Record<string, ChapterImageConfig>>({});
const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
```

### 1.4 数据流

```
用户操作
   ↓
拖放交互 (onDragStart → onDrop)
   ↓
更新本地状态 (setChapterConfigs)
   ↓
【可选】保存到 Redux (dispatch updateConfig)
   ↓
【未来】保存到数据库 (API call)
```

### 1.5 实现步骤

- [x] ✅ 创建 `ChapterConfigurationPanel.tsx` 组件（已完成）
- [ ] 🔄 集成到 `EbookPreparationPanel.tsx` 的 configure 标签
- [ ] 🔄 测试拖放功能
- [ ] 🔄 测试图片顺序调整
- [ ] 🔄 实现保存配置到 Redux
- [ ] 📝 （未来）实现保存到数据库的 API

---

## 🎯 任务 2: 排版预览功能

### 2.1 功能需求

#### 2.1.1 EbookPreparationPanel 的 preview 标签

**简单预览模式** - 用于图片整理阶段的快速查看

**功能清单**:
- 显示当前选中图片的排版预览
- 支持多种设备预览 (Tablet / Phone / Kindle / Desktop)
- 简单的章节 + 图片布局预览
- 网格/边距辅助线切换

**UI 设计**:
```
┌─────────────────────────────────────────────────────────┐
│ 🎨 排版预览 (简单模式)                                  │
├─────────────────────────────────────────────────────────┤
│ 设备选择: [📱 Phone] [📱 Tablet] [📚 Kindle] [🖥️ PC] │
│ 辅助线:   [✓ 网格] [✓ 边距]                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│          ┌─────────────────────┐                       │
│          │                     │  ← 设备尺寸框架       │
│          │  📖 第1章            │                       │
│          │  ─────────────────  │                       │
│          │  [图片预览]         │                       │
│          │                     │                       │
│          │  正文内容区域...    │                       │
│          │                     │                       │
│          │  [图片预览]         │                       │
│          │                     │                       │
│          └─────────────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 2.1.2 EbookIntegrationPanel 的 preview 标签

**完整预览模式** - 用于最终电子书导出前的确认

**功能清单**:
- 完整的电子书布局预览（包含封面、目录、章节）
- 实时渲染配置好的所有图片
- 支持翻页浏览
- 显示图片说明、替代文字
- 元数据检查（图片是否缺失、尺寸是否合适）

**UI 设计**:
```
┌─────────────────────────────────────────────────────────┐
│ 👁️ 电子书预览 (完整模式)                               │
├─────────────────────────────────────────────────────────┤
│ [◀ 上一页]  第 1 / 25 页  [下一页 ▶]                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│     ┌───────────────────────────────────┐             │
│     │                                   │             │
│     │        电子书封面图               │             │
│     │                                   │             │
│     │        《创世纪编年史》           │             │
│     │                                   │             │
│     └───────────────────────────────────┘             │
│                                                         │
│     元数据检查:                                         │
│     ✅ 所有图片已配置                                   │
│     ✅ 图片尺寸符合要求                                 │
│     ⚠️  1 张图片缺少替代文字                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 组件设计

#### 2.2.1 简单预览组件

**文件**: `src/renderer/src/components/AI/VisualCreation/EbookPreparation/components/SimplePreviewPanel.tsx`

```typescript
interface SimplePreviewPanelProps {
  selectedImages: IllustrationHistoryItem[];
  chapterConfigs: Record<string, ChapterImageConfig>;
  deviceType: 'tablet' | 'phone' | 'desktop' | 'kindle';
  showGrid: boolean;
  showMargins: boolean;
}

// 设备尺寸配置
const DEVICE_DIMENSIONS = {
  phone: { width: 375, height: 667, name: 'Phone' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  kindle: { width: 600, height: 800, name: 'Kindle' },
  desktop: { width: 1024, height: 768, name: 'Desktop' }
};
```

#### 2.2.2 完整预览组件

**文件**: `src/renderer/src/components/AI/VisualCreation/EbookIntegration/components/FullEbookPreviewPanel.tsx`

```typescript
interface FullEbookPreviewPanelProps {
  projectId: string;
  exportConfig: EbookExportConfig;
  integrationData: EbookImageIntegration;
}

interface PreviewPage {
  type: 'cover' | 'toc' | 'chapter' | 'image';
  content: any;
  pageNumber: number;
}
```

### 2.3 预览渲染逻辑

#### 简单预览
```typescript
function renderSimplePreview(
  deviceType: DeviceType,
  chapterConfigs: ChapterImageConfig[],
  selectedImages: IllustrationHistoryItem[]
) {
  // 1. 获取设备尺寸
  const dimensions = DEVICE_DIMENSIONS[deviceType];

  // 2. 按章节顺序渲染
  return chapterConfigs.map(config => {
    const chapterImages = config.images
      .sort((a, b) => a.order - b.order)
      .map(imgConfig => getImageById(imgConfig.imageId));

    // 3. 根据位置类型渲染图片
    return (
      <div className="chapter-preview">
        {renderImagesByPosition(chapterImages, config)}
      </div>
    );
  });
}
```

#### 完整预览
```typescript
function generatePreviewPages(
  projectId: string,
  chapters: Chapter[],
  integrationData: EbookImageIntegration
): PreviewPage[] {
  const pages: PreviewPage[] = [];

  // 1. 封面页
  if (integrationData.globalImages.find(img => img.placement === 'cover')) {
    pages.push({ type: 'cover', content: coverImage, pageNumber: 1 });
  }

  // 2. 目录页
  pages.push({ type: 'toc', content: generateTOC(chapters), pageNumber: 2 });

  // 3. 章节页
  chapters.forEach(chapter => {
    const chapterImages = getChapterImages(chapter.id, integrationData);
    pages.push({ type: 'chapter', content: { chapter, images: chapterImages }, pageNumber: pages.length + 1 });
  });

  return pages;
}
```

### 2.4 实现步骤

#### SimplePreviewPanel
- [ ] 创建组件文件
- [ ] 实现设备尺寸切换
- [ ] 实现网格/边距辅助线
- [ ] 实现简单的章节+图片布局
- [ ] 集成到 EbookPreparationPanel

#### FullEbookPreviewPanel
- [ ] 创建组件文件
- [ ] 实现分页逻辑
- [ ] 实现页面渲染（封面、目录、章节）
- [ ] 实现元数据检查
- [ ] 实现翻页功能
- [ ] 集成到 EbookIntegrationPanel

---

## 🔌 集成计划

### 3.1 集成到 EbookPreparationPanel

**文件**: `src/renderer/src/components/AI/VisualCreation/EbookPreparation/EbookPreparationPanel.tsx`

**修改点**:
```typescript
// 导入新组件
import ChapterConfigurationPanel from './components/ChapterConfigurationPanel';
import SimplePreviewPanel from './components/SimplePreviewPanel';

// renderTabContent 方法修改
const renderTabContent = () => {
  switch (activeTab) {
    case 'organize':
      return renderOrganizeContent();  // 已有功能

    case 'configure':
      return (
        <ChapterConfigurationPanel
          selectedImages={selectedImages}
          projectId={currentProject?.id || ''}
        />
      );

    case 'preview':
      return (
        <SimplePreviewPanel
          selectedImages={selectedImages}
          chapterConfigs={chapterConfigs}
          deviceType={previewDevice}
          showGrid={showGrid}
          showMargins={showMargins}
        />
      );

    default:
      return null;
  }
};
```

### 3.2 集成到 EbookIntegrationPanel

**文件**: `src/renderer/src/components/AI/VisualCreation/EbookIntegration/EbookIntegrationPanel.tsx`

**修改点**:
```typescript
// 导入新组件
import FullEbookPreviewPanel from './components/FullEbookPreviewPanel';

// preview 标签内容修改
{selectedTab === 'preview' && (
  <FullEbookPreviewPanel
    projectId={projectId}
    exportConfig={exportConfig}
    integrationData={integrationData}
  />
)}
```

---

## 📐 技术细节

### 4.1 响应式设计

使用 Tailwind CSS 实现不同设备的预览尺寸：

```typescript
const deviceStyles = {
  phone: 'w-[375px] h-[667px]',
  tablet: 'w-[768px] h-[1024px]',
  kindle: 'w-[600px] h-[800px]',
  desktop: 'w-[1024px] h-[768px]'
};
```

### 4.2 图片位置渲染

根据 `EbookImagePosition` 枚举渲染不同位置：

```typescript
function renderImageByPosition(
  image: IllustrationHistoryItem,
  position: EbookImagePosition
) {
  const positionStyles = {
    [EbookImagePosition.ChapterHeader]: 'w-full mb-6',
    [EbookImagePosition.ChapterEnd]: 'w-full mt-6',
    [EbookImagePosition.InlineText]: 'w-2/3 mx-auto my-4',
    [EbookImagePosition.FullPage]: 'w-full h-full',
    [EbookImagePosition.SceneIllustration]: 'w-3/4 mx-auto my-6'
  };

  return (
    <div className={positionStyles[position]}>
      <SafeImage {...image} />
      {image.caption && <p className="caption">{image.caption}</p>}
    </div>
  );
}
```

### 4.3 拖放功能

使用原生 HTML5 Drag & Drop API（已在 ChapterConfigurationPanel 中实现）：

```typescript
// 拖动源
<div
  draggable
  onDragStart={() => setDraggedImageId(image.id)}
  onDragEnd={() => setDraggedImageId(null)}
>
  {image}
</div>

// 放置目标
<div
  onDragOver={(e) => e.preventDefault()}
  onDrop={() => handleDropToChapter(chapterId, position)}
>
  {dropZone}
</div>
```

---

## ✅ 验收标准

### 章节配置功能
- [ ] 能够显示项目的所有章节
- [ ] 能够拖放图片到章节的不同位置区域
- [ ] 能够调整图片在章节中的显示顺序
- [ ] 能够移除已分配的图片
- [ ] 能够查看统计信息（已分配/未分配）
- [ ] 能够保存配置（至少到本地状态）

### 简单预览功能
- [ ] 能够切换不同设备尺寸预览
- [ ] 能够显示网格/边距辅助线
- [ ] 能够按章节顺序显示图片布局
- [ ] 响应式设计正常工作

### 完整预览功能
- [ ] 能够生成完整的电子书页面序列
- [ ] 能够翻页浏览
- [ ] 能够显示封面、目录、章节内容
- [ ] 能够显示元数据检查结果
- [ ] 图片位置和说明正确显示

---

## 📅 开发时间估算

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| ChapterConfigurationPanel 创建 | ✅ 已完成 | P1 |
| ChapterConfigurationPanel 集成测试 | 30分钟 | P1 |
| SimplePreviewPanel 创建 | 2小时 | P1 |
| SimplePreviewPanel 集成测试 | 30分钟 | P1 |
| FullEbookPreviewPanel 创建 | 3小时 | P1 |
| FullEbookPreviewPanel 集成测试 | 1小时 | P1 |
| 整体功能测试与修复 | 1小时 | P1 |
| **总计** | **约 8 小时** | - |

---

## 🚀 后续优化方向 (P2)

1. **章节配置增强**
   - 批量分配图片到多个章节
   - 复制章节配置到其他章节
   - 章节配置模板系统

2. **预览功能增强**
   - 导出预览为 HTML
   - 分享预览链接
   - 实时编辑模式（在预览中直接调整图片位置）

3. **性能优化**
   - 虚拟滚动（章节列表很长时）
   - 图片懒加载优化
   - 预览渲染缓存

4. **用户体验优化**
   - 撤销/重做功能
   - 快捷键支持
   - 拖放动画优化
   - 提示和引导系统

---

## 📝 注意事项

1. **保持架构独立性**
   - 不影响现有 EPUB/PDF 导出系统
   - 作为预处理工具存在

2. **数据持久化**
   - 当前优先实现 Redux 状态管理
   - 数据库保存留待 P0 任务完成后实现

3. **测试覆盖**
   - 每个组件完成后进行基本功能测试
   - 确保拖放功能在不同浏览器中正常工作
   - 验证响应式布局

4. **代码质量**
   - 遵循项目现有代码风格
   - 适当添加 logger 记录
   - 类型定义完整

---

## 📚 相关文档

- 类型定义: `src/renderer/src/types/ebookPreparation.ts`
- Redux Store: `src/renderer/src/store/slices/ebookPreparationSlice.ts`
- 主面板: `src/renderer/src/components/AI/VisualCreation/EbookPreparation/EbookPreparationPanel.tsx`
- 整合面板: `src/renderer/src/components/AI/VisualCreation/EbookIntegration/EbookIntegrationPanel.tsx`

---

**文档版本**: v1.0
**创建日期**: 2025-01-06
**最后更新**: 2025-01-06
