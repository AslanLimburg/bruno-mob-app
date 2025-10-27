import { WalletProvider } from './contexts/WalletContext';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { TronWalletProvider } from './contexts/TronWalletContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WalletProvider>
      <TronWalletProvider>
        <App />
      </TronWalletProvider>
    </WalletProvider>
  </React.StrictMode>
);

// Register PWA Service Worker
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('✅ PWA installed successfully!');
    console.log('📱 You can now install Bruno Token as an app!');
  },
  onUpdate: (registration) => {
    console.log('🔄 New version available! Please refresh.');
    // Можно показать уведомление пользователю
    if (window.confirm('New version available! Reload to update?')) {
      window.location.reload();
    }
  }
});

// Request notification permission on load
setTimeout(() => {
  if (window.Notification && Notification.permission === 'default') {
    serviceWorkerRegistration.requestNotificationPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('✅ Notifications enabled!');
      }
    });
  }
}, 3000);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
