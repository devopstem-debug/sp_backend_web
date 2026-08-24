<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Notification;
use App\Services\FirebaseCatalogService;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncCatalogToFirebase implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [300];

    public int $uniqueFor = 120;

    public function __construct(
        public readonly ?string $tenantId,
        public readonly ?string $triggeredByUserId = null,
    ) {}

    public function uniqueId(): string
    {
        return $this->tenantId ?? 'global';
    }

    public function handle(FirebaseCatalogService $catalog): void
    {
        if (! $catalog->isConfigured($this->tenantId)) {
            return;
        }

        $catalog->sync($this->tenantId);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('SyncCatalogToFirebase permanently failed', [
            'tenant_id' => $this->tenantId,
            'message' => $exception?->getMessage(),
        ]);

        if ($this->tenantId === null) {
            return;
        }

        try {
            app(NotificationService::class)->notify(
                $this->tenantId,
                Notification::TYPE_ERROR,
                'Ошибка синхронизации каталога',
                'Каталог не синхронизирован с Firebase: '.($exception?->getMessage() ?: 'неизвестная ошибка'),
                $this->triggeredByUserId,
                '/export',
            );
        } catch (Throwable $notifyException) {
            report($notifyException);
        }
    }
}
