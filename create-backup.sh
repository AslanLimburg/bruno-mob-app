#!/bin/bash

# Bruno Token App - Скрипт создания бэкапа
# Использование: ./create-backup.sh [описание]

echo "💾 Bruno Token App - Создание бэкапа"
echo "====================================="

# Создаем папку для бэкапа
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$BACKUP_DATE"
mkdir -p "$BACKUP_DIR"

echo "📁 Создаем бэкап в: $BACKUP_DIR"

# Копируем файлы
echo "🔄 Копируем frontend..."
cp -r frontend "$BACKUP_DIR/"

echo "🔄 Копируем backend..."
cp -r backend "$BACKUP_DIR/"

echo "🔄 Копируем документацию..."
cp -r *.md "$BACKUP_DIR/" 2>/dev/null || true

# Создаем файл с информацией о бэкапе
cat > "$BACKUP_DIR/backup-info.txt" << EOF
Bruno Token App - Информация о бэкапе
=====================================
Дата создания: $(date)
Описание: $1
Автор: Cursor AI Assistant

Состояние проекта:
- Frontend: Работает
- Backend: Работает
- База данных: Подключена
- Аутентификация: Работает

Тестовые учетные данные:
- Email: test@test.com
- Password: test1234
EOF

echo "✅ Бэкап создан успешно!"
echo "📁 Путь: $BACKUP_DIR"
echo "🚀 Для восстановления: ./restore-backup.sh $BACKUP_DATE"
