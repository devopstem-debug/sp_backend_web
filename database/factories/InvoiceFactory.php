<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        $start = now()->startOfMonth();

        return [
            'invoice_number' => 'SP-'.now()->format('Y').'-'.fake()->unique()->numerify('####'),
            'tenant_id' => Tenant::factory(),
            'subscription_id' => Subscription::factory(),
            'amount' => 49,
            'currency' => Payment::CURRENCY_BYN,
            'period_start' => $start->toDateString(),
            'period_end' => $start->copy()->endOfMonth()->toDateString(),
            'status' => Invoice::STATUS_DRAFT,
            'pdf_path' => null,
        ];
    }
}
