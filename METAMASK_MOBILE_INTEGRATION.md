# 📱 Интеграция MetaMask в мобильном приложении

## ✅ Что реализовано:

### 1. Новый helper модуль:
**Файл:** `frontend/src/utils/metamaskHelper.js`

**Функции:**
- `isMobileDevice()` - Определяет мобильное устройство
- `openMetaMaskMobile()` - Открывает MetaMask в мобильном приложении
- `connectMetaMask()` - Подключается к MetaMask (с поддержкой мобильных)
- Deep links для Android и iOS

### 2. Обновлен WalletContext:
**Файл:** `frontend/src/contexts/WalletContext.js`

**Изменения:**
- Добавлена поддержка мобильных устройств
- Автоматическое определение мобильного устройства
- Интеграция с `metamaskHelper.js`

---

## 🎯 Как это работает:

### На Android:
```javascript
window.location.href = `intent://metamask.app.link/dapp/${url}#Intent;scheme=https;end`;
```

### На iOS:
```javascript
window.location.href = `https://metamask.app.link/dapp/${url}`;
```

### Fallback (если MetaMask не установлен):
Откроется страница скачивания MetaMask

---

## 📱 Пользовательский опыт:

### Сценарий 1: MetaMask установлен на телефоне
1. Пользователь нажимает "Connect MetaMask" в Send/Swap
2. Приложение автоматически открывает MetaMask
3. Пользователь подтверждает подключение
4. Возвращается обратно в Bruno Token app
5. Wallet подключен! ✅

### Сценарий 2: MetaMask не установлен
1. Пользователь нажимает "Connect MetaMask"
2. Открывается страница Play Store/App Store
3. Пользователь устанавливает MetaMask
4. Возвращается и снова нажимает "Connect"
5. Теперь работает по Сценарию 1! ✅

---

## 🔧 Технические детали:

### Deep Links:
- **Android Intent:** `intent://metamask.app.link/dapp/...`
- **iOS Universal Link:** `https://metamask.app.link/dapp/...`
- **Fallback:** Страница установки MetaMask

### Определение устройства:
```javascript
/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
```

### Проверка MetaMask:
```javascript
typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
```

---

## 🚀 Как использовать:

### В компонентах Send/Swap:

```javascript
import { useWallet } from '../contexts/WalletContext';

const MyComponent = () => {
  const { connectWallet, isConnecting, error, address } = useWallet();

  const handleConnect = async () => {
    try {
      await connectWallet();
      // Wallet connected successfully
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  return (
    <button onClick={handleConnect}>
      {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  );
};
```

---

## 📋 Функции в metamaskHelper:

| Функция | Описание |
|---------|----------|
| `isMobileDevice()` | Проверяет мобильное устройство |
| `openMetaMaskMobile()` | Открывает MetaMask app |
| `connectMetaMask()` | Подключается к MetaMask |
| `sendTransaction()` | Отправляет транзакцию |
| `signMessage()` | Подписывает сообщение |
| `getBalance()` | Получает баланс |
| `switchNetwork()` | Переключает сеть |
| `addNetwork()` | Добавляет сеть |

---

## ⚠️ Важные замечания:

1. **MetaMask должен быть установлен** на мобильном устройстве
2. **Deep links** работают только если MetaMask app установлен
3. **Fallback** всегда должен быть (открытие Play Store/App Store)
4. **User experience:** Показывайте состояние загрузки при переключении между apps

---

## 🧪 Тестирование:

### На Android:
1. Установите MetaMask из Play Store
2. Запустите Bruno Token app
3. Попробуйте "Connect MetaMask"
4. Должно автоматически открыться MetaMask
5. Подтвердите подключение
6. Вернитесь в Bruno Token

### На iOS:
1. Установите MetaMask из App Store
2. Запустите Bruno Token app
3. Попробуйте "Connect MetaMask"
4. Должно автоматически открыться MetaMask
5. Подтвердите подключение
6. Вернитесь в Bruno Token

---

## 🔗 Полезные ссылки:

- MetaMask Mobile App: https://metamask.io/mobile/
- Deep Link Documentation: https://docs.metamask.io/wallet/reference/rpc-api/
- Intent URLs: https://developer.chrome.com/docs/multidevice/android/intents/

---

## 📝 TODO (если нужно):

- [ ] Добавить обработку возврата из MetaMask app
- [ ] Добавить timeout для подключения
- [ ] Улучшить fallback (показать QR код для WalletConnect)
- [ ] Добавить поддержку Trust Wallet
- [ ] Добавить поддержку WalletConnect протокола

---

**Версия:** 1.0.0  
**Дата:** 27 октября 2025  
**Статус:** ✅ Готово к тестированию

