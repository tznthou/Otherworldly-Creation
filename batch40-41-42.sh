#!/bin/bash

# Batch 40: imageGenerationService.ts (6 calls)
python3 << 'PYTHON40'
import re
with open('src/renderer/src/services/imageGenerationService.ts', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\(`🎨 \[ImageGenerationService\] 開始生成插畫 \[\$\{requestId\}\]`\); // TODO:.*", r"log.debug('🎨 [ImageGenerationService] 開始生成插畫', { requestId });", content)
content = re.sub(r"console\.log\(`✨ \[ImageGenerationService\] 插畫生成成功 \[\$\{requestId\}\]: \$\{data\.imageUrl\}`\); // TODO:.*", r"log.debug('✨ [ImageGenerationService] 插畫生成成功', { requestId, imageUrl: data.imageUrl });", content)
content = re.sub(r"console\.error\(`💥 \[ImageGenerationService\] 插畫生成失敗 \[\$\{requestId\}\]:`, error\); // TODO:.*", r"log.error('💥 [ImageGenerationService] 插畫生成失敗', { requestId, error });", content)
content = re.sub(r"console\.log\(`📊 \[ImageGenerationService\] 批次生成開始: \$\{requests\.length\} 個請求`\); // TODO:.*", r"log.debug('📊 [ImageGenerationService] 批次生成開始', { count: requests.length });", content)
content = re.sub(r"console\.log\(`📈 \[ImageGenerationService\] 批次生成進度: \$\{index \+ 1\}/\$\{requests\.length\}`\); // TODO:.*", r"log.debug('📈 [ImageGenerationService] 批次生成進度', { current: index + 1, total: requests.length });", content)
content = re.sub(r"console\.log\(`🎉 \[ImageGenerationService\] 批次生成完成: \$\{results\.filter\(r => r\.success\)\.length\}/\$\{results\.length\} 成功`\); // TODO:.*", r"log.debug('🎉 [ImageGenerationService] 批次生成完成', { successCount: results.filter(r => r.success).length, total: results.length });", content)
with open('src/renderer/src/services/imageGenerationService.ts', 'w') as f:
    f.write(content)
print("✅ Batch 40 完成: imageGenerationService.ts (6 calls)")
PYTHON40

# Batch 41: i18n/index.ts (6 calls)
python3 << 'PYTHON41'
import re
with open('src/renderer/src/i18n/index.ts', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\('🌍 i18n 系統初始化', \{ language, resources: Object\.keys\(resources\) \}\); // TODO:.*", r"log.debug('🌍 i18n 系統初始化', { language, resources: Object.keys(resources) });", content)
content = re.sub(r"console\.log\('🌍 切換語言:', \{ from: i18n\.language, to: lng \}\); // TODO:.*", r"log.debug('🌍 切換語言', { from: i18n.language, to: lng });", content)
content = re.sub(r"console\.error\('❌ 切換語言失敗:', error\); // TODO:.*", r"log.error('❌ 切換語言失敗', error);", content)
content = re.sub(r"console\.log\('🔄 重新載入翻譯資源:', \{ language \}\); // TODO:.*", r"log.debug('🔄 重新載入翻譯資源', { language });", content)
content = re.sub(r"console\.error\('❌ 重新載入翻譯資源失敗:', error\); // TODO:.*", r"log.error('❌ 重新載入翻譯資源失敗', error);", content)
content = re.sub(r"console\.log\('📝 新增翻譯:', \{ language, namespace \}\); // TODO:.*", r"log.debug('📝 新增翻譯', { language, namespace });", content)
with open('src/renderer/src/i18n/index.ts', 'w') as f:
    f.write(content)
print("✅ Batch 41 完成: i18n/index.ts (6 calls)")
PYTHON41

# Batch 42: useBatchSubmission.ts (6 calls)
python3 << 'PYTHON42'
import re
with open('src/renderer/src/hooks/useBatchSubmission.ts', 'r') as f:
    content = f.read()
content = re.sub(r"console\.log\(`🚀 開始批次插畫生成：\$\{batchConfig\.batchName\}`\); // TODO:.*", r"log.debug('🚀 開始批次插畫生成', { batchName: batchConfig.batchName });", content)
content = re.sub(r"console\.log\(`🎨 批次進度：\$\{result\.processedCount\}/\$\{result\.totalCount\}`\); // TODO:.*", r"log.debug('🎨 批次進度', { processed: result.processedCount, total: result.totalCount });", content)
content = re.sub(r"console\.error\('❌ 批次生成時發生錯誤:', error\); // TODO:.*", r"log.error('❌ 批次生成時發生錯誤', error);", content)
content = re.sub(r"console\.log\('✅ 批次生成已完成\)', \{ // TODO:.*", r"log.debug('✅ 批次生成已完成', {", content)
content = re.sub(r"console\.error\('❌ 批次生成失敗:', error\); // TODO:.*", r"log.error('❌ 批次生成失敗', error);", content)
content = re.sub(r"console\.log\('🔄 批次重新整理中\.\.\.\'\); // TODO:.*", r"log.debug('🔄 批次重新整理中');", content)
with open('src/renderer/src/hooks/useBatchSubmission.ts', 'w') as f:
    f.write(content)
print("✅ Batch 42 完成: useBatchSubmission.ts (6 calls)")
PYTHON42

echo ""
echo "🎉 Batch 40-42 全部完成！"
echo "📊 累計清理：18 calls"
