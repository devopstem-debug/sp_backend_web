<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\BankAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BankAccount>
 */
class BankAccountFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_name' => 'ООО «Smart Planogram»',
            'bank_name' => 'ОАО «Беларусбанк»',
            'iban' => 'BY'.fake()->numerify('####################'),
            'unp' => fake()->numerify('#########'),
            'payment_purpose' => 'Оплата тарифа {plan} ({interval})',
            'is_default' => false,
        ];
    }
}
