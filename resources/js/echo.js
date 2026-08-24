import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

function csrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : null;
}

const token = csrfToken();
const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';
const forceTLS = scheme === 'https';
const configuredPort = import.meta.env.VITE_REVERB_PORT
    ? Number(import.meta.env.VITE_REVERB_PORT)
    : null;
const port = configuredPort ?? (forceTLS ? 443 : 8080);

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: port,
    wssPort: port,
    forceTLS,
    enabledTransports: forceTLS ? ['wss'] : ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    csrfToken: token,
    auth: {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        },
    },
});

export default window.Echo;
