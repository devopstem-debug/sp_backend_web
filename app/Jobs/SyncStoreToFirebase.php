<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Notification;
use App\Models\Store;
use App\Models\SyncLog;
use App\Services\FirebaseService;
use App\Services\NotificationService;
use App\Services\StoreExportService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncStoreToFirebase implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [300];

    public int $uniqueFor = 60;

    public function __construct(
        public readonly string $storeId,
        public readonly ?string $triggeredByUserId = null,
    ) {}

    public function uniqueId(): string
    {
        return $this->storeId;
    }

    public function handle(
        StoreExportService $exports,
        FirebaseService $firebase,
    ): void {
        $store = Store::query()->withTrashed()->find($this->storeId);

        if (! $store || $store->trashed()) {
            return;
        }

        $tenantId = $store->tenant_id;

        if (! $firebase->isConfigured($tenantId)) {
            SyncLog::query()->create([
                'store_id' => $store->id,
                'tenant_id' => $tenantId,
                'user_id' => $this->triggeredByUserId,
                'store_key' => $exports->storeKey($store),
                'status' => SyncLog::STATUS_SKIPPED,
                'json_size' => 0,
                'message' => 'Firebase не настроен — синхронизация пропущена.',
                'synced_at' => now(),
            ]);

            return;
        }

        $storeKey = $exports->storeKey($store);
        $jsonSize = 0;

        try {
            $payload = $exports->generate($store->id);
            $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
            $jsonSize = strlen($json ?: '');

            $firebase->updateStore($storeKey, $payload, $tenantId);

            SyncLog::query()->create([
                'store_id' => $store->id,
                'tenant_id' => $tenantId,
                'user_id' => $this->triggeredByUserId,
                'store_key' => $storeKey,
                'status' => SyncLog::STATUS_SUCCESS,
                'json_size' => $jsonSize,
                'message' => 'Автоматическая синхронизация с Firebase выполнена.',
                'synced_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::error('SyncStoreToFirebase failed', [
                'store_id' => $this->storeId,
                'message' => $exception->getMessage(),
            ]);

            SyncLog::query()->create([
                'store_id' => $store->id,
                'tenant_id' => $tenantId,
                'user_id' => $this->triggeredByUserId,
                'store_key' => $storeKey,
                'status' => SyncLog::STATUS_FAILED,
                'json_size' => $jsonSize,
                'message' => $exception->getMessage(),
                'synced_at' => now(),
            ]);

            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('SyncStoreToFirebase permanently failed', [
            'store_id' => $this->storeId,
            'message' => $exception?->getMessage(),
        ]);

        $store = Store::query()->withTrashed()->find($this->storeId);

        if (! $store?->tenant_id) {
            return;
        }

        try {
            app(NotificationService::class)->notify(
                $store->tenant_id,
                Notification::TYPE_ERROR,
                'Ошибка синхронизации Firebase',
                'Магазин не синхронизирован после повторов: '.($exception?->getMessage() ?: 'неизвестная ошибка'),
                null,
                '/export',
            );
        } catch (Throwable $notifyException) {
