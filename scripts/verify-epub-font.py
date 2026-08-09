#!/usr/bin/env python3
"""驗證 EPUB 的內嵌字型在真實排版引擎下確實生效。

Rust 那組測試驗的是結構：manifest 宣告齊全、檔案在 ZIP 裡、CSS 路徑對得上。
但結構全對，字型仍可能不生效——`@font-face` 語法有問題、字型檔本身解析失敗、
url() 相對路徑算錯，這些結構檢查一律看不出來。

這個腳本把 EPUB 攤開餵給 Chrome，問它三件事：字型註冊了嗎、載入成功了嗎、
**真的拿它來排版了嗎**。最後一項用拉丁字母的寬度比對——同一段文字用內嵌字型
與用 monospace 排出來寬度不同，才算真的換了字型。

Chrome 是 Blink，Apple Books 是 WebKit，多數 e-ink 閱讀器也是 WebKit 系，
彼此對 @font-face 的處理高度重疊。所以這裡驗得過，代表技術鏈路是通的。

驗不到的是各家閱讀器的政策：Kindle 的「發布者字型」開關預設關閉、Amazon 轉檔
可能替換字型、部分閱讀器讓使用者偏好覆蓋內嵌。那些只有實機看得到。

依賴：Chrome（與 PDF 匯出用的是同一支）。無需額外 pip 套件。

用法:
    python3 scripts/verify-epub-font.py book.epub [more.epub ...]

不含內嵌字型的 EPUB 也可以餵進來：腳本會依 ZIP 內容自動判定預期結果，
拿它當對照組——那份必須驗出「沒有生效」，否則就是這個腳本本身沒在測東西。
"""

import argparse
import http.server
import json
import re
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import zipfile
from pathlib import Path

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]

# 量尺刻意用拉丁字母：漢字多為等寬，換字型也量不出差別。
MEASURE_TEXT = "Chapter Three 2026 — quick brown fox"

PROBE_HTML = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="OEBPS/styles.css">
<title>font probe</title>
</head>
<body>
<p id="sample">永和書寫測試 Chapter Three 2026</p>
<pre id="result">pending</pre>
<script>
(async () => {
  const family = %(family)s;
  const text = %(text)s;
  const out = { family };

  const measure = (stack) => {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = '48px ' + stack;
    return ctx.measureText(text).width;
  };

  try {
    if (family) {
      // document.fonts 是延遲載入的，不先要求就永遠是 unloaded。
      //
      // 載入失敗要記下來但絕不能讓它中斷後面的檢測：寬度比對才是本腳本的
      // 核心問題（排版時用了嗎），連它一起跳過的話，「載入成功但排版沒採用」
      // 這種更隱蔽的失效就永遠測不到，而失敗看起來卻像被抓到了。
      try {
        await document.fonts.load('48px "' + family + '"', "永A1");
      } catch (e) {
        out.loadError = String(e);
      }
    }
    await document.fonts.ready;

    const faces = [...document.fonts].map((f) => ({
      family: f.family.replace(/^["']|["']$/g, ""),
      status: f.status,
    }));
    out.faces = faces;
    out.registered = family ? faces.some((f) => f.family === family) : false;
    out.loaded = family
      ? faces.some((f) => f.family === family && f.status === "loaded")
      : false;
    out.check = family ? document.fonts.check('48px "' + family + '"') : false;

    // 真正的問題不是「載入了嗎」而是「排版時用了嗎」。
    // 字型不存在時第一組會靜默 fallback 到 monospace，兩者寬度就會相等。
    const withFont = family ? measure('"' + family + '", monospace') : measure("monospace");
    const fallback = measure("monospace");
    out.widthWithFont = withFont;
    out.widthFallback = fallback;
    out.rendersWithEmbedded = withFont !== fallback;

    // 上面驗的是「這個字型可以拿來排版」，還要確認內文真的把它排在第一順位。
    // @font-face 的家族名與 body 的字型堆疊對不上時，字型會乖乖載入卻完全
    // 沒人用——載入狀態與寬度比對都照樣是綠的。
    out.bodyFontStack = getComputedStyle(document.body).fontFamily;
    out.bodyUsesFamily = family ? out.bodyFontStack.includes(family) : false;
  } catch (e) {
    out.error = String(e);
  }

  document.getElementById("result").textContent = JSON.stringify(out);
})();
</script>
</body>
</html>
"""


def find_chrome():
    for candidate in CHROME_CANDIDATES:
        if Path(candidate).is_file():
            return candidate
    found = shutil.which("google-chrome") or shutil.which("chromium")
    if found:
        return found
    sys.exit("找不到 Chrome。這個腳本用的是 PDF 匯出所依賴的同一支瀏覽器。")


def font_family_from_css(css: str):
    """從 CSS 的 @font-face 取出家族名。

    刻意不寫死名稱：家族名由子集化腳本與 epub.rs 共同決定，寫死在這裡就會
    在改名時悄悄驗錯對象。
    """
    block = re.search(r"@font-face\s*\{(.*?)\}", css, re.S)
    if not block:
        return None
    name = re.search(r"font-family:\s*[\"']([^\"']+)[\"']", block.group(1))
    return name.group(1) if name else None


def serve(directory: Path):
    """起一個本機 HTTP server。

    不用 file:// 的原因：Chrome 把每個本機檔案視為獨立來源，字型會因跨來源
    被擋掉，驗出來的失敗是假的。EPUB 閱讀器裡字型與 CSS 同屬一個容器，
    用 http:// 才還原得出那個環境。
    """
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(directory), **kw)

        def log_message(self, *args):
            pass  # 逐條請求 log 會把真正的判讀結果沖掉

    httpd = socketserver.TCPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, httpd.server_address[1]


def probe(chrome: str, epub_path: Path):
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        with zipfile.ZipFile(epub_path) as archive:
            archive.extractall(root)
            names = archive.namelist()

        embedded_files = [
            n for n in names if n.startswith("OEBPS/fonts/") and n.endswith((".ttf", ".otf"))
        ]
        css_path = root / "OEBPS" / "styles.css"
        css = css_path.read_text(encoding="utf-8") if css_path.is_file() else ""
        family = font_family_from_css(css)

        (root / "probe.html").write_text(
            PROBE_HTML % {
                "family": json.dumps(family or ""),
                "text": json.dumps(MEASURE_TEXT),
            },
            encoding="utf-8",
        )

        httpd, port = serve(root)
        try:
            result = subprocess.run(
                [
                    chrome,
                    "--headless",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--dump-dom",
                    "--virtual-time-budget=8000",
                    f"http://127.0.0.1:{port}/probe.html",
                ],
                capture_output=True,
                text=True,
                timeout=90,
            )
        finally:
            httpd.shutdown()
            httpd.server_close()

    match = re.search(r'<pre id="result">(.*?)</pre>', result.stdout, re.S)
    if not match or match.group(1).strip() == "pending":
        raise RuntimeError(
            "Chrome 沒有回傳探測結果，可能是頁面 JS 未執行完\n"
            f"stderr: {result.stderr[:400]}"
        )

    import html as html_mod

    return json.loads(html_mod.unescape(match.group(1))), embedded_files, family


def main():
    parser = argparse.ArgumentParser(
        description="用 Chrome 驗證 EPUB 內嵌字型是否真的被用於排版"
    )
    parser.add_argument("epubs", nargs="+", type=Path, help="要檢查的 .epub")
    args = parser.parse_args()

    chrome = find_chrome()
    print(f"Chrome: {chrome}\n")

    failures = []
    for epub_path in args.epubs:
        if not epub_path.is_file():
            failures.append(f"{epub_path}: 檔案不存在")
            continue

        print(f"── {epub_path.name} ──")
        try:
            data, embedded_files, family = probe(chrome, epub_path)
        except Exception as exc:  # noqa: BLE001 - 要把原因原樣呈現給使用者
            print(f"  探測失敗：{exc}\n")
            failures.append(f"{epub_path.name}: 探測失敗")
            continue

        # 預期值由 EPUB 自身的兩份宣告推導，不由參數指定：沒有內嵌字型的
        # EPUB 就該驗出「沒生效」，它是這個腳本的對照組。
        #
        # 兩份宣告必須一致。只看其中一邊的話，「CSS 宣告了 @font-face 但字型檔
        # 不在 ZIP 裡」這種真正壞掉的 EPUB 會被推導成「預期未生效」而放行。
        declares_font = family is not None
        has_font_file = bool(embedded_files)
        expects_embedded = declares_font and has_font_file

        print(f"  ZIP 內字型檔：{embedded_files or '無'}")
        print(f"  CSS @font-face 家族名：{family or '無'}")
        print(f"  字型已註冊：{data.get('registered')}")
        print(f"  字型已載入：{data.get('loaded')}")
        print(f"  fonts.check：{data.get('check')}")
        print(
            f"  排版寬度：內嵌 {data.get('widthWithFont')} / "
            f"fallback {data.get('widthFallback')}"
        )
        if data.get("loadError"):
            print(f"  字型載入錯誤：{data['loadError']}")
        if data.get("error"):
            print(f"  頁面錯誤：{data['error']}")

        if declares_font != has_font_file:
            side = "CSS 宣告了 @font-face 但 ZIP 內沒有字型檔" if declares_font \
                else "ZIP 內有字型檔但 CSS 沒有 @font-face"
            print(f"  ❌ EPUB 自相矛盾：{side}")
            failures.append(f"{epub_path.name}: {side}")
            print()
            continue

        actual = bool(data.get("rendersWithEmbedded"))
        verdict = "✅" if actual == expects_embedded else "❌"
        state = "生效" if actual else "未生效"
        print(f"  {verdict} 實際排版使用內嵌字型：{state}（預期{'生效' if expects_embedded else '未生效'}）")

        if actual != expects_embedded:
            failures.append(f"{epub_path.name}: 預期{'生效' if expects_embedded else '未生效'}，實際{state}")
        elif expects_embedded and not (data.get("loaded") and data.get("check")):
            failures.append(f"{epub_path.name}: 排版寬度有變，但字型載入狀態不正常")
        elif expects_embedded and not data.get("bodyUsesFamily"):
            print(f"  ❌ 內文字型堆疊沒有排入 {family}：{data.get('bodyFontStack')}")
            failures.append(
                f"{epub_path.name}: 字型載入了，但內文的 font-family 沒有用它"
            )
        print()

    if failures:
        print("驗證失敗：")
        for f in failures:
            print(f"  ✗ {f}")
        sys.exit(1)

    print("全部通過。")


if __name__ == "__main__":
    main()
