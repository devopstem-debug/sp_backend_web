<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Stand;
use App\Support\DispatchesFirebaseStoreSync;

class StandObserver
{
    use DispatchesFirebaseStoreSync;

    public function saved(Stand $stand): void
    {
        $this->dispatchStoreSync($stand->store_id);
    }

    public function deleted(Stand $stand): void
    {
        $this->dispatchStoreSync($stand->store_id);
    }
}
