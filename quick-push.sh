#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 БЫСТРАЯ ОТПРАВКА ИСПРАВЛЕНИЙ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Введите ваш GitHub Token: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Токен не введен!"
  exit 1
fi

cd /Users/user/Desktop/bt

echo ""
echo "🔄 Отправка исправлений на GitHub..."
git push https://${TOKEN}@github.com/AslanLimburg/bruno-mob-app.git main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ ИСПРАВЛЕНИЯ ОТПРАВЛЕНЫ!"
  echo "🤖 GitHub Actions запускает новую сборку..."
  echo "📱 Проверьте: https://github.com/AslanLimburg/bruno-mob-app/actions"
else
  echo ""
  echo "❌ ОШИБКА!"
fi

