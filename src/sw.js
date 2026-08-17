import { precacheAndRoute } from 'workbox-precaching';
import { createClient } from '@supabase/supabase-js';

precacheAndRoute(self.__WB_MANIFEST);

// Safe to embed here: this is the public anon key, same one already shipped in
// the regular app bundle — it has no special privileges beyond what RLS allows.
const supabase = createClient(
  self.location.origin.includes('localhost')
    ? import.meta.env.VITE_SUPABASE_URL
    : import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Golden Apple ERP', body: event.data.text() };
  }

  const title = payload.title || 'Golden Apple ERP';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || undefined,
    requireInteraction: false,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Browsers occasionally rotate/expire a push subscription silently. Without this,
// the old subscription in our database goes stale and notifications quietly stop
// arriving on that device with no visible error. This automatically gets a fresh
// subscription and updates it directly in Supabase — no app tab needs to be open.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe(
          event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true }
        );
        const subJson = newSubscription.toJSON();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (event.oldSubscription) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', event.oldSubscription.endpoint);
        }

        await supabase.from('push_subscriptions').upsert(
          {
            staff_id: user.id,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          { onConflict: 'staff_id,endpoint' }
        );
      } catch (err) {
        console.error('Failed to handle pushsubscriptionchange:', err);
      }
    })()
  );
});