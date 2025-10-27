# ✅ KYC Верификация документов - ИСПРАВЛЕНО!

**Дата**: 27 октября 2025, 10:50  
**Статус**: Работает!

---

## 🔴 ПРОБЛЕМА

**Что было:**
- ❌ Таблица `verification_documents` не существовала
- ❌ Загрузка документов не работала
- ❌ Ошибка: "relation verification_documents does not exist"
- ❌ S3 не настроен (Cloudinary not configured)

---

## ✅ РЕШЕНИЕ

### 1. Создана таблица в БД

**Файл:** `backend/migrations/007_create_verification_documents.sql`

**Структура таблицы:**
```sql
CREATE TABLE verification_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  document_type VARCHAR(50) NOT NULL,
  document_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Поля:**
- `user_id` - ID пользователя
- `document_type` - тип документа (passport, id_card, driver_license, proof_of_address, selfie)
- `document_url` - путь к файлу
- `status` - статус (pending, approved, rejected)
- `uploaded_at` - дата загрузки
- `reviewed_at` - дата проверки
- `reviewed_by` - кто проверил (admin ID)
- `rejection_reason` - причина отклонения
- `notes` - заметки админа

### 2. Обновлен documentController

**Изменения:**
- ✅ Удалена зависимость от S3
- ✅ Добавлено локальное хранилище файлов
- ✅ Автоматическое создание директории `uploads/verification/`
- ✅ Генерация уникальных имен файлов
- ✅ Сохранение в БД

**Путь к файлам:** `backend/uploads/verification/`

### 3. Создан скрипт миграции

**Файл:** `backend/run-verification-migration.js`

**Запуск:**
```bash
cd backend
node run-verification-migration.js
```

**Результат:**
- ✅ Таблица создана
- ✅ Индексы добавлены
- ✅ Триггеры настроены

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
backend/
  ├── migrations/
  │   └── 007_create_verification_documents.sql ← НОВОЕ
  ├── controllers/
  │   └── documentController.js ← ОБНОВЛЕН
  ├── uploads/
  │   └── verification/ ← СОЗДАНО
  │       ├── doc-5-1730025600000.jpg
  │       ├── doc-7-1730025700000.pdf
  │       └── ...
  └── run-verification-migration.js ← НОВОЕ
```

---

## 🎯 КАК ЭТО РАБОТАЕТ

### Пользователь (Frontend):

```
1. Dashboard → KYC Badge (🟡 или ⚪)
2. Кликает на KYC → /verification
3. Выбирает тип документа:
   - Passport
   - ID Card
   - Driver License
   - Proof of Address
   - Selfie
4. Загружает файл (JPG, PNG, PDF до 10 MB)
5. Нажимает "Upload"
6. Статус: "Pending" (🟡)
```

### Backend:

```
1. Получает файл через multer
2. Валидирует тип и размер
3. Сохраняет в uploads/verification/
4. Записывает в БД:
   - user_id
   - document_type
   - document_url
   - status: 'pending'
5. Возвращает success
```

### Super Admin:

```
1. Super Admin Panel
2. Вкладка "KYC Management"
3. Видит список pending документов
4. Просматривает документ
5. Approve или Reject
6. Вводит причину (если Reject)
7. Статус обновляется в БД
8. Пользователь видит результат
```

---

## 🔐 ТИПЫ ДОКУМЕНТОВ

### Поддерживаемые:

1. **Passport** (паспорт)
   - Главная страница с фото
   - Страница с регистрацией

2. **ID Card** (удостоверение личности)
   - Обе стороны

3. **Driver License** (водительские права)
   - Обе стороны

4. **Proof of Address** (подтверждение адреса)
   - Utility bill (счет за коммунальные)
   - Bank statement (выписка)
   - Lease agreement (договор аренды)

5. **Selfie** (селфи с документом)
   - Фото пользователя с паспортом

---

## 📊 СТАТУСЫ ВЕРИФИКАЦИИ

| Статус | Badge | Описание |
|--------|-------|----------|
| **not_started** | ⚪ | Не начата |
| **pending** | 🟡 | На проверке |
| **approved** | 🟢 | Одобрено |
| **rejected** | 🔴 | Отклонено |

---

## 🔍 API ENDPOINTS

### User Endpoints:

```http
POST /api/upload/document
Headers: Authorization: Bearer {token}
Body: FormData
  - document: File
  - documentType: String

GET /api/upload/documents
Headers: Authorization: Bearer {token}
Response: { documents: [...] }

GET /api/upload/verification/status
Headers: Authorization: Bearer {token}
Response: { status, stats, documents }
```

### Admin Endpoints:

```http
GET /api/upload/admin/documents/pending
Headers: Authorization: Bearer {token}
Response: { documents: [...] }

PUT /api/upload/admin/document/:documentId/approve
Headers: Authorization: Bearer {token}
Response: { message: "approved" }

PUT /api/upload/admin/document/:documentId/reject
Headers: Authorization: Bearer {token}
Body: { reason: String }
Response: { message: "rejected" }
```

---

## 💾 ХРАНИЛИЩЕ ФАЙЛОВ

### Локальное (по умолчанию):

```
backend/uploads/verification/
  ├── doc-5-1730025600000.jpg
  ├── doc-7-1730025700000.pdf
  └── doc-12-1730025800000.png
```

**Формат имени:**
```
doc-{userId}-{timestamp}{ext}
```

**URL доступа:**
```
http://localhost:5000/uploads/verification/doc-5-1730025600000.jpg
```

### S3 (опционально):

Если настроите S3 в `.env`:
```
S3_ENDPOINT=...
S3_REGION=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET_NAME=...
S3_PUBLIC_URL=...
```

Тогда файлы будут загружаться в S3.

---

## 📝 ФОРМАТ ДАННЫХ

### Загруженный документ в БД:

```json
{
  "id": 1,
  "user_id": 5,
  "document_type": "passport",
  "document_url": "/uploads/verification/doc-5-1730025600000.jpg",
  "status": "pending",
  "uploaded_at": "2025-10-27T10:50:00Z",
  "reviewed_at": null,
  "reviewed_by": null,
  "rejection_reason": null,
  "notes": null
}
```

### После проверки (approved):

```json
{
  "id": 1,
  "user_id": 5,
  "document_type": "passport",
  "document_url": "/uploads/verification/doc-5-1730025600000.jpg",
  "status": "approved",
  "uploaded_at": "2025-10-27T10:50:00Z",
  "reviewed_at": "2025-10-27T11:00:00Z",
  "reviewed_by": 1,
  "rejection_reason": null,
  "notes": "Document verified successfully"
}
```

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Multer конфигурация:

```javascript
// middleware/upload.js
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('document');
```

### Разрешенные типы файлов:

- image/jpeg
- image/png
- image/gif
- application/pdf
- application/msword (.doc)
- application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)

### Максимальный размер:

- **10 MB** на файл

---

## ✅ ПРОВЕРКА

### Шаг 1: Обновите браузер
```
http://localhost:3000
Cmd + Shift + R
```

### Шаг 2: Перейдите в KYC
```
Dashboard → KYC Badge (⚪ или 🟡)
```

### Шаг 3: Загрузите документ
```
1. Выберите тип документа (Passport)
2. Choose File
3. Выберите фото паспорта
4. Upload
5. Должно быть: "Document uploaded successfully" ✅
```

### Шаг 4: Проверьте в Super Admin
```
Super Admin Panel → KYC Management
Должен появиться ваш документ со статусом "Pending" ✅
```

---

## 🎨 UI ФЛОУ

### User Side:

```
┌────────────────────────────────────┐
│  KYC/AML Verification              │
├────────────────────────────────────┤
│  Document Type:                    │
│  [Passport ▼]                      │
│                                    │
│  [Choose File] document.jpg        │
│                                    │
│  [Upload Document]                 │
├────────────────────────────────────┤
│  Your Documents:                   │
│  • Passport - Pending 🟡           │
│  • ID Card - Approved 🟢           │
└────────────────────────────────────┘
```

### Admin Side:

```
┌────────────────────────────────────┐
│  KYC Management                    │
├────────────────────────────────────┤
│  Pending Documents (3)             │
│                                    │
│  User: john@test.com               │
│  Type: Passport                    │
│  Date: 2025-10-27                  │
│  [View] [Approve] [Reject]         │
├────────────────────────────────────┤
│  User: alice@test.com              │
│  Type: ID Card                     │
│  Date: 2025-10-27                  │
│  [View] [Approve] [Reject]         │
└────────────────────────────────────┘
```

---

## 🐛 ИСПРАВЛЕННЫЕ ОШИБКИ

1. ✅ **Таблица не существовала**
   - Создана через миграцию
   - Все поля настроены
   - Индексы добавлены

2. ✅ **S3 не настроен**
   - Переключено на локальное хранилище
   - Автоматическое создание директории
   - Работает без дополнительной настройки

3. ✅ **Файлы не сохранялись**
   - fs.writeFileSync() для локального хранения
   - Уникальные имена файлов
   - Доступ через /uploads/verification/

---

## 🚀 ГОТОВО К ИСПОЛЬЗОВАНИЮ

**Откройте:**
```
http://localhost:3000/verification
```

**ИЛИ:**
```
Dashboard → Нажмите на KYC Badge
```

**Попробуйте загрузить:**
1. Фото паспорта (JPG/PNG)
2. ИЛИ PDF документ
3. Должно работать! ✅

---

## 📋 ФАЙЛЫ

**Созданные:**
1. `migrations/007_create_verification_documents.sql` - миграция БД
2. `run-verification-migration.js` - скрипт миграции
3. `uploads/verification/` - директория для файлов

**Обновленные:**
4. `controllers/documentController.js` - локальное хранилище

---

## 🎉 РЕЗУЛЬТАТ

**KYC/AML Verification теперь:**
- ✅ Таблица создана
- ✅ Загрузка работает (локально)
- ✅ Типы документов: 5 видов
- ✅ Форматы: JPG, PNG, PDF, DOC
- ✅ Лимит: 10 MB
- ✅ Админ панель готова
- ✅ Статусы: pending/approved/rejected

**Готово к использованию! 🚀**

---

*Исправлено: 27.10.2025, 10:50*

