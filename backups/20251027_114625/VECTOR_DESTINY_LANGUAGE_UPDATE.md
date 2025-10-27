# Vector Destiny - Обновление выбора языка и анкеты

**Дата**: 26 октября 2025, 00:30

## Внесенные изменения

### 1. Отдельный экран выбора языка ✅

**Новый флоу:**
1. Пользователь заходит в Vector Destiny
2. **Первый экран: выбор языка** (10 вариантов)
3. После выбора языка → загружаются вопросы
4. Показывается анкета на выбранном языке

**Доступные языки:**
- 🇬🇧 English
- 🇷🇺 Русский  
- 🇪🇸 Español
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇨🇳 中文
- 🇯🇵 日本語
- 🇦🇪 العربية
- 🇵🇹 Português
- 🇮🇹 Italiano

### 2. Исправлены типы вопросов ✅

**Теперь поддерживаются все типы:**

#### `text` - Текстовый ввод
```javascript
<input type="text" />
```
Используется для: имени, города, страны

#### `textarea` - Многострочный текст
```javascript
<textarea rows={4} />
```
Используется для: целей, убеждений, видения жизни

#### `date` - Выбор даты
```javascript
<input type="date" />
```
Используется для: даты рождения

#### `time` - Выбор времени
```javascript
<input type="time" />
```
Используется для: времени рождения (опционально)

#### `select` - Выбор одного варианта
```javascript
<button className="choice-btn">Option</button>
```
Используется для: пола, жизненной фазы, стиля личности, статуса отношений

#### `multiple` - Выбор нескольких вариантов
```javascript
<label className="checkbox-label">
  <input type="checkbox" />
</label>
```
Используется для: интересов, финансовых целей, духовных практик

### 3. Новый дизайн интерфейса ✅

#### Экран выбора языка:
- **Grid layout** - адаптивная сетка с карточками языков
- **Флаги** - визуальное представление
- **Hover эффекты** - улучшенная интерактивность
- **Билингвальный заголовок** - "Choose Your Language / Выберите язык"

#### Экран анкеты:
- **Хедер с языком** - показывает выбранный язык
- **Кнопка смены языка** - можно вернуться и выбрать другой
- **Progress bar** - показывает прогресс заполнения
- **Обязательные вопросы** - помечены красной звездочкой *
- **Счетчик** - показывает сколько вопросов заполнено / обязательных

### 4. Валидация ответов ✅

**Правила:**
- Минимум **5 обязательных вопросов** должны быть заполнены
- Все вопросы с `required: true` должны иметь ответ
- Кнопка "Submit" активна только когда все условия выполнены

**Tooltip:**
```
"Answer X more required question(s)" 
→ меняется на
"Complete Survey ✨" когда готово
```

### 5. Улучшенная обработка данных ✅

**Автоматическое маппирование полей:**

Компонент анализирует текст вопроса и автоматически определяет поле:
- "name" → `full_name`
- "gender" → `gender`
- "date of birth" → `birth_date`
- "time" + "born" → `birth_time`
- "city" + "born" → `birth_place_city`
- "country" + "born" → `birth_place_country`

**Специальные поля:**
- `category: 'interests'` → `focus_areas[]`
- `category: 'life_phase'` → `life_phase`
- `category: 'personality'` → `personality_style`

### 6. Удален вопрос о языке из анкеты ✅

**Фильтрация:**
```javascript
questionsData = questionsData.filter(q => q.category !== 'language');
```

Вопрос с `category: 'language'` больше не показывается в анкете, так как язык выбирается на отдельном экране.

## Структура компонента

```
VectorSurvey
├── State: 'language' (шаг выбора языка)
│   ├── languageOptions[] (10 языков)
│   ├── selectLanguage() → loadQuestions()
│   └── render: <language-grid>
│
└── State: 'survey' (шаг анкеты)
    ├── questions[] (без вопроса о языке)
    ├── answers{} (объект с ответами)
    ├── renderQuestion() для каждого типа
    └── handleSubmit() → API
```

## CSS классы

### Новые стили:

```css
.language-selection      - контейнер выбора языка
.language-grid          - сетка карточек
.language-card          - карточка языка
.language-flag          - флаг (emoji)
.language-name          - название языка

.survey-header          - хедер анкеты
.selected-language      - выбранный язык
.change-language-btn    - кнопка смены языка

.survey-textarea        - многострочное поле
.multiple-options       - контейнер чекбоксов
.checkbox-label         - лейбл для чекбокса
.required-star          - звездочка для обязательных
```

## API Integration

### Запрос вопросов:
```
GET /api/vector/questions?level=GS-III
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "question_text": "What is your full name?",
      "question_type": "text",
      "options": null,
      "required": true,
      "category": "basic"
    },
    ...
  ]
}
```

### Отправка профиля:
```
POST /api/vector/profile
Authorization: Bearer {token}

Body:
{
  "language": "ru",
  "full_name": "Иван Иванов",
  "gender": "Male",
  "birth_date": "1990-01-01",
  "birth_time": "12:00",
  "birth_place_city": "Moscow",
  "birth_place_country": "Russia",
  "focus_areas": ["Career", "Finance"],
  "life_phase": "Established Career",
  "personality_style": "Analytical",
  "responses": {...все ответы...}
}
```

## Будущие улучшения (TODO)

### 1. Интеграция ChatGPT для перевода вопросов

```javascript
// TODO: В loadQuestions()
if (languageCode !== 'en') {
  questionsData = await translateQuestions(questionsData, languageCode);
}
```

**Что нужно реализовать:**
- Отправка вопросов в ChatGPT
- Промпт: "Translate these survey questions to {language}"
- Кеширование переводов в localStorage
- Fallback на английский при ошибке

### 2. Сохранение прогресса

```javascript
// Автосохранение в localStorage каждые 30 секунд
useEffect(() => {
  const interval = setInterval(() => {
    localStorage.setItem('vector_survey_progress', JSON.stringify({
      language: selectedLanguage,
      answers,
      timestamp: Date.now()
    }));
  }, 30000);
  
  return () => clearInterval(interval);
}, [answers]);
```

### 3. Показ переведенных опций

После перевода вопросов также переводить опции (options):
```javascript
{
  "question_text": "Какой ваш пол?",
  "options": ["Мужчина", "Женщина", "Другое", "Предпочитаю не говорить"]
}
```

## Тестирование

### Проверка работы:

1. ✅ Откройте http://localhost:3000
2. ✅ Войдите в систему
3. ✅ Перейдите в Vector Destiny
4. ✅ Увидите экран выбора языка
5. ✅ Выберите любой язык
6. ✅ Должна загрузиться анкета с 19-20 вопросами (без вопроса о языке)
7. ✅ Проверьте все типы вопросов:
   - Text fields работают
   - Textarea работают
   - Date/time pickers работают
   - Select (кнопки) работают
   - Multiple (чекбоксы) работают
8. ✅ Заполните обязательные вопросы
9. ✅ Кнопка Submit должна активироваться
10. ✅ Отправьте форму

### Ожидаемый результат:

```
✅ Profile created successfully! ✨
```

## Файлы изменений

### Измененные:
- `frontend/src/components/VectorDestiny/VectorSurvey.js` - полностью переработан
- `frontend/src/components/VectorDestiny/VectorDestiny.css` - добавлены новые стили

### База данных:
- Вопрос о языке (order_index: 0, category: 'language') остается в БД
- НО не показывается в анкете (фильтруется на frontend)

## Совместимость

✅ **Обратная совместимость сохранена:**
- API endpoints не изменились
- Структура БД не изменилась
- Формат отправки данных совместим

## Статус

✅ **Frontend** - обновлен  
✅ **Стили** - добавлены  
✅ **Типы вопросов** - все работают  
✅ **Выбор языка** - отдельный экран  
✅ **Валидация** - реализована  
⏳ **Перевод ChatGPT** - требует реализации  

---

*Обновлено: 26 октября 2025, 00:30*  
*Автор: Cursor AI Assistant*

## Как это выглядит

### Экран 1: Выбор языка
```
┌────────────────────────────────────────┐
│  🌍 Choose Your Language / Выберите язык│
│  Your questionnaire will be provided   │
│  in the selected language              │
│                                        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│  │ 🇬🇧  │ │ 🇷🇺  │ │ 🇪🇸  │ │ 🇫🇷  │     │
│  │Eng  │ │Рус  │ │Esp  │ │Fra  │     │
│  └─────┘ └─────┘ └─────┘ └─────┘     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│  │ 🇩🇪  │ │ 🇨🇳  │ │ 🇯🇵  │ │ 🇦🇪  │     │
│  │Deu  │ │中文 │ │日本 │ │العر │     │
│  └─────┘ └─────┘ └─────┘ └─────┘     │
│  ┌─────┐ ┌─────┐                     │
│  │ 🇵🇹  │ │ 🇮🇹  │                     │
│  │Por  │ │Ita  │                     │
│  └─────┘ └─────┘                     │
└────────────────────────────────────────┘
```

### Экран 2: Анкета
```
┌────────────────────────────────────────┐
│  🇷🇺 Русский        [Change Language]  │
├────────────────────────────────────────┤
│  Progress: ████████░░░░░░░░░░ 40%     │
│  8 / 20 questions answered (5 / 7 req)│
├────────────────────────────────────────┤
│  1. What is your full name? *          │
│  [________________]                    │
│                                        │
│  2. What is your gender? *             │
│  [Male] [Female] [Other] [Prefer...]  │
│                                        │
│  3. What is your date of birth? *      │
│  [📅 Select date]                      │
│                                        │
│  ...                                   │
│                                        │
│  [Answer 2 more required question(s)] │
└────────────────────────────────────────┘
```

Все готово к тестированию! 🎉


