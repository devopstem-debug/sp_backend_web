<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Models\Department;
use App\Models\Store;

trait ProvidesStoreDepartmentOptions
{
    /**
     * @return list<array{id: string, name: string}>
     */
    protected function storesForSelect(): array
    {
        return Store::query()
            ->orderBy('city')
            ->get(['id', 'name', 'city'])
            ->map(function (Store $store) {
                $name = is_array($store->name) ? $store->name : [];
                $label = $name['ru'] ?? $name['en'] ?? 'Без названия';

                if ($store->city) {
                    $label .= ' — '.$store->city;
                }

                return [
                    'id' => $store->id,
                    'name' => $label,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: string, store_id: string, code: string, name: string}>
     */
    protected function departmentsForSelect(?string $storeId = null): array
    {
        return Department::query()
            ->when($storeId, fn ($query) => $query->where('store_id', $storeId))
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get(['id', 'store_id', 'code', 'name'])
            ->map(function (Department $department) {
                $name = is_array($department->name) ? $department->name : [];

                return [
                    'id' => $department->id,
                    'store_id' => $department->store_id,
                    'code' => $department->code,
                    'name' => $name['ru'] ?? $name['en'] ?? '',
                ];
            })
            ->values()
            ->all();
    }

    protected function localized(mixed $value): string
    {
        if (is_array($value)) {
            return (string) ($value['ru'] ?? $value['en'] ?? '');
        }

        return (string) ($value ?? '');
    }
}
