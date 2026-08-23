<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Shelf;
use App\Support\DispatchesFirebaseStoreSync;

class ShelfObserver
{
    use DispatchesFirebaseStoreSync;

    public function saved(Shelf $shelf): void
    {
        $this->dispatchStoreSync($shelf->store_id);
    }

    public function deleted(Shelf $shelf): void
    {
        $this->dispatchStoreSync($shelf->store_id);
    }
}
