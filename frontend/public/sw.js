/* WhatsApp CRM service worker — handles Web Push notifications */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'New message', body: event.data ? event.data.text() : '' };
  }
  var title = data.title || 'New message';
  var options = {
    body: data.body || '',
    icon: '/logo192.png',
    // A unique tag per notification so each message shows its own banner
    // (a static tag made them coalesce into one and suppressed the banner).
    tag: 'cw-' + Date.now(),
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            try { client.navigate(url); } catch (e) { /* ignore */ }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
