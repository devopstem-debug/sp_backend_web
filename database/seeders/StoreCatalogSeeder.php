<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Cooler;
use App\Models\Shelf;
use App\Models\Stand;
use App\Services\FloorPlanService;
use Database\Seeders\Concerns\ResolvesCatalogStore;
use Illuminate\Database\Seeder;

/**
 * Полный демо-набор для магазина: карта зала + каталог отделов + оборудование.
 *
 * php artisan db:seed --class=StoreCatalogSeeder --force
 *
 * Опционально: STORE_CATALOG_STORE=<uuid> (или FLOOR_PLAN_DEMO_STORE)
 */
class StoreCatalogSeeder extends Seeder
{
    use ResolvesCatalogStore;

    public function run(): void
    {
        $store = self::resolveCatalogStore();

        if (! $store) {
            $this->command?->warn('Нет магазина. Сначала создайте магазин и арендатора.');

            return;
        }

        app(FloorPlanService::class)->setupHall($store, [
            'width_meters' => 30,
            'height_meters' => 25,
            'grid_size_cm' => 50,
            'entrance_side' => 'north',
            'entrance_offset_m' => 15,
            'entrance_width_m' => 5,
            'has_cash_registers' => true,
            'cash_side' => 'south',
            'cash_count' => 8,
            'replace_existing' => true,
            'bearing_degrees' => 0,
        ]);

        $this->call([
            DepartmentsCatalogSeeder::class,
            StoreEquipmentSeeder::class,
        ]);

        $label = $this->catalogStoreLabel($store);
        $shelves = Shelf::query()->where('store_id', $store->id)->count();
        $coolers = Cooler::query()->where('store_id', $store->id)->count();
        $stands = Stand::query()->where('store_id', $store->id)->count();

        $this->command?->info(
            "Демо «{$label}»: карта 30×25 м, отделы, {$shelves} стеллажей, {$coolers} холодильников, {$stands} стоек.",
        );
    }
}
