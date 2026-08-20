<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Placement;
use App\Models\Product;
use App\Models\Shelf;
use App\Models\ShelfLevel;
use InvalidArgumentException;

class PlacementService
{
    /**
     * @param  array{product_id: string, shelf_level_id: string, facings: int}  $data
     */
    public function create(Shelf $shelf, array $data): Placement
    {
        $level = ShelfLevel::query()->findOrFail($data['shelf_level_id']);

        if ($level->shelf_id !== $shelf->id) {
            throw new InvalidArgumentException('Полка не принадлежит этому стеллажу.');
        }

        $product = Product::query()->findOrFail($data['product_id']);
        $geometry = $this->resolveGeometry($shelf, $level, $product, (int) $data['facings']);

        return Placement::query()->create([
            'shelf_level_id' => $level->id,
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
        Shelf $shelf,
        ShelfLevel $level,
        Product $product,
        int $facings,
    ): array {
        $widthMm = (int) ($product->width_mm ?? 0);

        if ($widthMm <= 0) {
            throw new InvalidArgumentException('У товара не указана ширина.');
        }

        $occupiedCm = round(($widthMm / 10) * $facings, 2);
        $startCm = $this->nextStartCm($level);
        $endCm = round($startCm + $occupiedCm, 2);
        $shelfWidth = (float) $shelf->width_cm;

        if ($endCm > $shelfWidth + 0.001) {
            $free = max(0, round($shelfWidth - $startCm, 2));
            throw new InvalidArgumentException(
                "Нельзя превысить ширину полки ({$shelfWidth} см). Свободно: {$free} см, нужно: {$occupiedCm} см."
            );
        }

        return [
            'start_cm' => $startCm,
            'end_cm' => $endCm,
            'occupied_cm' => $occupiedCm,
        ];
    }

    public function nextStartCm(ShelfLevel $level): float
    {
        $maxEnd = Placement::query()
            ->where('shelf_level_id', $level->id)
            ->max('end_cm');

        return round((float) ($maxEnd ?? 0), 2);
    }

    public static function occupiedCm(int $widthMm, int $facings): float
    {
        return round(($widthMm / 10) * $facings, 2);
    }
}
