<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use Illuminate\Routing\Controllers\Middleware;

trait AuthorizesResourcePermissions
{
    /**
     * @return list<Middleware>
     */
    protected static function resourcePermissionMiddleware(
        string $view,
        string $create,
        string $edit,
        string $delete,
        ?string $restore = null,
    ): array {
        $middleware = [
            new Middleware('permission:'.$view, only: ['index', 'show']),
            new Middleware('permission:'.$create, only: ['create', 'store']),
            new Middleware('permission:'.$edit, only: ['edit', 'update']),
            new Middleware('permission:'.$delete, only: ['destroy', 'forceDelete']),
            new Middleware('permission:'.($restore ?? $delete), only: ['restore']),
        ];

        return $middleware;
    }
}
