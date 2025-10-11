#!/usr/bin/env python3
import re

files_to_process = [
    ('src/renderer/src/utils/performanceMonitor.ts', [
        (r"console\.log\('⚠️ \[性能監控\] 檢測到性能問題:', issues\); // TODO:.*", r"log.warn('⚠️ [性能監控] 檢測到性能問題', { issues });"),
        (r"console\.log\('🎯 \[性能優化\] 建議:', suggestions\); // TODO:.*", r"log.debug('🎯 [性能優化] 建議', { suggestions });"),
        (r"console\.warn\('⚠️ 組件渲染過多:', componentName, renderCount\); // TODO:.*", r"log.warn('⚠️ 組件渲染過多', { componentName, renderCount });"),
        (r"console\.log\('📊 \[性能分析\]', analysis\); // TODO:.*", r"log.debug('📊 [性能分析]', analysis);"),
        (r"console\.log\('🔍 \[性能監控\] 開始監控'\); // TODO:.*", r"log.debug('🔍 [性能監控] 開始監控');"),
    ]),
    ('src/renderer/src/utils/performanceBenchmark.ts', [
        (r"console\.log\(`⏱️  \[性能測試\] \$\{label\} 完成: \$\{duration\.toFixed\(2\)\}ms`\); // TODO:.*", r"log.debug('⏱️  [性能測試] 完成', { label, duration: `${duration.toFixed(2)}ms` });"),
        (r"console\.log\('📊 \[性能報告\]:', report\); // TODO:.*", r"log.debug('📊 [性能報告]', report);"),
        (r"console\.log\(`📈 \[性能對比\] \$\{label\}: 提升 \$\{\(\(baseline - current\) / baseline \* 100\)\.toFixed\(1\)\}%`\); // TODO:.*", r"log.debug('📈 [性能對比]', { label, improvement: `${((baseline - current) / baseline * 100).toFixed(1)}%` });"),
    ]),
    ('src/renderer/src/utils/performanceLogger.ts', [
        (r"console\.log\(`📊 \[性能日誌\] \$\{label\}: \$\{duration\.toFixed\(2\)\}ms \(閾值: \$\{threshold\}ms\)`\); // TODO:.*", r"log.debug('📊 [性能日誌]', { label, duration: `${duration.toFixed(2)}ms`, threshold: `${threshold}ms` });"),
        (r"console\.warn\('⚠️  \[性能警告\]', warnings\);", r"log.warn('⚠️  [性能警告]', warnings);"),
        (r"console\.error\('❌ \[性能錯誤\]', errors\);", r"log.error('❌ [性能錯誤]', errors);"),
    ]),
    ('src/renderer/src/utils/componentOptimization.ts', [
        (r"console\.log\('🔍 組件優化分析:', componentName, optimizations\); // TODO:.*", r"log.debug('🔍 組件優化分析', { componentName, optimizations });"),
        (r"console\.warn\('⚠️ 組件性能問題:', componentName, issues\); // TODO:.*", r"log.warn('⚠️ 組件性能問題', { componentName, issues });"),
        (r"console\.log\('✅ 優化建議應用:', recommendations\); // TODO:.*", r"log.debug('✅ 優化建議應用', recommendations);"),
    ]),
    ('src/renderer/src/utils/reactScan.ts', [
        (r"console\.log\('🔍 React Scan 初始化:', config\); // TODO:.*", r"log.debug('🔍 React Scan 初始化', config);"),
        (r"console\.log\('📊 React Scan 報告:', report\); // TODO:.*", r"log.debug('📊 React Scan 報告', report);"),
        (r"console\.warn\('⚠️ React Scan 檢測到問題:', issues\); // TODO:.*", r"log.warn('⚠️ React Scan 檢測到問題', { issues });"),
    ]),
]

total_converted = 0
for file_path, patterns in files_to_process:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        count = 0
        for pattern, replacement in patterns:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                count += 1
            content = new_content
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        total_converted += count
        print(f"✅ {file_path}: {count} calls")
    except Exception as e:
        print(f"❌ {file_path}: {e}")

print(f"\n🎉 Batch 43-47 完成！總計轉換 {total_converted} calls")
