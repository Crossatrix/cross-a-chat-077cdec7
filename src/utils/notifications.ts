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

export const showNotification = (
  title: string, 
  body: string, 
  options?: {
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
    actions?: Array<{ action: string; title: string }>;
  }
) => {
  // Don't show notification if the window is focused
  if (document.hasFocus()) {
    return;
  }

  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker notification for better mobile support
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: options?.tag || 'message',
          data: options?.data || {},
          requireInteraction: options?.requireInteraction || false,
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: options?.tag || 'message',
      });
    }
  }
};

export const showCallNotification = (callerName: string, conversationId: string) => {
  showNotification(
    `📞 Incoming call`,
    `${callerName} is calling you`,
    {
      tag: `call-${conversationId}`,
      requireInteraction: true,
      data: { 
        type: 'call',
        conversationId,
        url: '/' 
      },
    }
  );
};

export const showMessageNotification = (senderName: string, content: string, conversationId: string) => {
  showNotification(
    `💬 ${senderName}`,
    content || 'Sent a media file',
    {
      tag: `message-${conversationId}`,
      data: { 
        type: 'message',
        conversationId,
        url: '/' 
      },
    }
  );
};
