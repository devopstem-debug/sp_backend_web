<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TenantService
{
    public function __construct(
        private readonly TenantQuotaService $quotas,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Tenant>
     */
    public function paginate(?string $status, ?string $search): LengthAwarePaginator
    {
        return Tenant::query()
            ->withCount(['stores', 'users'])
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'blocked', fn ($query) => $query->where('is_active', false))
            ->when($search, function ($query) use ($search): void {
                $term = '%'.$search.'%';
                $query->where(function ($builder) use ($term): void {
                    $builder
                        ->where('name', 'ilike', $term)
                        ->orWhere('domain', 'ilike', $term);
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();
    }

    public function create(array $data): Tenant
    {
        $tenant = Tenant::query()->create($data);
        $this->provisionSubscription($tenant);

        return $tenant->refresh();
    }

    public function update(Tenant $tenant, array $data): Tenant
    {
        $tenant->update($data);

        return $tenant->refresh();
    }

    public function toggleActive(Tenant $tenant): Tenant
    {
        $tenant->update(['is_active' => ! $tenant->is_active]);

        return $tenant->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function toListItem(Tenant $tenant): array
    {
        return [
            ...$this->toSummary($tenant),
            'stores_count' => (int) ($tenant->stores_count ?? $this->quotas->storeCount($tenant)),
            'users_count' => (int) ($tenant->users_count ?? $this->quotas->userCount($tenant)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toSummary(Tenant $tenant): array
    {
        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'domain' => $tenant->domain,
            'plan' => $tenant->plan,
            'plan_label' => $tenant->planLabel(),
            'subscription_until' => $tenant->subscription_until?->toDateString(),
            'max_stores' => $tenant->max_stores,
            'max_users' => $tenant->max_users,
            'max_products' => $tenant->max_products,
            'is_active' => (bool) $tenant->is_active,
            'status_label' => $tenant->is_active ? 'Активен' : 'Заблокирован',
            'created_at' => $tenant->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDetails(Tenant $tenant): array
    {
        $tenant->load([
            'stores' => fn ($query) => $query->orderBy('created_at'),
            'users' => fn ($query) => $query->with('roles:id,name')->orderBy('name'),
        ]);

        return [
            ...$this->toListItem($tenant),
            'stores' => $tenant->stores->map(function (Store $store): array {
                $name = is_array($store->name) ? $store->name : [];

                return [
                    'id' => $store->id,
                    'name' => $name['ru'] ?? $name['en'] ?? 'Магазин',
                    'city' => $store->city,
                    'status' => $store->status,
                ];
            })->values()->all(),
            'users' => $tenant->users->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first()?->name,
                'is_active' => (bool) $user->is_active,
            ])->values()->all(),
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function planOptions(): array
    {
        return app(PlanService::class)->optionsForTenants();
    }

    private function provisionSubscription(Tenant $tenant): void
    {
        $plan = Plan::query()->where('slug', $tenant->plan)->first();

        if (! $plan || $tenant->subscriptions()->exists()) {
            return;
        }

        $endsAt = $tenant->subscription_until?->copy()->endOfDay() ?? now()->addYear();

        Subscription::query()->create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => $endsAt->isFuture()
                ? Subscription::STATUS_ACTIVE
                : Subscription::STATUS_EXPIRED,
            'billing_interval' => Subscription::INTERVAL_YEARLY,
            'starts_at' => now(),
            'ends_at' => $endsAt,
            'auto_renew' => true,
        ]);
    }
}
