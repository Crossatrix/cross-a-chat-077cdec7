export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const showNotification = (title: string, body: string, data?: any) => {
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker notification for better mobile support
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'message',
          data: data || {},
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    }
  }
};
