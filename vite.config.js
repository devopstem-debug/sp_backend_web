import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false,
            includeAssets: ['images/logo.svg'],
            manifest: {
                name: 'Smart Planogram Control Center',
                short_name: 'SP Control',
                description:
                    'Управление планограммами, магазинами и оборудованием',
                theme_color: '#0e172b',
                background_color: '#0e172b',
                display: 'standalone',
                start_url: '/dashboard',
                scope: '/',
                lang: 'ru',
                icons: [
                    {
                        src: '/images/logo.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                    {
                        src: '/images/logo.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                navigateFallback: null,
                cleanupOutdatedCaches: true,
                importScripts: ['/sw-push-handlers.js'],
                globPatterns: ['**/*.{js,css,ico,svg,woff2,png,webp}'],
                runtimeCaching: [
                    {
                        urlPattern: ({ request }) => request.mode === 'navigate',
                        handler: 'NetworkOnly',
                    },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
});
