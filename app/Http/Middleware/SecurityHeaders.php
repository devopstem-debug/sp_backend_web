<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');
        $response->headers->remove('X-Powered-By');

        if (! $this->isLocal()) {
            $response->headers->set('Content-Security-Policy', $this->productionCsp());
        }

        if (filter_var(config('security.hsts', env('SECURE_HEADERS_HSTS', false)), FILTER_VALIDATE_BOOLEAN)) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains',
            );
        }

        return $response;
    }

    private function isLocal(): bool
    {
        return app()->environment(['local', 'development', 'dev']);
    }

    private function productionCsp(): string
    {
        $connectSrc = array_unique(array_merge(
            ["'self'"],
            $this->reverbConnectOrigins(),
            ['https://nominatim.openstreetmap.org'],
            $this->parseCsv(config('security.csp_connect_src_extra')),
        ));

        $imgSrc = array_unique(array_merge(
            ["'self'", 'data:', 'blob:'],
            [
                'https://*.tile.openstreetmap.org',
                'https://tile.openstreetmap.org',
                'https://*.openstreetmap.org',
            ],
            $this->parseCsv(config('security.csp_img_src_extra')),
        ));

        return implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
            "font-src 'self' data: https://fonts.bunny.net",
            'img-src '.implode(' ', $imgSrc),
            'connect-src '.implode(' ', $connectSrc),
            "worker-src 'self' blob:",
            "manifest-src 'self'",
        ]);
    }

    /**
     * @return list<string>
     */
    private function reverbConnectOrigins(): array
    {
        $app = config('reverb.apps.apps.0.options');

        if (! is_array($app)) {
            return [];
        }

        $host = trim((string) ($app['host'] ?? ''));

        if ($host === '') {
            return [];
        }

        $scheme = (string) ($app['scheme'] ?? 'https');
        $port = (int) ($app['port'] ?? ($scheme === 'https' ? 443 : 8080));
        $origins = [];

        if ($scheme === 'https') {
            $origins[] = "wss://{$host}";
            if ($port !== 443) {
                $origins[] = "wss://{$host}:{$port}";
            }

            return $origins;
        }

        $origins[] = "ws://{$host}";
        if ($port !== 80) {
            $origins[] = "ws://{$host}:{$port}";
        }

        return $origins;
    }

    /**
     * @return list<string>
     */
    private function parseCsv(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn (string $item): string => trim($item),
            explode(',', $value),
        )));
    }
}
