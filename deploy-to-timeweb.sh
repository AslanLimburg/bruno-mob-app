#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════╗
# ║                                                                   ║
# ║         Bruno Token - Deploy to Timeweb Script                    ║
# ║                                                                   ║
# ╚═══════════════════════════════════════════════════════════════════╝

# НАСТРОЙКИ - ИЗМЕНИТЕ ПОД СВОЙ СЕРВЕР!
SERVER_USER="your-user"              # Ваш SSH пользователь
SERVER_HOST="your-server.timeweb.ru" # Адрес сервера
SERVER_PATH="/var/www/brunotoken"    # Путь на сервере
SERVER_PORT="22"                     # SSH порт (обычно 22)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для красивого вывода
print_step() {
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
}

print_error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Начало
clear
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║         🚀 Bruno Token - Deploy to Timeweb                        ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Проверка настроек
if [ "$SERVER_USER" = "your-user" ] || [ "$SERVER_HOST" = "your-server.timeweb.ru" ]; then
  print_error "Пожалуйста, настройте переменные в начале скрипта!"
  echo ""
  echo "Откройте файл и измените:"
  echo "  SERVER_USER=\"ваш-ssh-пользователь\""
  echo "  SERVER_HOST=\"ваш-сервер.timeweb.ru\""
  echo "  SERVER_PATH=\"/var/www/brunotoken\""
  echo ""
  exit 1
fi

# Шаг 1: Проверка соединения с сервером
print_step "1/7: Проверка SSH соединения..."

if ssh -p $SERVER_PORT -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST "exit" 2>/dev/null; then
  print_success "SSH соединение установлено"
else
  print_error "Не удалось подключиться к серверу"
  echo "Проверьте:"
  echo "  - SERVER_USER=$SERVER_USER"
  echo "  - SERVER_HOST=$SERVER_HOST"
  echo "  - SERVER_PORT=$SERVER_PORT"
  echo "  - SSH ключ или пароль"
  exit 1
fi

# Шаг 2: Build frontend
print_step "2/7: Building frontend..."

cd frontend
if npm run build; then
  print_success "Frontend build completed"
else
  print_error "Frontend build failed"
  exit 1
fi
cd ..

# Шаг 3: Создание архива
print_step "3/7: Creating deployment archive..."

ARCHIVE_NAME="bruno-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

tar -czf $ARCHIVE_NAME \
  frontend/build \
  backend \
  --exclude backend/node_modules \
  --exclude backend/.env \
  --exclude backend/uploads

ARCHIVE_SIZE=$(du -h $ARCHIVE_NAME | cut -f1)
print_success "Archive created: $ARCHIVE_NAME ($ARCHIVE_SIZE)"

# Шаг 4: Загрузка архива на сервер
print_step "4/7: Uploading to server..."

if scp -P $SERVER_PORT $ARCHIVE_NAME $SERVER_USER@$SERVER_HOST:~/; then
  print_success "Archive uploaded to server"
else
  print_error "Upload failed"
  rm $ARCHIVE_NAME
  exit 1
fi

# Шаг 5: Распаковка и установка на сервере
print_step "5/7: Installing on server..."

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << ENDSSH
set -e

echo "📦 Extracting archive..."
cd ~
tar -xzf $ARCHIVE_NAME

echo "📁 Creating project directory..."
sudo mkdir -p $SERVER_PATH
sudo chown -R $SERVER_USER:$SERVER_USER $SERVER_PATH

echo "🔄 Copying files..."
cp -r frontend/build/* $SERVER_PATH/frontend/
cp -r backend/* $SERVER_PATH/backend/

echo "🗑️  Cleaning up..."
rm -rf frontend backend $ARCHIVE_NAME

echo "✅ Files installed!"
ENDSSH

print_success "Installation completed"

# Шаг 6: Установка зависимостей
print_step "6/7: Installing dependencies..."

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << ENDSSH
set -e

cd $SERVER_PATH/backend

echo "📦 Installing npm packages..."
npm install --production

echo "✅ Dependencies installed!"
ENDSSH

print_success "Dependencies installed"

# Шаг 7: Запуск приложения
print_step "7/7: Starting application..."

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << ENDSSH
set -e

cd $SERVER_PATH/backend

# Проверяем PM2
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
fi

# Перезапускаем приложение
if pm2 list | grep -q bruno-token-backend; then
  echo "🔄 Restarting existing process..."
  pm2 restart bruno-token-backend
else
  echo "🚀 Starting new process..."
  pm2 start server.js --name bruno-token-backend
fi

pm2 save

echo ""
echo "✅ Application started!"
pm2 status
ENDSSH

print_success "Application running!"

# Очистка локального архива
rm $ARCHIVE_NAME

# Финальное сообщение
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║         ✅ DEPLOY COMPLETED SUCCESSFULLY!                         ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Your app is now live at:"
echo "   https://$SERVER_HOST"
echo ""
echo "📊 Check status:"
echo "   ssh $SERVER_USER@$SERVER_HOST 'pm2 logs bruno-token-backend --lines 20'"
echo ""
echo "🔄 To deploy again:"
echo "   ./deploy-to-timeweb.sh"
echo ""
print_success "Deploy finished! 🎉"

