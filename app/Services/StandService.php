<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Department;
use App\Models\Stand;
use App\Models\StandShelfLevel;
use Illuminate\Support\Facades\DB;

class StandService
{
    public function __construct(
        private readonly EquipmentCodeGenerator $codes,
        private readonly ShelfLevelFactory $levels,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Stand
    {
        return DB::transaction(function () use ($data): Stand {
            $department = Department::query()->findOrFail($data['department_id']);
            $code = $this->codes->next(Stand::class, $department, 'S');
            $name = $this->resolveName($data['display_name'] ?? null, $code);

            $stand = Stand::query()->create([
                'store_id' => $department->store_id,
                'department_id' => $department->id,
                'code' => $code,
                'display_name' => $name,
                'stand_type' => (string) $data['stand_type'],
                'width_mm' => (int) $data['width_mm'],
                'height_mm' => (int) $data['height_mm'],
                'depth_mm' => (int) $data['depth_mm'],
                'shelf_count' => (int) $data['shelf_count'],
                'has_back' => (bool) $data['has_back'],
                'sort_order' => (int) ($data['sort_order'] ?? 0),
            ]);

            $this->syncLevels($stand);

            return $stand->load('levels');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Stand $stand, array $data): Stand
    {
        return DB::transaction(function () use ($stand, $data): Stand {
            $department = Department::query()->findOrFail($data['department_id']);
            $name = $this->resolveName($data['display_name'] ?? null, $stand->code);

            $shelfCount = (int) $data['shelf_count'];
            $heightMm = (int) $data['height_mm'];
            $rebuild = $stand->shelf_count !== $shelfCount || $stand->height_mm !== $heightMm;

            $stand->update([
                'store_id' => $department->store_id,
                'department_id' => $department->id,
                'display_name' => $name,
                'stand_type' => (string) $data['stand_type'],
                'width_mm' => (int) $data['width_mm'],
                'height_mm' => $heightMm,
                'depth_mm' => (int) $data['depth_mm'],
                'shelf_count' => $shelfCount,
                'has_back' => (bool) $data['has_back'],
                'sort_order' => (int) ($data['sort_order'] ?? $stand->sort_order),
            ]);

            if ($rebuild) {
                $stand->levels()->each(fn (StandShelfLevel $level) => $level->forceDelete());
                $this->syncLevels($stand->fresh());
            }

            return $stand->fresh(['levels']);
        });
    }

    public function previewCode(Department $department): string
    {
        return $this->codes->next(Stand::class, $department, 'S');
    }

    private function syncLevels(Stand $stand): void
    {
        foreach ($this->levels->distributeWithoutCm((int) $stand->shelf_count, (int) $stand->height_mm) as $level) {
            $stand->levels()->create($level);
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
