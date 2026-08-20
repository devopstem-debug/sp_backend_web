<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'subscription_id' => Subscription::factory(),
            'amount' => 49,
            'currency' => Payment::CURRENCY_BYN,
            'status' => Payment::STATUS_PENDING,
            'payment_method' => Payment::METHOD_BANK_TRANSFER,
            'transaction_id' => null,
            'paid_at' => null,
        ];
    }
}
