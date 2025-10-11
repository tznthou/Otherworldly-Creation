#!/usr/bin/env python3
import re

# Fix 1: ProjectGrid.tsx - 缺少 logger import
with open('src/renderer/src/pages/Dashboard/ProjectGrid.tsx', 'r') as f:
    content = f.read()

# 檢查是否已經有 logger import
if 'createLogger' not in content:
    # 找到第一個 import 行後插入
    content = re.sub(
        r"(import React.*?from 'react';)",
        r"\1\nimport { createLogger } from '@/utils/logger';\n\nconst log = createLogger('ProjectGrid');",
        content
    )

with open('src/renderer/src/pages/Dashboard/ProjectGrid.tsx', 'w') as f:
    f.write(content)
print("✅ 修復 ProjectGrid.tsx logger import")

# Fix 2: CharacterSelector.tsx - 多參數問題 (line 37)
with open('src/renderer/src/components/AI/VisualCreation/CreateTab/CharacterSelector.tsx', 'r') as f:
    lines = f.readlines()

# 找到第 37 行
for i, line in enumerate(lines):
    if i == 36 and 'log.debug' in line:  # Line 37 是 index 36
        # 看看這一行是什麼
        print(f"原始第37行: {line.strip()}")
        # 如果是多參數，需要包成物件
        if line.count(',') >= 2:
            print("檢測到多參數 log 調用，需要手動檢查")
            break

print("✅ CharacterSelector.tsx 需要手動檢查")
