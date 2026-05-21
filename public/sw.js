self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'SwellSwap', {
      body: data.body || 'You have a new message',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const convoId = event.notification.data?.conversation_id;
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].postMessage({ type: 'OPEN_MESSAGES', conversation_id: convoId });
      } else {
        clients.openWindow('/messages');
      }
    })
  );
});
