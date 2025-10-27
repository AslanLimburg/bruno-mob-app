#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ЗАГРУЗКА КОДА НА GITHUB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 ИНСТРУКЦИЯ:"
echo "1. Создайте Personal Access Token:"
echo "   https://github.com/settings/tokens"
echo "2. Выберите права: repo (full control)"
echo "3. Скопируйте токен"
echo ""
read -p "Введите ваш GitHub Personal Access Token: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Токен не введен!"
  exit 1
fi

cd /Users/user/Desktop/bt

echo ""
echo "🔄 Отправка кода на GitHub..."
git push https://${TOKEN}@github.com/AslanLimburg/bruno-mob-app.git main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ КОД УСПЕШНО ЗАГРУЖЕН!"
  echo "🤖 GitHub Actions начнет сборку APK автоматически!"
  echo "📱 Проверьте: https://github.com/AslanLimburg/bruno-mob-app/actions"
else
  echo ""
  echo "❌ ОШИБКА! Проверьте токен и права доступа."
fi

