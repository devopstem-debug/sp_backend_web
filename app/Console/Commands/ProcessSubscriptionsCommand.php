<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\BillingService;
use Illuminate\Console\Command;

class ProcessSubscriptionsCommand extends Command
{
    protected $signature = 'subscriptions:process';

    protected $description = 'Напоминания за 7 дней до конца подписки и блокировка по истечении срока';

    public function handle(BillingService $billing): int
    {
        $processed = $billing->processExpiringAndExpired();

        $this->info("Обработано подписок: {$processed}");

        return self::SUCCESS;
    }
}
