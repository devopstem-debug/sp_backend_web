<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * @deprecated Используйте StoreCatalogSeeder — тот же результат + полный каталог отделов.
 *
 * php artisan db:seed --class=FloorPlanDemoSeeder
 */
class FloorPlanDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->warn('FloorPlanDemoSeeder → StoreCatalogSeeder (карта + отделы + оборудование).');

        $this->call(StoreCatalogSeeder::class);
    }
}
