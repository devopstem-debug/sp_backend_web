<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsIntegrationsRequest;
use App\Http\Requests\UpdateSettingsPasswordRequest;
use App\Http\Requests\UpdateSettingsProfileRequest;
use App\Models\Tenant;
use App\Services\SettingsService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly SettingsService $settings,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware(
                'permission:'.Permissions::EDIT_PROFILE.'|'.Permissions::EDIT_SECURITY.'|'.Permissions::EDIT_INTEGRATIONS,
                only: ['index'],
            ),
            new Middleware('permission:'.Permissions::EDIT_PROFILE, only: ['updateProfile']),
            new Middleware('permission:'.Permissions::EDIT_SECURITY, only: ['updatePassword']),
            new Middleware('permission:'.Permissions::EDIT_INTEGRATIONS, only: ['updateIntegrations']),
        ];
    }

    public function index(): Response
    {
        $user = auth()->user();
        abort_unless($user !== null, 401);

        $tenantId = $this->settings->resolveTenantId($user);
        $integrations = $this->settings->integrationsPayload($tenantId);

        $tenant = null;
        if ($user->isSuperAdmin()) {
            $tenantModel = $user->tenant_id
                ? Tenant::query()->find($user->tenant_id)
                : Tenant::query()->where('is_active', true)->orderBy('name')->first();

            if ($tenantModel) {
                $tenant = [
                    'id' => $tenantModel->id,
                    'name' => $tenantModel->name,
                    'domain' => $tenantModel->domain,
                    'is_active' => (bool) $tenantModel->is_active,
                ];
            }
        } elseif ($user->tenant_id) {
            $tenantModel = Tenant::query()->find($user->tenant_id);
            if ($tenantModel) {
                $tenant = [
                    'id' => $tenantModel->id,
                    'name' => $tenantModel->name,
                    'domain' => $tenantModel->domain,
                    'is_active' => (bool) $tenantModel->is_active,
                ];
            }
        }

        return Inertia::render('Settings/Index', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '',
                'timezone' => $user->timezone ?: 'UTC',
                'locale' => $user->locale ?: 'ru',
            ],
            'tenant' => $tenant,
            'integrations' => $integrations,
            'security' => [
                'two_factor_enabled' => false,
            ],
            'timezones' => $this->timezoneOptions(),
            'locales' => [
                ['value' => 'ru', 'label' => 'Русский'],
                ['value' => 'en', 'label' => 'English'],
            ],
            'can' => [
                'profile' => (bool) $user->can(Permissions::EDIT_PROFILE),
                'security' => (bool) $user->can(Permissions::EDIT_SECURITY),
                'integrations' => (bool) $user->can(Permissions::EDIT_INTEGRATIONS),
            ],
        ]);
    }

    public function updateProfile(UpdateSettingsProfileRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return redirect()
            ->route('settings.index', ['tab' => 'profile'])
            ->with('success', 'Профиль сохранён.');
    }

    public function updatePassword(UpdateSettingsPasswordRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $user->forceFill([
            'password' => $request->validated('new_password'),
        ])->save();

        return redirect()
            ->route('settings.index', ['tab' => 'security'])
            ->with('success', 'Пароль изменён.');
    }

    public function updateIntegrations(UpdateSettingsIntegrationsRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $tenantId = $this->settings->resolveTenantId($user);

        $this->settings->updateIntegrations(
            $tenantId,
            $request->safe()->except('firebase_credentials'),
            $request->file('firebase_credentials'),
        );

        return redirect()
            ->route('settings.index', ['tab' => 'integrations'])
            ->with('success', 'Интеграции сохранены.');
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function timezoneOptions(): array
    {
        $zones = [
            'UTC',
            'Europe/Minsk',
            'Europe/Moscow',
            'Europe/Kyiv',
            'Europe/Warsaw',
            'Europe/Berlin',
            'Europe/London',
            'Asia/Almaty',
            'Asia/Tashkent',
            'Asia/Yekaterinburg',
            'America/New_York',
        ];

        return array_map(
            static fn (string $zone) => ['value' => $zone, 'label' => $zone],
            $zones,
        );
    }
}
