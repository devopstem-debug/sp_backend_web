<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Kreait\Firebase\Contract\Database;
use Kreait\Firebase\Exception\FirebaseException;
use Kreait\Firebase\Factory;
use RuntimeException;

class FirebaseService
{
    private const ROOT_PATH = 'stores';

    public function __construct(
        private readonly SettingsService $settings,
    ) {}

    public function isConfigured(?string $tenantId = null): bool
    {
        $tenantId ??= $this->resolveTenantId();

        try {
            $config = $this->resolveConfig($tenantId);

            return $config['database_url'] !== '' && $config['credentials_path'] !== '';
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateStore(string $storeKey, array $data, ?string $tenantId = null): void
    {
        $storeKey = $this->sanitizeKey($storeKey);
        $database = $this->database($tenantId);

        try {
            $database->getReference($this->path($storeKey))->set($data);
        } catch (FirebaseException $exception) {
            Log::error('Firebase updateStore failed', [
                'store_key' => $storeKey,
                'message' => $exception->getMessage(),
            ]);

            throw new RuntimeException('Не удалось отправить данные в Firebase: '.$exception->getMessage(), 0, $exception);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getStore(string $storeKey, ?string $tenantId = null): ?array
    {
        $storeKey = $this->sanitizeKey($storeKey);
        $database = $this->database($tenantId);

        try {
            $value = $database->getReference($this->path($storeKey))->getValue();
        } catch (FirebaseException $exception) {
            throw new RuntimeException('Не удалось получить данные из Firebase: '.$exception->getMessage(), 0, $exception);
        }

        if ($value === null) {
            return null;
        }

        return is_array($value) ? $value : ['value' => $value];
    }

    public function deleteStore(string $storeKey, ?string $tenantId = null): void
    {
        $storeKey = $this->sanitizeKey($storeKey);
        $database = $this->database($tenantId);

        try {
            $database->getReference($this->path($storeKey))->remove();
        } catch (FirebaseException $exception) {
            throw new RuntimeException('Не удалось удалить данные из Firebase: '.$exception->getMessage(), 0, $exception);
        }
    }

    /**
     * @return array{database_url: string, credentials_path: string, project_id: string}
     */
    public function resolveConfig(?string $tenantId = null): array
    {
        $tenantId ??= $this->resolveTenantId();

        $databaseUrl = (string) ($this->settings->get(SettingsService::FIREBASE_DATABASE_URL, $tenantId) ?? '');
        $projectId = (string) ($this->settings->get(SettingsService::FIREBASE_PROJECT_ID, $tenantId) ?? '');
        $relativeCredentials = $this->settings->get(SettingsService::FIREBASE_CREDENTIALS_PATH, $tenantId);

        $credentialsPath = '';

        if (is_string($relativeCredentials) && $relativeCredentials !== '' && Storage::disk('local')->exists($relativeCredentials)) {
            $credentialsPath = Storage::disk('local')->path($relativeCredentials);
        }

        if ($databaseUrl === '') {
            $databaseUrl = (string) config('services.firebase.database_url', '');
        }

        if ($credentialsPath === '') {
            $envCredentials = (string) config('services.firebase.credentials', '');
            if ($envCredentials !== '' && is_file($envCredentials)) {
                $credentialsPath = $envCredentials;
            }
        }

        if ($projectId === '') {
            $projectId = (string) config('services.firebase.project_id', '');
        }

        return [
            'database_url' => trim($databaseUrl),
            'credentials_path' => $credentialsPath,
            'project_id' => trim($projectId),
        ];
    }

    public function auth(?string $tenantId = null): FirebaseAuth
    {
        return $this->factory($tenantId, requireDatabase: false)->createAuth();
    }

    public function database(?string $tenantId = null): Database
    {
        return $this->factory($tenantId, requireDatabase: true)->createDatabase();
    }

    public function hasCredentials(?string $tenantId = null): bool
    {
        try {
            return $this->resolveConfig($tenantId)['credentials_path'] !== '';
        } catch (\Throwable) {
            return false;
        }
    }

    private function factory(?string $tenantId = null, bool $requireDatabase = true): Factory
    {
        $config = $this->resolveConfig($tenantId);

        if ($config['credentials_path'] === '') {
            throw new RuntimeException(
                'Firebase не настроен. Загрузите credentials JSON в Настройки → Интеграции.',
            );
        }

        if ($requireDatabase && $config['database_url'] === '') {
            throw new RuntimeException(
                'Firebase не настроен. Укажите Database URL и загрузите credentials JSON в Настройки → Интеграции.',
            );
        }

        $factory = (new Factory)->withServiceAccount($config['credentials_path']);

        if ($config['database_url'] !== '') {
            $factory = $factory->withDatabaseUri($config['database_url']);
        }

        return $factory;
    }

    private function path(string $storeKey): string
    {
        return self::ROOT_PATH.'/'.$storeKey;
    }

    private function sanitizeKey(string $storeKey): string
    {
        $key = trim($storeKey);

        if ($key === '' || preg_match('/[.#$\[\]]/', $key)) {
            throw new RuntimeException('Некорректный store_key для Firebase.');
        }

        return $key;
    }

    private function resolveTenantId(): ?string
    {
        $user = Auth::user();

        if (! $user) {
            return null;
        }

        return $this->settings->resolveTenantId($user);
    }
}
