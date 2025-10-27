#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 ДОБАВЛЕНИЕ АВТОМАТИЧЕСКОЙ СБОРКИ APK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  ВНИМАНИЕ: Нужен токен с правами 'workflow'!"
echo ""
echo "📝 Если вы еще не создали токен:"
echo "1. https://github.com/settings/tokens"
echo "2. Generate new token (classic)"
echo "3. Выберите: ☑️ repo + ☑️ workflow"
echo ""
read -p "Введите GitHub Token с правами 'workflow': " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Токен не введен!"
  exit 1
fi

cd /Users/user/Desktop/bt

echo ""
echo "🔄 Отправка GitHub Actions workflow..."
git push https://${TOKEN}@github.com/AslanLimburg/bruno-mob-app.git main

if [ $? -eq 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ АВТОМАТИЧЕСКАЯ СБОРКА НАСТРОЕНА!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🤖 GitHub Actions автоматически соберет APK!"
  echo "⏱️  Сборка займет ~5-10 минут"
  echo ""
  echo "📱 Проверьте статус:"
  echo "   https://github.com/AslanLimburg/bruno-mob-app/actions"
  echo ""
  echo "📥 После сборки скачайте APK:"
  echo "   1. Откройте последний workflow run"
  echo "   2. Найдите раздел 'Artifacts'"
  echo "   3. Скачайте 'bruno-token-debug.apk'"
  echo ""
  echo "📲 Установите APK на Android устройство!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo ""
  echo "❌ ОШИБКА!"
  echo ""
  echo "Возможные причины:"
  echo "1. У токена нет прав 'workflow'"
  echo "2. Токен неправильный или истек"
  echo ""
  echo "Создайте новый токен с правами 'workflow':"
  echo "https://github.com/settings/tokens"
fi

