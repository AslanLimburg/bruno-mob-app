# Vector Destiny - Обновление системы (26 октября 2025)

## Сводка изменений

### 🎯 Основные улучшения:

1. **Вопрос о языке** - добавлен первым в анкету
2. **Все вопросы для GS-I** - после активации GS-I пользователь получает доступ ко всем вопросам сразу
3. **Убраны оплаты** - нет trial периода, нет подписок, нет платежей
4. **Новая система прогнозов** - частота зависит только от уровня GS:
   - **GS-I**: 1 раз в месяц (месячный прогноз)
   - **GS-II**: каждые 2 недели (двухнедельный прогноз)
   - **GS-III**: еженедельно (недельный прогноз)
   - **GS-IV**: ежедневно (ежедневный прогноз)

---

## Детальные изменения

### 1. База данных

#### Обновленная миграция: `006_create_vector_destiny_tables.sql`

**Новые/измененные таблицы:**

##### `vector_questions` (20 вопросов)
- **Вопрос о языке** (order_index: 0) - самый первый
- **7 базовых вопросов** (all) - для всех пользователей
- **13 расширенных вопросов** (GS-I) - доступны сразу после активации GS-I

##### `vector_subscriptions` (без оплат)
Старые поля удалены:
- ❌ `price_brt`
- ❌ `trial_used`
- ❌ `trial_ends_at`
- ❌ `last_billing_date`
- ❌ `next_billing_date`
- ❌ `auto_renew`
- ❌ `total_paid_brt`

Новые поля добавлены:
- ✅ `forecast_frequency` - частота прогнозов (monthly/biweekly/weekly/daily)
- ✅ `last_forecast_date` - дата последнего прогноза
- ✅ `next_forecast_date` - дата следующего прогноза

##### `vector_forecast_history` (вместо `vector_billing_history`)
Отслеживает историю отправленных прогнозов, а не платежей

---

### 2. Backend Services

#### `subscriptionService.js` - Полностью переработан

**Удалено:**
- ❌ `startTrialSubscription()` - нет trial
- ❌ `subscribe()` - нет оплат
- ❌ `cancelSubscription()` - нет отмены
- ❌ `getBillingHistory()` - нет истории платежей

**Добавлено:**
- ✅ `activateSubscription()` - автоматическая активация при наличии GS
- ✅ `updateMembershipLevel()` - обновление уровня при изменении GS
- ✅ `deactivateSubscription()` - деактивация при выходе из GS
- ✅ `FORECAST_FREQUENCIES` - мапа частот прогнозов

#### `forecastScheduler.js` - Новый файл (вместо `billingScheduler.js`)

**Функции:**
- `processForecastGeneration()` - автоматическая генерация прогнозов
- `generateAndSendForecast()` - создание и отправка прогноза
- `startForecastScheduler()` - запуск cron задачи (ежедневно в 00:00)

**Логика:**
1. Проверяет подписки с `next_forecast_date <= today`
2. Генерирует персонализированный прогноз
3. Сохраняет в `vector_forecasts`
4. Записывает в историю `vector_forecast_history`
5. Обновляет `next_forecast_date` по формуле:
   - daily: +1 день
   - weekly: +7 дней
   - biweekly: +14 дней
   - monthly: +1 месяц

---

### 3. API Endpoints

#### Удалены эндпоинты:
- ❌ `POST /api/vector/subscription/trial`
- ❌ `POST /api/vector/subscription/subscribe`
- ❌ `POST /api/vector/subscription/cancel`
- ❌ `GET /api/vector/subscription/history`
- ❌ `GET /api/vector/pricing`

#### Новые эндпоинты:
- ✅ `POST /api/vector/subscription/activate` - активация подписки
- ✅ `POST /api/vector/subscription/update-level` - обновление уровня
- ✅ `POST /api/vector/subscription/deactivate` - деактивация
- ✅ `GET /api/vector/frequencies` - информация о частотах прогнозов

#### Существующие (без изменений):
- `GET /api/vector/access` - проверка доступа
- `GET /api/vector/profile` - получение профиля
- `POST /api/vector/profile` - создание/обновление профиля
- `GET /api/vector/subscription` - статус подписки
- `GET /api/vector/questions` - загрузка вопросов
- `GET /api/vector/forecast` - получение прогноза

---

### 4. Структура вопросов

#### Языковой вопрос (первый):
```javascript
{
  "order_index": 0,
  "membership_level": "all",
  "question_text": "What is your preferred language?",
  "question_type": "select",
  "options": ["English", "Russian", "Spanish", "French", "German", "Chinese", "Japanese", "Arabic", "Portuguese", "Italian", "Other"]
}
```

#### Базовые вопросы (all) - 7 шт:
1. Preferred language
2. Full name
3. Gender
4. Date of birth
5. Time of birth (optional)
6. Birth city
7. Birth country

#### Расширенные вопросы (GS-I) - 13 шт:
1. Main areas of interest
2. Current life phase
3. Personality style
4. Primary career goals
5. Relationship status
6. Financial goals
7. Life challenges
8. Spiritual practices
9. Top 3 life priorities
10. Vision for 5 years
11. Limiting beliefs
12. Legacy
13. Ideal day description

**Итого: 20 вопросов**

---

### 5. Логика работы

#### Сценарий 1: Пользователь активирует GS-I

1. Пользователь покупает программу GS-I в Club Avalanche
2. Frontend вызывает `POST /api/vector/subscription/activate`
3. Backend создает подписку:
   - `membership_level = 'GS-I'`
   - `forecast_frequency = 'monthly'`
   - `next_forecast_date = today + 1 month`
4. Пользователь получает доступ ко всем 20 вопросам
5. После заполнения анкеты создается `vector_profile`

#### Сценарий 2: Генерация прогноза

1. Каждый день в 00:00 запускается `forecastScheduler`
2. Находит подписки с `next_forecast_date <= today`
3. Для каждой подписки:
   - Загружает профиль пользователя
   - Генерирует персонализированный прогноз
   - Сохраняет в `vector_forecasts`
   - Отправляет уведомление (TODO)
   - Обновляет `next_forecast_date`

#### Сценарий 3: Обновление уровня GS

1. Пользователь активирует GS-II (или выше)
2. Frontend вызывает `POST /api/vector/subscription/update-level`
3. Backend обновляет:
   - `membership_level = 'GS-II'`
   - `forecast_frequency = 'biweekly'`
   - `next_forecast_date` пересчитывается
4. Теперь прогнозы приходят каждые 2 недели

---

### 6. Интеграция с ChatGPT (TODO)

В `forecastScheduler.js` есть заготовка для интеграции ChatGPT:

```javascript
// TODO: Интегрировать ChatGPT для генерации персонализированного контента
// const language = profile.language || 'en';
// const chatGPTForecast = await generateWithChatGPT(profile, forecastType, language);
```

**План интеграции:**
1. Отправлять в ChatGPT:
   - Астрологические данные профиля
   - Ответы на вопросы анкеты
   - Предпочтительный язык
   - Тип прогноза (daily/weekly/biweekly/monthly)
2. Получать персонализированный прогноз на языке пользователя
3. Сохранять в `content` поле таблицы `vector_forecasts`

---

## Миграция данных

### Запуск обновления:

```bash
cd backend
node run-vector-migration.js
```

### Что происходит:
1. Удаляются старые таблицы Vector Destiny
2. Создаются новые таблицы с обновленной структурой
3. Загружаются 20 вопросов (включая языковой)
4. Все индексы пересоздаются

---

## Проверка работы

### 1. Проверка вопросов:
```bash
psql -d brunotoken -c "SELECT membership_level, COUNT(*) FROM vector_questions GROUP BY membership_level;"
```
Результат:
```
 membership_level | count 
------------------+-------
 all              |     7
 GS-I             |    13
```

### 2. Проверка подписки:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/vector/subscription
```

### 3. Активация подписки:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"membership_level":"GS-I"}' \
  http://localhost:5000/api/vector/subscription/activate
```

---

## Обратная совместимость

⚠️ **BREAKING CHANGES:**

1. Старые подписки с trial/payment удалены
2. API эндпоинты trial/subscribe/cancel больше не существуют
3. Frontend компоненты нужно обновить:
   - Убрать экраны оплаты
   - Убрать trial период
   - Добавить автоматическую активацию при наличии GS

---

## Файлы изменений

### Созданные файлы:
- `backend/services/vectorDestiny/forecastScheduler.js` - новый планировщик
- `backend/run-vector-migration.js` - скрипт миграции
- `VECTOR_DESTINY_UPDATE.md` - эта документация

### Измененные файлы:
- `backend/migrations/006_create_vector_destiny_tables.sql` - обновленная миграция
- `backend/services/vectorDestiny/subscriptionService.js` - переработан
- `backend/routes/vectorDestiny.js` - обновлены эндпоинты
- `backend/server.js` - заменен billingScheduler на forecastScheduler

### Удаленные файлы:
- `backend/services/vectorDestiny/billingScheduler.js` - больше не нужен

---

## Статус

✅ **База данных** - обновлена  
✅ **Backend services** - переработаны  
✅ **API endpoints** - обновлены  
✅ **Scheduler** - заменен на forecast generator  
✅ **Вопросы** - добавлен языковой вопрос  
⏳ **Frontend** - требует обновления  
⏳ **ChatGPT интеграция** - требует реализации  

---

*Обновлено: 26 октября 2025, 00:20*  
*Автор: Cursor AI Assistant*

