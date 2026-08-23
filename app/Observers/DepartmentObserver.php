<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Department;
use App\Support\DispatchesFirebaseStoreSync;

class DepartmentObserver
{
    use DispatchesFirebaseStoreSync;

    public function saved(Department $department): void
    {
        $this->dispatchStoreSync($department->store_id);
    }

    public function deleted(Department $department): void
    {
        $this->dispatchStoreSync($department->store_id);
    }
}
