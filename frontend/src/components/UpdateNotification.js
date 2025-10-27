// PWA Update Notification Component
import React, { useState, useEffect } from 'react';
import './UpdateNotification.css';

const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    // Слушаем событие обновления
    const onServiceWorkerUpdate = (event) => {
      const { detail } = event;
      if (detail && detail.waiting) {
        setWaitingWorker(detail.waiting);
        setShowUpdate(true);
        console.log('🔄 New version available!');
      }
    };

    window.addEventListener('swUpdate', onServiceWorkerUpdate);

    // Проверяем обновления каждые 60 секунд
    const checkInterval = setInterval(() => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    }, 60000); // 60 секунд

    return () => {
      window.removeEventListener('swUpdate', onServiceWorkerUpdate);
      clearInterval(checkInterval);
    };
  }, []);

  const updateApp = () => {
    if (waitingWorker) {
      // Отправляем сообщение service worker'у чтобы он активировался
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Перезагружаем страницу после активации
      waitingWorker.addEventListener('statechange', (e) => {
        if (e.target.state === 'activated') {
          console.log('✅ App updated! Reloading...');
          window.location.reload();
        }
      });
    }
  };

  const dismissUpdate = () => {
    setShowUpdate(false);
    // Напомнить через 5 минут
    setTimeout(() => {
      if (waitingWorker) {
        setShowUpdate(true);
      }
    }, 5 * 60 * 1000);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="update-notification">
      <div className="update-content">
        <div className="update-icon">🔄</div>
        <div className="update-message">
          <h3>New Version Available!</h3>
          <p>A new version of Bruno Token is ready. Update now to get the latest features.</p>
        </div>
        <div className="update-actions">
          <button onClick={updateApp} className="btn-update">
            Update Now
          </button>
          <button onClick={dismissUpdate} className="btn-dismiss">
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

