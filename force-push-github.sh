#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 FORCE PUSH НА GITHUB (Очищенная история)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  ВНИМАНИЕ: История Git была очищена от секретов!"
echo "📝 Используйте тот же GitHub Token что и раньше"
echo ""
read -p "Введите ваш GitHub Personal Access Token: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Токен не введен!"
  exit 1
fi

cd /Users/user/Desktop/bt

echo ""
echo "🔄 Отправка очищенного кода на GitHub (FORCE PUSH)..."
git push https://${TOKEN}@github.com/AslanLimburg/bruno-mob-app.git main --force

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ КОД УСПЕШНО ЗАГРУЖЕН!"
  echo "🔒 Секретные данные удалены из истории Git!"
  echo "🤖 GitHub Actions начнет сборку APK автоматически!"
  echo "📱 Проверьте: https://github.com/AslanLimburg/bruno-mob-app/actions"
else
  echo ""
  echo "❌ ОШИБКА! Проверьте токен и права доступа."
fi

