<?php

namespace App\Models\Concerns;

use App\Models\Concerns\RestrictsToOwnDepartment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

trait BelongsToTenant
{
    use RestrictsToOwnDepartment;

    protected static function bootBelongsToTenant(): void
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

            /** @var Model $model */
            $model = $builder->getModel();

            $builder->where(
                $model->qualifyColumn('tenant_id'),
                $user->tenant_id,
            );
        });
    }
}
