<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'domain' => fake()->unique()->domainName(),
            'plan' => 'basic',
            'subscription_until' => null,
            'max_stores' => 5,
            'max_users' => 20,
            'max_products' => 500,
            'is_active' => true,
        ];
    }
}
