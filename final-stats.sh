#!/bin/bash
echo "=== 最終統計 ==="
echo ""

# 統計非 backup 檔案中的 console（排除 logger.ts 和 performanceMonitor.ts 中已 eslint-disable 的）
total=$(grep -r "console\.\(log\|error\|warn\)" src/renderer/src --include="*.ts" --include="*.tsx" | \
  grep -v "\.backup" | \
  grep -v "eslint-disable" | \
  grep -v "src/renderer/src/utils/logger.ts" | \
  wc -l | tr -d ' ')

echo "📊 剩餘 console calls (排除 backup 和 eslint-disable): $total"
echo ""

# 列出剩餘檔案（如果有的話）
if [ "$total" -gt 0 ]; then
  echo "📁 剩餘檔案："
  grep -r "console\.\(log\|error\|warn\)" src/renderer/src --include="*.ts" --include="*.tsx" -l | \
    grep -v "\.backup" | \
    grep -v "src/renderer/src/utils/logger.ts" | \
    while read f; do
      count=$(grep "console\." "$f" | grep -v "eslint-disable" | wc -l | tr -d ' ')
      [ "$count" -gt 0 ] && echo "  - $f: $count calls"
    done
fi

echo ""
echo "✅ 如果顯示 0，恭喜達成 100%！"
