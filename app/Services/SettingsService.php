<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

class SettingsService
{
    public const FIREBASE_PROJECT_ID = 'firebase.project_id';

    public const FIREBASE_DATABASE_URL = 'firebase.database_url';

    public const FIREBASE_CREDENTIALS_PATH = 'firebase.credentials_path';

    public const ENGINE_BASE_URL = 'engine.base_url';

    public const ENGINE_SECRET_KEY = 'engine.secret_key';

    public function resolveTenantId(User $user): ?string
    {
        if ($user->isSuperAdmin()) {
            return $user->tenant_id;
        }

        return $user->tenant_id;
    }

    public function get(string $key, ?string $tenantId): ?string
    {
        $setting = Setting::query()
            ->when(
                $tenantId === null,
                fn ($query) => $query->whereNull('tenant_id'),
                fn ($query) => $query->where('tenant_id', $tenantId),
            )
            ->where('key', $key)
            ->first();

        return $setting?->value;
    }

    public function put(string $key, ?string $value, ?string $tenantId): void
    {
        $setting = Setting::query()
            ->when(
                $tenantId === null,
                fn ($query) => $query->whereNull('tenant_id'),
                fn ($query) => $query->where('tenant_id', $tenantId),
            )
            ->where('key', $key)
            ->first();

        if ($setting) {
            $setting->update(['value' => $value]);

            return;
        }

        Setting::query()->create([
            'tenant_id' => $tenantId,
            'key' => $key,
            'value' => $value,
        ]);
    }

    /**
     * @return array{
     *     firebase: array{project_id: string, database_url: string, credentials_uploaded: bool, credentials_name: string|null},
     *     engine: array{base_url: string, secret_key_set: bool},
     *     status: array{firebase: string, engine: string}
     * }
     */
    public function integrationsPayload(?string $tenantId): array
    {
        $projectId = (string) ($this->get(self::FIREBASE_PROJECT_ID, $tenantId) ?? '');
        $databaseUrl = (string) ($this->get(self::FIREBASE_DATABASE_URL, $tenantId) ?? '');
        $credentialsPath = $this->get(self::FIREBASE_CREDENTIALS_PATH, $tenantId);
        $baseUrl = (string) ($this->get(self::ENGINE_BASE_URL, $tenantId) ?? '');
        $secret = $this->get(self::ENGINE_SECRET_KEY, $tenantId);

        $credentialsUploaded = is_string($credentialsPath) && $credentialsPath !== '' && Storage::disk('local')->exists($credentialsPath);

        return [
            'firebase' => [
                'project_id' => $projectId,
                'database_url' => $databaseUrl,
                'credentials_uploaded' => $credentialsUploaded,
                'credentials_name' => $credentialsUploaded ? basename($credentialsPath) : null,
            ],
            'engine' => [
                'base_url' => $baseUrl,
                'secret_key_set' => is_string($secret) && $secret !== '',
            ],
            'status' => [
                'firebase' => ($projectId !== '' && $databaseUrl !== '' && $credentialsUploaded)
                    ? 'configured'
                    : 'not_configured',
                'engine' => ($baseUrl !== '' && is_string($secret) && $secret !== '') ? 'configured' : 'not_configured',
            ],
        ];
    }

    /**
     * @param  array{firebase_project_id?: string|null, firebase_database_url?: string|null, engine_base_url?: string|null, engine_secret_key?: string|null}  $data
     */
    public function updateIntegrations(?string $tenantId, array $data, ?UploadedFile $credentials = null): void
    {
        if (array_key_exists('firebase_project_id', $data)) {
            $this->put(self::FIREBASE_PROJECT_ID, $this->nullableString($data['firebase_project_id'] ?? null), $tenantId);
        }

        if (array_key_exists('firebase_database_url', $data)) {
            $this->put(self::FIREBASE_DATABASE_URL, $this->nullableString($data['firebase_database_url'] ?? null), $tenantId);
        }

        if (array_key_exists('engine_base_url', $data)) {
            $this->put(self::ENGINE_BASE_URL, $this->nullableString($data['engine_base_url'] ?? null), $tenantId);
        }

        $secret = $data['engine_secret_key'] ?? null;
        if (is_string($secret) && $secret !== '') {
            $this->put(self::ENGINE_SECRET_KEY, Crypt::encryptString($secret), $tenantId);
        }

        if ($credentials instanceof UploadedFile) {
            $directory = 'settings/'.($tenantId ?? 'global');
            $path = $credentials->storeAs($directory, 'firebase-credentials.json', 'local');

            $previous = $this->get(self::FIREBASE_CREDENTIALS_PATH, $tenantId);
            if (is_string($previous) && $previous !== '' && $previous !== $path && Storage::disk('local')->exists($previous)) {
                Storage::disk('local')->delete($previous);
            }

            $this->put(self::FIREBASE_CREDENTIALS_PATH, $path, $tenantId);
        }
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
