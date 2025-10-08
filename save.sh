#!/bin/bash
cd ~/bruno-token-app
git add .
if [ -n "$1" ]; then
    git commit -m "$1"
else
    git commit -m "💾 Auto-save: $(date '+%d.%m.%Y %H:%M')"
fi
echo "✅ Сохранено!"
git log --oneline -3
