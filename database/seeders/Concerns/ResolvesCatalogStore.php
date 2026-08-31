<?php

declare(strict_types=1);

namespace Database\Seeders\Concerns;

use App\Models\Store;

trait ResolvesCatalogStore
{
    protected static function resolveCatalogStore(): ?Store
    {
        $storeId = env('STORE_CATALOG_STORE') ?: env('FLOOR_PLAN_DEMO_STORE');

        if (is_string($storeId) && $storeId !== '') {
            return Store::query()->find($storeId);
        }

        return Store::query()->orderBy('created_at')->first();
    }

    protected function catalogStoreLabel(Store $store): string
    {
        $name = $store->name;

        if (is_array($name)) {
            return (string) ($name['ru'] ?? $name['en'] ?? $store->id);
        }

        return (string) ($name ?: $store->id);
    }
}
