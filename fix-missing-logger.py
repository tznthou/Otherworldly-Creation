#!/usr/bin/env python3
import re

files = [
    ('src/renderer/src/components/AI/VisualCreation/panels/CharacterSelectionPanel.tsx', 'CharacterSelectionPanel'),
    ('src/renderer/src/hooks/illustration/useSmartPrompts.ts', 'useSmartPrompts'),
    ('src/renderer/src/hooks/useLanguage.ts', 'useLanguage'),
]

for file_path, logger_name in files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    if 'createLogger' not in content:
        # 找到第一個 import React 後插入
        content = re.sub(
            r"(import .*? from 'react';)",
            f"\\1\nimport {{ createLogger }} from '@/utils/logger';\n\nconst log = createLogger('{logger_name}');",
            content,
            count=1
        )
        
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"✅ 修復 {file_path} logger import")

print("\n🎉 修復完成！")
