<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Models\StoreLayout;
use App\Models\Wall;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class FloorPlanService
{
    private const OFF_MAP_POSITION = -1;

    /**
     * @return array{
     *     store: array<string, mixed>,
     *     layout: array<string, mixed>,
     *     walls: list<array<string, mixed>>,
     *     shelves: list<array<string, mixed>>,
     *     coolers: list<array<string, mixed>>,
     *     stands: list<array<string, mixed>>
     * }
     */
    public function editorPayload(Store $store): array
    {
        $store->loadMissing(['layout', 'walls']);

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
            ],
            'walls' => $store->walls
                ->sortBy('created_at')
                ->values()
                ->map(fn (Wall $wall) => $this->transformWall($wall))
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
     * @param  array{
     *     layout: array{width_meters: float|int, height_meters: float|int, grid_size_cm: int},
     *     walls: list<array{id?: string|null, start_x: float|int, start_y: float|int, end_x: float|int, end_y: float|int, wall_type?: string|null}>,
     *     shelves: list<array{id: string, pos_x: float|int, pos_y: float|int, rotation: int, on_map?: bool}>,
     *     coolers: list<array{id: string, pos_x: float|int, pos_y: float|int, rotation: int, on_map?: bool}>,
     *     stands: list<array{id: string, pos_x: float|int, pos_y: float|int, rotation: int, on_map?: bool}>
     * }  $payload
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

            $this->syncEquipmentPositions($store->id, Shelf::class, $payload['shelves'] ?? []);
            $this->syncEquipmentPositions($store->id, Cooler::class, $payload['coolers'] ?? []);
            $this->syncEquipmentPositions($store->id, Stand::class, $payload['stands'] ?? []);
        });
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
    ): array {
        $onMap = $posX >= 0
            && $posY >= 0
            && ($posX != 0.0 || $posY != 0.0 || $rotation !== 0);

        return [
            'id' => $id,
            'code' => $code,
            'label' => $label,
            'pos_x' => $onMap ? $posX : 0,
            'pos_y' => $onMap ? $posY : 0,
            'rotation' => $rotation,
            'on_map' => $onMap,
            'width_meters' => $widthMeters,
            'length_meters' => $lengthMeters,
        ];
    }

    private function mmToMeters(int $mm): float
    {
        return round($mm / 1000, 3);
    }

    private function localized(mixed $value): string
    {
        if (is_array($value)) {
            return (string) ($value['ru'] ?? $value['en'] ?? '');
        }

        return (string) ($value ?? '');
    }
}
