'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores';

/**
 * Отслеживает navigator.onLine и события online/offline.
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
