<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSettingsPasswordRequest;
use App\Http\Requests\UpdateSettingsProfileRequest;
use App\Services\SettingsService;
use App\Services\TwoFactorService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SettingsController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly SettingsService $settings,
        private readonly TwoFactorService $twoFactor,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware(
                'permission:'.Permissions::EDIT_PROFILE.'|'.Permissions::EDIT_SECURITY,
                only: ['index'],
            ),
            new Middleware('permission:'.Permissions::EDIT_PROFILE, only: ['updateProfile']),
            new Middleware('permission:'.Permissions::EDIT_SECURITY, only: [
                'updatePassword',
                'enableTwoFactor',
                'confirmTwoFactor',
                'disableTwoFactor',
            ]),
        ];
    }

    public function index(): Response
    {
        $user = auth()->user();
        abort_unless($user !== null, 401);

        return Inertia::render('Settings/Index', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? '',
                'timezone' => $user->timezone ?: 'UTC',
                'locale' => $user->locale ?: 'ru',
            ],
            'security' => [
                'two_factor_enabled' => $this->twoFactor->isEnabled($user),
            ],
            'timezones' => $this->timezoneOptions(),
            'locales' => [
                ['value' => 'ru', 'label' => 'Русский'],
                ['value' => 'en', 'label' => 'English'],
            ],
            'can' => [
                'profile' => (bool) $user->can(Permissions::EDIT_PROFILE),
                'security' => (bool) $user->can(Permissions::EDIT_SECURITY),
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

    public function enableTwoFactor(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        if ($this->twoFactor->isEnabled($user)) {
            return redirect()
                ->route('settings.index', ['tab' => 'security'])
                ->with('error', 'Двухфакторная аутентификация уже включена.');
        }

        $setup = $this->twoFactor->beginSetup($user);

        return redirect()
            ->route('settings.index', ['tab' => 'security'])
            ->with('two_factor_setup', $setup);
    }

    public function confirmTwoFactor(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $validated = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:64'],
        ], [
            'code.required' => 'Введите код из приложения-аутентификатора.',
        ]);

        try {
            $recoveryCodes = $this->twoFactor->confirmSetup($user, $validated['code']);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'code' => $exception->getMessage(),
            ]);
        }

        return redirect()
            ->route('settings.index', ['tab' => 'security'])
            ->with('success', 'Двухфакторная аутентификация включена.')
            ->with('two_factor_recovery_codes', $recoveryCodes);
    }

    public function disableTwoFactor(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $validated = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'min:6', 'max:64'],
        ], [
            'password.required' => 'Введите текущий пароль.',
            'code.required' => 'Введите код 2FA или recovery-код.',
        ]);

        if (! Hash::check($validated['password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'password' => 'Неверный пароль.',
            ]);
        }

        if (! $this->twoFactor->verify($user, $validated['code'])) {
            throw ValidationException::withMessages([
                'code' => 'Неверный код 2FA.',
            ]);
        }

        $this->twoFactor->disable($user);

        return redirect()
            ->route('settings.index', ['tab' => 'security'])
            ->with('success', 'Двухфакторная аутентификация отключена.');
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
