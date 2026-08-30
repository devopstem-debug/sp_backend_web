<?php

declare(strict_types=1);

namespace App\Support;

use App\Jobs\SyncStoreToFirebase;
use Illuminate\Support\Facades\Log;
use Throwable;

trait DispatchesFirebaseStoreSync
{
    protected function dispatchStoreSync(?string $storeId, int $delaySeconds = 3): void
    {
        if ($storeId === null || $storeId === '') {
            return;
        }

        try {
            SyncStoreToFirebase::dispatch($storeId)
                ->delay(now()->addSeconds($delaySeconds))
                ->afterCommit();
        } catch (Throwable $exception) {
            // Не ломаем сохранение магазина, если Redis/очередь недоступны.
            Log::warning('Firebase sync dispatch skipped', [
                'store_id' => $storeId,
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
