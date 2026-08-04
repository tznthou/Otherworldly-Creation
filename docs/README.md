# 開發文檔

創世紀元的開發文檔索引。使用者導向的說明在專案根目錄的 [README](../README_zh_TW.md)，版本變更在 [CHANGELOG](../CHANGELOG_zh_TW.md)。

## 架構與工具

| 文件 | 內容 |
|------|------|
| [系統架構](ARCHITECTURE.md) | 資料流、Rust 後端模組、React 前端分層、AI 供應商抽象、資料庫 schema |
| [開發工具鏈](TOOLING.md) | 版本管理、程式碼統計、發布前檢查、Tauri 版本鎖定陷阱 |
| [視覺創作中心架構](architecture/VISUAL_CREATION_CENTER_ARCHITECTURE.md) | 插畫系統的元件與狀態設計 |
| [設計系統](design.md) | 色彩、字型、間距、元件、動畫、響應式規範 |
| [Keyring 實作說明](KEYRING_IMPLEMENTATION_SUMMARY.md) | API 金鑰加密儲存的實作細節 |
| [Keyring 測試](KEYRING_TEST.md) | 金鑰儲存的驗證流程 |

## 開發規範

| 文件 | 內容 |
|------|------|
| [測試指南](TESTING_GUIDE.md) | 測試架構與撰寫慣例 |
| [手動測試清單](MANUAL_TESTING_CHECKLIST.md) | 發布前的人工驗證項目 |
| [ESLint 設定指南](ESLINT_CONFIGURATION_GUIDE.md) | 完整設定說明與常見問題 |
| [ESLint 快速參考](ESLINT_QUICK_REFERENCE.md) | 問題快速診斷 |
| [程式碼行數最佳實踐](tools/程式碼行數最佳實踐規則.md) | 統計口徑的約定 |

## 部署與發布

| 文件 | 內容 |
|------|------|
| [安裝指南](deployment/INSTALLATION_GUIDE.md) | 各平台安裝方式 |
| [CI 說明](deployment/README_CI.md) | GitHub Actions 設定 |
| [Apple 簽章設定](deployment/APPLE_SIGNING_SETUP.md) | macOS 簽章流程 |
| [macOS PKG 繞過指南](deployment/MACOS_PKG_BYPASS_GUIDE.md) | quarantine 處理 |
| [發布檢查清單](RELEASE_CHECKLIST.md) | 發布前的人工確認項目 |

## 稽核與分析報告

| 文件 | 內容 |
|------|------|
| [技術債稽核](TECH_DEBT_AUDIT_2025-10-11.md) | 2025-10-11 的全面稽核，驅動了 v1.3.7 的清理 |
| [程式碼審查 2026-02-06](CODE_REVIEW_2026-02-06.md) | 電子書排版功能的審查發現 |
| [Console 使用分析](CONSOLE_ANALYSIS_REPORT.md) | logger 遷移前的呼叫點盤點 |
| [Context Engineering 指標](context-engineering-metrics.md) | 上下文處理的量測結果 |
| [電子書 P1 實作計畫](EBOOK_P1_IMPLEMENTATION_PLAN.md) | 電子書排版功能的規劃 |
| [電子書 P1 完成總結](EBOOK_P1_COMPLETION_SUMMARY.md) | 實作結果 |

## 歷史紀錄

`archive/` 存放已完成階段的紀錄，不再維護，但保留下來是有理由的：

| 文件 | 內容 |
|------|------|
| [Tauri 遷移記錄](archive/TAURI-MIGRATION.md) | 2025-07-31，五天內從 Electron 換到 Tauri 的過程 |
| [Tailwind v4 升級記錄](archive/TAILWIND_V4_UPGRADE_LOG.md) | v2.0.0 設計改版的技術基礎 |
| [Ollama 修復總結](archive/OLLAMA_FIX_SUMMARY.md) | v0.3.3–v0.4.6 那六次連線修復的結論 |
| [Context Engineering 測試報告](archive/context_engineering_test_report.md) | 系統提示與使用者上下文分離的驗證 |

## 產品與官網

| 文件 | 內容 |
|------|------|
| [官網 PRD](PRD.md) | 產品官網的需求規格、市場定位與功能規劃 |
| [網頁版快速指南](QUICK_START_GUIDE_WEB.md) | 官網用的入門說明 |

官網：<https://genesis-chronicle.zeabur.app/>

## ESLint 疑難排解

```bash
./scripts/fix-eslint.sh    # 自動修復設定問題
npm run lint               # 檢查
```

| 問題 | 處理方式 |
|------|---------|
| TypeScript 語法錯誤 | 檢查 parser 設定，見[設定指南](ESLINT_CONFIGURATION_GUIDE.md) |
| React JSX 錯誤 | 啟用 JSX 支援，見[快速參考](ESLINT_QUICK_REFERENCE.md) |
| 依賴衝突 | 重裝依賴後跑修復腳本 |

目前版本：ESLint 8.54.0、TypeScript ESLint 8.38.0、React ESLint 7.33.2。
