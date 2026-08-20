<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Store>
 */
class StoreFactory extends Factory
{
    protected $model = Store::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => [
                'ru' => fake()->company(),
                'en' => fake()->company(),
            ],
            'address' => fake()->address(),
            'city' => fake()->city(),
            'latitude' => fake()->latitude(),
            'longitude' => fake()->longitude(),
            'radius_meters' => 100,
            'area_sqm' => fake()->randomFloat(2, 50, 5000),
            'status' => 'active',
        ];
    }
}
