<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Cooler;
use App\Models\Department;
use App\Models\Placement;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Observers\CoolerObserver;
use App\Observers\DepartmentObserver;
use App\Observers\PlacementObserver;
use App\Observers\ShelfObserver;
use App\Observers\StandObserver;
use App\Observers\StoreObserver;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Store::observe(StoreObserver::class);
        Department::observe(DepartmentObserver::class);
        Shelf::observe(ShelfObserver::class);
        Cooler::observe(CoolerObserver::class);
        Stand::observe(StandObserver::class);
        Placement::observe(PlacementObserver::class);
    }
}
