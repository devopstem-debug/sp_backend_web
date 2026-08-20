<?php

namespace App\Models;

use App\Models\Concerns\RestrictsToOwnDepartment;
use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Department extends Model
{
    /** @use HasFactory<DepartmentFactory> */
    use HasFactory, HasUuids, LogsActivity, RestrictsToOwnDepartment, SoftDeletes;

    protected $fillable = [
        'store_id',
        'code',
        'name',
        'color',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'name' => 'array',
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

            $builder->whereHas('store', function (Builder $query) use ($user): void {
                $query->where('tenant_id', $user->tenant_id);
            });

            static::applyOwnDepartmentScope(
                $builder,
                $user,
                function (Builder $query, string $departmentId): void {
                    $query->where($query->getModel()->qualifyColumn('id'), $departmentId);
                },
            );
        });
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function shelves(): HasMany
    {
        return $this->hasMany(Shelf::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
