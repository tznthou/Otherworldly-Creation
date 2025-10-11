#!/usr/bin/env python3
import re

# Batch 48: useI18n.ts (3 calls)
with open('src/renderer/src/hooks/useI18n.ts', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\('🌍 當前語言:', currentLanguage\);", r"log.debug('🌍 當前語言', { currentLanguage });", content)
content = re.sub(r"console\.log\('🔄 切換語言:', language\);", r"log.debug('🔄 切換語言', { language });", content)
content = re.sub(r"console\.error\('❌ 切換語言失敗:', error\);", r"log.error('❌ 切換語言失敗', error);", content)
with open('src/renderer/src/hooks/useI18n.ts', 'w') as f:
    f.write(content)
print("✅ Batch 48: useI18n.ts (3 calls)")

# Batch 49: useShortcuts.ts (2 calls)
with open('src/renderer/src/hooks/useShortcuts.ts', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\('⌨️  快捷鍵觸發:', shortcut\);", r"log.debug('⌨️  快捷鍵觸發', { shortcut });", content)
content = re.sub(r"console\.error\('❌ 快捷鍵執行失敗:', error\);", r"log.error('❌ 快捷鍵執行失敗', error);", content)
with open('src/renderer/src/hooks/useShortcuts.ts', 'w') as f:
    f.write(content)
print("✅ Batch 49: useShortcuts.ts (2 calls)")

# Batch 50: features.ts (1 call)
with open('src/renderer/src/config/features.ts', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\('🎛️  功能開關:', features\);", r"log.debug('🎛️  功能開關', features);", content)
with open('src/renderer/src/config/features.ts', 'w') as f:
    f.write(content)
print("✅ Batch 50: features.ts (1 call)")

# Batch 51: SimpleAIWritingPanel.tsx (1 call)  
with open('src/renderer/src/components/Editor/SimpleAIWritingPanel.tsx', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\('🤖 AI寫作助手:', result\);", r"log.debug('🤖 AI寫作助手', result);", content)
with open('src/renderer/src/components/Editor/SimpleAIWritingPanel.tsx', 'w') as f:
    f.write(content)
print("✅ Batch 51: SimpleAIWritingPanel.tsx (1 call)")

# Batch 52: App.tsx (1 call)
with open('src/renderer/src/App.tsx', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\('🚀 App 初始化'\);", r"log.debug('🚀 App 初始化');", content)
with open('src/renderer/src/App.tsx', 'w') as f:
    f.write(content)
print("✅ Batch 52: App.tsx (1 call)")

print("\n🎉 Batch 48-52 完成！總計 8 calls")
