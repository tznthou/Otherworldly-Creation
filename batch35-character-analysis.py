#!/usr/bin/env python3
import re

file_path = 'src/renderer/src/services/characterAnalysisService.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 模式 1: console.error('💥 [對話分析] 錯誤詳情:', error instanceof Error ? error.stack : String(error));
content = re.sub(
    r"console\.error\('💥 \[對話分析\] 錯誤詳情:', error instanceof Error \? error\.stack : String\(error\)\); // TODO:.*",
    r"log.error('💥 [對話分析] 錯誤詳情', { errorStack: error instanceof Error ? error.stack : String(error) });",
    content
)

# 模式 2: console.log(`🎭 [角色分析] 開始分析角色 ${characterId} 在章節 ${chapterId}`);
content = re.sub(
    r"console\.log\(`🎭 \[角色分析\] 開始分析角色 \$\{characterId\} 在章節 \$\{chapterId\}`\); // TODO:.*",
    r"log.debug('🎭 [角色分析] 開始分析角色', { characterId, chapterId });",
    content
)

# 模式 3: console.log(`📖 [角色分析] 章節載入成功: ${chapter.title || chapterId}`);
content = re.sub(
    r"console\.log\(`📖 \[角色分析\] 章節載入成功: \$\{chapter\.title \|\| chapterId\}`\); // TODO:.*",
    r"log.debug('📖 [角色分析] 章節載入成功', { title: chapter.title || chapterId });",
    content
)

# 模式 4: console.log(`👤 [角色分析] 角色載入成功: ${character.name}`);
content = re.sub(
    r"console\.log\(`👤 \[角色分析\] 角色載入成功: \$\{character\.name\}`\); // TODO:.*",
    r"log.debug('👤 [角色分析] 角色載入成功', { name: character.name });",
    content
)

# 模式 5: console.log(`💬 [角色分析] ${character.name} 的確定對話數:`, characterDialogues.length);
content = re.sub(
    r"console\.log\(`💬 \[角色分析\] \$\{character\.name\} 的確定對話數:`, characterDialogues\.length\); // TODO:.*",
    r"log.debug('💬 [角色分析] 確定對話數', { name: character.name, count: characterDialogues.length });",
    content
)

# 模式 6: console.log(`🔮 [角色分析] ${character.name} 的推斷對話數:`, possibleDialogues.length);
content = re.sub(
    r"console\.log\(`🔮 \[角色分析\] \$\{character\.name\} 的推斷對話數:`, possibleDialogues\.length\); // TODO:.*",
    r"log.debug('🔮 [角色分析] 推斷對話數', { name: character.name, count: possibleDialogues.length });",
    content
)

# 模式 7: console.log(`📈 [角色分析] ${character.name} 的總對話數:`, allDialogues.length);
content = re.sub(
    r"console\.log\(`📈 \[角色分析\] \$\{character\.name\} 的總對話數:`, allDialogues\.length\); // TODO:.*",
    r"log.debug('📈 [角色分析] 總對話數', { name: character.name, count: allDialogues.length });",
    content
)

# 模式 8: console.log(`✅ [角色分析] 基礎分析完成，置信度: ${(basicResult.confidence * 100).toFixed(1)}%`);
content = re.sub(
    r"console\.log\(`✅ \[角色分析\] 基礎分析完成，置信度: \$\{\(basicResult\.confidence \* 100\)\.toFixed\(1\)\}%`\); // TODO:.*",
    r"log.debug('✅ [角色分析] 基礎分析完成', { confidence: `${(basicResult.confidence * 100).toFixed(1)}%` });",
    content
)

# 模式 9: console.log(`🎯 [角色分析] ${character.name} 分析完成:`, { 對話數: ...
content = re.sub(
    r"console\.log\(`🎯 \[角色分析\] \$\{character\.name\} 分析完成:`, \{ // TODO:.*",
    r"log.debug(`🎯 [角色分析] 分析完成: ${character.name}`, {",
    content
)

# 模式 10: console.error('💥 [角色分析] 錯誤堆棧:', error instanceof Error ? error.stack : String(error));
content = re.sub(
    r"console\.error\('💥 \[角色分析\] 錯誤堆棧:', error instanceof Error \? error\.stack : String\(error\)\); // TODO:.*",
    r"log.error('💥 [角色分析] 錯誤堆棧', { errorStack: error instanceof Error ? error.stack : String(error) });",
    content
)

# 模式 11: console.log(`🎭 [專案角色分析] 開始分析角色: ${character.name}`);
content = re.sub(
    r"console\.log\(`🎭 \[專案角色分析\] 開始分析角色: \$\{character\.name\}`\); // TODO:.*",
    r"log.debug('🎭 [專案角色分析] 開始分析角色', { name: character.name });",
    content
)

# 模式 12: console.log(`  📖 分析章節: ${chapter.title || chapter.id}`);
content = re.sub(
    r"console\.log\(`  📖 分析章節: \$\{chapter\.title \|\| chapter\.id\}`\); // TODO:.*",
    r"log.debug('  📖 分析章節', { title: chapter.title || chapter.id });",
    content
)

# 模式 13: console.log(`  ✅ 分析成功，對話數: ${analysis.dialogueCount}, 置信度: ${(analysis.confidence * 100).toFixed(1)}%`);
content = re.sub(
    r"console\.log\(`  ✅ 分析成功，對話數: \$\{analysis\.dialogueCount\}, 置信度: \$\{\(analysis\.confidence \* 100\)\.toFixed\(1\)\}%`\); // TODO:.*",
    r"log.debug('  ✅ 分析成功', { dialogueCount: analysis.dialogueCount, confidence: `${(analysis.confidence * 100).toFixed(1)}%` });",
    content
)

# 模式 14: console.log(`🎯 [專案角色分析] 完成分析，總結果數: ${characterAnalyses.length}`);
content = re.sub(
    r"console\.log\(`🎯 \[專案角色分析\] 完成分析，總結果數: \$\{characterAnalyses\.length\}`\); // TODO:.*",
    r"log.debug('🎯 [專案角色分析] 完成分析', { totalResults: characterAnalyses.length });",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 處理完成：{file_path}")
print("📊 已轉換 14 個 console calls")
