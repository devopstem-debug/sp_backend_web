<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\CoolerShelfLevel;
use App\Models\Placement;
use App\Models\Product;
use App\Models\Shelf;
use App\Models\ShelfLevel;
use App\Models\Stand;
use App\Models\StandShelfLevel;
use InvalidArgumentException;

class PlacementService
{
    /**
     * @param  array{product_id: string, level_id: string, facings: int}  $data
     */
    public function createForEquipment(string $type, Shelf|Cooler|Stand $equipment, array $data): Placement
    {
        if ($type === 'shelf' && $equipment instanceof Shelf) {
            return $this->createOnShelf($equipment, $data);
        }
        if ($type === 'cooler' && $equipment instanceof Cooler) {
            return $this->createOnCooler($equipment, $data);
        }
        if ($type === 'stand' && $equipment instanceof Stand) {
            return $this->createOnStand($equipment, $data);
        }

        throw new InvalidArgumentException('Тип оборудования не совпадает.');
    }

    /**
     * @param  array{product_id: string, shelf_level_id?: string, level_id?: string, facings: int}  $data
     */
    public function create(Shelf $shelf, array $data): Placement
    {
        $levelId = (string) ($data['level_id'] ?? $data['shelf_level_id'] ?? '');

        return $this->createOnShelf($shelf, [
            'product_id' => $data['product_id'],
            'level_id' => $levelId,
            'facings' => (int) $data['facings'],
        ]);
    }

    /**
     * @param  array{product_id: string, level_id: string, facings: int}  $data
     */
    public function createOnShelf(Shelf $shelf, array $data): Placement
    {
        $level = ShelfLevel::query()->findOrFail($data['level_id']);

        if ($level->shelf_id !== $shelf->id) {
            throw new InvalidArgumentException('Полка не принадлежит этому стеллажу.');
        }

        $product = Product::query()->findOrFail($data['product_id']);
        $widthCm = (float) ($shelf->width_cm ?: max(1, round(((int) $shelf->width_mm) / 10)));
        $geometry = $this->resolveGeometry($widthCm, $this->nextStartCmForShelfLevel($level), $product, (int) $data['facings']);

        return Placement::query()->create([
            'shelf_level_id' => $level->id,
            'cooler_shelf_level_id' => null,
            'stand_shelf_level_id' => null,
            'product_id' => $product->id,
            'start_cm' => $geometry['start_cm'],
            'end_cm' => $geometry['end_cm'],
            'facings' => (int) $data['facings'],
        ]);
    }

    /**
     * @param  array{product_id: string, level_id: string, facings: int}  $data
     */
    public function createOnCooler(Cooler $cooler, array $data): Placement
    {
        $level = CoolerShelfLevel::query()->findOrFail($data['level_id']);

        if ($level->cooler_id !== $cooler->id) {
            throw new InvalidArgumentException('Полка не принадлежит этому холодильнику.');
        }

        $product = Product::query()->findOrFail($data['product_id']);
        $widthCm = max(1.0, round(((int) $cooler->width_mm) / 10, 2));
        $geometry = $this->resolveGeometry($widthCm, $this->nextStartCmForCoolerLevel($level), $product, (int) $data['facings']);

        return Placement::query()->create([
            'shelf_level_id' => null,
            'cooler_shelf_level_id' => $level->id,
            'stand_shelf_level_id' => null,
            'product_id' => $product->id,
            'start_cm' => $geometry['start_cm'],
            'end_cm' => $geometry['end_cm'],
            'facings' => (int) $data['facings'],
        ]);
    }

    /**
     * @param  array{product_id: string, level_id: string, facings: int}  $data
     */
    public function createOnStand(Stand $stand, array $data): Placement
    {
        $level = StandShelfLevel::query()->findOrFail($data['level_id']);

        if ($level->stand_id !== $stand->id) {
            throw new InvalidArgumentException('Полка не принадлежит этой стойке.');
        }

        $product = Product::query()->findOrFail($data['product_id']);
        $widthCm = max(1.0, round(((int) $stand->width_mm) / 10, 2));
        $geometry = $this->resolveGeometry($widthCm, $this->nextStartCmForStandLevel($level), $product, (int) $data['facings']);

        return Placement::query()->create([
            'shelf_level_id' => null,
            'cooler_shelf_level_id' => null,
            'stand_shelf_level_id' => $level->id,
            'product_id' => $product->id,
            'start_cm' => $geometry['start_cm'],
            'end_cm' => $geometry['end_cm'],
            'facings' => (int) $data['facings'],
        ]);
    }

    /**
     * @return array{start_cm: float, end_cm: float, occupied_cm: float}
     */
    public function resolveGeometry(
        float $equipmentWidthCm,
        float $startCm,
        Product $product,
        int $facings,
    ): array {
        $widthMm = (int) ($product->width_mm ?? 0);

        if ($widthMm <= 0) {
            throw new InvalidArgumentException('У товара не указана ширина.');
        }

        $occupiedCm = round(($widthMm / 10) * $facings, 2);
        $endCm = round($startCm + $occupiedCm, 2);

        if ($endCm > $equipmentWidthCm + 0.001) {
            $free = max(0, round($equipmentWidthCm - $startCm, 2));
            throw new InvalidArgumentException(
                "Нельзя превысить ширину полки ({$equipmentWidthCm} см). Свободно: {$free} см, нужно: {$occupiedCm} см."
            );
        }

        return [
            'start_cm' => $startCm,
            'end_cm' => $endCm,
            'occupied_cm' => $occupiedCm,
        ];
    }

    public function nextStartCmForShelfLevel(ShelfLevel $level): float
    {
        $maxEnd = Placement::query()
            ->where('shelf_level_id', $level->id)
            ->max('end_cm');

        return round((float) ($maxEnd ?? 0), 2);
    }

    public function nextStartCmForCoolerLevel(CoolerShelfLevel $level): float
    {
        $maxEnd = Placement::query()
            ->where('cooler_shelf_level_id', $level->id)
            ->max('end_cm');

        return round((float) ($maxEnd ?? 0), 2);
    }

    public function nextStartCmForStandLevel(StandShelfLevel $level): float
    {
        $maxEnd = Placement::query()
            ->where('stand_shelf_level_id', $level->id)
            ->max('end_cm');

        return round((float) ($maxEnd ?? 0), 2);
    }

    /** @deprecated use nextStartCmForShelfLevel */
    public function nextStartCm(ShelfLevel $level): float
    {
        return $this->nextStartCmForShelfLevel($level);
    }

    public static function occupiedCm(int $widthMm, int $facings): float
    {
        return round(($widthMm / 10) * $facings, 2);
    }
}
