<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\SyncLog;
use App\Services\FirebaseService;
use App\Services\NotificationService;
use App\Services\StoreExportService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ExportController extends Controller implements HasMiddleware
{
    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::VIEW_EXPORT, only: ['index']),
            new Middleware('permission:'.Permissions::GENERATE_EXPORT, only: ['generate']),
            new Middleware('permission:'.Permissions::DOWNLOAD_EXPORT, only: ['download']),
            new Middleware('permission:'.Permissions::FIREBASE_EXPORT, only: ['sendToFirebase']),
        ];
    }

    public function __construct(
        private readonly StoreExportService $exports,
        private readonly NotificationService $notifications,
        private readonly FirebaseService $firebase,
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $tenantId = $user?->tenant_id;

        $recentSyncs = SyncLog::query()
            ->with(['store:id,name,city'])
            ->when(
                $user && ! $user->isSuperAdmin() && $tenantId,
                fn ($query) => $query->where('tenant_id', $tenantId),
            )
            ->latest('synced_at')
            ->limit(10)
            ->get()
            ->map(fn (SyncLog $log) => [
                'id' => $log->id,
                'store_id' => $log->store_id,
                'store_name' => is_array($log->store?->name)
                    ? ($log->store->name['ru'] ?? $log->store->name['en'] ?? '')
                    : (string) ($log->store?->name ?? ''),
                'store_key' => $log->store_key,
                'status' => $log->status,
                'json_size' => $log->json_size,
                'message' => $log->message,
                'synced_at' => $log->synced_at?->timezone($user?->timezone ?? 'UTC')->toIso8601String(),
            ])
            ->values()
            ->all();

        return Inertia::render('Export/Index', [
            'stores' => $this->storesForSelect(),
            'firebaseConfigured' => $this->firebase->isConfigured($tenantId),
            'recentSyncs' => $recentSyncs,
        ]);
    }

    public function generate(Request $request, string $storeId): JsonResponse
    {
        try {
            $this->validateStoreId($request, $storeId);
            $store = $this->findAuthorizedStore($storeId);

            $payload = $this->exports->generate($store->id);

            return response()->json($payload);
        } catch (Throwable $exception) {
            if (! $exception instanceof ValidationException) {
                $this->notifyExportFailure($exception->getMessage());
            }

            throw $exception;
        }
    }

    public function download(Request $request, string $storeId): StreamedResponse
    {
        try {
            $this->validateStoreId($request, $storeId);
            $store = $this->findAuthorizedStore($storeId);

            $payload = $this->exports->generate($store->id);
            $storeKey = $this->exports->storeKey($store);
            $filename = 'export-'.$storeKey.'-'.now()->format('Ymd-His').'.json';
            $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

            return response()->streamDownload(
                static function () use ($json): void {
                    echo $json;
                },
                $filename,
                [
                    'Content-Type' => 'application/json; charset=UTF-8',
                ],
            );
        } catch (Throwable $exception) {
            if (! $exception instanceof ValidationException) {
                $this->notifyExportFailure($exception->getMessage());
            }

            throw $exception;
        }
    }

    public function sendToFirebase(Request $request, string $storeId): RedirectResponse|JsonResponse
    {
        $this->validateStoreId($request, $storeId);
        $store = $this->findAuthorizedStore($storeId);
        $user = Auth::user();
        $tenantId = $store->tenant_id ?? $user?->tenant_id;
        $storeKey = $this->exports->storeKey($store);
        $jsonSize = 0;

        try {
            if (! $this->firebase->isConfigured($tenantId)) {
                throw ValidationException::withMessages([
                    'firebase' => 'Firebase не настроен. Укажите Database URL и credentials в Настройки → Интеграции.',
                ]);
            }

            $payload = $this->exports->generate($store->id);
            $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
            $jsonSize = strlen($json ?: '');

            $this->firebase->updateStore($storeKey, $payload, $tenantId);

            SyncLog::query()->create([
                'store_id' => $store->id,
                'tenant_id' => $tenantId,
                'user_id' => $user?->id,
                'store_key' => $storeKey,
                'status' => SyncLog::STATUS_SUCCESS,
                'json_size' => $jsonSize,
                'message' => 'Данные успешно отправлены в Firebase Realtime Database.',
                'synced_at' => now(),
            ]);

            $message = 'Магазин «'.$storeKey.'» отправлен в Firebase.';

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'store_key' => $storeKey,
                    'json_size' => $jsonSize,
                ]);
            }

            return redirect()
                ->route('export.index')
                ->with('success', $message);
        } catch (Throwable $exception) {
            $errorMessage = $exception instanceof ValidationException
                ? collect($exception->errors())->flatten()->first() ?: $exception->getMessage()
                : $exception->getMessage();

            SyncLog::query()->create([
                'store_id' => $store->id,
                'tenant_id' => $tenantId,
                'user_id' => $user?->id,
                'store_key' => $storeKey,
                'status' => SyncLog::STATUS_FAILED,
                'json_size' => $jsonSize,
                'message' => $errorMessage,
                'synced_at' => now(),
            ]);

            if (! $exception instanceof ValidationException) {
                $this->notifyExportFailure($errorMessage);
            }

            if ($request->expectsJson() || $request->is('api/*')) {
                $status = $exception instanceof ValidationException ? 422 : 500;

                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                ], $status);
            }

            if ($exception instanceof ValidationException) {
                throw $exception;
            }

            return redirect()
                ->route('export.index')
                ->with('error', $errorMessage);
        }
    }

    private function notifyExportFailure(string $reason): void
    {
        $user = Auth::user();

        if (! $user?->tenant_id) {
            return;
        }

        $this->notifications->notify(
            $user->tenant_id,
            'error',
            'Экспорт не удался',
            'Экспорт не удался: '.$reason,
            $user->id,
            '/export',
        );
    }

    private function validateStoreId(Request $request, string $storeId): void
    {
        $request->merge(['store_id' => $storeId]);

        $request->validate([
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
        ], [
            'store_id.required' => 'Выберите магазин.',
            'store_id.uuid' => 'Некорректный идентификатор магазина.',
            'store_id.exists' => 'Магазин не найден.',
        ]);
    }

    private function findAuthorizedStore(string $storeId): Store
    {
        return Store::query()->findOrFail($storeId);
    }

    /**
     * @return list<array{id: string, name: string, key: string}>
     */
    private function storesForSelect(): array
    {
        return Store::query()
            ->orderBy('city')
            ->get(['id', 'name', 'city'])
            ->map(function (Store $store) {
                $name = is_array($store->name) ? $store->name : [];
                $label = $name['ru'] ?? $name['en'] ?? 'Без названия';

                if ($store->city) {
                    $label .= ' — '.$store->city;
                }

                return [
                    'id' => $store->id,
                    'name' => $label,
                    'key' => $this->exports->storeKey($store),
                ];
            })
            ->values()
            ->all();
    }
}
