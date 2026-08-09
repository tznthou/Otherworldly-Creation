# 內嵌字型

EPUB 匯出時嵌入的內文字型。

> **這個目錄的授權與專案本身不同。** 專案是 MIT，此處的字型檔案是
> SIL Open Font License 1.1，兩者不可混為一談。

## 檔案

| 檔案 | 說明 |
|---|---|
| `GenesisSerifTC-Regular.ttf` | Noto Serif TC 的 Big5 子集，已 instancing 至 `wght=400` |
| `OFL.txt` | SIL Open Font License 1.1 全文 |

## 來源與版權

- 上游：<https://github.com/notofonts/noto-cjk>
- 取得位置：<https://github.com/google/fonts/tree/main/ofl/notoseriftc>（`NotoSerifTC[wght].ttf`）
- 設計：Google / Adobe
- **版權持有人：Adobe**，依字型 name table 第 0 欄（`(c) 2017-2024 Adobe`）
  與上游 `upstream_info.md` 兩處一致記載。

隨附的 `OFL.txt` 取自 Google Fonts 的發布，其頂端版權聲明行寫的是
`Copyright 2012 Google Inc.`；字型二進位內部則保留 Adobe 的原始聲明。
兩份聲明都未經改動，一併散布。

## 我們做了哪些修改

全部由 `scripts/subset-epub-font.py` 產生，該腳本帶驗收斷言，任一項不成立即失敗：

1. **Instancing** 至 `wght=400`。來源是可變字型，且 `wght` 軸預設值為 200
   （ExtraLight）——略過這一步會得到極細字重，中文內文在 e-ink 上幾乎無法閱讀。
2. **子集化**為 Big5 全集，13,702 字（Big5 字集與來源字型 cmap 的交集；
   Big5 本身有 13,706 字，來源字型缺其中 4 個符號 `ˍ‾∼≒`）。
3. **改 name table** 家族名為 `Genesis Serif TC`。

改名並非 OFL 強制：這份授權在版權聲明後未指定任何 Reserved Font Name，
條款 3) 因此無從適用。改名的理由是工程實務——子集版只含 Big5，若沿用原名，
使用者系統上已安裝的同名完整版可能被選中，造成缺字表現不一致。

## OFL 1.1 的約束與對應

- **條款 1)** 字型不得單獨販售 —— 隨應用散布，天然滿足。
- **條款 2)** 每份散布副本須附版權聲明與授權 —— repo 內有本檔與 `OFL.txt`；
  EPUB 打包時另外把 `OFL.txt` 寫進 `OEBPS/fonts/`。子集化時顯式保留字型內的
  name ID 0/13/14（版權、授權說明、授權網址），`pyftsubset` 的預設設定會丟掉後兩者。
- **條款 5)** 字型須完整以 OFL 散布、不可改授權 —— 故本目錄標明 OFL 而非專案的 MIT。

OFL 的 copyleft 不感染應用程式；條文明訂不適用於「用該字型製作的文件」，
使用者匯出的 EPUB 內容因此不受影響。

## 換字型或改字集

1. 重跑子集化腳本，用法見 `scripts/subset-epub-font.py` 開頭。
2. 產一份 EPUB 出來（`cargo test --manifest-path src-tauri/Cargo.toml -- --ignored --nocapture font_sample`
   會在系統暫存目錄產出 embedded／plain 兩份對照）。
3. 跑 `python3 scripts/verify-epub-font.py <那兩份 epub>` 確認字型在真實排版引擎下生效。

字型家族名若更動，必須同步改 `src-tauri/src/commands/epub.rs` 的
`EMBEDDED_FONT_FAMILY`：`@font-face` 與內文字型堆疊用的是同一個常數，
但腳本產出的 name table 是另一邊，兩邊對不上時字型宣告了也不會被採用——
這種失效下字型仍會正常載入，`document.fonts.check()` 也是 true，
只有比對內文的 `font-family` 才看得出來，驗證腳本第四項查的就是這個。
