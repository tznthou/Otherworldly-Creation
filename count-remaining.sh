#!/bin/bash
for f in src/renderer/src/components/AI/CreateTab.tsx \
         src/renderer/src/components/AI/CharacterSelector.tsx \
         src/renderer/src/components/AI/AIWritingPanel.tsx \
         src/renderer/src/components/Editor/SimpleAIWritingPanel.tsx \
         src/renderer/src/hooks/useShortcuts.ts \
         src/renderer/src/hooks/useI18n.ts \
         src/renderer/src/App.tsx \
         src/renderer/src/config/features.ts; do
  if [ -f "$f" ]; then
    count=$(grep -c "console\." "$f" 2>/dev/null)
    [ "$count" -gt 0 ] && echo "$count $f"
  fi
done | sort -rn
