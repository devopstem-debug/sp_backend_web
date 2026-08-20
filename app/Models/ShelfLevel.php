<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\RestrictsToOwnDepartment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

class ShelfLevel extends Model
{
    use HasUuids, RestrictsToOwnDepartment, SoftDeletes;

    protected $fillable = [
        'shelf_id',
        'level_number',
        'height_from_floor_mm',
        'capacity_mm',
        'height_cm',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'level_number' => 'integer',
            'height_from_floor_mm' => 'integer',
            'capacity_mm' => 'integer',
            'height_cm' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
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

            $builder->whereHas('shelf.store', function (Builder $query) use ($user): void {
                $query->where('tenant_id', $user->tenant_id);
            });

            static::applyOwnDepartmentScope(
                $builder,
                $user,
                function (Builder $query, string $departmentId): void {
                    $query->whereHas('shelf', function (Builder $shelfQuery) use ($departmentId): void {
                        $shelfQuery->where('department_id', $departmentId);
                    });
                },
            );
        });
    }

    public function shelf(): BelongsTo
    {
        return $this->belongsTo(Shelf::class);
    }

    public function placements(): HasMany
    {
        return $this->hasMany(Placement::class)->orderBy('start_cm');
    }
}
