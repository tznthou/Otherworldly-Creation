#!/usr/bin/env python3
import re

file_path = 'src/renderer/src/services/imageCompressionService.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 模式 1: console.log(`🔄 [ImageCompressionService] 開始壓縮圖片: ${quality.format}, 品質: ${quality.quality}`);
content = re.sub(
    r"console\.log\(`🔄 \[ImageCompressionService\] 開始壓縮圖片: \$\{quality\.format\}, 品質: \$\{quality\.quality\}`\); // TODO:.*",
    r"log.debug('🔄 [ImageCompressionService] 開始壓縮圖片', { format: quality.format, quality: quality.quality });",
    content
)

# 模式 2: console.log(`📐 [ImageCompressionService] 尺寸調整完成: ${processedCanvas.width}x${processedCanvas.height}`);
content = re.sub(
    r"console\.log\(`📐 \[ImageCompressionService\] 尺寸調整完成: \$\{processedCanvas\.width\}x\$\{processedCanvas\.height\}`\); // TODO:.*",
    r"log.debug('📐 [ImageCompressionService] 尺寸調整完成', { width: processedCanvas.width, height: processedCanvas.height });",
    content
)

# 模式 3: console.log(`✅ [ImageCompressionService] 壓縮完成: ${result.size} bytes (${result.type})`);
content = re.sub(
    r"console\.log\(`✅ \[ImageCompressionService\] 壓縮完成: \$\{result\.size\} bytes \(\$\{result\.type\}\)`\); // TODO:.*",
    r"log.debug('✅ [ImageCompressionService] 壓縮完成', { size: result.size, type: result.type });",
    content
)

# 模式 4 & 5: console.log(`🎯 [ImageCompressionService] 使用目標檔案大小優化: ${targetFileSize} bytes`); (兩處相同)
content = re.sub(
    r"console\.log\(`🎯 \[ImageCompressionService\] 使用目標檔案大小優化: \$\{targetFileSize\} bytes`\); // TODO:.*",
    r"log.debug('🎯 [ImageCompressionService] 使用目標檔案大小優化', { targetFileSize });",
    content
)

# 模式 6: console.log(`🔍 [ImageCompressionService] 嘗試品質 ${(mid * 100).toFixed(1)}%: ${blob.size} bytes`);
content = re.sub(
    r"console\.log\(`🔍 \[ImageCompressionService\] 嘗試品質 \$\{\(mid \* 100\)\.toFixed\(1\)\}%: \$\{blob\.size\} bytes`\); // TODO:.*",
    r"log.debug('🔍 [ImageCompressionService] 嘗試品質', { quality: `${(mid * 100).toFixed(1)}%`, size: blob.size });",
    content
)

# 模式 7: console.log(`✅ [ImageCompressionService] 找到最佳壓縮: ${bestBlob.size} bytes (目標: ${targetSize} bytes)`);
content = re.sub(
    r"console\.log\(`✅ \[ImageCompressionService\] 找到最佳壓縮: \$\{bestBlob\.size\} bytes \(目標: \$\{targetSize\} bytes\)`\); // TODO:.*",
    r"log.debug('✅ [ImageCompressionService] 找到最佳壓縮', { size: bestBlob.size, targetSize });",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 處理完成：{file_path}")
print("📊 已轉換 7 個 console calls")
