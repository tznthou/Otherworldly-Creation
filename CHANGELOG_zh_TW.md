# 更新日誌

[English](CHANGELOG.md)

創世紀元的所有版本變更都記在這裡。格式遵循 [Keep a Changelog](https://keepachangelog.com)，版本號遵循 [語意化版本](https://semver.org)。

專案在 2025-07-26 以 Electron 應用起步，三天後開始遷移到 Tauri，07-31 就把 Electron 拔乾淨了。本檔最下方那幾個 `v0.4.x` 條目，屬於那段短命的前身。

版本條目與 git tag 的對應有兩點要說明：1.0.0 與 1.0.1 當時沒有建立 tag，所以沒有發布連結。1.0.5 與 1.0.8 各自在安裝程式與 CI 出狀況的那陣子累積了好幾個中間 tag（`-beta`、`-unified`、`-powershell-fix`、`-debug`），這裡各自併成一條。

## [2.0.1] - 2025-11-05

### 新增
- 設定 → 一般裡加了明顯的 API 設定卡片，新手不用再到處翻哪裡貼金鑰
- 空白專案模板：沒有類型、沒有預設世界觀、不強迫填小說長度。有些人就是想要一張白紙
- 日誌清理功能，保留最近兩天、其餘刪除

### 變更
- 專案類型圖示改成跟產品官網一致（Heart、Bolt、實心變體），不再各走各的
- 建立專案時的小說長度改為選填

## [2.0.0] - 2025-10-17

視覺語言從宇宙科幻換成溫暖的人文調性。七個頂層頁面加上 20 多個彈窗全部重做。

### 變更
- **BREAKING：** 設計 token 改建在 Tailwind CSS v4 上。照舊版 v3 token 名稱寫的自訂樣式要跟著改
- 全站換新配色：暖金 `#d4a574`、大地橘 `#c17d5a`、木質棕 `#8b7355`
- 宇宙主題留下的藍色與紫色邊框全部轉成暖金色
- 側邊欄、設定頁、編輯器與所有彈窗，分七個階段逐頁改造

### 移除
- 整套 `cosmic` 配色，連沒有元件在用的殘留變數一起清掉

## [1.3.10] - 2025-10-14

### 修復
- 正式版資料庫初始化崩潰

## [1.3.9] - 2025-10-14

### 變更
- 依實際使用回饋做了一批使用體驗與系統層調整

## [1.3.8] - 2025-10-13

### 新增
- 完整的新手 API 設定指南：該選哪家供應商、金鑰去哪拿、各家怎麼收費

### 移除
- 誤 commit 進 repo 的臨時批次處理腳本

## [1.3.7] - 2025-10-11

技術債清理在這一版收尾。總共 54 個批次，把散落各處的 `console.*` 全部收攏到統一的 logger 服務。

### 新增
- Logger 服務，加上擋住裸 `console.*` 再長回來的 ESLint 規則
- Console 使用分析工具，這次清理就是照它產出的稽核報告在走

### 變更
- 全專案的 `console.*` 改走 logger 服務，橫跨 45 個以上檔案、約 1,000 個呼叫點

### 修復
- 自動化清理腳本捅出來的編譯與啟動問題，包括被改壞的 `import` 語句和重複的 `from` 關鍵字

## [1.3.5] - 2025-10-11

### 新增
- MIT LICENSE 檔案（在此之前專案一直沒有授權檔）

### 變更
- 調整設定預設值，讓全新安裝不用設定就能正常用

## [1.3.4] - 2025-10-10

Windows 的圖片從九月中就壞著。將近一個月的修補全部落空，最後是印出詳細的 Windows log、真的去看那條路徑，才破案。

### 修復
- Windows 圖片路徑重複副檔名。資料庫存的是 `uuid.jpg`，而 `get_temp_image_path()` 與 `get_final_image_path()` 無條件再接一次 `.jpg`，湊出 `uuid.jpg.jpg`。兩個函式現在會先檢查有沒有副檔名。macOS 與 Linux 行為不變——那邊傳進來的本來就不帶副檔名

## [1.3.3] - 2025-10-10

### 新增
- 日誌管理系統
- `Cargo.toml` 裡的版本鎖定註解，警告不要用寬鬆的 Tauri 版本範圍

### 修復
- 無效的 `COMMENT` 欄位導致 `npm install` 失敗
- Tauri `plugin-log` 的 Rust 端與 NPM 端版本對不上；所有 Tauri plugin 版本改為精確鎖定
- Release workflow 現在能處理 GitHub release 已存在的狀況

## [1.3.2] - 2025-10-10

### 新增
- GitHub Actions 建置的手動觸發選項

### 修復
- Windows 圖片顯示，改為一致使用完整路徑

## [1.3.1] - 2025-10-09

### 變更
- 僅版本號更新

## [1.3.0] - 2025-10-09

### 修復
- Pollinations 與 Gemini 的圖片載入。兩邊回傳的路徑格式不同，程式只處理了其中一種

## [1.2.10] - 2025-10-09

### 修復
- Gemini 圖片無法預覽——圖片路徑欄位在各層的命名不一致

## [1.2.9] - 2025-10-09

### 變更
- 專案檔案重組：清空根目錄，建立結構化的 `docs/` 樹

### 修復
- Windows 圖片顯示

## [1.2.8] - 2025-10-08

### 新增
- API 金鑰改存進作業系統原生的 keyring——macOS Keychain、Windows 認證管理員、Linux Secret Service。Rust、TypeScript 與命令層合計約 260 行

### 安全性
- API 金鑰不再明文躺在 `localStorage`。首次使用自動遷移，並同時寫入 keyring 與 localStorage，keyring 掛掉時能優雅降級而不是把使用者鎖在門外

### 修復
- keyring 在 CI 建置失敗，補上平台專屬 features 後解決
- Tauri 的 NPM 套件版本降級以對齊鎖定的 Rust `tauri` 版本。這個版本不匹配在找到原因前，害 CI 連續失敗九次

## [1.2.7] - 2025-09-17

### 修復
- Windows 圖片顯示相容性

## [1.2.6] - 2025-09-17

### 修復
- Windows 環境的圖片顯示

## [1.2.5] - 2025-09-16

### 變更
- 跨平台相容性處理，以及視覺創作流程的改善

## [1.2.3] - 2025-09-15

### 修復
- OpenRouter 偵測不到 Gemini 模型
- 正式版的圖片顯示

### 移除
- `debug` 資料夾及其所有測試元件

## [1.2.1] - 2025-09-13

### 變更
- 文檔全面重構

## [1.2.0] - 2025-09-13

### 新增
- Gemini 圖像生成 API 整合
- PathManager：統一的路徑管理系統，取代散在各處的路徑邏輯

### 變更
- 臨時圖片改用延遲刪除，原本的立即清理會跟還在讀取的請求打架
- TypeScript 錯誤 21 → 0，ESLint 警告 10 → 0

## [1.1.9] - 2025-09-12

一個問題卡了兩週。圖片生成系統的不穩定，用表層修補怎麼弄都弄不好。

### 變更
- 路徑系統重寫，`temp/` 與 `final/` 目錄真正分離。六個冗餘的圖片生成命令收攏進新架構
- 資料庫與檔案系統狀態改為同步，先前兩邊是各說各話
- NotificationSystem 全面整合——以前默默做完的操作，現在會回報進度與結果

### 修復
- TypeScript 錯誤 63 → 0

## [1.1.8] - 2025-09-01

### 新增
- `gemini_image_api.rs`、`provider_trait.rs`、`features.ts`
- PathManager 統一架構（首次實作，v1.1.9 再精修）

### 修復
- 57 個檔案共 63 個 TypeScript 錯誤。大宗是 `useVersionComparison.ts` 的重複函式宣告（光這支就 32 個）、版本相關 hooks 的錯誤型別處理，以及批次提交流程裡不安全的巢狀型別映射
- 錯誤處理統一成 `error instanceof Error ? error.message : String(error)`

## [1.1.7] - 2025-08-31

### 變更
- GitHub Actions timeout 延長到 45 分鐘、改善 Rust cache 設定——建置常常編到一半被砍

## [1.1.6] - 2025-08-30

核心程式碼突破十萬行。

### 新增
- 圖片收藏系統（資料庫升級至 v19）

### 變更
- 圖片路徑架構統一，開發與正式環境走同一套
- 版本號改為 `package.json`、`Cargo.toml`、`tauri.conf.json` 一起管理

### 修復
- CSP 造成的圖片顯示失敗，修正 SafeImage 元件

## [1.1.5] - 2025-08-29

### 修復
- Windows 的圖片路徑

## [1.1.4] - 2025-08-29

### 新增
- AI 插圖預覽系統——批次生成的圖片會先進圖庫讓你挑，不用再盲選盲套
- StyleResolver 模組，支援寫實、動漫、概念藝術、漫畫四種風格，附單元測試

## [1.1.3] - 2025-08-26

### 修復
- Rust 模組衝突造成的 GitHub Actions 建置失敗

## [1.1.2] - 2025-08-26

### 修復
- AI 插圖圖庫載不出來

## [1.1.0] - 2025-08-24

### 變更
- AI 續寫從一支 200 行的巨型函式拆成七個服務模組：ValidationService、ContextPreparationService、ParameterOptimizer、GenerationExecutor、ProgressManager，以及把它們串起來的 `useAIGeneration` hook
- 上下文處理針對 10 萬字以上的文件最佳化
- 依模型特性分別調參：o1 系列、Gemini Flash、GPT-4、Claude

### 新增
- 視覺創作中心，把原本散開的插畫功能收進同一個介面
- Pollinations.AI 整合，提供免費的插畫生成
- 測試基礎設施

## [1.0.9] - 2025-08-20

### 新增
- 專注寫作模式——非編輯區的元素會淡出，減少干擾

### 修復
- Windows MSI 建置，補上 `msi` 到 bundle targets

## [1.0.8] - 2025-08-19

### 新增
- 設定介面裡的 AI 參數說明
- 支援模型數量大幅擴充

### 變更
- macOS 發行改推薦 DMG，不再以 PKG 為主
- ESLint 警告 74 → 0

### 修復
- OpenRouter API 整合
- 章節筆記存不進去

## [1.0.5] - 2025-08-16

### 新增
- 角色分析介面，搭配 Recharts 圖表
- AI 插畫系統與角色整合
- 設定檔之間的版本統一管理
- macOS 雙軌安裝機制

### 修復
- PKG 安裝權限，確保所有使用者都看得到應用程式
- 批次插畫系統的 React 無限重渲染

## [1.0.4] - 2025-08-11

### 修復
- PKG 安裝程式解壓縮失敗

## [1.0.3] - 2025-08-11

### 新增
- macOS 的 PKG 安裝程式支援

### 修復
- 一連串 GitHub Actions 失敗：YAML 語法、縮排、條件表達式、棄用警告。最後是照 Tauri 官方 CI 指引把整個 workflow 重寫

## [1.0.2] - 2025-08-10

### 新增
- EPUB 3.0 生成與劇情分析引擎
- PDF 生成，支援中文字型與排版引擎
- 角色分析系統
- Intel Mac 建置支援
- GitHub Actions CI/CD

### 變更
- Context Engineering 重構，把系統提示與使用者上下文分離
- AI 供應商架構統一

### 修復
- 開發與正式環境的資料庫路徑分離——先前兩邊共用同一個檔案
- AI 續寫產出重複內容
- AI 續寫輸出夾帶思考標籤
- 所有 slice 的 Redux Date 物件唯讀錯誤

## [1.0.1] - 2025-08-09

### 新增
- 統計頁面的金色捲軸
- AI 供應商自動選擇邏輯改良

## [1.0.0] - 2025-07-31

### 變更
- **BREAKING：** Electron 完全移除。應用改為純 Tauri，Electron 時期的 IPC handler、建置腳本、打包路徑全部不復存在

### 修復
- 錯誤邊界元件引用問題（同日 hotfix）

## [0.4.14-electron-final] - 2025-07-31

掛著 Electron 名字的最後一個 tag，不過這時候開發主線早就是 Tauri 版了。

### 新增
- AI 續寫的視覺回饋
- Tauri 版的角色管理與 AI 設定
- Tauri 版的 SQLite 連接

### 變更
- 國際化系統重構

### 修復
- 擋住 Tauri 建置的 CSP 設定與資料庫 schema 問題

### 移除
- Tauri 版本裡殘留的所有 Electron API 依賴

## [0.4.12-electron-stable] - 2025-07-29

最後一個穩定的 Electron 版本。Tauri 遷移就在同一天啟動。

### 新增
- 資料管理、教學系統、幫助系統、輕小說模板、創作統計
- 自動更新系統
- 一鍵安裝與使用者文檔

### 修復
- Ollama 連線，從 v0.3.3 一路修到 v0.4.6 共六次。真正的原因是 IPC handler 重複註冊，加上 Electron 主進程的網路請求處理
- 應用啟動時卡住不動
- 編輯器重寫，補上真正的資料庫儲存

[2.0.1]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v2.0.1
[2.0.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v2.0.0
[1.3.10]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.10
[1.3.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.9
[1.3.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.8
[1.3.7]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.7
[1.3.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.5
[1.3.4]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.4
[1.3.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.3
[1.3.2]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.2
[1.3.1]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.1
[1.3.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.0
[1.2.10]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.10
[1.2.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.9
[1.2.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.8
[1.2.7]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.7
[1.2.6]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.6
[1.2.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.5
[1.2.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.3
[1.2.1]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.1
[1.2.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.0
[1.1.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.9
[1.1.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.8
[1.1.7]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.7
[1.1.6]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.6
[1.1.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.5
[1.1.4]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.4
[1.1.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.3
[1.1.2]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.2
[1.1.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.0
[1.0.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.9
[1.0.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.8
[1.0.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.5-complete
[1.0.4]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.4
[1.0.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.3
[1.0.2]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.2
[0.4.14-electron-final]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v0.4.14-electron-final
[0.4.12-electron-stable]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v0.4.12-electron-stable
