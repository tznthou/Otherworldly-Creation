#!/usr/bin/env python3
import re

file_path = 'src/renderer/src/services/ai-generation/GenerationExecutor.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 模式 1: console.log(`🚀 開始生成 [${generationId}]:`, {  // 多行物件
content = re.sub(
    r"console\.log\(`🚀 開始生成 \[\$\{generationId\}\]:`, \{ // TODO:.*",
    r"log.debug(`🚀 開始生成 [${generationId}]`, {",
    content
)

# 模式 2: console.log(`✅ 生成成功 [${generationId}]: ${filteredText.length} 字符`);
content = re.sub(
    r"console\.log\(`✅ 生成成功 \[\$\{generationId\}\]: \$\{filteredText\.length\} 字符`\); // TODO:.*",
    r"log.debug(`✅ 生成成功 [${generationId}]`, { length: filteredText.length });",
    content
)

# 模式 3: console.error(`❌ 生成失敗 [${generationId}]:`, error);
content = re.sub(
    r"console\.error\(`❌ 生成失敗 \[\$\{generationId\}\]:`, error\); // TODO:.*",
    r"log.error(`❌ 生成失敗 [${generationId}]`, error);",
    content
)

# 模式 4: console.log(`⏳ 第${attempt}次重試，等待 ${delay}ms...`);
content = re.sub(
    r"console\.log\(`⏳ 第\$\{attempt\}次重試，等待 \$\{delay\}ms\.\.\.\`\); // TODO:.*",
    r"log.debug('⏳ 重試等待', { attempt, delayMs: delay });",
    content
)

# 模式 5: console.log(`🔄 重試成功 [${result.id}] - 第${attempt}次嘗試`);
content = re.sub(
    r"console\.log\(`🔄 重試成功 \[\$\{result\.id\}\] - 第\$\{attempt\}次嘗試`\); // TODO:.*",
    r"log.debug('🔄 重試成功', { resultId: result.id, attempt });",
    content
)

# 模式 6: console.log(`🚫 不可重試的錯誤: ${result.error}`);
content = re.sub(
    r"console\.log\(`🚫 不可重試的錯誤: \$\{result\.error\}`\); // TODO:.*",
    r"log.debug('🚫 不可重試的錯誤', { error: result.error });",
    content
)

# 模式 7: console.error(`💥 重試耗盡，最終失敗: ${lastError}`);
content = re.sub(
    r"console\.error\(`💥 重試耗盡，最終失敗: \$\{lastError\}`\); // TODO:.*",
    r"log.error('💥 重試耗盡，最終失敗', { error: lastError });",
    content
)

# 模式 8: console.log(`📊 開始批次生成 ${configs.length} 個版本`);
content = re.sub(
    r"console\.log\(`📊 開始批次生成 \$\{configs\.length\} 個版本`\); // TODO:.*",
    r"log.debug('📊 開始批次生成', { count: configs.length });",
    content
)

# 模式 9: console.log(`✅ 批次進度 ${i + 1}/${configs.length} - 成功`);
content = re.sub(
    r"console\.log\(`✅ 批次進度 \$\{i \+ 1\}/\$\{configs\.length\} - 成功`\); // TODO:.*",
    r"log.debug('✅ 批次進度 - 成功', { current: i + 1, total: configs.length });",
    content
)

# 模式 10: console.log(`❌ 批次進度 ${i + 1}/${configs.length} - 失敗: ${result.error}`);
content = re.sub(
    r"console\.log\(`❌ 批次進度 \$\{i \+ 1\}/\$\{configs\.length\} - 失敗: \$\{result\.error\}`\); // TODO:.*",
    r"log.debug('❌ 批次進度 - 失敗', { current: i + 1, total: configs.length, error: result.error });",
    content
)

# 模式 11: console.error(`💥 批次生成第${i + 1}項發生未捕獲錯誤:`, error);
content = re.sub(
    r"console\.error\(`💥 批次生成第\$\{i \+ 1\}項發生未捕獲錯誤:`, error\); // TODO:.*",
    r"log.error('💥 批次生成未捕獲錯誤', { index: i + 1, error });",
    content
)

# 模式 12: console.log(`📈 批次生成完成: ${successCount}成功, ${failureCount}失敗`);
content = re.sub(
    r"console\.log\(`📈 批次生成完成: \$\{successCount\}成功, \$\{failureCount\}失敗`\); // TODO:.*",
    r"log.debug('📈 批次生成完成', { successCount, failureCount });",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 處理完成：{file_path}")
print("📊 已轉換 12 個 console calls")
