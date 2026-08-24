<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Exception\FirebaseException;
use RuntimeException;

final class FirebaseCatalogService
{
    private const ROOT_PATH = 'catalog';

    public function __construct(
        private readonly FirebaseService $firebase,
    ) {}

    public function isConfigured(?string $tenantId): bool
    {
        return $this->firebase->isConfigured($tenantId);
    }

    public function rootPath(?string $tenantId): string
    {
        if ($tenantId) {
            return self::ROOT_PATH.'/tenants/'.$tenantId;
        }

        return self::ROOT_PATH.'/global';
    }

    /**
     * @return array{count: int, updated_at: string}
     */
    public function sync(?string $tenantId = null): array
    {
        if (! $this->isConfigured($tenantId)) {
            throw new RuntimeException(
                'Firebase не настроен. Укажите Database URL и credentials в Настройки → Интеграции.',
            );
        }

        $products = $this->buildProductMap($tenantId);
        $updatedAt = now('UTC')->format('Y-m-d H:i');

        $payload = [
            'metadata' => [
                'updatedAt' => $updatedAt,
                'count' => count($products),
                'tenant_id' => $tenantId,
            ],
            'products' => $products,
        ];

        try {
            $this->firebase->database($tenantId)
                ->getReference($this->rootPath($tenantId))
                ->set($payload);
        } catch (FirebaseException $exception) {
            Log::error('Firebase catalog sync failed', [
                'tenant_id' => $tenantId,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось синхронизировать каталог в Firebase: '.$exception->getMessage(),
                0,
                $exception,
            );
        }

        return [
            'count' => count($products),
            'updated_at' => $updatedAt,
        ];
    }

    /**
     * Global catalog + private-label SKUs for the tenant (mobile offline bundle).
     *
     * @return array<string, array<string, mixed>>
     */
    private function buildProductMap(?string $tenantId): array
    {
        $query = Product::query()->withoutGlobalScopes();

        if ($tenantId) {
            $query->where(function ($builder) use ($tenantId): void {
                $builder
                    ->whereNull('owner_tenant_id')
                    ->orWhere('owner_tenant_id', $tenantId);
            });
        } else {
            $query->whereNull('owner_tenant_id');
        }

        $map = [];

        $query
            ->orderBy('barcode')
            ->cursor()
            ->each(function (Product $product) use (&$map): void {
                $barcode = trim((string) $product->barcode);

                if ($barcode === '') {
                    return;
                }

                $map[$barcode] = [
                    'barcode' => $barcode,
                    'name' => (string) $product->name,
                    'category' => $product->category,
                    'checked' => (bool) $product->checked,
                    'is_private' => $product->owner_tenant_id !== null,
                    'volume_ml' => $product->volume_ml,
                    'package_type' => $product->package_type,
                ];
            });

        ksort($map);

        return $map;
    }

    public function resolveTenantIdForActor(): ?string
    {
        $user = Auth::user();

        if ($user?->tenant_id) {
            return (string) $user->tenant_id;
        }

        return null;
    }
}
