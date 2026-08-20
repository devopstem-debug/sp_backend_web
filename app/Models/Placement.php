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
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Placement extends Model
{
    use HasUuids, LogsActivity, RestrictsToOwnDepartment, SoftDeletes;

    protected $fillable = [
        'shelf_level_id',
        'product_id',
        'start_cm',
        'end_cm',
        'facings',
    ];

    protected function casts(): array
    {
        return [
            'start_cm' => 'float',
            'end_cm' => 'float',
            'facings' => 'integer',
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

            $builder->whereHas('shelfLevel.shelf.store', function (Builder $query) use ($user): void {
                $query->where('tenant_id', $user->tenant_id);
            });

            static::applyOwnDepartmentScope(
                $builder,
                $user,
                function (Builder $query, string $departmentId): void {
                    $query->whereHas('shelfLevel.shelf', function (Builder $shelfQuery) use ($departmentId): void {
                        $shelfQuery->where('department_id', $departmentId);
                    });
                },
            );
        });
    }

    public function shelfLevel(): BelongsTo
    {
        return $this->belongsTo(ShelfLevel::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
