<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\Department;
use App\Models\Payment;
use App\Models\Placement;
use App\Models\Product;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserLoginLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

class AnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $actor = Auth::user();
        $isSuperAdmin = (bool) $actor?->isSuperAdmin();
        $timezone = $actor?->timezone ?? 'UTC';
        $now = Carbon::now('UTC');

        $payload = [
            'scope' => $isSuperAdmin ? 'platform' : 'tenant',
            'generated_at' => $now->copy()->timezone($timezone)->toIso8601String(),
            'overview' => $this->overview($isSuperAdmin),
            'growth' => [
                'stores' => $this->weeklyGrowth(Store::query(), $now),
                'products' => $this->weeklyGrowth(Product::query(), $now),
                'users' => $this->weeklyGrowth(
                    $isSuperAdmin
                        ? User::query()->whereNotNull('tenant_id')
                        : User::query()->where('tenant_id', $actor?->tenant_id),
                    $now,
                ),
            ],
            'products_by_category' => $this->productsByCategory(),
            'products_checked' => $this->productsCheckedBreakdown(),
            'equipment' => $this->equipmentStats(),
            'activity_by_day' => $this->activityByDay($now, $timezone, $isSuperAdmin, $actor?->tenant_id),
            'logins_by_day' => $this->loginsByDay($now, $isSuperAdmin, $actor?->tenant_id),
        ];

        if ($isSuperAdmin) {
            $payload['tenants_by_plan'] = $this->tenantsByPlan();
            $payload['tenants_table'] = $this->tenantsTable();
            $payload['subscriptions_by_status'] = $this->subscriptionsByStatus();
            $payload['payments'] = $this->paymentsSummary();
            $payload['expiring_tenants'] = $this->expiringTenants($now);
            $payload['quota_pressure'] = $this->quotaPressure();
        } else {
            $payload['tenant'] = $this->currentTenantCard($actor?->tenant_id);
            $payload['shelf_fill_rate'] = $this->shelfFillRate();
            $payload['top_stores'] = $this->topStores();
        }

        return $payload;
    }

    /**
     * @return array<string, int|float>
     */
    private function overview(bool $isSuperAdmin): array
    {
        $overview = [
            'stores' => Store::query()->count(),
            'departments' => Department::query()->count(),
            'products' => Product::query()->count(),
            'products_global' => Product::query()->whereNull('owner_tenant_id')->count(),
            'products_private' => Product::query()->whereNotNull('owner_tenant_id')->count(),
            'products_unchecked' => Product::query()->where('checked', false)->count(),
            'placements' => Placement::query()->count(),
            'shelves' => Shelf::query()->count(),
            'coolers' => Cooler::query()->count(),
            'stands' => Stand::query()->count(),
        ];

        if ($isSuperAdmin) {
            $overview['tenants'] = Tenant::query()->count();
            $overview['tenants_active'] = Tenant::query()->where('is_active', true)->count();
            $overview['users'] = User::query()->whereNotNull('tenant_id')->count();
            $overview['users_active'] = User::query()
                ->whereNotNull('tenant_id')
                ->where('is_active', true)
                ->count();
            $overview['subscriptions_active'] = Subscription::query()
                ->where('status', Subscription::STATUS_ACTIVE)
                ->count();
        } else {
            $tenantId = Auth::user()?->tenant_id;
            $overview['users'] = User::query()->where('tenant_id', $tenantId)->count();
            $overview['users_active'] = User::query()
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->count();
        }

        return $overview;
    }

    /**
     * @return list<array{plan: string, label: string, count: int}>
     */
    private function tenantsByPlan(): array
    {
        $labels = Tenant::planLabels();

        return Tenant::query()
            ->select('plan', DB::raw('COUNT(*) as count'))
            ->groupBy('plan')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'plan' => (string) $row->plan,
                'label' => $labels[$row->plan] ?? (string) $row->plan,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function tenantsTable(): array
    {
        return Tenant::query()
            ->withCount(['stores', 'users', 'products'])
            ->orderByDesc('stores_count')
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(function (Tenant $tenant): array {
                $storesUsed = (int) $tenant->stores_count;
                $usersUsed = (int) $tenant->users_count;

                return [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'domain' => $tenant->domain,
                    'plan' => $tenant->plan,
                    'plan_label' => $tenant->planLabel(),
                    'is_active' => (bool) $tenant->is_active,
                    'subscription_until' => $tenant->subscription_until?->toDateString(),
                    'stores' => $storesUsed,
                    'max_stores' => (int) $tenant->max_stores,
                    'stores_pct' => $this->pct($storesUsed, (int) $tenant->max_stores),
                    'users' => $usersUsed,
                    'max_users' => (int) $tenant->max_users,
                    'users_pct' => $this->pct($usersUsed, (int) $tenant->max_users),
                    // Private-label SKUs only (shared catalog is not quota-bound).
                    'private_products' => (int) $tenant->products_count,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array{status: string, label: string, count: int}>
     */
    private function subscriptionsByStatus(): array
    {
        $labels = [
            Subscription::STATUS_PENDING => 'Ожидает',
            Subscription::STATUS_ACTIVE => 'Активна',
            Subscription::STATUS_PAST_DUE => 'Просрочена оплата',
            Subscription::STATUS_EXPIRED => 'Истекла',
            Subscription::STATUS_CANCELLED => 'Отменена',
        ];

        return Subscription::query()
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'status' => (string) $row->status,
                'label' => $labels[$row->status] ?? (string) $row->status,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{paid_total: float, paid_count: int, awaiting_count: int, pending_count: int, currency: string}
     */
    private function paymentsSummary(): array
    {
        $paid = Payment::query()->where('status', Payment::STATUS_PAID);

        return [
            'paid_total' => (float) (clone $paid)->sum('amount'),
            'paid_count' => (clone $paid)->count(),
            'awaiting_count' => Payment::query()->where('status', Payment::STATUS_AWAITING)->count(),
            'pending_count' => Payment::query()->where('status', Payment::STATUS_PENDING)->count(),
            'currency' => Payment::CURRENCY_BYN,
        ];
    }

    /**
     * @return list<array{id: string, name: string, plan_label: string, subscription_until: string|null, days_left: int}>
     */
    private function expiringTenants(Carbon $now): array
    {
        return Tenant::query()
            ->whereNotNull('subscription_until')
            ->whereDate('subscription_until', '>=', $now->toDateString())
            ->whereDate('subscription_until', '<=', $now->copy()->addDays(30)->toDateString())
            ->orderBy('subscription_until')
            ->limit(10)
            ->get()
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'plan_label' => $tenant->planLabel(),
                'subscription_until' => $tenant->subscription_until?->toDateString(),
                'days_left' => max(0, (int) $now->diffInDays($tenant->subscription_until, false)),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: string, name: string, metric: string, used: int, max: int, pct: float}>
     */
    private function quotaPressure(): array
    {
        $tenants = Tenant::query()
            ->withCount(['stores', 'users', 'products'])
            ->get();

        $rows = [];

        foreach ($tenants as $tenant) {
            $checks = [
                ['metric' => 'Магазины', 'used' => (int) $tenant->stores_count, 'max' => (int) $tenant->max_stores],
                ['metric' => 'Пользователи', 'used' => (int) $tenant->users_count, 'max' => (int) $tenant->max_users],
            ];

            foreach ($checks as $check) {
                $pct = $this->pct($check['used'], $check['max']);
                if ($pct < 80) {
                    continue;
                }

                $rows[] = [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'metric' => $check['metric'],
                    'used' => $check['used'],
                    'max' => $check['max'],
                    'pct' => $pct,
                ];
            }
        }

        usort($rows, static fn (array $a, array $b): int => $b['pct'] <=> $a['pct']);

        return array_slice($rows, 0, 12);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function currentTenantCard(?string $tenantId): ?array
    {
        if (! $tenantId) {
            return null;
        }

        $tenant = Tenant::query()->withCount(['stores', 'users', 'products'])->find($tenantId);

        if (! $tenant) {
            return null;
        }

        return [
            'name' => $tenant->name,
            'plan_label' => $tenant->planLabel(),
            'subscription_until' => $tenant->subscription_until?->toDateString(),
            'is_active' => (bool) $tenant->is_active,
            'stores' => (int) $tenant->stores_count,
            'max_stores' => (int) $tenant->max_stores,
            'users' => (int) $tenant->users_count,
            'max_users' => (int) $tenant->max_users,
            'private_products' => (int) $tenant->products_count,
            'catalog_products' => Product::query()->count(),
        ];
    }

    /**
     * @return array{checked: int, unchecked: int}
     */
    private function productsCheckedBreakdown(): array
    {
        return [
            'checked' => Product::query()->where('checked', true)->count(),
            'unchecked' => Product::query()->where('checked', false)->count(),
        ];
    }

    /**
     * @return array{shelves: int, coolers: int, stands: int, departments: int, placements: int}
     */
    private function equipmentStats(): array
    {
        return [
            'shelves' => Shelf::query()->count(),
            'coolers' => Cooler::query()->count(),
            'stands' => Stand::query()->count(),
            'departments' => Department::query()->count(),
            'placements' => Placement::query()->count(),
        ];
    }

    /**
     * @return list<array{category: string, count: int}>
     */
    private function productsByCategory(): array
    {
        return Product::query()
            ->select('category', DB::raw('COUNT(*) as count'))
            ->groupBy('category')
            ->orderByDesc('count')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'category' => (string) ($row->category ?: 'Без категории'),
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{name: string, departments: int, products: int}>
     */
    private function topStores(): array
    {
        return Store::query()
            ->withCount(['departments'])
            ->orderByDesc('departments_count')
            ->limit(8)
            ->get()
            ->map(function (Store $store): array {
                $name = is_array($store->name) ? $store->name : [];

                return [
                    'name' => $name['ru'] ?? $name['en'] ?? 'Магазин',
                    'departments' => (int) $store->departments_count,
                    'city' => (string) ($store->city ?: '—'),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array{code: string, fillRate: float}>
     */
    private function shelfFillRate(): array
    {
        $shelves = Shelf::query()
            ->with(['levels.placements:id,shelf_level_id,start_cm,end_cm'])
            ->orderBy('code')
            ->limit(12)
            ->get(['id', 'code', 'width_cm', 'shelf_count']);

        return $shelves
            ->map(function (Shelf $shelf): array {
                $levelsCount = max(1, (int) ($shelf->levels->count() ?: $shelf->shelf_count ?: 1));
                $widthCm = max(1, (int) ($shelf->width_cm ?: 0));
                $capacity = $widthCm * $levelsCount;

                $occupied = $shelf->levels->sum(function ($level): float {
                    return $level->placements->sum(function (Placement $placement): float {
                        return max(0, (float) $placement->end_cm - (float) $placement->start_cm);
                    });
                });

                return [
                    'code' => (string) $shelf->code,
                    'fillRate' => $capacity > 0
                        ? min(100, round(($occupied / $capacity) * 100, 1))
                        : 0.0,
                ];
            })
            ->sortByDesc('fillRate')
            ->values()
            ->take(8)
            ->all();
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     * @return array{delta: int, this_week: int, previous_week: int}
     */
    private function weeklyGrowth($query, Carbon $now): array
    {
        $thisWeekStart = $now->copy()->subDays(7);
        $previousWeekStart = $now->copy()->subDays(14);

        $thisWeek = (clone $query)
            ->where('created_at', '>=', $thisWeekStart)
            ->count();

        $previousWeek = (clone $query)
            ->where('created_at', '>=', $previousWeekStart)
            ->where('created_at', '<', $thisWeekStart)
            ->count();

        return [
            'delta' => $thisWeek - $previousWeek,
            'this_week' => $thisWeek,
            'previous_week' => $previousWeek,
        ];
    }

    /**
     * @return list<array{date: string, count: int}>
     */
    private function activityByDay(
        Carbon $now,
        string $timezone,
        bool $isSuperAdmin,
        ?string $tenantId,
    ): array {
        $from = $now->copy()->subDays(13)->startOfDay();

        $query = Activity::query()->where('created_at', '>=', $from);

        if (! $isSuperAdmin) {
            $userIds = User::query()->where('tenant_id', $tenantId)->pluck('id');
            $query->whereIn('causer_id', $userIds);
        }

        $rows = $query
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as count'))
            ->groupBy('day')
            ->pluck('count', 'day');

        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i)->toDateString();
            $series[] = [
                'date' => $day,
                'label' => $now->copy()->subDays($i)->timezone($timezone)->format('d.m'),
                'count' => (int) ($rows[$day] ?? 0),
            ];
        }

        return $series;
    }

    /**
     * @return list<array{date: string, success: int, failed: int}>
     */
    private function loginsByDay(Carbon $now, bool $isSuperAdmin, ?string $tenantId): array
    {
        $from = $now->copy()->subDays(13)->startOfDay();

        $query = UserLoginLog::query()->where('created_at', '>=', $from);

        if (! $isSuperAdmin) {
            $query->whereHas('user', fn ($q) => $q->where('tenant_id', $tenantId));
        }

        $rows = $query
            ->select(
                DB::raw('DATE(created_at) as day'),
                DB::raw("SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success"),
                DB::raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed"),
            )
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $series = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i)->toDateString();
            $row = $rows[$day] ?? null;
            $series[] = [
                'date' => $day,
                'label' => $now->copy()->subDays($i)->format('d.m'),
                'success' => (int) ($row->success ?? 0),
                'failed' => (int) ($row->failed ?? 0),
            ];
        }

        return $series;
    }

    private function pct(int $used, int $max): float
    {
        if ($max <= 0) {
            return 0.0;
        }

        return min(100, round(($used / $max) * 100, 1));
    }
}
