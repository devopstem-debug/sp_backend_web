<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\RestrictsToOwnDepartment;
use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use BelongsToTenant, HasFactory, HasUuids, LogsActivity, RestrictsToOwnDepartment, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'address',
        'city',
        'latitude',
        'longitude',
        'radius_meters',
        'area_sqm',
        'working_hours',
        'contact_info',
        'status',
        'seo_title',
        'seo_description',
    ];

    protected function casts(): array
    {
        return [
            'name' => 'array',
            'working_hours' => 'array',
            'contact_info' => 'array',
            'seo_title' => 'array',
            'seo_description' => 'array',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'area_sqm' => 'decimal:2',
            'radius_meters' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('department', function (Builder $builder): void {
            $user = Auth::user();

            if (! $user) {
                return;
            }

            static::applyOwnDepartmentScope(
                $builder,
                $user,
                function (Builder $query, string $departmentId) use ($user): void {
                    $storeId = $user->ownedStoreId();

                    if ($storeId === null) {
                        $query->whereRaw('1 = 0');

                        return;
                    }

                    $query->where($query->getModel()->qualifyColumn('id'), $storeId);
                },
            );
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function shelves(): HasMany
    {
        return $this->hasMany(Shelf::class);
    }

    public function coolers(): HasMany
    {
        return $this->hasMany(Cooler::class);
    }

    public function stands(): HasMany
    {
        return $this->hasMany(Stand::class);
    }

    public function syncLogs(): HasMany
    {
        return $this->hasMany(SyncLog::class);
    }

    public function layout(): HasOne
    {
        return $this->hasOne(StoreLayout::class);
    }

    public function walls(): HasMany
    {
        return $this->hasMany(Wall::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
