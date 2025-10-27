# 🚀 Инструкция по деплою на Timeweb

**Дата:** 27 октября 2025  
**Сервер:** Timeweb  
**Проект:** Bruno Token v2.0  
**Время:** ~10-20 минут

---

## 📋 ПЛАН ДЕЙСТВИЙ

### Шаг 1: Сохранение старого проекта (2 минуты)
### Шаг 2: Подготовка нового проекта (3 минуты)
### Шаг 3: Build frontend (2 минуты)
### Шаг 4: Загрузка на сервер (5-10 минут)
### Шаг 5: Настройка базы данных (3 минуты)
### Шаг 6: Запуск на сервере (2 минуты)

**ИТОГО:** ~15-20 минут

---

## 🔐 ЧТО ВАМ ПОНАДОБИТСЯ

### Доступы к Timeweb:

1. **SSH доступ:**
   - Адрес: `ssh user@your-server.timeweb.ru`
   - Порт: обычно 22
   - Логин: ваш username
   - Пароль: ваш пароль

2. **FTP/SFTP доступ (альтернатива):**
   - Хост: `your-server.timeweb.ru`
   - Порт: 21 (FTP) или 22 (SFTP)
   - Логин: ваш username
   - Пароль: ваш пароль

3. **Панель управления Timeweb:**
   - URL: https://timeweb.com/ru/my/
   - Логин/пароль

---

## 📦 ШАГ 1: СОХРАНЕНИЕ СТАРОГО ПРОЕКТА

### Вариант A: Через SSH (рекомендуется)

```bash
# 1. Подключитесь к серверу
ssh your-user@your-server.timeweb.ru

# 2. Перейдите в директорию с проектом
cd /var/www  # или ваш путь

# 3. Посмотрите что там
ls -la

# 4. Переименуйте старый проект
mv brunotoken brunotoken-old-2025-10-27

# 5. Или создайте архив
tar -czf brunotoken-backup-$(date +%Y%m%d).tar.gz brunotoken/

# 6. Переместите старый проект
mkdir -p ~/old-projects
mv brunotoken ~/old-projects/brunotoken-old

# 7. Готово! Старый проект сохранен
```

### Вариант B: Через панель Timeweb

```
1. Зайдите в панель: https://timeweb.com/ru/my/
2. Раздел: Хостинг → Файловый менеджер
3. Найдите папку с проектом (brunotoken)
4. Правой кнопкой → Переименовать → brunotoken-old
5. ИЛИ Скачать → Сохранить локально
6. Готово!
```

### Вариант C: Через FileZilla (FTP клиент)

```
1. Скачайте FileZilla: https://filezilla-project.org/
2. Подключитесь:
   - Хост: your-server.timeweb.ru
   - Порт: 22 (SFTP)
   - Логин: ваш
   - Пароль: ваш
3. Найдите папку brunotoken
4. Переименуйте: brunotoken → brunotoken-old
5. ИЛИ скачайте на компьютер
6. Готово!
```

**ВАЖНО:** Старый проект теперь в безопасности! ✅

---

## 🔨 ШАГ 2: ПОДГОТОВКА НОВОГО ПРОЕКТА

### На вашем Mac (локально):

```bash
cd /Users/user/Desktop/bt

# 1. Создадим production .env для backend
cat > backend/.env.production << 'EOF'
NODE_ENV=production
PORT=5000

# Database (Timeweb PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brunotoken
DB_USER=ваш_postgres_user
DB_PASSWORD=ваш_postgres_password

# JWT
JWT_SECRET=ваш_jwt_secret_минимум_32_символа

# S3 Storage (Timeweb)
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_ACCESS_KEY=U9EFNOYR55J
S3_SECRET_KEY=Zi76caEspF
S3_BUCKET_NAME=3559f705-206b4cb2-9274-41df-9f35-54c37a418b4d
S3_PUBLIC_URL=https://3559f705-206b4cb2-9274-41df-9f35-54c37a418b4d.s3.twcstorage.ru

# OpenAI (опционально)
OPENAI_API_KEY=ваш_openai_key_если_есть

# CORS
CORS_ORIGIN=https://ваш-домен.ru
EOF

# 2. Создадим .env для frontend
cat > frontend/.env.production << 'EOF'
REACT_APP_API_URL=https://api.ваш-домен.ru/api
EOF

echo "✅ .env файлы созданы для production"
```

### ВАЖНО! Замените:
- `ваш_postgres_user` - узнайте в панели Timeweb
- `ваш_postgres_password` - узнайте в панели Timeweb
- `ваш_jwt_secret` - любая строка минимум 32 символа
- `ваш-домен.ru` - ваш реальный домен на Timeweb
- `ваш_openai_key` - если используете переводы

---

## 🏗️ ШАГ 3: BUILD FRONTEND

```bash
cd /Users/user/Desktop/bt/frontend

# 1. Убедитесь что .env.production создан
cat .env.production

# 2. Build для production
npm run build

# Ожидается:
# Creating an optimized production build...
# Compiled successfully!
# File sizes after gzip:
# ...
# The build folder is ready to be deployed.

# 3. Проверьте что build создан
ls -lh build/

# Должно быть:
# build/
#   ├── static/
#   │   ├── css/
#   │   ├── js/
#   │   └── media/
#   ├── index.html
#   ├── manifest.json
#   └── ...

echo "✅ Frontend build готов!"
```

**Время:** ~2-3 минуты

---

## 📤 ШАГ 4: ЗАГРУЗКА НА СЕРВЕР

### Вариант A: Через SCP (рекомендуется, быстрее)

```bash
cd /Users/user/Desktop/bt

# 1. Загрузка frontend (build/)
scp -r frontend/build/* your-user@your-server.timeweb.ru:/var/www/brunotoken/frontend/

# 2. Загрузка backend
scp -r backend/* your-user@your-server.timeweb.ru:/var/www/brunotoken/backend/

# Время: ~5-10 минут (зависит от скорости интернета)
```

### Вариант B: Через rsync (умнее, только изменения)

```bash
# 1. Frontend
rsync -avz --progress frontend/build/ your-user@your-server.timeweb.ru:/var/www/brunotoken/frontend/

# 2. Backend
rsync -avz --progress backend/ your-user@your-server.timeweb.ru:/var/www/brunotoken/backend/ \
  --exclude node_modules \
  --exclude uploads \
  --exclude .env

# Время: ~3-7 минут (загружает только изменения)
```

### Вариант C: Через FileZilla (визуально)

```
1. Откройте FileZilla
2. Подключитесь к серверу:
   - Хост: your-server.timeweb.ru
   - Порт: 22 (SFTP)
   - Логин: ваш
   - Пароль: ваш

3. Загрузите frontend:
   Локально: /Users/user/Desktop/bt/frontend/build/
   На сервер: /var/www/brunotoken/frontend/
   
   Перетащите все файлы из build/

4. Загрузите backend:
   Локально: /Users/user/Desktop/bt/backend/
   На сервер: /var/www/brunotoken/backend/
   
   НЕ загружайте:
   - node_modules/ (слишком большая, установим на сервере)
   - .env (создадим на сервере)

5. Дождитесь завершения (5-15 минут)
```

**Время:** ~5-15 минут (зависит от скорости)

---

## 🗄️ ШАГ 5: НАСТРОЙКА БАЗЫ ДАННЫХ

### SSH на сервере:

```bash
# 1. Подключитесь к серверу
ssh your-user@your-server.timeweb.ru

# 2. Перейдите в backend
cd /var/www/brunotoken/backend

# 3. Найдите PostgreSQL credentials в панели Timeweb
# Обычно:
# Host: localhost
# Port: 5432
# User: postgres или ваш user
# Password: из панели Timeweb
# Database: brunotoken (создайте если нет)

# 4. Создайте базу данных (если еще нет)
psql -U postgres -c "CREATE DATABASE brunotoken;"

# 5. Запустите миграции
node run-verification-migration.js

# Должно быть:
# ✅ Verification documents table created!

# 6. Если есть другие миграции
node run-vector-migration.js

# 7. Проверьте таблицы
psql -U postgres -d brunotoken -c "\dt"

# Должно показать:
# - users
# - verification_documents
# - vector_profiles
# - vector_questions
# - И другие...
```

**Время:** ~3 минуты

---

## 🚀 ШАГ 6: УСТАНОВКА ЗАВИСИМОСТЕЙ И ЗАПУСК

### На сервере (SSH):

```bash
# 1. Backend - установка зависимостей
cd /var/www/brunotoken/backend
npm install --production

# Время: ~2-3 минуты

# 2. Скопируйте .env
cp .env.production .env

# ИЛИ создайте вручную:
nano .env
# Вставьте содержимое из .env.production
# Сохраните: Ctrl+X → Y → Enter

# 3. Проверьте .env
cat .env

# 4. Установите PM2 (если еще нет)
npm install -g pm2

# 5. Запустите backend через PM2
pm2 start server.js --name bruno-token-backend

# 6. Сохраните PM2 процессы
pm2 save
pm2 startup

# 7. Проверьте статус
pm2 status

# Должно быть:
# bruno-token-backend  │ online

# 8. Проверьте логи
pm2 logs bruno-token-backend --lines 20

# Должно быть:
# ✅ Bruno Token API Server
# Port: 5000
```

**Время:** ~5 минут

---

## 🌐 ШАГ 7: НАСТРОЙКА NGINX

### Если используете Nginx:

```bash
# 1. Создайте конфигурацию
sudo nano /etc/nginx/sites-available/brunotoken

# 2. Вставьте конфиг:
```

```nginx
server {
    listen 80;
    server_name ваш-домен.ru www.ваш-домен.ru;

    # Frontend (React build)
    root /var/www/brunotoken/frontend;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        alias /var/www/brunotoken/backend/uploads;
        autoindex off;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 3. Активируйте конфиг
sudo ln -s /etc/nginx/sites-available/brunotoken /etc/nginx/sites-enabled/

# 4. Проверьте конфигурацию
sudo nginx -t

# 5. Перезапустите Nginx
sudo systemctl restart nginx

# 6. Проверьте статус
sudo systemctl status nginx
```

---

## 🔒 ШАГ 8: SSL СЕРТИФИКАТ (опционально, но рекомендуется)

### Certbot (Let's Encrypt - БЕСПЛАТНО):

```bash
# 1. Установите Certbot
sudo apt install certbot python3-certbot-nginx

# 2. Получите SSL сертификат
sudo certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru

# 3. Следуйте инструкциям на экране
# - Введите email
# - Согласитесь с условиями
# - Выберите редирект HTTP → HTTPS

# 4. Готово! SSL установлен

# 5. Автопродление (уже настроено автоматически)
sudo certbot renew --dry-run
```

**Теперь сайт на HTTPS! 🔒**

---

## 📁 СТРУКТУРА НА СЕРВЕРЕ

### Рекомендуемая структура:

```
/var/www/
├── brunotoken/              ← НОВЫЙ ПРОЕКТ
│   ├── frontend/
│   │   ├── index.html
│   │   ├── static/
│   │   │   ├── css/
│   │   │   ├── js/
│   │   │   └── media/
│   │   ├── manifest.json
│   │   ├── service-worker.js
│   │   └── ...
│   └── backend/
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── migrations/
│       ├── uploads/
│       ├── .env
│       ├── package.json
│       └── node_modules/
│
└── brunotoken-old/          ← СТАРЫЙ ПРОЕКТ (сохранен)
    └── ... (весь старый проект)
```

---

## ⏱️ ВРЕМЯ ЗАГРУЗКИ

### Факторы:

**Размер файлов:**
- Frontend build: ~5-10 MB (после gzip ~2-3 MB)
- Backend: ~10-15 MB (без node_modules)
- node_modules: ~100-150 MB (устанавливаем на сервере)

**Скорость интернета:**
- 10 Mbps: ~10-15 минут
- 50 Mbps: ~3-5 минут
- 100 Mbps: ~2-3 минуты

**Методы:**
- SCP: средняя скорость
- rsync: быстрее (только изменения)
- FileZilla: визуально, но медленнее

**ИТОГО:** ~5-15 минут загрузка файлов

---

## 🤖 МОГУ ЛИ Я САМ ЗАЛИТЬ?

### К сожалению, НЕТ 😔

**Почему:**
- ❌ У меня нет доступа к вашему серверу
- ❌ Нет SSH credentials
- ❌ Нет FTP доступа
- ❌ Не могу выполнять команды на удаленном сервере

**Но я могу:**
- ✅ Дать детальные инструкции (делаю это!)
- ✅ Подготовить все файлы
- ✅ Создать скрипты автоматизации
- ✅ Помочь решить проблемы

---

## 📝 ПОШАГОВАЯ ИНСТРУКЦИЯ (КОПИРУЙ-ВСТАВЛЯЙ)

### ЧАСТЬ 1: ПОДГОТОВКА (на Mac)

```bash
# 1. Перейдите в проект
cd /Users/user/Desktop/bt

# 2. Build frontend
cd frontend
npm run build
cd ..

# 3. Создайте архив для загрузки (опционально)
tar -czf bruno-token-deploy.tar.gz \
  frontend/build \
  backend \
  --exclude backend/node_modules \
  --exclude backend/.env

echo "✅ Архив создан: bruno-token-deploy.tar.gz"
echo "Размер: $(du -h bruno-token-deploy.tar.gz | cut -f1)"
```

### ЧАСТЬ 2: ЗАГРУЗКА (на сервер)

**Метод 1: SCP (весь архив)**

```bash
# 1. Загрузите архив
scp bruno-token-deploy.tar.gz your-user@your-server.timeweb.ru:~/

# 2. Подключитесь по SSH
ssh your-user@your-server.timeweb.ru

# 3. Распакуйте
cd /var/www
tar -xzf ~/bruno-token-deploy.tar.gz -C brunotoken/

# 4. Готово!
```

**Метод 2: Прямая загрузка**

```bash
# Frontend
scp -r frontend/build/* your-user@your-server.timeweb.ru:/var/www/brunotoken/frontend/

# Backend
rsync -avz --progress backend/ your-user@your-server.timeweb.ru:/var/www/brunotoken/backend/ \
  --exclude node_modules \
  --exclude .env
```

### ЧАСТЬ 3: НАСТРОЙКА (на сервере)

```bash
# 1. SSH на сервер
ssh your-user@your-server.timeweb.ru

# 2. Перейдите в backend
cd /var/www/brunotoken/backend

# 3. Установите зависимости
npm install --production

# 4. Создайте .env
nano .env
# (вставьте содержимое из .env.production)

# 5. Запустите миграции
node run-verification-migration.js

# 6. Запустите через PM2
pm2 start server.js --name bruno-token-backend
pm2 save

# 7. Проверьте
pm2 logs bruno-token-backend --lines 30

# Должно быть:
# ✅ Bruno Token API Server
# Port: 5000
```

---

## 🔍 ПРОВЕРКА ПОСЛЕ DEPLOY

### 1. Backend:

```bash
# На сервере
curl http://localhost:5000/api/health

# ИЛИ
pm2 logs bruno-token-backend --lines 20
```

### 2. Frontend:

```bash
# В браузере
https://ваш-домен.ru

# Должно открыться приложение
```

### 3. База данных:

```bash
# Проверьте подключение
psql -U postgres -d brunotoken -c "SELECT COUNT(*) FROM users;"
```

### 4. S3:

```bash
# Проверьте что S3 доступен
node -e "
const { s3Client, bucketName } = require('./config/s3');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
(async () => {
  const cmd = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
  const res = await s3Client.send(cmd);
  console.log('✅ S3 connected');
})();
"
```

---

## 🎯 БЫСТРАЯ ЗАГРУЗКА (скрипт)

### Создам скрипт для автоматизации:

```bash
# Создайте файл
nano /Users/user/Desktop/bt/deploy-to-timeweb.sh
```

```bash
#!/bin/bash

# Bruno Token - Deploy to Timeweb Script
# Usage: ./deploy-to-timeweb.sh

echo "🚀 Bruno Token - Deploy to Timeweb"
echo "=================================="

# Настройки (ИЗМЕНИТЕ!)
SERVER_USER="your-user"
SERVER_HOST="your-server.timeweb.ru"
SERVER_PATH="/var/www/brunotoken"

# 1. Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm run build
cd ..

# 2. Создать архив
echo "📦 Creating deployment archive..."
tar -czf bruno-deploy.tar.gz \
  frontend/build \
  backend \
  --exclude backend/node_modules \
  --exclude backend/.env

# 3. Загрузить на сервер
echo "📤 Uploading to server..."
scp bruno-deploy.tar.gz $SERVER_USER@$SERVER_HOST:~/

# 4. Распаковать и настроить
echo "⚙️  Installing on server..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
cd /var/www
tar -xzf ~/bruno-deploy.tar.gz -C brunotoken/
cd brunotoken/backend
npm install --production
pm2 restart bruno-token-backend
pm2 save
ENDSSH

# 5. Очистка
rm bruno-deploy.tar.gz

echo "✅ Deploy completed!"
echo "🌐 Check: https://ваш-домен.ru"
```

```bash
# Сделайте исполняемым
chmod +x deploy-to-timeweb.sh

# Запустите
./deploy-to-timeweb.sh
```

**Время:** ~5-10 минут (всё автоматически!)

---

## 🐛 TROUBLESHOOTING

### Проблема 1: "Permission denied"

```bash
# Проверьте права доступа
ssh your-user@your-server.timeweb.ru
ls -la /var/www

# Если нет прав:
sudo chown -R your-user:your-user /var/www/brunotoken
```

### Проблема 2: "npm: command not found"

```bash
# Установите Node.js на сервере
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Проверьте
node --version
npm --version
```

### Проблема 3: PM2 не найден

```bash
# Установите PM2
npm install -g pm2

# Проверьте
pm2 --version
```

### Проблема 4: PostgreSQL не подключается

```bash
# Проверьте что PostgreSQL запущен
sudo systemctl status postgresql

# Если не запущен
sudo systemctl start postgresql

# Проверьте credentials в панели Timeweb
```

### Проблема 5: "Cannot find module"

```bash
# Переустановите зависимости
cd /var/www/brunotoken/backend
rm -rf node_modules
npm install --production
```

---

## 📊 ЧЕКЛИСТ DEPLOY

### Перед deploy:

- [ ] Frontend build создан (`npm run build`)
- [ ] .env.production настроен
- [ ] Старый проект сохранен/переименован
- [ ] SSH доступ работает
- [ ] PostgreSQL credentials известны

### Во время deploy:

- [ ] Файлы загружены на сервер
- [ ] node_modules установлены
- [ ] .env создан на сервере
- [ ] Миграции выполнены
- [ ] PM2 запущен
- [ ] Nginx настроен (если нужно)

### После deploy:

- [ ] Backend отвечает (curl http://localhost:5000)
- [ ] Frontend открывается (https://домен.ru)
- [ ] База данных работает
- [ ] S3 доступен
- [ ] Все функции работают

---

## ⏱️ ИТОГОВОЕ ВРЕМЯ

### Реалистичная оценка:

```
Подготовка на Mac:     ~5 минут
Build frontend:        ~2 минуты
Загрузка на сервер:    ~5-15 минут (зависит от интернета)
Установка зависимостей: ~3 минуты
Настройка БД:          ~3 минуты
Запуск PM2:            ~2 минуты
Nginx/SSL:             ~5 минут (если нужно)
Тестирование:          ~5 минут

ИТОГО: 30-40 минут (первый раз)
       10-15 минут (последующие разы)
```

### Если используете скрипт автоматизации:

```
ИТОГО: 5-10 минут (автоматически!)
```

---

## 🎯 МОЯ РЕКОМЕНДАЦИЯ

### Самый простой способ:

**1. FileZilla (визуально, для первого раза):**
- Скачайте FileZilla
- Подключитесь к серверу
- Переименуйте старую папку
- Перетащите новые файлы
- Время: ~20 минут

**2. SCP + SSH (быстрее):**
- Build frontend
- Загрузите через SCP
- Настройте через SSH
- Время: ~10 минут

**3. Скрипт автоматизации (для будущих deploy):**
- Настройте deploy-to-timeweb.sh
- Запустите ./deploy-to-timeweb.sh
- Время: ~5 минут

---

## 📞 SUPPORT

### Если нужна помощь Timeweb:

**Служба поддержки:**
- Сайт: https://timeweb.com/ru/help/
- Email: support@timeweb.ru
- Телефон: 8 (800) 700-06-08
- Чат: в личном кабинете

**Документация:**
- https://timeweb.com/ru/help/pages/viewpage.action?pageId=4358511

---

## ✅ ГОТОВО!

**Я подготовил:**
- ✅ Полную инструкцию
- ✅ Все команды (копируй-вставляй)
- ✅ 3 метода загрузки
- ✅ Troubleshooting
- ✅ Скрипт автоматизации

**Вы сможете:**
- ✅ Сохранить старый проект
- ✅ Залить новый за 10-20 минут
- ✅ Настроить всё правильно
- ✅ Запустить в production

**Когда будете готовы - начинайте!** 🚀

---

*Документ: TIMEWEB_DEPLOY_GUIDE.md*  
*Дата: 27.10.2025*  
*Готовность: 100%*

