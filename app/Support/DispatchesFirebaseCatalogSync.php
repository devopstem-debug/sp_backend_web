<?php

declare(strict_types=1);

namespace App\Support;

use App\Jobs\SyncCatalogToFirebase;
use App\Models\Tenant;

trait DispatchesFirebaseCatalogSync
{
    protected function dispatchCatalogSync(?string $tenantId, int $delaySeconds = 5): void
    {
        if ($tenantId === null || $tenantId === '') {
            return;
        }

        SyncCatalogToFirebase::dispatch($tenantId)
            ->delay(now()->addSeconds($delaySeconds))
            ->afterCommit();
    }

    protected function dispatchCatalogSyncForAllTenants(int $delaySeconds = 5): void
    {
        Tenant::query()
            ->where('is_active', true)
            ->pluck('id')
            ->each(fn (string $tenantId) => $this->dispatchCatalogSync($tenantId, $delaySeconds));
    }
}
