// OneSignal types
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => Promise<void>>;
  }
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  // OneSignal handles permission requests automatically
  // This function now triggers OneSignal's permission prompt
  if (window.OneSignalDeferred) {
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.Notifications.requestPermission();
    });
    return true;
  }
  
  // Fallback to native API
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
  // OneSignal handles its own service worker registration
  // This is now a no-op as OneSignal manages the service worker
  console.log('OneSignal manages service worker registration');
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

// Tracks which conversation the user is currently viewing so we can suppress
// in-app message notifications for that conversation.
let _activeConversationId: string | null = null;

export const setActiveConversation = (conversationId: string | null) => {
  _activeConversationId = conversationId;
};

export const getActiveConversation = (): string | null => _activeConversationId;

