#!/usr/bin/env python3
import re
import glob

files = [
    'src/renderer/src/App.tsx',
    'src/renderer/src/config/features.ts',
    'src/renderer/src/utils/performanceMonitor.ts',
    'src/renderer/src/utils/performanceLogger.ts',
    'src/renderer/src/utils/reactScan.ts',
    'src/renderer/src/utils/performanceBenchmark.ts',
    'src/renderer/src/utils/componentOptimization.ts',
    'src/renderer/src/components/AI/VisualCreation/CreateTab/CreateTab.tsx',
    'src/renderer/src/components/AI/VisualCreation/panels/CharacterSelectionPanel.tsx',
    'src/renderer/src/components/Editor/SimpleAIWritingPanel.tsx',
    'src/renderer/src/hooks/useShortcuts.ts',
    'src/renderer/src/hooks/useI18n.ts',
    'src/renderer/src/hooks/illustration/useSmartPrompts.ts',
    'src/renderer/src/hooks/useBatchSubmission.ts',
    'src/renderer/src/hooks/useLanguage.ts',
    'src/renderer/src/i18n/translations.ts',
    'src/renderer/src/i18n/index.ts',
    'src/renderer/src/pages/Dashboard/Dashboard.tsx',
    'src/renderer/src/services/imageNamingService.ts',
    'src/renderer/src/services/aiWritingAssistant.ts',
    'src/renderer/src/services/imageGenerationService.ts',
    'src/renderer/src/services/autoBackupService.ts',
    'src/renderer/src/services/logService.ts',
    'src/renderer/src/services/saveManager.ts',
    'src/renderer/src/services/SoundManager.ts',
    'src/renderer/src/services/templateCharacterService.ts',
    'src/renderer/src/services/statisticsService.ts',
    'src/renderer/src/services/ai-generation/ProgressManager.ts',
    'src/renderer/src/main-stable.tsx',
    'src/renderer/src/store/slices/versionManagementSlice.ts',
    'src/renderer/src/store/slices/visualCreationSlice.ts',
    'src/renderer/src/store/slices/chaptersSlice.ts',
]

total = 0
for file_path in files:
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original = content
        
        # 簡單的全域替換 - 保持原有參數
        content = content.replace('console.log(', 'log.debug(')
        content = content.replace('console.error(', 'log.error(')
        content = content.replace('console.warn(', 'log.warn(')
        
        if content != original:
            count = original.count('console.log(') + original.count('console.error(') + original.count('console.warn(')
            with open(file_path, 'w') as f:
                f.write(content)
            total += count
            print(f"✅ {file_path}: {count} calls")
    except Exception as e:
        print(f"❌ {file_path}: {e}")

print(f"\n🎉 最終批次完成！轉換 {total} 個 console calls")
