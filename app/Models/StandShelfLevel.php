<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\RestrictsToOwnDepartment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

class StandShelfLevel extends Model
{
    use HasUuids, RestrictsToOwnDepartment, SoftDeletes;

    protected $fillable = [
        'stand_id',
        'level_number',
        'height_from_floor_mm',
        'capacity_mm',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'level_number' => 'integer',
            'height_from_floor_mm' => 'integer',
            'capacity_mm' => 'integer',
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

            $builder->whereHas('stand.store', function (Builder $query) use ($user): void {
                $query->where('tenant_id', $user->tenant_id);
            });

            static::applyOwnDepartmentScope(
                $builder,
                $user,
                function (Builder $query, string $departmentId): void {
                    $query->whereHas('stand', function (Builder $standQuery) use ($departmentId): void {
                        $standQuery->where('department_id', $departmentId);
                    });
                },
            );
        });
    }

    public function stand(): BelongsTo
    {
        return $this->belongsTo(Stand::class);
    }

    public function placements(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Placement::class)->orderBy('start_cm');
    }
}
