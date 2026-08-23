<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Cooler;
use App\Support\DispatchesFirebaseStoreSync;

class CoolerObserver
{
    use DispatchesFirebaseStoreSync;

    public function saved(Cooler $cooler): void
    {
        $this->dispatchStoreSync($cooler->store_id);
    }

    public function deleted(Cooler $cooler): void
    {
        $this->dispatchStoreSync($cooler->store_id);
    }
}
