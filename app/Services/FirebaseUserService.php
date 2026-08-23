<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Department;
use App\Models\Store;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Exception\FirebaseException;
use RuntimeException;

final class FirebaseUserService
{
    private const ROOT_PATH = 'users';

    public function __construct(
        private readonly FirebaseService $firebase,
        private readonly StoreExportService $exports,
    ) {}

    public function isConfigured(?string $tenantId = null): bool
    {
        return $this->firebase->isConfigured($tenantId);
    }

    /**
     * @param  array{name?: string|null, role?: string|null, department?: string|null}  $data
     */
    public function updateUserProfile(string $uid, array $data, ?string $tenantId = null): void
    {
        $uid = $this->sanitizeUid($uid);
        $payload = array_filter([
            'name' => $data['name'] ?? null,
            'role' => $data['role'] ?? null,
            'department' => $data['department'] ?? null,
        ], static fn (mixed $value): bool => $value !== null && $value !== '');

        if ($payload === []) {
            return;
        }

        try {
            $this->firebase->database($tenantId)
                ->getReference($this->path($uid))
                ->update($payload);
        } catch (FirebaseException $exception) {
            Log::error('Firebase RTDB updateUserProfile failed', [
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось обновить профиль пользователя в Firebase: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    /**
     * @param  list<string>  $storeKeys
     */
    public function updateUserStores(string $uid, array $storeKeys, ?string $tenantId = null): void
    {
        $uid = $this->sanitizeUid($uid);
        $keys = array_values(array_unique(array_filter(
            array_map(static fn (mixed $key): string => trim((string) $key), $storeKeys),
            static fn (string $key): bool => $key !== '',
        )));

        try {
            $this->firebase->database($tenantId)
                ->getReference($this->path($uid).'/store_keys')
                ->set($keys);
        } catch (FirebaseException $exception) {
            Log::error('Firebase RTDB updateUserStores failed', [
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось обновить store_keys пользователя в Firebase: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    public function deleteUserProfile(string $uid, ?string $tenantId = null): void
    {
        $uid = $this->sanitizeUid($uid);

        try {
            $this->firebase->database($tenantId)
                ->getReference($this->path($uid))
                ->remove();
        } catch (FirebaseException $exception) {
            Log::error('Firebase RTDB deleteUserProfile failed', [
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось удалить профиль пользователя в Firebase: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    /**
     * Полная запись профиля (создание / синхронизация после смены роли или отдела).
     */
    public function syncUser(User $user, ?string $tenantId = null): void
    {
        $uid = trim((string) $user->firebase_uid);

        if ($uid === '') {
            return;
        }

        $tenantId ??= $user->tenant_id;
        $user->loadMissing(['department:id,code,name,store_id', 'roles:id,name']);

        $payload = [
            'name' => (string) $user->name,
            'role' => (string) ($user->roles->first()?->name ?? $user->roleLabel()),
            'department' => $this->departmentValue($user),
            'store_keys' => $this->resolveStoreKeys($user),
        ];

        try {
            $this->firebase->database($tenantId)
                ->getReference($this->path($uid))
                ->set($payload);
        } catch (FirebaseException $exception) {
            Log::error('Firebase RTDB syncUser failed', [
                'uid' => $uid,
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось синхронизировать пользователя в Firebase RTDB: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    /**
     * @return list<string>
     */
    public function resolveStoreKeys(User $user): array
    {
        $user->loadMissing(['department:id,store_id', 'roles:id,name']);

        if ($user->hasRole(Permissions::ROLE_SUPER_ADMIN, 'web')) {
            return [];
        }

        if ($user->hasRole(Permissions::ROLE_HEAD, 'web') && $user->department_id) {
            $storeId = $user->department?->store_id
                ?? Department::withoutGlobalScopes()->whereKey($user->department_id)->value('store_id');

            if (! $storeId) {
                return [];
            }

            $store = Store::withoutGlobalScopes()->find($storeId);

            return $store ? [$this->exports->storeKey($store)] : [];
        }

        $tenantId = $user->tenant_id;

        if (! $tenantId) {
            return [];
        }

        return Store::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->orderBy('created_at')
            ->get()
            ->map(fn (Store $store): string => $this->exports->storeKey($store))
            ->values()
            ->all();
    }

    private function departmentValue(User $user): ?string
    {
        $department = $user->department;

        if (! $department) {
            return null;
        }

        $code = trim((string) $department->code);
        if ($code !== '') {
            return strtoupper($code);
        }

        $name = $department->name;

        if (is_array($name)) {
            return (string) ($name['ru'] ?? $name['en'] ?? null) ?: null;
        }

        return $name !== null && $name !== '' ? (string) $name : null;
    }

    private function path(string $uid): string
    {
        return self::ROOT_PATH.'/'.$uid;
    }

    private function sanitizeUid(string $uid): string
    {
        $uid = trim($uid);

        if ($uid === '' || preg_match('/[.#$\[\]]/', $uid)) {
            throw new RuntimeException('Некорректный firebase_uid для Firebase RTDB.');
        }

        return $uid;
    }
}
