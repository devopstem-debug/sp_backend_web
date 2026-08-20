<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'barcode' => fake()->unique()->numerify('#############'),
            'name' => fake()->words(4, true),
            'category' => fake()->randomElement([
                'Квас Белорусский',
                'Молочные продукты',
                'Напитки',
                'Бакалея',
            ]),
            'volume_ml' => fake()->randomElement([500, 1000, 1400, 2000]),
            'package_type' => fake()->randomElement(['Бутылка', 'Банка', 'ПЭТ', 'Пакет']),
            'width_mm' => fake()->numberBetween(40, 120),
            'height_mm' => fake()->numberBetween(100, 350),
            'depth_mm' => fake()->numberBetween(40, 120),
            'weight_g' => fake()->numberBetween(200, 2500),
            'checked' => false,
        ];
    }
}
