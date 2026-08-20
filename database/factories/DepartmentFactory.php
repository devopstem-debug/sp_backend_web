<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Department>
 */
class DepartmentFactory extends Factory
{
    protected $model = Department::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'code' => strtoupper(fake()->unique()->lexify('???')),
            'name' => [
                'ru' => fake()->words(2, true),
                'en' => fake()->words(2, true),
            ],
            'color' => fake()->hexColor(),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
