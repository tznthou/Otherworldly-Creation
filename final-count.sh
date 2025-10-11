#!/bin/bash
total=0
for f in src/renderer/src/components/AI/VisualCreation/CreateTab/CreateTab.tsx \
         src/renderer/src/components/AI/VisualCreation/CreateTab/CharacterSelector.tsx \
         src/renderer/src/components/AI/VisualCreation/panels/BatchExportPanel.tsx \
         src/renderer/src/components/AI/VisualCreation/panels/CharacterSelectionPanel.tsx \
         src/renderer/src/components/AI/VisualCreation/GalleryTab/GalleryTab.tsx \
         src/renderer/src/components/Editor/AIWritingPanel.tsx \
         src/renderer/src/components/Modals/AISettingsModal.tsx \
         src/renderer/src/hooks/visual-creation/useVisualCreationHandlers.ts \
         src/renderer/src/hooks/useAIGeneration.ts \
         src/renderer/src/hooks/illustration/useSmartPrompts.ts \
         src/renderer/src/hooks/illustration/useBatchConfiguration.ts \
         src/renderer/src/hooks/illustration/useExportManager.ts \
         src/renderer/src/hooks/illustration/useBatchExportProcessor.ts \
         src/renderer/src/hooks/illustration/usePromptIntelligence.ts \
         src/renderer/src/hooks/illustration/useIllustrationService.ts \
         src/renderer/src/hooks/useLanguage.ts \
         src/renderer/src/i18n/translations.ts \
         src/renderer/src/pages/DatabaseMaintenance/DatabaseMaintenance.tsx \
         src/renderer/src/pages/Dashboard/ProjectGrid.tsx; do
  if [ -f "$f" ]; then
    count=$(grep "console\.\(log\|error\|warn\)" "$f" | grep -v "eslint-disable" | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
      echo "$count $(basename $f)"
      total=$((total + count))
    fi
  fi
done
echo "---"
echo "總計: $total calls"
