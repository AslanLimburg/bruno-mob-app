# 📱 Инструкция: Сборка Android APK для Bruno Token

## 🎯 Готовые APK файлы

### Автоматическая сборка через GitHub Actions

**Ссылка:** https://github.com/AslanLimburg/bruno-mob-app/actions

**Как скачать:**
1. Откройте страницу Actions
2. Нажмите на последний успешный build (зеленая галочка ✅)
3. Прокрутите вниз до раздела "Artifacts"
4. Скачайте `bruno-token-debug.apk`

**Автоматическая сборка запускается:**
- При каждом `git push` в ветку `main`
- Вручную на странице Actions (кнопка "Run workflow")

---

## 📲 Установка APK на Android

### Вариант 1: Прямая установка на устройстве

1. Скачайте `bruno-token-debug.apk` на Android устройство
2. Откройте файл в файловом менеджере
3. Если система попросит, разрешите установку из неизвестных источников:
   - **Settings** → **Security** → **Unknown sources** (включить)
   - Или разрешить для конкретного приложения (Chrome/Files)
4. Нажмите "Установить"
5. Готово! 🎉

### Вариант 2: Через ADB (для разработчиков)

```bash
# Подключите Android устройство через USB
# Включите USB отладку на устройстве

adb devices  # Проверьте что устройство видно
adb install bruno-token-debug.apk
```

---

## 🔄 Обновление приложения

Каждый раз когда вы обновляете код:

```bash
cd /Users/user/Desktop/bt
git add .
git commit -m "Update app"
git push origin main
```

GitHub Actions автоматически соберет новый APK!

---

## 🏗️ Локальная сборка (если нужно)

### Требования:
- Node.js 18+
- Java 17
- Android SDK

### Команды:

```bash
cd /Users/user/Desktop/bt/frontend

# 1. Установите зависимости
npm install

# 2. Соберите React приложение
npm run build

# 3. Синхронизируйте с Capacitor
npx cap sync android

# 4. Соберите APK
cd android
./gradlew assembleDebug

# APK будет здесь:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📦 Типы APK

### Debug APK
- **Файл:** `bruno-token-debug.apk`
- **Для чего:** Тестирование и разработка
- **Подпись:** Автоматическая debug-подпись
- **Можно установить:** ✅ Да, сразу

### Release APK (unsigned)
- **Файл:** `bruno-token-release-unsigned.apk`
- **Для чего:** Подготовка для Google Play
- **Подпись:** ❌ Нет (нужно подписать)
- **Можно установить:** ❌ Нет, сначала подпишите

---

## 🔐 Подписание Release APK для Google Play

Для загрузки в Google Play Store нужен подписанный Release APK:

### 1. Создайте keystore

```bash
keytool -genkey -v -keystore bruno-token.keystore \
  -alias bruno-token -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Обновите `android/app/build.gradle`

```gradle
android {
    signingConfigs {
        release {
            storeFile file("path/to/bruno-token.keystore")
            storePassword "YOUR_STORE_PASSWORD"
            keyAlias "bruno-token"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Соберите подписанный APK

```bash
cd frontend/android
./gradlew assembleRelease
```

Подписанный APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🚀 Публикация в Google Play Store

1. Создайте аккаунт разработчика: https://play.google.com/console
   - Стоимость: $25 (один раз)

2. Создайте новое приложение в консоли

3. Заполните обязательные данные:
   - Название приложения
   - Краткое описание
   - Полное описание
   - Скриншоты (минимум 2)
   - Иконка приложения (512x512px)
   - Feature graphic (1024x500px)

4. Загрузите подписанный APK в раздел "Production"

5. Отправьте на модерацию

**Время модерации:** 1-7 дней

---

## 📱 Текущая конфигурация

- **App ID:** `com.brunotoken.app`
- **App Name:** `Bruno Token`
- **Package:** `com.brunotoken.app`
- **Backend API:** `https://brunotoken.com/api`
- **Min SDK:** 22 (Android 5.1)
- **Target SDK:** 33 (Android 13)

---

## 🆘 Проблемы и решения

### APK не устанавливается
- ✅ Включите "Неизвестные источники" в настройках
- ✅ Удалите старую версию если есть
- ✅ Проверьте что файл скачался полностью

### GitHub Actions сборка падает
- ✅ Проверьте логи: https://github.com/AslanLimburg/bruno-mob-app/actions
- ✅ Убедитесь что все зависимости установлены
- ✅ Проверьте что `package.json` корректный

### Приложение крашится после установки
- ✅ Проверьте что backend работает: https://brunotoken.com/api
- ✅ Проверьте логи через `adb logcat`
- ✅ Пересоберите с флагом `--clean`

---

## 📞 Поддержка

Если возникли вопросы или проблемы:
1. Проверьте логи GitHub Actions
2. Проверьте что backend работает
3. Напишите мне с описанием проблемы

---

## ✅ Checklist для релиза

- [ ] Backend работает на `https://brunotoken.com`
- [ ] Frontend собирается без ошибок
- [ ] APK устанавливается на Android
- [ ] Все функции работают
- [ ] Нет критических багов
- [ ] Добавлена кнопка "Delete Account"
- [ ] Протестировано на нескольких устройствах
- [ ] Создан keystore для подписи
- [ ] APK подписан для релиза
- [ ] Подготовлены скриншоты для Google Play
- [ ] Написано описание приложения
- [ ] Готова иконка 512x512px

---

**Версия:** 1.0.0  
**Последнее обновление:** 27 октября 2025  
**Repository:** https://github.com/AslanLimburg/bruno-mob-app

