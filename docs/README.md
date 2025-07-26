# 創世紀元開發文檔

本目錄包含創世紀元專案的完整開發文檔和指南。

## 📚 文檔索引

### 🔧 配置與設定
- **[ESLint 配置指南](./ESLINT_CONFIGURATION_GUIDE.md)** - 完整的 ESLint 配置文檔，包含常見問題解決方案
- **[ESLint 快速參考](./ESLINT_QUICK_REFERENCE.md)** - ESLint 問題的快速診斷和修復指南

### 🚀 開發指南
- **[CLAUDE.md](../CLAUDE.md)** - Claude Code 的專案配置和架構說明

## 🛠️ 工具腳本

### ESLint 修復工具
```bash
# 自動修復 ESLint 配置問題
./scripts/fix-eslint.sh
```

### 參考配置文件
- **[.eslintrc.reference.js](../.eslintrc.reference.js)** - ESLint 標準配置範本

## 🔍 快速問題解決

### ESLint 常見問題
| 問題 | 解決方案 | 文檔連結 |
|------|---------|----------|
| TypeScript 語法錯誤 | 檢查解析器配置 | [ESLint 指南](./ESLINT_CONFIGURATION_GUIDE.md#常見問題與解決方案) |
| React JSX 錯誤 | 啟用 JSX 支援 | [快速參考](./ESLINT_QUICK_REFERENCE.md#jsx-語法問題) |
| 依賴衝突 | 重新安裝依賴 | [修復腳本](../scripts/fix-eslint.sh) |

### 緊急修復步驟
1. 運行修復腳本：`./scripts/fix-eslint.sh`
2. 查看快速參考：[ESLint_QUICK_REFERENCE.md](./ESLINT_QUICK_REFERENCE.md)
3. 使用參考配置：`cp .eslintrc.reference.js .eslintrc.js`

## 📋 檢查清單

### 新環境設定
- [ ] 安裝 Node.js 18+
- [ ] 運行 `npm install`
- [ ] 檢查 ESLint 配置：`npm run lint`
- [ ] 如有問題，運行 `./scripts/fix-eslint.sh`

### 日常開發
- [ ] 提交前運行 `npm run lint`
- [ ] 使用 IDE 的 ESLint 整合
- [ ] 遵循專案編碼規範

### 問題排除
- [ ] 檢查 [快速參考](./ESLINT_QUICK_REFERENCE.md)
- [ ] 運行自動修復腳本
- [ ] 查看詳細配置指南

## 🔄 版本資訊

| 工具 | 版本 | 說明 |
|------|------|------|
| ESLint | 8.54.0 | 代碼檢查工具 |
| TypeScript ESLint | 6.11.0 | TypeScript 支援 |
| React ESLint | 7.33.2 | React 規則 |

## 🤝 貢獻指南

1. **修改配置前**：先閱讀 [ESLint 配置指南](./ESLINT_CONFIGURATION_GUIDE.md)
2. **測試配置**：運行 `npm run lint` 確保配置正確
3. **更新文檔**：如有新的配置或解決方案，請更新相關文檔
4. **提交變更**：確保所有配置文件都被提交

## 📞 技術支援

如果遇到文檔中未涵蓋的問題：

1. 先查看 [ESLint 官方文檔](https://eslint.org/docs/)
2. 檢查 [TypeScript ESLint 文檔](https://typescript-eslint.io/)
3. 運行自動修復腳本嘗試解決
4. 在專案中建立 Issue 記錄問題

---

**最後更新**: 2024年1月  
**維護者**: 創世紀元開發團隊