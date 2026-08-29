<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\Department;
use App\Models\Placement;
use App\Models\Product;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Models\StoreLayout;
use App\Models\StoreLayoutMarker;
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
                'departments:id,store_id,code,name,color',
                'layout',
                'walls',
                'layoutMarkers',
                'shelves.department:id,code,name,color',
                'shelves.levels.placements.product',
                'coolers.department:id,code,name,color',
                'coolers.levels.placements.product',
                'stands.department:id,code,name,color',
                'stands.levels.placements.product',
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
                    'city' => $store->city,
                    'address' => $store->address,
                    'latitude' => $store->latitude !== null ? (float) $store->latitude : null,
                    'longitude' => $store->longitude !== null ? (float) $store->longitude : null,
                    'radiusMeters' => (int) ($store->radius_meters ?? 100),
                ],
            ],
            'store_maps' => [
                $storeKey => [
                    'layout' => $this->transformLayout($store->layout),
                    'zoneDictionary' => $this->zoneDictionary($store),
                    'zoneColors' => $this->zoneColors($store),
                    'zones' => $this->zones($store),
                    'wallPoints' => $this->wallPoints($store),
                    'walls' => $store->walls
                        ->sortBy('created_at')
                        ->values()
                        ->map(fn ($wall) => $this->transformWall($wall))
                        ->all(),
                    'markers' => $store->layoutMarkers
                        ->sortBy('code')
                        ->values()
                        ->map(fn (StoreLayoutMarker $marker) => $this->transformMarker($marker))
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
     * @return array<string, mixed>|null
     */
    private function transformLayout(?StoreLayout $layout): ?array
    {
        if (! $layout) {
            return null;
        }

        return [
            'widthMeters' => (float) $layout->width_meters,
            'heightMeters' => (float) $layout->height_meters,
            'gridSizeCm' => (int) ($layout->grid_size_cm ?: 50),
            'origin' => $layout->origin ?: 'sw',
            'entranceSide' => $layout->entrance_side,
            'entranceOffsetM' => $layout->entrance_offset_m !== null
                ? (float) $layout->entrance_offset_m
                : null,
            'entranceWidthM' => $layout->entrance_width_m !== null
                ? (float) $layout->entrance_width_m
                : null,
            'hasCashRegisters' => (bool) $layout->has_cash_registers,
            'cashSide' => $layout->cash_side,
            'cashCount' => (int) ($layout->cash_count ?? 0),
            'bearingDegrees' => $layout->bearing_degrees !== null
                ? (float) $layout->bearing_degrees
                : 0,
            'geoCenterLat' => $layout->geo_center_lat !== null
                ? (float) $layout->geo_center_lat
                : null,
            'geoCenterLng' => $layout->geo_center_lng !== null
                ? (float) $layout->geo_center_lng
                : null,
            'geoAddress' => $layout->geo_address,
            'areaSqmGeo' => $layout->area_sqm_geo !== null
                ? (float) $layout->area_sqm_geo
                : null,
            'geoPolygon' => is_array($layout->geo_polygon) ? $layout->geo_polygon : null,
        ];
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
     * @return array<string, string>
     */
    private function zoneColors(Store $store): array
    {
        $colors = [];

        foreach ($store->departments as $department) {
            $code = strtoupper(trim((string) $department->code));
            if ($code === '') {
                continue;
            }

            $colors[$code] = $department->color ?: '#64748b';
        }

        ksort($colors);

        return $colors;
    }

    /**
     * @return list<array{code: string, name: string, color: string}>
     */
    private function zones(Store $store): array
    {
        return $store->departments
            ->sortBy('code')
            ->values()
            ->map(function (Department $department): ?array {
                $code = strtoupper(trim((string) $department->code));
                if ($code === '') {
                    return null;
                }

                return [
                    'code' => $code,
                    'name' => $this->localized($department->name) ?: $code,
                    'color' => $department->color ?: '#64748b',
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function transformMarker(StoreLayoutMarker $marker): array
    {
        $defaults = StoreLayoutMarker::DEFAULTS[$marker->marker_type] ?? [
            'width' => 1,
            'depth' => 1,
            'color' => '#94a3b8',
        ];

        return [
            'id' => $marker->code,
            'type' => $marker->marker_type,
            'code' => $marker->code,
            'posX' => (float) $marker->pos_x,
            'posY' => (float) $marker->pos_y,
            'rotation' => (int) $marker->rotation,
            'widthMeters' => (float) ($marker->width_meters ?: $defaults['width']),
            'depthMeters' => (float) ($marker->depth_meters ?: $defaults['depth']),
            'color' => $marker->color ?: $defaults['color'],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function transformRack(Shelf $shelf): ?array
    {
        if (! $this->isOnMap((float) $shelf->pos_x, (float) $shelf->pos_y, (int) $shelf->rotation)) {
            return null;
        }

        $zoneCode = strtoupper((string) ($shelf->department?->code ?? ''));
        $levels = $this->transformLevels($shelf->levels);

        return [
            'id' => $shelf->code,
            'displayName' => $shelf->displayLabel(),
            'equipmentType' => 'rack',
            'rx' => (float) $shelf->pos_x,
            'ry' => (float) $shelf->pos_y,
            'posX' => (float) $shelf->pos_x,
            'posY' => (float) $shelf->pos_y,
            'rotation' => (int) $shelf->rotation,
            'widthMeters' => $this->mmToMeters((int) $shelf->width_mm),
            'lengthMeters' => $this->mmToMeters((int) $shelf->depth_mm),
            'heightMeters' => $this->mmToMeters((int) $shelf->height_mm),
            'shelfCount' => (int) ($shelf->shelf_count ?: count($levels)),
            'levels' => $levels,
            'zoneCode' => $zoneCode !== '' ? $zoneCode : null,
            'zoneColor' => $shelf->department?->color,
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
     * @return array<string, mixed>|null
     */
    private function transformCooler(Cooler $cooler): ?array
    {
        if (! $this->isOnMap((float) $cooler->pos_x, (float) $cooler->pos_y, (int) $cooler->rotation)) {
            return null;
        }

        $zoneCode = strtoupper((string) ($cooler->department?->code ?? ''));
        $levels = $this->transformLevels($cooler->levels);

        return [
            'id' => $cooler->code,
            'displayName' => $cooler->displayLabel(),
            'equipmentType' => 'cooler',
            'rx' => (float) $cooler->pos_x,
            'ry' => (float) $cooler->pos_y,
            'posX' => (float) $cooler->pos_x,
            'posY' => (float) $cooler->pos_y,
            'rotation' => (int) $cooler->rotation,
            'widthMeters' => $this->mmToMeters((int) $cooler->width_mm),
            'lengthMeters' => $this->mmToMeters((int) $cooler->depth_mm),
            'heightMeters' => $this->mmToMeters((int) $cooler->height_mm),
            'doorCount' => (int) $cooler->door_count,
            'shelfCount' => (int) ($cooler->shelf_count ?: count($levels)),
            'temperatureZone' => $cooler->temperature_zone,
            'levels' => $levels,
            'zoneCode' => $zoneCode !== '' ? $zoneCode : null,
            'zoneColor' => $cooler->department?->color,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function transformStand(Stand $stand): ?array
    {
        if (! $this->isOnMap((float) $stand->pos_x, (float) $stand->pos_y, (int) $stand->rotation)) {
            return null;
        }

        $zoneCode = strtoupper((string) ($stand->department?->code ?? ''));
        $levels = $this->transformLevels($stand->levels);

        return [
            'id' => $stand->code,
            'displayName' => $stand->displayLabel(),
            'equipmentType' => 'stand',
            'rx' => (float) $stand->pos_x,
            'ry' => (float) $stand->pos_y,
            'posX' => (float) $stand->pos_x,
            'posY' => (float) $stand->pos_y,
            'rotation' => (int) $stand->rotation,
            'widthMeters' => $this->mmToMeters((int) $stand->width_mm),
            'lengthMeters' => $this->mmToMeters((int) $stand->depth_mm),
            'heightMeters' => $this->mmToMeters((int) $stand->height_mm),
            'shelfCount' => (int) ($stand->shelf_count ?: count($levels)),
            'standType' => $stand->stand_type,
            'hasBack' => (bool) $stand->has_back,
            'levels' => $levels,
            'zoneCode' => $zoneCode !== '' ? $zoneCode : null,
            'zoneColor' => $stand->department?->color,
        ];
    }

    /**
     * @param  iterable<int, object{level_number: int, height_from_floor_mm: int, capacity_mm?: int|null}>  $levels
     * @return list<array{levelNumber: int, heightFromFloorMeters: float, capacityMeters: float}>
     */
    private function transformLevels(iterable $levels): array
    {
        $result = [];

        foreach ($levels as $level) {
            $result[] = [
                'levelNumber' => (int) $level->level_number,
                'heightFromFloorMeters' => $this->mmToMeters((int) $level->height_from_floor_mm),
                'capacityMeters' => $this->mmToMeters((int) ($level->capacity_mm ?? 0)),
            ];
        }

        usort($result, static fn (array $a, array $b): int => $a['levelNumber'] <=> $b['levelNumber']);

        return $result;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function storeProducts(Store $store): array
    {
        /** @var array<string, array<string, mixed>> $products */
        $products = [];

        foreach ($store->shelves as $shelf) {
            $zoneCode = strtoupper((string) ($shelf->department?->code ?? ''));
            foreach ($shelf->levels as $level) {
                foreach ($level->placements as $placement) {
                    $this->appendPlacement(
                        $products,
                        $placement,
                        'rack',
                        (string) $shelf->code,
                        (int) $level->level_number,
                        (int) $level->height_from_floor_mm,
                        $zoneCode,
                    );
                }
            }
        }

        foreach ($store->coolers as $cooler) {
            $zoneCode = strtoupper((string) ($cooler->department?->code ?? ''));
            foreach ($cooler->levels as $level) {
                foreach ($level->placements as $placement) {
                    $this->appendPlacement(
                        $products,
                        $placement,
                        'cooler',
                        (string) $cooler->code,
                        (int) $level->level_number,
                        (int) $level->height_from_floor_mm,
                        $zoneCode,
                    );
                }
            }
        }

        foreach ($store->stands as $stand) {
            $zoneCode = strtoupper((string) ($stand->department?->code ?? ''));
            foreach ($stand->levels as $level) {
                foreach ($level->placements as $placement) {
                    $this->appendPlacement(
                        $products,
                        $placement,
                        'stand',
                        (string) $stand->code,
                        (int) $level->level_number,
                        (int) $level->height_from_floor_mm,
                        $zoneCode,
                    );
                }
            }
        }

        ksort($products);

        return $products;
    }

    /**
     * @param  array<string, array<string, mixed>>  $products
     */
    private function appendPlacement(
        array &$products,
        Placement $placement,
        string $equipmentType,
        string $equipmentId,
        int $levelNumber,
        int $heightFromFloorMm,
        string $zoneCode,
    ): void {
        $product = $placement->product;
        if (! $product || ! $product->barcode) {
            return;
        }

        $barcode = (string) $product->barcode;

        if (! isset($products[$barcode])) {
            $products[$barcode] = $this->transformProduct($product);
        }

        $entry = [
            'equipmentType' => $equipmentType,
            'equipmentId' => $equipmentId,
            'levelNumber' => $levelNumber,
            'heightFromFloorMeters' => $this->mmToMeters($heightFromFloorMm),
            'startMeter' => $this->cmToMeters((float) $placement->start_cm),
            'endMeter' => $this->cmToMeters((float) $placement->end_cm),
            'facings' => (int) $placement->facings,
            'zoneCode' => $zoneCode !== '' ? $zoneCode : null,
            'comment' => sprintf('Полка %d', $levelNumber),
        ];

        // Backward-compatible aliases for rack placements.
        if ($equipmentType === 'rack') {
            $entry['rack'] = $equipmentId;
            $entry['shelf'] = $levelNumber;
        }

        $products[$barcode]['placements'][] = $entry;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformProduct(Product $product): array
    {
        $widthMm = (int) ($product->width_mm ?? 0);
        $heightMm = (int) ($product->height_mm ?? 0);
        $depthMm = (int) ($product->depth_mm ?? 0);

        return [
            'barcode' => (string) $product->barcode,
            'name' => (string) $product->name,
            'category' => (string) ($product->category ?? ''),
            'checked' => (bool) $product->checked,
            'volumeMl' => $product->volume_ml !== null ? (int) $product->volume_ml : null,
            'packageType' => $product->package_type,
            'widthMm' => $widthMm > 0 ? $widthMm : null,
            'heightMm' => $heightMm > 0 ? $heightMm : null,
            'depthMm' => $depthMm > 0 ? $depthMm : null,
            'widthMeters' => $widthMm > 0 ? $this->mmToMeters($widthMm) : null,
            'heightMeters' => $heightMm > 0 ? $this->mmToMeters($heightMm) : null,
            'depthMeters' => $depthMm > 0 ? $this->mmToMeters($depthMm) : null,
            'placements' => [],
        ];
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
