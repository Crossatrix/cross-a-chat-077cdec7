import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
}

export const usePushNotifications = (userId: string | null): UsePushNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    setIsSupported(supported);
  }, []);

  // Check if notifications are already enabled for this user
  useEffect(() => {
    const checkExistingToken = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      setIsEnabled(!!data);
    };

    checkExistingToken();
  }, [userId]);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId || !isSupported) return false;
    
    setIsLoading(true);
    
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Register the service worker for FCM
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Get Firebase config from environment
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cross-chat-app',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      // Send Firebase config to the service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: firebaseConfig,
        });
      }

      // Subscribe to push notifications using Web Push API
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      
      let token: string;
      
      if (vapidKey) {
        // Use Web Push with VAPID key
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        
        // Use the endpoint as the token for FCM
        token = JSON.stringify(subscription.toJSON());
      } else {
        // Fallback: Use a unique identifier based on registration
        token = `sw_${registration.scope}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }

      console.log('Push token obtained');

      // Store the token in the database
      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          device_info: navigator.userAgent,
        }, {
          onConflict: 'user_id,token',
        });

      if (upsertError) {
        console.error('Failed to store push token:', upsertError);
        throw upsertError;
      }

      setIsEnabled(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      setIsLoading(false);
      return false;
    }
  }, [userId, isSupported]);

  const disableNotifications = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      // Remove token from database
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId);

      // Unsubscribe from push manager if possible
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      } catch (e) {
        console.log('Could not unsubscribe from push:', e);
      }

      setIsEnabled(false);
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    isSupported,
    isEnabled,
    isLoading,
    enableNotifications,
    disableNotifications,
  };
};
