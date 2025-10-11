#!/usr/bin/env python3
import re
import os

files_processed = []
total_converted = 0

def process_file(path, patterns):
    global total_converted, files_processed
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        count = 0
        for pattern, replacement in patterns:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                count += 1
            content = new_content
        
        if count > 0:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            total_converted += count
            files_processed.append((os.path.basename(path), count))
            print(f"✅ {os.path.basename(path)}: {count} calls")
        return True
    except Exception as e:
        print(f"❌ {os.path.basename(path)}: {e}")
        return False

# 處理所有檔案
files_to_process = [
    ('src/renderer/src/components/AI/VisualCreation/CreateTab/CreateTab.tsx', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/components/AI/VisualCreation/CreateTab/CharacterSelector.tsx', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/components/AI/VisualCreation/panels/BatchExportPanel.tsx', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/components/AI/VisualCreation/panels/CharacterSelectionPanel.tsx', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/components/AI/VisualCreation/GalleryTab/GalleryTab.tsx', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/components/Editor/AIWritingPanel.tsx', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/components/Modals/AISettingsModal.tsx', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/hooks/visual-creation/useVisualCreationHandlers.ts', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/hooks/useAIGeneration.ts', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/hooks/illustration/useSmartPrompts.ts', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/hooks/illustration/useBatchConfiguration.ts', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/hooks/illustration/useExportManager.ts', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/hooks/illustration/useBatchExportProcessor.ts', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/hooks/illustration/usePromptIntelligence.ts', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/hooks/illustration/useIllustrationService.ts', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/hooks/useLanguage.ts', [
        (r"console\.log\(", r"log.debug("),
    ]),
    ('src/renderer/src/i18n/translations.ts', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/pages/DatabaseMaintenance/DatabaseMaintenance.tsx', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
    ('src/renderer/src/pages/Dashboard/ProjectGrid.tsx', [
        (r"console\.log\(", r"log.debug("),
        (r"console\.error\(", r"log.error("),
    ]),
]

for file_path, patterns in files_to_process:
    process_file(file_path, patterns)

print(f"\n🎉 最終衝刺完成！")
print(f"📊 處理檔案數: {len(files_processed)}")
print(f"📊 轉換 console calls: {total_converted}")
