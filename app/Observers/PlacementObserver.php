<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Placement;
use App\Support\DispatchesFirebaseStoreSync;

class PlacementObserver
{
    use DispatchesFirebaseStoreSync;

    public function saved(Placement $placement): void
    {
        $this->dispatchStoreSync($this->resolveStoreId($placement));
    }

    public function deleted(Placement $placement): void
    {
        $this->dispatchStoreSync($this->resolveStoreId($placement));
    }

    private function resolveStoreId(Placement $placement): ?string
    {
        $placement->loadMissing([
            'shelfLevel.shelf:id,store_id',
            'coolerShelfLevel.cooler:id,store_id',
            'standShelfLevel.stand:id,store_id',
        ]);

        $storeId = $placement->shelfLevel?->shelf?->store_id
            ?? $placement->coolerShelfLevel?->cooler?->store_id
            ?? $placement->standShelfLevel?->stand?->store_id;

        return $storeId ? (string) $storeId : null;
    }
}
