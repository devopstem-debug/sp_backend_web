<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Exception\AuthException;
use Kreait\Firebase\Exception\FirebaseException;
use Kreait\Firebase\Request\CreateUser;
use RuntimeException;
use SensitiveParameter;

final class FirebaseAuthService
{
    public function __construct(
        private readonly FirebaseService $firebase,
    ) {}

    public function isConfigured(?string $tenantId = null): bool
    {
        return $this->firebase->hasCredentials($tenantId);
    }

    /**
     * Создаёт пользователя в Firebase Auth и возвращает uid.
     */
    public function createUser(
        string $email,
        #[SensitiveParameter] string $password,
        string $name,
        ?string $tenantId = null,
    ): string {
        try {
            $record = $this->firebase->auth($tenantId)->createUser(
                CreateUser::new()
                    ->withUnverifiedEmail($email)
                    ->withClearTextPassword($password)
                    ->withDisplayName($name)
                    ->markAsEnabled(),
            );
        } catch (AuthException|FirebaseException $exception) {
            Log::error('Firebase Auth createUser failed', [
                'email' => $email,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось создать пользователя в Firebase Auth: '.$exception->getMessage(),
                0,
                $exception,
            );
        }

        $uid = (string) $record->uid;

        if ($uid === '') {
            throw new RuntimeException('Firebase Auth вернул пустой uid.');
        }

        return $uid;
    }

    public function updatePassword(
        string $uid,
        #[SensitiveParameter] string $newPassword,
        ?string $tenantId = null,
    ): void {
        $uid = $this->requireUid($uid);

        try {
            $this->firebase->auth($tenantId)->changeUserPassword($uid, $newPassword);
        } catch (AuthException|FirebaseException $exception) {
            Log::error('Firebase Auth updatePassword failed', [
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось обновить пароль в Firebase Auth: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    public function deleteUser(string $uid, ?string $tenantId = null): void
    {
        $uid = $this->requireUid($uid);

        try {
            $this->firebase->auth($tenantId)->deleteUser($uid);
        } catch (AuthException|FirebaseException $exception) {
            Log::error('Firebase Auth deleteUser failed', [
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось удалить пользователя в Firebase Auth: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    public function disableUser(string $uid, ?string $tenantId = null): void
    {
        $uid = $this->requireUid($uid);

        try {
            $this->firebase->auth($tenantId)->disableUser($uid);
        } catch (AuthException|FirebaseException $exception) {
            Log::error('Firebase Auth disableUser failed', [
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось заблокировать пользователя в Firebase Auth: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    public function enableUser(string $uid, ?string $tenantId = null): void
    {
        $uid = $this->requireUid($uid);

        try {
            $this->firebase->auth($tenantId)->enableUser($uid);
        } catch (AuthException|FirebaseException $exception) {
            Log::error('Firebase Auth enableUser failed', [
                'uid' => $uid,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'Не удалось разблокировать пользователя в Firebase Auth: '.$exception->getMessage(),
                0,
                $exception,
            );
        }
    }

    private function requireUid(string $uid): string
    {
        $uid = trim($uid);

        if ($uid === '') {
            throw new RuntimeException('Не указан firebase_uid.');
        }

        return $uid;
    }
}
