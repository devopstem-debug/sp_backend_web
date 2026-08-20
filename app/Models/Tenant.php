<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory, HasUuids, LogsActivity, SoftDeletes;

    public const PLAN_FREE = 'free';

    public const PLAN_BASIC = 'basic';

    public const PLAN_PRO = 'pro';

    public const PLAN_ENTERPRISE = 'enterprise';

    /**
     * @return list<string>
     */
    public static function plans(): array
    {
        return [
            self::PLAN_FREE,
            self::PLAN_BASIC,
            self::PLAN_PRO,
            self::PLAN_ENTERPRISE,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function planLabels(): array
    {
        return [
            self::PLAN_FREE => 'Free',
            self::PLAN_BASIC => 'Basic',
            self::PLAN_PRO => 'Pro',
            self::PLAN_ENTERPRISE => 'Enterprise',
        ];
    }

    protected $fillable = [
        'name',
        'domain',
        'plan',
        'subscription_until',
        'max_stores',
        'max_users',
        'max_products',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'subscription_until' => 'date',
            'max_stores' => 'integer',
            'max_users' => 'integer',
            'max_products' => 'integer',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(Setting::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function catalogPlan(): ?Plan
    {
        if (! $this->plan) {
            return null;
        }

        return Plan::query()->where('slug', $this->plan)->first();
    }

    public function activeSubscription(): ?Subscription
    {
        return $this->subscriptions()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->where('ends_at', '>', now())
            ->orderByDesc('ends_at')
            ->first();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->activeSubscription() !== null;
    }

    public function planLabel(): string
    {
        $catalog = $this->catalogPlan();

        if ($catalog) {
            return $catalog->name;
        }

        return self::planLabels()[$this->plan] ?? (string) $this->plan;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
