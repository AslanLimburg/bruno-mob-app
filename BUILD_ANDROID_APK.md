# 📱 КАК СОБРАТЬ ANDROID APK

## ✅ ЧТО УЖЕ СДЕЛАНО:

1. ✅ Capacitor установлен
2. ✅ Android проект создан
3. ✅ Иконки сгенерированы (все размеры)
4. ✅ Splash screen настроен
5. ✅ Production build собран
6. ✅ Функция DELETE ACCOUNT добавлена
7. ✅ Проект синхронизирован с Android

---

## 🔧 ВАРИАНТ 1: ANDROID STUDIO (Рекомендуется)

### Шаг 1: Открыть проект

```bash
cd /Users/user/Desktop/bt/frontend
npx cap open android
```

Это откроет Android Studio.

### Шаг 2: В Android Studio

1. Подождите, пока Gradle Sync завершится (первый раз может занять 5-10 минут)
2. В меню выберите: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Подождите окончания сборки
4. Нажмите на уведомление **"locate"** чтобы найти APK

**APK будет в:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔧 ВАРИАНТ 2: GRADLE ИЗ КОМАНДНОЙ СТРОКИ (Быстрее)

### Требования:
- Java JDK 17+ установлен
- Android SDK установлен

### Команды:

```bash
cd /Users/user/Desktop/bt/frontend/android

# Сборка DEBUG APK (для тестирования)
./gradlew assembleDebug

# APK будет в:
# app/build/outputs/apk/debug/app-debug.apk

# Сборка RELEASE APK (для публикации)
./gradlew assembleRelease

# APK будет в:
# app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 🔧 ВАРИАНТ 3: ЕСЛИ НЕТ ANDROID STUDIO

### Установка Android Command Line Tools:

```bash
# 1. Скачайте Android Command Line Tools:
# https://developer.android.com/studio#command-tools

# 2. Распакуйте в ~/android-sdk

# 3. Установите SDK:
cd ~/android-sdk/cmdline-tools/bin
./sdkmanager --sdk_root=$HOME/android-sdk "platform-tools" "platforms;android-33" "build-tools;33.0.0"

# 4. Установите переменные окружения:
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 5. Соберите APK:
cd /Users/user/Desktop/bt/frontend/android
./gradlew assembleDebug
```

---

## 📦 ДЛЯ GOOGLE PLAY / APPGALLERY (AAB формат)

```bash
cd /Users/user/Desktop/bt/frontend/android

# Сборка AAB (Android App Bundle)
./gradlew bundleRelease

# AAB будет в:
# app/build/outputs/bundle/release/app-release.aab
```

---

## 🔑 ПОДПИСЬ APK/AAB (Для публикации)

### 1. Создайте keystore:

```bash
keytool -genkey -v -keystore bruno-token.keystore -alias bruno-token -keyalg RSA -keysize 2048 -validity 10000

# Введите пароль (запомните его!)
# Ответьте на вопросы (имя, организация, город, и т.д.)
```

### 2. Создайте `android/key.properties`:

```properties
storePassword=ваш_пароль
keyPassword=ваш_пароль
keyAlias=bruno-token
storeFile=../bruno-token.keystore
```

### 3. Обновите `android/app/build.gradle`:

Найдите блок `android {` и добавьте **ДО** `buildTypes`:

```gradle
signingConfigs {
    release {
        def keystorePropertiesFile = rootProject.file("key.properties")
        def keystoreProperties = new Properties()
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
```

Затем в `buildTypes { release {` добавьте:

```gradle
signingConfig signingConfigs.release
```

### 4. Соберите подписанный APK/AAB:

```bash
# Подписанный APK:
./gradlew assembleRelease

# Подписанный AAB:
./gradlew bundleRelease
```

---

## 📲 УСТАНОВКА НА ТЕЛЕФОН

### Через USB:

```bash
# 1. Включите Developer Mode и USB Debugging на телефоне
# 2. Подключите телефон через USB
# 3. Разрешите USB Debugging на телефоне

# 4. Установите APK:
adb install app/build/outputs/apk/debug/app-debug.apk

# Или через Android Studio: Run → Run 'app'
```

### Через файл:

1. Скопируйте `app-debug.apk` на телефон (например, через Telegram)
2. Откройте файл на телефоне
3. Разрешите установку из неизвестных источников
4. Установите

---

## 🚀 ПУБЛИКАЦИЯ В GOOGLE PLAY

### Требования:
- Google Play Console аккаунт ($25 одноразово)
- Подписанный AAB файл
- Privacy Policy URL
- Скриншоты приложения (минимум 2)
- Описание приложения
- Иконка 512x512

### Шаги:
1. Зайдите в https://play.google.com/console
2. Создайте новое приложение
3. Заполните информацию о приложении
4. Загрузите AAB в раздел "Production"
5. Заполните форму контента
6. Отправьте на проверку

**Проверка занимает 1-7 дней.**

---

## 🚀 ПУБЛИКАЦИЯ В APPGALLERY (HUAWEI)

### Требования:
- Huawei Developer аккаунт (БЕСПЛАТНО)
- Подписанный APK или AAB
- Privacy Policy URL
- Скриншоты
- Описание

### Шаги:
1. Зайдите в https://developer.huawei.com/consumer/en/console
2. Зарегистрируйтесь (бесплатно)
3. Создайте приложение
4. Загрузите APK/AAB
5. Заполните информацию
6. Отправьте на проверку

**Проверка занимает 1-3 дня.**

---

## 🎯 ТЕКУЩИЕ НАСТРОЙКИ ПРИЛОЖЕНИЯ:

- **App ID:** `com.brunotoken.app`
- **App Name:** `Bruno Token`
- **Server URL:** `https://brunotoken.com`
- **Version:** 0.1.0 (будет из package.json)
- **Min SDK:** 22 (Android 5.1+)
- **Target SDK:** 33 (Android 13)

---

## 📝 ПРИМЕЧАНИЯ:

1. **Debug APK** можно устанавливать сразу для тестирования
2. **Release APK/AAB** нужно подписывать для публикации
3. **AAB** предпочтительнее для Google Play (меньше размер)
4. **APK** подходит для AppGallery и прямой установки
5. Первая сборка может занять 10-15 минут (скачивание зависимостей)

---

## ❓ ПРОБЛЕМЫ?

### "Java not found"
```bash
# Установите Java JDK 17:
brew install openjdk@17

# Добавьте в ~/.zshrc:
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

### "Android SDK not found"
```bash
# Установите Android Studio:
# https://developer.android.com/studio

# Или только Command Line Tools (см. Вариант 3)
```

### "Gradle sync failed"
```bash
# Очистите кэш:
cd android
./gradlew clean

# Попробуйте снова:
./gradlew assembleDebug
```

---

**Удачной сборки! 🚀**

