<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait RestrictsToOwnDepartment
{
    protected static function applyOwnDepartmentScope(
        Builder $builder,
        User $user,
        callable $constrain,
    ): void {
        if (! $user->restrictsToOwnDepartment()) {
            return;
        }

        $departmentId = $user->ownedDepartmentId();

        if ($departmentId === null) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $constrain($builder, $departmentId);
    }
}
