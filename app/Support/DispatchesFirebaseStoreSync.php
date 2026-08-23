<?php

declare(strict_types=1);

namespace App\Support;

use App\Jobs\SyncStoreToFirebase;

trait DispatchesFirebaseStoreSync
{
    protected function dispatchStoreSync(?string $storeId, int $delaySeconds = 3): void
    {
        if ($storeId === null || $storeId === '') {
            return;
        }

        SyncStoreToFirebase::dispatch($storeId)
            ->delay(now()->addSeconds($delaySeconds))
            ->afterCommit();
    }
}
