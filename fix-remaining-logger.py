#!/usr/bin/env python3
import re

files = [
    ('src/renderer/src/hooks/useLanguage.ts', 'useLanguage'),
    ('src/renderer/src/services/ai-generation/ProgressManager.ts', 'ProgressManager'),
]

for file_path, logger_name in files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    if 'createLogger' not in content:
        # 找到第一個 import 後插入
        lines = content.split('\n')
        import_end = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                import_end = i
        
        if import_end > 0:
            lines.insert(import_end + 1, f"import {{ createLogger }} from '@/utils/logger';")
            lines.insert(import_end + 2, f"const log = createLogger('{logger_name}');")
            lines.insert(import_end + 3, "")
            
            content = '\n'.join(lines)
            
            with open(file_path, 'w') as f:
                f.write(content)
            
            print(f"✅ 修復 {file_path}")

print("\n🎉 完成！")
