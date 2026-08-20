<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\BillingService;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price_monthly' => 0,
                'price_yearly' => 0,
                'max_stores' => 1,
                'max_users' => 3,
                'max_products' => 50,
                'features' => ['1 магазин', 'Базовые планограммы'],
                'is_active' => true,
                'sort_order' => 10,
            ],
            [
                'name' => 'Basic',
                'slug' => 'basic',
                'price_monthly' => 49,
                'price_yearly' => 490,
                'max_stores' => 5,
                'max_users' => 20,
                'max_products' => 500,
                'features' => ['До 5 магазинов', 'Планограммы', 'Экспорт'],
                'is_active' => true,
                'sort_order' => 20,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price_monthly' => 149,
                'price_yearly' => 1490,
                'max_stores' => 20,
                'max_users' => 50,
                'max_products' => 5000,
                'features' => ['До 20 магазинов', 'Планограммы', 'Экспорт', 'Импорт товаров', 'Аналитика'],
                'is_active' => true,
                'sort_order' => 30,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price_monthly' => 399,
                'price_yearly' => 3990,
                'max_stores' => 100,
                'max_users' => 200,
                'max_products' => 50000,
                'features' => ['Безлимит магазинов в рамках квоты', 'Приоритетная поддержка', 'Firebase-экспорт', 'Мультипользователи'],
                'is_active' => true,
                'sort_order' => 40,
            ],
        ];

        foreach ($plans as $payload) {
            Plan::query()->updateOrCreate(
                ['slug' => $payload['slug']],
                $payload,
            );
        }

        BankAccount::query()->updateOrCreate(
            ['iban' => 'BY00UNBS00000000000000000000'],
            [
                'account_name' => 'ООО «Smart Planogram»',
                'bank_name' => 'ОАО «Беларусбанк»',
                'unp' => '100000000',
                'payment_purpose' => 'Оплата тарифа {plan} ({interval}), УНП {unp}',
                'is_default' => true,
            ],
        );

        $billing = app(BillingService::class);

        Tenant::query()->each(function (Tenant $tenant) use ($billing): void {
            if ($tenant->subscriptions()->exists()) {
                return;
            }

            $plan = Plan::query()->where('slug', $tenant->plan)->first()
                ?? Plan::query()->where('slug', 'basic')->first();

            if (! $plan) {
                return;
            }

            $endsAt = $tenant->subscription_until?->copy()->endOfDay() ?? now()->addYear();
            $active = $endsAt->isFuture();

            $subscription = Subscription::query()->create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => $active ? Subscription::STATUS_ACTIVE : Subscription::STATUS_EXPIRED,
                'billing_interval' => Subscription::INTERVAL_YEARLY,
                'starts_at' => now()->subDay(),
                'ends_at' => $endsAt,
                'auto_renew' => true,
            ]);

            if ($active) {
                $billing->applyPlanToTenant($tenant, $plan, $subscription->ends_at);
            }
        });
    }
}
