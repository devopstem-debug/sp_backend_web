<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\Department;
use App\Models\Placement;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Models\Wall;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StoreExportService
{
    /**
     * @return array{
     *     metadata: array{updatedAt: string},
     *     stores_index: array<string, array<string, mixed>>,
     *     store_maps: array<string, array<string, mixed>>,
     *     store_products: array<string, array<string, mixed>>
     * }
     */
    public function generate(string $storeId): array
    {
        $store = Store::query()
            ->with([
                'departments:id,store_id,code,name',
                'layout',
                'walls',
                'shelves.department:id,code,name',
                'shelves.levels.placements.product:id,barcode,name,category,checked',
                'coolers.department:id,code,name',
                'stands.department:id,code,name',
            ])
            ->find($storeId);

        if (! $store) {
            throw ValidationException::withMessages([
                'store_id' => 'Магазин не найден.',
            ]);
        }

        $storeKey = $this->storeKey($store);

        return [
            'metadata' => [
                'updatedAt' => now()->timezone('UTC')->format('Y-m-d H:i'),
            ],
            'stores_index' => [
                $storeKey => [
                    'name' => $this->localized($store->name),
                    'latitude' => $store->latitude !== null ? (float) $store->latitude : null,
                    'longitude' => $store->longitude !== null ? (float) $store->longitude : null,
                    'radiusMeters' => (int) ($store->radius_meters ?? 100),
                ],
            ],
            'store_maps' => [
                $storeKey => [
                    'zoneDictionary' => $this->zoneDictionary($store),
                    'wallPoints' => $this->wallPoints($store),
                    'walls' => $store->walls
                        ->sortBy('created_at')
                        ->values()
                        ->map(fn ($wall) => $this->transformWall($wall))
                        ->all(),
                    'racks' => $store->shelves
                        ->sortBy(['sort_order', 'code'])
                        ->values()
                        ->map(fn (Shelf $shelf) => $this->transformRack($shelf))
                        ->filter()
                        ->values()
                        ->all(),
                    'coolers' => $store->coolers
                        ->sortBy(['sort_order', 'code'])
                        ->values()
                        ->map(fn (Cooler $cooler) => $this->transformCooler($cooler))
                        ->filter()
                        ->values()
                        ->all(),
                    'stands' => $store->stands
                        ->sortBy(['sort_order', 'code'])
                        ->values()
                        ->map(fn (Stand $stand) => $this->transformStand($stand))
                        ->filter()
                        ->values()
                        ->all(),
                ],
            ],
            'store_products' => [
                $storeKey => $this->storeProducts($store),
            ],
        ];
    }

    public function storeKey(Store $store): string
    {
        $name = $this->localized($store->name);
        $slug = Str::slug($name !== '' ? $name : ($store->city ?: 'store'));

        if ($slug === '') {
            $slug = 'store';
        }

        return $slug.'-'.Str::lower(Str::substr((string) $store->id, 0, 8));
    }

    /**
     * @return array<string, string>
     */
    private function zoneDictionary(Store $store): array
    {
        $zones = [];

        foreach ($store->departments as $department) {
            /** @var Department $department */
            $code = strtoupper(trim((string) $department->code));
            if ($code === '') {
                continue;
            }

            $zones[$code] = $this->localized($department->name) ?: $code;
        }

        ksort($zones);

        return $zones;
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>|null
     */
    private function transformRack(Shelf $shelf): ?array
    {
        if (! $this->isOnMap((float) $shelf->pos_x, (float) $shelf->pos_y, (int) $shelf->rotation)) {
            return null;
        }

        $zoneCode = strtoupper((string) ($shelf->department?->code ?? ''));

        return [
            'id' => $shelf->code,
            'displayName' => $shelf->displayLabel(),
            'rx' => (float) $shelf->pos_x,
            'ry' => (float) $shelf->pos_y,
            'posX' => (float) $shelf->pos_x,
            'posY' => (float) $shelf->pos_y,
            'rotation' => (int) $shelf->rotation,
            'widthMeters' => $this->mmToMeters((int) $shelf->width_mm),
            'lengthMeters' => $this->mmToMeters((int) $shelf->depth_mm),
            'direction' => $this->rotationToDirection((int) $shelf->rotation),
            'segments' => $zoneCode !== ''
                ? [
                    [
                        'side' => 'LEFT',
                        'position' => 1,
                        'code' => $zoneCode,
                    ],
                ]
                : [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>|null
     */
    private function transformCooler(Cooler $cooler): ?array
    {
        if (! $this->isOnMap((float) $cooler->pos_x, (float) $cooler->pos_y, (int) $cooler->rotation)) {
            return null;
        }

        return [
            'id' => $cooler->code,
            'displayName' => $cooler->displayLabel(),
            'rx' => (float) $cooler->pos_x,
            'ry' => (float) $cooler->pos_y,
            'posX' => (float) $cooler->pos_x,
            'posY' => (float) $cooler->pos_y,
            'rotation' => (int) $cooler->rotation,
            'widthMeters' => $this->mmToMeters((int) $cooler->width_mm),
            'lengthMeters' => $this->mmToMeters((int) $cooler->depth_mm),
            'doorCount' => (int) $cooler->door_count,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>|null
     */
    private function transformStand(Stand $stand): ?array
    {
        if (! $this->isOnMap((float) $stand->pos_x, (float) $stand->pos_y, (int) $stand->rotation)) {
            return null;
        }

        return [
            'id' => $stand->code,
            'displayName' => $stand->displayLabel(),
            'rx' => (float) $stand->pos_x,
            'ry' => (float) $stand->pos_y,
            'posX' => (float) $stand->pos_x,
            'posY' => (float) $stand->pos_y,
            'rotation' => (int) $stand->rotation,
            'widthMeters' => $this->mmToMeters((int) $stand->width_mm),
            'lengthMeters' => $this->mmToMeters((int) $stand->depth_mm),
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function storeProducts(Store $store): array
    {
        $products = [];

        foreach ($store->shelves as $shelf) {
            $zoneCode = strtoupper((string) ($shelf->department?->code ?? ''));

            foreach ($shelf->levels as $level) {
                foreach ($level->placements as $placement) {
                    /** @var Placement $placement */
                    $product = $placement->product;
                    if (! $product || ! $product->barcode) {
                        continue;
                    }

                    $barcode = (string) $product->barcode;

                    if (! isset($products[$barcode])) {
                        $products[$barcode] = [
                            'barcode' => $barcode,
                            'name' => (string) $product->name,
                            'category' => (string) $product->category,
                            'checked' => (bool) $product->checked,
                            'placements' => [],
                        ];
                    }

                    $products[$barcode]['placements'][] = [
                        'rack' => $shelf->code,
                        'shelf' => (int) $level->level_number,
                        'startMeter' => $this->cmToMeters((float) $placement->start_cm),
                        'endMeter' => $this->cmToMeters((float) $placement->end_cm),
                        'facings' => (int) $placement->facings,
                        'comment' => sprintf('Полка %d', (int) $level->level_number),
                        'zoneCode' => $zoneCode,
                    ];
                }
            }
        }

        ksort($products);

        return $products;
    }

    private function mmToMeters(int $mm): float
    {
        return round($mm / 1000, 3);
    }

    private function cmToMeters(float $cm): float
    {
        return round($cm / 100, 3);
    }

    private function localized(mixed $value): string
    {
        if (is_array($value)) {
            return (string) ($value['ru'] ?? $value['en'] ?? '');
        }

        return (string) ($value ?? '');
    }

    private function isOnMap(float $posX, float $posY, int $rotation = 0): bool
    {
        return $posX >= 0
            && $posY >= 0
            && ($posX != 0.0 || $posY != 0.0 || $rotation !== 0);
    }

    private function rotationToDirection(int $rotation): string
    {
        return in_array($rotation, [90, 270], true) ? 'H' : 'V';
    }

    /**
     * @return list<array{x: float, y: float}>
     */
    private function wallPoints(Store $store): array
    {
        if ($store->walls->isEmpty()) {
            return [['x' => 0, 'y' => 0]];
        }

        $points = [];

        foreach ($store->walls as $wall) {
            /** @var Wall $wall */
            $points[] = ['x' => (float) $wall->start_x, 'y' => (float) $wall->start_y];
            $points[] = ['x' => (float) $wall->end_x, 'y' => (float) $wall->end_y];
        }

        return $points;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformWall(Wall $wall): array
    {
        return [
            'startX' => (float) $wall->start_x,
            'startY' => (float) $wall->start_y,
            'endX' => (float) $wall->end_x,
            'endY' => (float) $wall->end_y,
            'wallType' => $wall->wall_type,
        ];
    }
}
