<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Models\StoreLayout;
use App\Models\StoreLayoutMarker;
use App\Models\Wall;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class FloorPlanService
{
    private const OFF_MAP_POSITION = -1;

    /**
     * @return array<string, mixed>
     */
    public function editorPayload(Store $store): array
    {
        $store->loadMissing(['layout', 'walls', 'layoutMarkers']);

        $layout = $store->layout ?? StoreLayout::query()->create([
            'store_id' => $store->id,
            'width_meters' => 30,
            'height_meters' => 25,
            'grid_size_cm' => 50,
        ]);

        $shelves = Shelf::query()
            ->where('store_id', $store->id)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        $coolers = Cooler::query()
            ->where('store_id', $store->id)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        $stands = Stand::query()
            ->where('store_id', $store->id)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        return [
            'store' => [
                'id' => $store->id,
                'name' => $this->localized($store->name),
                'city' => $store->city,
            ],
            'layout' => [
                'width_meters' => (float) $layout->width_meters,
                'height_meters' => (float) $layout->height_meters,
                'grid_size_cm' => (int) $layout->grid_size_cm,
                'entrance_side' => $layout->entrance_side,
                'entrance_offset_m' => $layout->entrance_offset_m !== null
                    ? (float) $layout->entrance_offset_m
                    : null,
                'entrance_width_m' => $layout->entrance_width_m !== null
                    ? (float) $layout->entrance_width_m
                    : null,
                'has_cash_registers' => (bool) $layout->has_cash_registers,
                'cash_side' => $layout->cash_side,
                'cash_count' => (int) $layout->cash_count,
                'origin' => $layout->origin ?: 'sw',
                'geo_polygon' => $layout->geo_polygon,
                'geo_center_lat' => $layout->geo_center_lat !== null
                    ? (float) $layout->geo_center_lat
                    : null,
                'geo_center_lng' => $layout->geo_center_lng !== null
                    ? (float) $layout->geo_center_lng
                    : null,
                'geo_address' => $layout->geo_address,
                'area_sqm_geo' => $layout->area_sqm_geo !== null
                    ? (float) $layout->area_sqm_geo
                    : null,
                'bearing_degrees' => $layout->bearing_degrees !== null
                    ? (float) $layout->bearing_degrees
                    : 0,
            ],
            'walls' => $store->walls
                ->sortBy('created_at')
                ->values()
                ->map(fn (Wall $wall) => $this->transformWall($wall))
                ->all(),
            'markers' => $store->layoutMarkers
                ->sortBy('code')
                ->values()
                ->map(fn (StoreLayoutMarker $marker) => $this->transformMarker($marker))
                ->all(),
            'shelves' => $shelves
                ->map(fn (Shelf $shelf) => $this->transformShelf($shelf))
                ->all(),
            'coolers' => $coolers
                ->map(fn (Cooler $cooler) => $this->transformCooler($cooler))
                ->all(),
            'stands' => $stands
                ->map(fn (Stand $stand) => $this->transformStand($stand))
                ->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function save(Store $store, array $payload): void
    {
        DB::transaction(function () use ($store, $payload): void {
            $layoutData = $payload['layout'];

            StoreLayout::query()->updateOrCreate(
                ['store_id' => $store->id],
                [
                    'width_meters' => $layoutData['width_meters'],
                    'height_meters' => $layoutData['height_meters'],
                    'grid_size_cm' => $layoutData['grid_size_cm'],
                ],
            );

            $incomingWallIds = [];

            foreach ($payload['walls'] as $wallData) {
                $attributes = [
                    'store_id' => $store->id,
                    'start_x' => $wallData['start_x'],
                    'start_y' => $wallData['start_y'],
                    'end_x' => $wallData['end_x'],
                    'end_y' => $wallData['end_y'],
                    'wall_type' => $wallData['wall_type'] ?? 'wall',
                ];

                if (! empty($wallData['id'])) {
                    $wall = Wall::query()
                        ->where('store_id', $store->id)
                        ->find($wallData['id']);

                    if ($wall) {
                        $wall->update($attributes);
                        $incomingWallIds[] = $wall->id;

                        continue;
                    }
                }

                $wall = Wall::query()->create($attributes);
                $incomingWallIds[] = $wall->id;
            }

            Wall::query()
                ->where('store_id', $store->id)
                ->whereNotIn('id', $incomingWallIds)
                ->delete();

            $this->syncMarkers($store->id, $payload['markers'] ?? []);
            $this->syncEquipmentPositions($store->id, Shelf::class, $payload['shelves'] ?? []);
            $this->syncEquipmentPositions($store->id, Cooler::class, $payload['coolers'] ?? []);
            $this->syncEquipmentPositions($store->id, Stand::class, $payload['stands'] ?? []);
        });
    }

    /**
     * @param  list<array<string, mixed>>  $markers
     */
    private function syncMarkers(string $storeId, array $markers): void
    {
        $incomingIds = [];

        foreach ($markers as $data) {
            $type = (string) ($data['marker_type'] ?? '');
            if (! isset(StoreLayoutMarker::TYPES[$type])) {
                continue;
            }

            $defaults = StoreLayoutMarker::DEFAULTS[$type];
            $attributes = [
                'store_id' => $storeId,
                'marker_type' => $type,
                'code' => trim((string) ($data['code'] ?? '')) ?: Str::upper(Str::substr($type, 0, 2)).'-01',
                'pos_x' => $data['pos_x'],
                'pos_y' => $data['pos_y'],
                'rotation' => $this->normalizeRotation((int) ($data['rotation'] ?? 0)),
                'width_meters' => $data['width_meters'] ?? $defaults['width'],
                'depth_meters' => $data['depth_meters'] ?? $defaults['depth'],
                'color' => $data['color'] ?? $defaults['color'],
            ];

            if (! empty($data['id']) && Str::isUuid((string) $data['id'])) {
                $marker = StoreLayoutMarker::query()
                    ->where('store_id', $storeId)
                    ->find($data['id']);

                if ($marker) {
                    $marker->update($attributes);
                    $incomingIds[] = $marker->id;

                    continue;
                }
            }

            // Client may send temp ids like "tmp-..."
            $marker = StoreLayoutMarker::query()->create($attributes);
            $incomingIds[] = $marker->id;
        }

        StoreLayoutMarker::query()
            ->where('store_id', $storeId)
            ->when(
                $incomingIds !== [],
                fn ($q) => $q->whereNotIn('id', $incomingIds),
                fn ($q) => $q,
            )
            ->delete();
    }

    /**
     * Initial hall setup: dimensions, perimeter walls with entrance gap, cash markers.
     *
     * @param  array<string, mixed>  $data
     */
    public function setupHall(Store $store, array $data): StoreLayout
    {
        return DB::transaction(function () use ($store, $data): StoreLayout {
            $replace = (bool) ($data['replace_existing'] ?? true);
            $width = round((float) $data['width_meters'], 1);
            $height = round((float) $data['height_meters'], 1);
            $grid = (int) ($data['grid_size_cm'] ?? 50);
            $entranceSide = (string) $data['entrance_side'];
            $entranceOffset = round((float) $data['entrance_offset_m'], 1);
            $entranceWidth = round((float) $data['entrance_width_m'], 1);
            $hasCash = (bool) $data['has_cash_registers'];
            $cashSide = $hasCash ? (string) ($data['cash_side'] ?? $entranceSide) : null;
            $cashCount = $hasCash ? (int) ($data['cash_count'] ?? 0) : 0;

            $layout = StoreLayout::query()->updateOrCreate(
                ['store_id' => $store->id],
                [
                    'width_meters' => $width,
                    'height_meters' => $height,
                    'grid_size_cm' => $grid,
                    'entrance_side' => $entranceSide,
                    'entrance_offset_m' => $entranceOffset,
                    'entrance_width_m' => $entranceWidth,
                    'has_cash_registers' => $hasCash,
                    'cash_side' => $cashSide,
                    'cash_count' => $cashCount,
                    'origin' => 'sw',
                    'geo_polygon' => $data['geo_polygon'] ?? null,
                    'geo_center_lat' => $data['geo_center_lat'] ?? null,
                    'geo_center_lng' => $data['geo_center_lng'] ?? null,
                    'geo_address' => $data['geo_address'] ?? null,
                    'area_sqm_geo' => $data['area_sqm_geo'] ?? null,
                    'bearing_degrees' => $data['bearing_degrees'] ?? 0,
                ],
            );

            if ($replace) {
                Wall::query()->where('store_id', $store->id)->delete();
                StoreLayoutMarker::query()
                    ->where('store_id', $store->id)
                    ->whereIn('marker_type', ['entrance', 'exit', 'cash_register'])
                    ->delete();
            }

            foreach ($this->buildPerimeterWalls($width, $height, $entranceSide, $entranceOffset, $entranceWidth) as $wall) {
                Wall::query()->create([
                    'store_id' => $store->id,
                    ...$wall,
                ]);
            }

            $entrance = $this->entranceMarkerPose(
                $width,
                $height,
                $entranceSide,
                $entranceOffset,
                $entranceWidth,
            );

            StoreLayoutMarker::query()->create([
                'store_id' => $store->id,
                'marker_type' => 'entrance',
                'code' => 'IN-01',
                'pos_x' => $entrance['pos_x'],
                'pos_y' => $entrance['pos_y'],
                'rotation' => $entrance['rotation'],
                'width_meters' => $entrance['width_meters'],
                'depth_meters' => $entrance['depth_meters'],
                'color' => StoreLayoutMarker::DEFAULTS['entrance']['color'],
            ]);

            if ($hasCash && $cashCount > 0 && $cashSide) {
                foreach ($this->cashMarkerPoses($width, $height, $cashSide, $cashCount) as $index => $pose) {
                    StoreLayoutMarker::query()->create([
                        'store_id' => $store->id,
                        'marker_type' => 'cash_register',
                        'code' => 'CR-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                        'pos_x' => $pose['pos_x'],
                        'pos_y' => $pose['pos_y'],
                        'rotation' => $pose['rotation'],
                        'width_meters' => $pose['width_meters'],
                        'depth_meters' => $pose['depth_meters'],
                        'color' => StoreLayoutMarker::DEFAULTS['cash_register']['color'],
                    ]);
                }
            }

            return $layout->fresh();
        });
    }

    /**
     * @return list<array{start_x: float, start_y: float, end_x: float, end_y: float, wall_type: string}>
     */
    private function buildPerimeterWalls(
        float $width,
        float $height,
        string $entranceSide,
        float $entranceOffset,
        float $entranceWidth,
    ): array {
        $walls = [];
        $gapStart = $entranceOffset;
        $gapEnd = $entranceOffset + $entranceWidth;

        // South (y=0), West→East
        if ($entranceSide === 'south') {
            if ($gapStart > 0) {
                $walls[] = ['start_x' => 0, 'start_y' => 0, 'end_x' => $gapStart, 'end_y' => 0, 'wall_type' => 'wall'];
            }
            $walls[] = ['start_x' => $gapStart, 'start_y' => 0, 'end_x' => $gapEnd, 'end_y' => 0, 'wall_type' => 'door'];
            if ($gapEnd < $width) {
                $walls[] = ['start_x' => $gapEnd, 'start_y' => 0, 'end_x' => $width, 'end_y' => 0, 'wall_type' => 'wall'];
            }
        } else {
            $walls[] = ['start_x' => 0, 'start_y' => 0, 'end_x' => $width, 'end_y' => 0, 'wall_type' => 'wall'];
        }

        // North (y=height), West→East
        if ($entranceSide === 'north') {
            if ($gapStart > 0) {
                $walls[] = ['start_x' => 0, 'start_y' => $height, 'end_x' => $gapStart, 'end_y' => $height, 'wall_type' => 'wall'];
            }
            $walls[] = ['start_x' => $gapStart, 'start_y' => $height, 'end_x' => $gapEnd, 'end_y' => $height, 'wall_type' => 'door'];
            if ($gapEnd < $width) {
                $walls[] = ['start_x' => $gapEnd, 'start_y' => $height, 'end_x' => $width, 'end_y' => $height, 'wall_type' => 'wall'];
            }
        } else {
            $walls[] = ['start_x' => 0, 'start_y' => $height, 'end_x' => $width, 'end_y' => $height, 'wall_type' => 'wall'];
        }

        // West (x=0), South→North
        if ($entranceSide === 'west') {
            if ($gapStart > 0) {
                $walls[] = ['start_x' => 0, 'start_y' => 0, 'end_x' => 0, 'end_y' => $gapStart, 'wall_type' => 'wall'];
            }
            $walls[] = ['start_x' => 0, 'start_y' => $gapStart, 'end_x' => 0, 'end_y' => $gapEnd, 'wall_type' => 'door'];
            if ($gapEnd < $height) {
                $walls[] = ['start_x' => 0, 'start_y' => $gapEnd, 'end_x' => 0, 'end_y' => $height, 'wall_type' => 'wall'];
            }
        } else {
            $walls[] = ['start_x' => 0, 'start_y' => 0, 'end_x' => 0, 'end_y' => $height, 'wall_type' => 'wall'];
        }

        // East (x=width), South→North
        if ($entranceSide === 'east') {
            if ($gapStart > 0) {
                $walls[] = ['start_x' => $width, 'start_y' => 0, 'end_x' => $width, 'end_y' => $gapStart, 'wall_type' => 'wall'];
            }
            $walls[] = ['start_x' => $width, 'start_y' => $gapStart, 'end_x' => $width, 'end_y' => $gapEnd, 'wall_type' => 'door'];
            if ($gapEnd < $height) {
                $walls[] = ['start_x' => $width, 'start_y' => $gapEnd, 'end_x' => $width, 'end_y' => $height, 'wall_type' => 'wall'];
            }
        } else {
            $walls[] = ['start_x' => $width, 'start_y' => 0, 'end_x' => $width, 'end_y' => $height, 'wall_type' => 'wall'];
        }

        return $walls;
    }

    /**
     * @return array{pos_x: float, pos_y: float, rotation: int, width_meters: float, depth_meters: float}
     */
    private function entranceMarkerPose(
        float $width,
        float $height,
        string $side,
        float $offset,
        float $entranceWidth,
    ): array {
        $depth = 0.6;

        return match ($side) {
            'south' => [
                'pos_x' => $offset,
                'pos_y' => 0,
                'rotation' => 0,
                'width_meters' => $entranceWidth,
                'depth_meters' => $depth,
            ],
            'north' => [
                'pos_x' => $offset,
                'pos_y' => max(0, $height - $depth),
                'rotation' => 180,
                'width_meters' => $entranceWidth,
                'depth_meters' => $depth,
            ],
            'west' => [
                'pos_x' => 0,
                'pos_y' => $offset,
                'rotation' => 90,
                'width_meters' => $depth,
                'depth_meters' => $entranceWidth,
            ],
            default => [ // east
                'pos_x' => max(0, $width - $depth),
                'pos_y' => $offset,
                'rotation' => 270,
                'width_meters' => $depth,
                'depth_meters' => $entranceWidth,
            ],
        };
    }

    /**
     * @return list<array{pos_x: float, pos_y: float, rotation: int, width_meters: float, depth_meters: float}>
     */
    private function cashMarkerPoses(float $width, float $height, string $side, int $count): array
    {
        $poses = [];
        $cashW = 1.2;
        $cashD = 0.8;
        $gap = 0.4;
        $total = $count * $cashW + max(0, $count - 1) * $gap;

        if (in_array($side, ['north', 'south'], true)) {
            $startX = max(0.5, ($width - $total) / 2);
            $y = $side === 'south' ? 0.3 : max(0, $height - $cashD - 0.3);
            for ($i = 0; $i < $count; $i++) {
                $poses[] = [
                    'pos_x' => round($startX + $i * ($cashW + $gap), 2),
                    'pos_y' => round($y, 2),
                    'rotation' => $side === 'south' ? 0 : 180,
                    'width_meters' => $cashW,
                    'depth_meters' => $cashD,
                ];
            }
        } else {
            $startY = max(0.5, ($height - $total) / 2);
            $x = $side === 'west' ? 0.3 : max(0, $width - $cashD - 0.3);
            for ($i = 0; $i < $count; $i++) {
                $poses[] = [
                    'pos_x' => round($x, 2),
                    'pos_y' => round($startY + $i * ($cashW + $gap), 2),
                    'rotation' => $side === 'west' ? 90 : 270,
                    'width_meters' => $cashD,
                    'depth_meters' => $cashW,
                ];
            }
        }

        return $poses;
    }

    /**
     * @param  array{start_x: float|int, start_y: float|int, end_x: float|int, end_y: float|int, wall_type?: string|null}  $data
     * @return array<string, mixed>
     */
    public function addWall(Store $store, array $data): array
    {
        $wall = Wall::query()->create([
            'store_id' => $store->id,
            'start_x' => $data['start_x'],
            'start_y' => $data['start_y'],
            'end_x' => $data['end_x'],
            'end_y' => $data['end_y'],
            'wall_type' => $data['wall_type'] ?? 'wall',
        ]);

        return $this->transformWall($wall);
    }

    public function removeWall(Wall $wall): void
    {
        $wall->delete();
    }

    public function resolveStore(string $storeId): Store
    {
        $store = Store::query()->find($storeId);

        if (! $store) {
            throw new InvalidArgumentException('Магазин не найден.');
        }

        return $store;
    }

    /**
     * @param  class-string<Shelf|Cooler|Stand>  $modelClass
     * @param  list<array{id: string, pos_x: float|int, pos_y: float|int, rotation: int, on_map?: bool}>  $items
     */
    private function syncEquipmentPositions(string $storeId, string $modelClass, array $items): void
    {
        foreach ($items as $item) {
            $model = $modelClass::query()
                ->where('store_id', $storeId)
                ->find($item['id']);

            if (! $model) {
                continue;
            }

            $onMap = $item['on_map'] ?? true;

            if (! $onMap) {
                $model->update([
                    'pos_x' => self::OFF_MAP_POSITION,
                    'pos_y' => self::OFF_MAP_POSITION,
                    'rotation' => 0,
                ]);

                continue;
            }

            $model->update([
                'pos_x' => $item['pos_x'],
                'pos_y' => $item['pos_y'],
                'rotation' => $this->normalizeRotation((int) $item['rotation']),
            ]);
        }
    }

    private function normalizeRotation(int $rotation): int
    {
        $normalized = $rotation % 360;

        if ($normalized < 0) {
            $normalized += 360;
        }

        return match ($normalized) {
            90, 180, 270 => $normalized,
            default => 0,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function transformWall(Wall $wall): array
    {
        return [
            'id' => $wall->id,
            'start_x' => (float) $wall->start_x,
            'start_y' => (float) $wall->start_y,
            'end_x' => (float) $wall->end_x,
            'end_y' => (float) $wall->end_y,
            'wall_type' => $wall->wall_type,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformMarker(StoreLayoutMarker $marker): array
    {
        return [
            'id' => $marker->id,
            'marker_type' => $marker->marker_type,
            'code' => $marker->code,
            'pos_x' => (float) $marker->pos_x,
            'pos_y' => (float) $marker->pos_y,
            'rotation' => (int) $marker->rotation,
            'width_meters' => (float) $marker->width_meters,
            'depth_meters' => (float) $marker->depth_meters,
            'color' => $marker->color,
            'on_map' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformShelf(Shelf $shelf): array
    {
        return $this->transformEquipment(
            $shelf->id,
            $shelf->code,
            $shelf->displayLabel(),
            (float) $shelf->pos_x,
            (float) $shelf->pos_y,
            (int) $shelf->rotation,
            $this->mmToMeters((int) $shelf->width_mm),
            $this->mmToMeters((int) $shelf->depth_mm),
            '#6366f1',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function transformCooler(Cooler $cooler): array
    {
        return $this->transformEquipment(
            $cooler->id,
            $cooler->code,
            $cooler->displayLabel(),
            (float) $cooler->pos_x,
            (float) $cooler->pos_y,
            (int) $cooler->rotation,
            $this->mmToMeters((int) $cooler->width_mm),
            $this->mmToMeters((int) $cooler->depth_mm),
            '#06b6d4',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function transformStand(Stand $stand): array
    {
        return $this->transformEquipment(
            $stand->id,
            $stand->code,
            $stand->displayLabel(),
            (float) $stand->pos_x,
            (float) $stand->pos_y,
            (int) $stand->rotation,
            $this->mmToMeters((int) $stand->width_mm),
            $this->mmToMeters((int) $stand->depth_mm),
            '#22c55e',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function transformEquipment(
        string $id,
        string $code,
        string $label,
        float $posX,
        float $posY,
        int $rotation,
        float $widthMeters,
        float $lengthMeters,
        string $color,
    ): array {
        $onMap = $posX >= 0
            && $posY >= 0
            && ($posX != 0.0 || $posY != 0.0 || $rotation !== 0);

        // Treat -1,-1 as off map; also treat pure 0,0 with no rotation carefully —
        // keep previous logic for compatibility.
        if ($posX < 0 || $posY < 0) {
            $onMap = false;
        }

        return [
            'id' => $id,
            'code' => $code,
            'label' => $label,
            'pos_x' => $onMap ? $posX : 0,
            'pos_y' => $onMap ? $posY : 0,
            'rotation' => $rotation,
            'on_map' => $onMap,
            'width_meters' => max(0.3, $widthMeters),
            'length_meters' => max(0.3, $lengthMeters),
            'color' => $color,
        ];
    }

    private function mmToMeters(int $mm): float
    {
        return round(max($mm, 300) / 1000, 3);
    }

    private function localized(mixed $value): string
    {
        if (is_array($value)) {
            return (string) ($value['ru'] ?? $value['en'] ?? '');
        }

        return (string) ($value ?? '');
    }
}
