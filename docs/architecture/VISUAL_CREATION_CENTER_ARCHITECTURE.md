# Visual Creation Center 重構架構設計

## 🎯 核心設計理念

### 統一化 (Unification)
- 將分散的插畫功能整合到單一 **VisualCreationCenter** 介面
- 保持現有 modal 系統的向後兼容性
- 統一的供應商管理和切換機制

### 模組化 (Modularity) 
- 功能分解為獨立的子組件，便於維護和擴展
- 清晰的關注點分離 (Separation of Concerns)
- 可插拔的供應商架構

### 漸進式 (Progressive)
- Phase 1: 基礎整合 → Phase 2: 智能功能 → Phase 3: 高級功能
- 每個階段都有可交付的成果
- 保持應用穩定性

---

## 🏗️ 組件架構設計

### 主要組件層次結構

```
VisualCreationCenter.tsx (主容器)
├── ProviderSelector.tsx (供應商選擇)
├── CreationTabs.tsx (標籤頁管理)
│   ├── CreateTab/ (創建面板)
│   │   ├── CharacterSelector.tsx (角色選擇)
│   │   ├── SceneBuilder.tsx (場景構建)
│   │   └── GenerationControls.tsx (生成控制)
│   ├── MonitorTab/ (監控面板)
│   │   ├── BatchProgress.tsx (批次進度)
│   │   └── TaskDetails.tsx (任務詳情)
│   └── GalleryTab/ (圖庫面板)
│       ├── ImageGrid.tsx (圖像網格)
│       └── FilterControls.tsx (篩選控制)
└── SharedComponents/ (共用組件)
    ├── ImagePreview/ (圖像預覽)
    └── ProgressIndicators/ (進度指示器)
```

### Redux 狀態管理設計

```typescript
interface VisualCreationState {
  // 供應商管理
  currentProvider: 'pollinations' | 'imagen';
  providerConfigs: {
    pollinations: PollinationsConfig;
    imagen: ImagenConfig;
  };
  
  // 創建狀態
  activeTab: 'create' | 'monitor' | 'gallery';
  selectedCharacters: string[];
  sceneType: 'portrait' | 'scene' | 'interaction';
  
  // 生成管理
  generationQueue: GenerationTask[];
  activeGeneration: GenerationTask | null;
  tempImages: TempImageData[];
  
  // 預覽系統
  showImagePreview: boolean;
  selectedImages: Set<string>;
  
  // 歷史和管理
  generationHistory: GenerationRecord[];
  activeBatches: BatchStatusReport[];
  
  // UI 狀態
  isProcessing: boolean;
  error: string | null;
}
```

---

## 🔄 整合策略

### 1. 向後兼容性保持
```typescript
// 現有的 modal 觸發方式繼續工作
dispatch(openModal('aiIllustration')); // → 重定向到 VisualCreationCenter

// AiIllustrationModal.tsx 更新為：
<VisualCreationCenter />
```

### 2. 功能遷移計劃
- **Step 1**: 將 BatchIllustrationPanel 的核心功能提取到新架構
- **Step 2**: 保持 ImagePreviewModal 系統完整性
- **Step 3**: 更新導航入口點
- **Step 4**: 增強和擴展功能

### 3. API 層保持不變
- 現有的 `api.illustration.*` 調用保持穩定
- 在新架構中重用所有現有 API 功能
- 添加新的便利方法而不破壞現有介面

---

## 🎨 用戶體驗設計

### 導航流程
```
用戶入口點 (Sidebar/Dashboard)
    ↓
VisualCreationCenter 主介面
    ↓
功能分頁 (Create/Monitor/Gallery)
    ↓
具體功能操作
    ↓
結果展示和管理
```

### 視覺一致性
- 保持 Genesis Chronicle 的金色主題和宇宙風格
- 使用現有的設計系統 (cosmic-*, gold-*, 漸層等)
- 響應式設計，適配不同螢幕尺寸

### 互動體驗
- 直觀的拖拽操作
- 清晰的狀態指示
- 友善的錯誤處理和恢復建議
- 鍵盤快捷鍵支援

---

## 📊 狀態管理詳細設計

### Actions (Redux Toolkit)
```typescript
const visualCreationSlice = createSlice({
  name: 'visualCreation',
  initialState,
  reducers: {
    // 供應商管理
    setCurrentProvider: (state, action) => {},
    updateProviderConfig: (state, action) => {},
    
    // 創建流程
    setActiveTab: (state, action) => {},
    selectCharacters: (state, action) => {},
    addGenerationRequest: (state, action) => {},
    
    // 生成管理
    startGeneration: (state, action) => {},
    updateGenerationProgress: (state, action) => {},
    completeGeneration: (state, action) => {},
    
    // 預覽系統
    showImagePreview: (state, action) => {},
    selectImages: (state, action) => {},
    confirmImageSave: (state, action) => {},
    
    // 錯誤處理
    setError: (state, action) => {},
    clearError: (state) => {}
  }
});
```

### Async Actions (Thunks)
```typescript
// 統一的生成介面
export const generateIllustration = createAsyncThunk(
  'visualCreation/generateIllustration',
  async (params: GenerationParams, { getState, dispatch }) => {
    const { visualCreation } = getState() as RootState;
    const provider = visualCreation.currentProvider;
    
    // 根據供應商選擇適當的 API
    if (provider === 'pollinations') {
      return api.illustration.generateFreeIllustrationToTemp(params);
    } else {
      return api.illustration.generateIllustration(params);
    }
  }
);
```

---

## 🔧 技術實現細節

### 供應商抽象化
```typescript
interface IllustrationProvider {
  id: 'pollinations' | 'imagen';
  name: string;
  description: string;
  isFree: boolean;
  capabilities: string[];
  generate: (params: GenerationParams) => Promise<GenerationResult>;
  validateConfig: (config: any) => boolean;
}

class ProviderManager {
  private providers: Map<string, IllustrationProvider>;
  
  async generate(params: GenerationParams): Promise<GenerationResult> {
    const provider = this.getCurrentProvider();
    try {
      return await provider.generate(params);
    } catch (error) {
      // 自動降級邏輯
      if (provider.id === 'imagen' && this.canFallback()) {
        return await this.fallbackToFree(params);
      }
      throw error;
    }
  }
}
```

### 錯誤處理和恢復
```typescript
class ErrorRecoveryManager {
  handleGenerationError(error: Error, context: GenerationContext) {
    // 分析錯誤類型
    if (error.message.includes('billing')) {
      // 計費錯誤 → 建議使用免費服務
      return {
        type: 'billing_required',
        suggestion: 'switch_to_free',
        autoAction: 'fallback_to_pollinations'
      };
    }
    
    if (error.message.includes('rate_limit')) {
      // 速率限制 → 建議稍後重試
      return {
        type: 'rate_limit',
        suggestion: 'retry_later',
        autoAction: 'queue_for_retry'
      };
    }
    
    // 其他錯誤的處理邏輯...
  }
}
```

---

## 📈 性能優化策略

### 圖像管理
- **懶加載**: 只在需要時載入圖像
- **虛擬滾動**: 處理大量圖像時的性能優化
- **縮圖快取**: 加速預覽載入
- **漸進式載入**: 先顯示低解析度，再載入高解析度

### 狀態管理優化
- **選擇性訂閱**: 組件只訂閱相關狀態切片
- **記憶化**: 使用 `useMemo` 和 `useCallback` 防止不必要的重渲染
- **批次更新**: 合併多個狀態更新以減少渲染次數

---

## 🚀 實現里程碑

### Phase 1A: 基礎架構 (優先實現)
- [x] ✅ 程式碼結構分析完成
- [ ] 🔄 創建 VisualCreationCenter.tsx 主框架
- [ ] 📋 實現 Redux visualCreation slice
- [ ] 🎛️ 基礎 ProviderSelector 組件

### Phase 1B: 功能遷移
- [ ] 🔄 整合 BatchIllustrationPanel 功能
- [ ] 🖼️ 保持 ImagePreviewModal 系統
- [ ] 🧭 更新導航入口點
- [ ] 🎯 角色選擇功能整合

### Phase 1C: 測試和優化
- [ ] 🧪 全面功能測試
- [ ] ⚡ 性能優化
- [ ] 🎨 UI/UX 改進

---

## 💡 未來擴展規劃

### Phase 2: 智能功能
- 角色一致性視覺化儀表板
- 場景分析和智能建議
- 批次處理流程優化

### Phase 3: 高級功能
- AI 驅動的內容分析
- 跨章節一致性追蹤
- 高級匯出選項

---

## 🎯 成功指標

- **功能完整性**: 所有現有功能在新架構中正常工作
- **用戶體驗**: 操作流程更加直觀和高效
- **可維護性**: 程式碼結構清晰，便於後續擴展
- **性能**: 載入和操作響應時間保持或改善
- **穩定性**: 無回歸錯誤，錯誤處理完善

---

**📝 備註**: 此架構設計以漸進式重構為核心，確保每個階段都有可交付的成果，同時為未來的功能擴展奠定堅實基礎。