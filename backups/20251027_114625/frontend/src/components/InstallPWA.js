import React, { useState, useEffect } from 'react';
import './InstallPWA.css';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли приложение
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled()) {
      return;
    }

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('💡 PWA install prompt ready');
    };

    // Слушаем событие установки
    const handleAppInstalled = () => {
      console.log('✅ PWA installed successfully!');
      setShowInstallButton(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('❌ Install prompt not available');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`👤 User response: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (isInstalled) {
    return (
      <div className="pwa-status installed">
        <span className="pwa-icon">✅</span>
        <span className="pwa-text">App Installed</span>
      </div>
    );
  }

  if (!showInstallButton) {
    return null;
  }

  return (
    <div className="pwa-install-container">
      <button className="pwa-install-btn" onClick={handleInstallClick}>
        <span className="pwa-icon">📱</span>
        <div className="pwa-text-content">
          <div className="pwa-title">Install Bruno Token</div>
          <div className="pwa-subtitle">Add to Home Screen</div>
        </div>
        <span className="pwa-arrow">→</span>
      </button>
    </div>
  );
};

export default InstallPWA;

