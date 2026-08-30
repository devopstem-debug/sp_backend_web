import '../css/app.css';
import './bootstrap';
import './echo';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Smart Planogram';

const errorPages = {
    403: () => import('./Pages/Errors/Forbidden.jsx'),
    404: () => import('./Pages/Errors/NotFound.jsx'),
    405: () => import('./Pages/Errors/MethodNotAllowed.jsx'),
    419: () => import('./Pages/Errors/PageExpired.jsx'),
    429: () => import('./Pages/Errors/TooManyRequests.jsx'),
    500: () => import('./Pages/Errors/ServerError.jsx'),
    503: () => import('./Pages/Errors/ServiceUnavailable.jsx'),
    'Errors/Forbidden': () => import('./Pages/Errors/Forbidden.jsx'),
    'Errors/NotFound': () => import('./Pages/Errors/NotFound.jsx'),
    'Errors/MethodNotAllowed': () => import('./Pages/Errors/MethodNotAllowed.jsx'),
    'Errors/PageExpired': () => import('./Pages/Errors/PageExpired.jsx'),
    'Errors/TooManyRequests': () => import('./Pages/Errors/TooManyRequests.jsx'),
    'Errors/ServerError': () => import('./Pages/Errors/ServerError.jsx'),
    'Errors/ServiceUnavailable': () => import('./Pages/Errors/ServiceUnavailable.jsx'),
};

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        if (errorPages[name]) {
            return errorPages[name]();
        }

        return resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        );
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#6366f1',
    },
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .catch((error) => {
                console.warn('Service Worker registration failed:', error);
            });
    });
}
