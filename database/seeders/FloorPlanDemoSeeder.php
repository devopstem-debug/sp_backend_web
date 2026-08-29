<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Cooler;
use App\Models\Department;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Services\FloorPlanService;
use App\Services\ShelfLevelFactory;
use Illuminate\Database\Seeder;

/**
 * Демо-карта зала: периметр через FloorPlanService + оборудование.
 *
 * php artisan db:seed --class=FloorPlanDemoSeeder
 *
 * Опционально: FLOOR_PLAN_DEMO_STORE=<uuid|код не нужен> — берётся Store::first() по умолчанию.
 */
class FloorPlanDemoSeeder extends Seeder
{
    public function run(): void
    {
        $storeId = env('FLOOR_PLAN_DEMO_STORE');
        $store = $storeId
            ? Store::query()->find($storeId)
            : Store::query()->orderBy('created_at')->first();

        if (! $store) {
            $this->command?->warn('Нет магазина. Сначала создайте магазин.');

            return;
        }

        $floorPlans = app(FloorPlanService::class);
        $levelFactory = app(ShelfLevelFactory::class);

        $floorPlans->setupHall($store, [
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

        $departments = [
            [
                'code' => 'WC',
                'name' => ['ru' => 'Вода и Напитки', 'en' => 'Water & Drinks'],
                'color' => '#3B82F6',
                'sort_order' => 1,
            ],
            [
                'code' => 'KW',
                'name' => ['ru' => 'Квас', 'en' => 'Kvass'],
                'color' => '#F59E0B',
                'sort_order' => 2,
            ],
            [
                'code' => 'DF',
                'name' => ['ru' => 'Молочные', 'en' => 'Dairy'],
                'color' => '#10B981',
                'sort_order' => 3,
            ],
        ];

        $deptModels = [];
        foreach ($departments as $dept) {
            $deptModels[$dept['code']] = Department::query()->updateOrCreate(
                ['store_id' => $store->id, 'code' => $dept['code']],
                [
                    'name' => $dept['name'],
                    'color' => $dept['color'],
                    'sort_order' => $dept['sort_order'],
                ],
            );
        }

        $shelves = [
            ['code' => 'WC-01', 'dept' => 'WC', 'pos_x' => 3, 'pos_y' => 10, 'rotation' => 0, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
            ['code' => 'WC-02', 'dept' => 'WC', 'pos_x' => 6, 'pos_y' => 10, 'rotation' => 0, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
            ['code' => 'WC-03', 'dept' => 'WC', 'pos_x' => 9, 'pos_y' => 10, 'rotation' => 0, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
            ['code' => 'KW-01', 'dept' => 'KW', 'pos_x' => 14, 'pos_y' => 10, 'rotation' => 0, 'width_mm' => 1200, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 4],
            ['code' => 'KW-02', 'dept' => 'KW', 'pos_x' => 16, 'pos_y' => 10, 'rotation' => 0, 'width_mm' => 1200, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 4],
            ['code' => 'KW-03', 'dept' => 'KW', 'pos_x' => 18, 'pos_y' => 10, 'rotation' => 0, 'width_mm' => 1200, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 4],
            ['code' => 'DF-01', 'dept' => 'DF', 'pos_x' => 22, 'pos_y' => 10, 'rotation' => 0, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
        ];

        foreach ($shelves as $payload) {
            $shelf = Shelf::query()->updateOrCreate(
                ['store_id' => $store->id, 'code' => $payload['code']],
                [
                    'department_id' => $deptModels[$payload['dept']]->id,
                    'name' => ['ru' => $payload['code'], 'en' => $payload['code']],
                    'width_mm' => $payload['width_mm'],
                    'height_mm' => $payload['height_mm'],
                    'depth_mm' => $payload['depth_mm'],
                    'width_cm' => max(1, (int) round($payload['width_mm'] / 10)),
                    'shelf_count' => $payload['shelf_count'],
                    'pos_x' => $payload['pos_x'],
                    'pos_y' => $payload['pos_y'],
                    'rotation' => $payload['rotation'],
                    'sort_order' => (int) substr($payload['code'], -2),
                ],
            );

            if ($shelf->levels()->count() === 0) {
                foreach ($levelFactory->distribute($payload['shelf_count'], $payload['height_mm']) as $level) {
                    $shelf->levels()->create($level);
                }
            }
        }

        $cooler = Cooler::query()->updateOrCreate(
            ['store_id' => $store->id, 'code' => 'CL-01'],
            [
                'department_id' => $deptModels['DF']->id,
                'display_name' => ['ru' => 'Холодильник', 'en' => 'Cooler'],
                'width_mm' => 1200,
                'height_mm' => 2000,
                'depth_mm' => 800,
                'door_count' => 2,
                'shelf_count' => 5,
                'temperature_zone' => 'chilled',
                'pos_x' => 24,
                'pos_y' => 10,
                'rotation' => 0,
                'sort_order' => 1,
            ],
        );

        if ($cooler->levels()->count() === 0) {
            foreach ($levelFactory->distributeWithoutCm(5, 2000) as $level) {
                $cooler->levels()->create($level);
            }
        }

        $stand = Stand::query()->updateOrCreate(
            ['store_id' => $store->id, 'code' => 'ST-01'],
            [
                'department_id' => $deptModels['WC']->id,
                'display_name' => ['ru' => 'Стойка промо', 'en' => 'Promo Stand'],
                'stand_type' => 'endcap',
                'width_mm' => 800,
                'height_mm' => 1600,
                'depth_mm' => 800,
                'shelf_count' => 4,
                'has_back' => true,
                'pos_x' => 27,
                'pos_y' => 12,
                'rotation' => 0,
                'sort_order' => 1,
            ],
        );

        if ($stand->levels()->count() === 0) {
            foreach ($levelFactory->distributeWithoutCm(4, 1600) as $level) {
                $stand->levels()->create($level);
            }
        }

        $storeLabel = is_array($store->name)
            ? ($store->name['ru'] ?? $store->name['en'] ?? $store->id)
            : (string) $store->name;

        $this->command?->info(
            "Карта зала для «{$storeLabel}» создана: стены+вход+8 касс, 7 стеллажей, 1 холодильник, 1 стойка.",
        );
    }
}
