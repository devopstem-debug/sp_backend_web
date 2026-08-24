<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use SensitiveParameter;
use Throwable;

final class UserFirebaseSyncService
{
    public function __construct(
        private readonly FirebaseAuthService $firebaseAuth,
        private readonly FirebaseUserService $firebaseUsers,
    ) {}

    public function isConfigured(?string $tenantId): bool
    {
        return $this->firebaseAuth->isConfigured($tenantId);
    }

    /**
     * Создание пользователя: Firebase Auth + RTDB после записи в PostgreSQL.
     */
    public function provision(User $user, #[SensitiveParameter] string $password): void
    {
        $tenantId = $user->tenant_id;

        if (! $this->isConfigured($tenantId)) {
            $this->markPending($user);

            return;
        }

        try {
            $uid = $this->firebaseAuth->createUser(
                (string) $user->email,
                $password,
                (string) $user->name,
                $tenantId,
            );

            $user->forceFill(['firebase_uid' => $uid])->save();

            $this->pushRtdb($user, $tenantId);
            $this->markSynced($user);
        } catch (Throwable $exception) {
            Log::warning('Firebase provision failed', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            $this->markError($user);

            throw $exception instanceof RuntimeException
                ? $exception
                : new RuntimeException($exception->getMessage(), 0, $exception);
        }
    }

    /**
     * Обновление Firebase Auth + RTDB после изменения пользователя.
     */
    public function push(
        User $user,
        #[SensitiveParameter] ?string $password = null,
        bool $activeChanged = false,
        ?bool $wasActive = null,
    ): void {
        $tenantId = $user->tenant_id;

        if (! $this->isConfigured($tenantId)) {
            return;
        }

        $uid = trim((string) $user->firebase_uid);

        if ($uid === '') {
            if ($password !== null && $password !== '') {
                $this->provision($user->fresh(['roles', 'department']) ?? $user, $password);

                return;
            }

            $this->markPending($user);

            return;
        }

        try {
            $this->firebaseAuth->updateUser(
                $uid,
                (string) $user->email,
                (string) $user->name,
                $password,
                $tenantId,
            );

            if ($activeChanged && $wasActive !== null) {
                if ((bool) $user->is_active) {
                    $this->firebaseAuth->enableUser($uid, $tenantId);
                } else {
                    $this->firebaseAuth->disableUser($uid, $tenantId);
                }
            }

            $this->pushRtdb($user, $tenantId);
            $this->markSynced($user);
        } catch (Throwable $exception) {
            Log::warning('Firebase push failed', [
                'user_id' => $user->id,
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            $this->markError($user);

            throw $exception instanceof RuntimeException
                ? $exception
                : new RuntimeException($exception->getMessage(), 0, $exception);
        }
    }

    /**
     * Ручная синхронизация (пересоздание Auth при отсутствии uid — только с паролем).
     */
    public function syncNow(User $user, #[SensitiveParameter] ?string $password = null): void
    {
        $user->refresh()->load(['roles', 'department']);

        if (! $this->isConfigured($user->tenant_id)) {
            throw new RuntimeException('Firebase не настроен для арендатора.');
        }

        $uid = trim((string) $user->firebase_uid);

        if ($uid === '') {
            if ($password === null || $password === '') {
                throw new RuntimeException(
                    'Нет Firebase UID. Задайте пароль в форме редактирования и сохраните пользователя, либо укажите пароль при синхронизации.',
                );
            }

            $this->provision($user, $password);

            return;
        }

        $this->push($user, $password);
    }

    /**
     * Удаление из Firebase Auth и RTDB (локальная запись сохраняется).
     */
    public function removeFromFirebase(User $user): void
    {
        $tenantId = $user->tenant_id;
        $uid = trim((string) $user->firebase_uid);

        if ($uid === '' || ! $this->isConfigured($tenantId)) {
            $user->forceFill([
                'firebase_uid' => null,
                'firebase_status' => User::FIREBASE_STATUS_PENDING,
                'firebase_synced_at' => null,
            ])->save();

            return;
        }

        try {
            if ($this->firebaseAuth->isConfigured($tenantId)) {
                $this->firebaseAuth->deleteUser($uid, $tenantId);
            }

            if ($this->firebaseUsers->isConfigured($tenantId)) {
                $this->firebaseUsers->deleteUserProfile($uid, $tenantId);
            }

            $user->forceFill([
                'firebase_uid' => null,
                'firebase_status' => User::FIREBASE_STATUS_PENDING,
                'firebase_synced_at' => null,
            ])->save();
        } catch (Throwable $exception) {
            Log::warning('Firebase removeFromFirebase failed', [
                'user_id' => $user->id,
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            $this->markError($user);

            throw $exception instanceof RuntimeException
                ? $exception
                : new RuntimeException($exception->getMessage(), 0, $exception);
        }
    }

    /**
     * Полное удаление из Firebase перед soft delete локальной записи.
     */
    public function purge(User $user): void
    {
        $tenantId = $user->tenant_id;
        $uid = trim((string) $user->firebase_uid);

        if ($uid === '' || ! $this->isConfigured($tenantId)) {
            return;
        }

        if ($this->firebaseAuth->isConfigured($tenantId)) {
            $this->firebaseAuth->deleteUser($uid, $tenantId);
        }

        if ($this->firebaseUsers->isConfigured($tenantId)) {
            $this->firebaseUsers->deleteUserProfile($uid, $tenantId);
        }
    }

    public function markPending(User $user): void
    {
        $user->forceFill([
            'firebase_status' => User::FIREBASE_STATUS_PENDING,
            'firebase_synced_at' => null,
        ])->save();
    }

    public function markSynced(User $user): void
    {
        $user->forceFill([
            'firebase_status' => User::FIREBASE_STATUS_SYNCED,
            'firebase_synced_at' => now(),
        ])->save();
    }

    public function markError(User $user): void
    {
        $user->forceFill([
            'firebase_status' => User::FIREBASE_STATUS_ERROR,
        ])->save();
    }

    private function pushRtdb(User $user, ?string $tenantId): void
    {
        if (! $this->firebaseUsers->isConfigured($tenantId)) {
            return;
        }

        $this->firebaseUsers->syncUser(
            $user->fresh(['roles', 'department']) ?? $user,
            $tenantId,
        );
    }
}
