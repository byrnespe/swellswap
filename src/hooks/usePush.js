import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function usePush() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // already subscribed

        const res = await fetch('/api/push/vapid-public-key');
        const { key } = await res.json();

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch (err) {
        console.warn('Push subscription failed:', err);
      }
    }

    Notification.requestPermission().then(perm => {
      if (perm === 'granted') subscribe();
    });
  }, [token]);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
