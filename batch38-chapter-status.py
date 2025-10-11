#!/usr/bin/env python3
import re

file_path = 'src/renderer/src/pages/ChapterStatus/ChapterStatusPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 模式 1: console.log(`🔍 [狀態解析] 章節 ${chapter.title}:`, {  // 多行物件
content = re.sub(
    r"console\.log\(`🔍 \[狀態解析\] 章節 \$\{chapter\.title\}:`, \{ // TODO:.*",
    r"log.debug(`🔍 [狀態解析] 章節: ${chapter.title}`, {",
    content
)

# 模式 2: console.log(`🔍 [狀態解析] 章節 ${chapter.title} 無 metadata，使用 chapter.status:`, chapter.status);
content = re.sub(
    r"console\.log\(`🔍 \[狀態解析\] 章節 \$\{chapter\.title\} 無 metadata，使用 chapter\.status:`, chapter\.status\); // TODO:.*",
    r"log.debug('🔍 [狀態解析] 章節無 metadata', { title: chapter.title, status: chapter.status });",
    content
)

# 模式 3: console.log(`🔍 [狀態解析] 章節 ${chapter.title} 無狀態信息，使用預設草稿狀態`);
content = re.sub(
    r"console\.log\(`🔍 \[狀態解析\] 章節 \$\{chapter\.title\} 無狀態信息，使用預設草稿狀態`\); // TODO:.*",
    r"log.debug('🔍 [狀態解析] 章節無狀態信息', { title: chapter.title });",
    content
)

# 模式 4: console.warn(`❌ [狀態解析] 章節 ${chapter.title} metadata 解析失敗:`, error, 'Raw metadata:', chapter.metadata);
content = re.sub(
    r"console\.warn\(`❌ \[狀態解析\] 章節 \$\{chapter\.title\} metadata 解析失敗:`, error, 'Raw metadata:', chapter\.metadata\); // TODO:.*",
    r"log.warn('❌ [狀態解析] metadata 解析失敗', { title: chapter.title, error, metadata: chapter.metadata });",
    content
)

# 模式 5: console.log(`🔧 [Redux更新請求] 章節 ${chapter.title} 狀態更新:`, {  // 多行物件
content = re.sub(
    r"console\.log\(`🔧 \[Redux更新請求\] 章節 \$\{chapter\.title\} 狀態更新:`, \{ // TODO:.*",
    r"log.debug(`🔧 [Redux更新請求] 章節狀態更新: ${chapter.title}`, {",
    content
)

# 模式 6: console.log(`🔍 [驗證] 立即重新查詢章節 ${chapter.title} 數據...`);
content = re.sub(
    r"console\.log\(`🔍 \[驗證\] 立即重新查詢章節 \$\{chapter\.title\} 數據\.\.\.\`\); // TODO:.*",
    r"log.debug('🔍 [驗證] 立即重新查詢章節數據', { title: chapter.title });",
    content
)

# 模式 7: console.log(`✅ [Redux成功] 章節 ${chapter.title} 狀態已通過Redux更新為: ${newStatus}`);
content = re.sub(
    r"console\.log\(`✅ \[Redux成功\] 章節 \$\{chapter\.title\} 狀態已通過Redux更新為: \$\{newStatus\}`\); // TODO:.*",
    r"log.debug('✅ [Redux成功] 章節狀態已更新', { title: chapter.title, newStatus });",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 處理完成：{file_path}")
print("📊 已轉換 7 個 console calls")
