# 🚀 創世紀元 - 發布安全檢查清單

## ⚠️ 發布前必讀

**此檢查清單用於確保發布版本不包含任何敏感用戶資料，是維護用戶隱私的關鍵步驟！**

## 📋 發布前檢查步驟

### 1. 自動安全檢查 🔒

```bash
# 執行安全檢查腳本
./scripts/security-check.sh
```

**必須確保所有檢查都通過** ✅

### 2. 手動檢查項目

#### 🗃️ 資料庫檔案
- [ ] 確認 `genesis-chronicle.db*` 不在專案目錄內
- [ ] 確認 `.gitignore` 已排除所有 `.db` 和 `.sqlite` 檔案
- [ ] 檢查 `git ls-files | grep -E '\.(db|sqlite)'` 回傳空結果

#### 🔑 API 金鑰與秘密
- [ ] 確認無硬編碼 API 金鑰 (OpenAI, Gemini, Claude, OpenRouter)
- [ ] 確認無 `.env` 檔案被追蹤
- [ ] 檢查 `grep -r "sk-" --include="*.ts" --include="*.tsx" src/` 無結果
- [ ] 檢查 `grep -r "gsk_" --include="*.ts" --include="*.tsx" src/` 無結果

#### 📝 用戶內容
- [ ] 確認無個人小說內容在專案中
- [ ] 確認範例內容僅為技術展示用途
- [ ] 檢查 `README.md` 中的範例不含個人創作

#### 📦 建構輸出
- [ ] 檢查 `dist/` 或 `src-tauri/target/` 不含用戶資料
- [ ] 確認打包檔案不含 `.db` 檔案
- [ ] 測試應用程式在全新系統上的初始化行為

### 3. Git 歷史檢查

```bash
# 檢查 Git 歷史中是否有敏感資料
git log --all --full-history -p | grep -i "sk-\|gsk_\|password\|secret" | head -10

# 如有問題，考慮使用 git-filter-repo 清理
```

### 4. 建構測試

```bash
# 清理並重新建構
npm run clean
npm install
npm run build

# 檢查建構輸出
ls -la dist/
ls -la src-tauri/target/release/
```

### 5. 發布環境測試

- [ ] 在乾淨的 VM 或 Docker 容器中測試
- [ ] 確認應用程式不會嘗試連接已存在的用戶資料庫
- [ ] 確認用戶首次啟動體驗正常

## 🚨 如果檢查失敗

### 發現資料庫檔案被追蹤
```bash
git rm --cached *.db *.sqlite*
git commit -m "Remove tracked database files"
```

### 發現 API 金鑰洩露
1. **立即撤銷洩露的金鑰**
2. 使用 `git-filter-repo` 從歷史中移除
3. 重新生成新的金鑰
4. 更新 `.gitignore`

### 發現用戶內容
1. 評估是否為敏感個人創作
2. 如是，則從專案中移除
3. 更新 `.gitignore` 防止再次提交

## ✅ 發布後步驟

- [ ] 驗證 GitHub Release 不含敏感資料
- [ ] 測試下載的安裝包
- [ ] 監控用戶回報是否有隱私問題
- [ ] 更新此檢查清單（如有需要）

## 🔗 相關檔案

- `.gitignore` - 安全排除設定
- `scripts/security-check.sh` - 自動檢查腳本
- `src-tauri/src/database/connection.rs` - 資料庫路徑設定
- `src-tauri/tauri.conf.json` - Tauri 建構設定

## 📞 緊急聯絡

如果發現已發布版本含有敏感資料：

1. **立即從 GitHub Releases 下架**
2. **撤銷相關 API 金鑰**
3. **發布安全公告**
4. **準備修復版本**

---

**記住：用戶隱私和資料安全永遠是第一優先！** 🔒