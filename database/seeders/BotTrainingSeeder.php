<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ProductBotTrainingRule;
use App\Support\ProductPackageTypes;
use Illuminate\Database\Seeder;

/**
 * Базовые правила обучения бота обогащения товаров (напитки BY/RU).
 *
 * php artisan db:seed --class=BotTrainingSeeder
 */
class BotTrainingSeeder extends Seeder
{
    public function run(): void
    {
        $rules = [
            // ========== ПИВО ==========
            [
                'keyword' => 'пиво',
                'category' => 'Пиво',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 300,
                'volume_ml_max' => 350,
                'width_mm' => 66,
                'height_mm' => 115,
                'depth_mm' => 66,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'пиво',
                'category' => 'Пиво',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 450,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 170,
                'depth_mm' => 70,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'пиво',
                'category' => 'Пиво',
                'package_type' => ProductPackageTypes::BOTTLE,
                'volume_ml_min' => 400,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 250,
                'depth_mm' => 70,
                'confidence' => 0.93,
            ],
            [
                'keyword' => 'пиво',
                'category' => 'Пиво',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1000,
                'volume_ml_max' => 1600,
                'width_mm' => 90,
                'height_mm' => 320,
                'depth_mm' => 90,
                'confidence' => 0.93,
            ],

            // ========== КОЛА / ГАЗИРОВАННЫЕ ==========
            [
                'keyword' => 'кола',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 300,
                'volume_ml_max' => 350,
                'width_mm' => 66,
                'height_mm' => 115,
                'depth_mm' => 66,
                'confidence' => 0.98,
            ],
            [
                'keyword' => 'кола',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 450,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 230,
                'depth_mm' => 70,
                'confidence' => 0.96,
            ],
            [
                'keyword' => 'кола',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1100,
                'width_mm' => 80,
                'height_mm' => 280,
                'depth_mm' => 80,
                'confidence' => 0.96,
            ],
            [
                'keyword' => 'кола',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1400,
                'volume_ml_max' => 1600,
                'width_mm' => 90,
                'height_mm' => 320,
                'depth_mm' => 90,
                'confidence' => 0.96,
            ],
            [
                'keyword' => 'кола',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1900,
                'volume_ml_max' => 2100,
                'width_mm' => 100,
                'height_mm' => 350,
                'depth_mm' => 100,
                'confidence' => 0.94,
            ],

            // ========== ФАНТА / СПРАЙТ ==========
            [
                'keyword' => 'фанта',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 300,
                'volume_ml_max' => 350,
                'width_mm' => 66,
                'height_mm' => 115,
                'depth_mm' => 66,
                'confidence' => 0.97,
            ],
            [
                'keyword' => 'фанта',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1600,
                'width_mm' => 90,
                'height_mm' => 320,
                'depth_mm' => 90,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'спрайт',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 300,
                'volume_ml_max' => 350,
                'width_mm' => 66,
                'height_mm' => 115,
                'depth_mm' => 66,
                'confidence' => 0.97,
            ],
            [
                'keyword' => 'спрайт',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1600,
                'width_mm' => 90,
                'height_mm' => 320,
                'depth_mm' => 90,
                'confidence' => 0.95,
            ],

            // ========== ЭНЕРГЕТИКИ ==========
            [
                'keyword' => 'энергетик',
                'category' => 'Энергетические напитки',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 240,
                'volume_ml_max' => 260,
                'width_mm' => 53,
                'height_mm' => 135,
                'depth_mm' => 53,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'энергетик',
                'category' => 'Энергетические напитки',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 300,
                'volume_ml_max' => 350,
                'width_mm' => 66,
                'height_mm' => 115,
                'depth_mm' => 66,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'энергетик',
                'category' => 'Энергетические напитки',
                'package_type' => ProductPackageTypes::CAN,
                'volume_ml_min' => 440,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 170,
                'depth_mm' => 70,
                'confidence' => 0.94,
            ],
            [
                'keyword' => 'энергетик',
                'category' => 'Энергетические напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 400,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 230,
                'depth_mm' => 70,
                'confidence' => 0.93,
            ],

            // ========== ВОДА ==========
            [
                'keyword' => 'вода',
                'category' => 'Вода',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 300,
                'volume_ml_max' => 350,
                'width_mm' => 65,
                'height_mm' => 200,
                'depth_mm' => 65,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'вода',
                'category' => 'Вода',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 450,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 230,
                'depth_mm' => 70,
                'confidence' => 0.96,
            ],
            [
                'keyword' => 'вода',
                'category' => 'Вода',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1100,
                'width_mm' => 80,
                'height_mm' => 280,
                'depth_mm' => 80,
                'confidence' => 0.96,
            ],
            [
                'keyword' => 'вода',
                'category' => 'Вода',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1400,
                'volume_ml_max' => 1600,
                'width_mm' => 90,
                'height_mm' => 320,
                'depth_mm' => 90,
                'confidence' => 0.96,
            ],
            [
                'keyword' => 'вода',
                'category' => 'Вода',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1900,
                'volume_ml_max' => 2100,
                'width_mm' => 100,
                'height_mm' => 350,
                'depth_mm' => 100,
                'confidence' => 0.94,
            ],
            [
                'keyword' => 'вода',
                'category' => 'Вода',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 4500,
                'volume_ml_max' => 5500,
                'width_mm' => 150,
                'height_mm' => 400,
                'depth_mm' => 150,
                'confidence' => 0.92,
            ],

            // ========== КВАС ==========
            [
                'keyword' => 'квас',
                'category' => 'Квас',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 400,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 230,
                'depth_mm' => 70,
                'confidence' => 0.94,
            ],
            [
                'keyword' => 'квас',
                'category' => 'Квас',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1100,
                'width_mm' => 80,
                'height_mm' => 280,
                'depth_mm' => 80,
                'confidence' => 0.94,
            ],
            [
                'keyword' => 'квас',
                'category' => 'Квас',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1350,
                'volume_ml_max' => 1600,
                'width_mm' => 90,
                'height_mm' => 320,
                'depth_mm' => 90,
                'confidence' => 0.94,
            ],
            [
                'keyword' => 'квас',
                'category' => 'Квас',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1900,
                'volume_ml_max' => 2100,
                'width_mm' => 100,
                'height_mm' => 350,
                'depth_mm' => 100,
                'confidence' => 0.93,
            ],

            // ========== СОК ==========
            [
                'keyword' => 'сок',
                'category' => 'Соки',
                'package_type' => ProductPackageTypes::BOX,
                'volume_ml_min' => 150,
                'volume_ml_max' => 250,
                'width_mm' => 40,
                'height_mm' => 150,
                'depth_mm' => 40,
                'confidence' => 0.93,
            ],
            [
                'keyword' => 'сок',
                'category' => 'Соки',
                'package_type' => ProductPackageTypes::BOX,
                'volume_ml_min' => 450,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 180,
                'depth_mm' => 70,
                'confidence' => 0.93,
            ],
            [
                'keyword' => 'сок',
                'category' => 'Соки',
                'package_type' => ProductPackageTypes::BOX,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1100,
                'width_mm' => 70,
                'height_mm' => 200,
                'depth_mm' => 70,
                'confidence' => 0.92,
            ],
            [
                'keyword' => 'сок',
                'category' => 'Соки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1100,
                'width_mm' => 80,
                'height_mm' => 280,
                'depth_mm' => 80,
                'confidence' => 0.90,
            ],

            // ========== МИНСКАЯ / МИНЕРАЛКА ==========
            [
                'keyword' => 'минск',
                'category' => 'Вода Минская',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 300,
                'volume_ml_max' => 350,
                'width_mm' => 65,
                'height_mm' => 200,
                'depth_mm' => 65,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'минск',
                'category' => 'Вода Минская',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 450,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 230,
                'depth_mm' => 70,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'минск',
                'category' => 'Вода Минская',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1100,
                'width_mm' => 80,
                'height_mm' => 280,
                'depth_mm' => 80,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'минск',
                'category' => 'Вода Минская',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1400,
                'volume_ml_max' => 1600,
                'width_mm' => 90,
                'height_mm' => 320,
                'depth_mm' => 90,
                'confidence' => 0.95,
            ],
            [
                'keyword' => 'минск',
                'category' => 'Вода Минская',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 1900,
                'volume_ml_max' => 2100,
                'width_mm' => 100,
                'height_mm' => 350,
                'depth_mm' => 100,
                'confidence' => 0.93,
            ],

            // ========== ЛИМОНАД ==========
            [
                'keyword' => 'лимонад',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 450,
                'volume_ml_max' => 550,
                'width_mm' => 70,
                'height_mm' => 230,
                'depth_mm' => 70,
                'confidence' => 0.92,
            ],
            [
                'keyword' => 'лимонад',
                'category' => 'Газированные напитки',
                'package_type' => ProductPackageTypes::PET,
                'volume_ml_min' => 900,
                'volume_ml_max' => 1100,
                'width_mm' => 80,
                'height_mm' => 280,
                'depth_mm' => 80,
                'confidence' => 0.92,
            ],
        ];

        $created = 0;
        $updated = 0;

        foreach ($rules as $rule) {
            $confidence = (float) ($rule['confidence'] ?? 0.9);
            // Выше confidence → раньше в матчинге (меньше priority).
            $priority = (int) max(1, round((1 - $confidence) * 1000));

            $name = sprintf(
                '%s · %s · %d–%d мл',
                $rule['category'],
                $rule['package_type'],
                $rule['volume_ml_min'],
                $rule['volume_ml_max'],
            );

            $model = ProductBotTrainingRule::query()->updateOrCreate(
                [
                    'keyword' => $rule['keyword'],
                    'package_type' => $rule['package_type'],
                    'volume_ml_min' => $rule['volume_ml_min'],
                    'volume_ml_max' => $rule['volume_ml_max'],
                ],
                [
                    'name' => $name,
                    'width_mm' => $rule['width_mm'],
                    'height_mm' => $rule['height_mm'],
                    'depth_mm' => $rule['depth_mm'],
                    'priority' => $priority,
                    'is_active' => true,
                ],
            );

            if ($model->wasRecentlyCreated) {
                $created++;
            } else {
                $updated++;
            }
        }

        $this->command?->info("Bot training rules: created {$created}, updated {$updated}.");
    }
}
