# 📋 ПЛАН НА ЗАВТРА (28 ОКТЯБРЯ)

## 🔴 КРИТИЧНЫЕ ЗАДАЧИ:

### 1. 📧 НАСТРОИТЬ EMAIL СЕРВИС

**Вариант A: Resend (Рекомендуется)**
```bash
# 1. Зарегистрируйтесь на https://resend.com
# 2. Создайте API ключ
# 3. На сервере:
cd /var/www/brunotoken/backend
nano .env
# Замените: RESEND_API_KEY=disabled
# На: RESEND_API_KEY=re_ваш_ключ_здесь

# 4. Перезапустите:
pm2 restart bruno-token-backend --update-env
```

**Вариант B: SMTP (Gmail/Yandex)**
```bash
# В .env замените:
RESEND_API_KEY=disabled
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш_email@gmail.com
SMTP_PASS=ваш_пароль_приложения
```

---

### 2. 🧪 ПРОТЕСТИРОВАТЬ РЕГИСТРАЦИЮ С EMAIL

После настройки email:
1. Зарегистрируйте тестового пользователя
2. Проверьте, что письмо пришло
3. Проверьте верификацию по коду
4. Попробуйте войти

---

### 3. 🗃️ СОЗДАТЬ ТАБЛИЦУ `transactions` (ОПЦИОНАЛЬНО)

Если нужна история транзакций:

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER REFERENCES users(id),
  crypto VARCHAR(10) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  fee DECIMAL(20, 8) DEFAULT 0,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

Затем раскомментировать код в `walletController.js`.

---

## 🧪 ПЛАН ТЕСТИРОВАНИЯ:

### Базовые функции:
- [ ] Регистрация с email верификацией
- [ ] Логин после верификации
- [ ] Логин без верификации (должен блокироваться)
- [ ] Forgot password
- [ ] Dashboard загрузка

### GS-I функции:
- [ ] Lottery доступ (требует GS-I)
- [ ] Challenge доступ (требует GS-I)
- [ ] BRT Stars Challenge (требует GS-I)
- [ ] Vector Destiny опросник
- [ ] Vector Destiny гороскопы

### Дополнительные:
- [ ] Messenger (BrunoChat)
- [ ] KYC загрузка документов
- [ ] Swap функция
- [ ] Send функция
- [ ] Referral система

---

## 🔍 ИЗВЕСТНЫЕ ПРОБЛЕМЫ:

### 🟡 Средний приоритет:
1. **Таблица `transactions` не существует**
   - Текущее решение: `getTransactions` возвращает `[]`
   - Постоянное решение: Создать таблицу или удалить функцию

2. **Email не отправляются**
   - Текущее решение: `RESEND_API_KEY=disabled`
   - Постоянное решение: Настроить Resend или SMTP

3. **OpenAI не настроен**
   - Текущее решение: `OPENAI_API_KEY=disabled`
   - Влияние: Нет переводов анкет Vector Destiny, нет генерации гороскопов
   - Постоянное решение: Получить API ключ с OpenAI

### 🟢 Низкий приоритет:
4. **Таблица `user_balances` не существует**
   - Текущее решение: Используется `users.brt_balance`
   - Влияние: Поддержка только BRT, нет multi-currency
   - Постоянное решение: Создать таблицу или адаптировать под одну валюту

5. **Google OAuth не настроен**
   - Текущее решение: `GOOGLE_CLIENT_ID=disabled`
   - Влияние: Нет входа через Google
   - Постоянное решение: Настроить Google OAuth credentials

---

## 📂 BACKUP ИНФОРМАЦИЯ:

### Последний backup:
- **Дата:** 27 октября 2025, 19:38
- **Файлы:**
  - Проект: `/root/backups/brunotoken-backup-20251027-193807.tar.gz` (1.8 MB)
  - База: `/root/backups/brunotoken-db-2025-10-27T16-38-07.sql` (92 KB)

### Как восстановить:
```bash
# Проект:
cd /var/www
tar -xzf /root/backups/brunotoken-backup-20251027-193807.tar.gz

# База данных:
PGPASSWORD='root' psql -U back -h localhost brunotoken < /root/backups/brunotoken-db-2025-10-27T16-38-07.sql
```

---

## 🚀 БЫСТРЫЙ СТАРТ ЗАВТРА:

```bash
# 1. Подключитесь к серверу
ssh root@147.45.157.12

# 2. Проверьте статус
cd /var/www/brunotoken/backend
pm2 status

# 3. Посмотрите логи
pm2 logs bruno-token-backend --lines 50

# 4. Начните с настройки email (см. раздел 1)
```

---

## 📞 КОНТАКТЫ И ДОСТУПЫ:

- **Сервер:** `147.45.157.12`
- **Домен:** `https://brunotoken.com`
- **Backend API:** `https://brunotoken.com/api`
- **SSH:** `root@147.45.157.12`
- **Email:** `aslanlimburg@mail.ru` (для Certbot)

### Тестовый аккаунт:
- **Email:** `brttoken@gmail.com`
- **Password:** `12345678`
- **Email verified:** ✅ YES

---

## 💡 РЕКОМЕНДАЦИИ:

1. **Начните с настройки Resend** - это самое простое решение для email
2. **Протестируйте регистрацию** нового пользователя с реальным email
3. **Создайте таблицу `transactions`** только если она действительно нужна
4. **OpenAI ключ** получайте в последнюю очередь (не критично)

---

**Удачи завтра! 🌟**

