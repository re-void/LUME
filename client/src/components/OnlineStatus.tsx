'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores';
import { requestNotificationPermission } from '@/lib/notifications';
import { loadSettings } from '@/crypto/storage';

/**
 * Отслеживает navigator.onLine и события online/offline.
 * Запрашивает разрешение на Desktop Notifications.
 * Обновляет глобальный UI store.
 */
export default function OnlineStatus() {
  useEffect(() => {
    const setOnline = useUIStore.getState().setOnline;

    // Инициализация
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Request desktop notification permission only when enabled in settings
    void (async () => {
      try {
        const settings = await loadSettings();
        if (settings.notifications) {
          await requestNotificationPermission();
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
