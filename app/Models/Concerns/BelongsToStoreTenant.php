<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Concerns\RestrictsToOwnDepartment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait BelongsToStoreTenant
{
    use RestrictsToOwnDepartment;

    protected static function bootBelongsToStoreTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder): void {
            $user = Auth::user();

            if (! $user) {
                return;
            }

            if ($user->isSuperAdmin()) {
                return;
            }

            if ($user->tenant_id === null) {
                $builder->whereRaw('1 = 0');

                return;
            }

            $builder->whereHas('store', function (Builder $query) use ($user): void {
                $query->where('tenant_id', $user->tenant_id);
            });

            static::applyOwnDepartmentScope(
                $builder,
                $user,
                function (Builder $query, string $departmentId): void {
                    $query->where($query->getModel()->qualifyColumn('department_id'), $departmentId);
                },
            );
        });
    }
}
