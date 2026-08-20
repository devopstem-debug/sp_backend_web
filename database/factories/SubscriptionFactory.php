<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subscription>
 */
class SubscriptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'plan_id' => Plan::factory(),
            'status' => Subscription::STATUS_ACTIVE,
            'billing_interval' => Subscription::INTERVAL_MONTHLY,
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
            'auto_renew' => true,
            'reminder_sent_at' => null,
        ];
    }
}
