<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Department;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class EquipmentCodeGenerator
{
    /**
     * @param  class-string<Model>  $modelClass
     */
    public function next(string $modelClass, Department $department, string $prefix = ''): string
    {
        $deptCode = strtoupper(trim($department->code));
        $base = $prefix !== '' ? "{$deptCode}-{$prefix}" : "{$deptCode}-";

        /** @var Builder $query */
        $query = $modelClass::query()
            ->where('store_id', $department->store_id)
            ->where('department_id', $department->id)
            ->where('code', 'ilike', $base.'%');

        $max = 0;

        foreach ($query->pluck('code') as $code) {
            $suffix = substr((string) $code, strlen($base));
            if (ctype_digit($suffix)) {
                $max = max($max, (int) $suffix);
            }
        }

        return sprintf('%s%02d', $base, $max + 1);
    }
}
