/* Extra service worker handlers (imported by Workbox generateSW). */
/* eslint-disable no-restricted-globals */

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification?.data?.url || '/dashboard';

    event.waitUntil(
        (async () => {
            const allClients = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true,
            });

            for (const client of allClients) {
                if ('focus' in client) {
                    await client.focus();
                    if ('navigate' in client) {
                        await client.navigate(targetUrl);
                    }
                    return;
                }
            }

            if (self.clients.openWindow) {
                await self.clients.openWindow(targetUrl);
            }
        })(),
    );
});
