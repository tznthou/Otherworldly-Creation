#!/usr/bin/env python3
import re

# Batch 43: performanceMonitor.ts (5 calls)
file_path = 'src/renderer/src/utils/performanceMonitor.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"console\.warn\(`⚠️ 檢測到長任務: \$\{entry\.duration\.toFixed\(2\)\}ms`, \{ // TODO:.*",
    r"log.warn('⚠️ 檢測到長任務', { duration: `${entry.duration.toFixed(2)}ms` }, {",
    content
)
content = re.sub(
    r"console\.warn\(`🚨 組件 \"\$\{componentName\}\" 渲染時間過長: \$\{renderTime\.toFixed\(2\)\}ms`\); // TODO:.*",
    r"log.warn('🚨 組件渲染時間過長', { componentName, renderTime: `${renderTime.toFixed(2)}ms` });",
    content
)
content = re.sub(
    r"console\.groupCollapsed\('📊 性能報告 \(最近60秒\)'\);",
    r"/* eslint-disable-next-line no-console */\n        console.groupCollapsed('📊 性能報告 (最近60秒)');",
    content
)
content = re.sub(
    r"console\.log\(`💾 記憶體使用: \$\{usedMB\}MB`\); // TODO:.*",
    r"/* eslint-disable-next-line no-console */\n          console.log(`💾 記憶體使用: ${usedMB}MB`);",
    content
)
content = re.sub(
    r"console\.groupEnd\(\);",
    r"/* eslint-disable-next-line no-console */\n        console.groupEnd();",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Batch 43: performanceMonitor.ts (轉換2 calls，保留3個group相關)")

# Batch 44: performanceBenchmark.ts (3 calls)
file_path = 'src/renderer/src/utils/performanceBenchmark.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"console\.log\(`⏱️ \[效能測試\] \$\{label\}: \$\{duration\.toFixed\(2\)\}ms`\); // TODO:.*",
    r"log.debug('⏱️ [效能測試]', { label, duration: `${duration.toFixed(2)}ms` });",
    content
)
content = re.sub(
    r"console\.log\('📊 \[效能測試\] 測試報告:'\);",
    r"log.debug('📊 [效能測試] 測試報告');",
    content
)
content = re.sub(
    r"console\.log\(`  - \$\{entry\.label\}: \$\{entry\.duration\.toFixed\(2\)\}ms`\); // TODO:.*",
    r"log.debug('  測試項目', { label: entry.label, duration: `${entry.duration.toFixed(2)}ms` });",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Batch 44: performanceBenchmark.ts (3 calls)")

# Batch 45: performanceLogger.ts (3 calls)  
file_path = 'src/renderer/src/utils/performanceLogger.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"console\.log\(`📊 \[效能日誌\] \$\{label\}: \$\{duration\.toFixed\(2\)\}ms \(閾值: \$\{threshold\}ms\)`\); // TODO:.*",
    r"log.debug('📊 [效能日誌]', { label, duration: `${duration.toFixed(2)}ms`, threshold: `${threshold}ms` });",
    content
)
content = re.sub(
    r"console\.warn\('⚠️ \[效能警告\] 超過閾值:', entry\);",
    r"log.warn('⚠️ [效能警告] 超過閾值', entry);",
    content
)
content = re.sub(
    r"console\.error\('❌ \[效能日誌\] 記錄效能數據失敗:', error\);",
    r"log.error('❌ [效能日誌] 記錄效能數據失敗', error);",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Batch 45: performanceLogger.ts (3 calls)")

# Batch 46: componentOptimization.ts (3 calls)
file_path = 'src/renderer/src/utils/componentOptimization.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"console\.log\('🔍 組件優化:', analysis\); // TODO:.*",
    r"log.debug('🔍 組件優化', analysis);",
    content
)
content = re.sub(
    r"console\.warn\('⚠️ 組件優化警告:', issues\); // TODO:.*",
    r"log.warn('⚠️ 組件優化警告', issues);",
    content
)
content = re.sub(
    r"console\.log\('✅ 組件優化建議:', recommendations\); // TODO:.*",
    r"log.debug('✅ 組件優化建議', recommendations);",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Batch 46: componentOptimization.ts (3 calls)")

# Batch 47: reactScan.ts (4 calls)
file_path = 'src/renderer/src/utils/reactScan.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"console\.log\('🔍 React Scan 初始化'\); // TODO:.*",
    r"log.debug('🔍 React Scan 初始化');",
    content
)
content = re.sub(
    r"console\.log\('📊 React Scan 監控:', config\); // TODO:.*",
    r"log.debug('📊 React Scan 監控', config);",
    content
)
content = re.sub(
    r"console\.warn\('⚠️ React Scan 偵測到問題:', issues\); // TODO:.*",
    r"log.warn('⚠️ React Scan 偵測到問題', { issues });",
    content
)
content = re.sub(
    r"console\.log\('✅ React Scan 優化建議:', suggestions\); // TODO:.*",
    r"log.debug('✅ React Scan 優化建議', suggestions);",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Batch 47: reactScan.ts (4 calls)")

print("\n🎉 Batch 43-47 全部完成！")
