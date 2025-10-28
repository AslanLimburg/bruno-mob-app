# 📧 Настройка Resend Email на сервере

## ❌ Проблема:
Email не отправляются через Resend API

## ✅ Решение:

### 1️⃣ Создайте аккаунт Resend (если нет):
🔗 https://resend.com/signup

### 2️⃣ Добавьте домен brunotoken.com:
1. Зайдите в **Dashboard** → **Domains**
2. Нажмите **"Add Domain"**
3. Введите: `brunotoken.com`
4. Добавьте DNS записи в ваш DNS провайдер:
   - **SPF** record
   - **DKIM** records
   - **DMARC** record (опционально)

### 3️⃣ Получите API Key:
1. Зайдите в **Dashboard** → **API Keys**
2. Нажмите **"Create API Key"**
3. Скопируйте ключ (начинается с `re_...`)

### 4️⃣ Добавьте API Key на сервер:

```bash
# На сервере
cd /var/www/brunotoken/backend
nano .env
```

Добавьте строку:
```env
RESEND_API_KEY=re_ваш_ключ_здесь
```

Сохраните файл (Ctrl+X, Y, Enter)

### 5️⃣ Обновите email адреса в коде:

**В файле:** `backend/services/emailService.js`

Замените:
```javascript
from: 'Bruno Token <onboarding@resend.dev>',
```

На:
```javascript
from: 'Bruno Token <noreply@brunotoken.com>',
```

### 6️⃣ Перезапустите backend:

```bash
pm2 restart bruno-token-backend --update-env
```

### 7️⃣ Проверьте работу:

```bash
cd /var/www/brunotoken/backend
node testResendEmail.js
```

---

## 🧪 Тест Email:

Откройте в браузере:
```
https://brunotoken.com/api/auth/register
```

Отправьте POST запрос с тестовым email.

---

## 📊 Варианты "from" адресов:

### Вариант 1: С verified доменом (РЕКОМЕНДУЕТСЯ):
```javascript
from: 'Bruno Token <noreply@brunotoken.com>'
```

### Вариант 2: Тестовый (для разработки):
```javascript
from: 'Bruno Token <onboarding@resend.dev>'
```

---

## 🆘 Если не работает:

### Проверьте:
1. API Key правильный?
2. Домен verified в Resend?
3. DNS записи добавлены?
4. .env файл обновлен?
5. Backend перезапущен?

### Временное решение:
Используйте консольный fallback (коды выводятся в логи PM2)

```bash
pm2 logs bruno-token-backend --lines 50
```

---

## 📝 Важные записи DNS:

### SPF Record:
```
TXT record
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

### DKIM Records:
Добавьте те которые Resend даст после добавления домена

### Пример CNAME для subdomain:
```
Type: CNAME
Name: _dmarc
Value: resend.com
```

---

**После настройки все письма будут отправляться успешно! 📧✅**

