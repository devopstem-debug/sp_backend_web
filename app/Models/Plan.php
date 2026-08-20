<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\PlanFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Plan extends Model
{
    /** @use HasFactory<PlanFactory> */
    use HasFactory, HasUuids, LogsActivity, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'price_monthly',
        'price_yearly',
        'max_stores',
        'max_users',
        'max_products',
        'features',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_yearly' => 'decimal:2',
            'max_stores' => 'integer',
            'max_users' => 'integer',
            'max_products' => 'integer',
            'features' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function isFree(): bool
    {
        return (float) $this->price_monthly <= 0 && (float) $this->price_yearly <= 0;
    }

    public function priceForInterval(string $interval): string
    {
        return $interval === Subscription::INTERVAL_YEARLY
            ? (string) $this->price_yearly
            : (string) $this->price_monthly;
    }

    /**
     * @return list<string>
     */
    public function featureList(): array
    {
        $features = $this->features ?? [];

        if (! is_array($features)) {
            return [];
        }

        return array_values(array_filter(
            array_map(static fn (mixed $item): string => trim((string) $item), $features),
            static fn (string $item): bool => $item !== '',
        ));
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
