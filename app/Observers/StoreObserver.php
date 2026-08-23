<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Store;
use App\Services\FirebaseService;
use App\Services\StoreExportService;
use App\Support\DispatchesFirebaseStoreSync;
use Illuminate\Support\Facades\Log;
use Throwable;

class StoreObserver
{
    use DispatchesFirebaseStoreSync;

    public function __construct(
        private readonly FirebaseService $firebase,
        private readonly StoreExportService $exports,
    ) {}

    public function saved(Store $store): void
    {
        $this->dispatchStoreSync($store->id);
    }

    public function deleted(Store $store): void
    {
        try {
            $tenantId = $store->tenant_id;

            if (! $this->firebase->isConfigured($tenantId)) {
                return;
            }

            $storeKey = $this->exports->storeKey($store);
            $this->firebase->deleteStore($storeKey, $tenantId);
        } catch (Throwable $exception) {
            Log::error('StoreObserver Firebase delete failed', [
                'store_id' => $store->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    public function restored(Store $store): void
    {
        $this->dispatchStoreSync($store->id);
    }
}
