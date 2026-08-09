#!/usr/bin/env python3
"""EPUB 內嵌字型子集化工具。

這是**離線手動工具**，不是建置步驟，也不在 CI 執行。
只有在「換字型」或「改字集範圍」時才需要重跑。

依賴（不在 package.json，需另外裝）:
    pip install fonttools

輸入:
    Noto Serif TC 可變字型，取自 google/fonts 的 ofl/notoseriftc/
    https://github.com/google/fonts/tree/main/ofl/notoseriftc

輸出:
    Big5 全集、wght=400 的靜態 TTF 子集，供 src-tauri 以 include_bytes! 內嵌

授權:
    來源字型為 SIL Open Font License 1.1。這份 OFL.txt 在版權聲明後
    未指定任何 Reserved Font Name，故條款 3) 不適用，改名非強制。
    本腳本仍改 name table，理由是工程實務：避免與使用者系統已安裝的
    同名完整版字型衝突（子集版只含 Big5，被選中會缺字）。

    OFL 條款 2) 要求每份副本附版權與授權，可放在機器可讀的 metadata
    欄位，故子集時顯式保留 name ID 0/13/14（版權、授權說明、授權網址），
    且 EPUB 打包時另外寫入一份 OFL.txt。

用法:
    python3 scripts/subset-epub-font.py \\
        --input  ~/Downloads/'NotoSerifTC[wght].ttf' \\
        --output src-tauri/assets/fonts/GenesisSerifTC-Regular.ttf
"""

import argparse
import sys
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools import subset
except ImportError:
    sys.exit(
        "缺少 fontTools。這個腳本是離線工具，依賴不在 package.json：\n"
        "    pip install fonttools"
    )

# 子集後的字型家族名。改這裡要同步改 epub.rs 的 @font-face font-family。
DEFAULT_FAMILY = "Genesis Serif TC"
DEFAULT_WEIGHT = 400

# 保留的 name ID：0 版權 / 1 家族 / 2 樣式 / 3 唯一 ID / 4 全名 / 5 版本
# / 6 PostScript / 13 授權說明 / 14 授權網址。
# pyftsubset 預設只留 0-6，會丟掉 13/14 這兩個授權欄位。
KEEP_NAME_IDS = [0, 1, 2, 3, 4, 5, 6, 13, 14]


def enumerate_big5():
    """枚舉 Big5 全字集。

    Big5 是變長編碼，兩個區段都要涵蓋：

    - 單位元組區沿用 ASCII。漏掉它，小說裡的半形數字、英文名詞、半形標點
      就會落到系統字型，變成內嵌明體配系統字的混排——正是內嵌字型要消除的
      東西。這 95 個字元的輪廓比漢字簡單得多，體積代價可忽略。
    - 雙位元組區高位元組 0xA1-0xF9、低位元組 0x40-0xFE，無效組合由 codec 過濾。
    """
    chars = {chr(code) for code in range(0x20, 0x7F)}

    for hi in range(0xA1, 0xFA):
        for lo in range(0x40, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("big5"))
            except UnicodeDecodeError:
                continue

    return chars


def postscript_name(family, subfamily="Regular"):
    """PostScript name 不得含空格，且限 ASCII。"""
    return f"{family.replace(' ', '')}-{subfamily.replace(' ', '')}"


def rename_font(font, family):
    """改寫 name table 的識別欄位，保留版權與授權欄位不動。"""
    name = font["name"]
    full = f"{family} Regular"
    ps = postscript_name(family)

    for record in list(name.names):
        nid = record.nameID
        if nid == 1 or nid == 16:
            value = family
        elif nid == 2 or nid == 17:
            value = "Regular"
        elif nid == 3:
            value = f"{ps};subset"
        elif nid == 4:
            value = full
        elif nid == 6:
            value = ps
        else:
            continue  # 0/5/13/14 等欄位原樣保留
        name.setName(value, nid, record.platformID, record.platEncID, record.langID)


def verify(path, expected_chars, family, weight):
    """驗收斷言。任一條不成立即視為子集化失敗。

    weight 收的是這次實際要求的字重，不是 DEFAULT_WEIGHT：拿常數來比對的話，
    `--weight 700` 會在最後一步以「預期 400」的誤導訊息失敗。
    """
    font = TTFont(path, lazy=True)
    problems = []

    tables = set(font.keys())
    for leftover in ("fvar", "gvar", "HVAR", "avar"):
        if leftover in tables:
            problems.append(f"可變字型表 {leftover} 未移除，instancing 沒生效")

    cmap = font.getBestCmap()
    got = {chr(cp) for cp in cmap}
    missing = expected_chars - got
    if missing:
        sample = "".join(sorted(missing)[:20])
        problems.append(f"子集缺 {len(missing)} 個預期字元，例如：{sample}")

    actual_family = font["name"].getDebugName(1)
    if actual_family != family:
        problems.append(f"name table 家族名為 {actual_family!r}，預期 {family!r}")

    actual_weight = font["OS/2"].usWeightClass
    if actual_weight != weight:
        problems.append(f"usWeightClass 為 {actual_weight}，預期 {weight}")

    for nid, label in ((0, "版權"), (13, "授權說明")):
        if not font["name"].getDebugName(nid):
            problems.append(f"name ID {nid}（{label}）遺失，違反 OFL 條款 2)")

    return problems, len(got), len(font.getGlyphOrder())


def main():
    parser = argparse.ArgumentParser(
        description="把 Noto Serif TC 可變字型做成 EPUB 內嵌用的 Big5 靜態子集"
    )
    parser.add_argument("--input", required=True, type=Path, help="來源可變字型 .ttf")
    parser.add_argument("--output", required=True, type=Path, help="輸出子集 .ttf")
    parser.add_argument("--family", default=DEFAULT_FAMILY, help="子集後的家族名")
    parser.add_argument(
        "--weight", type=int, default=DEFAULT_WEIGHT, help="instancing 的 wght 值"
    )
    args = parser.parse_args()

    if not args.input.is_file():
        sys.exit(f"找不到輸入字型：{args.input}")
    args.output.parent.mkdir(parents=True, exist_ok=True)

    print("[1/5] 枚舉 Big5 字集")
    big5 = enumerate_big5()
    print(f"      Big5 唯一字元：{len(big5)}")

    print(f"[2/5] 載入來源字型：{args.input.name}")
    font = TTFont(args.input)
    source_cmap = set(font.getBestCmap())
    expected = {c for c in big5 if ord(c) in source_cmap}
    uncovered = len(big5) - len(expected)
    print(f"      來源字型可映射碼點：{len(source_cmap)}")
    print(f"      Big5 ∩ 來源字型 = {len(expected)}（來源本身缺 {uncovered} 個）")
    if uncovered:
        sample = "".join(sorted(big5 - expected))
        print(f"      來源缺字（非漢字符號，將 fallback 到系統字型）：{sample}")

    is_variable = "fvar" in font
    if is_variable:
        axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in font["fvar"].axes}
        print(f"[3/5] 來源是可變字型，軸：{axes}")
        default_wght = axes.get("wght", (None, None, None))[1]
        if default_wght is not None and default_wght != args.weight:
            print(
                f"      注意：wght 軸預設值是 {default_wght:g}，"
                f"不 instancing 會得到該權重而非 Regular"
            )
        instancer.instantiateVariableFont(
            font, {"wght": args.weight}, inplace=True, updateFontNames=True
        )
        print(f"      已 instancing 至 wght={args.weight}")
    else:
        print("[3/5] 來源非可變字型，跳過 instancing")

    print(f"[4/5] 子集化並改名為 {args.family!r}")
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = KEEP_NAME_IDS
    options.notdef_outline = True
    options.recalc_bounds = True
    options.drop_tables = []

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text="".join(sorted(expected)))
    subsetter.subset(font)

    rename_font(font, args.family)
    font.save(args.output)

    print("[5/5] 驗收")
    problems, cmap_count, glyph_count = verify(
        args.output, expected, args.family, args.weight
    )
    size = args.output.stat().st_size
    print(f"      cmap 碼點：{cmap_count}    glyph：{glyph_count}")
    print(f"      檔案大小：{size:,} bytes（{size / 1024 / 1024:.2f} MB）")

    if problems:
        print("\n驗收失敗：")
        for p in problems:
            print(f"  ✗ {p}")
        sys.exit(1)

    print(f"\n完成：{args.output}")
    print(f"字型家族名 {args.family!r} 必須與 epub.rs 的 @font-face 一致。")


if __name__ == "__main__":
    main()
