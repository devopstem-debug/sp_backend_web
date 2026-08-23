<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Visibility for shared catalog entities (products):
 * - owner_tenant_id IS NULL → visible to everyone
 * - owner_tenant_id = T → visible only to tenant T (and Super Admin)
 */
trait BelongsToProductCatalog
{
    protected static function bootBelongsToProductCatalog(): void
    {
        static::addGlobalScope('product_catalog', function (Builder $builder): void {
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
            $ownerColumn = $model->qualifyColumn('owner_tenant_id');

            $builder->where(function (Builder $query) use ($ownerColumn, $user): void {
                $query
                    ->whereNull($ownerColumn)
                    ->orWhere($ownerColumn, $user->tenant_id);
            });
        });
    }

    public function isGlobal(): bool
    {
        return $this->owner_tenant_id === null;
    }

    public function isOwnedBy(?string $tenantId): bool
    {
        return $tenantId !== null && $this->owner_tenant_id === $tenantId;
    }
}
