<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Department;
use App\Models\Shelf;
use App\Models\ShelfLevel;
use Illuminate\Support\Facades\DB;

class ShelfService
{
    public function __construct(
        private readonly EquipmentCodeGenerator $codes,
        private readonly ShelfLevelFactory $levels,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Shelf
    {
        return DB::transaction(function () use ($data): Shelf {
            $department = Department::query()->findOrFail($data['department_id']);
            $code = $this->codes->next(Shelf::class, $department);
            $name = $this->resolveName($data['name'] ?? null, $code);

            $shelf = Shelf::query()->create([
                'store_id' => $department->store_id,
                'department_id' => $department->id,
                'code' => $code,
                'name' => $name,
                'width_mm' => (int) $data['width_mm'],
                'height_mm' => (int) $data['height_mm'],
                'depth_mm' => (int) $data['depth_mm'],
                'shelf_count' => (int) $data['shelf_count'],
                'width_cm' => max(1, (int) round(((int) $data['width_mm']) / 10)),
                'sort_order' => (int) ($data['sort_order'] ?? 0),
            ]);

            $this->syncLevels($shelf);

            return $shelf->load('levels');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Shelf $shelf, array $data): Shelf
    {
        return DB::transaction(function () use ($shelf, $data): Shelf {
            $department = Department::query()->findOrFail($data['department_id']);
            $nameInput = $data['name'] ?? null;
            $name = $this->resolveName($nameInput, $shelf->code);

            $shelfCount = (int) $data['shelf_count'];
            $heightMm = (int) $data['height_mm'];
            $rebuildLevels = $shelf->shelf_count !== $shelfCount
                || $shelf->height_mm !== $heightMm;

            if ($rebuildLevels && $shelf->placements()->exists()) {
                $rebuildLevels = false;
            }

            $shelf->update([
                'store_id' => $department->store_id,
                'department_id' => $department->id,
                'name' => $name,
                'width_mm' => (int) $data['width_mm'],
                'height_mm' => $heightMm,
                'depth_mm' => (int) $data['depth_mm'],
                'shelf_count' => $shelfCount,
                'width_cm' => max(1, (int) round(((int) $data['width_mm']) / 10)),
                'sort_order' => (int) ($data['sort_order'] ?? $shelf->sort_order),
            ]);

            if ($rebuildLevels) {
                $shelf->levels()->each(function (ShelfLevel $level): void {
                    $level->forceDelete();
                });
                $this->syncLevels($shelf->fresh());
            }

            return $shelf->fresh(['levels']);
        });
    }

    public function previewCode(Department $department): string
    {
        return $this->codes->next(Shelf::class, $department);
    }

    private function syncLevels(Shelf $shelf): void
    {
        foreach ($this->levels->distribute((int) $shelf->shelf_count, (int) $shelf->height_mm) as $level) {
            $shelf->levels()->create($level);
        }
    }

    /**
     * @return array{ru: string, en: string}
     */
    private function resolveName(mixed $name, string $code): array
    {
        $value = trim((string) ($name ?? ''));

        if ($value === '') {
            $value = $code;
        }

        return ['ru' => $value, 'en' => $value];
    }
}
