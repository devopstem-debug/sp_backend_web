<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Cooler;
use App\Models\Department;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Services\ShelfLevelFactory;
use Database\Seeders\Concerns\ResolvesCatalogStore;
use Illuminate\Database\Seeder;

/**
 * Базовое оборудование (стеллажи, холодильники, стойки) для демо-магазина.
 *
 * php artisan db:seed --class=StoreEquipmentSeeder
 *
 * Сначала запустите DepartmentsCatalogSeeder (или StoreCatalogSeeder).
 */
class StoreEquipmentSeeder extends Seeder
{
    use ResolvesCatalogStore;

    public function run(): void
    {
        $store = self::resolveCatalogStore();

        if (! $store) {
            $this->command?->warn('Нет магазина. Сначала создайте магазин.');

            return;
        }

        $levelFactory = app(ShelfLevelFactory::class);
        $dept = fn (string $code): ?Department => Department::query()
            ->where('store_id', $store->id)
            ->where('code', $code)
            ->first();

        $this->seedShelves($store, $dept('WC'), $levelFactory, [
            ['code' => 'WC-01', 'name' => 'Вода и Колы 1', 'pos_x' => 2, 'pos_y' => 5, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
            ['code' => 'WC-02', 'name' => 'Вода и Колы 2', 'pos_x' => 5, 'pos_y' => 5, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
            ['code' => 'WC-03', 'name' => 'Вода и Колы 3', 'pos_x' => 8, 'pos_y' => 5, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
            ['code' => 'WC-04', 'name' => 'Вода и Колы 4', 'pos_x' => 11, 'pos_y' => 5, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
            ['code' => 'WC-05', 'name' => 'Вода и Колы 5', 'pos_x' => 14, 'pos_y' => 5, 'width_mm' => 1500, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 5],
        ]);

        $this->seedShelves($store, $dept('KW'), $levelFactory, [
            ['code' => 'KW-01', 'name' => 'Квас 1', 'pos_x' => 2, 'pos_y' => 10, 'width_mm' => 1200, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 4],
            ['code' => 'KW-02', 'name' => 'Квас 2', 'pos_x' => 5, 'pos_y' => 10, 'width_mm' => 1200, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 4],
            ['code' => 'KW-03', 'name' => 'Квас 3', 'pos_x' => 8, 'pos_y' => 10, 'width_mm' => 1200, 'height_mm' => 1600, 'depth_mm' => 700, 'shelf_count' => 4],
        ]);

        $this->seedShelves($store, $dept('SN'), $levelFactory, [
            ['code' => 'SN-01', 'name' => 'Снеки 1', 'pos_x' => 2, 'pos_y' => 15, 'width_mm' => 1500, 'height_mm' => 1800, 'depth_mm' => 600, 'shelf_count' => 6],
            ['code' => 'SN-02', 'name' => 'Снеки 2', 'pos_x' => 5, 'pos_y' => 15, 'width_mm' => 1500, 'height_mm' => 1800, 'depth_mm' => 600, 'shelf_count' => 6],
        ]);

        $dfDept = $dept('DF');
        if ($dfDept) {
            $this->seedCoolers($store, $dfDept, $levelFactory, [
                ['code' => 'DF-C01', 'name' => 'Холодильник молочный 1', 'pos_x' => 20, 'pos_y' => 5, 'width_mm' => 1200, 'height_mm' => 2000, 'depth_mm' => 800, 'door_count' => 2, 'shelf_count' => 5, 'temp' => 'chilled'],
                ['code' => 'DF-C02', 'name' => 'Холодильник молочный 2', 'pos_x' => 23, 'pos_y' => 5, 'width_mm' => 1200, 'height_mm' => 2000, 'depth_mm' => 800, 'door_count' => 2, 'shelf_count' => 5, 'temp' => 'chilled'],
            ]);
        }

        $icDept = $dept('IC') ?? $dfDept;
        if ($icDept) {
            $this->seedCoolers($store, $icDept, $levelFactory, [
                ['code' => 'IC-C01', 'name' => 'Морозильник мороженое', 'pos_x' => 26, 'pos_y' => 5, 'width_mm' => 1800, 'height_mm' => 2000, 'depth_mm' => 800, 'door_count' => 3, 'shelf_count' => 5, 'temp' => 'frozen'],
            ]);
        }

        $standDept = $dept('SN') ?? $dept('WC');
        if ($standDept) {
            $this->seedStands($store, $standDept, $levelFactory, [
                ['code' => 'ST-01', 'name' => 'Стойка промо 1', 'pos_x' => 2, 'pos_y' => 20, 'width_mm' => 800, 'height_mm' => 1600, 'depth_mm' => 800, 'shelf_count' => 4, 'type' => 'endcap'],
                ['code' => 'ST-02', 'name' => 'Стойка промо 2', 'pos_x' => 5, 'pos_y' => 20, 'width_mm' => 800, 'height_mm' => 1600, 'depth_mm' => 800, 'shelf_count' => 4, 'type' => 'island'],
                ['code' => 'ST-03', 'name' => 'Стойка у кассы', 'pos_x' => 10, 'pos_y' => 20, 'width_mm' => 600, 'height_mm' => 1400, 'depth_mm' => 600, 'shelf_count' => 3, 'type' => 'gondola'],
            ]);
        }

        $shelfCount = Shelf::query()->where('store_id', $store->id)->count();
        $coolerCount = Cooler::query()->where('store_id', $store->id)->count();
        $standCount = Stand::query()->where('store_id', $store->id)->count();

        $this->command?->info(
            "Оборудование: {$shelfCount} стеллажей, {$coolerCount} холодильников, {$standCount} стоек.",
        );
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function seedShelves(
        Store $store,
        ?Department $department,
        ShelfLevelFactory $levelFactory,
        array $items,
    ): void {
        if (! $department) {
            return;
        }

        foreach ($items as $payload) {
            $label = (string) $payload['name'];
            $shelf = Shelf::query()->updateOrCreate(
                ['store_id' => $store->id, 'code' => $payload['code']],
                [
                    'department_id' => $department->id,
                    'name' => ['ru' => $label, 'en' => $label],
                    'width_mm' => $payload['width_mm'],
                    'height_mm' => $payload['height_mm'],
                    'depth_mm' => $payload['depth_mm'],
                    'width_cm' => max(1, (int) round($payload['width_mm'] / 10)),
                    'shelf_count' => $payload['shelf_count'],
                    'pos_x' => $payload['pos_x'],
                    'pos_y' => $payload['pos_y'],
                    'rotation' => 0,
                    'sort_order' => (int) substr((string) $payload['code'], -2),
                ],
            );

            if ($shelf->levels()->count() === 0) {
                foreach ($levelFactory->distribute($payload['shelf_count'], $payload['height_mm']) as $level) {
                    $shelf->levels()->create($level);
                }
            }
        }
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function seedCoolers(
        Store $store,
        Department $department,
        ShelfLevelFactory $levelFactory,
        array $items,
    ): void {
        foreach ($items as $payload) {
            $label = (string) $payload['name'];
            $cooler = Cooler::query()->updateOrCreate(
                ['store_id' => $store->id, 'code' => $payload['code']],
                [
                    'department_id' => $department->id,
                    'display_name' => ['ru' => $label, 'en' => $label],
                    'width_mm' => $payload['width_mm'],
                    'height_mm' => $payload['height_mm'],
                    'depth_mm' => $payload['depth_mm'],
                    'door_count' => $payload['door_count'],
                    'shelf_count' => $payload['shelf_count'],
                    'temperature_zone' => $payload['temp'],
                    'pos_x' => $payload['pos_x'],
                    'pos_y' => $payload['pos_y'],
                    'rotation' => 0,
                    'sort_order' => (int) substr((string) $payload['code'], -2),
                ],
            );

            if ($cooler->levels()->count() === 0) {
                foreach ($levelFactory->distributeWithoutCm($payload['shelf_count'], $payload['height_mm']) as $level) {
                    $cooler->levels()->create($level);
                }
            }
        }
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function seedStands(
        Store $store,
        Department $department,
        ShelfLevelFactory $levelFactory,
        array $items,
    ): void {
        foreach ($items as $payload) {
            $label = (string) $payload['name'];
            $stand = Stand::query()->updateOrCreate(
                ['store_id' => $store->id, 'code' => $payload['code']],
                [
                    'department_id' => $department->id,
                    'display_name' => ['ru' => $label, 'en' => $label],
                    'stand_type' => $payload['type'],
                    'width_mm' => $payload['width_mm'],
                    'height_mm' => $payload['height_mm'],
                    'depth_mm' => $payload['depth_mm'],
                    'shelf_count' => $payload['shelf_count'],
                    'has_back' => $payload['type'] === 'gondola',
                    'pos_x' => $payload['pos_x'],
                    'pos_y' => $payload['pos_y'],
                    'rotation' => 0,
                    'sort_order' => (int) substr((string) $payload['code'], -2),
                ],
            );

            if ($stand->levels()->count() === 0) {
                foreach ($levelFactory->distributeWithoutCm($payload['shelf_count'], $payload['height_mm']) as $level) {
                    $stand->levels()->create($level);
                }
            }
        }
    }
}
