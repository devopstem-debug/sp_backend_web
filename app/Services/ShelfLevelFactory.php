<?php

declare(strict_types=1);

namespace App\Services;

class ShelfLevelFactory
{
    /**
     * Level 1 is the bottom shelf.
     *
     * @return list<array{level_number: int, height_from_floor_mm: int, capacity_mm: int, height_cm: int, sort_order: int}>
     */
    public function distribute(int $shelfCount, int $heightMm): array
    {
        $shelfCount = max(1, $shelfCount);
        $heightMm = max($shelfCount, $heightMm);

        $base = intdiv($heightMm, $shelfCount);
        $remainder = $heightMm % $shelfCount;

        $levels = [];
        $fromFloor = 0;

        for ($number = 1; $number <= $shelfCount; $number++) {
            $capacity = $base + ($number === $shelfCount ? $remainder : 0);

            $levels[] = [
                'level_number' => $number,
                'height_from_floor_mm' => $fromFloor,
                'capacity_mm' => $capacity,
                'height_cm' => max(1, (int) round($capacity / 10)),
                'sort_order' => $number,
            ];

            $fromFloor += $capacity;
        }

        return $levels;
    }

    /**
     * @return list<array{level_number: int, height_from_floor_mm: int, capacity_mm: int, sort_order: int}>
     */
    public function distributeWithoutCm(int $shelfCount, int $heightMm): array
    {
        return array_map(static function (array $level): array {
            return [
                'level_number' => $level['level_number'],
                'height_from_floor_mm' => $level['height_from_floor_mm'],
                'capacity_mm' => $level['capacity_mm'],
                'sort_order' => $level['sort_order'],
            ];
        }, $this->distribute($shelfCount, $heightMm));
    }
}
