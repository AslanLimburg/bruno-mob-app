# OpenAI Translation Setup для Vector Destiny

## Как работает перевод

### 🌍 Автоматический перевод вопросов

Когда пользователь выбирает язык:
1. Frontend отправляет запрос: `GET /api/vector/questions?level=GS-I&language=ru`
2. Backend загружает вопросы из базы (на английском)
3. **OpenAI переводит каждый вопрос** на выбранный язык
4. Переведенные вопросы отправляются пользователю
5. Кэшируются в памяти для быстрой повторной загрузки

### 📊 Поддерживаемые языки

- 🇬🇧 English (en) - оригинал, без перевода
- 🇷🇺 Русский (ru) - переводится через ChatGPT
- 🇪🇸 Español (es) - переводится через ChatGPT
- 🇫🇷 Français (fr) - переводится через ChatGPT
- 🇩🇪 Deutsch (de) - переводится через ChatGPT
- 🇨🇳 中文 (zh) - переводится через ChatGPT
- 🇯🇵 日本語 (ja) - переводится через ChatGPT
- 🇦🇪 العربية (ar) - переводится через ChatGPT
- 🇵🇹 Português (pt) - переводится через ChatGPT
- 🇮🇹 Italiano (it) - переводится через ChatGPT

---

## Настройка OpenAI API

### Шаг 1: Получить API ключ

1. Перейдите на https://platform.openai.com/
2. Зарегистрируйтесь или войдите
3. Перейдите в **API Keys**: https://platform.openai.com/api-keys
4. Нажмите **"Create new secret key"**
5. Скопируйте ключ (он показывается только один раз!)

### Шаг 2: Добавить ключ в проект

Откройте файл `backend/.env` и добавьте:

```bash
OPENAI_API_KEY=sk-proj-ваш-ключ-здесь
```

### Шаг 3: Перезапустить сервер

```bash
cd backend
npm start
```

---

## Как это работает в коде

### Backend: translationService.js

```javascript
// Перевод одного вопроса
const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",  // Быстрая и дешевая модель
    messages: [
        {
            role: "system",
            content: "You are a professional translator. Translate to Russian. Provide ONLY the translation."
        },
        {
            role: "user",
            content: "What is your full name?"
        }
    ],
    temperature: 0.3,
    max_tokens: 200
});

// Результат: "Как ваше полное имя?"
```

### Кэширование

**В памяти сервера:**
```javascript
translationCache.set('ru:What is your full name?', 'Как ваше полное имя?');
```

Повторные запросы используют кэш → **мгновенный ответ** ⚡

### Batch перевод

Вопросы переводятся **батчами по 5 штук** для оптимизации:
```javascript
Batch 1: Questions 1-5   → переводятся параллельно
Batch 2: Questions 6-10  → переводятся параллельно
Batch 3: Questions 11-15 → переводятся параллельно
Batch 4: Questions 16-20 → переводятся параллельно
```

---

## Пример перевода

### Английский (оригинал):
```json
{
  "question_text": "What are your main areas of interest?",
  "options": ["Career", "Relationships", "Health", "Finance", "Personal Growth"]
}
```

### Русский (переведено ChatGPT):
```json
{
  "question_text": "Каковы ваши основные области интересов?",
  "options": ["Карьера", "Отношения", "Здоровье", "Финансы", "Личностный рост"]
}
```

### Арабский (переведено ChatGPT):
```json
{
  "question_text": "ما هي مجالات اهتمامك الرئيسية؟",
  "options": ["المهنة", "العلاقات", "الصحة", "المالية", "النمو الشخصي"]
}
```

---

## Без OpenAI ключа

Если `OPENAI_API_KEY` не настроен:
- ✅ Сервис продолжит работать
- ⚠️ Вопросы останутся на английском
- ℹ️ Никаких ошибок не будет
- 💡 В логах: "Translation skipped - no API key"

**Код:**
```javascript
if (!process.env.OPENAI_API_KEY) {
    return text; // Возвращаем оригинал
}
```

---

## Стоимость перевода

### GPT-4o-mini pricing (январь 2024):
- **Input**: $0.150 / 1M tokens
- **Output**: $0.600 / 1M tokens

### Расчет для Vector Destiny:

**20 вопросов + опции ≈ 500 tokens**
- Перевод на 1 язык: ~$0.0003 (0.03 цента)
- 1000 пользователей: ~$0.30
- **Очень дешево!** 💰

### Кэш экономит деньги:
Первый пользователь платит $0.0003, остальные 999 получают из кэша → **бесплатно!**

---

## Мониторинг переводов

### В логах сервера:

```
🌍 Translating 20 questions to ru...
📝 Question 1: What is your full name? → Как ваше полное имя?
📝 Question 2: What is your gender? → Какой у вас пол?
...
✅ Translation complete
```

### API эндпоинт для статистики кэша:

```bash
GET /api/vector/translation/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cached_translations": 150,
    "languages": ["ru", "es", "fr", "de", "zh"]
  }
}
```

---

## Fallback стратегия

Если перевод не удался:
1. **Первая попытка** - ChatGPT перевод
2. **Если ошибка** - возврат оригинала на английском
3. **В логах** - запись об ошибке
4. **Пользователь** - видит английский текст (лучше чем ничего)

---

## Расширенный функционал (в будущем)

### 1. Сохранение переводов в БД

Добавить таблицу `vector_question_translations`:
```sql
CREATE TABLE vector_question_translations (
    question_id INT REFERENCES vector_questions(id),
    language_code VARCHAR(10),
    question_text TEXT,
    options JSONB,
    PRIMARY KEY (question_id, language_code)
);
```

### 2. Админ панель для проверки переводов

**Эндпоинт**: `GET /api/admin/vector/translations`

Позволит модераторам:
- Просматривать все переводы
- Редактировать некорректные переводы
- Очищать кэш

### 3. Контекстный перевод

Учитывать контекст астрологии:
```javascript
const systemPrompt = `You are translating an astrological questionnaire. 
Use appropriate astrological terminology in ${language}.
Translate professionally and naturally.`;
```

---

## Текущий статус

✅ **translationService.js** - создан  
✅ **Backend routes** - обновлены  
✅ **Frontend** - обновлен (передает язык)  
✅ **Кэширование** - реализовано  
✅ **Batch обработка** - реализована  
⏳ **OpenAI ключ** - нужно добавить в `.env`  

---

## Быстрый старт

### 1. Добавьте в `backend/.env`:
```bash
OPENAI_API_KEY=sk-proj-ваш-ключ
```

### 2. Перезапустите backend:
```bash
cd backend
npm start
```

### 3. Проверьте:
1. Откройте http://localhost:3000
2. Перейдите в Vector Destiny
3. Выберите Русский 🇷🇺
4. Вопросы должны быть **на русском**! ✨

---

## Что произойдет после добавления ключа

### БЕЗ ключа (сейчас):
```
User selects Russian 🇷🇺
↓
Backend: "Translation skipped - no API key"
↓
Questions in English ❌
```

### С ключом (после настройки):
```
User selects Russian 🇷🇺
↓
Backend: "🌍 Translating 20 questions to ru..."
Backend: "Calling OpenAI API..."
Backend: "✅ Translation complete"
↓
Questions in Russian ✅
```

---

*Создано: 26 октября 2025, 00:35*  
*Автор: Cursor AI Assistant*

**Добавьте OpenAI ключ и перевод заработает автоматически!** 🚀

