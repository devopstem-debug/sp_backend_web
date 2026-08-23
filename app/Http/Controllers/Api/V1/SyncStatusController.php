<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\SyncLog;
use App\Services\FirebaseService;
use App\Services\StoreExportService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;

class SyncStatusController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::VIEW_EXPORT),
        ];
    }

    public function __construct(
        private readonly FirebaseService $firebase,
        private readonly StoreExportService $exports,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenantId = $user?->tenant_id;
        $timezone = $user?->timezone ?? 'UTC';

        $storeId = $request->string('store_id')->toString();

        if ($storeId !== '') {
            $request->validate([
                'store_id' => ['uuid', 'exists:stores,id'],
            ]);

            Store::query()->findOrFail($storeId);
        }

        $baseQuery = SyncLog::query()
            ->with(['store:id,name,city'])
            ->when(
                $user && ! $user->isSuperAdmin() && $tenantId,
                fn ($query) => $query->where('tenant_id', $tenantId),
            )
            ->when($storeId !== '', fn ($query) => $query->where('store_id', $storeId));

        $latest = (clone $baseQuery)
            ->latest('synced_at')
            ->first();

        $recent = (clone $baseQuery)
            ->latest('synced_at')
            ->limit(10)
            ->get()
            ->map(fn (SyncLog $log) => $this->transformLog($log, $timezone))
            ->values()
            ->all();

        $storeKey = null;
        if ($storeId !== '') {
            $store = Store::query()->find($storeId);
            $storeKey = $store ? $this->exports->storeKey($store) : null;
        }

        return response()->json([
            'firebase_configured' => $this->firebase->isConfigured(
                $storeId !== ''
                    ? (Store::query()->whereKey($storeId)->value('tenant_id') ?? $tenantId)
                    : $tenantId,
            ),
            'store_id' => $storeId !== '' ? $storeId : null,
            'store_key' => $storeKey,
            'latest' => $latest ? $this->transformLog($latest, $timezone) : null,
            'recent' => $recent,
            'polled_at' => now()->timezone($timezone)->toIso8601String(),
        ]);
    }
    private function transformLog(SyncLog $log, string $timezone): array
    {
        $name = $log->store?->name;
        $storeName = is_array($name)
            ? ($name['ru'] ?? $name['en'] ?? '')
            : (string) ($name ?? '');

        return [
            'id' => $log->id,
            'store_id' => $log->store_id,
            'store_name' => $storeName,
            'store_key' => $log->store_key,
            'status' => $log->status,
            'json_size' => $log->json_size,
            'json_size_bytes' => $log->json_size,
            'message' => $log->message,
            'error_message' => $log->status === SyncLog::STATUS_FAILED ? $log->message : null,
            'synced_at' => $log->synced_at?->timezone($timezone)->toIso8601String(),
        ];
    }
}
