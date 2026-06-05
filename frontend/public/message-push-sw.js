self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: 'BantuBuzz', body: event.data ? event.data.text() : 'New notification' };
  }

  const title = data.title || 'BantuBuzz';
  const options = {
    body: data.body || 'You have a new message.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'bantubuzz-message',
    data: {
      url: data.url || '/messages'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/messages';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});
