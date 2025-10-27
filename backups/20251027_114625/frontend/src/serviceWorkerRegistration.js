// Bruno Token PWA - Service Worker Registration

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('🎉 PWA ready! App is being served cache-first by a service worker.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('✅ Service Worker registered successfully:', registration);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('🔄 New content is available; please refresh.');
              
              // Dispatch custom event для уведомления пользователя
              const event = new CustomEvent('swUpdate', {
                detail: { waiting: installingWorker }
              });
              window.dispatchEvent(event);
              
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log('✅ Content is cached for offline use.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('❌ Service Worker registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('📴 No internet connection. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('❌ Service Worker unregistration failed:', error);
      });
  }
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    return Notification.requestPermission().then((permission) => {
      console.log('🔔 Notification permission:', permission);
      return permission;
    });
  }
  return Promise.resolve('denied');
}

// Subscribe to push notifications
export async function subscribeToPushNotifications() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key (нужно будет сгенерировать на backend)
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('✅ Push subscription:', subscription);
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return null;
    }
  }
  return null;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if app is installed
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Prompt user to install
export function promptInstall() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    console.log('💡 PWA install prompt available');
    
    // Можно показать кнопку установки
    return deferredPrompt;
  });

  return {
    prompt: async () => {
      if (!deferredPrompt) {
        return null;
      }
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`👤 User response to install prompt: ${outcome}`);
      deferredPrompt = null;
      return outcome;
    }
  };
}

