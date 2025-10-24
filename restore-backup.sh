#!/bin/bash

# Bruno Token App - Скрипт восстановления из бэкапа
# Использование: ./restore-backup.sh [дата_бэкапа]

echo "🔄 Bruno Token App - Восстановление из бэкапа"
echo "=============================================="

# Проверяем, указана ли дата бэкапа
if [ -z "$1" ]; then
    echo "❌ Ошибка: Укажите дату бэкапа"
    echo "Использование: ./restore-backup.sh YYYYMMDD_HHMMSS"
    echo ""
    echo "Доступные бэкапы:"
    ls -la backups/ | grep "^d" | awk '{print $9}' | grep -E "^[0-9]{8}_[0-9]{6}$"
    exit 1
fi

BACKUP_DATE="$1"
BACKUP_DIR="backups/$BACKUP_DATE"

# Проверяем, существует ли бэкап
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Ошибка: Бэкап $BACKUP_DATE не найден"
    echo "Доступные бэкапы:"
    ls -la backups/ | grep "^d" | awk '{print $9}' | grep -E "^[0-9]{8}_[0-9]{6}$"
    exit 1
fi

echo "📁 Восстанавливаем из бэкапа: $BACKUP_DIR"

# Создаем резервную копию текущего состояния
CURRENT_BACKUP="backups/current_$(date +%Y%m%d_%H%M%S)"
echo "💾 Сохраняем текущее состояние в: $CURRENT_BACKUP"
mkdir -p "$CURRENT_BACKUP"
cp -r frontend "$CURRENT_BACKUP/" 2>/dev/null || true
cp -r backend "$CURRENT_BACKUP/" 2>/dev/null || true

# Восстанавливаем из бэкапа
echo "🔄 Восстанавливаем файлы..."
cp -r "$BACKUP_DIR/frontend" ./
cp -r "$BACKUP_DIR/backend" ./

echo "✅ Восстановление завершено!"
echo "🚀 Для запуска:"
echo "   Backend:  cd backend && node server.js"
echo "   Frontend: cd frontend && npm start"
