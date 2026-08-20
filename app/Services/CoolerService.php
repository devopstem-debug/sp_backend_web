<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\CoolerShelfLevel;
use App\Models\Department;
use Illuminate\Support\Facades\DB;

class CoolerService
{
    public function __construct(
        private readonly EquipmentCodeGenerator $codes,
        private readonly ShelfLevelFactory $levels,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Cooler
    {
        return DB::transaction(function () use ($data): Cooler {
            $department = Department::query()->findOrFail($data['department_id']);
            $code = $this->codes->next(Cooler::class, $department, 'C');
            $name = $this->resolveName($data['display_name'] ?? null, $code);

            $cooler = Cooler::query()->create([
                'store_id' => $department->store_id,
                'department_id' => $department->id,
                'code' => $code,
                'display_name' => $name,
                'width_mm' => (int) $data['width_mm'],
                'height_mm' => (int) $data['height_mm'],
                'depth_mm' => (int) $data['depth_mm'],
                'door_count' => (int) $data['door_count'],
                'shelf_count' => (int) $data['shelf_count'],
                'temperature_zone' => (string) $data['temperature_zone'],
                'sort_order' => (int) ($data['sort_order'] ?? 0),
            ]);

            $this->syncLevels($cooler);

            return $cooler->load('levels');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Cooler $cooler, array $data): Cooler
    {
        return DB::transaction(function () use ($cooler, $data): Cooler {
            $department = Department::query()->findOrFail($data['department_id']);
            $name = $this->resolveName($data['display_name'] ?? null, $cooler->code);

            $shelfCount = (int) $data['shelf_count'];
            $heightMm = (int) $data['height_mm'];
            $rebuild = $cooler->shelf_count !== $shelfCount || $cooler->height_mm !== $heightMm;

            $cooler->update([
                'store_id' => $department->store_id,
                'department_id' => $department->id,
                'display_name' => $name,
                'width_mm' => (int) $data['width_mm'],
                'height_mm' => $heightMm,
                'depth_mm' => (int) $data['depth_mm'],
                'door_count' => (int) $data['door_count'],
                'shelf_count' => $shelfCount,
                'temperature_zone' => (string) $data['temperature_zone'],
                'sort_order' => (int) ($data['sort_order'] ?? $cooler->sort_order),
            ]);

            if ($rebuild) {
                $cooler->levels()->each(fn (CoolerShelfLevel $level) => $level->forceDelete());
                $this->syncLevels($cooler->fresh());
            }

            return $cooler->fresh(['levels']);
        });
    }

    public function previewCode(Department $department): string
    {
        return $this->codes->next(Cooler::class, $department, 'C');
    }

    private function syncLevels(Cooler $cooler): void
    {
        foreach ($this->levels->distributeWithoutCm((int) $cooler->shelf_count, (int) $cooler->height_mm) as $level) {
            $cooler->levels()->create($level);
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
