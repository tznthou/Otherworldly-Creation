#!/usr/bin/env python3
import re

file_path = 'src/renderer/src/hooks/illustration/useAutoVersionCreation.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 模式 1: console.warn(`找不到臨時圖片 ID: ${imageId}`);
content = re.sub(
    r"console\.warn\(`找不到臨時圖片 ID: \$\{imageId\}`\); // TODO:.*",
    r"log.warn('找不到臨時圖片 ID', { imageId });",
    content
)

# 模式 2: console.log(`✅ 自動創建版本成功：圖片 ${imageId} → 版本 ${result.versionId}`);
content = re.sub(
    r"console\.log\(`✅ 自動創建版本成功：圖片 \$\{imageId\} → 版本 \$\{result\.versionId\}`\); // TODO:.*",
    r"log.debug('✅ 自動創建版本成功', { imageId, versionId: result.versionId });",
    content
)

# 模式 3: console.error(`❌ 自動創建版本失敗：圖片 ${imageId}`, error);
content = re.sub(
    r"console\.error\(`❌ 自動創建版本失敗：圖片 \$\{imageId\}`, error\); // TODO:.*",
    r"log.error('❌ 自動創建版本失敗', { imageId, error });",
    content
)

# 模式 4: console.log(`✅ 手動創建版本成功：圖片 ${imageId} → 版本 ${result.versionId}`);
content = re.sub(
    r"console\.log\(`✅ 手動創建版本成功：圖片 \$\{imageId\} → 版本 \$\{result\.versionId\}`\); // TODO:.*",
    r"log.debug('✅ 手動創建版本成功', { imageId, versionId: result.versionId });",
    content
)

# 模式 5: console.error(`❌ 手動創建版本失敗：圖片 ${imageId}`, error);
content = re.sub(
    r"console\.error\(`❌ 手動創建版本失敗：圖片 \$\{imageId\}`, error\); // TODO:.*",
    r"log.error('❌ 手動創建版本失敗', { imageId, error });",
    content
)

# 模式 6: console.log(`🔄 開始自動處理 ${pendingVersionCreation.length} 個待創建版本...`);
content = re.sub(
    r"console\.log\(`🔄 開始自動處理 \$\{pendingVersionCreation\.length\} 個待創建版本\.\.\.\`\); // TODO:.*",
    r"log.debug('🔄 開始自動處理待創建版本', { count: pendingVersionCreation.length });",
    content
)

# 模式 7: console.log(`🎨 新圖片生成完成：${lastGeneratedImageId}，即將自動創建版本...`);
content = re.sub(
    r"console\.log\(`🎨 新圖片生成完成：\$\{lastGeneratedImageId\}，即將自動創建版本\.\.\.\`\); // TODO:.*",
    r"log.debug('🎨 新圖片生成完成', { lastGeneratedImageId });",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 處理完成：{file_path}")
print("📊 已轉換 7 個 console calls")
