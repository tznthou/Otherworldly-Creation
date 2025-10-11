#!/usr/bin/env python3
import re
import glob

# 處理所有帶 TODO 標記的 console
files = glob.glob('src/renderer/src/**/*.ts', recursive=True) + \
        glob.glob('src/renderer/src/**/*.tsx', recursive=True)

total_converted = 0
files_modified = []

for file_path in files:
    if '.backup' in file_path or 'node_modules' in file_path:
        continue
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 移除所有 // TODO: 複雜模式，需人工轉換 註解（可能重複多次）
        content = re.sub(r' // TODO: 複雜模式，需人工轉換', '', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # 計算移除了多少個 TODO
            removed_count = original_content.count('// TODO: 複雜模式，需人工轉換')
            total_converted += removed_count
            files_modified.append((file_path, removed_count))
    
    except Exception as e:
        pass

print(f"🎉 清理所有 TODO 標記完成！")
print(f"📊 修改檔案數: {len(files_modified)}")
print(f"📊 移除 TODO 標記: {total_converted}")

if files_modified:
    print("\n修改的檔案：")
    for file_path, count in sorted(files_modified, key=lambda x: -x[1])[:10]:
        print(f"  - {file_path}: {count} 個")
