<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\LegalDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LegalDocument>
 */
class LegalDocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'type' => LegalDocument::TYPE_OFERTA,
            'title' => 'Публичная оферта',
            'content' => fake()->paragraphs(4, true),
            'version' => 1,
            'is_active' => false,
        ];
    }
}
