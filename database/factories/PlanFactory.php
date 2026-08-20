<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Plan>
 */
class PlanFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->randomElement(['Free', 'Basic', 'Pro', 'Enterprise']).' '.fake()->numerify('##');

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'price_monthly' => fake()->randomElement([0, 49, 149, 399]),
            'price_yearly' => fake()->randomElement([0, 490, 1490, 3990]),
            'max_stores' => 5,
            'max_users' => 20,
            'max_products' => 500,
            'features' => ['Планограммы', 'Экспорт'],
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
